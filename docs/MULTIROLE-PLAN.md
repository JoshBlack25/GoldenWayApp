# GoldenWay Multi-Role Plan — Drawing Board Edition

> **SUPERSEDED (planning):** this document's roles, research, mock inventory and phase order have been absorbed into **`FINAL-DEV-PLAN.md`** (same folder), which also answers the team's `QuesAndSuggest.md` points. Keep this file as the research record (§1 GABS sources) and demo script (§7); build follows FINAL-DEV-PLAN only.

**Status:** PLANNING ONLY. No building yet. This document is the contract we agree on before a single line changes.
**Stack decision:** continue with **Supabase** (Postgres + Auth + RLS + RPCs) as the backend; the Spring Boot project (`goldenway-backend`) stays as the **domain reference** — every new feature is specced against its entities/enums first, then ported to a migration + RPC, exactly like SETUP.md's "How the business rules were ported" table.
**App being planned:** `su2/su2` (Supabase edition of the frontend).

---

## 1. GABS research — real roles we are adopting (not inventing)

Sources: gabs.co.za (Gold Card, BusForUs, Point of Purchase pages), Business Report 8 Feb 2018 (AFC launch, spokesperson Bronwen Dyke-Beyer), Western Cape Mobility vendor/kiosk map (Jul 2025). GAPS ARE MARKED `(unverified)`.

### 1.1 What the real business says

