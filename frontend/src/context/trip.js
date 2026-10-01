import { createContext, useContext } from "react";

/**
 * Shared pass/rides/transaction state for the whole dashboard, so Home,
 * Card, History and the Load Trips flow all show one consistent balance.
<<<<<<< HEAD
=======
 *
 * Also exposes loadError (initial card/balance fetch failed) and
 * refreshTrips() as the retry — screens render a retry card when set.
 *
 * Payment wallet (0016): paymentMethods + save/remove/makeDefault manage
 * the user's per-account saved payment methods (brand + last4 only).
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
 */
export const TripContext = createContext(null);

export function useTrips() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrips must be used within a TripProvider");
  return ctx;
}
