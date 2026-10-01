-- =====================================================================
-- GoldenWay — migration 0004
--   1. Catalogue consistency: routes only sell products that have a
--      live fare-table price for THAT route (kills the R0.00 cards and
--      cross-route duplicates). pay_topup_order becomes the price
--      authority — it rejects any amount that doesn't match the fare
--      table (business rule: the fare table is the single source of
--      truth for what a journey costs).
--   2. Timetables: route_departures table + demo seed built on the real
--      GABS service pattern (weekday AM/PM peak waves with 15–20 min
--      frequencies on trunk corridors, hourly off-peak, reduced
--      Saturday service, minimal Sunday service).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1a. fares_products_for_route — only products with a live price on
--     this route. Go Easy stays gated by BR-03 eligibility.
-- ---------------------------------------------------------------------

create or replace function public.fares_products_for_route(p_route_code text)
returns table (
  code text, family text, journeys int, valid_days int,
  transfers_allowed int, price_cents bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_go_easy_eligible boolean;
begin
  select go_easy_eligible into v_go_easy_eligible from public.routes where routes.code = p_route_code;
  if v_go_easy_eligible is null then
    raise exception 'Route not found: %', p_route_code;
  end if;

  return query
  select p.code, p.family, p.journeys, p.valid_days, p.transfers_allowed,
    fte.price_cents
  from public.fare_products p
  join public.fare_table_entries fte
    on fte.product_code = p.code
   and fte.route_code = p_route_code
   and fte.effective_from <= current_date
   and (fte.effective_to is null or fte.effective_to >= current_date)
  where p.active = true
    and not (p.family = 'GO_EASY' and not v_go_easy_eligible)
  order by p.family, p.journeys;
end;
$$;

-- ---------------------------------------------------------------------
-- 1b. pay_topup_order — now enforces the fare table as the price
--     authority. A product must have a live price row for the order's
--     route and the paid amount must match it exactly. This closes the
--     "buy another route's pass at R0.00" hole server-side.
-- ---------------------------------------------------------------------

create or replace function public.pay_topup_order(p_order_id bigint)
returns public.top_up_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.top_up_orders;
  v_owner uuid;
  v_card_status text;
  v_fare bigint;
  v_product public.fare_products;
begin
  select * into v_order from public.top_up_orders where id = p_order_id;
  if v_order is null then
    raise exception 'Order % not found', p_order_id;
  end if;

  select owner_id, status into v_owner, v_card_status
    from public.gold_cards where card_number = v_order.card_number;

  if v_owner <> auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_order.status <> 'PENDING_PAYMENT' then
    raise exception 'Order % is %, cannot pay', p_order_id, v_order.status using errcode = '55000';
  end if;

  -- BR-09 (price authority): the product must have a live fare-table
  -- price for this route, and the amount must match it exactly.
  if v_order.route_code is null then
    raise exception 'Order % has no route — cannot price it', p_order_id using errcode = '55000';
  end if;

  select fte.price_cents into v_fare
    from public.fare_table_entries fte
    where fte.product_code = v_order.product_code
      and fte.route_code = v_order.route_code
      and fte.effective_from <= current_date
      and (fte.effective_to is null or fte.effective_to >= current_date)
    order by fte.effective_from desc limit 1;

  if v_fare is null then
    update public.top_up_orders set status = 'FAILED' where id = p_order_id;
    insert into public.payment_attempts (order_id, gateway, status)
      values (p_order_id, 'SIMULATED', 'DECLINED');
    raise exception 'Product % is not currently sold on route % — please choose a plan from the catalogue',
      v_order.product_code, v_order.route_code using errcode = '55000';
  end if;

  if v_order.amount_cents <> v_fare then
    update public.top_up_orders set status = 'FAILED' where id = p_order_id;
    insert into public.payment_attempts (order_id, gateway, status)
      values (p_order_id, 'SIMULATED', 'DECLINED');
    raise exception 'Price changed — the fare table says % for this plan. Reload and try again.',
      to_char(v_fare / 100.0, 'FM999999990.00') using errcode = '55000';
  end if;

  if v_card_status in ('LOST','EXPIRED') then
    raise exception 'Cannot load a product: card is %', v_card_status using errcode = '55000';
  end if;

  update public.top_up_orders
    set status = 'PAID', paid_at = now(), receipt_reference = public.generate_receipt_reference()
    where id = p_order_id
    returning * into v_order;

  insert into public.payment_attempts (order_id, gateway, status, gateway_ref)
    values (p_order_id, 'SIMULATED', 'APPROVED', v_order.receipt_reference);

  select * into v_product from public.fare_products where code = v_order.product_code;
  if v_product is null then
    raise exception 'Unknown fare product %', v_order.product_code;
  end if;

  insert into public.loaded_products (
    card_number, product_code, route_code, journeys_total, journeys_used,
    transfers_allowed, valid_from, valid_to
  ) values (
    v_order.card_number, v_product.code, v_order.route_code,
    v_product.journeys, 0, v_product.transfers_allowed,
    current_date, current_date + v_product.valid_days
  );

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Timetables
-- ---------------------------------------------------------------------

create table if not exists public.route_departures (
  id             bigint generated always as identity primary key,
  route_code     text not null references public.routes(code) on delete cascade,
  direction      text not null default 'OUTBOUND' check (direction in ('OUTBOUND','INBOUND')),
  service_day    text not null default 'WEEKDAY' check (service_day in ('WEEKDAY','SATURDAY','SUNDAY')),
  departure_time time not null,
  constraint route_departures_unique
    unique (route_code, direction, service_day, departure_time)
);

create index if not exists idx_departures_lookup
  on public.route_departures (route_code, direction, service_day, departure_time);

alter table public.route_departures enable row level security;

drop policy if exists route_departures_read on public.route_departures;
drop policy if exists route_departures_write on public.route_departures;
create policy route_departures_read on public.route_departures
  for select using (true);
create policy route_departures_write on public.route_departures
  for all using (public.is_staff('ADMIN','CLERK'))
  with check (public.is_staff('ADMIN','CLERK'));

grant select on public.route_departures to anon, authenticated;

-- ---------------------------------------------------------------------
-- Seed — built on the real GABS service pattern:
--   · weekday AM peak wave ~05:00–08:30 at 15–20 min on trunk corridors
--   · hourly off-peak through the middle of the day
--   · weekday PM peak wave ~15:15–18:30
--   · last buses ~19:30–20:30
--   · reduced Saturday service, minimal Sunday service (trunk only)
-- Demo data for the presentation — replace with GABS's published
-- timetables before any real deployment.
-- ---------------------------------------------------------------------

-- KHA-CPT (Khayelitsha → City) — the flagship trunk
with t as (
  select generate_series('2026-01-01 05:15'::timestamp, '2026-01-01 08:15'::timestamp, interval '15 minutes') as s
  union all select generate_series('2026-01-01 09:15'::timestamp, '2026-01-01 14:15'::timestamp, interval '60 minutes')
  union all select generate_series('2026-01-01 15:15'::timestamp, '2026-01-01 18:15'::timestamp, interval '15 minutes')
  union all select unnest(array['2026-01-01 04:45'::timestamp, '2026-01-01 19:15'::timestamp, '2026-01-01 19:45'::timestamp])
)
insert into public.route_departures (route_code, direction, service_day, departure_time)
select 'KHA-CPT', 'OUTBOUND', 'WEEKDAY', s::time from t
on conflict do nothing;

with t as (
  select generate_series('2026-01-01 06:00'::timestamp, '2026-01-01 09:00'::timestamp, interval '15 minutes') as s
  union all select generate_series('2026-01-01 10:00'::timestamp, '2026-01-01 14:00'::timestamp, interval '60 minutes')
  union all select generate_series('2026-01-01 16:00'::timestamp, '2026-01-01 19:00'::timestamp, interval '15 minutes')
  union all select unnest(array['2026-01-01 05:30'::timestamp, '2026-01-01 20:00'::timestamp, '2026-01-01 20:30'::timestamp])
)
insert into public.route_departures (route_code, direction, service_day, departure_time)
select 'KHA-CPT', 'INBOUND', 'WEEKDAY', s::time from t
on conflict do nothing;

-- MP-CPT (Mitchells Plain → City)
with t as (
  select generate_series('2026-01-01 05:20'::timestamp, '2026-01-01 08:40'::timestamp, interval '20 minutes') as s
  union all select generate_series('2026-01-01 09:40'::timestamp, '2026-01-01 14:40'::timestamp, interval '60 minutes')
  union all select generate_series('2026-01-01 15:20'::timestamp, '2026-01-01 18:40'::timestamp, interval '20 minutes')
  union all select unnest(array['2026-01-01 05:00'::timestamp, '2026-01-01 19:20'::timestamp])
)
insert into public.route_departures (route_code, direction, service_day, departure_time)
select 'MP-CPT', 'OUTBOUND', 'WEEKDAY', s::time from t
on conflict do nothing;

with t as (
  select generate_series('2026-01-01 06:10'::timestamp, '2026-01-01 09:10'::timestamp, interval '20 minutes') as s
  union all select generate_series('2026-01-01 10:10'::timestamp, '2026-01-01 14:10'::timestamp, interval '60 minutes')
  union all select generate_series('2026-01-01 16:10'::timestamp, '2026-01-01 19:10'::timestamp, interval '20 minutes')
  union all select unnest(array['2026-01-01 05:45'::timestamp, '2026-01-01 20:10'::timestamp])
)
insert into public.route_departures (route_code, direction, service_day, departure_time)
select 'MP-CPT', 'INBOUND', 'WEEKDAY', s::time from t
on conflict do nothing;

-- BELL-CPT (Bellville → City)
with t as (
  select generate_series('2026-01-01 05:25'::timestamp, '2026-01-01 08:35'::timestamp, interval '15 minutes') as s
  union all select generate_series('2026-01-01 09:35'::timestamp, '2026-01-01 14:35'::timestamp, interval '60 minutes')
  union all select generate_series('2026-01-01 15:25'::timestamp, '2026-01-01 18:35'::timestamp, interval '15 minutes')
  union all select unnest(array['2026-01-01 05:10'::timestamp, '2026-01-01 19:35'::timestamp])
)
insert into public.route_departures (route_code, direction, service_day, departure_time)
select 'BELL-CPT', 'OUTBOUND', 'WEEKDAY', s::time from t
on conflict do nothing;

with t as (
  select generate_series('2026-01-01 06:00'::timestamp, '2026-01-01 09:00'::timestamp, interval '15 minutes') as s
  union all select generate_series('2026-01-01 10:00'::timestamp, '2026-01-01 14:00'::timestamp, interval '60 minutes')
  union all select generate_series('2026-01-01 16:00'::timestamp, '2026-01-01 19:00'::timestamp, interval '15 minutes')
  union all select unnest(array['2026-01-01 05:40'::timestamp, '2026-01-01 20:00'::timestamp])
)
insert into public.route_departures (route_code, direction, service_day, departure_time)
select 'BELL-CPT', 'INBOUND', 'WEEKDAY', s::time from t
on conflict do nothing;

-- Shorter corridors — flat all-day frequencies
insert into public.route_departures (route_code, direction, service_day, departure_time)
select 'WYN-OBS', 'OUTBOUND', 'WEEKDAY', t::time
from generate_series('2026-01-01 05:30'::timestamp, '2026-01-01 19:30'::timestamp, interval '30 minutes') t
on conflict do nothing;

insert into public.route_departures (route_code, direction, service_day, departure_time)
select 'CPT-BLK', 'OUTBOUND', 'WEEKDAY', t::time
from generate_series('2026-01-01 05:20'::timestamp, '2026-01-01 19:50'::timestamp, interval '30 minutes') t
on conflict do nothing;

insert into public.route_departures (route_code, direction, service_day, departure_time)
select 'WOOD-ATL', 'OUTBOUND', 'WEEKDAY', t::time
from generate_series('2026-01-01 05:40'::timestamp, '2026-01-01 18:40'::timestamp, interval '60 minutes') t
on conflict do nothing;

insert into public.route_departures (route_code, direction, service_day, departure_time)
select 'PAARL-BELL', 'OUTBOUND', 'WEEKDAY', t.s::time
from (
  select generate_series('2026-01-01 06:50'::timestamp, '2026-01-01 17:50'::timestamp, interval '60 minutes') as s
  union all select unnest(array['2026-01-01 05:50'::timestamp, '2026-01-01 18:20'::timestamp])
) t
on conflict do nothing;

-- Saturday — reduced service on the three trunk routes
insert into public.route_departures (route_code, direction, service_day, departure_time)
select r.code, r.dir, 'SATURDAY', t::time
from (values
  ('KHA-CPT', 'OUTBOUND', '06:00'::time, '18:00'::time, 30),
  ('KHA-CPT', 'INBOUND',  '06:40'::time, '19:00'::time, 30),
  ('MP-CPT',  'OUTBOUND', '06:10'::time, '18:10'::time, 30),
  ('MP-CPT',  'INBOUND',  '06:50'::time, '18:50'::time, 30),
  ('BELL-CPT','OUTBOUND', '06:20'::time, '18:20'::time, 30),
  ('BELL-CPT','INBOUND',  '07:00'::time, '19:00'::time, 30)
) as r(code, dir, first, last, mins)
cross join lateral generate_series(
  ('2026-01-01 ' || r.first)::timestamp,
  ('2026-01-01 ' || r.last)::timestamp,
  (r.mins || ' minutes')::interval
) t
on conflict do nothing;

-- Sunday — minimal service on the three trunk routes
insert into public.route_departures (route_code, direction, service_day, departure_time)
select r.code, r.dir, 'SUNDAY', t::time
from (values
  ('KHA-CPT', 'OUTBOUND', '07:00'::time, '17:00'::time, 60),
  ('KHA-CPT', 'INBOUND',  '07:40'::time, '17:40'::time, 60),
  ('MP-CPT',  'OUTBOUND', '07:10'::time, '17:10'::time, 60),
  ('MP-CPT',  'INBOUND',  '07:50'::time, '17:50'::time, 60),
  ('BELL-CPT','OUTBOUND', '07:20'::time, '17:20'::time, 60),
  ('BELL-CPT','INBOUND',  '08:00'::time, '18:00'::time, 60)
) as r(code, dir, first, last, mins)
cross join lateral generate_series(
  ('2026-01-01 ' || r.first)::timestamp,
  ('2026-01-01 ' || r.last)::timestamp,
  (r.mins || ' minutes')::interval
) t
on conflict do nothing;
