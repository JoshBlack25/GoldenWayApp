-- =====================================================================
-- GoldenWay — EMERGENCY ADMIN RECOVERY (run in Supabase SQL Editor)
-- =====================================================================
-- Paste into Dashboard → SQL Editor and run as-is. Fully idempotent.
--
--  Part 0: prints the LIVE definition of my_profile_type() (read-only
--          diagnostic — check prosrc matches Part A's body below).
--  Part A: re-deploys the CORRECT my_profile_type(). The deployed
--          version used `if v_staff is not null`, which is WRONG for a
--          row variable: it is only true when EVERY column is non-null,
--          so any staff row with phone IS NULL (legacy rows since 0013)
--          tested false → UNPROFILED for everyone. Fixed to `if found`.
--  Part B: creates/repairs the emergency ADMIN (auth user + active
--          ADMIN staff row) with a password YOU choose.
--
-- Logins after running:
--   superadmin@goldenway.demo / SuperAdmin!2026   (new, below)
--   admin@goldenway.demo     / GoldenWay!2026     (original, also fixed)
--
-- ⚠ After you are back in, delete this file and rotate the password.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PART 0 — what is deployed right now? (diagnostic, read-only)
-- ---------------------------------------------------------------------

select n.nspname as schema,
       p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer,
       p.prosrc as live_body
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'my_profile_type';

-- ---------------------------------------------------------------------
-- PART A — fix the login-routing function (`if found`, not `is not null`)
-- ---------------------------------------------------------------------

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
  -- NB: `v_staff is not null` is WRONG for row variables — only true
  -- when EVERY field is non-null, so a NULL phone (0013) made every
  -- staff row test false → UNPROFILED for everyone. Use `found`.
  if found then
    return json_build_object(
      'userType', 'STAFF', 'role', v_staff.role, 'active', v_staff.active,
      'firstName', v_staff.first_name, 'surname', v_staff.surname,
      'email', v_staff.email);
  end if;
  if exists (select 1 from public.commuters where commuters.id = auth.uid()) then
    return json_build_object('userType', 'COMMUTER');
  end if;
  return json_build_object('userType', 'UNPROFILED');
end;
$$;

grant execute on function public.my_profile_type() to anon, authenticated;

-- Warn about shadowing copies of my_profile_type in other schemas.
do $$
declare r record;
begin
  for r in
    select p.oid, n.nspname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'my_profile_type' and n.nspname <> 'public'
  loop
    raise notice 'note: my_profile_type also exists in schema % (run: drop function %.my_profile_type(); if unwanted)', r.nspname, r.nspname;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- PART B — emergency admin: auth user + active ADMIN staff row
--   · Change the two literals below before running if you want
--     different credentials.
--   · No unique index on auth.users.email, so we select-then-insert.
-- ---------------------------------------------------------------------

-- pgcrypto for crypt()/gen_salt() (idempotent)
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_email    text := 'superadmin@goldenway.demo';   -- ← change if you want
  v_password text := 'SuperAdmin!2026';             -- ← change me!
  v_uid      uuid;
begin
  v_email := lower(v_email);

  -- 1. Does the auth user already exist?
  select id into v_uid
    from auth.users
    where email = v_email
    limit 1;

  if v_uid is not null then
    -- 1a. Existing user: reset its password + confirm email.
    update auth.users
      set encrypted_password = crypt(v_password, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at         = now()
      where id = v_uid;
    raise notice 'existing auth user updated: % (uid %)', v_email, v_uid;
  else
    -- 1b. New user: create with email confirmed (no invite email).
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at, raw_app_meta_data,
      raw_user_meta_data, created_at, updated_at, confirmation_token,
      recovery_token, email_change_token_new, email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated', 'authenticated', v_email,
      crypt(v_password, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"first_name":"Super","surname":"Admin","role":"ADMIN"}',
      now(), now(), '', '', '', ''
    )
    returning id into v_uid;
    raise notice 'auth user created: % (uid %)', v_email, v_uid;
  end if;

  -- 2. Make sure the staff row exists AND is active.
  insert into public.staff (id, first_name, surname, email, role, active)
  values (v_uid, 'Super', 'Admin', v_email, 'ADMIN', true)
  on conflict (id) do update
    set role     = 'ADMIN',
        active   = true,
        email    = v_email;

  -- 3. Audit the recovery action.
  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (v_uid, 'ADMIN_RECOVERY', 'staff', v_uid::text,
          jsonb_build_object('email', v_email, 'role', 'ADMIN'));

  raise notice 'admin ready: % (uid %)', v_email, v_uid;
end $$;
