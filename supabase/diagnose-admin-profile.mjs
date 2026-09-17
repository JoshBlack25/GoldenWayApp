#!/usr/bin/env node
/**
 * Diagnostic: sign in as admin@goldenway.demo and inspect why
 * my_profile_type() returns UNPROFILED — check auth.users vs public.staff
 * and commuters via the admin API.
 *
 * Usage: node diagnose-admin-profile.mjs <url> <publishable-key>
 */
import { createClient } from "@supabase/supabase-js";

const [url, pubKey] = process.argv.slice(2);
if (!url || !pubKey) {
  console.error("Usage: node diagnose-admin-profile.mjs <url> <publishable-key>");
  process.exit(1);
}

const supabase = createClient(url, pubKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = "admin@goldenway.demo";
const PASSWORD = "GoldenWay!2026";

async function main() {
  // 1. Sign in
  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signInErr) {
    console.error("✗ sign-in failed:", signInErr.message);
    process.exit(1);
  }
  const uid = signIn.user.id;
  console.log("1. signed in OK, uid =", uid);

  // 2. What does my_profile_type say?
  const { data: profile, error: profileErr } = await supabase.rpc("my_profile_type");
  console.log("2. my_profile_type →", profileErr ? `ERROR: ${profileErr.message}` : JSON.stringify(profile));

  // 2b. Cross-check other role RPCs against my_profile_type
  for (const [label, fn] of [["is_staff('ADMIN')", "is_staff"], ["my_staff_request_status", "my_staff_request_status"]]) {
    const { data, error } = await supabase.rpc(fn, fn === "is_staff" ? { p_role: "ADMIN" } : {});
    console.log(`2b. ${label} →`, error ? `ERROR: ${error.message}` : JSON.stringify(data));
  }

  // 3. Check profile rows via REST (RLS-scoped: we can see only our own row)
  const asUser = createClient(url, pubKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await asUser.auth.setSession(signIn.session);

  const { data: staffRow, error: staffErr } = await asUser
    .from("staff").select("id, role, active, email").eq("id", uid);
  console.log("3a. staff row (self-scope) →", staffErr ? `ERROR: ${staffErr.message}` : JSON.stringify(staffRow));

  const { data: commuterRow, error: commuterErr } = await asUser
    .from("commuters").select("id, email").eq("id", uid);
  console.log("3b. commuters row (self-scope) →", commuterErr ? `ERROR: ${commuterErr.message}` : JSON.stringify(commuterRow));

  await supabase.auth.signOut();
}
main();
