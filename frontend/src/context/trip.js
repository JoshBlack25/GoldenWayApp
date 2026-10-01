import { createContext, useContext } from "react";

/**
 * Shared pass/rides/transaction state for the whole dashboard, so Home,
 * Card, History and the Load Trips flow all show one consistent balance.
 *
 * Also exposes loadError (initial card/balance fetch failed) and
 * refreshTrips() as the retry — screens render a retry card when set.
 *
 * Payment wallet (0016): paymentMethods + save/remove/makeDefault manage
 * the user's per-account saved payment methods (brand + last4 only).
 */
export const TripContext = createContext(null);

export function useTrips() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrips must be used within a TripProvider");
  return ctx;
}
