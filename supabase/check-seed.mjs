#!/usr/bin/env node
/** Sanity-check the demo seed.
 *  Usage: node check-seed.mjs <url> <service-key> [publishable-key]
 *  The third argument is optional — if given, it also tests the demo logins
 *  (sign-in with the public key, like the app does). */
import { createClient } from "@supabase/supabase-js";

const [url, serviceKey, pubKey] = process.argv.slice(2);
if (!url || !serviceKey) {
  console.error("Usage: node check-seed.mjs <url> <service-key> [publishable-key]");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const ok = (s) => console.log("  ✓ " + s);
const bad = (s) => console.log("  ✗ " + s);

async function count(table, query = "") {
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
  if (error) { bad(`${table}: ${error.message}`); return -1; }
  return count;
}

async function main() {
  console.log("\nGoldenWay seed sanity check\n");

  const tables = ["staff", "commuters", "gold_cards", "loaded_products",
    "staff_access_requests", "support_tickets", "ticket_messages",
    "vehicle_runs", "inspection_events", "notifications"];
  for (const t of tables) {
    const n = await count(t);
    if (n >= 0) ok(`${t}: ${n}`);
  }

  const { data: users } = await admin.auth.admin.listUsers();
  ok(`auth users: ${users.users.length} (${users.users.map((u) => u.email).join(", ")})`);

  const { data: card } = await admin.from("loaded_products")
    .select("product_code,journeys_total,journeys_used,valid_to")
    .eq("card_number", "GW-1234-5678");
  for (const p of card ?? []) {
    ok(`card GW-1234-5678 → ${p.product_code}: ${p.journeys_total - p.journeys_used} left, valid to ${p.valid_to}`);
  }

  if (pubKey) {
    const client = createClient(url, pubKey, { auth: { persistSession: false } });
    for (const email of ["admin@goldenway.demo", "agent@goldenway.demo", "thandi.dlamuki@gmail.com"]) {
      const { error } = await client.auth.signInWithPassword({ email, password: "GoldenWay!2026" });
      error ? bad(`sign-in ${email}: ${error.message}`) : ok(`sign-in works: ${email}`);
    }
  }
  console.log("");
  process.exit(0);
}

main().catch((e) => { console.error("Check failed:", e.message || e); process.exit(1); });
