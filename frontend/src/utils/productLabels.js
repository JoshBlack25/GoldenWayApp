/**
 * Shared product/fare labels — the single source of truth for turning
 * backend product codes into human labels.
 *
 * Consumers:
 *   - loadTripsData.js (Load Trips flow, fare catalogue mapping)
 *   - TripProvider.jsx (Card/History pass labels from loaded products)
 *
 * Kept framework-free (no React, no supabase) so it stays unit-testable.
 */

/** "GOEASY-5" → "Go Easy 5-Ride", "WEEKLY-KHA-CPT" → "Weekly Pass". */
export function productLabel(code) {
  if (!code) return "GoldenWay Pass";
  const upper = code.toUpperCase();
  if (upper.startsWith("WEEKLY")) return "Weekly Pass";
  if (upper.startsWith("MONTHLY")) return "Monthly Pass";
  if (upper.startsWith("FLEXI")) return "Flexi Zone";
  const m = upper.match(/^GOEASY-(\d+)$/);
  if (m) return `Go Easy ${m[1]}-Ride`;
  return upper;
}

export function isUnlimited(code) {
  const upper = (code || "").toUpperCase();
  return upper.startsWith("WEEKLY") || upper.startsWith("MONTHLY");
}
