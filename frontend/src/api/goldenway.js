import { supabase } from "../lib/supabaseClient";
import { ApiError } from "./client";

/**
 * GoldenWay data access — Supabase edition.
 *
 * This module replaces the old fetch()-based /api/* client. Every screen
 * still talks to useAuth()/useTrips() exactly as before; only what's
 * *behind* those contexts changed. Business rules that used to live in
 * the Spring services (BR-04 free transfer, BR-07 tap, BR-09 fare table,
 * BR-10 card registration, …) now live in Postgres functions — see
 * supabase/migrations/0002_functions.sql. This file just calls them and
 * reshapes the results into the same camelCase JSON the React screens
 * were already built against.
 */

// ---------------------------------------------------------------------
// error helpers
// ---------------------------------------------------------------------

/** Turn a Postgres/RPC error into the ApiError shape the screens expect
 * (RegisterScreen/LoginScreen check `err.status` and `err.fieldErrors`). */
function toApiError(error, fallbackStatus = 400) {
  const message = error?.message || "Request failed";
  const code = error?.code;

  // Our RPCs raise "field: human message" for validation failures.
  const fieldMatch = /^([a-zA-Z]+):\s*(.+)$/.exec(message);
  if (code === "23505" || /already exists|already registered|duplicate/i.test(message)) {
    const data = fieldMatch ? { [fieldMatch[1]]: fieldMatch[2] } : { error: message };
    return new ApiError(409, data);
  }
  if (fieldMatch) {
    return new ApiError(400, { [fieldMatch[1]]: fieldMatch[2] });
  }
  if (/invalid login credentials/i.test(message)) {
    return new ApiError(401, { error: message });
  }
  if (code === "42501" || /forbidden/i.test(message)) {
    return new ApiError(403, { error: message });
  }
  return new ApiError(fallbackStatus, { error: message });
}

function rpc(fn, args) {
  return supabase.rpc(fn, args).then(({ data, error }) => {
    if (error) throw toApiError(error);
    return data;
  });
}

// ---------------------------------------------------------------------
// identity / auth
// ---------------------------------------------------------------------

function mapCommuterRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    surname: row.surname,
    email: row.email,
    phone: row.phone,
    concessionType: row.concession_type,
    concessionVerified: Boolean(row.concession_verified_at),
  };
}

export async function fetchMyCommuterProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from("commuters")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) throw toApiError(error);
  return mapCommuterRow(data);
}

export async function registerCommuter(payload) {
  const { email, password, firstName, surname, phone, gender, dateOfBirth, idNumber, concessionType } = payload;

  const { error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) {
    if (/already registered|already exists/i.test(signUpError.message)) {
      throw new ApiError(409, { email: "An account already exists with this email" });
    }
    throw new ApiError(400, { error: signUpError.message });
  }

  // If email confirmation is enabled in the Supabase project, signUp()
  // won't return an active session and the RPC below (which reads
  // auth.uid()) will fail. See README "Email confirmation" note.
  const row = await rpc("register_commuter", {
    p_first_name: firstName,
    p_surname: surname,
    p_phone: phone,
    p_gender: gender,
    p_date_of_birth: dateOfBirth,
    p_id_number: idNumber,
    p_concession_type: concessionType,
  });

  return mapCommuterRow(row);
}

export async function loginCommuter(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw toApiError(error, 401);
  const profile = await fetchMyCommuterProfile();
  if (!profile) throw new ApiError(401, { error: "No commuter profile for this account" });
  return profile;
}

