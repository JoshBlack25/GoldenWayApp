-- =====================================================================
-- GoldenWay — migration 0005: identity & onboarding
-- Ports the Spring Boot Staff/Role domain (za.ac.cput.goldenway.domain
-- .identity.Staff, .enums.Role) forward:
--   1. staff.role gains DRIVER and AGENT (research: §1 of MULTIROLE-PLAN)
--   2. staff_access_requests — admin-approved employee onboarding
--      (QuesAndSuggest.md point 2): a person requests access, ADMIN
--      approves, the person then signs up with that same email and a
--      signup trigger attaches the approved staff role — no admin-run
--      password handouts, no direct auth.users writes.
--   3. staff_action_log — every staff mutation audited (ownership
--      matrix promise, backend-concept §7.2).
-- RPCs follow the house convention: raise 'field: message' validation
-- errors, 'FORBIDDEN' with errcode 42501, SECURITY DEFINER, search_path
-- pinned — see 0002_functions.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Widen the role enum on staff (ADMIN/CLERK/INSPECTOR already exist)
-- ---------------------------------------------------------------------

alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff add constraint staff_role_check
  check (role in ('ADMIN','CLERK','INSPECTOR','DRIVER','AGENT'));

-- ---------------------------------------------------------------------
-- 2. Employee onboarding queue
-- ---------------------------------------------------------------------

create table if not exists public.staff_access_requests (
  id             bigint generated always as identity primary key,
  email          text not null unique,
  first_name     text not null,
  surname        text not null,
  requested_role text not null check (requested_role in ('ADMIN','CLERK','INSPECTOR','DRIVER','AGENT')),
  motivation     text,
  status         text not null default 'PENDING' check (status in ('PENDING','APPROVED','DENIED')),
  decided_by     uuid references public.staff(id),
  decision_note  text,
  requested_at   timestamptz not null default now(),
  decided_at     timestamptz,
  onboarded_at   timestamptz           -- set by the signup trigger
);

create index if not exists idx_staff_requests_status
  on public.staff_access_requests (status, requested_at desc);

-- ---------------------------------------------------------------------
-- 3. Staff audit log (staff_action_log)
-- ---------------------------------------------------------------------

create table if not exists public.staff_action_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,                       -- auth user id of the acting staff member
  action     text not null,              -- e.g. 'APPROVE_STAFF_REQUEST'
  entity     text not null,              -- e.g. 'staff_access_requests'
  entity_id  text,
  details    jsonb,
  at         timestamptz not null default now()
);

create index if not exists idx_staff_action_log_at on public.staff_action_log (at desc);

-- ---------------------------------------------------------------------
-- 4. RPCs
-- ---------------------------------------------------------------------

-- Public: anyone may request staff access (the "Staff sign-up" form).
create or replace function public.request_staff_access(
  p_email text,
  p_first_name text,
  p_surname text,
  p_requested_role text,
  p_motivation text default null
)
returns public.staff_access_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.staff_access_requests;
begin
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email: enter a valid email address';
  end if;
  if p_first_name is null or trim(p_first_name) = '' then
    raise exception 'firstName: must not be blank';
  end if;
  if p_surname is null or trim(p_surname) = '' then
    raise exception 'surname: must not be blank';
  end if;
  if p_requested_role not in ('ADMIN','CLERK','INSPECTOR','DRIVER','AGENT') then
    raise exception 'requestedRole: must be one of ADMIN, CLERK, INSPECTOR, DRIVER, AGENT';
  end if;

  -- Re-request after a DENIED decision is allowed; a PENDING/APPROVED
  -- duplicate is not.
  if exists (
    select 1 from public.staff_access_requests
    where lower(email) = lower(p_email) and status in ('PENDING','APPROVED')
  ) then
    raise exception 'email: a request for this email is already %',
      (select lower(status) from public.staff_access_requests
       where lower(email) = lower(p_email) and status in ('PENDING','APPROVED') limit 1)
    using errcode = '23505';
  end if;

  insert into public.staff_access_requests (email, first_name, surname, requested_role, motivation)
  values (lower(trim(p_email)), trim(p_first_name), trim(p_surname), p_requested_role, p_motivation)
  returning * into v_row;

  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'REQUEST_STAFF_ACCESS', 'staff_access_requests', v_row.id::text,
          jsonb_build_object('email', v_row.email, 'role', v_row.requested_role));

  return v_row;
end;
$$;

-- ADMIN: approve or deny a request. Approval does NOT create the auth
-- user — the person completes onboarding by signing up with the approved
-- email (trigger below attaches the role). This avoids the service-role
-- dependency and lets staff set their own password (FINAL-DEV-PLAN §7.1).
create or replace function public.decide_staff_access(
  p_request_id bigint,
  p_approve boolean,
  p_note text default null
)
returns public.staff_access_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.staff_access_requests;
begin
  if not public.is_staff('ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.staff_access_requests
    set status = case when p_approve then 'APPROVED' else 'DENIED' end,
        decided_by = auth.uid(),
        decision_note = p_note,
        decided_at = now()
    where id = p_request_id and status = 'PENDING'
    returning * into v_row;

  if v_row is null then
    raise exception 'Request % is not PENDING — nothing to decide', p_request_id using errcode = '55000';
  end if;

  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(),
          case when p_approve then 'APPROVE_STAFF_REQUEST' else 'DENY_STAFF_REQUEST' end,
          'staff_access_requests', v_row.id::text,
          jsonb_build_object('email', v_row.email, 'role', v_row.requested_role, 'note', p_note));

  return v_row;
end;
$$;

