# GoldenWay — Team Migration Guide & Ground Rules

**Audience:** everyone who has been building on the **old zip folder** (`su2/su2/…`) and needs to move their work into the new repo.
**Repo:** `https://github.com/JoshBlack25/GoldenWayApp.git` (branch: `main`)
**Read this before you touch the repo.** It exists to prevent merge conflicts, lost work, and the "which file is the real one?" mess.

---

## 1. What changed and why

The old zip had every screen flat inside `screens/` with a `Dashboard/` folder for commuter pages. The repo now has a **role-based structure** — each team lane works in its own folder, which is how we avoid merge collisions:

```
frontend/src/
├── api/                    ← ALL backend calls live here (one module per domain)
│   ├── client.js           ← ApiError + helpers
│   ├── goldenway.js        ← routes, products, card, trips (commuter domain)
│   ├── staff.js            ← onboarding queue, RPCs
│   └── operations.js       ← notifications, tickets, runs, inspections, kiosk, concessions
├── components/
│   ├── (shared commuter)   ← BottomNav, DashboardHeader, TicketCard, TransactionRow, StopTimeline
│   └── staff/              ← StaffAvatar, FakeDataChip (staff-only shared parts)
├── config/
│   └── navigation.jsx      ← ⚠️ SINGLE SOURCE OF TRUTH for tabs + icons (both surfaces)
├── context/                ← AuthProvider, NotificationProvider, TripProvider, ProtectedRoute
├── layout/
│   ├── DashboardLayout.jsx ← commuter chrome (header + bottom nav)
│   └── StaffLayout.jsx     ← staff chrome (role-filtered tab bar, glass header)
├── lib/supabaseClient.js
└── screens/
    ├── auth/               ← Splash, Login, Register, Forgot/Reset, StaffSignup, AccountCreated
    ├── commuter/           ← 🟡 JOSHUA BIRD's lane
    │   ├── home/  LoadTrips/  Card/  History/  Profile/  Notifications/
    ├── staff/
    │   ├── shared/         ← StaffHomeScreen (dashboard), StaffProfileScreen
    │   ├── admin/          ← 🟡 MATTHEW's lane (Onboarding, Team)
    │   ├── agent/          ← 🟡 RAUL's lane (Inbox)
    │   ├── driver/         ← 🟡 AIDAN's lane (Runs)
    │   ├── clerk/          ← 🟡 JOSHUA BLACK's lane (Kiosk, Concessions)
    │   └── inspector/      ← Verify (shared inspector tool)
    └── NotFoundScreen.jsx
```

**Key ideas to internalize:**

| Rule | Why |
|---|---|
| One folder per role under `screens/staff/<role>/` | Your lane = your folder. Two people editing the same file is now rare by design. |
| `config/navigation.jsx` owns tabs | Adding a page = 1 entry in config + 1 `<Route>` in `App.jsx`. Never hand-edit nav bars. |
| `layout/StaffLayout.jsx` owns staff chrome | Screens are **pure content** — no self-made headers, backgrounds, back buttons, or sign-out buttons. The layout renders those. |
| `api/*.js` owns every backend call | Screens never call `supabase.from(...)` directly. Add a function to the right API module instead. |
| Palette = commuter cream/gold everywhere | Navy was removed. Use `bg-white` cards on `bg-cream` shell, `text-ink-900`, gold accents. `index.css` has `.btn-gold`, `.field-shell`, `.eyebrow`, `.glass` primitives — use them. |

---

## 2. The 5-step migration (per person)

### Step 1 — Fresh clone, never copy-over
```bash
git clone https://github.com/JoshBlack25/GoldenWayApp.git
cd GoldenWayApp/frontend
npm install
cp .env.example .env        # then fill in the two Supabase values (ask Josh for the project URL/key)
npm run dev
```
**Do not** copy your old folder over the clone. That's how conflicts are born.

### Step 2 — Inventory what you built on the zip
List your changed/new files. For each, classify:

| Type | What it is | Where it goes in the new repo |
|---|---|---|
| **A. Feature logic** | API calls, state, handlers | Into `api/<domain>.js` as a named export |
| **B. Screens** | New pages | `screens/staff/<your-role>/` or `screens/commuter/<area>/` |
| **C. Design tweaks** | Colors, spacing on existing screens | Re-apply by hand — **do not overwrite the file**, see Step 4 |
| **D. Backend** | New tables/RPCs | New migration file in `supabase/migrations/` (next number: `0011_...`) |

