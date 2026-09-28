import { supabase } from "../lib/supabaseClient";
import { ApiError } from "./client";

/**
 * Catalog & Alerts API — ADMIN lane (S2-D4).
 *   · Fare catalogue: routes, fare_products, fare_table_entries (0001,
 *     0004). fares_products_for_route() is the price authority the
 *     commuter app reads from — this module edits the tables that
 *     function reads, nothing bypasses it.
 *   · Service alerts (0001 + 0007 trigger): inserting a row here fires
 *     notify_alert_published(), which fans a notification out to every
 *     affected commuter automatically. No client-side notification code
 *     needed — the DB does it.
 * RLS (0001): routes_write / fare_products_write / fare_table_entries_write
 * / service_alerts_write all gate on is_staff('ADMIN','CLERK'), so these
 * are plain table reads/writes under Postgres RLS, same pattern as the
 * rest of this module family — no RPC exists for catalog editing because
 * none is needed.
 */

function toApiError(error, fallbackStatus = 400) {
  const message = error?.message || "Request failed";
  const code = error?.code;
  if (code === "42501" || /forbidden|permission/i.test(message)) {
    return new ApiError(403, { error: "Admin only" });
  }
  if (code === "23505" || /duplicate/i.test(message)) {
    return new ApiError(409, { error: "That entry already exists." });
  }
  return new ApiError(fallbackStatus, { error: message });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// =====================================================================
// Routes & fare products
// =====================================================================

/** Every route (active + inactive) — ADMIN needs to see both to manage them. */
export async function fetchRoutes() {
  const { data, error } = await supabase
    .from("routes")
    .select("code, name, origin, destination, go_easy_eligible, active")
    .order("code", { ascending: true });
  if (error) throw toApiError(error);
  return data || [];
}

/** Every fare product in the catalogue. */
export async function fetchFareProducts() {
  const { data, error } = await supabase
    .from("fare_products")
    .select("code, family, journeys, valid_days, transfers_allowed, active")
    .order("family", { ascending: true })
    .order("journeys", { ascending: true });
  if (error) throw toApiError(error);
  return data || [];
}

/** Toggle a product active/inactive network-wide (gates fares_products_for_route). */
export async function setFareProductActive(code, active) {
  const { data, error } = await supabase
    .from("fare_products")
    .update({ active })
    .eq("code", code)
    .select()
    .single();
  if (error) throw toApiError(error);
  return data;
}

/**
 * Currently-live fare table entries for one route, joined with product
 * details. "Currently live" = effective_from <= today and (effective_to
 * is null or >= today) — the exact window fares_products_for_route()
 * uses, so this is what the commuter app is charging right now.
 *
 * fare_table_entries.product_code has no FK constraint to
 * fare_products.code (only route_code -> routes is a real FK in 0001),
 * so PostgREST can't embed the join — it's done client-side instead.
 */
export async function fetchRouteFareTable(routeCode) {
  const today = todayISO();
  const [entriesRes, productsRes] = await Promise.all([
    supabase
      .from("fare_table_entries")
      .select("id, product_code, price_cents, effective_from, effective_to")
      .eq("route_code", routeCode)
      .lte("effective_from", today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order("product_code", { ascending: true }),
    supabase
      .from("fare_products")
      .select("code, family, journeys, valid_days, transfers_allowed, active"),
  ]);
  if (entriesRes.error) throw toApiError(entriesRes.error);
  if (productsRes.error) throw toApiError(productsRes.error);

  const productByCode = new Map((productsRes.data || []).map((p) => [p.code, p]));

  return (entriesRes.data || []).map((row) => {
    const product = productByCode.get(row.product_code);
    return {
      id: row.id,
      productCode: row.product_code,
      priceCents: row.price_cents,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      family: product?.family,
      journeys: product?.journeys,
      validDays: product?.valid_days,
      transfersAllowed: product?.transfers_allowed,
      productActive: product?.active,
    };
  });
}

/**
 * Set (or change) the live price for a route + product.
 * Preserves history instead of overwriting it: if a currently-live entry
 * exists, it's closed off the day before the new price starts, then a
 * fresh row is inserted. This is what "effective_from/effective_to"
 * means in the schema — a price change is a new row, not an edit.
 */
export async function setRouteFarePrice({ routeCode, productCode, priceCents, effectiveFrom }) {
  const startDate = effectiveFrom || todayISO();

  const { data: current, error: findErr } = await supabase
    .from("fare_table_entries")
    .select("id, effective_from")
    .eq("route_code", routeCode)
    .eq("product_code", productCode)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1);
  if (findErr) throw toApiError(findErr);

  const openEntry = current?.[0];
  if (openEntry) {
    if (openEntry.effective_from >= startDate) {
      // Same-day correction — just update the open row's price in place.
      const { data, error } = await supabase
        .from("fare_table_entries")
        .update({ price_cents: priceCents })
        .eq("id", openEntry.id)
        .select()
        .single();
      if (error) throw toApiError(error);
      return data;
    }
    const dayBefore = new Date(startDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const { error: closeErr } = await supabase
      .from("fare_table_entries")
      .update({ effective_to: dayBefore.toISOString().slice(0, 10) })
      .eq("id", openEntry.id);
    if (closeErr) throw toApiError(closeErr);
  }

  const { data, error } = await supabase
    .from("fare_table_entries")
    .insert({
      route_code: routeCode,
      product_code: productCode,
      price_cents: priceCents,
      effective_from: startDate,
      effective_to: null,
    })
    .select()
    .single();
  if (error) throw toApiError(error);
  return data;
}

/** Remove a route's price for a product effective immediately (no more sales of it on that route). */
export async function endRouteFarePrice(entryId) {
  const { data, error } = await supabase
    .from("fare_table_entries")
    .update({ effective_to: todayISO() })
    .eq("id", entryId)
    .select()
    .single();
  if (error) throw toApiError(error);
  return data;
}

// =====================================================================
// Service alerts — insert fires notify_alert_published() (0007) which
// fans the alert out to every affected commuter's notification feed.
// =====================================================================

/** Alerts still in their effective window (or with no end date). */
export async function fetchActiveAlerts() {
  const today = new Date().toISOString();
  const { data, error } = await supabase
    .from("service_alerts")
    .select("id, title, body, severity, route_code, effective_from, effective_to")
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order("effective_from", { ascending: false });
  if (error) throw toApiError(error);
  return data || [];
}

/** Past / expired alerts, most recent first — kept for a short history view. */
export async function fetchPastAlerts(limit = 20) {
  const today = new Date().toISOString();
  const { data, error } = await supabase
    .from("service_alerts")
    .select("id, title, body, severity, route_code, effective_from, effective_to")
    .lt("effective_to", today)
    .order("effective_to", { ascending: false })
    .limit(limit);
  if (error) throw toApiError(error);
  return data || [];
}

/**
 * Publish a new alert. route_code = null means network-wide (every
 * commuter with a card gets notified); a route code scopes it to
 * commuters who tapped that route in the last 7 days — see 0007.
 */
export async function createServiceAlert({ title, body, severity, routeCode, effectiveTo }) {
  const { data, error } = await supabase
    .from("service_alerts")
    .insert({
      title: title.trim(),
      body: body.trim(),
      severity,
      route_code: routeCode || null,
      effective_to: effectiveTo || null,
    })
    .select()
    .single();
  if (error) throw toApiError(error);
  return data;
}

/** End an alert now (e.g. the disruption is over). */
export async function expireAlert(id) {
  const { data, error } = await supabase
    .from("service_alerts")
    .update({ effective_to: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw toApiError(error);
  return data;
}
