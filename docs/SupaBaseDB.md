-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.commuters (
id uuid NOT NULL,
first_name text NOT NULL,
surname text NOT NULL,
email text NOT NULL UNIQUE,
phone text NOT NULL CHECK (phone ~ '^(\+27|0)\d{9}$'::text),
  gender text NOT NULL CHECK (gender = ANY (ARRAY['MALE'::text, 'FEMALE'::text, 'OTHER'::text])),
  date_of_birth date NOT NULL,
  id_number text NOT NULL UNIQUE CHECK (id_number ~ '^\d{13}$'::text),
concession_type text NOT NULL DEFAULT 'NONE'::text CHECK (concession_type = ANY (ARRAY['NONE'::text, 'STUDENT'::text, 'PENSIONER'::text])),
concession_verified_at timestamp with time zone,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT commuters_pkey PRIMARY KEY (id),
CONSTRAINT commuters_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.staff (
id uuid NOT NULL,
first_name text NOT NULL,
surname text NOT NULL,
email text NOT NULL UNIQUE,
role text NOT NULL CHECK (role = ANY (ARRAY['ADMIN'::text, 'CLERK'::text, 'INSPECTOR'::text, 'DRIVER'::text, 'AGENT'::text])),
active boolean NOT NULL DEFAULT true,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT staff_pkey PRIMARY KEY (id),
CONSTRAINT staff_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.routes (
code text NOT NULL,
name text NOT NULL,
origin text NOT NULL,
destination text NOT NULL,
go_easy_eligible boolean NOT NULL DEFAULT true,
active boolean NOT NULL DEFAULT true,
CONSTRAINT routes_pkey PRIMARY KEY (code)
);
CREATE TABLE public.stops (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
name text NOT NULL,
zone text NOT NULL,
latitude double precision NOT NULL,
longitude double precision NOT NULL,
CONSTRAINT stops_pkey PRIMARY KEY (id)
);
CREATE TABLE public.fare_products (
code text NOT NULL,
family text NOT NULL CHECK (family = ANY (ARRAY['GO_EASY'::text, 'WEEKLY'::text, 'MONTHLY'::text, 'FLEXI_ZONE'::text])),
journeys integer NOT NULL,
valid_days integer NOT NULL,
transfers_allowed integer NOT NULL DEFAULT 0,
active boolean NOT NULL DEFAULT true,
CONSTRAINT fare_products_pkey PRIMARY KEY (code)
);
CREATE TABLE public.fare_table_entries (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
route_code text,
zone_code text,
product_code text NOT NULL,
price_cents bigint NOT NULL,
effective_from date NOT NULL,
effective_to date,
CONSTRAINT fare_table_entries_pkey PRIMARY KEY (id),
CONSTRAINT fare_table_entries_route_code_fkey FOREIGN KEY (route_code) REFERENCES public.routes(code)
);
CREATE TABLE public.gold_cards (
card_number text NOT NULL CHECK (card_number ~ '^GW-\d{4}-\d{4}$'::text),
status text NOT NULL DEFAULT 'UNREGISTERED'::text CHECK (status = ANY (ARRAY['UNREGISTERED'::text, 'ACTIVE'::text, 'LOST'::text, 'EXPIRED'::text])),
owner_id uuid,
registered_at timestamp with time zone,
created_at timestamp with time zone NOT NULL DEFAULT now(),
issued_for_id text,
issued_by uuid,
issued_at timestamp with time zone,
CONSTRAINT gold_cards_pkey PRIMARY KEY (card_number),
CONSTRAINT gold_cards_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.commuters(id),
CONSTRAINT gold_cards_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.staff(id)
);
CREATE TABLE public.loaded_products (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
card_number text NOT NULL,
product_code text NOT NULL,
route_code text,
journeys_total integer NOT NULL,
journeys_used integer NOT NULL DEFAULT 0,
transfers_allowed integer NOT NULL DEFAULT 0,
valid_from date NOT NULL,
valid_to date NOT NULL,
CONSTRAINT loaded_products_pkey PRIMARY KEY (id),
CONSTRAINT loaded_products_card_number_fkey FOREIGN KEY (card_number) REFERENCES public.gold_cards(card_number)
);
CREATE TABLE public.deductions (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
card_number text NOT NULL,
loaded_product_id bigint NOT NULL,
route_code text NOT NULL,
bus_id text,
validator_id text,
was_transfer boolean NOT NULL DEFAULT false,
deducted_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT deductions_pkey PRIMARY KEY (id),
CONSTRAINT deductions_card_number_fkey FOREIGN KEY (card_number) REFERENCES public.gold_cards(card_number),
CONSTRAINT deductions_loaded_product_id_fkey FOREIGN KEY (loaded_product_id) REFERENCES public.loaded_products(id)
);
CREATE TABLE public.top_up_orders (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
card_number text NOT NULL,
product_code text NOT NULL,
route_code text,
amount_cents bigint NOT NULL,
status text NOT NULL DEFAULT 'PENDING_PAYMENT'::text CHECK (status = ANY (ARRAY['PENDING_PAYMENT'::text, 'PAID'::text, 'FAILED'::text, 'REFUNDED'::text])),
receipt_reference text UNIQUE,
created_at timestamp with time zone NOT NULL DEFAULT now(),
paid_at timestamp with time zone,
CONSTRAINT top_up_orders_pkey PRIMARY KEY (id),
CONSTRAINT top_up_orders_card_number_fkey FOREIGN KEY (card_number) REFERENCES public.gold_cards(card_number)
);
CREATE TABLE public.payment_attempts (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
order_id bigint NOT NULL,
gateway text NOT NULL DEFAULT 'SIMULATED'::text CHECK (gateway = ANY (ARRAY['SIMULATED'::text, 'PAYFAST'::text, 'PEACH'::text, 'CASH'::text])),
gateway_ref text,
status text NOT NULL CHECK (status = ANY (ARRAY['INITIATED'::text, 'APPROVED'::text, 'DECLINED'::text])),
attempted_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT payment_attempts_pkey PRIMARY KEY (id),
CONSTRAINT payment_attempts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.top_up_orders(id)
);
CREATE TABLE public.service_alerts (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
title text NOT NULL,
body text NOT NULL,
severity text NOT NULL CHECK (severity = ANY (ARRAY['INFO'::text, 'WARNING'::text, 'CRITICAL'::text])),
route_code text,
effective_from timestamp with time zone NOT NULL DEFAULT now(),
effective_to timestamp with time zone,
CONSTRAINT service_alerts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.support_tickets (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
commuter_id uuid NOT NULL,
subject text NOT NULL,
status text NOT NULL DEFAULT 'OPEN'::text CHECK (status = ANY (ARRAY['OPEN'::text, 'IN_PROGRESS'::text, 'RESOLVED'::text])),
created_at timestamp with time zone NOT NULL DEFAULT now(),
assigned_to uuid,
priority text NOT NULL DEFAULT 'NORMAL'::text CHECK (priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text])),
CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
CONSTRAINT support_tickets_commuter_id_fkey FOREIGN KEY (commuter_id) REFERENCES public.commuters(id),
CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id)
);
CREATE TABLE public.ticket_messages (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
ticket_id bigint NOT NULL,
sender text NOT NULL CHECK (sender = ANY (ARRAY['COMMUTER'::text, 'AGENT'::text])),
body text NOT NULL,
sent_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT ticket_messages_pkey PRIMARY KEY (id),
CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id)
);
CREATE TABLE public.route_departures (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
route_code text NOT NULL,
direction text NOT NULL DEFAULT 'OUTBOUND'::text CHECK (direction = ANY (ARRAY['OUTBOUND'::text, 'INBOUND'::text])),
service_day text NOT NULL DEFAULT 'WEEKDAY'::text CHECK (service_day = ANY (ARRAY['WEEKDAY'::text, 'SATURDAY'::text, 'SUNDAY'::text])),
departure_time time without time zone NOT NULL,
CONSTRAINT route_departures_pkey PRIMARY KEY (id),
CONSTRAINT route_departures_route_code_fkey FOREIGN KEY (route_code) REFERENCES public.routes(code)
);
CREATE TABLE public.staff_access_requests (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
email text NOT NULL UNIQUE,
first_name text NOT NULL,
surname text NOT NULL,
requested_role text NOT NULL CHECK (requested_role = ANY (ARRAY['ADMIN'::text, 'CLERK'::text, 'INSPECTOR'::text, 'DRIVER'::text, 'AGENT'::text])),
motivation text,
status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'DENIED'::text])),
decided_by uuid,
decision_note text,
requested_at timestamp with time zone NOT NULL DEFAULT now(),
decided_at timestamp with time zone,
onboarded_at timestamp with time zone,
CONSTRAINT staff_access_requests_pkey PRIMARY KEY (id),
CONSTRAINT staff_access_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.staff(id)
);
CREATE TABLE public.staff_action_log (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
actor_id uuid,
action text NOT NULL,
entity text NOT NULL,
entity_id text,
details jsonb,
at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT staff_action_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.buses (
fleet_no text NOT NULL,
depot text NOT NULL DEFAULT 'MONTANA'::text CHECK (depot = ANY (ARRAY['MONTANA'::text, 'PHILIPPI'::text, 'WOODSTOCK'::text, 'ATLANTIS'::text, 'SIMON''S TOWN'::text, 'BLACKHEATH'::text])),
seating integer NOT NULL DEFAULT 60,
active boolean NOT NULL DEFAULT true,
CONSTRAINT buses_pkey PRIMARY KEY (fleet_no)
);
CREATE TABLE public.vehicle_runs (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
driver_id uuid NOT NULL,
route_code text NOT NULL,
bus_id text NOT NULL,
direction text NOT NULL DEFAULT 'OUTBOUND'::text CHECK (direction = ANY (ARRAY['OUTBOUND'::text, 'INBOUND'::text])),
service_day text NOT NULL DEFAULT 'WEEKDAY'::text CHECK (service_day = ANY (ARRAY['WEEKDAY'::text, 'SATURDAY'::text, 'SUNDAY'::text])),
status text NOT NULL DEFAULT 'ON_TIME'::text CHECK (status = ANY (ARRAY['ON_TIME'::text, 'DELAYED'::text, 'BREAKDOWN'::text, 'DIVERTED'::text, 'COMPLETED'::text])),
delay_minutes integer NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
note text,
started_at timestamp with time zone NOT NULL DEFAULT now(),
ended_at timestamp with time zone,
CONSTRAINT vehicle_runs_pkey PRIMARY KEY (id),
CONSTRAINT vehicle_runs_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.staff(id),
CONSTRAINT vehicle_runs_route_code_fkey FOREIGN KEY (route_code) REFERENCES public.routes(code),
CONSTRAINT vehicle_runs_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(fleet_no)
);
CREATE TABLE public.inspection_events (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
inspector_id uuid NOT NULL,
card_number text NOT NULL,
outcome text NOT NULL CHECK (outcome = ANY (ARRAY['VALID'::text, 'NO_PRODUCT'::text, 'EXPIRED_PRODUCT'::text, 'UNREGISTERED_CARD'::text, 'REFUSED'::text])),
note text,
at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT inspection_events_pkey PRIMARY KEY (id),
CONSTRAINT inspection_events_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.staff(id)
);
CREATE TABLE public.notifications (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
user_id uuid NOT NULL,
type text NOT NULL,
title text NOT NULL,
body text,
link_path text,
read_at timestamp with time zone,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT notifications_pkey PRIMARY KEY (id),
CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
