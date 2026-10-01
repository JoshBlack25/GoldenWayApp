import { useCallback, useEffect, useMemo, useState } from "react";
import { TripContext } from "./trip";
import {
  cardHistory,
  createTopupOrder,
  getOrCreateMyCard,
  journeysRemaining,
  payTopupOrder,
  registerCardToMe,
  tapJourney,
  topupsForCard,
} from "../api/goldenway";
import { supabase } from "../lib/supabaseClient";
<<<<<<< HEAD
=======
import { productLabel } from "../utils/productLabels";
import { clearFareCache } from "../screens/commuter/LoadTrips/data/loadTripsData";
import {
  fetchPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from "../api/paymentMethods";
import { fetchLiveRuns } from "../api/operations";
import { isProductLive, daysUntil } from "../utils/myRoutes";
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

/**
 * Real data for the whole dashboard, backed directly by Supabase.
 *
 * Context surface (unchanged names, so every screen keeps working):
 *   rides / pass / transactions — balance, active pass, activity feed
 *   deductRide(title)           — real tap: rpc tap_journey (BR-07, BR-04)
 *   addRides(count, title, …)   — real purchase: order + pay → product loaded
 *
 * New members used by the wired screens:
 *   card, cardBusy, refreshTrips, registerCard(), purchase(), passExpiresOn
 *
 * Card strategy: every commuter gets exactly one card. get_or_create_my_card()
 * creates + registers it atomically on the server on first use (BR-01,
 * BR-10) — no more "create then register" race between two round trips.
 */

const fmt = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function metaFor(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  const now = new Date();
  const sameDay = then.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay) return `Today, ${fmt.format(then)}`;
  if (then.toDateString() === yesterday.toDateString())
    return `Yesterday, ${fmt.format(then)}`;
  return fmt.format(then);
}

<<<<<<< HEAD
/** "GOEASY-5" → "Go Easy 5-Ride", "WEEKLY" → "Weekly Pass", … */
function productLabel(code) {
  if (!code) return "GoldenWay Pass";
  const upper = code.toUpperCase();
  if (upper === "WEEKLY") return "Weekly Pass";
  if (upper === "MONTHLY") return "Monthly Pass";
  const m = upper.match(/^([A-Z]+)-?(\d+)$/);
  if (m) {
    const family = m[1] === "GOEASY" ? "Go Easy" : m[1];
    return `${family} ${m[2]}-Ride`;
  }
  return upper;
}

