#!/usr/bin/env node
/**
 * GoldenWay demo-day seed — fictional cast (FINAL-DEV-PLAN §5 D0).
 *
 * Usage:
 *   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=sb_secret_... node seed-demo.mjs
 *   (or: node seed-demo.mjs <url> <service-key>)
 *
 * Creates via the official admin API + service-role PostgREST (bypasses
 * RLS — safe because this script IS the trusted back office):
 *   · 5 staff auth users (one per role) — the 0005 signup trigger
 *     attaches their staff rows automatically
 *   · 2 commuters — Thandi (kiosk-issued card GW-1234-5678 with products,
 *     for the "signup with existing card" demo) and Sipho (no card)
 *   · 2 PENDING staff_access_requests for the ADMIN approval demo
 *   · 1 OPEN support ticket from Sipho
 *   · 1 COMPLETED driver run + 2 historical inspections
 * Idempotent: safe to re-run; existing rows are detected and skipped.
 * Migrations 0001–0009 must already be applied (SQL Editor).
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.argv[2] || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.argv[3] || process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Usage: node seed-demo.mjs <url> <service-key>");
  console.error("  or:  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node seed-demo.mjs");
  process.exit(1);
}

// Friendly check: the seed needs the SECRET key, not the publishable/anon one.
function keyRole(key) {
  if (key.startsWith("sb_publishable_")) return "publishable"; // public — no admin rights
  if (key.startsWith("sb_secret_")) return "service";
  if (/^eyJ[\w-]+\.[\w-]+\./.test(key)) { // legacy JWT format
    try {
      return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role || "jwt";
    } catch {
      return "jwt";
    }
  }
  return "unknown";
}
const keyType = keyRole(SERVICE_KEY);
if (keyType !== "service") {
  console.error(`That's the ${keyType === "publishable" ? "PUBLISHABLE (public)" : keyType.toUpperCase()} key — the seed needs the SECRET service_role key.`);
  console.error("  Supabase Dashboard → Project Settings → API keys → Secret keys → sb_secret_...");
  console.error("  (or expand 'Legacy API keys' and copy the service_role JWT).");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// ---- small helpers -------------------------------------------------
const Luhn13 = (() => { // deterministic valid SA IDs: base + computed check digit
  const sum = (digits) => digits.reduce((s, d, i) => {
    let v = i % 2 === 1 ? d * 2 : d;
    if (v > 9) v -= 9;
    return s + v;
  }, 0);
  return (base12) => {
    for (let check = 0; check <= 9; check++) {
      if (sum([...base12, check].map(Number)) % 10 === 0) return base12 + String(check);
    }
    throw new Error("no valid check digit");
  };
})();
const ID = {
  // NOTE: 9005155000086 was claimed by a teammate's test registration, so
  // Thandi's demo ID moved to the …01084 variant (still Luhn-valid).
  thandi: Luhn13("900515500108"),
  sipho: Luhn13("850311580109"),
  zanele: Luhn13("920704012208"),
  nomsa: Luhn13("780902014308"),
};
const PASSWORD = "GoldenWay!2026"; // demo accounts only — rotate after demo
const LOG = (icon, msg) => console.log(`  ${icon} ${msg}`);

async function rest(table, query, method = "GET", body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? "?" + query : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "GET" ? "count=exact" : "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const body = await res.text();
    let msg = `${method} ${table} -> ${res.status}: ${body.slice(0, 200)}`;
    if (res.status === 403 && body.includes("permission denied")) {
      msg += "\n  → Fix: paste this in Supabase Dashboard → SQL Editor, run it, then re-run this seed:\n       GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;\n       GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;";
    }
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function ensureAuthUser(email, metadata) {
  const { data, error } = await db.auth.admin.listUsers();
  if (error) throw error;
  const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    LOG("•", `auth user exists: ${email}`);
    return existing;
  }
  const { data: created, error: err } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (err) throw err;
  LOG("✓", `auth user created: ${email}`);
  return created.user;
}

async function upsertStaffTable(uid, firstName, surname, email, role) {
  const existing = await rest("staff", `id=eq.${uid}&select=id`);
  if (existing.length) {
    LOG("•", `staff row exists: ${role} ${email}`);
    return;
  }
  await rest("staff", "", "POST", { id: uid, first_name: firstName, surname, email, role, active: true });
  LOG("✓", `staff row created: ${role} — ${firstName} ${surname}`);
}

async function main() {
  console.log("\nGoldenWay demo seed — fictional cast\n");

  // ---- 1. Staff: one per role (0005 signup trigger adds staff rows,
  //         but listUsers has no trigger context — we upsert directly;
  //         the trigger only fires for interactive signups anyway). ----
  const staffCast = [
    { email: "admin@goldenway.demo", first: "Amara", sur: "Dube", role: "ADMIN" },
    { email: "clerk@goldenway.demo", first: "Farieda", sur: "Jacobs", role: "CLERK" },
    { email: "inspector@goldenway.demo", first: "Bongs", sur: "Ndlovu", role: "INSPECTOR" },
    { email: "driver@goldenway.demo", first: "Pieter", sur: "Van Wyk", role: "DRIVER" },
    { email: "agent@goldenway.demo", first: "Lerato", sur: "Molefe", role: "AGENT" },
  ];
  for (const s of staffCast) {
    const u = await ensureAuthUser(s.email, { first_name: s.first, surname: s.sur, role: s.role });
    await upsertStaffTable(u.id, s.first, s.sur, s.email, s.role);
  }

  // ---- 2. Commuters ----
  const thandi = await ensureAuthUser("thandi.dlamuki@gmail.com", { first_name: "Thandi", surname: "Dlamuki" });
  const sipho = await ensureAuthUser("sipho.mahlangue@gmail.com", { first_name: "Sipho", surname: "Mahlangue" });
  await rest("commuters", "", "POST", {
    id: thandi.id, first_name: "Thandi", surname: "Dlamuki", email: "thandi.dlamuki@gmail.com",
    phone: "0721234567", gender: "FEMALE", date_of_birth: "1990-05-15",
    id_number: ID.thandi, concession_type: "NONE",
  }).catch((e) => (String(e).includes("duplicate") ? LOG("•", "commuter exists: Thandi") : Promise.reject(e)));
  await rest("commuters", "", "POST", {
    id: sipho.id, first_name: "Sipho", surname: "Mahlangue", email: "sipho.mahlangue@gmail.com",
    phone: "0837654321", gender: "MALE", date_of_birth: "1985-03-11",
    id_number: ID.sipho, concession_type: "STUDENT",
  }).catch((e) => (String(e).includes("duplicate") ? LOG("•", "commuter exists: Sipho") : Promise.reject(e)));
  LOG("✓", "commuters ready: Thandi (kiosk card demo) + Sipho (no card yet)");

  // ---- 3. Thandi's kiosk-bought card (the Q1 "signup with existing
  //         card" demo): GW-1234-5678, issued against her SA ID at the
  //         Bellville kiosk, products loaded in the same visit, still
  //         UNREGISTERED until she links it in the app. ----
  const CARD = "GW-1234-5678";
  const staffRows = await rest("staff", "select=id,role");
  const clerk = staffRows.find((s) => s.role === "CLERK");
  const inspector = staffRows.find((s) => s.role === "INSPECTOR");
  const driver = staffRows.find((s) => s.role === "DRIVER");
  const agent = staffRows.find((s) => s.role === "AGENT");

  const existingCard = await rest("gold_cards", `card_number=eq.${CARD}&select=card_number`);
  if (!existingCard.length) {
    await rest("gold_cards", "", "POST", {
      card_number: CARD, status: "UNREGISTERED",
      issued_for_id: ID.thandi, issued_by: clerk.id, issued_at: new Date().toISOString(),
    });
    const fee = await rest("top_up_orders", "", "POST", {
      card_number: CARD, product_code: "GOLD-CARD-FEE", amount_cents: 4000,
      status: "PAID", receipt_reference: "GW-DEMO-FEE1", paid_at: new Date().toISOString(),
    });
    await rest("payment_attempts", "", "POST", {
      order_id: fee[0].id, gateway: "CASH", status: "APPROVED", gateway_ref: "GW-DEMO-FEE1",
    });
    // What her last kiosk receipt says: GOEASY-10 with 3 used (7 left) +
    // a weekly MP-CPT — the app must show exactly this after linking.
    await rest("loaded_products", "", "POST", [
      { card_number: CARD, product_code: "GOEASY-10", route_code: "KHA-CPT",
        journeys_total: 10, journeys_used: 3, transfers_allowed: 1,
        valid_from: new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10),
        valid_to: new Date(Date.now() + 25 * 864e5).toISOString().slice(0, 10) },
      { card_number: CARD, product_code: "WEEKLY-MP-CPT", route_code: "MP-CPT",
        journeys_total: 0, journeys_used: 0, transfers_allowed: 0,
        valid_from: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10),
        valid_to: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10) },
    ]);
    LOG("✓", `kiosk card ${CARD} issued for ID …${ID.thandi.slice(-4)} (7 journeys on GOEASY-10 + weekly)`);
  } else {
    LOG("•", `kiosk card ${CARD} exists`);
  }

  // ---- 4. Onboarding queue: two PENDING requests for the ADMIN demo ----
  const reqs = await rest("staff_access_requests", "select=email,status");
  const hasReq = (email) => reqs.some((r) => r.email === email);
  if (!hasReq("zanele.khumalo@gmail.com")) {
    await rest("staff_access_requests", "", "POST", {
      email: "zanele.khumalo@gmail.com", first_name: "Zanele", surname: "Khumalo",
      requested_role: "DRIVER", motivation: "Qualified NCPD driver, 8 years on the Malmesbury line.",
    });
  }
  if (!hasReq("nomsa.mthembu@gmail.com")) {
    await rest("staff_access_requests", "", "POST", {
      email: "nomsa.mthembu@gmail.com", first_name: "Nomsa", surname: "Mthembu",
      requested_role: "CLERK", motivation: "Currently a vendor agent at the Bellville terminus kiosk.",
    });
  }
  LOG("✓", "onboarding queue: 2 PENDING requests (Zanele→DRIVER, Nomsa→CLERK)");

  // ---- 5. A support ticket from Sipho (agent inbox demo) ----
  const tickets = await rest("support_tickets", "select=id,subject");
  if (!tickets.some((t) => t.subject.includes("route 42"))) {
    const t = await rest("support_tickets", "", "POST", {
      commuter_id: sipho.id, subject: "Live tracking on route 42 not updating",
      status: "OPEN", priority: "NORMAL",
    });
    await rest("ticket_messages", "", "POST", [
      { ticket_id: t[0].id, sender: "COMMUTER",
        body: "The bus position hasn't moved for 20 minutes — is the tracker working?" },
    ]);
    LOG("✓", "support ticket #" + t[0].id + " (OPEN) from Sipho");
  } else {
    LOG("•", "support ticket exists");
  }

  // ---- 6. One completed driver run (yesterday, on time) + 2 past
  //         inspections on Thandi's card (inspector history demo) ----
  const runs = await rest("vehicle_runs", "select=id&driver_id=eq." + driver.id);
  if (!runs.length) {
    const started = new Date(Date.now() - 864e5);
    const ended = new Date(Date.now() - 864e5 + 5 * 3600e3);
    await rest("vehicle_runs", "", "POST", {
      driver_id: driver.id, route_code: "KHA-CPT", bus_id: "GW-1001",
      direction: "OUTBOUND", service_day: "WEEKDAY", status: "COMPLETED",
      delay_minutes: 0, started_at: started.toISOString(), ended_at: ended.toISOString(),
    });
    LOG("✓", "driver run: KHA-CPT on GW-1001, COMPLETED (yesterday)");
  } else {
    LOG("•", "driver run exists");
  }
  const insp = await rest("inspection_events", "card_number=eq." + CARD + "&select=id");
  if (!insp.length) {
    await rest("inspection_events", "", "POST", [
      { inspector_id: inspector.id, card_number: CARD, outcome: "VALID",
        note: "Routine boarding check", at: new Date(Date.now() - 9 * 864e5).toISOString() },
      { inspector_id: inspector.id, card_number: CARD, outcome: "VALID",
        note: "Peak service check", at: new Date(Date.now() - 3 * 864e5).toISOString() },
    ]);
    LOG("✓", "inspection history: 2× VALID on " + CARD);
  } else {
    LOG("•", "inspection events exist");
  }

  // ---- 7. Sanity: agent + admin users must exist for login routing ----
  const staffCount = (await rest("staff", "select=id")).length;
  console.log(`\nDone. staff=${staffCount} — demo logins all use password: ${PASSWORD}\n`);
  console.log("  admin@goldenway.demo · clerk@goldenway.demo · inspector@goldenway.demo");
  console.log("  driver@goldenway.demo · agent@goldenway.demo");
  console.log("  thandi.dlamuki@gmail.com (links GW-1234-5678) · sipho.mahlangue@gmail.com\n");
}

main().catch((e) => {
  console.error("Seed failed:", e.message || e);
  process.exit(1);
});
