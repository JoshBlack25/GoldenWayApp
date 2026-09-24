# GoldenWay — Phases A–C Implementation Record

**Feature:** DB-backed payment wallet + tap-validation hardening
**Date:** September 22, 2026
**Status:** ✅ Complete and verified (lint 0/0, tests 32/32, build green) — pending final end-to-end purchase confirmation after the RLS fix, and not yet committed/pushed

---

## Table of contents

1. [Context & goals](#1-context--goals)
2. [Phase A — DB-backed payment wallet](#2-phase-a--db-backed-payment-wallet)
   - 2.1 [Migration 0016 — `payment_methods` table](#21-migration-0016--payment_methods-table)
   - 2.2 [`pay_topup_order` extension](#22-pay_topup_order-extension)
   - 2.3 [API layer — `api/paymentMethods.js`](#23-api-layer--apipaymentmethodsjs)
   - 2.4 [Wallet state in `TripProvider`](#24-wallet-state-in-tripprovider)
   - 2.5 [`LoadtripsScreen` rewiring](#25-loadtripsscreen-rewiring)
   - 2.6 [`AddCardDrawer` — validation + tokenization](#26-addcarddrawer--validation--tokenization)
   - 2.7 [`PaymentStep` — UI updates](#27-paymentstep--ui-updates)
   - 2.8 [Test updates for the wallet](#28-test-updates-for-the-wallet)
3. [Phase B — tap-validation hardening](#3-phase-b--tap-validation-hardening)
4. [Phase C — verification](#4-phase-c--verification)
5. [Bugs found and fixed during testing](#5-bugs-found-and-fixed-during-testing)
6. [Design decisions](#6-design-decisions)
7. [Known limitations & next steps](#7-known-limitations--next-steps)

---

## 1. Context & goals

The Load Trips purchase flow was already ~95% real: orders (`create_topup_order`), payment (`pay_topup_order`), receipt references, and loaded products all wrote real rows to Supabase. The only simulated piece was the **saved payment cards**: a hardcoded `INITIAL_CARDS` demo wallet held in component state inside `LoadtripsScreen.jsx` (vanished on refresh, not tied to any user).

**Requirements agreed with the user:**

- Payment stays simulated (no real money gateway) — but the wallet itself must be persistent, per-user, and fully backend-backed.
- Users enter fake card details; the app validates them (Luhn + brand) and saves a **tokenized** form (brand + last 4 digits only) to the database.
- Wallet scope: **per user account** (one wallet usable on any of their Gold Cards).
- Users can **add and remove** methods, maximum **3** (existing `MAX_SAVED_CARDS` rule kept).
- Tap validation: keep the on-screen simulated validator (no physical hardware for the demo), but make every value it shows come from the real backend.

---

## 2. Phase A — DB-backed payment wallet

### 2.1 Migration 0016 — `payment_methods` table

**New file:** `supabase/migrations/0016_payment_methods.sql`

Creates the per-user payment wallet:

```sql
create table if not exists public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  brand       text not null check (brand in ('VISA','MASTERCARD','GENERIC')),
  last4       text not null check (last4 ~ '^[0-9]{4}$'),
  exp_month   int  not null check (exp_month between 1 and 12),
  exp_year    int  not null check (exp_year >= 2024),
  holder_name text not null default '',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint payment_methods_last4_shape check (char_length(last4) = 4)
);
```

Key details:

- **`default auth.uid()` on `user_id`** — the client never sends `user_id` (RLS scopes everything to the caller), so the row is stamped server-side from the JWT. *This default was added in the bugfix round — see [section 5](#5-bugs-found-and-fixed-during-testing).*
- **No full PAN column exists.** The database physically cannot store a card number — only `brand` + `last4` + expiry. This is deliberate PCI-alignment even though the gateway is simulated.
- Check constraints enforce brand enum, 4-digit last4, valid month, sane expiry year.
- Index: `idx_payment_methods_user` on `user_id`.

Row Level Security:

```sql
alter table public.payment_methods enable row level security;

create policy payment_methods_own_select on public.payment_methods
  for select using (auth.uid() = user_id);
create policy payment_methods_own_write on public.payment_methods
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.payment_methods to authenticated;
```

- Users can only ever read/modify their **own** methods; the anon key can do nothing.

### 2.2 `pay_topup_order` extension

The same migration replaces `public.pay_topup_order` with a version that accepts an optional payment method:

```sql
create or replace function public.pay_topup_order(
  p_order_id bigint,
  p_payment_method_id uuid default null
)
returns public.top_up_orders
```

Behavior:

- **Validates ownership**: if `p_payment_method_id` is given, the method must belong to `auth.uid()`, otherwise raises `42501` (FORBIDDEN).
- Keeps **all** the original logic intact — order lookup, owner check, `PENDING_PAYMENT` status gate, BR-09 price-authority check against `fare_table_entries` (declines the order on missing/mismatched price), card-status gate (`LOST`/`EXPIRED`), receipt reference generation, and the `loaded_products` insert that actually puts journeys on the card.
- **Stamps the method on the payment attempt** — the gateway reference now reads like `GW-RCPT-XXXX · VISA ••4242` so receipts show which card paid.
- Fully idempotent — re-running the migration is safe (`create or replace`).

### 2.3 API layer — `api/paymentMethods.js`

**New file:** `frontend/src/api/paymentMethods.js`

| Export | What it does |
|---|---|
| `mapPaymentMethod(row)` | Maps a DB row to the UI shape (`exp_month` → `expMonth`, `is_default` → `isDefault`, etc.) |
| `fetchPaymentMethods()` | `select *` ordered default-first, then newest-first |
| `addPaymentMethod({number, expMonth, expYear, holderName})` | **Tokenizes and saves.** Validates 13–19 digits, month 1–12, year within this year +20. Brand detection is delegated to the existing `detectCardBrand` from `loadTripsData` (AMEX maps to `GENERIC` since the DB enum doesn't include it). Inserts only `{brand, last4, exp_month, exp_year, holder_name}` — **the full PAN never leaves this function's scope** |
| `deletePaymentMethod(id)` | RLS enforces ownership |
| `setDefaultPaymentMethod(id)` | Two-step: clear the existing default, then set the new one — guarantees at most one default |

Errors are converted with the same `toApiError` convention (`42501` → ApiError 403 with friendly copy) used across `operations.js`.

### 2.4 Wallet state in `TripProvider`

**Modified:** `frontend/src/context/TripProvider.jsx`

New context members:

```js
paymentMethods,          // array of mapped methods
paymentMethodsBusy,      // loading flag
savePaymentMethod(input),   // addPaymentMethod + refresh list
removePaymentMethod(id),    // deletePaymentMethod + refresh list
makeDefaultPaymentMethod(id) // setDefaultPaymentMethod + refresh list
```

Lifecycle wiring:

- On mount / `SIGNED_IN`: wallet is fetched alongside trips (`refreshPaymentMethods()` added to `loadIfSignedIn` and the `SIGNED_IN` auth-state handler).
- On `SIGNED_OUT`: wallet is cleared (`setPaymentMethods([])`).
- `refreshPaymentMethods` added to the load effect's dependency array (keeps the `exhaustive-deps` rule satisfied — introduced as part of the lint-clean policy).
- `addRides` (the purchase path) now accepts `paymentMethodId` in its options object and forwards it to `payTopupOrder(order.id, paymentMethodId)`.

**Modified:** `frontend/src/context/trip.js` — doc comment updated to document the new wallet members.

### 2.5 `LoadtripsScreen` rewiring

**Modified:** `frontend/src/screens/commuter/LoadTrips/LoadtripsScreen.jsx`

- **Removed** the `INITIAL_CARDS` import (and later the constant itself from `loadTripsData.js`).
- Local `cards`/`setCards` state replaced by a **mirror of the DB wallet**, mapped into the shape the step components already consumed:

```js
const cards = useMemo(
  () => paymentMethods.map((m) => ({
    id: m.id,
    brand: m.brand === "VISA" ? "Visa" : m.brand === "MASTERCARD" ? "Mastercard" : "Card",
    last4: m.last4,
    expiry: `${String(m.expMonth).padStart(2, "0")}/${String(m.expYear).slice(-2)}`,
    isDefault: m.isDefault,
  })),
  [paymentMethods],
);
```

- **Selection auto-heals**: an effect keeps `selectedCardId` pointing at a card that still exists, preferring the wallet's default, then the first card, else empty (which disables Continue on the Payment step).
- `handleAddCard` is now async: calls `savePaymentMethod(newCard)`, selects the saved row's real DB id, and closes the drawer. Failures land in a dedicated `cardError` state shown **inside the drawer** (see [section 5](#5-bugs-found-and-fixed-during-testing)).
- `handlePayNow` forwards `paymentMethodId: selectedCardId || null` into `purchase(...)`, and `selectedCardId` was added to its dependency array.

### 2.6 `AddCardDrawer` — validation + tokenization

**Modified:** `frontend/src/screens/commuter/LoadTrips/components/AddCardDrawer.jsx`

- **Luhn validation** added via the shared `luhnValid` from `utils/saId.js` — the card must pass the checksum before Save is enabled, matching the SA-ID rigor the backend uses.
- Expiry is parsed from `MM/YY` (or `MM/YYYY`) and both parts validated before enable.
- `canSave` now requires: holder name, ≥13 digits, **Luhn valid**, valid month, valid year, CVV length ≥3.
- `onSave` payload **changed shape** — it no longer fabricates a fake id or echoes card data back:

```js
onSave({
  holderName: holder.trim(),
  number: digits,        // passed upward ONLY for tokenization, then discarded
  expMonth: parseInt(expMonth, 10),
  expYear: expYear.length === 2 ? 2000 + parseInt(expYear, 10) : parseInt(expYear, 10),
});
```

- A code comment documents the PCI stance: the full PAN and CVV are discarded in this component; only tokenized fields persist.

### 2.7 `PaymentStep` — UI updates

**Modified:** `frontend/src/screens/commuter/LoadTrips/components/PaymentStep.jsx`

- Header docstring updated: methods come from the user's DB wallet (0016); the gateway is simulated via `pay_topup_order`.
- Each saved method row now shows:
  - the brand,
  - a gold **DEFAULT** badge when `isDefault`,
  - `•••• {last4} · expires {MM/YY}`.
- New empty-state hint under the list when the wallet has no methods: *"No saved cards yet — add one to continue. Only the brand and last 4 digits are stored."*
- Continue button stays disabled with zero methods or no selection (pre-existing behavior, now meaningful since the wallet can genuinely be empty).

### 2.8 Test updates for the wallet

**Modified:** `frontend/src/screens/commuter/LoadTrips/data/loadTripsData.test.js`

- The old "caps saved cards and seeds the demo with two" test depended on the deleted `INITIAL_CARDS`; rewritten to only assert `MAX_SAVED_CARDS === 3` ("caps the wallet at three methods").

**New file:** `frontend/src/api/paymentMethods.test.js` — 4 tests, Supabase mocked:

1. **"persists only tokenized fields — never the full PAN or CVV"** — inserts a card, inspects the row handed to `.insert()`, asserts the full 16-digit PAN string appears nowhere in it, that `last4` is correct, that brand matches, and that no `cvv` key exists. This is the security regression test for the whole tokenization approach.
2. Rejects a too-short card number (`"411"`) with the 13–19 message **before any DB call**.
3. Rejects expiry month 13.
4. `mapPaymentMethod` round-trips a DB row into the exact UI shape (camelCase, boolean default, all fields).

---

## 3. Phase B — tap-validation hardening

**Modified:** `frontend/src/context/TripProvider.jsx` — `deductRide`

Before: every tap used hardcoded identifiers — `tapJourney(cardNumber, routeCode, "GW-BUS-42", "VAL-01")`.

Now:

```js
let busId = "GW-BUS-42";
try {
  const live = await fetchLiveRuns(routeCode);
  if (live?.length && live[0].busId) busId = live[0].busId;
} catch { /* best-effort; tap proceeds on the fallback */ }
const deduction = await tapJourney(card.cardNumber, routeCode, busId, "VAL-01");
```

- If a **driver currently has an active run** on the route (a real `vehicle_runs` row from the AB-branch driver features), the tap is attributed to **that actual bus**.
- Otherwise the demo vehicle keeps the validator usable standalone.
- The run lookup is deliberately best-effort: a lookup failure never blocks a legitimate tap.
- After the tap, the balance is **re-read from the backend** (`journeysRemaining`) rather than locally decremented — the UI can never drift from what the database says the card holds. (This re-read already existed; it is now the single source of truth with no local arithmetic alongside it.)
- `fetchLiveRuns` import added from `api/operations.js`.

What was intentionally **not** changed: the on-screen validator chrome in `UseTicketScreen.jsx` (route picker → tap animation → result). It remains the deliberate demo stand-in for a physicalvalidator, but every value behind it (route, bus, deduction result, remaining balance, free-transfer decision BR-04) is real backend data.

---

## 4. Phase C — verification

- `npm run lint` — **0 warnings, 0 errors** (82 files).
- `npm test` — **32 passed** (was 28; +4 new wallet tests, −0).
- `npm run build` — succeeds (bundle size unchanged by this work; ~1.88 MB with MapLibre, the pre-existing code-splitting task is separate).
- Visual/manual checks in the running dev server — app loads, login renders, HMR clean.

---

## 5. Bugs found and fixed during testing

### 5.1 Build failure — redeclared `cards`

During the LoadtripsScreen rewiring, the new `useMemo` version of `cards` briefly coexisted with the old `useState` declaration → rolldown build error *"It can not be redeclared here"*. Fixed by deleting the leftover `useState` line.

### 5.2 Test failure — brand casing

`detectCardBrand` returns `"Visa"` (display casing); the test initially expected the DB enum `"VISA"`. Test corrected to expect the actual contract of the function under test.

### 5.3 Lint — unused `brand` and missing dep

- `AddCardDrawer` kept a `const brand = detectCardBrand(number)` that became unused once saving delegated brand detection to the API layer → removed.
- New `refreshPaymentMethods` call in the auth effect wasn't in the dep array → added (restores the 0-warning state).

### 5.4 Duplicate import in test file

A careless replace produced `MAX_SAVED_CARDS` twice in the loadTripsData test import → deduplicated.

### 5.5 The big one — RLS insert violation (42501) on saving a card

**Symptom (user-reported):** entering card details and pressing *Save Card* did nothing; DevTools showed:

```
POST /rest/v1/payment_methods  403
{"code":"42501","message":"new row violates row-level security policy for table \"payment_methods\""}
```

**Diagnosis:** the insert payload never includes `user_id` (by design — RLS scopes everything to the caller), so Postgres tried to insert a row with `user_id = NULL`. The `payment_methods_own_write` policy's `with check (auth.uid() = user_id)` evaluated `NULL` as not-equal → the insert was rejected.

**Fix:** server-side default on the column — `alter table public.payment_methods alter column user_id set default auth.uid();` — baked into migration 0016 (both the `create table` default and a standalone `alter ... set default` statement so projects that already created the table get the fix on re-run). The one-liner was applied manually in the Supabase SQL Editor to unblock testing immediately.

**Related hardening from the same round:** `handleAddCard` originally pushed its error into `payError`, which is only displayed on the Review step — the drawer appeared to "do nothing". A dedicated `cardError` state now renders a red `role="alert"` banner **inside the AddCardDrawer**, passed via a new `error` prop, and cleared on close. `LoadtripsScreen` passes it through and resets it.

### 5.6 Tooling note — how the migration was confirmed applied

The user initially pasted Supabase's auto-generated `auth`-schema export, which can't show `public` tables. Verification queries were provided (`pg_class` check for the table + RLS flag, and a plain `select * from public.payment_methods`), and the user then confirmed rows were appearing.

---

## 6. Design decisions

| Decision | Rationale |
|---|---|
| Per-user wallet (not per-card) | Matches real fare-app UX; one saved card serves any Gold Card the user holds. Chosen via structured question with the user. |
| Allow removal | User's explicit choice; UI affordance is the next slice if wanted (list-level delete button not yet added). |
| Store only brand + last4 + expiry | Real PCI-DSS practice. The full PAN is discarded in `AddCardDrawer` before any network call; a dedicated test asserts it never reaches the insert payload. |
| Wallet in `TripProvider` (not a new provider) | All purchase-adjacent state already lives there; one context avoids a provider pyramid. |
| Default stamping via `auth.uid()` DB default | Never trust the client to send its own user id; the JWT is the authority. Also the direct cure for the 42501. |
| Simulated gateway retained | User requirement: no real money. `pay_topup_order` remains the single authority on price (BR-09) and order lifecycle. |
| Keep the simulated validator UI | No physical hardware for demos; underlying endpoint (`tap_journey`), transfers (BR-04), and balance authority are all real. |
| Max 3 methods (existing constant) | Pre-existing product rule, kept unchanged across the migration. |

---

## 7. Known limitations & next steps

1. **Remove affordance in UI not yet added** — `removePaymentMethod` / `makeDefaultPaymentMethod` exist in the API and context but no delete/set-default buttons render in `PaymentStep` yet.
2. **First save on a fresh account makes the default** — the wallet orders default-first; there's no "make default" toggle yet.
3. **Migration 0016 must be applied** to any environment before the payment step works (it fails gracefully with the drawer error banner otherwise).
4. **Commit/push pending** — all changes from Phases A–C are currently uncommitted on `main`'s working tree.
5. **Next major workstream (user-approved plan):** proper authentication & authorization —
   - Commuter email verification via Supabase SMTP (user's own email): signup → "verify your email" screen → link → "verified, you may log in" page → login blocked until verified.
   - Staff signup: request (email + role) → admin approves on the Onboarding page → OTP emailed via SMTP → staff enters OTP (system must recognize email + chosen role) → full signup → dashboard access.
   - Then deployment to Vercel.
6. **Separate pending item:** bundle code-splitting (~1.88 MB, MapLibre) — unrelated to this feature.