/** Newest valid loaded product → the "pass" card the UI shows. */
function derivePass(card) {
  const today = new Date();
  const products = (card?.loadedProducts || [])
    .filter((p) => new Date(p.validTo) >= today)
    .sort((a, b) => new Date(b.validTo) - new Date(a.validTo));
  if (!products.length) {
    return { label: "No active pass — top up to ride", expiryDays: 0, active: false };
  }
  const p = products[0];
  const days = Math.max(
    0,
    Math.ceil((new Date(p.validTo) - today) / 86400000),
  );
=======
/** Newest valid loaded product → the "pass" card the UI shows. */
function derivePass(card) {
  const products = (card?.loadedProducts || [])
    .filter((p) => isProductLive(p))
    .sort((a, b) => new Date(b.validTo) - new Date(a.validTo));
  if (!products.length) {
    return {
      label: "No active pass — top up to ride",
      expiryDays: 0,
      active: false,
    };
  }
  const p = products[0];
  const days = Math.max(0, daysUntil(p.validTo));
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
  return {
    label: productLabel(p.productCode),
    expiryDays: days,
    active: true,
    productCode: p.productCode,
  };
}

function deductionToTx(d) {
  if (d.wasTransfer) {
    return {
      id: `d-${d.id}`,
      type: "ride",
      title: `Free transfer · ${d.routeCode}`,
      meta: metaFor(d.deductedAt),
      _at: d.deductedAt,
      amount: "Free",
      negative: false,
    };
  }
  return {
    id: `d-${d.id}`,
    type: "ride",
    title: d.routeCode,
    meta: metaFor(d.deductedAt),
    _at: d.deductedAt,
    amount: "-1 Ride",
    negative: true,
  };
}

function orderToTx(o) {
  return {
    id: `o-${o.id}`,
    type: "topup",
    title: `${productLabel(o.productCode)} loaded${o.routeCode ? ` · ${o.routeCode}` : ""}`,
    meta: metaFor(o.paidAt || o.createdAt),
    _at: o.paidAt || o.createdAt,
<<<<<<< HEAD
    amount: `+${(o.amountCents / 100).toFixed(0)} Rides`,
=======
    amount: `R${(o.amountCents / 100).toFixed(2)}`,
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    negative: false,
  };
}

export default function TripProvider({ children }) {
  const [card, setCard] = useState(null);
  const [cardBusy, setCardBusy] = useState(false);
  const [rides, setRides] = useState(0);
  const [transactions, setTransactions] = useState([]);
<<<<<<< HEAD
=======
  // Load error for the initial dashboard fetch — surfaced by screens so a
  // backend/network failure never looks like an empty account.
  const [loadError, setLoadError] = useState(null);
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

  const pass = useMemo(() => derivePass(card), [card]);
  const passExpiresOn = useMemo(() => {
    const products = (card?.loadedProducts || [])
<<<<<<< HEAD
      .filter((p) => new Date(p.validTo) >= new Date())
      .sort((a, b) => new Date(b.validTo) - new Date(a.validTo));
    return products[0]?.validTo || null;
  }, [card]);
=======
      .filter((p) => isProductLive(p))
      .sort((a, b) => new Date(b.validTo) - new Date(a.validTo));
    return products[0]?.validTo || null;
  }, [card]);
  // A live weekly/monthly pass (journeys_total = 0) → unlimited rides on its route.
  const unlimitedPass = useMemo(() => {
    const products = (card?.loadedProducts || [])
      .filter((p) => p.journeysTotal === 0 && isProductLive(p))
      .sort((a, b) => new Date(b.validTo) - new Date(a.validTo));
    return products[0]
      ? {
          productCode: products[0].productCode,
          routeCode: products[0].routeCode,
          validTo: products[0].validTo,
        }
      : null;
  }, [card]);
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

  /** Load (or create+register) my card, then balance + history. */
  const refreshTrips = useCallback(async () => {
    setCardBusy(true);
<<<<<<< HEAD
=======
    setLoadError(null);
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    try {
      const myCard = await getOrCreateMyCard();
      setCard(myCard);

      try {
        const journeys = await journeysRemaining(myCard.cardNumber);
        setRides(journeys);
      } catch {
        setRides(0);
      }

      try {
        const [deductions, orders] = await Promise.all([
          cardHistory(myCard.cardNumber),
          topupsForCard(myCard.cardNumber),
        ]);
        const txs = [
          ...(deductions || []).map(deductionToTx),
          ...(orders || [])
            .filter((o) => o.status === "PAID" || o.status === "REFUNDED")
            .map(orderToTx),
        ].sort((a, b) => new Date(b._at) - new Date(a._at));
        setTransactions(txs);
      } catch {
        setTransactions([]);
      }
<<<<<<< HEAD
=======
    } catch (err) {
      // Card load/create failed entirely (offline, backend down, RLS…) —
      // remember why so screens can show a retry instead of zero balance.
      setLoadError(
        err?.message ||
          "Could not load your card. Check your connection and try again.",
      );
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    } finally {
      setCardBusy(false);
    }
  }, []);

<<<<<<< HEAD
=======
  // ---------------------------------------------------------------------
  // Payment wallet (0016) — per-user saved methods, loaded on sign-in.
  // ---------------------------------------------------------------------
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodsBusy, setPaymentMethodsBusy] = useState(false);

  const refreshPaymentMethods = useCallback(async () => {
    setPaymentMethodsBusy(true);
    try {
      setPaymentMethods(await fetchPaymentMethods());
    } catch {
      setPaymentMethods([]);
    } finally {
      setPaymentMethodsBusy(false);
    }
  }, []);

  const savePaymentMethod = useCallback(
    async (methodInput) => {
      const saved = await addPaymentMethod(methodInput);
      await refreshPaymentMethods();
      return saved;
    },
    [refreshPaymentMethods],
  );

  const removePaymentMethod = useCallback(
    async (id) => {
      await deletePaymentMethod(id);
      await refreshPaymentMethods();
    },
    [refreshPaymentMethods],
  );

  const makeDefaultPaymentMethod = useCallback(
    async (id) => {
      await setDefaultPaymentMethod(id);
      await refreshPaymentMethods();
    },
    [refreshPaymentMethods],
  );

>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
  // Load everything once signed in; re-runs on sign-in/out.
  useEffect(() => {
    let cancelled = false;

    async function loadIfSignedIn() {
<<<<<<< HEAD
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session) return;
      await refreshTrips();
=======
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session) return;
      await refreshTrips();
      refreshPaymentMethods();
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    }
    loadIfSignedIn();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        refreshTrips();
<<<<<<< HEAD
=======
        refreshPaymentMethods();
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
      }
      if (event === "SIGNED_OUT") {
        setCard(null);
        setRides(0);
        setTransactions([]);
<<<<<<< HEAD
=======
        setPaymentMethods([]);
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
      }
    });

    return () => {
      cancelled = true;
      subscription?.subscription?.unsubscribe();
    };
