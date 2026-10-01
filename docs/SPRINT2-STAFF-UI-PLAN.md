# GoldenWay — Sprint 2: Staff UI Unification & Remaining Work

**Status:** ACTIVE PLAN — this is the working contract for the team.
**Supersedes:** the lane table in `FINAL-DEV-PLAN.md` §6 (same people, updated scope — D0–D7 core is done and verified).
**Companion docs:** `FINAL-DEV-PLAN.md` (original deadline plan), `SETUP.md` (backend setup), `MULTIROLE-PLAN.md` (research record).

---

## 1. Where we are (so nobody re-plans finished work)

The commuter app is **feature-complete and verified end-to-end** (see the E2E table in the sprint log): signup/login, role routing, card + products, load-trips with the simulated gateway, tap/BR-04 transfers, history, real support chat with live agent replies, notifications with realtime bell, Route 42 built from real departures + live driver reports.

The **staff console is functional but visually second-class**: five role tools work against real RPCs (onboarding queue, team, handheld verifier, runs, inbox, kiosk), but each screen is a plain navy page — no shared chrome, no dashboards, no consistency with the commuter app's deluxe design system (glass header, gold CTA primitives, depth shadows, page transitions).

**Sprint 2 has two goals:**
1. **Unify** — the staff console gets the same design language, structure, and quality as the commuter app, with a proper dashboard per role.
2. **Finish** — the remaining backend-backed features (catalog CRUD, alerts publisher, concession verification) get built and each lane takes its role to demo-ready polish.

---

## 2. Lane assignments (who owns what)

| Lane | Owner | Role surface | Guiding sentence |
|---|---|---|---|
| **AGENT lane** | **Raul** | `/staff/inbox` + AGENT dashboard | "Raul owns the voice: the queue, the chat, the metrics that keep response times honest." |
| **DRIVER lane** | **Aidan** | `/staff/runs` + DRIVER dashboard | "Aidan owns the road: run start/stop, big-thumb status, the run history that feeds Route 42." |
| **ADMIN lane** | **Matthew** | `/staff/onboarding`, `/staff/team`, **NEW `/staff/catalog`, `/staff/alerts`** + ADMIN dashboard | "Matthew owns the network: people, prices, timetables, alerts — the only lane with two new builds." |
| **CLERK lane** | **Joshua Black** | `/staff/kiosk` + CLERK dashboard (+ concession verify inside kiosk) | "Joshua Black owns the counter: cash, cards, replacements, concession checks, today's numbers." |
| **COMMUTER lane** | **Joshua Bird** | Commuter app polish + cross-cutting QA | "Joshua Bird keeps the finished side finished: regression checks, empty states, and the demo script." |

