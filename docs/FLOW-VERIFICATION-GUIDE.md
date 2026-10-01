# GoldenWay — Flow Verification Guide for Collaborators

> **Audience:** a teammate who wants to prove, end-to-end, that every flow we
> have built so far actually works — from the auth screens down to the rows it
> writes in Supabase. Follow it top to bottom; each flow ends with a "prove it
> in the database" step so you can demonstrate the frontend↔backend link.

---

## 0. Setup (once per machine)

| What | Where / how |
|---|---|
| Repo | `github.com/JoshBlack25/GoldenWayApp` — clone it, `cd su2/GoldenWayApp` |
| Frontend env | `frontend/.env` (gitignored) — needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Copy `.env.example`, fill from the Supabase Dashboard → Project Settings → API keys (use the **publishable** key, not the secret one) |
| Run the app | `cd frontend && npm ci && npm run dev` → http://localhost:5173 |
| Supabase project | https://zosmjkmlbodqfttmzoll.supabase.co (Dashboard: `supabase.com/dashboard`) |
| SQL Editor | Supabase Dashboard → **SQL Editor** — you will paste proof queries there |

**Demo accounts** (created by `supabase/seed-demo.mjs`; password for all:
`GoldenWay!2026`):

| Email | Role | Signs in to |
|---|---|---|
| `admin@goldenway.demo` | ADMIN | Staff console (all lanes) |
| `clerk@goldenway.demo` | CLERK | Staff console (kiosk, concessions, profile) |
| `inspector@goldenway.demo` | INSPECTOR | Staff console (verify) |
| any commuter you register | COMMUTER | Commuter app |

---

## 1. AUTH — commuter signup & login

**Flow:** `/register` → fill the form → account created → lands on the commuter
home.

**What the frontend does:**
1. `supabase.auth.signUp({ email, password })` — creates the Supabase **Auth**
   user (no email confirmation needed; the project has *Confirm email OFF*).
2. Calls the `register_commuter` RPC with the form data — this writes the
   `commuters` row keyed to `auth.users.id`.

**Prove it in the DB** (SQL Editor):
```sql
-- The auth account (C = the password credential lives here)
select id, email, created_at from auth.users
where email = '<the email you signed up with>';

-- The commuter profile row (id matches the auth user id above)
select id, first_name, surname, email, phone, id_number, concession_type
from public.commuters
where email = '<the email you signed up with>';
```
✅ *CRUD proof:* the **CREATE** happened in two linked tables — `auth.users`
and `public.commuters` share the same UUID `id`.

Then log out and **log back in** at `/login` — that exercises the
`signInWithPassword` **READ** path against `auth.users`.

---

## 2. AUTH — staff signup (no OTP) & the approval gate

**Flow:** `/staff-signup` → submit → *nothing visible yet* (this is the point)
→ try to log in → app says *"awaiting admin approval"*.

**What the frontend does:**
1. `request_staff_access` RPC → inserts a **PENDING** row into
   `staff_access_requests`.
2. The same form calls `supabase.auth.signUp` — the auth user exists
   immediately, **but** the login gate (`loginAny` in
   `frontend/src/api/auth.js`) refuses any account that has no `staff` row.
3. Login attempts while PENDING are rejected client-side after the
   `my_staff_request_status` RPC confirms the PENDING state.

**Prove it in the DB:**
```sql
select id, email, requested_role, status, requested_at
from public.staff_access_requests
where email = '<the staff email you used>'
order by requested_at desc limit 1;   -- expect status = 'PENDING'
```

---

## 3. AUTH — admin approval provisions the staff row

**Flow:** sign in as `admin@goldenway.demo` → **Onboarding** tab in the staff
console → find the PENDING request → **Approve**.

**What the frontend does:** calls the `decide_staff_access(request_id, true)`
RPC. A Postgres trigger (`provision_staff_on_approval`, migration 0012) fires
and **inserts the `staff` row automatically** — the admin's click never
touches `public.staff` directly.

**Prove it in the DB:**
```sql
-- request is now APPROVED
select id, email, status, decided_at from public.staff_access_requests
where email = '<staff email>' order by requested_at desc limit 1;

-- the trigger created this row: same UUID as auth.users.id
select id, first_name, surname, email, role, active
from public.staff
where email = '<staff email>';
```
✅ *CRUD proof:* **CREATE** of the staff row happened server-side, triggered
by the admin's **UPDATE** of the request row.

---

## 4. CLERK — kiosk: issue a card, cash sale, replace lost card

Sign in as `clerk@goldenway.demo` → **Kiosk** tab.

### 4a. Issue a card to a commuter
Enter the commuter's **13-digit SA ID** → the `clerk_issue_card` RPC finds the
commuter, creates a `gold_cards` row (and optionally loads a product).

**Prove it:**
```sql
select card_number, owner_id, status, created_at
from public.gold_cards order by created_at desc limit 3;
```

### 4b. Cash sale (load trips)
In Kiosk: card number + product + route → `record_cash_sale` RPC →
`top_up_orders` row with `status='PAID'` + a `deductions`/`loaded_products`
entry.

