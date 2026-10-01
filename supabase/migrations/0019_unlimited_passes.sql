-- =====================================================================
-- GoldenWay — migration 0019: weekly/monthly passes can be tapped
--
-- Weekly/monthly products load with journeys_total = 0. tap_journey only
-- selected products where journeys_used < journeys_total (0 < 0), so a
-- pass could be bought but never used. A live pass now covers taps on
-- its own route for its whole validity window and consumes no journey.
-- Passes are checked BEFORE the free-transfer rule so a covered ride
-- doesn't burn a transfer.
--
-- Also fixes two latent bugs in the old body:
--  · `v_last is not null` on a row variable is false whenever ANY column
--    is null (same bug class as 0013a) → uses FOUND instead.
--  · the ownership guard evaluated to NULL for unowned cards, which
--    `if` treats as false, so the guard was skipped → coalesce().
--
-- NOT changed yet: Go Easy journeys are still not matched to the tapped
-- route (pending review of the tap screen).
-- =====================================================================

create or replace function public.tap_journey(
  p_card_number text,
  p_route_code text,
  p_bus_id text default null,
  p_validator_id text default null
)
returns public.deductions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.gold_cards;
  v_last public.deductions;
  v_has_last boolean;
  v_last_transfers_allowed int;
  v_product public.loaded_products;
  v_pass public.loaded_products;
  v_deduction public.deductions;
  v_now timestamptz := now();
begin
  select * into v_card from public.gold_cards where card_number = p_card_number;
  if not found then
    raise exception 'Card % not found', p_card_number;
  end if;
  if not (coalesce(v_card.owner_id = auth.uid(), false) or public.is_staff('ADMIN','INSPECTOR')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_card.status in ('LOST','EXPIRED') then
    raise exception 'Cannot validate a journey: card % is %', p_card_number, v_card.status using errcode = '55000';
  end if;

  -- 1. Live weekly/monthly pass for THIS route: covers the ride, no journey consumed.
  select * into v_pass
    from public.loaded_products
    where card_number = p_card_number
      and journeys_total = 0
      and route_code = p_route_code
      and current_date between valid_from and valid_to
    order by valid_to desc
    limit 1;

  if found then
    insert into public.deductions (card_number, loaded_product_id, route_code, bus_id, validator_id, was_transfer, deducted_at)
    values (p_card_number, v_pass.id, p_route_code, p_bus_id, p_validator_id, false, v_now)
    returning * into v_deduction;
    return v_deduction;
  end if;

  -- 2. BR-04 free transfer.
  select * into v_last from public.deductions
    where card_number = p_card_number
    order by deducted_at desc limit 1;
  v_has_last := found;

  if v_has_last then
    select transfers_allowed into v_last_transfers_allowed
      from public.loaded_products where id = v_last.loaded_product_id;
  end if;

  if v_has_last
     and v_last.was_transfer = false
     and v_now >= v_last.deducted_at
     and (v_now - v_last.deducted_at) <= interval '60 minutes'
     and v_last.route_code <> p_route_code
     and coalesce(v_last_transfers_allowed, 0) > 0
  then
    insert into public.deductions (card_number, loaded_product_id, route_code, bus_id, validator_id, was_transfer, deducted_at)
    values (p_card_number, v_last.loaded_product_id, p_route_code, p_bus_id, p_validator_id, true, v_now)
    returning * into v_deduction;
    return v_deduction;
  end if;

  -- 3. Go Easy: oldest-expiring product that still has balance.
  select * into v_product
    from public.loaded_products
    where card_number = p_card_number
      and journeys_used < journeys_total
      and current_date between valid_from and valid_to
    order by valid_to asc
    limit 1;

  if not found then
    raise exception 'No journey balance available on card %', p_card_number using errcode = '55000';
  end if;

  update public.loaded_products set journeys_used = journeys_used + 1 where id = v_product.id;

  insert into public.deductions (card_number, loaded_product_id, route_code, bus_id, validator_id, was_transfer, deducted_at)
  values (p_card_number, v_product.id, p_route_code, p_bus_id, p_validator_id, false, v_now)
  returning * into v_deduction;

  return v_deduction;
end;
$$;