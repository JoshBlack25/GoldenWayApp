# GoldenWay on Supabase — setup guide

This replaces the Spring Boot / MySQL backend entirely. The React frontend
is unchanged in structure — only its data layer (`src/api/`, `src/context/`,
`src/lib/`) now talks to Supabase instead of `/api/*`.

## What's in this package

```
supabase/migrations/0001_schema.sql     tables, enums, Row Level Security
supabase/migrations/0002_functions.sql  business-rule RPC functions (BR-01…BR-10)
supabase/migrations/0003_seed.sql       demo routes, fares, prices, stops
frontend/                               the React app, rewired for Supabase
```

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard → **New project**. Pick a name,
   database password, and region.
2. Once it's provisioned, open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Run the migrations

Easiest: **SQL Editor** in the Supabase dashboard → paste and run, in order:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_functions.sql`
3. `supabase/migrations/0003_seed.sql`

(Or, if you use the Supabase CLI: `supabase link --project-ref <ref>` then
`supabase db push` with these files under `supabase/migrations/`.)

## 3. Turn off "Confirm email" for a smooth demo (recommended)

Supabase Auth requires email confirmation by default, which means
`supabase.auth.signUp()` won't return a live session immediately — and the
registration flow needs a session right away to create the commuter profile
row (`register_commuter`, which reads `auth.uid()`).

Go to **Authentication → Providers → Email** and turn **Confirm email**
**off** for development/demo. (For production, keep confirmation on and
instead call `register_commuter` after the user verifies their email and
signs in — the RPC is idempotent to add later.)

## 4. Configure the frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Install and run:

```bash
npm install
npm run dev
```

Open the printed local URL. Sign up with any South African-format details —
the User Guide's worked example works as-is:

| Field | Value |
|---|---|
| Full Name | Thandi Dlamuki |
| Email | thandi.dlamuki@gmail.com |
| Phone | 0721234567 |
| SA ID | 900515 5000 086 |
| Password | Ride2work! |

On first login the app creates and registers your Gold Card automatically
(`get_or_create_my_card` RPC) — exactly like the original "your card is
waiting on the Home screen" behaviour.

## 5. Deploying

Build with `npm run build` and deploy the `dist/` folder to any static
host (Vercel, Netlify, Cloudflare Pages, Supabase Storage + a CDN, etc).
Set the same two `VITE_SUPABASE_*` env vars in your host's build settings.
No server process is needed — Supabase (Postgres + Auth + RLS) is the
entire backend.

## How the business rules were ported

Every rule from the Java domain model now lives in a Postgres function in
`0002_functions.sql`, called via `supabase.rpc(...)`:

| Rule | Spring Boot | Supabase |
|---|---|---|
| BR-01 card issuance | `GoldCardFactory` / `GoldCardService.createCard` | `get_or_create_my_card()` |
| BR-04 free transfer (60 min window) | `GoldCard.deductJourney` | `tap_journey()` |
| BR-06 concession discount verification | `Commuter.verifyConcession` | `verify_concession()` |
| BR-07 tap-on deduction | `GoldCard.deductJourney` | `tap_journey()` |
| BR-08 handheld verification | `CardVerificationResponse` | `verify_card()` (staff-only) |
| BR-09 effective-dated fares | `FareTableEntryRepository.findEffectivePrices` | `fares_quote()`, `fares_products_for_route()` |
| BR-10 balance protection via registration | `GoldCard.register` | `register_card()` |
| SA ID Luhn checksum | `Helper.isValidLuhn13` | `sa_id_luhn_valid()` |
| Simulated payment gateway | `PaymentAttempt` | `pay_topup_order()` |

Row Level Security replaces the Spring Security `@PreAuthorize` role checks:
commuters can only ever see their own card/orders/history; `staff` rows
(ADMIN/CLERK/INSPECTOR) unlock the back-office reads described in the User
Guide's §11 (verify concessions, refund payments, handheld card
verification). There's no admin UI in this frontend build — create staff
accounts directly in SQL once you have a real auth user:

```sql
insert into public.staff (id, first_name, surname, email, role)
values ('<auth-user-uuid-from-auth.users>', 'Jane', 'Clerk', 'jane@goldenway.example', 'CLERK');
```

## 6. Multi-role build (migrations 0005–0009) — NEW

After the four migrations above, apply the multi-role set **in order** (SQL Editor, one file at a time):

5. `supabase/migrations/0005_identity_and_onboarding.sql` — DRIVER/AGENT roles, staff access-request queue (admin-approved onboarding), staff audit log
6. `supabase/migrations/0006_operations.sql` — buses, vehicle runs (driver status → auto service alerts), inspection events (BR-08 handheld)
7. `supabase/migrations/0007_notifications.sql` — notifications + triggers on every event (purchase, tap, alert, ticket, inspection, …) + realtime
8. `supabase/migrations/0008_card_lifecycle.sql` — CASH gateway, signup-with-card lookup/link, in-app Gold Card order, clerk kiosk issue/cash sale/lost-card replace
9. `supabase/migrations/0009_support_completion.sql` — agent queue: claim/reply/resolve/escalate, agents-online, inbox list

### Demo seed (fictional cast)

Requires the **service_role** key (Project Settings → API → `service_role`; secret — server-side only):

```bash
cd supabase
npm install @supabase/supabase-js   # or use the frontend's node_modules
node seed-demo.mjs https://YOUR-PROJECT-REF.supabase.co YOUR-SERVICE-KEY
```

Creates: 5 staff accounts (one per role), 2 commuters, kiosk card **GW-1234-5678** issued against Thandi's ID (7 journeys on GOEASY-10 + weekly MP-CPT — exactly what the signup-with-card flow will show), 2 PENDING onboarding requests, 1 OPEN support ticket, 1 completed driver run, 2 inspection events.

| Demo login (all passwords: `GoldenWay!2026`) | Role |
|---|---|
| admin@goldenway.demo | ADMIN |
| clerk@goldenway.demo | CLERK |
| inspector@goldenway.demo | INSPECTOR |
| driver@goldenway.demo | DRIVER |
| agent@goldenway.demo | AGENT |
| thandi.dlamuki@gmail.com | COMMUTER (links GW-1234-5678 at signup) |
| sipho.mahlangue@gmail.com | COMMUTER (no card — auto-card path) |

Rotate all demo passwords and the service key after marking.

## Known simplifications vs. the original Spring backend

- **Field-level validation errors**: the original returned one message per
  invalid field; the Supabase RPC raises one message at a time (still shown
  to the user, just one at a time on resubmission instead of all at once).
- **Dangling auth users on failed registration**: if `register_commuter`
  rejects the payload (e.g. duplicate ID number) *after* `auth.signUp()`
  already succeeded, the Supabase Auth user exists without a commuter
  profile. The client-side validation in `RegisterScreen.jsx` already
  catches the common cases (ID checksum, password length) before calling
  the API, so this is rare in practice; if it happens, delete the orphaned
  user from **Authentication → Users** in the dashboard.
- **Support ticket chat screen**: the schema/RPCs for `support_tickets` /
  `ticket_messages` are included (BR from §10 of the User Guide) but the
  provided frontend's Support screen isn't wired to them yet — it's ready
  for you to connect the same way `card`/`fares` were.
