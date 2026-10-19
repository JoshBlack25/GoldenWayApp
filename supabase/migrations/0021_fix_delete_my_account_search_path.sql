-- Harden the SECURITY DEFINER function by including the auth schema
-- explicitly in search_path, so any future unqualified auth.* reference
-- inside the function body resolves correctly.
create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if exists (select 1 from public.staff where id = v_uid) then
    raise exception 'Staff accounts cannot be deleted here — use deactivate instead.' using errcode = '55000';
  end if;
  if not exists (select 1 from public.commuters where id = v_uid) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.gold_cards
     set owner_id = null, status = 'EXPIRED', issued_for_id = null
   where owner_id = v_uid;

  delete from public.support_tickets where commuter_id = v_uid;

  -- Cascades: commuters row, payment_methods, notifications, alert_dismissals.
  delete from auth.users where id = v_uid;
  return true;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;
