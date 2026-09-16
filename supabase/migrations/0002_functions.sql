-- =====================================================================
-- GoldenWay — business-logic RPCs
-- Ports GoldCard aggregate, GoldCardService, TopUpOrder, FareService and
-- CommuterFactory validation from the Spring Boot codebase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- SA ID Luhn checksum (util.Helper#isValidLuhn13).
create or replace function public.sa_id_luhn_valid(p_id text)
returns boolean
language plpgsql
immutable
as $$
declare
  sum int := 0;
  digit int;
  i int;
begin
  if p_id is null or p_id !~ '^\d{13}$' then
    return false;
  end if;
  for i in 0..12 loop
    digit := substr(p_id, i + 1, 1)::int;
    if i % 2 = 1 then
      digit := digit * 2;
      if digit > 9 then digit := digit - 9; end if;
    end if;
    sum := sum + digit;
  end loop;
  return sum % 10 = 0;
end;
$$;

-- GW-XXXX-XXXX card number generator (GoldCardFactory).
create or replace function public.generate_card_number()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'GW-' || lpad(floor(random() * 10000)::text, 4, '0')
              || '-' || lpad(floor(random() * 10000)::text, 4, '0');
    exit when not exists (select 1 from public.gold_cards where card_number = candidate);
  end loop;
  return candidate;
end;
$$;

-- GW-XXXX-AB9 style receipt reference (TopUpOrder#generateReceiptReference).
create or replace function public.generate_receipt_reference()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'GW-' || lpad(floor(random() * 10000)::text, 4, '0')
              || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 3));
    exit when not exists (select 1 from public.top_up_orders where receipt_reference = candidate);
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------------------
-- IDENTITY: register_commuter
-- Called right after supabase.auth.signUp() to create the profile row
-- with the same validation CommuterFactory used to run server-side.
-- ---------------------------------------------------------------------

