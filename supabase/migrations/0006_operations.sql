-- =====================================================================
-- GoldenWay — migration 0006: operations
-- Ports the Spring operations domain forward (ServiceAlert, BR-08
-- handheld verification, MULTIROLE-PLAN §5.2):
--   1. buses master table (fleet numbers; FINAL-DEV-PLAN §8 Q2)
--   2. vehicle_runs — DRIVER reports on-time/delayed/breakdown; the
--      report is the source of truth for live info (replaces hardcoded
--      Route-42 timeline, mock M4)
--   3. inspection_events — the "fare evasion counter-measure" (Business
--      Report, Feb 2018): inspectors log outcomes per card
-- Auto-alert trigger: DELAYED/BREAKDOWN runs publish a route-scoped
-- service_alert so commuters' Home banner + notifications react with no
-- extra work.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Buses master (fleet register)
-- ---------------------------------------------------------------------

create table if not exists public.buses (
  fleet_no  text primary key,
  depot     text not null default 'MONTANA'
            check (depot in ('MONTANA','PHILIPPI','WOODSTOCK','ATLANTIS','SIMON''S TOWN','BLACKHEATH')),
  seating   int not null default 60,
  active    boolean not null default true
);

-- ---------------------------------------------------------------------
-- 2. Vehicle runs (driver status reporting)
-- ---------------------------------------------------------------------

create table if not exists public.vehicle_runs (
  id             bigint generated always as identity primary key,
  driver_id      uuid not null references public.staff(id),
  route_code     text not null references public.routes(code),
  bus_id         text not null references public.buses(fleet_no),
  direction      text not null default 'OUTBOUND' check (direction in ('OUTBOUND','INBOUND')),
  service_day    text not null default 'WEEKDAY' check (service_day in ('WEEKDAY','SATURDAY','SUNDAY')),
  status         text not null default 'ON_TIME'
                 check (status in ('ON_TIME','DELAYED','BREAKDOWN','DIVERTED','COMPLETED')),
  delay_minutes  int not null default 0
                 constraint vehicle_runs_delay_nonneg check (delay_minutes >= 0),
  note           text,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz
);

create index if not exists idx_vehicle_runs_route_active
  on public.vehicle_runs (route_code, started_at desc);

-- A driver has at most one open run at a time.
create unique index if not exists uq_vehicle_runs_open_per_driver
  on public.vehicle_runs (driver_id)
  where ended_at is null;

-- ---------------------------------------------------------------------
-- 3. Inspection events (inspector handheld, BR-08)
-- ---------------------------------------------------------------------

create table if not exists public.inspection_events (
  id           bigint generated always as identity primary key,
  inspector_id uuid not null references public.staff(id),
  card_number  text not null,
  outcome      text not null
               check (outcome in ('VALID','NO_PRODUCT','EXPIRED_PRODUCT','UNREGISTERED_CARD','REFUSED')),
  note         text,
  at           timestamptz not null default now()
);

create index if not exists idx_inspection_events_card
  on public.inspection_events (card_number, at desc);

-- ---------------------------------------------------------------------
-- 4. RPCs — driver
-- ---------------------------------------------------------------------

-- DRIVER (or ADMIN): start a run (route + bus). One open run per driver.
create or replace function public.start_run(p_route_code text, p_bus_id text, p_direction text default 'OUTBOUND')
returns public.vehicle_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vehicle_runs;
  v_role text;
  v_day text;
