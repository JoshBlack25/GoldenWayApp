# GoldenWay Development Plan — FINAL planning phase (build starts after this)

**Status:** This is the last planning document. It absorbs `MULTIROLE-PLAN.md` and answers every point in `QuesAndSuggest.md` (§1 below). When the team signs off, development starts at D0 (§5).
**Stack:** `su2/su2` Supabase package (Postgres + Auth + RLS + RPC + Realtime). Spring Boot repo stays the domain reference only.
**Brand:** existing tokens from `frontend/src/index.css` — GABS red `#e1251b` (`brand-*`) for live/alerts, gold `gold-*` reserved for Gold Card product moments, cream/ink body, Poppins display + Inter body. The commuter app keeps the mobile shell (max-width 430px); the staff console gets a navy (`navy-950/900/800`) dark sidebar chrome on desktop-width layouts — same tokens, no new palette.
**Supabase ↔ Postgres ↔ pgSQL:** one thing, three names — the plan's database work is written as SQL migration files that run on Supabase Postgres, called from React via `supabase.rpc(...)`. The `.freebuff` skills inform design/UX principles; they are docs, not executable backends, so backend principles land as RLS policies + SECURITY DEFINER RPCs in the migrations.

---

## 1. Answers to `QuesAndSuggest.md` (all 8 points)