### Step 3 — Port features (A + B + D)
Work **lane by lane**. Example for Raul (AGENT):
- New API call → add to `api/operations.js` under the `// Agent` section
- New screen → `screens/staff/agent/MyNewScreen.jsx`
- Route → `App.jsx` `staffScreens` map + `config/navigation.jsx` STAFF_TABS.AGENT entry
- No header/back-button in your screen — StaffLayout provides them

### Step 4 — Re-apply designs by hand (C) — the critical rule
Your zip screens still have the **old navy design**. The repo is now **cream/gold**. If you paste your whole file over the repo's version, you'll undo the redesign.

Instead:
1. `git checkout main && git pull`
2. `git checkout -b feat/<your-name>-<feature>`
3. Open your old file and the repo's file **side by side**
4. Copy **logic** (hooks, handlers, JSX blocks for *your feature*) into the repo's file, keeping the repo's classes/primitives (`.btn-gold`, `.field-shell`, cream cards)
5. If your design adds something new (a badge, an animation), express it with the repo's palette tokens — `text-gold-700`, `bg-cream-200`, `border-ink-900/10`, `shadow-card`

### Step 5 — Verify before you push
```bash
npm run lint     # 0 errors expected
npm run build    # must pass
npm test         # if your lane has tests
```
Then check your screen in the browser **as your role's demo user** (logins in `SETUP.md`).

---

## 3. Ground rules (non-negotiable)

### Branching
- **`main` is protected by convention**: never commit straight to it.
- Branch names: `feat/<name>-<thing>` (e.g. `feat/raul-claim-flow`), `fix/<name>-<thing>`, `chore/<name>-<thing>`.
- One feature per branch. Small PRs merge fast; big PRs rot.

### Commits
- Commit messages: `feat: …`, `fix: …`, `chore: …` (+ scope if useful: `feat(clerk): …`).
- Commit **only your files** — `git add src/screens/staff/agent/...` not `git add -A`.

### Pull requests
1. Push your branch → open a PR against `main`.
2. **One reviewer** — the lane owner of any file you touched that isn't yours (e.g. if you touched `config/navigation.jsx`, Josh reviews; if you touched money RPCs — anything in catalog/fares — Matthew reviews).
3. PR description: what you built, screenshots if UI, how to test it.

### Conflict avoidance
- **Never** restructure shared files (`App.jsx`, `config/navigation.jsx`, `layout/*`, `api/*`) without saying so in the group chat first.
- Adding an entry to `navigation.jsx` or `App.jsx`? Do it on a fresh `main` the same day — those two files will be the #1 conflict source.
- If a conflict happens: **pull, rebase onto main, resolve by keeping the repo's design tokens**, then push again. Never `git push --force` on shared branches.

### The fake-flow convention
Screens not yet wired to the backend render `<FakeDataChip note="…" />` from `components/staff/FakeDataChip.jsx` and keep their sample data in a `const SAMPLE_*` block at the top of the file. When the real flow lands: delete the chip, delete the sample block, wire the API. Reviewers will reject a "real" screen that secretly fakes data without the chip.

### Backend rule
Money/catalog RPCs touch real fares (BR-09). New migrations must be numbered `0011_`, `0012_`… and never edit an existing migration file — add a new one.

---

## 4. Quick reference — where things live now

| You're looking for… | Old zip location | New repo location |
|---|---|---|
| Commuter dashboard | `screens/Dashboard/home/HomeScreen.jsx` | `screens/commuter/home/HomeScreen.jsx` |
| Staff tool grid | `screens/StaffHomeScreen.jsx` | `screens/staff/shared/StaffHomeScreen.jsx` (now a live dashboard) |
| Kiosk | `screens/staff/clerk/KioskScreen.jsx` (flat) | same path, but under `staff/` with lane folders |
| Login / auth | `screens/LoginScreen.jsx` | `screens/auth/LoginScreen.jsx` |
| Bottom nav | `components/BottomNav.jsx` | unchanged |
| Role tabs | *(didn't exist)* | `config/navigation.jsx` |
| Staff chrome | *(screens did it themselves)* | `layout/StaffLayout.jsx` |
| API calls | inline in screens | `api/goldenway.js` / `api/operations.js` / `api/staff.js` |

---

## 5. Who to ask

| Topic | Owner |
|---|---|
| Repo structure, `App.jsx`, `navigation.jsx`, layout | Josh Black (repo owner) |
| Backend/RPC/RLS questions | Josh Black + whoever wrote the migration |
| Design tokens, palette, components | Josh Black (design system) |
| Merge conflicts, git workflow | Josh Black |

**One rule to remember: your lane folder is yours; shared files are negotiated. Ship small, ship often.**
