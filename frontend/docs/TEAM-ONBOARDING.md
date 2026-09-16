# GoldenWay Team Onboarding

**The Bus For Us** — GoldenWay backend + frontend, five-member team.

Ownership is defined in **§7.2 of `backend-concept.md`** (same folder). Read that table first —
it maps every member to their entities, remaining backend work, and frontend lane.

---

## 1. Team roster

| Member | Role | Module |
|---|---|---|
| Joshua Black | Team Lead | Payments & Integration |
| Raul | Member | Identity & Security |
| Matthew | Member | Fare & Catalog |
| Aiden | Member | Card & Ticket |
| **Joshua Bird** *(new)* | Member | **Operations** (ServiceAlert, SupportTicket, TicketMessage) |

---

## 2. Setup for a new member (Joshua Bird)

1. **Get the code.** Clone both repositories from the lead's GitHub (`JoshBlack25/GoldenWay`
   hosts the frontend; the backend is shared by zip/USB until a remote is added — see §3).
2. **Create your branch.** `jbird/operations-module`, branched from the same base the other
   modules branch from. One module = one branch = one owner.
3. **Run the backend** (see `goldenway-backend/README` or ask the lead):
   - Java 21, Maven, MySQL 8 running locally on port 3306.
   - Copy `application.properties` values from the lead (local dev DB `budgeit`/`goldenway`,
     user `root`). JWT secret is local-dev-only — never commit a real secret.
   - Start with `mvn spring-boot:run` (port 8081). Seed data loads automatically.
4. **Run the frontend:** `npm install && npm run dev` in `goldenway-frontend/` (port 5173,
   proxies `/api` to the backend). Demo accounts are listed in the session log / ask the lead.
5. **Read the ground truth:** `docs/backend-concept.md` (business rules BR-01…BR-10),
   `docs/USER-GUIDE.md` (what the app does from a user's view).

---

## 3. Known blockers to resolve this week

- **The backend repo has no git remote.** The lead must create the GitHub repo (or a second
  repo) and push, then add all five members as collaborators. Until then backend work is
  exchanged manually.
- Frontend remote exists (`JoshBlack25/GoldenWay`, branch `fix/layout-polish`) — the lead
  adds new members via GitHub → Settings → Collaborators.

---

## 4. Working agreements

- **Layering (the CPUT pattern, used everywhere):** `domain/` entities → `factory/` builders →
  `repository/` Spring Data interfaces → `service/<module>/impl/I*Service` interfaces extending
  `IService<T, ID>` → `service/<module/*Service` implementations → `controller/` REST endpoints
  → `dto/` request/response records. Business rules live in the service layer.
- **Shared packages** (`enums/`, `security/`, `config/`, `util/`) change only via PR reviewed
  by the lead — they are everyone's dependency.
- **Tests:** each owner writes unit tests for their services and MockMvc tests for their
  controllers. `mvn test` and `npm run build` must pass before any PR.
- **Data realism convention:** personas use realistic names and the team's own contact
  details where needed; card numbers are format-real but synthetic; SA IDs are Luhn-valid
  but never a real person's; the payment gateway stays SIMULATED.
- **Commits:** conventional, small, per-module. Never commit another member's files.