### Q1 — Two signup types: with card / without card ✅ resolved
- **Without card (exists today):** current register → `get_or_create_my_card` auto-issues a card. Stays as the default path (zero friction for demo).
- **"I already have a card" (new):** checkbox on the register flow (and a "Link existing card" action on the Card screen for existing users).
  - Flow: commuter enters the `GW-XXXX-XXXX` number printed on the physical card → `link_existing_card(p_card_number, p_id_number)` RPC validates: card exists, is `UNREGISTERED`/unowned, and the ID matches what the kiosk recorded at sale (kiosk sale stores `issued_for_id`).
  - On success: card is registered to the account and **syncs the kiosk-loaded products** — the card shows exactly the journeys of the last kiosk receipt, live from `loaded_products` (this is the "fact system in real time" the team asked for — it's the same table the receipt is generated from, so it can never disagree).
  - New RPC: `lookup_card_at_signup(p_card_number, p_id_number)` → returns products + journeys remaining **before** linking, so the user sees "you have 7 journeys left on GOEASY-10" and confirms this is their card.
- `signup_card_mode: 'NEW_CARD' | 'EXISTING_CARD'` is frontend state only — backend stays one RPC either way.

### Q2 — Employee onboarding: admin-approved signups ✅ resolved
- New table `staff_access_requests(id, email, first_name, surname, requested_role, status PENDING/APPROVED/DENIED, requested_at, decided_by → staff, decided_at)`.
- **Two doors into the queue:**
  1. **Self-request:** a "Staff sign-up" link on the login page → form (email, name, requested role) → row lands in ADMIN's queue. No auth account is created yet.
  2. **Direct invite (ADMIN):** ADMIN creates the request row themselves (equivalent to today, but auditable).
- ADMIN console `/staff/onboarding` lists PENDING requests → **Approve** (creates the Supabase auth user server-side + `staff` row with approved role, sends Supabase invite email; the invite link is the "setup your account" step where the person sets their password) or **Deny** (status + reason, logged).
- RPCs: `request_staff_access(...)`, `decide_staff_access(request_id, approve, note)` (ADMIN-only), all writes to `staff_action_log`.
- RLS: requests readable by ADMIN; a pending requester can see only their own row's status (by email match).
- Status: **APPROVED carry-forward** — in-app approve replaces the raw-SQL staff creation; the SQL seed script remains for demo day (MULTIROLE-PLAN §8 Q1 answered).

### Q3 — 6 dashboards, fastest working path ✅ resolved (this IS the deadline plan)
The six surfaces = COMMUTER (exists, de-mock only) + 5 staff roles. The fast-track answer: **one shared `/staff` console shell, and every role's "dashboard" is a thin role-landing that renders the role's 1–2 core tools.** No bespoke dashboard apps.

- Fast-track (build order in §5): shared shell → ADMIN queue screens (onboarding/team) → INSPECTOR verify (one screen, high demo value) → DRIVER status (one screen + auto-alert wiring) → AGENT inbox (reuse chat UI) → CLERK kiosk (reuses load-trips components).
- Defer to the rest of the team as parallel lanes after D3: per-role polish, empty states, edge cases — each lane listed as a ticket in §7 with owner suggestion; nothing blocks the demo path.
- Projected board: each D-day in §5 is a column; every ticket carries "demo-critical / team-lane / nice-to-have" so triage is instant.

### Q4 — Complementary features per user ✅ resolved (scoped, not sprawl)
Small, cheap, high-empathy additions per role, each mapping to existing tokens/components:
- **Commuter:** "Your balance as of last receipt" line on Card screen (same data as Q1's fact-system), transfer-window hint already exists (keep).
- **Driver:** big-thumb status buttons (ON TIME / +10 / +15 / BREAKDOWN) — one-tap reporting, glove-friendly sizing.
- **Inspector:** recent lookups list (session-local), outcome chips with colour from brand tokens.
- **Clerk:** "Today's kiosk sales" counter (their own `CASH` gateway orders).
- **Agent:** canned-reply snippets (3 starters: delay info, card registration, concession docs) — stored client-side, not fake chat.
- **Admin:** counts strip on landing (pending onboarding, open tickets, active alerts, today's cash sales).
- Explicitly deferred (recorded, not forgotten): real GPS map tracking, web-push/email digests, refunds UI beyond status view.

### Q5 — Frontend file tree restructured by role ✅ resolved
```
frontend/src/
  api/            (goldenway.js split: auth.js commuter.js staff.js realtime.js)
  components/     (shared: TicketCard, DashboardHeader, StopTimeline, …)
  context/        (AuthProvider with role model, NotificationProvider, TripProvider)
  layout/         (DashboardLayout commuter + StaffLayout console)
  screens/
    auth/         (Splash, Login, Register, ForgotPassword, ResetPassword, AccountCreated)
    commuter/     (home/ load-trips/ card/ history/ support/ notifications/)
    staff/
      shared/     (StaffHome, StaffShell bits, role dashboard landings)
      admin/      (Onboarding, Team, Catalog, Alerts, OrdersReports)
      clerk/      (Kiosk, ConcessionVerify)
      inspector/  (Verify, InspectionHistory)
      driver/     (Runs, RunStatus)
      agent/      (Inbox, TicketChat)
```
- Move = `git mv` with import updates in one dedicated commit (D1) so blame stays clean.
- Route groups in `App.jsx`: `/` commuter tree (unchanged chrome) and `/staff/*` console tree (`StaffLayout`), guarded by `ProtectedRoute roles=[…]`.
- Assignment: each role folder = one team member's lane (maps to ownership matrix; §7).

### Q6 — Presentation pack ✅ resolved (scheduled, not squeezed)
Deliverable set (created during D7 polish, owner: lead + one volunteer):
1. **Slide deck:** everything front + back — architecture diagram (commuter app + staff console + Supabase Postgres/Auth/RLS/Realtime), the BR-01…BR-10 traceability table (rules → migration/RPC/screen), demo script from MULTIROLE-PLAN §7, sprint log summary.
2. **Updated brand guide:** tokens from `index.css` (GABS red = live/alert accent, gold = Gold Card moments, navy = staff chrome), logo lockups, "The Bus For Us" voice, component samples.
3. **Solution architecture doc:** the diagram + tables above in repo docs (`su2/su2/docs/SOLUTION-ARCHITECTURE.md`), same content as the deck so there's one source of truth.
- PRP3 note: subject marking guide is a scanned paper (audit 2026-09-15 §6, unreadable as text) — pack structure follows the audit's requirement map; **lead to verify against the paper rubric before printing.**

### Q7 — Notifications on every event ✅ resolved
`notifications` table + triggers fire on: purchase paid, product loaded, journey tapped (commuter's own), delay/breakdown on a route they tapped in the last 7 days, ticket reply (commuter) / new ticket (AGENTS+ADMIN), concession verified, card linked/registered, inspection logged (card owner sees "your card was inspected: VALID"), staff decision on their access request.
Bell = unread count + `/notifications` list + realtime channel; commute screens stay quiet otherwise. (Matches MULTIROLE-PLAN §5.3, now extended per this list.)

### Q8 — Acknowledged ✅
Held with respect: the team's prayer and gratitude is noted first in the sprint log for demo day. Now — to the storm.

---

## 2. What already exists (build on, don't rebuild)

| Asset | State |
|---|---|
| Supabase schema 0001–0004 | commuters/staff (ADMIN,CLERK,INSPECTOR), routes, stops, fare products/tables, cards, loaded products, deductions, top-ups + payment attempts, alerts, support tickets/messages, departures, RLS + RPCs (tap, quote, pay with price-authority rule, verify_card) |
| Commuter app | register/login, load-trips (real RPC flow), card, use-ticket/tap, history, support (mock chat), timetable, alerts banner |
| Spring reference | Staff/Role, CardVerificationResponse, ServiceAlert, SupportTicket/TicketMessage, audit-log intent — the porting map for every new RPC |
| Docs | MULTIROLE-PLAN (roles/research/mocks), SETUP.md, backend-concept, GABS research |

## 3. New backend objects (migrations 0005–0009, ported from Spring references)

- **0005 identity & onboarding:** `staff.role` +DRIVER,AGENT; `staff_access_requests`; `staff_action_log`; RPCs `request_staff_access`, `decide_staff_access` (creates auth user + staff row server-side), `my_staff_profile`, `set_staff_active`; RLS per role.
- **0006 operations:** `buses(fleet_no PK, depot)`; `vehicle_runs(id, driver_id, route_code, bus_id, direction, service_day, status ON_TIME/DELAYED/BREAKDOWN/DIVERTED/COMPLETED, delay_minutes, note, started_at, ended_at)`; `inspection_events(id, inspector_id, card_number, outcome VALID/NO_PRODUCT/EXPIRED_PRODUCT/UNREGISTERED_CARD/REFUSED, note, at)`; RPCs `start_run`, `report_run_status` (auto-inserts service_alert on DELAYED/BREAKDOWN), `lookup_card_for_inspection` (privacy: first name + initial only), `log_inspection_outcome`.
- **0007 notifications:** `notifications(id, user_id, type, title, body, link_path, read_at)`; triggers on paid top-up, tap, alert publish (route-tapped-7-days targeting), ticket message, concession verify, card link, inspection, staff decision; `mark_notifications_read`.
- **0008 card lifecycle:** RPCs `lookup_card_at_signup` (Q1 pre-check), `link_existing_card` (Q1), `order_gold_card` (R40 SIMULATED attempt → UNREGISTERED card), `record_cash_sale` (CLERK, `CASH` gateway attempt), `clerk_issue_card`, `clerk_replace_lost_card`; `payment_attempts.gateway` + `'CASH'`.
- **0009 support completion:** `support_tickets.assigned_to`, `priority`; RPCs `claim_ticket`, `reply_ticket`, `resolve_ticket`, `agents_online`.
- Every migration: RLS policies via existing `is_staff(variadic)`, `security definer` RPCs, seed for buses + demo staff queued in the onboarding table for demo day.

## 4. Frontend work per surface

- **Shared/auth:** ForgotPassword + ResetPassword screens (Supabase `resetPasswordForEmail`/`updateUser`), login resolves commuter vs staff vs pending-staff and routes; `ProtectedRoute roles` prop; NotificationProvider (realtime bell).
- **Commuter (de-mock + Q1):** register "I already have a card" checkbox → lookup/confirm/link; SupportScreen → real tickets + realtime; bell + `/notifications`; Route-42 timeline from departures + live run status; Card screen "order card" / "link card" actions; Payment methods relabel + receipt refs.
- **Staff console (new):** `StaffLayout` (navy sidebar, role-filtered nav); role landings; ADMIN: Onboarding queue (approve/deny), Team, Catalog CRUD (routes/timetables/products/fares), Alerts publisher, Orders & reports; INSPECTOR: handheld verify + outcome logging; DRIVER: runs list + big-thumb status reporting; AGENT: inbox (claim → chat → resolve) with snippets; CLERK: kiosk issue/card sale/cash load + concession verify.
- All new screens use existing tokens/components; no new libraries (framer-motion, react-router, tailwind already in).

## 5. Deadline plan — D0…D8 (demo-critical path)

| Day | Deliverable (demo-critical) | Mocks killed | Parallel team-lanes (non-blocking) |
|---|---|---|---|
| **D0** | Migrations 0005–0009 applied; demo seed (staff, buses, requests, cards) | — | Review plan, claim lanes |
| **D1** | File-tree restructure (Q5) + auth role-routing + Forgot/Reset password | M1 | Update imports/lint fixes |
| **D2** | Staff console shell + role landings + ADMIN onboarding queue (Q2, Q3 fast-track) | M6 | — |
| **D3** | Notifications end-to-end (Q7): triggers + bell + `/notifications` | M2 | COMMUTER polish lane starts |
| **D4** | Support: real tickets, agent inbox, realtime chat | M3, M9 | — |
| **D5** | Inspector verify + inspection log (BR-08) | — | History/receipt polish |
| **D6** | Driver runs + status → auto alerts (Route-42 timeline becomes real) | M4 | — |
| **D7** | Card lifecycle: signup-with-card (Q1), order/link, clerk kiosk + cash sale + concession verify | M7, M8 | Payment relabel (M5) |
| **D8** | De-mock sweep, seed polish, **presentation pack (Q6)**, dry-run of the 6-role demo | M5 residual | Slide owner runs through deck |

Demo scenario (from MULTIROLE-PLAN §7) runs at end of D8: admin approves an onboarding request → commuter signs up **with existing card** → loads Go Easy → driver reports delay → notification lands → inspector verifies → agent resolves chat → clerk cash sale. Nothing on screen is canned.

## 6. Roles → lanes (assignment for the team)

| Lane | Scope | Suggested owner |
|---|---|---|
| Identity/onboarding (0005, auth screens, ADMIN onboarding+team) | Q2, M1, M6 | Raul |
| Notifications (0007 + provider + bell) | Q7, M2 | Joshua Bird |
| Support (0009 + inbox + commuter chat) | M3, M9 | Joshua Bird (shared) |
| Catalog/alerts admin screens | Q3 fast-track | Matthew |
| Card lifecycle/kiosk (0008 + screens) | Q1, M7, M8 | Aiden |
| Inspector + driver (0006 + screens) | M4 | Aiden (shared) |
| Integration/seed/deck | Q6, demo script | Joshua Black (lead) |

## 7. Risks & guardrails

1. **Supabase admin user creation from RPC** needs the service-role path (invite emails). Fallback if blocked: ADMIN creates auth user in dashboard, marks request APPROVED, app links the staff row — still auditable, demo-safe. Decide at D0 spike.
2. **Realtime** requires the notifications/tickets tables enabled for realtime in the dashboard — add to SETUP.md step list (D3 checklist).
3. **Email confirmation** stays OFF for demo (SETUP.md step 3) — staff invite flow must not depend on it.
4. **Time:** anything not on the demo-critical path is a team-lane ticket, not a blocker. No new libraries. No new palette.
5. Every RPC failure message keeps the `"field: message"` convention the screens already parse (toApiError).