create or replace function public.register_commuter(
  p_first_name text,
  p_surname text,
  p_phone text,
  p_gender text,
  p_date_of_birth date,
  p_id_number text,
  p_concession_type text
)
returns public.commuters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_row public.commuters;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  if p_first_name is null or trim(p_first_name) = '' then
    raise exception 'firstName: must not be blank';
  end if;
  if p_surname is null or trim(p_surname) = '' then
    raise exception 'surname: must not be blank';
  end if;
  if p_phone !~ '^(\+27|0)\d{9}$' then
    raise exception 'phone: must be a SA mobile number (+27xxxxxxxxx or 0xxxxxxxxx)';
  end if;
  if p_gender not in ('MALE','FEMALE','OTHER') then
    raise exception 'gender: must be MALE, FEMALE or OTHER';
  end if;
  if p_date_of_birth is null or p_date_of_birth > (current_date - interval '5 years')::date then
    raise exception 'dateOfBirth: must be a valid date of birth (age 5 or older)';
  end if;
  if not public.sa_id_luhn_valid(p_id_number) then
    raise exception 'idNumber: this ID number fails the checksum — please check it';
  end if;
  if p_concession_type not in ('NONE','STUDENT','PENSIONER') then
    raise exception 'concessionType: must be NONE, STUDENT or PENSIONER';
  end if;
  if exists (select 1 from public.commuters where id_number = p_id_number) then
    raise exception 'idNumber: an account already exists with this ID number' using errcode = '23505';
  end if;

  insert into public.commuters (
    id, first_name, surname, email, phone, gender, date_of_birth, id_number, concession_type
  ) values (
    auth.uid(), trim(p_first_name), trim(p_surname), v_email, p_phone,
    upper(p_gender), p_date_of_birth, p_id_number, upper(p_concession_type)
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- BR-06: verify a student/pensioner concession claim (CLERK/ADMIN only).
create or replace function public.verify_concession(p_commuter_id uuid)
returns public.commuters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.commuters;
begin
  if not public.is_staff('ADMIN','CLERK') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.commuters
    set concession_verified_at = now()
    where id = p_commuter_id
    returning * into v_row;
  if v_row is null then
    raise exception 'Commuter not found';
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- CARD & TICKET
-- ---------------------------------------------------------------------

-- Returns the caller's card (with loaded_products nested as JSON),
-- creating and registering one on first use — mirrors the frontend's
-- TripProvider "every commuter gets exactly one card" strategy, but done
-- atomically server-side instead of two round trips.
create or replace function public.get_or_create_my_card()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_number text;
  v_result json;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select card_number into v_card_number from public.gold_cards where owner_id = auth.uid() limit 1;

  if v_card_number is null then
    v_card_number := public.generate_card_number();
    insert into public.gold_cards (card_number, status, owner_id, registered_at)
    values (v_card_number, 'ACTIVE', auth.uid(), now());
  end if;

  select json_build_object(
    'cardNumber', c.card_number,
    'status', c.status,
    'registeredAt', c.registered_at,
    'createdAt', c.created_at,
    'loadedProducts', coalesce((
      select json_agg(json_build_object(
        'id', lp.id, 'productCode', lp.product_code, 'routeCode', lp.route_code,
        'journeysTotal', lp.journeys_total, 'journeysUsed', lp.journeys_used,
        'transfersAllowed', lp.transfers_allowed, 'validFrom', lp.valid_from, 'validTo', lp.valid_to
      ) order by lp.valid_to)
      from public.loaded_products lp where lp.card_number = c.card_number
    ), '[]'::json)
  )
  into v_result
  from public.gold_cards c
  where c.card_number = v_card_number;

  return v_result;
end;
$$;

-- Registers an existing UNREGISTERED card number to the caller (BR-10).
create or replace function public.register_card(p_card_number text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_result json;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select status into v_status from public.gold_cards where card_number = p_card_number;
  if v_status is null then
    raise exception 'Card % not found', p_card_number;
  end if;
  if v_status <> 'UNREGISTERED' then
    raise exception 'Card % is already registered', p_card_number using errcode = '55000';
  end if;

  update public.gold_cards
    set owner_id = auth.uid(), registered_at = now(), status = 'ACTIVE'
    where card_number = p_card_number;

  select json_build_object(
    'cardNumber', c.card_number, 'status', c.status, 'registeredAt', c.registered_at,
    'createdAt', c.created_at,
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

-- Journeys remaining across all currently-valid products (GoldCard#journeysRemaining).
create or replace function public.journeys_remaining(p_card_number text)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(lp.journeys_total - lp.journeys_used), 0)::int
  from public.loaded_products lp
  join public.gold_cards c on c.card_number = lp.card_number
  where lp.card_number = p_card_number
    and current_date between lp.valid_from and lp.valid_to
    and (c.owner_id = auth.uid() or public.is_staff('ADMIN','INSPECTOR','CLERK'));
$$;

-- BR-07 tap-on with BR-04 free-transfer logic (GoldCard#deductJourney).
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
  v_last_transfers_allowed int;
  v_product public.loaded_products;
  v_deduction public.deductions;
  v_now timestamptz := now();
begin
  select * into v_card from public.gold_cards where card_number = p_card_number;
  if v_card is null then
    raise exception 'Card % not found', p_card_number;
  end if;
  if not (v_card.owner_id = auth.uid() or public.is_staff('ADMIN','INSPECTOR')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_card.status in ('LOST','EXPIRED') then
    raise exception 'Cannot validate a journey: card % is %', p_card_number, v_card.status using errcode = '55000';
  end if;

  -- Most recent deduction on this card, for BR-04 transfer eligibility.
  select * into v_last from public.deductions
    where card_number = p_card_number
    order by deducted_at desc limit 1;

  if v_last is not null then
    select transfers_allowed into v_last_transfers_allowed
      from public.loaded_products where id = v_last.loaded_product_id;
  end if;

  if v_last is not null
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

  -- Oldest-expiring product that still has balance and covers today.
  select * into v_product
    from public.loaded_products
    where card_number = p_card_number
      and journeys_used < journeys_total
      and current_date between valid_from and valid_to
    order by valid_to asc
    limit 1;

  if v_product is null then
    raise exception 'No journey balance available on card %', p_card_number using errcode = '55000';
  end if;

  update public.loaded_products set journeys_used = journeys_used + 1 where id = v_product.id;

  insert into public.deductions (card_number, loaded_product_id, route_code, bus_id, validator_id, was_transfer, deducted_at)
  values (p_card_number, v_product.id, p_route_code, p_bus_id, p_validator_id, false, v_now)
  returning * into v_deduction;

  return v_deduction;
end;
$$;

-- BR-08 handheld verification (staff-only).
create or replace function public.verify_card(p_card_number text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  if not public.is_staff('ADMIN','INSPECTOR') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select json_build_object(
    'cardNumber', c.card_number,
    'status', c.status,
    'journeysRemaining', public.journeys_remaining(c.card_number),
    'registered', c.owner_id is not null,
    'ownerName', (select m.first_name || ' ' || m.surname from public.commuters m where m.id = c.owner_id)
  ) into v_result
  from public.gold_cards c where c.card_number = p_card_number;
  if v_result is null then
    raise exception 'Card % not found', p_card_number;
  end if;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- TOP-UP / PAYMENT (Load Trips)
-- ---------------------------------------------------------------------

create or replace function public.create_topup_order(
  p_card_number text,
  p_product_code text,
  p_route_code text,
  p_amount_cents bigint
)
returns public.top_up_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_row public.top_up_orders;
begin
  select owner_id into v_owner from public.gold_cards where card_number = p_card_number;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_amount_cents <= 0 then
    raise exception 'amountCents must be positive';
  end if;

  insert into public.top_up_orders (card_number, product_code, route_code, amount_cents, status)
  values (p_card_number, p_product_code, nullif(p_route_code, ''), p_amount_cents, 'PENDING_PAYMENT')
  returning * into v_row;

  return v_row;
end;
$$;

-- Simulated gateway (PaymentAttempt): approves any positive amount, then
-- loads the purchased product onto the card (GoldCard#loadProduct).
create or replace function public.pay_topup_order(p_order_id bigint)
returns public.top_up_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.top_up_orders;
  v_owner uuid;
  v_product public.fare_products;
  v_card_status text;
begin
  select * into v_order from public.top_up_orders where id = p_order_id;
  if v_order is null then
    raise exception 'Order % not found', p_order_id;
  end if;

  select owner_id, status into v_owner, v_card_status
    from public.gold_cards where card_number = v_order.card_number;

  if v_owner <> auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_order.status <> 'PENDING_PAYMENT' then
    raise exception 'Order % is %, cannot pay', p_order_id, v_order.status using errcode = '55000';
  end if;

  if v_order.amount_cents <= 0 then
    update public.top_up_orders set status = 'FAILED' where id = p_order_id;
    insert into public.payment_attempts (order_id, gateway, status) values (p_order_id, 'SIMULATED', 'DECLINED');
    select * into v_order from public.top_up_orders where id = p_order_id;
    return v_order;
  end if;

  if v_card_status in ('LOST','EXPIRED') then
    raise exception 'Cannot load a product: card is %', v_card_status using errcode = '55000';
  end if;

  update public.top_up_orders
    set status = 'PAID', paid_at = now(), receipt_reference = public.generate_receipt_reference()
    where id = p_order_id
    returning * into v_order;

  insert into public.payment_attempts (order_id, gateway, status, gateway_ref)
    values (p_order_id, 'SIMULATED', 'APPROVED', v_order.receipt_reference);

  select * into v_product from public.fare_products where code = v_order.product_code;
  if v_product is null then
    raise exception 'Unknown fare product %', v_order.product_code;
  end if;

  insert into public.loaded_products (
    card_number, product_code, route_code, journeys_total, journeys_used,
    transfers_allowed, valid_from, valid_to
  ) values (
    v_order.card_number, v_product.code, v_order.route_code,
    v_product.journeys, 0, v_product.transfers_allowed,
    current_date, current_date + v_product.valid_days
  );

  return v_order;
end;
$$;

-- ADMIN-only refund (AdminPaymentController). Journeys already loaded
-- stay on the card, matching kiosk practice.
create or replace function public.refund_topup_order(p_order_id bigint)
returns public.top_up_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.top_up_orders;
begin
  if not public.is_staff('ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.top_up_orders set status = 'REFUNDED'
    where id = p_order_id and status = 'PAID'
    returning * into v_row;
  if v_row is null then
    raise exception 'Order % is not PAID, cannot refund', p_order_id using errcode = '55000';
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- FARE QUOTES (Fare & Catalog presentation surface)
-- ---------------------------------------------------------------------

create or replace function public.fares_products_for_route(p_route_code text)
returns table (
  code text, family text, journeys int, valid_days int,
  transfers_allowed int, price_cents bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_go_easy_eligible boolean;
begin
  select go_easy_eligible into v_go_easy_eligible from public.routes where routes.code = p_route_code;
  if v_go_easy_eligible is null then
    raise exception 'Route not found: %', p_route_code;
  end if;

  return query
  select p.code, p.family, p.journeys, p.valid_days, p.transfers_allowed,
    coalesce((
      select fte.price_cents from public.fare_table_entries fte
      where fte.product_code = p.code and fte.route_code = p_route_code
        and fte.effective_from <= current_date
        and (fte.effective_to is null or fte.effective_to >= current_date)
      order by fte.effective_from desc limit 1
    ), 0)
  from public.fare_products p
  where p.active = true
    and not (p.family = 'GO_EASY' and not v_go_easy_eligible);
end;
$$;

create or replace function public.fares_quote(
  p_route_code text,
  p_product_code text,
  p_concession_type text default 'NONE'
)
returns table (
  route_code text, product_code text, price_cents bigint,
  cash_compare_cents bigint, savings_cents bigint, includes_transfer boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_go_easy_eligible boolean;
  v_family text;
  v_transfers_allowed int;
  v_price bigint;
  v_cash bigint;
begin
  select go_easy_eligible into v_go_easy_eligible from public.routes where routes.code = p_route_code;
  if v_go_easy_eligible is null then
    raise exception 'Route not found: %', p_route_code;
  end if;

  select family, transfers_allowed into v_family, v_transfers_allowed
    from public.fare_products where fare_products.code = p_product_code;
  if v_family is null then
    raise exception 'Product not found: %', p_product_code;
  end if;

  if v_family = 'GO_EASY' and not v_go_easy_eligible then
    raise exception 'Go Easy is not available on route %', p_route_code using errcode = '55000';
  end if;

  select fte.price_cents into v_price from public.fare_table_entries fte
    where fte.product_code = p_product_code and fte.route_code = p_route_code
      and fte.effective_from <= current_date
      and (fte.effective_to is null or fte.effective_to >= current_date)
    order by fte.effective_from desc limit 1;
  v_price := coalesce(v_price, 0);

  select fte.price_cents into v_cash from public.fare_table_entries fte
    where fte.product_code = 'CASH-PEAK' and fte.route_code = p_route_code
      and fte.effective_from <= current_date
      and (fte.effective_to is null or fte.effective_to >= current_date)
    order by fte.effective_from desc limit 1;
  v_cash := coalesce(v_cash, v_price);

  return query select
    p_route_code, p_product_code, v_price, v_cash,
    greatest(0, v_cash - v_price), (v_transfers_allowed > 0);
end;
$$;

-- ---------------------------------------------------------------------
-- SUPPORT
-- ---------------------------------------------------------------------

create or replace function public.add_ticket_message(
  p_ticket_id bigint, p_sender text, p_body text
)
returns public.ticket_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ticket_messages;
begin
  if p_sender not in ('COMMUTER','AGENT') then
    raise exception 'sender must be COMMUTER or AGENT';
  end if;
  if p_sender = 'AGENT' and not public.is_staff('ADMIN','CLERK','INSPECTOR') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.ticket_messages (ticket_id, sender, body)
    values (p_ticket_id, p_sender, p_body)
    returning * into v_row;

  if p_sender = 'AGENT' then
    update public.support_tickets set status = 'IN_PROGRESS'
      where id = p_ticket_id and status = 'OPEN';
  end if;

  return v_row;
end;
$$;

create or replace function public.resolve_ticket(p_ticket_id bigint)
returns public.support_tickets
language sql
security definer
set search_path = public
as $$
  update public.support_tickets set status = 'RESOLVED' where id = p_ticket_id
  returning *;
$$;

grant execute on all functions in schema public to authenticated, anon;