| Real GABS role | What research says they do | Implication for GoldenWay |
|---|---|---|
| **Commuter / passenger** | Buys a **Gold Card** for **R40 once-off** at kiosks/vendors, loads **products** (not money), taps on boarding; card may be tapped **unregistered** but **registration protects the balance** | Our COMMUTER role. Registration = link card to profile (BR-01, BR-10) |
| **Driver (bus operator)** | Compulsory training: 90 credits of the Professional Drivers Skills Programme and/or 122 credits of the National Certificate in Professional Drivers (gabs.co.za BusForUs). Since AFC (2018), fares are handled by the onboard console — drivers operate the console, no paper ticket selling | Our DRIVER role: run a vehicle on a route/departure and report running status (on time / delayed / breakdown) — the source of truth for live info |
| **Inspector (revenue protection)** | "Handheld verifiers will be used by inspectors to verify cards as an additional fare evasion counter-measure" (Business Report, Feb 2018). Inspectors read card state on board; cash fares still get a printed ticket | Our INSPECTOR role: handheld-verifier screen — look up a card, read status/balance/products, record inspection outcome, verify concessions in the field (BR-08) |
| **Kiosk / vendor agent** | Gold Cards + product loads sold at kiosks and independent vendors (Bellville terminus kiosk, Solly's Service Station Atlantis, etc. — POS locations PDF). Agents also do card registration with ID | Our CLERK role: issue & register cards, load products in person (cash), verify concession documents, replace lost cards |
| **Customer service agent** | GABS runs customer service channels (phone/feedback). `(unverified: current toll-free number & WhatsApp line — confirm from gabs.co.za before demo)` | Our AGENT role: real support chat answering commuter tickets |
| **Back office / depot operations** | 7 depots, DTPW contract, fares are **regulated and effective-dated** (annual increases, usually July) | Our ADMIN role: owns routes, timetables, fare products, effective-dated fare tables, staff accounts, published alerts |
| **Maintenance/mechanics, depot controllers, SBU managers** | Exist at GABS (careers pages) but no commuter-facing digital job | **Out of scope** for the app — recorded here so we can say we considered them |

### 1.2 The Gold Card question — "what if a commuter wants one?"

Research answer: in real life a commuter **goes to a kiosk/vendor, pays R40, walks away with a card, and can either tap it unregistered or register it (with ID) so the balance is protected.** They never buy "money on the card" — they load products.

App answer (three paths, all realistic):

1. **"I don't have a card yet"** — commuter orders a Gold Card in-app → simulated R40 payment (same SIMULATED gateway as top-ups) → an `UNREGISTERED` card with a `GW-XXXX-XXXX` number is created and shown on the Card screen with a "register to protect your balance" prompt. *(Mirrors BR-01 + BR-10.)*
2. **"I bought a card at a kiosk"** — commuter enters the card number printed on their physical card + their SA ID; if the card exists and is unowned/unregistered, it links to their profile. *(Mirrors kiosk registration.)*
3. **"Clerk did it for me"** — a CLERK creates and registers a card against the commuter's profile in the clerk console (kiosk simulation).

### 1.3 Inspector duties → concrete app behaviour (BR-08)

- **Handheld verifier screen:** enter `GW-XXXX-XXXX` → read-only card report: status, owner name, concession type + verification, loaded products with journeys remaining, last deductions.
- **Inspection outcome logging:** record `VALID`, `NO_PRODUCT`, `EXPIRED_PRODUCT`, `UNREGISTERED_CARD`, `REFUSED` — stored in an `inspection_events` table. This is the app's "fare evasion counter-measure" and gives ADMIN a revenue-protection report.
- **Field concession check:** inspector can see whether a student/pensioner concession is verified (they check student cards in real life).

---

## 2. Role model

### 2.1 Roles (one enum, extended)

`staff.role` becomes: **`ADMIN` · `CLERK` · `INSPECTOR` · `DRIVER` · `AGENT`**
Commuters stay in `commuters` (separate table, as today). Every staff member is a Supabase Auth user with a `staff` row — same pattern the schema already uses.

### 2.2 Responsibility & permission matrix (the contract)

| Capability | COMMUTER | DRIVER | INSPECTOR | CLERK | AGENT | ADMIN |
|---|---|---|---|---|---|---|
| Register / login / reset password | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Buy / link Gold Card, load products, tap, history | ✅ | — | — | — | — | — |
| Report running status (on time / delayed / breakdown) per route+departure | — | ✅ | — | — | — | ✅ (correct) |
| Handheld card verification + inspection outcomes | — | — | ✅ | — | — | ✅ (read) |
| Issue/register card at kiosk, cash product load, lost-card replace, concession verification | — | — | — | ✅ | — | ✅ |
| Answer support chat, resolve/escalate tickets | — | — | — | — | ✅ | ✅ |
| Routes / stops / timetables / fare products / fare tables CRUD | — | — | — | — | — | ✅ |
| Publish service alerts | — | (auto via delay report) | — | — | — | ✅ |
| Staff account management (create/deactivate) | — | — | — | — | — | ✅ |
| See all payments/orders + reports | — | — | — | (own kiosk sales) | — | ✅ |
| Read live alerts, timetables | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Notes:
- CLERK writes catalog **only through the kiosk-sale flow**, never catalog CRUD — pricing stays under ADMIN because fares are regulated (BR-09).
- DRIVER delay reports **auto-create** a `service_alerts` row (severity WARNING, route-scoped) — commuters see it on Home immediately; ADMIN can edit/withdraw it.

---

## 3. Current state audit — every mock and its disposition

| # | Mock in `su2/su2/frontend` | Where | Disposition |
|---|---|---|---|
| M1 | "Forgot Password?" link does nothing | `LoginScreen.jsx` | **Real:** Supabase `resetPasswordForEmail` + `/reset-password` screen (`updateUser({ password })`) |
| M2 | Notification bell renders but goes nowhere | `DashboardHeader.jsx` | **Real:** `notifications` table + DB triggers + realtime + `/notifications` page (§5.3) |
| M3 | Support chat is 4 canned messages from `INITIAL_MESSAGES` | `SupportScreen.jsx` | **Real:** wire to existing `support_tickets`/`ticket_messages` + realtime; AGENT console answers |
| M4 | Route 42 "live tracking" timeline is hardcoded ("Bellville terminal 09:05") | `Route42Screen.jsx`, `TripScreen.jsx` | **Real:** derive from `route_departures` + DRIVER status reports (simulated GPS = schedule + reported delay) |
| M5 | Payment step is a "demo wallet" of saved cards | `PaymentStep.jsx`, `AddCardDrawer.jsx` | **Keep simulated gateway (documented ACL decision) but persist attempts** — already done server-side; relabel "Payment Methods", show attempt status + receipt ref. Clerk cash sales become a `CASH` gateway attempt |
| M6 | Staff can only be created by raw SQL | `SETUP.md §"staff"` | **Real:** ADMIN console staff management (create user + staff row, deactivate) |
| M7 | Concession: stored & shown, never verified by anyone | `ProfileScreen.jsx`, RLS allows staff updates | **Real:** CLERK/INSPECTOR verification action (RPC exists as `verify_concession`) wired to consoles |
| M8 | Card appears magically on first login ("your card is waiting") | `get_or_create_my_card` | **Real choice:** keep auto-create for demo, but add the three Gold Card paths from §1.2; commuter can have 0 cards before ordering |
| M9 | "Agents online" indicator, call button | `SupportScreen.jsx` | cosmetic — keep, but "online" = any AGENT/ADMIN active in last 5 min (simple query) |

Backend-side gaps (no screen yet, both packages): no `DRIVER`/`AGENT` roles, no `notifications`, no `inspection_events`, no vehicle/run table, no ticket assignment, no staff audit log. All specced in §5.

---

## 4. Frontend structure after the change

Two app surfaces under one React app:

```
/                          commuter app (unchanged chrome: BottomNav)
  /login /register /account-created
  /forgot-password /reset-password          ← new (M1)
  /home /timetable /route-42 /support …     ← existing, de-mocked (M2 M3 M4)
  /notifications                            ← new (M2)
  /card → Add "Order a Gold Card" / "Link an existing card"   ← new (M8)

/staff/*                   staff console (new chrome: sidebar/topbar, role-gated)
  /staff/login              ← same Supabase Auth, routes by profile type
  /staff/dashboard          ← role-aware landing (each role sees its tools)
  /staff/verify             ← INSPECTOR handheld verifier (FA-13 from the old concept doc)
  /staff/kiosk              ← CLERK: issue card / cash load / verify concession
  /staff/runs               ← DRIVER: today's runs + status reporting
  /staff/inbox              ← AGENT: ticket queue + chat
  /staff/catalog            ← ADMIN: routes, timetables, products, fare tables
  /staff/alerts             ← ADMIN: publish/edit alerts
  /staff/team               ← ADMIN: staff accounts
  /staff/orders             ← ADMIN: all orders/payments + inspection reports
```

Routing guard: `ProtectedRoute` gains `roles` prop; login resolves **commuter vs staff vs nothing** and routes accordingly. Commuter app remains the default surface.

---

## 5. Backend design (Supabase migrations, specced from the Spring domain)

> Spring reference first, port second — same discipline as SETUP.md's porting table.
> Spring sources: `Staff`/`Role`, `ServiceAlert`, `SupportTicket`/`TicketMessage`/`SenderType`, `CardVerificationResponse`, `GoldCard`.

### 5.1 Migration A — identity & roles
- `staff.role` check → `('ADMIN','CLERK','INSPECTOR','DRIVER','AGENT')`
- `staff_action_log(id, actor_id → staff, action text, entity text, entity_id text, at)` — audit every staff mutation (ownership matrix already promised this)
- RPCs: `create_staff_member(...)` (ADMIN-only; uses `service_role`-side invite or admin password), `set_staff_active(...)`, `my_staff_profile()` (drives role routing at login)
- RLS: each console table gets staff-role-scoped policies via the existing `is_staff(variadic)` helper

### 5.2 Migration B — operations: runs, delays, inspections
- `vehicle_runs(id, driver_id → staff, route_code, bus_id, direction, service_day, started_at, ended_at, status check in ('ON_TIME','DELAYED','BREAKDOWN','DIVERTED','COMPLETED'), delay_minutes int default 0)`
  - DRIVER creates/updates own run; RPC `report_run_status(run_id, status, delay_minutes, note)`
  - trigger: on DELAYED/BREAKDOWN → insert `service_alerts` (WARNING/CRITICAL, route-scoped, body from note) → commuters' Home banner + notifications light up with zero extra work
- `inspection_events(id, inspector_id → staff, card_number, outcome check in ('VALID','NO_PRODUCT','EXPIRED_PRODUCT','UNREGISTERED_CARD','REFUSED'), note, at)`; RPC `verify_card_by_number` already exists as `verify_card()` — extend with products + concession; read-only, never mutates card state
- RPC: `lookup_card_for_inspection(p_card_number)` (INSPECTOR/ADMIN) returning owner first name + initial, status, concession verified, products, last 5 deductions — **privacy: no contact details**

### 5.3 Migration C — notifications
- `notifications(id, user_id uuid (commuter OR staff), type, title, body, link_path, read_at, created_at)`
- DB triggers insert rows on: top-up PAID (receipt), service alert published for a route the commuter has ridden/tapped (simple: any alert, filter client-side later), ticket reply (to commuter) / ticket created (to AGENTs), delay on a route the commuter tapped today, card registered
- Bell: unread count via realtime channel + `/notifications` list + mark-read RPC. In-app only for now; email digests and web-push are a later, optional layer

### 5.4 Migration D — kiosk & card lifecycle
- `top_up_orders.gateway` attempt rows already exist → add `'CASH'` gateway for clerk sales (`record_cash_sale(card_number, product_code, route_code)` CLERK-only)
- RPCs: `order_gold_card()` (commuter; creates UNREGISTERED card + R40 simulated payment), `link_existing_card(p_card_number, p_id_number_last4)` (commuter; matches owner-id check), `clerk_issue_card(p_commuter_email_or_id)` + `clerk_replace_lost_card(p_card_number)` (CLERK)
- Lost/replacement keeps BR-01 semantics: R40 once-off on replacement `(confirm with team — GABS practice unverified)`

### 5.5 Migration E — support chat completion
- `support_tickets.assigned_to uuid → staff`, `priority` — AGENT queue: OPEN → (claim) IN_PROGRESS → RESOLVED; escalation = reassign to ADMIN
- RPCs: `claim_ticket`, `reply_ticket`, `resolve_ticket`; commuter realtime subscription for agent replies (M3 becomes real)

---

## 6. Build order (agreed before any code)

| Phase | Deliverable | Mocks killed | Owner lane (maps to existing ownership matrix) |
|---|---|---|---|
| **P0 — Auth foundations** | Forgot/reset password (M1); login that routes commuter vs staff; role-gated `ProtectedRoute`; staff console shell with empty role dashboards | M1 | Raul (identity) |
| **P1 — Notifications** | Migration C + bell + `/notifications` + realtime (M2) | M2 | Joshua Bird (operations) |
| **P2 — Real support chat** | Migration E + commuter SupportScreen rewired + AGENT inbox (M3, M9) | M3, M9 | Joshua Bird (operations) |
| **P3 — Catalog admin** | Routes/stops/timetables/products/fare-table CRUD + alerts publisher; CLERK kiosk sale reuses it | — | Matthew (fare & catalog) |
| **P4 — Card lifecycle & kiosk** | Migration D + Gold Card order/link flows + clerk console (M8, M7) | M8, M7 | Aiden (card & ticket) + Raul (concession verify) |
| **P5 — Inspector & driver** | Migrations B + handheld verifier + driver runs/status → auto alerts (M4 becomes real data) | M4 | Aiden (card) + Joshua Black (integration) |
| **P6 — De-mock payments & polish** | Payment Methods relabel, attempt status + receipts everywhere, staff audit log views, demo script | M5, M6 | Joshua Black (payments/integration) |

Each phase = one PR per repo location (`su2/su2`), with the migration + RPCs + RLS + screens together, and the Spring reference entity listed in the PR description.

## 7. Demo scenario this unlocks (the "real-life simulation")

One story, five phones/tabs:
1. ADMIN publishes July fare table + creates the four staff accounts.
2. COMMUTER (Thandi) resets her forgotten password, orders a Gold Card (R40), loads GOEASY-10 on KHA-CPT, taps.
3. DRIVER reports "DELAYED 15 min" on KHA-CPT → alert + notification hits Thandi's bell instantly.
4. INSPECTOR boards, runs her card number through the handheld verifier → VALID.
5. Thandi chats with an AGENT about the delay; ticket OPEN → IN_PROGRESS → RESOLVED.
6. CLERK verifies a student concession and sells a cash load at the kiosk.
Every screen in that story is backed by a real row in Postgres — nothing canned.

## 8. Open questions for the team

1. **Staff account creation:** ADMIN creates users in-app (Supabase admin API / invite links) vs SQL seed for the demo? *(Recommend in-app for ADMIN + SQL seed script for the demo day.)*
2. **Driver buses:** do we maintain a `buses` master table (fleet numbers) or free-text `bus_id`? *(Recommend master table, seeded with ~10 fleet numbers.)*
3. **Replacement card fee:** charge R40 on lost-card replacement like the first card? `(unverified GABS practice — check before P4)`
4. **Notification scope:** any alert → all commuters, or only commuters who tapped that route in the last N days? *(Recommend route-tapped-in-7-days to keep it realistic and quiet.)*
5. **Password reset channel in demo:** Supabase sends real emails — fine for demo with a real mailbox, or use OTP mode to show the code on screen? *(Recommend real email; it demos better.)*
