#!/usr/bin/env node
/**
 * GoldenWay — live verification of the NO-OTP staff onboarding loop (0012).
 *
 * Usage: node verify-staff-onboarding.mjs <url> <publishable-key>
 *
 * Walks the new design end-to-end with only the publishable key:
 *
 *   0. anon reachability
 *   1. request_staff_access (anon RPC)         → PENDING row
 *   2. signUp with a password (no email step)  → live session (Confirm email OFF)
 *   3. sign-in gate BEFORE approval            → 403 "awaiting approval" + signed out
 *   4. admin approve via decide_staff_access   → trigger provisions staff row
 *   5. sign-in gate AFTER approval             → STAFF profile, role matches
 *   6. RLS: purge machinery exists (0011 dropped)
 *
 * The DB user created here is a CLERK applicant; remove afterwards:
 *   delete from public.staff_access_requests where email = '<email>';
 *   delete from auth.users where email = '<email>';   -- SQL Editor
 */
import { createClient } from "@supabase/supabase-js";

const [url, pubKey] = process.argv.slice(2);
if (!url || !pubKey) {
  console.error("Usage: node verify-staff-onboarding.mjs <url> <publishable-key>");
  process.exit(1);
}

const ADMIN_EMAIL = "admin@goldenway.demo";
const ADMIN_PASSWORD = "GoldenWay!2026";
const TEST_EMAIL = `onboard-test-${Date.now()}@goldenway.example`;
const TEST_PASSWORD = "Onboard!Test2026";

