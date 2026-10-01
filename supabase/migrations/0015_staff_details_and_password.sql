-- =====================================================================
-- GoldenWay — migration 0015: staff details edit + password change
--
-- Merges a teammate's parallel work (frontend/src/api/staff.js and
-- StaffProfileScreen's EditDetailsCard, already on main) with the
-- my_profile_type() fix from 0013. NOT derived from
-- supabase/migrations/0013_staff_self_profile.sql — that file reverts
-- my_profile_type() to the composite-row `is not null` bug (0013 fixed
-- this: a row's IS NOT NULL requires every column non-null, so it's
-- always false whenever any nullable column, e.g. phone, is null,
-- silently misrouting every staff login). Do not run that file.
--
-- 1. my_profile_type(): same `if found` fix as 0013, now also carrying
--    phone (needed so EditDetailsCard has an initial value without a
--    second query).
-- 2. update_my_staff_details(...): the richer self-service RPC the
--    merged frontend calls — name/surname/phone plus an opt-in password
--    change, current password re-verified server-side via pgcrypto
--    against auth.users' bcrypt hash before it's accepted.
-- 3. Drops update_my_staff_profile — superseded, no longer called by
--    anything (deactivate_my_account from 0014 is unaffected and stays).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create or replace function public.my_profile_type()
returns json
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_staff public.staff;
begin
  if auth.uid() is null then
    return null;
  end if;
  select * into v_staff from public.staff where staff.id = auth.uid();
  if found then
    return json_build_object(
      'userType', 'STAFF', 'role', v_staff.role, 'active', v_staff.active,
      'firstName', v_staff.first_name, 'surname', v_staff.surname,
      'email', v_staff.email, 'phone', v_staff.phone);
  end if;
  if exists (select 1 from public.commuters where commuters.id = auth.uid()) then
    return json_build_object('userType', 'COMMUTER');
  end if;
  return json_build_object('userType', 'UNPROFILED');
end;
$$;

create or replace function public.update_my_staff_details(
  p_first_name        text,
  p_surname           text,
  p_phone             text,
  p_change_password   boolean default false,
  p_current_password  text default null,
  p_new_password      text default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid      uuid := auth.uid();
  v_row      public.staff;
  v_pw_ok    boolean := false;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select * into v_row from public.staff where staff.id = v_uid;
  if not found then
    raise exception 'NOT_STAFF' using errcode = '42501';
  end if;
  if not v_row.active then
    raise exception 'ACCOUNT_INACTIVE' using errcode = '42501';
  end if;

  if p_first_name is null or btrim(p_first_name) = '' then
    raise exception 'First name is required' using errcode = '22023';
  end if;
  if p_surname is null or btrim(p_surname) = '' then
    raise exception 'Surname is required' using errcode = '22023';
  end if;
  if p_phone is not null
     and btrim(p_phone) <> ''
     and p_phone !~ '^(\+27|0)\d{9}$' then
    raise exception 'Phone must be a valid SA number, e.g. 0821234567' using errcode = '22023';
  end if;

  if p_change_password then
    if coalesce(btrim(p_current_password), '') = '' then
      raise exception 'Enter your current password to change it' using errcode = '22023';
    end if;
    if coalesce(btrim(p_new_password), '') = '' then
      raise exception 'New password is required' using errcode = '22023';
    end if;
    if length(btrim(p_new_password)) < 8 then
      raise exception 'New password must be at least 8 characters' using errcode = '22023';
    end if;

    select crypt(p_current_password, encrypted_password) = encrypted_password
      into v_pw_ok
      from auth.users
      where id = v_uid;

    if v_pw_ok is not true then
      raise exception 'Current password is incorrect' using errcode = '22023';
    end if;
  end if;

  update public.staff
    set first_name = btrim(p_first_name),
        surname    = btrim(p_surname),
        phone      = nullif(btrim(coalesce(p_phone, '')), '')
    where id = v_uid
    returning * into v_row;

  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (v_uid, 'UPDATE_OWN_PROFILE', 'staff', v_uid::text,
          jsonb_build_object(
            'first_name', v_row.first_name,
            'surname',    v_row.surname,
            'password_changed', coalesce(p_change_password, false)));

  if p_change_password then
    update auth.users
      set encrypted_password = crypt(p_new_password, gen_salt('bf', 10))
      where id = v_uid;
  end if;

  return json_build_object(
    'firstName', v_row.first_name,
    'surname',   v_row.surname,
    'phone',     v_row.phone,
    'email',     v_row.email,
    'role',      v_row.role,
    'passwordChanged', coalesce(p_change_password, false));
end;
$$;

grant execute on function public.update_my_staff_details(text, text, text, boolean, text, text)
  to authenticated;

drop function if exists public.update_my_staff_profile(text, text, text);
