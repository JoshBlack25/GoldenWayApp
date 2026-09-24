-- Commuter profile creation moves from a client-side RPC call (which
-- needs auth.uid(), unavailable until email is confirmed) to a trigger
-- on auth.users, mirroring handle_staff_signup (0005/0013). Metadata
-- carries the form data through signUp(); a pending gold-card number
-- also travels here and is linked after first confirmed login.

create or replace function public.handle_commuter_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := new.raw_user_meta_data;
  v_first_name text; v_surname text; v_phone text;
  v_dob date; v_id_number text; v_concession text;
begin
  if v_meta is null or coalesce(v_meta->>'account_type','') <> 'COMMUTER' then
    return new; -- not a commuter signup (e.g. staff) — leave to handle_staff_signup
  end if;

  v_first_name := v_meta->>'first_name';
  v_surname    := v_meta->>'surname';
  v_phone      := v_meta->>'phone';
  v_dob        := nullif(v_meta->>'date_of_birth','')::date;
  v_id_number  := v_meta->>'id_number';
  v_concession := coalesce(v_meta->>'concession_type','NONE');

  if v_first_name is null or trim(v_first_name) = '' then
    raise exception 'firstName: must not be blank';
  end if;
  if v_surname is null or trim(v_surname) = '' then
    raise exception 'surname: must not be blank';
  end if;
  if v_phone !~ '^(\+27|0)\d{9}$' then
    raise exception 'phone: must be a SA mobile number (+27xxxxxxxxx or 0xxxxxxxxx)';
  end if;
  if v_dob is null or v_dob > (current_date - interval '5 years')::date then
    raise exception 'dateOfBirth: must be a valid date of birth (age 5 or older)';
  end if;
  if not public.sa_id_luhn_valid(v_id_number) then
    raise exception 'idNumber: this ID number fails the checksum — please check it';
  end if;
  if v_concession not in ('NONE','STUDENT','PENSIONER') then
    raise exception 'concessionType: must be NONE, STUDENT or PENSIONER';
  end if;
  if exists (select 1 from public.commuters where id_number = v_id_number) then
    raise exception 'idNumber: an account already exists with this ID number' using errcode = '23505';
  end if;

  insert into public.commuters (id, first_name, surname, email, phone, date_of_birth, id_number, concession_type)
  values (new.id, trim(v_first_name), trim(v_surname), new.email, v_phone, v_dob, v_id_number, upper(v_concession));

  return new;
end;
$$;

drop trigger if exists on_auth_user_commuter_signup on auth.users;
create trigger on_auth_user_commuter_signup
  after insert on auth.users
  for each row execute function public.handle_commuter_signup();

-- Pre-signup duplicate check, so the UI can show a field error BEFORE
-- calling signUp() rather than relying on the trigger's raised exception
-- surfacing cleanly through GoTrue (it doesn't always — see caveat below).
create or replace function public.check_id_number_available(p_id_number text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.commuters where id_number = p_id_number);
$$;

grant execute on function public.check_id_number_available(text) to anon, authenticated;