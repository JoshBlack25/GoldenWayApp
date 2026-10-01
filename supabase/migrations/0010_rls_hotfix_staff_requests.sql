-- =====================================================================
-- GoldenWay — migration 0010: RLS hotfix for staff_access_requests
--
-- Problem: the staff_requests_read policy compared the row's email with
-- a subquery on auth.users. Policy subqueries run with the *invoker's*
-- privileges, and anon/authenticated have no SELECT grant on auth.users
-- — so even a simple "is my request approved?" SELECT failed with 42501
-- (the "GRANT SELECT ON auth.users TO anon" hint).
--
-- Fix: resolve the caller's email inside a SECURITY DEFINER helper and
-- rewrite the policy to use it.
-- =====================================================================

-- Caller's email, resolved with owner privileges.
create or replace function public.my_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email from auth.users u where u.id = auth.uid();
$$;

grant execute on function public.my_email() to anon, authenticated;

drop policy if exists staff_requests_read on public.staff_access_requests;
create policy staff_requests_read on public.staff_access_requests
  for select using (
    public.is_staff('ADMIN')
    or (
      auth.uid() is not null
      and lower(email) = lower(coalesce(public.my_email(), ''))
    )
  );