export async function logoutCommuter() {
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------
// card & ticket
// ---------------------------------------------------------------------

export async function getOrCreateMyCard() {
  return rpc("get_or_create_my_card", {});
}

export async function registerCardToMe(cardNumber) {
  return rpc("register_card", { p_card_number: cardNumber });
}

export async function journeysRemaining(cardNumber) {
  return rpc("journeys_remaining", { p_card_number: cardNumber });
}

export async function cardHistory(cardNumber) {
  const { data, error } = await supabase
    .from("deductions")
    .select("*")
    .eq("card_number", cardNumber)
    .order("deducted_at", { ascending: false });
  if (error) throw toApiError(error);
  return (data || []).map((d) => ({
    id: d.id,
    routeCode: d.route_code,
    busId: d.bus_id,
    validatorId: d.validator_id,
    wasTransfer: d.was_transfer,
    deductedAt: d.deducted_at,
  }));
}

export async function tapJourney(cardNumber, routeCode, busId, validatorId) {
  const row = await rpc("tap_journey", {
    p_card_number: cardNumber,
    p_route_code: routeCode,
    p_bus_id: busId,
    p_validator_id: validatorId,
  });
  return {
    id: row.id,
    routeCode: row.route_code,
    busId: row.bus_id,
    validatorId: row.validator_id,
    wasTransfer: row.was_transfer,
    deductedAt: row.deducted_at,
  };
}

// ---------------------------------------------------------------------
// top-up / payment
// ---------------------------------------------------------------------

export async function topupsForCard(cardNumber) {
  const { data, error } = await supabase
    .from("top_up_orders")
    .select("*")
    .eq("card_number", cardNumber)
    .order("created_at", { ascending: false });
  if (error) throw toApiError(error);
  return (data || []).map((o) => ({
    id: o.id,
    productCode: o.product_code,
    routeCode: o.route_code,
    amountCents: o.amount_cents,
    status: o.status,
    receiptReference: o.receipt_reference,
    createdAt: o.created_at,
    paidAt: o.paid_at,
  }));
}

export async function createTopupOrder(cardNumber, productCode, routeCode, amountCents) {
  const row = await rpc("create_topup_order", {
    p_card_number: cardNumber,
    p_product_code: productCode,
    p_route_code: routeCode || null,
    p_amount_cents: amountCents,
  });
  return { id: row.id, status: row.status };
}

export async function payTopupOrder(orderId) {
  const row = await rpc("pay_topup_order", { p_order_id: orderId });
  return {
    id: row.id,
    productCode: row.product_code,
    routeCode: row.route_code,
    amountCents: row.amount_cents,
    status: row.status,
    receiptReference: row.receipt_reference,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

// ---------------------------------------------------------------------
// fares / routes (Load Trips)
// ---------------------------------------------------------------------

export async function fetchRoutesFromDb() {
  const { data, error } = await supabase
    .from("routes")
    .select("code,name,origin,destination,go_easy_eligible")
    .eq("active", true)
    .order("code");
  if (error) throw toApiError(error);
  return (data || []).map((r) => ({
    code: r.code,
    name: r.name,
    origin: r.origin,
    destination: r.destination,
    goEasyEligible: r.go_easy_eligible,
  }));
}

export async function fetchProductsForRouteFromDb(routeCode) {
  const { data, error } = await supabase.rpc("fares_products_for_route", { p_route_code: routeCode });
  if (error) throw toApiError(error);
  return (data || []).map((p) => ({
    code: p.code,
    family: p.family,
    journeys: p.journeys,
    validDays: p.valid_days,
    transfersAllowed: p.transfers_allowed,
    priceCents: p.price_cents,
  }));
}

export async function fetchQuoteFromDb(routeCode, productCode, concessionType) {
  const { data, error } = await supabase.rpc("fares_quote", {
    p_route_code: routeCode,
    p_product_code: productCode,
    p_concession_type: concessionType || "NONE",
  });
  if (error) throw toApiError(error, 400);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    routeCode: row.route_code,
    productCode: row.product_code,
    priceCents: row.price_cents,
    cashCompareCents: row.cash_compare_cents,
    savingsCents: row.savings_cents,
    includesTransfer: row.includes_transfer,
  };
}

// ---------------------------------------------------------------------
// timetables (next-bus + full schedule per route)
// ---------------------------------------------------------------------

/**
 * Departures for a route. dayType: WEEKDAY | SATURDAY | SUNDAY —
 * mapped from the JS date on the caller side. Returns ISO time strings
 * ("05:15:00") sorted ascending within the requested direction.
 */
export async function fetchDepartures(routeCode, direction = "OUTBOUND", dayType = "WEEKDAY") {
  const { data, error } = await supabase
    .from("route_departures")
    .select("departure_time")
    .eq("route_code", routeCode)
    .eq("direction", direction)
    .eq("service_day", dayType)
    .order("departure_time");
  if (error) throw toApiError(error);
  return (data || []).map((d) => d.departure_time);
}

/** WEEKDAY for Mon–Fri, SATURDAY, SUNDAY — matches the GABS service-day split. */
export function serviceDayFor(date = new Date()) {
  const day = date.getDay();
  if (day === 0) return "SUNDAY";
  if (day === 6) return "SATURDAY";
  return "WEEKDAY";
}

/** "05:15:00" → "05:15" */
export function hhmm(iso) {
  return (iso || "").slice(0, 5);
}

// ---------------------------------------------------------------------
// service alerts (Home screen banner)
// ---------------------------------------------------------------------

export async function fetchLiveAlerts() {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("service_alerts")
    .select("*")
    .lte("effective_from", nowIso)
    .or(`effective_to.is.null,effective_to.gt.${nowIso}`)
    .order("effective_from", { ascending: false });
  if (error) throw toApiError(error);
  return (data || []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    severity: a.severity,
    routeCode: a.route_code,
    effectiveFrom: a.effective_from,
    effectiveTo: a.effective_to,
  }));
}