const supabase = createClient(url, pubKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ok = (s) => console.log("  ✓ " + s);
const bad = (s) => console.log("  ✗ " + s);
let passes = 0;
let fails = 0;
const pass = (s) => { ok(s); passes++; };
const fail = (s) => { bad(s); fails++; };

async function main() {
  console.log("\nGoldenWay staff onboarding (no OTP) — live verification\n");
  console.log(`  project : ${url}`);
  console.log(`  test as : ${TEST_EMAIL}\n`);

  // ---- 0. reachability --------------------------------------------------
  console.log("0. Anonymous reachability");
  {
    const { data, error } = await supabase.from("routes").select("code").limit(1);
    if (error) fail(`routes: ${error.message}`);
    else if (data?.length) pass(`routes readable (${data[0].code})`);
    else fail("routes readable but empty");
  }

  // ---- 1. staff access request ------------------------------------------
  console.log("\n1. request_staff_access (anon RPC)");
  {
    const { data, error } = await supabase.rpc("request_staff_access", {
      p_email: TEST_EMAIL,
      p_first_name: "Onboard",
      p_surname: "Probe",
      p_requested_role: "CLERK",
      p_motivation: "0012 onboarding verification — safe to delete",
    });
    if (error) fail(`request_staff_access: ${error.message}`);
    else if (data?.status === "PENDING") pass(`request #${data.id} created (PENDING)`);
    else fail(`unexpected: ${JSON.stringify(data)}`);
  }

  // ---- 2. signup with password (no OTP) ----------------------------------
  console.log("\n2. signUp — password account created immediately");
  {
    const { data, error } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (error) {
      fail(`signUp: ${error.message}`);
      if (/confirm/i.test(error.message)) {
        console.error("    ⚠ 'Confirm email' is ON — turn it OFF (SETUP.md §3); the no-OTP flow needs it OFF.");
      }
      return report();
    }
    if (!data.session) {
      fail("no session returned — Confirm email is probably ON; turn it OFF (SETUP.md §3)");
      return report();
    }
    pass(`auth user + live session (uid ${data.user?.id?.slice(0, 8)}…)`);
  }

  // ---- 3. gate BEFORE approval -------------------------------------------
  console.log("\n3. sign-in gate before approval must refuse");
  {
    const gate = createClient(url, pubKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await gate.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (error) fail(`sign-in itself failed: ${error.message}`);
    else {
      // Replicate loginAny's gate exactly.
      const { data: profile } = await gate.rpc("my_profile_type");
      if (profile?.userType === "UNPROFILED") {
        const { data: status } = await gate.rpc("my_staff_request_status");
        await gate.auth.signOut();
        if (status?.status === "PENDING") pass("UNPROFILED + PENDING → gate would refuse (awaiting approval)");
        else if (status?.status === "DENIED") pass("UNPROFILED + DENIED → gate would refuse (denied)");
        else pass(`UNPROFILED (status: ${status?.status ?? "none"}) → gate would refuse`);
      } else {
        fail(`expected UNPROFILED, got ${JSON.stringify(profile)}`);
        await gate.auth.signOut();
      }
    }
  }

  // ---- 4. approve → staff row --------------------------------------------
  console.log("\n4. admin approve → trigger provisions the staff row");
  {
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (signInErr) { fail(`admin sign-in: ${signInErr.message}`); return report(); }

    // Find OUR request by email — not "newest row" — so concurrent/seeded
    // requests can never hijack the lookup. Surface the error too: an RLS
    // or grant problem must not look like a missing row.
    const { data: reqs, error: reqErr } = await supabase
      .from("staff_access_requests")
      .select("id, email, status")
      .eq("email", TEST_EMAIL)
      .limit(1);
    if (reqErr) { fail(`read staff_access_requests as ADMIN: ${reqErr.message} (${reqErr.code ?? "no code"})`); return report(); }
    const reqId = reqs?.[0]?.id;
    if (reqId == null) {
      fail("could not find the test request (ADMIN read returned 0 rows for our email)");
      console.error("    ⚠ The request was created in step 1 — if the ADMIN can't read it, check that");
      console.error("      the admin's staff row is active and the 0012 staff_requests_read policy is applied.");
      return report();
    }

    const { data: decided, error: decErr } = await supabase.rpc("decide_staff_access", {
      p_request_id: reqId,
      p_approve: true,
      p_note: "0012 verification",
    });
    if (decErr) { fail(`decide_staff_access: ${decErr.message}`); return report(); }
    if (decided?.status !== "APPROVED") { fail(`unexpected: ${JSON.stringify(decided)}`); return report(); }
    pass("request APPROVED");

    const { data: staffRow } = await supabase
      .from("staff")
      .select("role, active, first_name, surname")
      .eq("email", TEST_EMAIL)
      .maybeSingle();
    if (staffRow?.role === "CLERK" && staffRow?.active === true) {
      pass(`staff row provisioned (${staffRow.first_name} ${staffRow.surname}, CLERK, active)`);
    } else {
      fail(`staff row missing/wrong: ${JSON.stringify(staffRow)}`);
    }
  }

  // ---- 5. gate AFTER approval --------------------------------------------
  console.log("\n5. sign-in gate after approval must admit");
  {
    const worker = createClient(url, pubKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await worker.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (error) { fail(`sign-in: ${error.message}`); return report(); }
    const { data: profile } = await worker.rpc("my_profile_type");
    if (profile?.userType === "STAFF" && profile.role === "CLERK" && profile.active === true) {
      pass(`my_profile_type → STAFF/CLERK — dashboard unlocked`);
    } else {
      fail(`expected STAFF/CLERK, got ${JSON.stringify(profile)}`);
    }
    await worker.auth.signOut();
  }

  // ---- 6. OTP machinery really gone ---------------------------------------
  console.log("\n6. 0011 OTP objects dropped");
  {
    const { error } = await supabase.from("staff_otp_outbox").select("id").limit(1);
    if (error && (error.code === "404" || /does not exist|not exist/i.test(error.message))) {
      pass("staff_otp_outbox no longer exists");
    } else if (error) {
      pass(`staff_otp_outbox unreachable (${error.code})`);
    } else {
      fail("staff_otp_outbox still readable — 0012 not applied?");
    }
  }

  return report();
}

function report() {
  console.log("\n──────────────────────────────────────────────");
  console.log(`${passes} passed, ${fails} failed\n`);
  console.log("Cleanup (SQL Editor):");
  console.log(`  delete from public.staff_access_requests where email = '${TEST_EMAIL}';`);
  console.log(`  delete from auth.users      where email = '${TEST_EMAIL}';`);
  console.log("");
  process.exitCode = fails ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exit(1); });