**Conventions for every lane:**
- One PR per ticket; screens live in `src/screens/staff/<role>/`; shared pieces go in `src/components/staff/` (see §3).
- All data through `src/api/operations.js` (add per-lane functions there — don't fetch inline in screens).
- Use the shared primitives from §3 — **no new ad-hoc buttons/fields/cards**. If a primitive is missing, add it to `StaffShell.jsx` first, then use it.
- Every RPC error surfaces through the existing `toApiError` convention; never swallow.
- Business rules live in Postgres — if you need a new backend function, add it to a migration `00XX_lane_<name>.sql` and note it in the PR.

---

## 3. The design contract — "staff UI matches commuter UI"

The commuter app's feel, translated to the staff context (dark navy instead of cream — that part is intentional and stays). **Everything below already exists as CSS/tokens; lanes just consume them.**

### 3.1 Shared chrome: `StaffShell` component (one build, all lanes benefit)

Build once in `src/components/staff/StaffShell.jsx`, then every staff screen becomes `<StaffShell title=… subtitle=… back>` + content:

| Element | Spec (mirrors commuter) |
|---|---|
| **Header** | Glass bar (`glass-navy`): avatar ring left (gold gradient ring, initials), "GoldenWay STAFF" gradient wordmark + `THE BUS FOR US` eyebrow centred, bell right with unread badge (reuse `useNotifications`) |
| **Page transition** | `AnimatePresence mode="wait"` slide-fade on route change (copy `DashboardLayout.jsx` exactly, horizontal slide 12px, 0.22s) |
| **Bottom nav (desktop) / tab rail (mobile)** | Role-filtered tab bar with the commuter's gliding gold pill (`layoutId="staff-nav-pill"`) — links: Home, + the role's tools, + Commuter app link in a subtle footer |
| **Background** | The existing navy gradient + gold halo (already in StaffHomeScreen — extract it into StaffShell) |
| **Sign out** | Moves into the header avatar menu (tap avatar → small menu: Profile, Sign out) |

### 3.2 Role dashboards (`/staff` = role-aware landing)

Replace the current tool-card grid with a **dashboard that answers the role's first three questions in five seconds** (the commuter Home pattern):

| Role | Dashboard shows |
|---|---|
| **AGENT** (Raul) | Big count strip: OPEN / IN PROGRESS / resolved-today / avg first-response (client-computed). "Next up" = oldest unclaimed ticket as a one-tap claim card. Recent resolutions list. |
| **DRIVER** (Aidan) | Current run hero card (route, bus, status pill, elapsed) with the status buttons inline if a run is open; otherwise the start-run form. "This week" = runs completed + on-time %. |
| **ADMIN** (Matthew) | Count strip: pending onboarding / open tickets / active alerts / today's cash sales (Q4 from the dev plan). Quick actions: Review queue, Publish alert, Catalog. Recent staff decisions feed. |
| **CLERK** (Joshua B.) | Today's kiosk hero: sales count + R total (query PAID CASH orders today). Quick actions: Cash load, Issue card, Replace card, Verify concession. Last 5 receipts list. |
| **All roles** | Notifications preview (latest 3 from `useNotifications`) under the hero — mirrors commuter Home's "Recent Activity". |

### 3.3 Component vocabulary (identical classes as the commuter app)

| Primitive | Commuter class | Staff equivalent (add to index.css) |
|---|---|---|
| Card | `.card` / `.card-lg` (white on cream) | `.scard` (navy-900 surface, white/10 border, depth shadow) |
| Primary CTA | `.btn-gold` | same `.btn-gold` — already used, keep |
| Ghost CTA | `.btn-ghost` | `.sbtn-ghost` (white/15 border, hover gold) |
| Field | `.field-shell` | `.sfield-shell` (navy-950 field, gold focus ring — matches existing inline styles, extracted) |
| Eyebrow label | `.eyebrow` | same |
| Skeleton | `.skeleton` | same |
| Status pill | emerald/red/amber | same pattern, reuse |

Implementation note: extract the repeated inline `inputCls` strings from VerifyScreen/RunsScreen/KioskScreen/InboxScreen into `.sfield-shell` and the repeated card wrappers into `.scard` — that's most of the "unify" work and it's mechanical.

### 3.4 Micro-interactions to copy from the commuter app
- `whileTap={{ scale: 0.97 }}` on every tappable
- Cards lift on hover (`hover:-translate-y-0.5` + shadow grow)
- Count numbers count up on mount (`framer-motion` spring — commuter Home's journeys-left pattern)
- Skeleton shimmer while loading (never blank flashes)
- Empty states with the gold dashed-border style + one line of copy

---

## 4. Ticket board (by lane, in build order)

### 🔵 Raul — AGENT lane
| # | Ticket | Done when |
|---|---|---|
| A1 | `StaffShell.jsx` + `.scard`/`.sfield-shell` primitives | Shell + primitives exist, InboxScreen migrated onto them |
| A2 | AGENT dashboard (`/staff` landing for AGENT) | Count strip + "next up" claim card + recent resolutions, all live-queried |
| A3 | Inbox polish on shared chrome | Realtime thread, snippets, claim/resolve work as today but inside StaffShell; unread filter tab |
| A4 | Canned-reply management | Snippets editable per agent (localStorage OK), 5+ starter snippets |
| A5 | Ticket detail improvements | Show commuter's card number + recent taps in a side panel (RLS-safe reads via `lookup` RPC if needed — check RLS first) |

### 🟢 Aidan — DRIVER lane
| # | Ticket | Done when |
|---|---|---|
| D1 | DRIVER dashboard | Open-run hero + status buttons inline; weekly runs + on-time % |
| D2 | Runs polish on shared chrome | Start-run form + history list inside StaffShell |
| D3 | Pre-trip checklist | Before start: bus choice + optional odometer note (extend `start_run` RPC with `p_note` if approved by team) |
| D4 | Run timeline | During a run: show the stop timeline (reuse commuter `StopTimeline`) with the driver's position highlighted |
| D5 | Delay note composer | When reporting DELAYED/BREAKDOWN, prompt for the commuter-facing note (the RPC already takes `p_note` and publishes it in the alert) |

### 🟡 Matthew — ADMIN lane (biggest scope — two new builds)
| # | Ticket | Done when |
|---|---|---|
| M1 | ADMIN dashboard | Count strip (pending onboarding / open tickets / active alerts / cash sales today) + quick actions + recent decisions feed |
| M2 | `00XX_admin_catalog.sql` | RPCs: `upsert_route`, `upsert_product`, `upsert_fare_entry` (ADMIN-only, audited to staff_action_log); check BR-09 constraints stay enforced |
| M3 | `/staff/catalog` screen | Tables + edit drawers for routes / timetables (departures bulk upload OK as CSV paste) / products / fare-table entries with effective dates |
| M4 | `00XX_admin_alerts.sql` | RPCs: `publish_alert(title, body, severity, route_code, effective window)`, `withdraw_alert(id)` |
| M5 | `/staff/alerts` screen | Publisher form + live alerts list with withdraw; severity colour chips match brand tokens |
| M6 | Onboarding + Team polish onto StaffShell | Migrate both existing screens; add decision history view (staff_action_log read) |

### 🟠 Joshua Black — CLERK lane
| # | Ticket | Done when |
|---|---|---|
| K1 | CLERK dashboard | Today's sales hero (count + rand total) + last 5 receipts + quick actions |
| K2 | Kiosk polish onto StaffShell | All three tabs migrated; receipt component shared with commuter `ReceiptView` styling |
| K3 | Concession verification tab | New 4th tab: look up commuter by email/ID → `verify_concession(p_commuter_id)` (0002 RPC) → show verified state; log appears in their notifications automatically (0007 trigger) |
| K4 | Receipt print view | Print-friendly receipt (window.print with a print stylesheet) for the kiosk printer |
| K5 | Lost-card flow guardrails | Confirm-dialog showing journeys that will transfer before `clerk_replace_lost_card` runs |

### 🟣 Joshua Bird — COMMUTER lane + QA
| # | Ticket | Done when |
|---|---|---|
| C1 | Commuter regression sweep | Walk every commuter screen logged-in as Thandi; file/fix layout issues; verify no mock remains (grep for INITIAL_MESSAGES, hardcoded times) |
| C2 | Empty/error states | Every commuter screen has a designed empty state and a friendly error state |
| C3 | Signup-with-existing-card flow test | The Q1 flow (lookup → confirm → link GW-1234-5678) works after Sprint-1 DB changes; fix if the ID/card drift breaks it |
| C4 | Demo script runner | One page: the 6-role demo scenario with exact clicks + expected outcomes per role (from MULTIROLE-PLAN §7) |
| C5 | Notifications targeting check | Verify alert notifications only go to relevant commuters (route-tapped-7-days logic in 0007) and document behaviour |
| C6 | Presentation pack start | Architecture diagram + BR traceability table (Q6) — starts now so D8 isn't squeezed |

---

## 5. Sequence & checkpoints

| Day | Milestone | Checkpoint |
|---|---|---|
| **S2-D1** | **StaffShell + primitives land** (A1, reviewed by everyone) | All lanes unblocked; every subsequent PR builds on it |
| **S2-D2** | Dashboards (A2, D1, M1, K1) | `/staff` shows a real dashboard for all 5 roles |
| **S2-D3** | Screen migrations (A3, D2, M6, K2) | Every staff screen inside shared chrome — visually unified |
| **S2-D4** | New builds: M2+M3 catalog, M4+M5 alerts, K3 concessions | ADMIN can run the network end-to-end |
| **S2-D5** | Lane depth (A4/A5, D3/D4/D5, K4/K5, C1/C2) | Polish + guardrails |
| **S2-D6** | C3/C4/C5 + full-team demo dry-run | Demo script passes with zero canned screens |
| **S2-D7** | C6 pack finalised + bug bash + tag demo build | Presentation pack done |

**Review rules:** 1 approval required (any lane); PRs that touch `StaffShell`, `index.css`, or `operations.js` need the lane owner of that file to review. Demo-critical tickets (all of S2-D1..D4) block on red CI/lint.

---

## 6. Definition of done (whole sprint)

- [ ] Staff console passes the "squint test": screenshot any staff screen and any commuter screen — same family, obviously.
- [ ] `/staff` is a dashboard for all five roles with live numbers, not a tool grid.
- [ ] ADMIN can manage catalog, fares and alerts in-app (no SQL Editor for day-to-day ops).
- [ ] CLERK can verify concessions in the kiosk; commuters get the notification.
- [ ] Commuter regression clean; demo script passes start-to-finish.
- [ ] Presentation pack (deck + architecture doc + brand guide) updated.
- [ ] Lint 0 errors, `npm run build` green, no console errors on any screen.

---

## 7. Risks & guardrails

1. **StaffShell is the critical path** — Raul lands it S2-D1 or everyone stalls. Fallback: Matthew takes primitives if A1 slips past D2.
2. **Catalog RPCs touch money (BR-09)** — M2 needs a second reviewer (Joshua Black) before merge; effective-dating must stay enforced.
3. **Realtime depends on publication config** — if ticket/notification realtime is flaky in the Supabase project, add the publication step to SETUP.md before lane work depends on it.
4. **No new libraries, no new palette** — primitives only. If a lane thinks it needs a new dependency, it's a design smell; raise it in review.
5. **DB changes are lane-local migrations** — `00XX_lane_<name>.sql`, never edit applied migrations; run `fix-service-role-grants.sql` once if a fresh project shows 403s on seed.
