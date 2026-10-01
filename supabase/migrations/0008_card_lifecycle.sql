-- =====================================================================
-- GoldenWay — migration 0008: card lifecycle & kiosk
-- Ports the Spring GoldCard lifecycle forward (BR-01 R40 card, BR-09
-- fare table is the price authority, BR-10 registration protects the
-- balance) and answers QuesAndSuggest point 1: TWO signup types —
--   · new commuter without a card (existing get_or_create_my_card)
--   · commuter who ALREADY HAS a kiosk-bought card: they enter the
--     GW-XXXX-XXXX number, the app shows the live journeys exactly as
--     their last kiosk receipt recorded them (same loaded_products rows),
--     and linking registers the card to their account.
-- Clerk kiosk operations (issue card, cash sale, replace lost card)
-- mirror the real GABS kiosk/vendor agent role. All staff mutations are
-- audited in staff_action_log (0005).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CASH gateway (kiosk sales recorded alongside SIMULATED online ones)
-- ---------------------------------------------------------------------

alter table public.payment_attempts drop constraint if exists payment_attempts_gateway_check;
alter table public.payment_attempts add constraint payment_attempts_gateway_check
  check (gateway in ('SIMULATED','PAYFAST','PEACH','CASH'));

-- Kiosk issues cards against the buyer's ID (real GABS registration
-- practice). Set when a clerk issues a card; verified at signup-link.
alter table public.gold_cards add column if not exists issued_for_id text;
alter table public.gold_cards add column if not exists issued_by uuid references public.staff(id);
alter table public.gold_cards add column if not exists issued_at timestamptz;

-- ---------------------------------------------------------------------
-- 2. RPCs — commuter (Q1: signup with an existing card)
-- ---------------------------------------------------------------------

