import {
  fetchProductsForRouteFromDb,
  fetchQuoteFromDb,
  fetchRoutesFromDb,
} from "../../../../api/goldenway";
<<<<<<< HEAD
=======
import { productLabel, isUnlimited } from "../../../../utils/productLabels";
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

/**
 * Live GABS fare catalog for the Load Trips flow — backed directly by
 * Supabase:
 *   table  routes                         → RouteResponse[]
 *   rpc    fares_products_for_route(code)  → FareProductResponse[]
 *   rpc    fares_quote(route, product, …)  → QuoteResponse (save-vs-cash, BR-09)
 *
 * Business logic mirrored from the GABS research doc:
 *   - Go Easy 5/10/48 with 1 free transfer (BR-04)
 *   - Weekly/Monthly are route-bound unlimited products (journeys = 0)
 *   - Excluded areas: Go Easy unavailable → BR-03 message, verbatim
 */

export const BR03_MESSAGE =
  "Go Easy is not available on this route. Please choose Weekly, Monthly, or cash.";

/** Friendly labels for the seeded route codes (static fallback + doc names). */
export const ROUTE_LABELS = {
  "KHA-CPT": "Khayelitsha → City",
  "MP-CPT": "Mitchells Plain → City",
  "BELL-CPT": "Bellville → City",
  "WYN-OBS": "Wynberg → Observatory",
  "CPT-BLK": "City → Blackheath",
  "WOOD-ATL": "Woodstock → Atlantis",
  "PAARL-BELL": "Paarl → Bellville",
};

<<<<<<< HEAD
=======
export { productLabel, isUnlimited };

>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
export function routeLabel(code) {
  return ROUTE_LABELS[code] || code;
}

<<<<<<< HEAD
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

=======
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
/** FareProductResponse → the plan shape the step components render. */
export function mapProduct(fpr) {
  return {
    id: fpr.code,
    label: productLabel(fpr.code),
    family: fpr.family,
    trips: fpr.journeys,
    validDays: fpr.validDays,
    transfersAllowed: fpr.transfersAllowed,
    priceCents: fpr.priceCents,
    goEasy: (fpr.family || "").includes("GO_EASY") || (fpr.family || "").includes("GOEASY"),
  };
}

/** RouteResponse → the route shape the step components render. */
export function mapRoute(rr) {
  return {
    id: rr.code,
    code: rr.code,
    from: rr.origin,
    to: rr.destination,
    label: ROUTE_LABELS[rr.code] || `${rr.origin} → ${rr.destination}`,
    goEasyEligible: rr.goEasyEligible,
  };
}

let routesCache = null;
const productsCache = new Map();

<<<<<<< HEAD
=======
/**
 * Drop the fare catalogue caches. Called after a successful purchase so
 * the next visit to Load Trips re-reads effective-dated prices instead of
 * showing a stale fare for the rest of the session.
 */
export function clearFareCache() {
  routesCache = null;
  productsCache.clear();
}

>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
export async function fetchRoutes() {
  if (routesCache) return routesCache;
  const list = await fetchRoutesFromDb();
  routesCache = (list || []).map(mapRoute);
  return routesCache;
}

export async function fetchProducts(routeCode) {
  if (productsCache.has(routeCode)) return productsCache.get(routeCode);
  const list = await fetchProductsForRouteFromDb(routeCode);
  const products = (list || []).map(mapProduct);
  productsCache.set(routeCode, products);
  return products;
}

/** Save-vs-cash quote (also validates the concession via the backend). */
export async function fetchQuote(routeCode, productCode, concessionType) {
  return fetchQuoteFromDb(routeCode, productCode, concessionType || "NONE");
}

/* ---------- presentation helpers (kept from the placeholder module) ---------- */

export function formatCurrency(amount) {
  return `R${amount.toFixed(2)}`;
}

export function formatCents(cents) {
  return formatCurrency((cents || 0) / 100);
}

export function detectCardBrand(cardNumber) {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.startsWith("4")) return "Visa";
  if (digits.startsWith("5")) return "Mastercard";
  return "Card";
}

export const MAX_SAVED_CARDS = 3;

<<<<<<< HEAD
export const INITIAL_CARDS = [
  { id: "card-1", brand: "Visa", last4: "4582", expiry: "08/26" },
  { id: "card-2", brand: "Mastercard", last4: "8829", expiry: "03/27" },
];

=======
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
export const GOLD_CARD = { label: "Gold Card", last4: "4821", brand: "Visa" };
