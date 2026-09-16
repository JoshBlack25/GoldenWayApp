# GoldenWay Backend Concept — Business & Domain Mapping

**Prepared using:** the `business-analyst` skill (discovery → process mapping → requirements → KPIs) and the two `domain-driven-design` skills (bounded contexts, aggregates, ubiquitous language) from `.freebuff/skills/`.
**Purpose:** map the GoldenWay frontend to Golden Arrow Bus Services' real brand, products and business logic, and define the backend concept **before any code is written**.
**Status:** decisions made — see §7.1. No backend code yet.

---

## 0. Decisions (2026-09-14)

| Decision | Choice | Notes |
|---|---|---|
| Stack | **Spring Boot (Java)** | Leverages the team's `.freebuff` skills: layered-architecture, spring-security-jwt, spring-data-jpa |
| Realism | **Simulation built on the real deal** | Gateway, validators and live tracking are simulated in-module, but every rule, product and price mirrors the researched GABS business (BR-01…BR-10) |
| Frontend | **Align the app to the real business first** | See §9 Frontend Alignment Backlog — the app must speak GABS language before the backend lands |
| Team | Ownership matrix live for all 5 members (§7.2) | Joshua Black (lead) / Joshua Bird / Raul / Matthew / Aiden split by bounded context |

---

## 1. Business Discovery (the real Golden Arrow)

Researched from gabs.co.za, Wikipedia, Frontier Transport Holdings, Smile 90.4FM (May 2026), and GABS official social channels.

### 1.1 Company profile