-- Pre-check on the register flow: "I already have a card" → show the
-- live journeys so the commuter can confirm this is THEIR card (exactly
-- what their last kiosk receipt shows — same loaded_products rows).
create or replace function public.lookup_card_at_signup(p_card_number text, p_id_number text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.gold_cards;
  v_result json;
begin
  if p_card_number is null or p_card_number !~ '^GW-\d{4}-\d{4}$' then
    raise exception 'cardNumber: use the GW-XXXX-XXXX number printed on the card';
  end if;
  if p_id_number is null or p_id_number !~ '^\d{13}$' then
    raise exception 'idNumber: enter the 13-digit SA ID the card was registered with';
  end if;

  select * into v_card from public.gold_cards where card_number = p_card_number;
  -- Generic failure: never reveal whether the number or the ID was wrong.
  if v_card is null
     or v_card.owner_id is not null
     or v_card.issued_for_id is null
     or v_card.issued_for_id <> p_id_number then
    raise exception 'cardNumber: no unregistered card matches this card number and ID';
  end if;

  select json_build_object(
    'cardNumber', v_card.card_number,
    'status', v_card.status,
    'journeysRemaining', public.journeys_remaining(v_card.card_number),
    'loadedProducts', coalesce((
      select json_agg(json_build_object(
        'productCode', lp.product_code, 'routeCode', lp.route_code,
        'journeysTotal', lp.journeys_total, 'journeysUsed', lp.journeys_used,
        'validTo', lp.valid_to
      ) order by lp.valid_to)
      from public.loaded_products lp
      where lp.card_number = v_card.card_number
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

-- Link the verified kiosk card to the signing-up / signed-in commuter.
create or replace function public.link_existing_card(p_card_number text, p_id_number text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.gold_cards;
  v_result json;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if p_card_number is null or p_card_number !~ '^GW-\d{4}-\d{4}$' then
    raise exception 'cardNumber: use the GW-XXXX-XXXX number printed on the card';
  end if;

  select * into v_card from public.gold_cards where card_number = p_card_number;
  if v_card is null
     or v_card.owner_id is not null
     or v_card.issued_for_id is null
     or v_card.issued_for_id <> p_id_number then
    raise exception 'cardNumber: no unregistered card matches this card number and ID';
  end if;
  if exists (select 1 from public.gold_cards where owner_id = auth.uid()) then
    raise exception 'cardNumber: your account already has a Gold Card linked';
  end if;

  update public.gold_cards
    set owner_id = auth.uid(), registered_at = now(), status = 'ACTIVE'
    where card_number = p_card_number;

  select json_build_object(
    'cardNumber', c.card_number, 'status', c.status, 'registeredAt', c.registered_at,
    'loadedProducts', coalesce((
      select json_agg(json_build_object(
        'id', lp.id, 'productCode', lp.product_code, 'routeCode', lp.route_code,
        'journeysTotal', lp.journeys_total, 'journeysUsed', lp.journeys_used,
        'transfersAllowed', lp.transfers_allowed, 'validFrom', lp.valid_from, 'validTo', lp.valid_to
      ) order by lp.valid_to)
      from public.loaded_products lp where lp.card_number = c.card_number
    ), '[]'::json)
  ) into v_result
  from public.gold_cards c where c.card_number = p_card_number;

  return v_result;
end;
$$;

-- Commuter orders a Gold Card in-app (BR-01: R40 once-off). The card is
-- created registered+ACTIVE (bought with their account, so balance
-- protection applies immediately) and the R40 is recorded as a SIMULATED
-- payment with its own receipt reference.
create or replace function public.order_gold_card()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_number text;
  v_order_id bigint;
  v_receipt text;
  v_result json;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if exists (select 1 from public.gold_cards where owner_id = auth.uid()) then
    raise exception 'card: your account already has a Gold Card';
  end if;

  v_new_number := public.generate_card_number();
  insert into public.gold_cards (card_number, status, owner_id, registered_at)
  values (v_new_number, 'ACTIVE', auth.uid(), now());

  -- R40 card fee as a recorded order + gateway attempt (audit trail).
  insert into public.top_up_orders (card_number, product_code, route_code, amount_cents, status, receipt_reference, paid_at)
  values (v_new_number, 'GOLD-CARD-FEE', null, 4000, 'PAID', public.generate_receipt_reference(), now())
  returning id, receipt_reference into v_order_id, v_receipt;

  insert into public.payment_attempts (order_id, gateway, status, gateway_ref)
  values (v_order_id, 'SIMULATED', 'APPROVED', v_receipt);

  perform public.notify(auth.uid(), 'CARD',
    'Gold Card ' || v_new_number || ' is ready',
    'Your R40 card fee is paid. Load a product to start riding.',
    '/card');

  select json_build_object(
    'cardNumber', c.card_number, 'status', c.status, 'registeredAt', c.registered_at,
    'cardFeeReceipt', v_receipt,
    'loadedProducts', '[]'::json
  ) into v_result
  from public.gold_cards c where c.card_number = v_new_number;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. RPCs — clerk kiosk (CLERK/ADMIN)
-- ---------------------------------------------------------------------

-- Kiosk: issue a brand-new card against a commuter's ID. The card stays
-- UNREGISTERED until the commuter links it in-app (Q1 flow) — but the
-- kiosk can load products on it immediately (real GABS practice:
-- unregistered cards can be loaded and tapped).
create or replace function public.clerk_issue_card(p_id_number text, p_route_code text default null, p_product_code text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_new_number text;
  v_order_id bigint;
  v_receipt text;
  v_result json;
begin
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('CLERK','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_id_number is null or p_id_number !~ '^\d{13}$' then
    raise exception 'idNumber: enter the commuter''s 13-digit SA ID';
  end if;

  v_new_number := public.generate_card_number();
  insert into public.gold_cards (card_number, status, issued_for_id, issued_by, issued_at)
  values (v_new_number, 'UNREGISTERED', p_id_number, auth.uid(), now());

  -- R40 card fee, recorded as a CASH sale.
  insert into public.top_up_orders (card_number, product_code, amount_cents, status, receipt_reference, paid_at)
  values (v_new_number, 'GOLD-CARD-FEE', 4000, 'PAID', public.generate_receipt_reference(), now())
  returning id, receipt_reference into v_order_id, v_receipt;
  insert into public.payment_attempts (order_id, gateway, status, gateway_ref)
  values (v_order_id, 'CASH', 'APPROVED', v_receipt);

  -- Optional: load a product in the same visit (BR-09 price authority).
  if p_product_code is not null and p_route_code is not null then
    perform public.record_cash_sale(v_new_number, p_product_code, p_route_code);
  end if;

  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'ISSUE_CARD', 'gold_cards', v_new_number,
          jsonb_build_object('issuedForIdLast4', right(p_id_number, 4)));

  select json_build_object('cardNumber', v_new_number, 'status', 'UNREGISTERED',
                           'cardFeeReceipt', v_receipt) into v_result;
  return v_result;
end;
$$;

-- Kiosk: record a cash product load on an existing card. The fare table
-- stays the single price authority (BR-09) — the entry must have a live
-- price for the route or the sale is rejected.
create or replace function public.record_cash_sale(p_card_number text, p_product_code text, p_route_code text)
returns public.top_up_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_card public.gold_cards;
  v_product public.fare_products;
  v_fare bigint;
  v_row public.top_up_orders;
begin
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('CLERK','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_card from public.gold_cards where card_number = p_card_number;
  if v_card is null then
    raise exception 'cardNumber: card % not found', p_card_number;
  end if;
  if v_card.status in ('LOST','EXPIRED') then
    raise exception 'Cannot load a product: card is %', v_card.status using errcode = '55000';
  end if;

  select * into v_product from public.fare_products where code = p_product_code and active;
  if v_product is null then
    raise exception 'productCode: unknown product %', p_product_code;
  end if;
  -- BR-03: excluded routes have no Go Easy fare rows, so the fare-table
  -- join below rejects them naturally — no separate eligibility check.

  select fte.price_cents into v_fare
    from public.fare_table_entries fte
    where fte.product_code = p_product_code
      and fte.route_code = p_route_code
      and fte.effective_from <= current_date
      and (fte.effective_to is null or fte.effective_to >= current_date)
    order by fte.effective_from desc limit 1;

  if v_fare is null then
    raise exception 'routeCode: product % is not currently sold on route %', p_product_code, p_route_code using errcode = '55000';
  end if;

  insert into public.top_up_orders (card_number, product_code, route_code, amount_cents, status, receipt_reference, paid_at)
  values (p_card_number, p_product_code, p_route_code, v_fare, 'PAID', public.generate_receipt_reference(), now())
  returning * into v_row;

  insert into public.payment_attempts (order_id, gateway, status, gateway_ref)
  values (v_row.id, 'CASH', 'APPROVED', v_row.receipt_reference);

  insert into public.loaded_products (
    card_number, product_code, route_code, journeys_total, journeys_used,
    transfers_allowed, valid_from, valid_to
  ) values (
    p_card_number, v_product.code, p_route_code,
    v_product.journeys, 0, v_product.transfers_allowed,
    current_date, current_date + v_product.valid_days
  );

  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'CASH_SALE', 'top_up_orders', v_row.id::text,
          jsonb_build_object('card', p_card_number, 'product', p_product_code, 'route', p_route_code, 'cents', v_fare));

  return v_row;
end;
$$;

-- Kiosk: replace a lost card. Old card → LOST, new card issued against
-- the owner's ID (BR-01: R40 once-off applies to the replacement too —
-- team decision pending, recorded in FINAL-DEV-PLAN §8 Q3).
create or replace function public.clerk_replace_lost_card(p_old_card_number text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_old public.gold_cards;
  v_owner_id uuid;
  v_owner_id_number text;
  v_new_number text;
  v_order_id bigint;
  v_receipt text;
  v_result json;
begin
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('CLERK','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_old from public.gold_cards where card_number = p_old_card_number;
  if v_old is null then
    raise exception 'cardNumber: card % not found', p_old_card_number;
  end if;
  if v_old.status = 'LOST' then
    raise exception 'cardNumber: card % is already marked LOST', p_old_card_number using errcode = '55000';
  end if;

  v_owner_id := v_old.owner_id;
  if v_owner_id is not null then
    select id_number into v_owner_id_number from public.commuters where id = v_owner_id;
  end if;

  update public.gold_cards set status = 'LOST' where card_number = p_old_card_number;

  v_new_number := public.generate_card_number();
  insert into public.gold_cards (card_number, status, owner_id, registered_at, issued_for_id, issued_by, issued_at)
  values (v_new_number,
          case when v_owner_id is not null then 'ACTIVE' else 'UNREGISTERED' end,
          v_owner_id,
          case when v_owner_id is not null then now() end,
          v_owner_id_number, auth.uid(), now());

  -- R40 replacement fee as a CASH sale.
  insert into public.top_up_orders (card_number, product_code, amount_cents, status, receipt_reference, paid_at)
  values (v_new_number, 'GOLD-CARD-FEE', 4000, 'PAID', public.generate_receipt_reference(), now())
  returning id, receipt_reference into v_order_id, v_receipt;
  insert into public.payment_attempts (order_id, gateway, status, gateway_ref)
  values (v_order_id, 'CASH', 'APPROVED', v_receipt);

  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'REPLACE_LOST_CARD', 'gold_cards', v_new_number,
          jsonb_build_object('oldCard', p_old_card_number));

  if v_owner_id is not null then
    perform public.notify(v_owner_id, 'CARD',
      'Card ' || p_old_card_number || ' replaced',
      'Your replacement card is ' || v_new_number || '. Previous journeys do not carry over.',
      '/card');
  end if;

  select json_build_object('newCardNumber', v_new_number, 'oldCardNumber', p_old_card_number,
                           'replacementFeeReceipt', v_receipt) into v_result;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------

-- lookup/record functions run as security definer; direct table access
-- is unchanged. Commuters need no new table grants here.
