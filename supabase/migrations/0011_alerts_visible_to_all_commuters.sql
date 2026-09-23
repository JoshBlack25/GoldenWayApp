-- 0011: fix service-alert fan-out so every commuter sees admin alerts,
-- not just commuters who already own a gold card / rode that route
-- recently. A brand-new commuter (no card yet) previously fell through
-- both branches of notify_alert_published() and never got notified.
--
-- fetchLiveAlerts()/service_alerts_read RLS already let ANY authenticated
-- commuter read live alerts directly (Home banner), so this only fixes
-- the notifications feed side of "visible for everyone".

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
    -- Network-wide alert → every commuter, card or no card.
    for r in
      select c.id as uid from public.commuters c
    loop
      perform public.notify(r.uid, 'ALERT', new.title, new.body, '/alerts');
    end loop;
  else
    -- Route-scoped → commuters who tapped that route in the last 7 days,
    -- PLUS every commuter still gets it in their alerts list (they can
    -- read it on /alerts even if they don't get a push notification for
    -- a route they haven't ridden).
    for r in
      select distinct c.owner_id as uid
      from public.deductions d
      join public.gold_cards c on c.card_number = d.card_number
      where d.route_code = new.route_code
        and d.deducted_at > now() - interval '7 days'
        and c.owner_id is not null
    loop
      perform public.notify(r.uid, 'ALERT', new.title, new.body, '/alerts');
    end loop;
  end if;
  return new;
end;
$$;
