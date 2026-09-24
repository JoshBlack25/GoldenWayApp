import { supabase } from "../lib/supabaseClient";
import { ApiError } from "./client";
import { detectCardBrand } from "../screens/commuter/LoadTrips/data/loadTripsData";

/**
 * Payment wallet API — per-user saved payment methods (migration 0016).
 *
 * PCI stance: the browser never sends the full PAN anywhere. The caller
 * validates + tokenizes locally (brand, last4, expiry) before this
 * module is invoked — only those safe fields are persisted, so the
 * database cannot leak a usable card number even in this demo-gateway
 * project.
 */

function toApiError(error, fallbackStatus = 400) {
  const message = error?.message || "Request failed";
  const code = error?.code;
  if (code === "42501" || /^FORBIDDEN/i.test(message)) {
    return new ApiError(403, {
      error: "You don't have permission for that action.",
    });
  }
  return new ApiError(fallbackStatus, { error: message });
}

export function mapPaymentMethod(row) {
  return {
    id: row.id,
    brand: row.brand,
    last4: row.last4,
    expMonth: row.exp_month,
    expYear: row.exp_year,
    holderName: row.holder_name || "",
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
  };
}

export async function fetchPaymentMethods() {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw toApiError(error);
  return (data || []).map(mapPaymentMethod);
}

/**
 * Tokenize + save. Returns the stored method shape (no sensitive input
 * is echoed back — only what the DB holds).
 */
export async function addPaymentMethod({
  number,
  expMonth,
  expYear,
  holderName,
}) {
  const digits = String(number || "").replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) {
    throw new ApiError(400, { error: "Card number must be 13–19 digits." });
  }
  if (!expMonth || expMonth < 1 || expMonth > 12) {
    throw new ApiError(400, { error: "Expiry month must be 1–12." });
  }
  const year = Number(expYear);
  const thisYear = new Date().getFullYear();
  if (!year || year < thisYear || year > thisYear + 20) {
    throw new ApiError(400, { error: "Expiry year looks invalid." });
  }

  const detected = detectCardBrand(digits);
  const brand =
    detected === "Visa"
      ? "VISA"
      : detected === "Mastercard"
        ? "MASTERCARD"
        : "GENERIC";
  const { data, error } = await supabase
    .from("payment_methods")
    .insert({
      brand,
      last4: digits.slice(-4),
      exp_month: Number(expMonth),
      exp_year: year,
      holder_name: String(holderName || "").trim(),
    })
    .select()
    .single();
  if (error) throw toApiError(error);
  return mapPaymentMethod(data);
}

export async function deletePaymentMethod(id) {
  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", id);
  if (error) throw toApiError(error);
}

export async function setDefaultPaymentMethod(id) {
  // Two-step: clear the old default, then set — keeps at most one.
  const { error: clearErr } = await supabase
    .from("payment_methods")
    .update({ is_default: false })
    .eq("is_default", true);
  if (clearErr) throw toApiError(clearErr);
  const { error } = await supabase
    .from("payment_methods")
    .update({ is_default: true })
    .eq("id", id);
  if (error) throw toApiError(error);
}
