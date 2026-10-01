-- =====================================================================
-- GoldenWay — migration 0016: inspector lane hardening
-- =====================================================================
--
-- READ ME FIRST — for anyone who doesn't normally read SQL
-- ---------------------------------------------------------------------
-- This file changes things INSIDE the Supabase/Postgres database. It is
-- NOT app code — nothing here is JavaScript or React. Every screen the
-- inspector uses in the browser (frontend/src/screens/staff/inspector/)
-- talks to the database by calling one of the two FUNCTIONS defined
-- below (lookup_card_for_inspection and log_inspection_outcome). See
-- frontend/src/api/operations.js for the exact JavaScript functions that
-- call them, with comments explaining that side of the link.
--
-- Three ideas you need to understand this file:
--
--   1. TABLE — "inspection_events" is where every inspection record is
--      permanently stored (who inspected, which card, what the outcome
--      was, when). It was created back in
--      supabase/migrations/0006_operations.sql (not this file) — search
--      that file for "create table if not exists public.inspection_events"
--      to see its exact columns.
--
--   2. FUNCTION (a.k.a. "RPC") — a named block of logic that lives
--      inside the database and the app calls by name. Below,
--      "log_inspection_outcome" is one such function: it checks the
--      caller is really an inspector, checks the card exists, then saves
--      a new row into inspection_events. Postgres runs it as a single
--      unit, so half-finished/partial saves can't happen.
--
--   3. RLS POLICY ("Row Level Security") — a separate, extra safety net
--      that the database checks on every single read/write to a table,
--      regardless of which function (if any) triggered it. Even if the
--      app somehow tried to insert into inspection_events WITHOUT going
--      through log_inspection_outcome() above (e.g. a malicious or
--      buggy client hitting the API directly), the policy below is what
--      actually blocks it. Function-level checks and RLS policies are
--      both needed — the function checks are the normal path, the RLS
--      policy is the backstop that can't be skipped.
--
-- WHY THIS MIGRATION EXISTS (the bug that was found and fixed here)
-- ---------------------------------------------------------------------
-- The RLS policy controlling who may INSERT into inspection_events used
-- to only check "is this row's inspector_id the same person who's
-- logged in?" — it never checked "...and are they actually an
-- INSPECTOR?" That meant ANY logged-in staff member (a driver, a clerk,
-- anyone) could send a request straight to the database claiming to be
-- an inspection result, without ever touching the Verify screen or the
-- log_inspection_outcome() function's safety checks at all.
--
-- This was tested for real on 2026-09-17: logging in as a DRIVER account
-- and sending a raw request to the database successfully created a fake
-- "VALID" inspection record for a card the driver had never scanned.
-- Since inspection_events is literally the fare-evasion audit trail
-- (an inspector's read-only proof that a card was checked), a version of
-- it that anyone could forge defeats its entire purpose.
--
-- The fix below adds the missing role check: only someone whose staff
-- record says role = 'INSPECTOR' (checking their own row) — or an ADMIN
-- — may insert a row now. The fake row created during testing was
-- deleted afterwards, and the fix was re-tested to confirm the same
-- attempt is now correctly blocked.
--
-- A second, smaller improvement was added at the same time: the
-- inspection note is now capped at 300 characters, matching the same
-- limit already used for driver-reported delay notes — there was no
-- good reason for a staff-facing note field to be unlimited in length.
-- =====================================================================

-- ---------------------------------------------------------------------
-- FIX 1 of 2 — the RLS policy on the inspection_events table.
--
-- "DROP POLICY IF EXISTS" removes the old, too-permissive rule (if it's
-- there); "CREATE POLICY" immediately puts the corrected one in its
-- place. Read the new rule as plain English:
--   "You may insert a row IF EITHER
--      (a) the inspector_id you're claiming is your own account AND
--          your staff record says your role is INSPECTOR,
--    OR (b) your staff record says your role is ADMIN (admins can log
--          inspections on anyone's behalf, e.g. for training/testing)."
-- ---------------------------------------------------------------------

drop policy if exists inspection_events_insert on public.inspection_events;
create policy inspection_events_insert on public.inspection_events
  for insert with check (
    (inspector_id = auth.uid() and public.is_staff('INSPECTOR'))
    or public.is_staff('ADMIN')
  );

-- ---------------------------------------------------------------------
-- FIX 2 of 2 — the log_inspection_outcome() function itself.
--
-- This is the function the "Log outcome" buttons on the Verify screen
-- call (see logInspectionOutcome() in frontend/src/api/operations.js).
-- "CREATE OR REPLACE FUNCTION" means: if a function with this exact name
-- already exists, swap its logic out for the version below — nothing
-- that calls log_inspection_outcome() from the app needs to change,
-- because the function's name and inputs stay the same, only what
-- happens inside it changes (here: the new 300-character note limit).
--
-- Walking through what it does, step by step, in plain English:
--   1. Look up the current logged-in user's role in the "staff" table.
--      If they don't have one, or it isn't INSPECTOR or ADMIN, refuse
--      the request immediately (this is the check that stops a driver,
--      clerk, or agent from using this function at all).
--   2. Make sure the outcome they sent is one of the 5 allowed values
--      (VALID, NO_PRODUCT, EXPIRED_PRODUCT, UNREGISTERED_CARD, REFUSED)
--      — rejects anything else, like a typo or a made-up value.
--   3. Make sure the card number they're logging actually exists in the
--      gold_cards table — you can't log an inspection for a card that
--      isn't real.
--   4. Clean up the optional note: turn an empty/blank note into a
--      proper database NULL, and reject it outright if it's longer than
--      300 characters.
--   5. If every check above passed, actually save the new row into the
--      inspection_events table, and hand the saved row back to the app
--      (so the Verify screen can show a confirmation message).
-- ---------------------------------------------------------------------

create or replace function public.log_inspection_outcome(
  p_card_number text,
  p_outcome text,
  p_note text default null
)
returns public.inspection_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;               -- will hold the caller's role (e.g. 'INSPECTOR'), or stay NULL if they have none
  v_row public.inspection_events; -- will hold the newly-saved row, so we can hand it back to the app at the end
  v_note text;                -- the cleaned-up version of whatever note was typed
begin
  -- Step 1: who is calling this, and are they allowed to?
  select role into v_role from public.staff where id = auth.uid() and active;
  if v_role is null or v_role not in ('INSPECTOR','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Step 2: is the outcome one of the 5 real options?
  if p_outcome not in ('VALID','NO_PRODUCT','EXPIRED_PRODUCT','UNREGISTERED_CARD','REFUSED') then
    raise exception 'outcome: invalid inspection outcome';
  end if;

  -- Step 3: does this card number actually exist?
  if not exists (select 1 from public.gold_cards where card_number = p_card_number) then
    raise exception 'cardNumber: card % not found', p_card_number;
  end if;

  -- Step 4: clean and validate the optional note.
  v_note := nullif(trim(p_note), '');
  if v_note is not null and length(v_note) > 300 then
    raise exception 'note: keep it under 300 characters';
  end if;

  -- Step 5: everything checked out — actually save the inspection record.
  insert into public.inspection_events (inspector_id, card_number, outcome, note)
  values (auth.uid(), p_card_number, p_outcome, v_note)
  returning * into v_row;

  return v_row;
end;
$$;
