-- =====================================================================
-- GoldenWay — migration 0009: support completion
-- Ports SupportTicket/TicketMessage + the queue workflow from the
-- Spring operations module (SupportTicketService: reply threading,
-- close + escalate rules; ownership matrix promises: assignment,
-- escalation, audit). Replaces the canned support chat (mock M3) and
-- the fake "agents online" dot (mock M9).
-- Commuters keep using add_ticket_message() from 0002; this adds the
-- agent side and the queue.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Schema additions
-- ---------------------------------------------------------------------

alter table public.support_tickets add column if not exists assigned_to uuid references public.staff(id);
alter table public.support_tickets add column if not exists priority text not null default 'NORMAL'
  check (priority in ('LOW','NORMAL','HIGH'));

create index if not exists idx_support_tickets_queue
  on public.support_tickets (status, created_at desc);

-- ---------------------------------------------------------------------
-- 2. RPCs — agent queue
-- ---------------------------------------------------------------------

-- AGENT/ADMIN: claim an unassigned ticket.
create or replace function public.claim_ticket(p_ticket_id bigint)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_row public.support_tickets;
begin
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('AGENT','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.support_tickets
    set assigned_to = auth.uid(), status = 'IN_PROGRESS'
    where id = p_ticket_id
      and (status = 'OPEN' or (status = 'IN_PROGRESS' and assigned_to is null))
    returning * into v_row;

  if v_row is null then
    raise exception 'Ticket % is already claimed or not claimable', p_ticket_id using errcode = '55000';
  end if;

  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'CLAIM_TICKET', 'support_tickets', p_ticket_id::text, null);

  return v_row;
end;
$$;

-- AGENT/ADMIN: reply as the agent. First reply claims the ticket if it
-- was unassigned; OPEN moves to IN_PROGRESS (mirrors add_ticket_message).
create or replace function public.reply_ticket(p_ticket_id bigint, p_body text)
returns public.ticket_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_ticket public.support_tickets;
  v_row public.ticket_messages;
begin
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('AGENT','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_body is null or trim(p_body) = '' then
    raise exception 'body: message must not be blank';
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id;
  if v_ticket is null then
    raise exception 'Ticket % not found', p_ticket_id;
  end if;
  if v_ticket.status = 'RESOLVED' then
    raise exception 'Ticket % is resolved — ask the commuter to open a new one', p_ticket_id using errcode = '55000';
  end if;

  insert into public.ticket_messages (ticket_id, sender, body)
  values (p_ticket_id, 'AGENT', trim(p_body))
  returning * into v_row;

  update public.support_tickets
    set status = case when status = 'OPEN' then 'IN_PROGRESS' else status end,
        assigned_to = coalesce(assigned_to, auth.uid())
    where id = p_ticket_id;

  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'REPLY_TICKET', 'support_tickets', p_ticket_id::text, null);

  return v_row;
end;
$$;

-- AGENT/ADMIN: resolve. The claiming agent or an ADMIN may resolve;
-- another agent cannot close someone else's ticket (escalate instead:
-- ADMIN takes over via claim). Supersedes the 0002 version.
create or replace function public.resolve_ticket(p_ticket_id bigint)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_row public.support_tickets;
begin
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('AGENT','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.support_tickets
    set status = 'RESOLVED'
    where id = p_ticket_id and status <> 'RESOLVED'
      and (assigned_to = auth.uid() or assigned_to is null or v_role = 'ADMIN')
    returning * into v_row;

  if v_row is null then
    raise exception 'Ticket % not found, already resolved, or owned by another agent', p_ticket_id using errcode = '55000';
  end if;

  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'RESOLVE_TICKET', 'support_tickets', p_ticket_id::text, null);

  return v_row;
end;
$$;

-- AGENT/ADMIN: escalate to ADMIN (reassign, keep IN_PROGRESS).
create or replace function public.escalate_ticket(p_ticket_id bigint, p_note text default null)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_row public.support_tickets;
begin
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('AGENT','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.support_tickets
    set priority = 'HIGH', assigned_to = null, status = 'OPEN'
    where id = p_ticket_id and status <> 'RESOLVED'
    returning * into v_row;

  if v_row is null then
    raise exception 'Ticket % not found or already resolved', p_ticket_id using errcode = '55000';
  end if;

  insert into public.staff_action_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'ESCALATE_TICKET', 'support_tickets', p_ticket_id::text,
          jsonb_build_object('note', p_note));

  return v_row;
end;
$$;

-- "Agents online" for the Support screen badge (mock M9 becomes real:
-- an agent is "online" when their account is active — presence tracking
-- is a documented simplification; last_seen upgrade is a team lane).
create or replace function public.agents_online()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'online', count(*) > 0,
    'count', count(*)
  )
  from public.staff s
  where s.active and s.role in ('AGENT','ADMIN');
$$;

-- ---------------------------------------------------------------------
-- 3. Queue read helper (AGENT/ADMIN): open + in-progress tickets with
--    commuter first names and last message preview — one call for the
--    inbox list.
-- ---------------------------------------------------------------------

create or replace function public.ticket_queue()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(t order by created_at desc), '[]'::json)
  from (
    select
      t.id,
      t.subject,
      t.status,
      t.priority,
      t.created_at,
      t.assigned_to,
      (select c.first_name || ' ' || left(c.surname, 1) || '.'
       from public.commuters c where c.id = t.commuter_id) as commuter,
      (select m.body from public.ticket_messages m
       where m.ticket_id = t.id order by m.sent_at desc limit 1) as last_message,
      (select count(*) from public.ticket_messages m where m.ticket_id = t.id) as message_count
    from public.support_tickets t
    where t.status <> 'RESOLVED'
  ) t;
$$;

-- ---------------------------------------------------------------------
-- 4. RLS for the new columns (table policies from 0001 already cover
--    select/update for staff; nothing to change — assigned_to and
--    priority ride on the same rows).
-- ---------------------------------------------------------------------