<<<<<<< HEAD
  }, [refreshTrips]);
=======
  }, [refreshTrips, refreshPaymentMethods]);
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

  /** Register an existing unregistered card number to my account (BR-10). */
  const registerCard = useCallback(async (cardNumber) => {
    const updated = await registerCardToMe(cardNumber);
    setCard(updated);
    return updated;
  }, []);

  /**
   * Real tap (BR-07). Returns the Deduction — check `wasTransfer` to show
   * "Free transfer!" (BR-04). Throws ApiError(400) when the card has no
   * usable journey, so UseTicket can say "No balance — top up first".
   */
  const deductRide = useCallback(
    async (title /* routeCode or label from the calling screen */) => {
      if (!card) throw new Error("No card — open the Card tab first");
      const routeCode = title || pass.productCode || "KHA-CPT";
<<<<<<< HEAD
      const deduction = await tapJourney(card.cardNumber, routeCode, "GW-BUS-42", "VAL-01");
      setTransactions((prev) => [deductionToTx(deduction), ...prev]);
=======
      // Phase B: if a driver currently has an active run on this route,
      // tap against THAT bus (real vehicle_runs row); otherwise fall back
      // to the demo vehicle so the validator always has a target.
      let busId = "GW-BUS-42";
      try {
        const live = await fetchLiveRuns(routeCode);
        if (live?.length && live[0].busId) busId = live[0].busId;
      } catch {
        /* live-run lookup is best-effort; tap proceeds on the fallback */
      }
      const deduction = await tapJourney(
        card.cardNumber,
        routeCode,
        busId,
        "VAL-01",
      );
      setTransactions((prev) => [deductionToTx(deduction), ...prev]);
      // Re-read the authoritative balance from the backend (BR-07), so the
      // UI never drifts from what the DB says the card holds.
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
      const journeys = await journeysRemaining(card.cardNumber);
      setRides(journeys);
      return deduction;
    },
    [card, pass.productCode],
  );

  /**
   * Real purchase (Load Trips / Top Up): creates the order and pays it.
   * The backend loads the product onto the card when payment succeeds.
   * Returns the PAID order (receiptReference included).
   */
  const addRides = useCallback(
<<<<<<< HEAD
    async (count, title, passLabel, { productCode, routeCode, amountCents } = {}) => {
      if (!card) throw new Error("No card — open the Card tab first");
      const order = await createTopupOrder(card.cardNumber, productCode, routeCode, amountCents);
      const paid = await payTopupOrder(order.id);
=======
    async (
      count,
      title,
      passLabel,
      { productCode, routeCode, amountCents, paymentMethodId } = {},
    ) => {
      if (!card) throw new Error("No card — open the Card tab first");
      const order = await createTopupOrder(
        card.cardNumber,
        productCode,
        routeCode,
        amountCents,
      );
      const paid = await payTopupOrder(order.id, paymentMethodId);
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
      if (paid.status !== "PAID") {
        throw new Error("Payment was not approved");
      }
      setTransactions((prev) => [orderToTx(paid), ...prev]);
<<<<<<< HEAD
      // Server just mutated balance + products — re-read them.
=======
      // Server just mutated balance + products — re-read them, and drop
      // the fare catalogue so the next Load Trips visit shows fresh prices.
      clearFareCache();
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
      await refreshTrips();
      return paid;
    },
    [card, refreshTrips],
  );

  const value = useMemo(
    () => ({
      rides,
      pass,
      passExpiresOn,
<<<<<<< HEAD
=======
      unlimitedPass,
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
      transactions,
      deductRide,
      addRides,
      card,
      cardBusy,
<<<<<<< HEAD
      refreshTrips,
      registerCard,
      purchase: addRides,
=======
      loadError,
      refreshTrips,
      registerCard,
      purchase: addRides,
      paymentMethods,
      paymentMethodsBusy,
      savePaymentMethod,
      removePaymentMethod,
      makeDefaultPaymentMethod,
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    }),
    [
      rides,
      pass,
      passExpiresOn,
<<<<<<< HEAD
=======
      unlimitedPass,
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
      transactions,
      deductRide,
      addRides,
      card,
      cardBusy,
<<<<<<< HEAD
      refreshTrips,
      registerCard,
=======
      loadError,
      refreshTrips,
      registerCard,
      paymentMethods,
      paymentMethodsBusy,
      savePaymentMethod,
      removePaymentMethod,
      makeDefaultPaymentMethod,
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    ],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
