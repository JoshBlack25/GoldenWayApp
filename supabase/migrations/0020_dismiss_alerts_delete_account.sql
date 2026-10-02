-- Per-user alert dismissals (hides the Home banner only; the
-- notification feed is untouched). A re-published alert is a new row
-- with a new id, so it shows again.
create table if not exists public.alert_dismissals (
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  alert_id     bigint not null references public.service_alerts(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, alert_id)
);

alter table public.alert_dismissals enable row level security;

drop policy if exists alert_dismissals_own on public.alert_dismissals;
create policy alert_dismissals_own on public.alert_dismissals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, delete on public.alert_dismissals to authenticated;

-- Commuter self-service account deletion.
create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public
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

  -- Release the cards instead of deleting them. Orders and receipts
  -- hang off the card number and stay as anonymised financial records.
  -- Nulling issued_for_id removes the ID number, so the card can never
  -- be re-linked through the signup flow.
  update public.gold_cards
     set owner_id = null, status = 'EXPIRED', issued_for_id = null
   where owner_id = v_uid;

  -- Tickets have a NOT NULL FK to commuters and contain personal text.
  -- Messages cascade.
  delete from public.support_tickets where commuter_id = v_uid;

  -- Cascades: commuters row, payment_methods, notifications, alert_dismissals.
  delete from auth.users where id = v_uid;
  return true;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;