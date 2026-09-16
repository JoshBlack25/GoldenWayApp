import { createContext, useContext } from "react";

/**
 * Shared pass/rides/transaction state for the whole dashboard, so Home,
 * Card, History and the Load Trips flow all show one consistent balance.
 */
export const TripContext = createContext(null);

export function useTrips() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrips must be used within a TripProvider");
  return ctx;
}