-- ADMIN: fast-track — pre-approve someone without a self-request
-- (replaces the old raw-SQL staff creation; onboarding completes when
-- the person signs up).
create or replace function public.create_staff_member(
  p_email text,
  p_first_name text,
  p_surname text,
  p_role text
)
returns public.staff_access_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.staff_access_requests;
begin
  if not public.is_staff('ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_role not in ('ADMIN','CLERK','INSPECTOR','DRIVER','AGENT') then
    raise exception 'role: must be one of ADMIN, CLERK, INSPECTOR, DRIVER, AGENT';
  end if;

  insert into public.staff_access_requests (email, first_name, surname, requested_role, motivation, status, decided_by, decided_at)
  values (lower(trim(p_email)), trim(p_first_name), trim(p_surname), p_role,
          'Direct invite by admin', 'APPROVED', auth.uid(), now())
  on conflict (email) do update
    set requested_role = excluded.requested_role,
        first_name = excluded.first_name,
        surname = excluded.surname,
        status = 'APPROVED',
        decided_by = auth.uid(),
        decided_at = now()
  returning * into v_row;

  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'INVITE_STAFF', 'staff_access_requests', v_row.id::text,
          jsonb_build_object('email', v_row.email, 'role', v_row.requested_role));

  return v_row;
end;
$$;

-- ADMIN: deactivate/reactivate a staff member (deactivate, never delete).
create or replace function public.set_staff_active(p_staff_id uuid, p_active boolean)
returns public.staff
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.staff;
begin
  if not public.is_staff('ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_staff_id = auth.uid() and p_active = false then
    raise exception 'staffId: you cannot deactivate your own account';
  end if;
  update public.staff set active = p_active where id = p_staff_id returning * into v_row;
  if v_row is null then
    raise exception 'Staff member not found';
  end if;
  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), case when p_active then 'ACTIVATE_STAFF' else 'DEACTIVATE_STAFF' end,
          'staff', p_staff_id::text, jsonb_build_object('role', v_row.role));
  return v_row;
end;
$$;

-- Login routing: which profile does this auth user have?
-- Returns null (no profile yet), or { userType, role, ... }.
create or replace function public.my_profile_type()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_staff public.staff;
begin
  if auth.uid() is null then
    return null;
  end if;
  select * into v_staff from public.staff where staff.id = auth.uid();
  if v_staff is not null then
    return json_build_object(
      'userType', 'STAFF', 'role', v_staff.role, 'active', v_staff.active,
      'firstName', v_staff.first_name, 'surname', v_staff.surname, 'email', v_staff.email);
  end if;
  if exists (select 1 from public.commuters where commuters.id = auth.uid()) then
    return json_build_object('userType', 'COMMUTER');
  end if;
  return json_build_object('userType', 'UNPROFILED');
end;
$$;

-- Status check for the "Staff sign-up" page: where is my request?
create or replace function public.my_staff_request_status()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_email text;
  v_row public.staff_access_requests;
begin
  if auth.uid() is null then
    return null;
  end if;
  select email into v_email from auth.users where id = auth.uid();
  select * into v_row from public.staff_access_requests
    where lower(email) = lower(v_email)
    order by requested_at desc limit 1;
  if v_row is null then
    return json_build_object('status', 'NONE');
  end if;
  return json_build_object('status', v_row.status, 'role', v_row.requested_role,
                           'note', v_row.decision_note);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Onboarding trigger: approved request + signup => staff row
--    (Runs for every new auth user; only acts when an APPROVED staff
--    request with the same email exists — commuter signups unaffected.)
-- ---------------------------------------------------------------------

create or replace function public.handle_staff_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.staff_access_requests;
begin
  if new.email is null then
    return new;
  end if;
  select * into v_req from public.staff_access_requests
    where lower(email) = lower(new.email) and status = 'APPROVED'
    order by decided_at desc limit 1;
  if v_req is not null then
    insert into public.staff (id, first_name, surname, email, role, active)
    values (new.id, v_req.first_name, v_req.surname, new.email, v_req.requested_role, true)
    on conflict (id) do nothing;
    update public.staff_access_requests set onboarded_at = now() where id = v_req.id;
    insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
    values (new.id, 'STAFF_ONBOARDED', 'staff', new.id::text,
            jsonb_build_object('email', new.email, 'role', v_req.requested_role));
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_staff_signup on auth.users;
create trigger on_auth_user_staff_signup
  after insert on auth.users
  for each row execute function public.handle_staff_signup();

-- ---------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------

alter table public.staff_access_requests enable row level security;
alter table public.staff_action_log   enable row level security;

drop policy if exists staff_requests_read on public.staff_access_requests;
create policy staff_requests_read on public.staff_access_requests
  for select using (
    public.is_staff('ADMIN')
    or (auth.uid() is not null and email = (select u.email from auth.users u where u.id = auth.uid()))
  );

drop policy if exists staff_requests_insert on public.staff_access_requests;
create policy staff_requests_insert on public.staff_access_requests
  for insert with check (true);   -- public request form

drop policy if exists staff_requests_update on public.staff_access_requests;
create policy staff_requests_update on public.staff_access_requests
  for update using (public.is_staff('ADMIN')) with check (public.is_staff('ADMIN'));

drop policy if exists staff_action_log_read on public.staff_action_log;
create policy staff_action_log_read on public.staff_action_log
  for select using (public.is_staff('ADMIN'));

-- ---------------------------------------------------------------------
-- 7. Grants (RLS still constrains what each role can see)
-- ---------------------------------------------------------------------

grant select, insert on public.staff_access_requests to anon, authenticated;
grant select on public.staff_action_log to authenticated;
