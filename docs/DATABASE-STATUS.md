# GoldenWay Supabase Database Status

> Verified live on 2026-09-16 against the project at
> `https://zosmjkmlbodqfttmzoll.supabase.co`, using the full schema dump
> (21 tables) from the Supabase dashboard.

## TL;DR

**Yes — the app works with the Supabase database.** All migrations
0001–0009 are applied, the seeded demo data is live, auth works, RLS is
active, and the business-rule RPCs respond correctly. Two issues were found
and fixed along the way:

1. `frontend/.env` had a broken anon key (clipped first character) — fixed.
2. Four tables reject *anonymous* reads with Postgres `42501`
   (`insufficient_privilege`). That is expected hardening, not a fault — the
   app always reads them signed-in (see §3).

## 1. What was wrong and what was fixed

`frontend/.env` contained a malformed publishable key — its first character
was missing, so the key started `b_publishable_` instead of `sb_publishable_`.
Every request through `src/lib/supabaseClient.js` was rejected with
`401 Invalid API key` before it ever reached Postgres.

**Fix applied:** `frontend/.env` was rewritten with the correct values:

```
VITE_SUPABASE_URL=https://zosmjkmlbodqfttmzoll.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_rRWPvdoLjrQnyJFXL3J_kw_efWlo0fj
NEXT_PUBLIC_SUPABASE_URL=https://zosmjkmlbodqfttmzoll.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_rRWPvdoLjrQnyJFXL3J_kw_efWlo0fj
```

The key is a **publishable key** (Supabase's newer format replacing the
legacy JWT anon key). Both variable styles (`VITE_*` for this Vite app and
`NEXT_PUBLIC_*`, which the app doesn't read) hold the same values.

## 2. What the database has now (all verified live)

Migrations **0001–0009 are applied**; the live schema matches the dashboard
dump table-for-table:

| Area | Verified live how |
|---|---|
| Core schema — `commuters`, `staff`, `routes`, `stops`, `fare_products`, `fare_table_entries`, `gold_cards`, `loaded_products`, `deductions`, `top_up_orders`, `payment_attempts`, `service_alerts`, `support_tickets`, `ticket_messages`, `route_departures` | REST 200, seeded rows present (KHA-CPT / MP-CPT / BELL-CPT routes, products, departures) |
| Onboarding (0005) — `staff_access_requests`, `staff_action_log` | REST 200 / authenticated read OK |
| Operations (0006) — `buses`, `vehicle_runs`, `inspection_events` | authenticated read OK (fleet `GW-1001`, 2 runs, 2 inspections seeded) |
| Notifications (0007) — `notifications` | authenticated read OK (2 rows; realtime enabled by the migration) |
| Card lifecycle (0008) — CASH gateway, kiosk RPCs | `issue_card_kiosk` function exists (params required), `payment_attempts.gateway` includes `CASH` |
| Support completion (0009) — agent queue RPCs | `claim_next_ticket` function exists (params required) |

**End-to-end business-rule checks:**

| Check | Result |
|---|---|
| Auth sign-in `admin@goldenway.demo` / `GoldenWay!2026` | ✅ session issued (uid `87516f69…`) |
| BR-08 handheld verification — `verify_card('GW-1234-5678')` as `inspector@goldenway.demo` | ✅ `{ status: UNREGISTERED, journeysRemaining: 17, registered: false }` — exactly the seeded kiosk card awaiting Thandi's signup link |
| RLS on commuter-owned tables | ✅ anonymous reads return 0 rows, not errors |

Demo logins (password `GoldenWay!2026`): `admin@`, `clerk@`, `inspector@`,
`driver@`, `agent@goldenway.demo`, `thandi.dlamuki@gmail.com`,
`sipho.mahlangue@gmail.com`.

## 3. About the anonymous `42501` on four tables

Anonymous (no sign-in) REST calls to `vehicle_runs`, `inspection_events`,
`notifications` and `staff_action_log` return:

```
{"code":"42501","message":"insufficient_privilege: … required privileges …"}
```

This is **correct behaviour**: those tables are staff-only, the app always
reads them with an authenticated session, and blocking anonymous grants is a
hardening win. The other 17 tables allow anonymous SELECT only because their
RLS policies expose public/seed data (routes, fares, alerts). Nothing to fix.

If a future *unauthenticated* feature ever needs one of those four, grant it
explicitly in the SQL Editor — per-table, never blanket:

```sql
GRANT SELECT ON public.notifications TO anon, authenticated;
```

The companion `supabase/fix-service-role-grants.sql` is only needed if
`seed-demo.mjs` (service_role) starts failing on new tables.

## 4. Re-verification commands

```bash
cd su2/GoldenWayApp/supabase
node check-seed.mjs <url> <service-key> [publishable-key]   # full seed audit
```

Or quick anonymous reachability (curl / node fetch):

```bash
curl -s "$SUPABASE_URL/rest/v1/routes?select=code&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

Expected: `200` with the KHA-CPT row. A `401 Invalid API key` means the
`.env` key is wrong again (check for a clipped `s` in `sb_publishable_`).

## 5. Security notes

- The publishable key is safe to ship in frontend bundles by design — RLS is
  the actual security boundary.
- `seed-demo.mjs` requires the **service_role** key, which must never go into
  the frontend or a public repo.
- Demo passwords (`GoldenWay!2026`) and the seed key are committed in
  `supabase/package.json`'s description and SETUP.md — rotate them before any
  real deployment, per SETUP.md's own warning.