**Prove it:**
```sql
select order_id, card_number, product_code, amount_cents, status, created_at
from public.top_up_orders order by created_at desc limit 3;  -- status = 'PAID'
```

### 4c. Replace a lost card
Old card number → `clerk_replace_lost_card` RPC → old card marked REPLACED, a
new card is issued with the balance moved across.

**Prove it:**
```sql
select card_number, status, replaced_by from public.gold_cards
where card_number = '<old card number>';
```

---

## 5. CLERK — concessions verification

Sign in as clerk → **Concessions** tab. A commuter's STUDENT/PENSIONER claim
appears if `concession_verified_at` is null. Click **Verify** →
`verify_concession` RPC stamps `concession_verified_at = now()` and fires a
notification to the commuter.

**Prove it:**
```sql
select first_name, concession_type, concession_verified_at
from public.commuters
where concession_verified_at is not null
order by concession_verified_at desc limit 5;
```

---

## 6. COMMUTER — card, trips, top-up (CRUD showcase)

Sign in as a commuter → the whole app is one CRUD cycle:

| Action | Screen | DB effect |
|---|---|---|
| Get my card | Home → Card | `gold_cards` row for `owner_id = me` (READ) |
| Tap a journey | Use Ticket | `deductions` row + journeys decrement (UPDATE) |
| Buy a top-up | Load Trips | `top_up_orders` row, status PENDING (CREATE) |
| Pay it | confirmation step | `top_up_orders.status = 'PAID'` (UPDATE) |
| Ride history | History | `deductions` + `tap_events` rows (READ) |

**Prove it:**
```sql
-- my card
select * from public.gold_cards where owner_id = '<my auth uuid>';
-- what the tap did
select * from public.deductions
where card_number = '<my card number>' order by id desc limit 5;
-- what the top-up did
select * from public.top_up_orders
where card_number = '<my card number>' order by created_at desc limit 5;
```

---

## 7. COMMUTER — profile update (editable fields)

Sign in as commuter → **Profile → Edit Info** → change phone → save.

**What the frontend does:** `updateMyProfile` in
`frontend/src/api/goldenway.js` — a direct **UPDATE** on `public.commuters`
allowed by RLS policy `commuters_update_self` (you may only update **your
own** row — try changing someone else's and it silently returns 0 rows).

**Prove it:**
```sql
select phone, first_name, surname from public.commuters
where email = '<my commuter email>';   -- shows the new phone
```

---

## 8. COMMUTER — support tickets

Sign in as commuter → **Support** → open a ticket → send a message.
Then sign in as `agent@goldenway.demo` (AGENT) → **Inbox** → claim → reply →
resolve.

**Prove it:**
```sql
select id, subject, status, assigned_to from public.support_tickets
order by created_at desc limit 5;
select sender, body from public.ticket_messages
where ticket_id = '<the id above>' order by created_at;
```

---

## 9. STAFF (any role) — notifications

Every staff decision (approval, denial, concession verification) writes a row
to `public.notifications`. The bell icon in the staff console reads it.

```sql
select user_id, kind, title, read_at from public.notifications
order by created_at desc limit 10;
```

---

## 10. The one-command smoke test

`supabase/verify-staff-onboarding.mjs` walks the *entire* staff-onboarding
loop (reachability → request → signup → gate refuse → admin approve → staff
row → gate admit) with zero manual steps:

```bash
cd supabase
node verify-staff-onboarding.mjs https://zosmjkmlbodqfttmzoll.supabase.co <publishable-key>
# expect: 8 passed, 0 failed
```

---

## Appendix — where each flow lives in the code

| Flow | Frontend entry point | Backend (RPC / table) |
|---|---|---|
| Commuter signup | `screens/auth/RegisterScreen.jsx` → `registerCommuter` | `register_commuter` RPC |
| Login gate (staff/commuter routing) | `api/auth.js` → `loginAny` | `my_profile_type` RPC |
| Staff request | `screens/auth/StaffSignupScreen.jsx` | `request_staff_access` RPC |
| Admin approval | `screens/staff/admin/OnboardingScreen.jsx` | `decide_staff_access` RPC + 0012 trigger |
| Kiosk issue / replace | `screens/staff/clerk/KioskScreen.jsx` | `clerk_issue_card`, `clerk_replace_lost_card` |
| Cash sale | KioskScreen | `record_cash_sale` RPC |
| Concessions | `screens/staff/clerk/ConcessionsScreen.jsx` | `verify_concession` RPC |
| Commuter profile | `screens/commuter/Profile/UpdateProfileScreen.jsx` | direct RLS-gated UPDATE |
| Support | `SupportScreen` / `InboxScreen` | `create_ticket`, `ticket_queue`, `reply_ticket` |
| Migrations | `supabase/migrations/0001…0013` | schema + RPCs |

**Coming next (built, pending review):** staff self-service profile edits —
migration `0013_staff_self_profile.sql` adds `staff.phone` and the
`update_my_staff_details` RPC (name / surname / phone / password-with-current-
password-check). The UI wiring is the next sprint item.