begin
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('DRIVER','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (select 1 from public.routes where code = p_route_code and active) then
    raise exception 'routeCode: unknown or inactive route %', p_route_code;
  end if;
  if not exists (select 1 from public.buses where fleet_no = p_bus_id and active) then
    raise exception 'busId: unknown or inactive bus %', p_bus_id;
  end if;
  if p_direction not in ('OUTBOUND','INBOUND') then
    raise exception 'direction: must be OUTBOUND or INBOUND';
  end if;

  v_day := case extract(dow from now())
             when 0 then 'SUNDAY' when 6 then 'SATURDAY' else 'WEEKDAY' end;

  insert into public.vehicle_runs (driver_id, route_code, bus_id, direction, service_day)
  values (auth.uid(), p_route_code, p_bus_id, p_direction, v_day)
  returning * into v_row;

  return v_row;
end;
$$;

-- DRIVER/ADMIN: update the running status. DELAYED/BREAKDOWN auto-publish
-- a route-scoped service alert (WARNING/CRITICAL) that commuters see on
-- Home and in their notifications.
create or replace function public.report_run_status(
  p_run_id bigint,
  p_status text,
  p_delay_minutes int default 0,
  p_note text default null
)
returns public.vehicle_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vehicle_runs;
  v_role text;
begin
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('DRIVER','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_row from public.vehicle_runs where id = p_run_id;
  if v_row is null then
    raise exception 'Run % not found', p_run_id;
  end if;
  if v_row.driver_id <> auth.uid() and v_role <> 'ADMIN' then
    raise exception 'FORBIDDEN: this is not your run' using errcode = '42501';
  end if;
  if p_status not in ('ON_TIME','DELAYED','BREAKDOWN','DIVERTED','COMPLETED') then
    raise exception 'status: invalid run status';
  end if;
  if p_delay_minutes < 0 then
    raise exception 'delayMinutes: cannot be negative';
  end if;
  if p_status = 'DELAYED' and p_delay_minutes <= 0 then
    raise exception 'delayMinutes: give the expected delay in minutes';
  end if;

  update public.vehicle_runs
    set status = p_status,
        delay_minutes = case when p_status in ('DELAYED','BREAKDOWN') then p_delay_minutes else 0 end,
        note = coalesce(p_note, note),
        ended_at = case when p_status = 'COMPLETED' then now() else ended_at end
    where id = p_run_id
    returning * into v_row;

  return v_row;
end;
$$;

-- Auto-alert: a DELAYED/BREAKDOWN status on an open run publishes a
-- service alert scoped to the route. Replaces hardcoded live-tracking
-- copy (mock M4) with real driver reports.
create or replace function public.handle_run_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_severity text;
  v_title text;
  v_body text;
begin
  if new.status not in ('DELAYED','BREAKDOWN') then
    return new;
  end if;
  -- Only publish when the run *becomes* delayed/broken (status changed),
  -- and never twice for the same continuous delay.
  if old.status = new.status then
    return new;
  end if;

  v_severity := case when new.status = 'BREAKDOWN' then 'CRITICAL' else 'WARNING' end;
  v_title := case when new.status = 'BREAKDOWN'
                  then 'Route ' || new.route_code || ': bus breakdown'
                  else 'Route ' || new.route_code || ': delays of about ' || new.delay_minutes || ' min' end;
  v_body := coalesce(new.note,
              case when new.status = 'BREAKDOWN'
                   then 'A vehicle on this route has broken down. Alternative transport is being arranged; expect disruptions.'
                   else 'Buses on this route are running about ' || new.delay_minutes || ' minutes behind schedule. Sorry for the inconvenience.' end);

  insert into public.service_alerts (title, body, severity, route_code, effective_from)
  values (v_title, v_body, v_severity, new.route_code, now());

  return new;
end;
$$;

drop trigger if exists on_run_status_change on public.vehicle_runs;
create trigger on_run_status_change
  after update of status on public.vehicle_runs
  for each row execute function public.handle_run_status_change();

-- ---------------------------------------------------------------------
-- 5. RPCs — inspector
-- ---------------------------------------------------------------------

-- Handheld verifier lookup (BR-08). Read-only, privacy-safe: owner
-- first name + surname initial only — no contact details.
create or replace function public.lookup_card_for_inspection(p_card_number text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_result json;
begin
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('INSPECTOR','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select json_build_object(
    'cardNumber', c.card_number,
    'status', c.status,
    'registered', c.owner_id is not null,
    'ownerName', (
      select m.first_name || ' ' || left(m.surname, 1) || '.'
      from public.commuters m where m.id = c.owner_id
    ),
    'concessionType', (select m.concession_type from public.commuters m where m.id = c.owner_id),
    'concessionVerified', (
      select m.concession_verified_at is not null from public.commuters m where m.id = c.owner_id
    ),
    'journeysRemaining', public.journeys_remaining(c.card_number),
    'loadedProducts', coalesce((
      select json_agg(json_build_object(
        'productCode', lp.product_code, 'routeCode', lp.route_code,
        'journeysTotal', lp.journeys_total, 'journeysUsed', lp.journeys_used,
        'validTo', lp.valid_to
      ) order by lp.valid_to)
      from public.loaded_products lp
      where lp.card_number = c.card_number
        and current_date between lp.valid_from and lp.valid_to
    ), '[]'::json),
    'recentInspections', coalesce((
      select json_agg(json_build_object('outcome', ie.outcome, 'at', ie.at) order by ie.at desc)
      from (select outcome, at from public.inspection_events
            where card_number = c.card_number order by at desc limit 3) ie
    ), '[]'::json)
  ) into v_result
  from public.gold_cards c where c.card_number = p_card_number;

  if v_result is null then
    raise exception 'Card % not found', p_card_number;
  end if;
  return v_result;
end;
$$;

-- Log the inspection outcome (the fare-evasion counter-measure record).
create or replace function public.log_inspection_outcome(
  p_card_number text,
  p_outcome text,
  p_note text default null
)
returns public.inspection_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_row public.inspection_events;
begin
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('INSPECTOR','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_outcome not in ('VALID','NO_PRODUCT','EXPIRED_PRODUCT','UNREGISTERED_CARD','REFUSED') then
    raise exception 'outcome: invalid inspection outcome';
  end if;
  if not exists (select 1 from public.gold_cards where card_number = p_card_number) then
    raise exception 'cardNumber: card % not found', p_card_number;
  end if;

  insert into public.inspection_events (inspector_id, card_number, outcome, note)
  values (auth.uid(), p_card_number, p_outcome, p_note)
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------

alter table public.buses             enable row level security;
alter table public.vehicle_runs      enable row level security;
alter table public.inspection_events enable row level security;

-- buses: any signed-in user may read the fleet list (driver picker).
drop policy if exists buses_read on public.buses;
create policy buses_read on public.buses for select using (true);
drop policy if exists buses_write on public.buses;
create policy buses_write on public.buses for all
  using (public.is_staff('ADMIN')) with check (public.is_staff('ADMIN'));

-- vehicle_runs: staff read all (dispatch picture); drivers write own.
drop policy if exists vehicle_runs_read on public.vehicle_runs;
create policy vehicle_runs_read on public.vehicle_runs
  for select using (public.is_staff('ADMIN','CLERK','INSPECTOR','DRIVER','AGENT'));
drop policy if exists vehicle_runs_insert on public.vehicle_runs;
create policy vehicle_runs_insert on public.vehicle_runs
  for insert with check (driver_id = auth.uid() or public.is_staff('ADMIN'));
drop policy if exists vehicle_runs_update on public.vehicle_runs;
create policy vehicle_runs_update on public.vehicle_runs
  for update using (driver_id = auth.uid() or public.is_staff('ADMIN'))
  with check (driver_id = auth.uid() or public.is_staff('ADMIN'));

-- inspection_events: inspectors write own; ADMIN/INSPECTOR read.
drop policy if exists inspection_events_read on public.inspection_events;
create policy inspection_events_read on public.inspection_events
  for select using (public.is_staff('ADMIN','INSPECTOR'));
drop policy if exists inspection_events_insert on public.inspection_events;
create policy inspection_events_insert on public.inspection_events
  for insert with check (inspector_id = auth.uid());

-- ---------------------------------------------------------------------
-- 7. Seed — demo fleet (fictional fleet numbers, GABS depot names)
-- ---------------------------------------------------------------------

insert into public.buses (fleet_no, depot, seating) values
  ('GW-1001', 'MONTANA',      65),
  ('GW-1002', 'MONTANA',      65),
  ('GW-1003', 'PHILIPPI',     60),
  ('GW-1004', 'PHILIPPI',     60),
  ('GW-1005', 'WOODSTOCK',    55),
  ('GW-1006', 'WOODSTOCK',    55),
  ('GW-1007', 'ATLANTIS',     60),
  ('GW-1008', 'BLACKHEATH',   65),
  ('GW-1009', 'BLACKHEATH',   65),
  ('GW-1010', 'SIMON''S TOWN', 45)
on conflict (fleet_no) do nothing;

grant select on public.buses to anon, authenticated;
grant select, insert, update on public.vehicle_runs to authenticated;
grant select, insert on public.inspection_events to authenticated;
