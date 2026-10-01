-- =====================================================================
-- GoldenWay — migration 0016: per-user payment wallet
-- The Load Trips purchase flow already writes real TopUpOrders and
-- payment_attempts against the DB; the only simulated piece was the
-- demo wallet hardcoded in LoadtripsScreen state. This gives every
-- commuter a persistent, per-user wallet of saved payment methods.
--
-- ---------------------------------------------------------------------
-- PCI stance (demo gateway): we deliberately store ONLY brand + last4
-- digits. Full PANs and CVVs are never persisted — validation happens
-- client-side (Luhn) and the card is tokenized into (brand, last4,
-- expiry) at save time. Even in a simulated-gateway project the
-- storage rule matches real integrations.
-- ---------------------------------------------------------------------

-- The client never sends user_id (RLS scopes every read/write to the
-- caller), so the row is stamped server-side from the JWT. Without this
-- default, inserts fail the with-check RLS validation with 42501.
alter table public.payment_methods alter column user_id set default auth.uid();
-- =====================================================================

create table if not exists public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  brand       text not null check (brand in ('VISA','MASTERCARD','GENERIC')),
  last4       text not null check (last4 ~ '^[0-9]{4}$'),
  exp_month   int  not null check (exp_month between 1 and 12),
  exp_year    int  not null check (exp_year >= 2024),
  holder_name text not null default '',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint payment_methods_last4_shape check (char_length(last4) = 4)
);

create index if not exists idx_payment_methods_user
  on public.payment_methods (user_id);

alter table public.payment_methods enable row level security;

drop policy if exists payment_methods_own_select on public.payment_methods;
drop policy if exists payment_methods_own_write on public.payment_methods;
create policy payment_methods_own_select on public.payment_methods
  for select using (auth.uid() = user_id);
create policy payment_methods_own_write on public.payment_methods
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.payment_methods to authenticated;

-- ---------------------------------------------------------------------
-- pay_topup_order — record which saved method paid the order so the
-- receipt can show "VISA ••4242". The method must belong to the payer.
-- ---------------------------------------------------------------------

create or replace function public.pay_topup_order(
  p_order_id bigint,
  p_payment_method_id uuid default null
)
returns public.top_up_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.top_up_orders;
  v_owner uuid;
  v_card_status text;
  v_fare bigint;
  v_product public.fare_products;
  v_method public.payment_methods;
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

  -- Payment method (optional but validated when given): must belong to
  -- the payer. Receipts show brand + last4 only.
  if p_payment_method_id is not null then
    select * into v_method from public.payment_methods
      where id = p_payment_method_id and user_id = auth.uid();
    if v_method is null then
      raise exception 'Payment method not found for this user' using errcode = '42501';
    end if;
  end if;

  -- BR-09 (price authority): the product must have a live fare-table
  -- price for this route, and the amount must match it exactly.
  if v_order.route_code is null then
    raise exception 'Order % has no route — cannot price it', p_order_id using errcode = '55000';
  end if;

  select fte.price_cents into v_fare
    from public.fare_table_entries fte
    where fte.product_code = v_order.product_code
      and fte.route_code = v_order.route_code
      and fte.effective_from <= current_date
      and (fte.effective_to is null or fte.effective_to >= current_date)
    order by fte.effective_from desc limit 1;

  if v_fare is null then
    update public.top_up_orders set status = 'FAILED' where id = p_order_id;
    insert into public.payment_attempts (order_id, gateway, status)
      values (p_order_id, 'SIMULATED', 'DECLINED');
    raise exception 'Product % is not currently sold on route % — please choose a plan from the catalogue',
      v_order.product_code, v_order.route_code using errcode = '55000';
  end if;

  if v_order.amount_cents <> v_fare then
    update public.top_up_orders set status = 'FAILED' where id = p_order_id;
    insert into public.payment_attempts (order_id, gateway, status)
      values (p_order_id, 'SIMULATED', 'DECLINED');
    raise exception 'Price changed — the fare table says % for this plan. Reload and try again.',
      to_char(v_fare / 100.0, 'FM999999990.00') using errcode = '55000';
  end if;

  if v_card_status in ('LOST','EXPIRED') then
    raise exception 'Cannot load a product: card is %', v_card_status using errcode = '55000';
  end if;

  update public.top_up_orders
    set status = 'PAID', paid_at = now(), receipt_reference = public.generate_receipt_reference()
    where id = p_order_id
    returning * into v_order;

  insert into public.payment_attempts (order_id, gateway, status, gateway_ref)
    values (
      p_order_id, 'SIMULATED', 'APPROVED',
      coalesce(
        v_order.receipt_reference || ' · ' || v_method.brand || ' ••' || v_method.last4,
        v_order.receipt_reference
      )
    );

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
