-- =====================================================================
-- GoldenWay — Supabase schema
-- Ports the Spring Boot / MySQL domain (za.ac.cput.goldenway.domain.*)
-- onto Postgres + Supabase Auth + Row Level Security.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- IDENTITY
-- ---------------------------------------------------------------------

-- A registered GoldenWay commuter. One row per auth.users row (1:1),
-- id is the Supabase Auth user id. Supabase Auth owns the password.
create table if not exists public.commuters (
  id                     uuid primary key references auth.users(id) on delete cascade,
  first_name             text not null,
  surname                text not null,
  email                  text not null unique,
  phone                  text not null,
  gender                 text not null check (gender in ('MALE','FEMALE','OTHER')),
  date_of_birth          date not null,
  id_number              text not null unique,               -- SA ID, 13 digits
  concession_type        text not null default 'NONE' check (concession_type in ('NONE','STUDENT','PENSIONER')),
  concession_verified_at timestamptz,
  created_at             timestamptz not null default now(),
  constraint commuters_phone_format check (phone ~ '^(\+27|0)\d{9}$'),
  constraint commuters_id_number_format check (id_number ~ '^\d{13}$')
);

-- Back-office staff (ADMIN / CLERK / INSPECTOR). Also a Supabase Auth
-- user, kept in a separate table so commuter and staff logins never
-- collide, mirroring the original Staff/Commuter split.
create table if not exists public.staff (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text not null,
  surname     text not null,
  email       text not null unique,
  role        text not null check (role in ('ADMIN','CLERK','INSPECTOR')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Helper: is the current JWT holder an active staff member with one of
-- the given roles? Used throughout RLS policies and RPCs.
create or replace function public.is_staff(variadic roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff s
    where s.id = auth.uid()
      and s.active = true
      and (roles is null or array_length(roles, 1) is null or s.role = any(roles))
  );
$$;

-- ---------------------------------------------------------------------
-- FARE & CATALOG
-- ---------------------------------------------------------------------

create table if not exists public.routes (
  code             text primary key,
  name             text not null,
  origin           text not null,
  destination      text not null,
  go_easy_eligible boolean not null default true,
  active           boolean not null default true
);

create table if not exists public.stops (
  id        bigint generated always as identity primary key,
  name      text not null,
  zone      text not null,
  latitude  double precision not null,
  longitude double precision not null
);

create table if not exists public.fare_products (
  code              text primary key,
  family            text not null check (family in ('GO_EASY','WEEKLY','MONTHLY','FLEXI_ZONE')),
  journeys          int not null,
  valid_days        int not null,
  transfers_allowed int not null default 0,
  active            boolean not null default true
);

-- Effective-dated fare table (BR-09). product_code is not a hard FK
-- because "CASH-PEAK" is a synthetic comparison row, not a purchasable
-- FareProduct.
create table if not exists public.fare_table_entries (
  id             bigint generated always as identity primary key,
  route_code     text references public.routes(code),
  zone_code      text,
  product_code   text not null,
  price_cents    bigint not null,
  effective_from date not null,
  effective_to   date,
  constraint fare_table_route_or_zone check (
    (route_code is not null and zone_code is null) or
    (route_code is null and zone_code is not null)
  )
);

create index if not exists idx_fte_lookup on public.fare_table_entries (product_code, route_code, effective_from desc);

-- ---------------------------------------------------------------------
-- CARD & TICKET (core domain)
-- ---------------------------------------------------------------------

create table if not exists public.gold_cards (
  card_number   text primary key,                              -- GW-XXXX-XXXX
  status        text not null default 'UNREGISTERED' check (status in ('UNREGISTERED','ACTIVE','LOST','EXPIRED')),
  owner_id      uuid references public.commuters(id),
  registered_at timestamptz,
  created_at    timestamptz not null default now(),
  constraint gold_cards_number_format check (card_number ~ '^GW-\d{4}-\d{4}$')
);
create index if not exists idx_gold_cards_owner on public.gold_cards(owner_id);

create table if not exists public.loaded_products (
  id                bigint generated always as identity primary key,
  card_number       text not null references public.gold_cards(card_number) on delete cascade,
  product_code      text not null,
  route_code        text,
  journeys_total    int not null,
  journeys_used     int not null default 0,
  transfers_allowed int not null default 0,
  valid_from        date not null,
  valid_to          date not null,
  constraint loaded_products_balance check (journeys_used <= journeys_total)
);
create index if not exists idx_loaded_products_card on public.loaded_products(card_number);

create table if not exists public.deductions (
  id                bigint generated always as identity primary key,
  card_number       text not null references public.gold_cards(card_number) on delete cascade,
  loaded_product_id bigint not null references public.loaded_products(id),
  route_code        text not null,
  bus_id            text,
  validator_id      text,
  was_transfer      boolean not null default false,
  deducted_at       timestamptz not null default now()
);
create index if not exists idx_deductions_card on public.deductions(card_number, deducted_at desc);

create table if not exists public.top_up_orders (
  id                bigint generated always as identity primary key,
  card_number       text not null references public.gold_cards(card_number),
  product_code      text not null,
  route_code        text,
  amount_cents      bigint not null,
  status            text not null default 'PENDING_PAYMENT' check (status in ('PENDING_PAYMENT','PAID','FAILED','REFUNDED')),
  receipt_reference text unique,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);
create index if not exists idx_topup_card on public.top_up_orders(card_number);

create table if not exists public.payment_attempts (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references public.top_up_orders(id) on delete cascade,
  gateway      text not null default 'SIMULATED' check (gateway in ('SIMULATED','PAYFAST','PEACH')),
  gateway_ref  text,
  status       text not null check (status in ('INITIATED','APPROVED','DECLINED')),
  attempted_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- OPERATIONS
-- ---------------------------------------------------------------------

create table if not exists public.service_alerts (
  id             bigint generated always as identity primary key,
  title          text not null,
  body           text not null,
  severity       text not null check (severity in ('INFO','WARNING','CRITICAL')),
  route_code     text,
  effective_from timestamptz not null default now(),
  effective_to   timestamptz
);

create table if not exists public.support_tickets (
  id          bigint generated always as identity primary key,
  commuter_id uuid not null references public.commuters(id),
  subject     text not null,
  status      text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','RESOLVED')),
  created_at  timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id        bigint generated always as identity primary key,
  ticket_id bigint not null references public.support_tickets(id) on delete cascade,
  sender    text not null check (sender in ('COMMUTER','AGENT')),
  body      text not null,
  sent_at   timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table public.commuters         enable row level security;
alter table public.staff             enable row level security;
alter table public.routes            enable row level security;
alter table public.stops             enable row level security;
alter table public.fare_products     enable row level security;
alter table public.fare_table_entries enable row level security;
alter table public.gold_cards        enable row level security;
alter table public.loaded_products   enable row level security;
alter table public.deductions        enable row level security;
alter table public.top_up_orders     enable row level security;
alter table public.payment_attempts  enable row level security;
alter table public.service_alerts    enable row level security;
alter table public.support_tickets   enable row level security;
alter table public.ticket_messages   enable row level security;

-- commuters: a user manages their own row; staff (ADMIN/CLERK) can
-- read/verify-concession all commuters (BR-06 back office).
create policy commuters_select_self on public.commuters
  for select using (id = auth.uid() or public.is_staff('ADMIN','CLERK'));
create policy commuters_insert_self on public.commuters
  for insert with check (id = auth.uid());
create policy commuters_update_self on public.commuters
  for update using (id = auth.uid() or public.is_staff('ADMIN','CLERK'));

-- staff: staff can see the staff list; a staff member can read own row.
create policy staff_select on public.staff
  for select using (id = auth.uid() or public.is_staff('ADMIN'));
create policy staff_insert_admin on public.staff
  for insert with check (public.is_staff('ADMIN'));
create policy staff_update_admin on public.staff
  for update using (public.is_staff('ADMIN'));

-- catalog tables: readable by any signed-in user; writable by ADMIN/CLERK.
create policy routes_read on public.routes for select using (auth.role() = 'authenticated' or auth.role() = 'anon');
create policy routes_write on public.routes for all using (public.is_staff('ADMIN','CLERK')) with check (public.is_staff('ADMIN','CLERK'));

create policy stops_read on public.stops for select using (auth.role() = 'authenticated' or auth.role() = 'anon');
create policy stops_write on public.stops for all using (public.is_staff('ADMIN','CLERK')) with check (public.is_staff('ADMIN','CLERK'));

create policy fare_products_read on public.fare_products for select using (auth.role() = 'authenticated' or auth.role() = 'anon');
create policy fare_products_write on public.fare_products for all using (public.is_staff('ADMIN','CLERK')) with check (public.is_staff('ADMIN','CLERK'));

create policy fare_table_entries_read on public.fare_table_entries for select using (auth.role() = 'authenticated' or auth.role() = 'anon');
create policy fare_table_entries_write on public.fare_table_entries for all using (public.is_staff('ADMIN','CLERK')) with check (public.is_staff('ADMIN','CLERK'));

-- gold_cards: owner or staff (ADMIN/INSPECTOR handheld verification, BR-08).
create policy gold_cards_select on public.gold_cards
  for select using (owner_id = auth.uid() or public.is_staff('ADMIN','INSPECTOR','CLERK'));
create policy gold_cards_update on public.gold_cards
  for update using (owner_id = auth.uid() or public.is_staff('ADMIN'));
-- Inserts/most mutations happen through SECURITY DEFINER RPCs below, but
-- allow a signed-in user to create their own unregistered card directly too.
create policy gold_cards_insert on public.gold_cards
  for insert with check (auth.role() = 'authenticated');

create policy loaded_products_select on public.loaded_products
  for select using (
    exists (select 1 from public.gold_cards c where c.card_number = loaded_products.card_number and c.owner_id = auth.uid())
    or public.is_staff('ADMIN','INSPECTOR','CLERK')
  );

create policy deductions_select on public.deductions
  for select using (
    exists (select 1 from public.gold_cards c where c.card_number = deductions.card_number and c.owner_id = auth.uid())
    or public.is_staff('ADMIN','INSPECTOR','CLERK')
  );

create policy top_up_orders_select on public.top_up_orders
  for select using (
    exists (select 1 from public.gold_cards c where c.card_number = top_up_orders.card_number and c.owner_id = auth.uid())
    or public.is_staff('ADMIN','CLERK')
  );

create policy payment_attempts_select on public.payment_attempts
  for select using (
    exists (
      select 1 from public.top_up_orders o
      join public.gold_cards c on c.card_number = o.card_number
      where o.id = payment_attempts.order_id and c.owner_id = auth.uid()
    )
    or public.is_staff('ADMIN','CLERK')
  );

-- service_alerts: any signed-in commuter can read live alerts; staff write.
create policy service_alerts_read on public.service_alerts for select using (auth.role() = 'authenticated');
create policy service_alerts_write on public.service_alerts for all using (public.is_staff('ADMIN','CLERK')) with check (public.is_staff('ADMIN','CLERK'));

-- support tickets: commuter sees/creates own; staff sees/updates all.
create policy support_tickets_select on public.support_tickets
  for select using (commuter_id = auth.uid() or public.is_staff('ADMIN','CLERK','INSPECTOR'));
create policy support_tickets_insert on public.support_tickets
  for insert with check (commuter_id = auth.uid());
create policy support_tickets_update on public.support_tickets
  for update using (commuter_id = auth.uid() or public.is_staff('ADMIN','CLERK','INSPECTOR'));

create policy ticket_messages_select on public.ticket_messages
  for select using (
    exists (select 1 from public.support_tickets t where t.id = ticket_messages.ticket_id and t.commuter_id = auth.uid())
    or public.is_staff('ADMIN','CLERK','INSPECTOR')
  );
create policy ticket_messages_insert on public.ticket_messages
  for insert with check (
    exists (select 1 from public.support_tickets t where t.id = ticket_messages.ticket_id and t.commuter_id = auth.uid())
    or public.is_staff('ADMIN','CLERK','INSPECTOR')
  );
