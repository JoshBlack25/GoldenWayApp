-- =====================================================================
-- GoldenWay — migration 0007: notifications
-- Ports the notification intent from the Spring backend-concept (§3.2
-- domain events → frontend effect) into Postgres triggers (QuesAndSuggest
-- point 7: "a purchase is made, trip is used or loaded, down to the
-- inspector scanning the ticket").
-- Every event the app produces lands in `notifications` for the right
-- user; the bell + /notifications screen read this table over realtime.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------

create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link_path  text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread
  on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------
-- 2. notify() helper — used by all triggers. Skips nulls and duplicates
--    inside a 30 s window (e.g. ticket + first message firing together).
-- ---------------------------------------------------------------------

create or replace function public.notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_link_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_title is null then
    return;
  end if;
  if exists (
    select 1 from public.notifications
    where user_id = p_user_id and type = p_type and title = p_title
      and created_at > now() - interval '30 seconds'
  ) then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body, link_path)
  values (p_user_id, p_type, left(p_title, 120), left(p_body, 300), p_link_path);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Event triggers
-- ---------------------------------------------------------------------

-- 3a. Top-up PAID → receipt notification for the card owner.
create or replace function public.notify_topup_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if new.status = 'PAID' and coalesce(old.status, '') <> 'PAID' then
    select owner_id into v_owner from public.gold_cards where card_number = new.card_number;
    perform public.notify(
      v_owner, 'TOPUP_PAID',
      'Product loaded — receipt ' || coalesce(new.receipt_reference, ''),
      new.product_code || coalesce(' for ' || new.route_code, '')
        || ' was loaded on card ' || new.card_number || '.',
      '/history'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_topup_paid on public.top_up_orders;
create trigger on_topup_paid
  after update of status on public.top_up_orders
  for each row execute function public.notify_topup_paid();

-- 3b. Journey tapped → confirmation for the card owner.
create or replace function public.notify_journey_tapped()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_left int;
begin
  select owner_id into v_owner from public.gold_cards where card_number = new.card_number;
  select coalesce(sum(journeys_total - journeys_used), 0)::int into v_left
    from public.loaded_products
    where card_number = new.card_number
      and current_date between valid_from and valid_to;

  if new.was_transfer then
    perform public.notify(
      v_owner, 'JOURNEY',
      'Free transfer used on ' || new.route_code,
      'You changed buses within 60 minutes — no journey deducted. ' || v_left || ' journeys left.',
      '/history'
    );
  else
    perform public.notify(
      v_owner, 'JOURNEY',
      'Journey validated on ' || new.route_code,
      v_left || ' ' || case when v_left = 1 then 'journey' else 'journeys' end || ' remaining on your card.',
      '/history'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_journey_tapped on public.deductions;
create trigger on_journey_tapped
  after insert on public.deductions
  for each row execute function public.notify_journey_tapped();

-- 3c. Service alert published → notify commuters who tapped that route
--     in the last 7 days (all commuters for network-wide alerts).
create or replace function public.notify_alert_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.route_code is null then
    -- Network-wide alert → every commuter with a card.
    for r in
      select distinct c.owner_id as uid from public.gold_cards c where c.owner_id is not null
    loop
      perform public.notify(r.uid, 'ALERT', new.title, new.body, '/home');
    end loop;
  else
    -- Route-scoped → commuters who tapped that route in the last 7 days.
    for r in
      select distinct c.owner_id as uid
      from public.deductions d
      join public.gold_cards c on c.card_number = d.card_number
      where d.route_code = new.route_code
        and d.deducted_at > now() - interval '7 days'
        and c.owner_id is not null
    loop
      perform public.notify(r.uid, 'ALERT', new.title, new.body, '/home');
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists on_alert_published on public.service_alerts;
create trigger on_alert_published
  after insert on public.service_alerts
  for each row execute function public.notify_alert_published();

-- 3d. Support: new ticket → agents; agent reply → the commuter.
create or replace function public.notify_ticket_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select s.id as uid from public.staff s
    where s.active and s.role in ('AGENT','ADMIN')
  loop
    perform public.notify(r.uid, 'TICKET_NEW',
      'New support ticket #' || new.id,
      new.subject, '/staff/inbox');
  end loop;
  return new;
end;
$$;

drop trigger if exists on_ticket_created on public.support_tickets;
create trigger on_ticket_created
  after insert on public.support_tickets
  for each row execute function public.notify_ticket_created();

create or replace function public.notify_ticket_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commuter uuid;
  v_subject text;
  r record;
begin
  select t.commuter_id, t.subject into v_commuter, v_subject
    from public.support_tickets t where t.id = new.ticket_id;

  if new.sender = 'AGENT' then
    perform public.notify(v_commuter, 'TICKET_REPLY',
      'Support replied to "' || v_subject || '"',
      new.body, '/support');
  else
    for r in
      select s.id as uid from public.staff s
      where s.active and s.role in ('AGENT','ADMIN')
    loop
      perform public.notify(r.uid, 'TICKET_NEW',
        'New message on ticket #' || new.ticket_id,
        new.body, '/staff/inbox');
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists on_ticket_message on public.ticket_messages;
create trigger on_ticket_message
  after insert on public.ticket_messages
  for each row execute function public.notify_ticket_message();

-- 3e. Concession verified → the commuter.
create or replace function public.notify_concession_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(old.concession_verified_at is null, true)
     and new.concession_verified_at is not null then
    perform public.notify(new.id, 'CONCESSION',
      new.concession_type || ' concession verified',
      'Your discounted fares are now active on your profile.',
      '/profile');
  end if;
  return new;
end;
$$;

drop trigger if exists on_concession_verified on public.commuters;
create trigger on_concession_verified
  after update of concession_verified_at on public.commuters
  for each row execute function public.notify_concession_verified();

-- 3f. Card registered/linked → the owner (balance protection, BR-10).
create or replace function public.notify_card_registered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null and coalesce(old.owner_id, '00000000-0000-0000-0000-000000000000'::uuid) is distinct from new.owner_id then
    perform public.notify(new.owner_id, 'CARD',
      'Gold Card ' || new.card_number || ' linked',
      'Your card is registered — your balance is protected.',
      '/card');
  end if;
  return new;
end;
$$;

drop trigger if exists on_card_registered on public.gold_cards;
create trigger on_card_registered
  after update of owner_id on public.gold_cards
  for each row execute function public.notify_card_registered();

-- 3g. Inspection logged → the card owner ("your card was inspected").
create or replace function public.notify_inspection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.gold_cards where card_number = new.card_number;
  perform public.notify(v_owner, 'INSPECTION',
    'Your card was inspected — ' || new.outcome,
    case when new.outcome = 'VALID'
         then 'Thanks for riding with the correct fare.'
         else 'A Golden Arrow inspector recorded this outcome on your card.' end,
    '/history');
  return new;
end;
$$;

drop trigger if exists on_inspection on public.inspection_events;
create trigger on_inspection
  after insert on public.inspection_events
  for each row execute function public.notify_inspection();

-- 3h. Staff request decided → the requester (if they already have an
--     auth account; otherwise they see it on the staff sign-up page).
create or replace function public.notify_staff_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if new.status in ('APPROVED','DENIED') and coalesce(old.status, '') = 'PENDING' then
    select u.id into v_uid from auth.users u where lower(u.email) = lower(new.email) limit 1;
    if v_uid is not null then
      perform public.notify(v_uid, 'STAFF_DECISION',
        case when new.status = 'APPROVED'
             then 'Your staff access was approved'
             else 'Your staff access request was declined' end,
        case when new.status = 'APPROVED'
             then 'Sign up with this email to finish setting up your ' || new.requested_role || ' account.'
             else coalesce(new.decision_note, 'Contact a GoldenWay admin for details.') end,
        '/staff/login');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_staff_decision on public.staff_access_requests;
create trigger on_staff_decision
  after update of status on public.staff_access_requests
  for each row execute function public.notify_staff_decision();

-- ---------------------------------------------------------------------
-- 4. RPC — mark read (own rows only)
-- ---------------------------------------------------------------------

create or replace function public.mark_notifications_read(p_ids bigint[] default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  with upd as (
    update public.notifications
      set read_at = now()
      where user_id = auth.uid() and read_at is null
        and (p_ids is null or id = any(p_ids))
      returning 1
  )
  select count(*) into v_count from upd;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. RLS + realtime + grants
-- ---------------------------------------------------------------------

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime: bell + list subscribe to this table.
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then
    null;  -- already added
  end;
end $$;

grant select, update on public.notifications to authenticated;