| Fact | Value | Implication for us |
|---|---|---|
| Founded | 1861 (160+ years, "Rooted in the Community") | Brand voice: heritage + trust. Splash tagline "THE BUS FOR US" aligns |
| Ownership | Private; Frontier Transport Holdings (HCI) | Not a government API provider — we simulate/integrate, not assume open APIs |
| Fleet | ~1,300 buses (diesel + BYD electric since 2025) | Live-tracking concept is credible; EV fleet supports "green" messaging |
| Routes | ~1,300 routes, 7 depots (Montana, Philippi, Woodstock, Atlantis, Simon's Town, Blackheath) | Route catalogue is large; seed data must be route-code based, not ad-hoc |
| Daily ridership | ~230,000 | Scale narrative for the report; performance matters in concept |
| Contract | Contracted to Western Cape DTPW (scheduled commuter service) | Fares are regulated — fare tables are versioned data, effective-dated |

### 1.2 The real fare product: Gold Card

- **Gold Card** = NFC smart card, **R40 once-off**, bought at kiosks/vendors; tap on the card reader when boarding; **must be registered** (name, ID, contact) so balance can be protected.
- **Loaded with products, not money**: route-based travel packages (5-Ride, Weekly, Monthly per route/zone), Flexi Zone tickets, and since 2026 **Go Easy**.
- **Go Easy Multi Journey Ticket** (launched May 2026, now permanent): load **5, 10 or 48 trips** onto the Gold Card, usable across **nearly all routes**, lower cost per journey than cash, **built-in transfer** per journey (two buses = one journey, no double charge). **Excluded areas:** Atlantis, Darling, Dassenberg, Mamre/Pella, Malmesbury, Koeberg, Melkbosstrand, Fisantekraal, Wellington, Paarl, Stellenbosch.
- Real Go Easy price points seen: Bellville–City R112.50 (5-ride), Khayelitsha–City R130, Khayelitsha–Wynberg R130, Mitchells Plain–City R130.
- Product table columns on the official site: **Destination, Code, 5-Ride, Weekly, Monthly, Transfers** — this is effectively the backend fare table schema.
- Cash fares still exist on buses (more expensive than card products). Peak vs off-peak pricing exists (peak ≈ 04:00–08:00 & 16:00–20:00).

### 1.3 Gap analysis: our frontend vs the real business

| # | Our current frontend | Real GABS business | Gap severity | Resolution in concept |
|---|---|---|---|---|
| G1 | Wallet-style "payment cards" (Visa/Mastercard) with service fee 15.75% | Fare products loaded at kiosks/vending; no public top-up API | Medium | Keep card checkout as "digital top-up" concept (future payment gateway), but model **products**, not money |
| G2 | Routes are From/To pairs with flat baseFare | Route **codes** + zone products; transfers built in | High | `Route` and `FareProduct` entities with route codes and transfer rules |
| G3 | "5-Ride Pass — BEST VALUE" with made-up multipliers | Real 5/10/48 Go Easy + per-route Weekly/Monthly | Medium | Product catalog matches real product families (5/10/48 rides, weekly, monthly, flexi zone) |
| G4 | Rides deducted manually in-app (validator simulation) | Tap-on reader deducts on bus; handheld verifier used by inspectors | Low (prototype) | Keep simulated validator; model it as `ValidationEvent` from a `ValidatorDevice` |
| G5 | "Gold Card •••• 4821 Visa" — a payment card | Gold Card is a **transit card**, not a payment card | High | `TransitCard` entity (card number, status, registration), separate from `PaymentMethod` |
| G6 | No transfers, no peak/off-peak, no concession (student/pensioner) | Real discount structures | Medium | Fare engine rules: product × route × time-of-day × concession |
| G7 | History = transactions list | Real trips are tap events with route, bus, validator | Medium | `Trip` derived from tap-on/tap-off events |
| G8 | Support chat with canned agent | GABS has real customer service (kiosk/phone) | Low | Keep as concept `SupportTicket`/chat service |

**Ubiquitous language fix (per DDD skill):** stop saying "card" for two things. In code and docs: **Gold Card** = transit card; **Payment Method** = how you pay online. Stop saying "pass"; use **Product** (5-Ride / Weekly / Monthly / Go Easy / Flexi Zone) and **Journeys Remaining** for balance.

---

## 2. Bounded Contexts (DDD strategic design)

The app is small, so we use a **modular monolith**: one deployable backend, strict module boundaries that *could* be split into services later. Each module = future microservice seam.

```
┌────────────────────────────────────────────────────────────┐
│                   GoldenWay API (monolith)                 │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Identity &  │  │   Fare &     │  │  Card & Ticket   │  │
│  │  Commuter    │  │   Catalog    │  │  (core domain)   │  │
│  │  (generic)   │  │  (generic)   │  │  card, products, │  │
│  │  register,   │  │  routes,     │  │  journeys,       │  │
│  │  login,      │  │  products,   │  │  validation,     │  │
│  │  profile     │  │  fare engine │  │  transactions    │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐ │
│  │              Operations (supporting)                   │ │
│  │   trip history, service alerts, support tickets        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │   Payments (anti-corruption layer)                     │ │
│  │   gateway port → PayFast/Peach/simulator adapter       │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

| Context | Type (per DDD scoring) | Responsibility | Key language |
|---|---|---|---|
| Identity & Commuter | Generic subdomain | Registration, auth, profile, card registration | Commuter, Registration, Profile |
| Fare & Catalog | Generic subdomain | Routes, stops, products, effective-dated fares | Route Code, Product, Fare Table, Transfer Rule, Peak Period |
| **Card & Ticket** | **Core domain** | Card lifecycle, loading products, journey balance, validation, receipts | Gold Card, Journey, Tap-On, Deduction, Receipt |
| Operations | Supporting | Trip history, service alerts, support | Trip, Alert, Ticket |
| Payments | ACL | Isolate gateway specifics behind a port | Top-Up Order, Payment Attempt |

**Domain events** (cross-module glue): `CommuterRegistered`, `CardRegistered`, `ProductLoaded`, `JourneyValidated`, `TopUpCompleted`, `AlertPublished`. Modules talk through events, not direct table access.

---

## 3. Core domain model (Card & Ticket, per DDD skill: aggregates, invariants in the aggregate)

### 3.1 Aggregates

**GoldCard (aggregate root)** — one per physical/virtual card
- Value objects: `CardNumber` (format GW-XXXX-XXXX), `CardStatus` {UNREGISTERED, ACTIVE, LOST, EXPIRED}, `JourneyBalance`
- Child entities: `LoadedProduct { id, productCode, journeysTotal, journeysUsed, validFrom, validTo, transferIncluded }`, `Deduction { id, at, routeCode, busId, validatorId }`
- **Invariants (enforced inside the aggregate, not the service):**
  1. A journey can only be deducted from a product whose validity window contains *now*
  2. `journeysUsed <= journeysTotal` — balance can never go negative
  3. A tap-on within N minutes of the previous tap-on on a *different* route consumes the **transfer**, not a new journey (built-in transfer rule)
  4. Product loading appends; loaded products are immutable once consumed
  5. Status must be ACTIVE to validate

**TopUpOrder (aggregate root)** — the "Load Trips" purchase
- `TopUpOrder { id, cardId, productCode, amount, paymentAttemptId, status {PENDING_PAYMENT, PAID, FAILED, REFUNDED}, receipt }`
- Invariant: order transitions PENDING → PAID only via a successful payment event; receipt reference generated once.

### 3.2 Domain events

| Event | Published by | Consumed by | Frontend effect |
|---|---|---|---|
| `ProductLoaded` | Card & Ticket | Operations, Notifications | Home/Card balance updates; transaction row appears |
| `JourneyValidated` | Card & Ticket (validator endpoint) | Operations | Ride Successful screen; History/Trip updates |
| `TopUpCompleted` | Payments | Card & Ticket | triggers `ProductLoaded` |
| `CardStatusChanged` | Card & Ticket | Identity | Profile shows LOST etc. |

### 3.3 Fare & Catalog model

```
Route { code, name, originStop, destinationStop, excludedFromGoEasy: bool, active }
Stop  { id, name, zone, lat, lng }
FareProduct { code (GOEASY-5/10/48, WEEKLY-<route>, MONTHLY-<route>, FLEXI-<zone>),
              family {GO_EASY, WEEKLY, MONTHLY, FLEXI_ZONE}, journeys, validDays, transfersAllowed }
FareTable { effectiveFrom, effectiveTo, rows: { routeCode|zoneCode, productCode, priceCents } }
ConcessionRule { type {STUDENT, PENSIONER, NONE}, discountPct, requiresVerification }
PeakPeriod { start 04:00, end 08:00, eveningStart 16:00, eveningEnd 20:00 }  // cash vs card product rules
```

**Fare engine (pure functions, like our current `loadTripsData.js` — that file becomes the seed of this module):**
`quote(routeCode, productCode, concession, at) -> { priceCents, savingsCents, includesTransfer }` with the real-world rules: excluded-area check for Go Easy, transfer inclusion, concession discount, effective-dated prices.

---

## 4. Business rules extracted (requirements, traceable to sources)

| ID | Requirement (business language) | Source | Module |
|---|---|---|---|
| BR-01 | Card costs R40 once-off and must be registered before balance protection | gabs.co.za GoldCard page | Card & Ticket |
| BR-02 | Products are 5 / 10 / 48 journey Go Easy, weekly, monthly, flexi-zone | SmileFM May 2026; gabs.co.za product table | Fare & Catalog |
| BR-03 | Go Easy valid on nearly all routes; excluded: Atlantis, Darling, Dassenberg, Mamre/Pella, Malmesbury, Koeberg, Melkbosstrand, Fisantekraal, Wellington, Paarl, Stellenbosch | GABS official comms | Fare & Catalog |
| BR-04 | Each Go Easy journey includes one transfer (two buses, one journey) | GABS official comms | Card & Ticket |
| BR-05 | Card products cheaper than cash; discounts up to ~40% vs peak cash | GABS marketing | Fare & Catalog |
| BR-06 | Student & pensioner concessions exist and require verification | Wikipedia/GABS | Fare & Catalog |
| BR-07 | Tapping the card on the bus reader deducts a journey | IOL 2018 launch; GoldCard page | Card & Ticket |
| BR-08 | Handheld verifiers can inspect card state | IOL 2018 | Card & Ticket (read API) |
| BR-09 | Fares are effective-dated (annual increases, e.g. July 2018 table) | Scribd fare table | Fare & Catalog |
| BR-10 | Card balance is protected because the card is registered (name/ID/contact) | gabs.co.za | Identity |

Each maps 1:1 to a test we will write later (traceability requirement from the BA skill).

---

## 5. Backend concept: architecture & API

### 5.1 Stack recommendation (fits the team + skills)

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Node.js + Express or Fastify (TypeScript)** | One language across the team's frontend; fastest for a student team |
| Alternative if lecturers require Java | **Spring Boot + Spring Security JWT + Spring Data JPA** | `.freebuff` already contains layered-architecture, spring-security-jwt and spring-data-jpa skills — the team is equipped for this path |
| DB | PostgreSQL (JSONB for fare tables) or SQLite for dev | Effective-dated rows, relational integrity |
| Auth | JWT access + refresh, BCrypt; roles: COMMUTER, INSPECTOR, ADMIN | Mirrors BR-08 (inspector verifier) |
| Payments | **Port + adapter**: `PaymentGateway` interface; `SimulatedGateway` now, PayFast/Peach later (BR-aligned; no real PCI scope in prototype) | ACL per DDD |
| Docs | OpenAPI generated from route handlers | Frontend consumes typed client |

> **Decision needed from you (see §7):** Node/TS or Spring Boot. Both are fully scoped in this concept.

### 5.2 API surface (REST, versioned `/api/v1`)

```
POST   /auth/register                 { fullName, email, phone, password }  → 201 + tokens
POST   /auth/login                    { email, password } → { accessToken, refreshToken }
GET    /me                            → profile + concession status
PUT    /me                            → update profile (3-step wizard payload)

GET    /routes                        → catalogue (filter: origin/destination)
GET    /routes/:code/fare-products    → products purchasable on that route + live prices
POST   /fares/quote                   { routeCode, productCode, concession } → price breakdown

GET    /cards                         → my Gold Card(s): status, balance, loaded products
POST   /cards                         → order new card (R40, BR-01)
POST   /cards/:id/register            → link card to commuter (BR-10)
GET    /cards/:id/transactions        → deductions + loadings (History screen)

POST   /top-up-orders                 { cardId, productCode, paymentMethodId }
POST   /top-up-orders/:id/pay         → simulated gateway → PAID → ProductLoaded event
GET    /top-up-orders/:id/receipt     → ReceiptView payload

POST   /validations                   { cardNumber, validatorId, routeCode, at }  ← bus reader (sim)
GET    /validations/:id               → Ride Successful payload (journeys left)

GET    /trips?from=&to=               → History/Trip detail
GET    /alerts                        → service notices (Support screen)
POST   /support/tickets               → chat thread creation
WS     /ws/trips/:id                  → live tracking updates (prototype: polling fallback)
```

The frontend screens map to these endpoints **directly**: `LoadtripsScreen` → routes+quote+top-up-orders; `UseTicketScreen` → validations (simulated); `HistoryScreen` → transactions/trips; `ProfileScreen` → me/cards.

### 5.3 Data model (core tables)

```
commuters(id, full_name, email, phone, password_hash, concession_type, verified_at)
gold_cards(id, card_number UNIQUE, status, owner_id → commuters, registered_at)
loaded_products(id, card_id, product_code, journeys_total, journeys_used, valid_from, valid_to)
deductions(id, card_id, loaded_product_id, route_code, bus_id, validator_id, at, was_transfer)
top_up_orders(id, card_id, product_code, amount_cents, status, created_at, paid_at)
payment_attempts(id, order_id, gateway, gateway_ref, status, at)
routes(code PK, name, origin, destination, go_easy_eligible, active)
stops(id, name, zone, lat, lng)
fare_tables(effective_from, effective_to, route_code, product_code, price_cents)
support_tickets(id, commuter_id, subject, status) / messages(id, ticket_id, sender, body, at)
service_alerts(id, title, body, severity, effective_from, effective_to)
```

### 5.4 Frontend integration plan (no big-bang)

1. **Phase 1:** keep `TripProvider` as-is; add an API client module with the same interface (`rides`, `transactions`, `deductRide`, `addRides`) backed by fetch + the dev server. Screens don't change.
2. **Phase 2:** replace `loadTripsData.js` mock with `GET /routes` + `POST /fares/quote` (the pure functions move to the server; the test file moves with them).
3. **Phase 3:** auth swap: `AuthProvider.login` → real `/auth/login`; `ProtectedRoute` unchanged.
4. **Phase 4:** validator simulation → `POST /validations` with a fake validator device id.

---

## 6. KPIs & success metrics (BA skill: measurable value)

| KPI | Definition | Prototype target |
|---|---|---|
| Quote accuracy | `fares/quote` matches published GABS table rows for seeded routes | 100% for seed set |
| Tap-to-success latency | validation POST → Ride Successful screen | < 1.5 s (sim) |
| Balance consistency | Home / Card / Profile show identical balance | 100% (single source) |
| Requirement traceability | BR-01…BR-10 covered by tests | 10/10 |
| Top-up completion rate | orders PAID / orders created (sim gateway) | ≥ 95% |

---

## 7. Decisions & ownership

### 7.1 Resolved

1. **Stack: Spring Boot** (Java 21, Spring Boot 3.x, Spring Security 6 lambda DSL, Spring Data JPA, Maven). The `.freebuff` Spring skills are the implementation guides.
2. **Scope: fully simulated in-module, but based on the real deal** — the payment gateway is a `SimulatedGateway` adapter behind the `PaymentGateway` port, the bus reader is a scheduled "validator device" simulator, and every fare rule in the simulation comes from the researched GABS business (no invented logic).

### 7.2 Ownership matrix — five members, per bounded context

Updated when Joshua Bird joined. Every member owns their entities end-to-end: their services and factories in the backend, the unit/MockMvc tests for those services, and one lane of the frontend. Shared packages (`enums`, `security`, `config`, `util`) change only via PR reviewed by the lead.

| Member | Module (→ branch) | Entities owned | Remaining backend work | Frontend lane |
|---|---|---|---|---|
| **Joshua Black** (Team Lead) | Payments & Integration → `joshua/payments-module` | TopUpOrder, PaymentAttempt (+ GatewayType, PaymentStatus, TopUpStatus) | `PaymentGateway` port + `SimulatedGateway` polish, admin refund flow hardening, cross-module integration contract + OpenAPI spec, release/demo packaging | Inspector handheld verifier (FA-13, new `/verify` route, BR-08) + demo seed data |
| **Raul** | Identity & Security → `raul/identity-module` | Commuter, Staff (+ Gender, Role, ConcessionType) | Refresh tokens, staff invite tokens (MediTicket `EmployeeInviteResponse` pattern), staff action audit log, auth MockMvc tests | Auth + Profile polish, concession-verification UX (FA-10) |
| **Matthew** | Fare & Catalog → `matthew/fare-catalog-module` | Route, Stop, FareProduct, FareTableEntry | Effective-dated fare-table hardening, excluded-area (BR-03) and peak/off-peak cash (BR-05) rule tests, quote-engine unit tests | Load-Trips savings badge + excluded-route states (FA-08/FA-09) |
| **Aiden** | Card & Ticket → `aiden/card-ticket-module` | GoldCard, LoadedProduct, Deduction (+ CardStatus) | Invariant test suite (no negative balance, 60-min transfer window BR-04), validator device simulator, card lifecycle (block/replace), receipt rendering | Card / UseTicket / RideSuccess polish + History journey detail (FA-12) |
| **Joshua Bird** *(new)* | Operations → `jbird/operations-module` | ServiceAlert, SupportTicket, TicketMessage (+ AlertSeverity, TicketStatus, SenderType) | Support reply/message threading (close + escalate rules), alert CRUD validation + severity ordering, operations MockMvc tests | Admin dashboard route set (`/admin`: staff, commuters, payments — none exist yet) + wire SupportScreen to the live API |

Integration contract between modules = the domain events in §3.2, so the five workstreams can proceed in parallel behind the same OpenAPI spec.

## 8. Proposed build order (sprints)

| Sprint | Deliverable | BRs covered |
|---|---|---|
| S1 | Scaffold API + Identity module (register/login/me) + JWT | BR-10 |
| S2 | Fare & Catalog: routes, products, fare tables, quote endpoint + tests | BR-02, 03, 05, 06, 09 |
| S3 | Card & Ticket: cards, loaded products, invariants, validations + tests | BR-01, 04, 07, 08 |
| S4 | Payments ACL (simulated) + top-up orders + receipts | BR-05 |
| S5 | Operations: trips, alerts, support; frontend swap to live API | all |

---

## 9. Frontend Alignment Backlog (adapt the app to the real business)

The app must speak GABS language before the Spring Boot backend lands. Each item carries the BR it makes visible, so the demo tells one coherent story end-to-end.

### 9.1 Language & branding

| ID | Change | Where | BR |
|---|---|---|---|
| FA-01 | Rename "Load Trips" framing to **"Load Trips — Go Easy"**; tab label can stay "Load Trips" | Nav, RouteStep header | BR-02 |
| FA-02 | Rename payment-card wallet to **Payment Methods**; the gold **Golden Arrow Gold Card** becomes a distinct transit-card object (already exists as TicketCard) with card number, status and registration state | PaymentStep, CardScreen, ProfileScreen | BR-01, G5 |
| FA-03 | Copy pass: "R40 once-off card fee" on new-card order; "Register your card to protect your balance" | CardScreen | BR-01, BR-10 |
| FA-04 | Add GABS heritage strip: "Since 1861 • 230,000 commuters daily • 7 depots" | Splash or About section in Profile | brand |
| FA-05 | Tagline consistency: "The Bus For Us" + Golden Arrow wordmark lockup | Splash, headers | brand |

### 9.2 Fare product truth

| ID | Change | Where | BR |
|---|---|---|---|
| FA-06 | Replace invented multipliers with **real Go Easy products**: 5 / 10 / 48 journeys, effective-dated prices from a fare table module (seeded with researched price points) | loadTripsData.js → `fareCatalog.js` | BR-02, BR-09 |
| FA-07 | Show **"Includes 1 free transfer"** on product cards and receipts | RouteStep, ReceiptView | BR-04 |
| FA-08 | Add **excluded routes** handling: Go Easy not purchasable for excluded destinations, with friendly explanation | RouteStep error state | BR-03 |
| FA-09 | Add **peak/off-peak cash comparison**: "Save up to 40% vs peak cash" | RouteStep savings badge | BR-05 |
| FA-10 | Concession toggle (student/pensioner) in Profile with verification flag; quote endpoint honours it | ProfileScreen, quote | BR-06 |

### 9.3 Journey & validator truth

| ID | Change | Where | BR |
|---|---|---|---|
| FA-11 | Use Ticket screen mimics the real flow: tap-on → deduction → **transfer window hint** ("Tap another bus within 60 min: free") | UseTicketScreen | BR-04, BR-07 |
| FA-12 | Transactions become **journeys with route code + validator id + was-transfer flag**; receipts show product, not amount-only | TripProvider → later API | BR-07 |
| FA-13 | Inspector view stub ("Handheld verifier"): lookup by card number, read-only balance — great demo differentiator | new `/verify` route | BR-08 |

### 9.4 Sequencing

FA-01…FA-05 and FA-06 are Sprint-0 frontend tasks (no backend needed — pure data/copy). FA-07…FA-13 land alongside Sprints 2–4 so each backend capability is visible in the UI the week it exists.
