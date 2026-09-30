import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTrips } from "../../../context/trip";
import RouteStep from "./components/RouteStep";
import PaymentStep from "./components/PaymentStep";
import AddCardDrawer from "./components/AddCardDrawer";
import ReviewStep from "./components/ReviewStep";
import ConfirmationStep from "./components/ConfirmationStep";
import ReceiptView from "./components/ReceiptView";
import {
  fetchRoutes,
  fetchProducts,
  fetchQuote,
  MAX_SAVED_CARDS,
  BR03_MESSAGE,
} from "./data/loadTripsData";

/**
 * Load Trips — the real purchase flow against the GoldenWay backend:
 *   1. Route        live routes, live plans per route, save-vs-cash
 *                   quote (BR-09 price authority, BR-03 exclusions)
 *   2. Payment      the user's saved payment methods (0016 wallet)
 *   3. Review       quote total in cents, GABS savings messaging
 *   4. Confirmation real TopUpOrder: order → pay → product loaded onto
 *                   the card; receipt reference comes from the database.
 */
export default function LoadtripsScreen() {
  const navigate = useNavigate();
  const { purchase, paymentMethods, savePaymentMethod, removePaymentMethod } =
    useTrips();

  const [phase, setPhase] = useState("route"); // route | payment | review | confirmation | receipt
  const [routes, setRoutes] = useState([]);
  const [routesBusy, setRoutesBusy] = useState(true);
  const [routesError, setRoutesError] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [products, setProducts] = useState([]);
  const [productsBusy, setProductsBusy] = useState(false);
  const [planId, setPlanId] = useState("");

  const [quote, setQuote] = useState(null);
  const [quoteBusy, setQuoteBusy] = useState(false);

  const [selectedCardId, setSelectedCardId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [cardError, setCardError] = useState("");
  const [receipt, setReceipt] = useState(null);

  const topRef = useRef(null);
  const mountedRef = useRef(true);

  // Change step and reset scroll so the new step always starts at the top.
  const goTo = useCallback((next) => {
    setPhase(next);
    topRef.current?.scrollIntoView({ block: "start" });
  }, []);

  // Mirror the DB wallet (0016) into the step-component card shape.
  const cards = useMemo(
    () =>
      paymentMethods.map((m) => ({
        id: m.id,
        brand:
          m.brand === "VISA"
            ? "Visa"
            : m.brand === "MASTERCARD"
              ? "Mastercard"
              : "Card",
        last4: m.last4,
        expiry: `${String(m.expMonth).padStart(2, "0")}/${String(m.expYear).slice(-2)}`,
        isDefault: m.isDefault,
      })),
    [paymentMethods],
  );

  useEffect(() => {
    setSelectedCardId((prev) => {
      if (cards.some((c) => c.id === prev)) return prev;
      const def = cards.find((c) => c.isDefault) || cards[0];
      return def ? def.id : "";
    });
  }, [cards]);

  const selectedCard = cards.find((c) => c.id === selectedCardId) || null;

  // 1. Live route catalogue — on mount, and again on "Try again".
  const loadRoutes = useCallback(async () => {
    setRoutesBusy(true);
    setRoutesError("");
    try {
      const list = await fetchRoutes();
      if (!mountedRef.current) return;
      setRoutes(list);
      if (list.length) {
        setFrom(list[0].from);
        setTo(list[0].to);
      }
    } catch {
      if (mountedRef.current)
        setRoutesError("Could not load the route catalogue. Please try again.");
    } finally {
      if (mountedRef.current) setRoutesBusy(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadRoutes();
    return () => {
      mountedRef.current = false;
    };
  }, [loadRoutes]);

  const route = useMemo(
    () => routes.find((r) => r.from === from && r.to === to) || null,
    [routes, from, to],
  );

  // 2. Live plans for the selected route.
  useEffect(() => {
    if (!route) {
      setProducts([]);
      setPlanId("");
      return;
    }
    let cancelled = false;
    setProductsBusy(true);
    fetchProducts(route.code)
      .then((list) => {
        if (cancelled) return;
        // BR-03: Go Easy is not sold on excluded routes.
        const visible = route.goEasyEligible
          ? list
          : list.filter((p) => !p.goEasy);
        setProducts(visible);
        setPlanId(visible.length ? visible[0].id : "");
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setProductsBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route]);

  const plan = useMemo(
    () => products.find((p) => p.id === planId) || null,
    [products, planId],
  );

  // 3. Save-vs-cash quote for the selection. The old quote is cleared
  //    immediately so a stale price can never be shown for a new plan.
  useEffect(() => {
    setQuote(null);
    if (!route || !plan) return;
    let cancelled = false;
    setQuoteBusy(true);
    fetchQuote(route.code, plan.id)
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setQuoteBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route, plan]);

  const totalCents = quote?.priceCents ?? plan?.priceCents ?? 0;

  async function handleAddCard(newCard) {
    if (cards.length >= MAX_SAVED_CARDS || savingCard) return;
    setCardError("");
    setSavingCard(true);
    try {
      const saved = await savePaymentMethod(newCard);
      setSelectedCardId(saved.id);
      setDrawerOpen(false);
    } catch (err) {
      // Surface save failures right in the drawer (e.g. migration 0016
      // not applied, RLS denial) instead of failing silently.
      setCardError(
        err?.message || "Could not save the card. Please try again.",
      );
    } finally {
      setSavingCard(false);
    }
  }

  // 4. Real purchase: order → pay → product loaded on the card.
  const handlePayNow = useCallback(async () => {
    if (!route || !plan || paying) return;
    setPaying(true);
    setPayError("");
    try {
      const order = await purchase(plan.trips, plan.label, plan.label, {
        productCode: plan.id,
        routeCode: route.code,
        amountCents: totalCents,
        paymentMethodId: selectedCardId || null,
      });
      setReceipt({
        reference: order.receiptReference,
        routeLabel: route.label,
        from: route.from,
        to: route.to,
        planLabel: plan.label,
        planTrips: plan.trips,
        planValidDays: plan.validDays,
        transfersAllowed: plan.transfersAllowed,
        card: selectedCard,
        totalCents,
        savingsCents: quote?.savingsCents ?? 0,
        dateLabel: new Date().toLocaleString("en-ZA", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      goTo("confirmation");
    } catch (err) {
      setPayError(
        err?.status === 400
          ? "The load was rejected — check that this product is still valid for the route."
          : err?.message || "Payment could not be completed. Please try again.",
      );
    } finally {
      setPaying(false);
    }
  }, [
    route,
    plan,
    paying,
    purchase,
    totalCents,
    quote,
    selectedCard,
    selectedCardId,
    goTo,
  ]);

  function handleBackToHome() {
    setPhase("route");
    navigate("/home");
  }

  const origins = useMemo(
    () => [...new Set(routes.map((r) => r.from))].sort(),
    [routes],
  );
  const destinations = useMemo(
    () =>
      [
        ...new Set(routes.filter((r) => r.from === from).map((r) => r.to)),
      ].sort(),
    [routes, from],
  );

  return (
    <div className="relative">
      <div ref={topRef} aria-hidden="true" />
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {phase === "route" && (
            <RouteStep
              origins={origins}
              destinations={destinations}
              from={from}
              to={to}
              route={route}
              planId={planId}
              products={products}
              productsBusy={productsBusy}
              onBack={() => navigate(-1)}
              routesBusy={routesBusy}
              routesError={routesError}
              quote={quote}
              quoteBusy={quoteBusy}
              onChangeFrom={(next) => {
                setFrom(next);
                const firstTo = routes.find((r) => r.from === next)?.to || "";
                setTo(firstTo);
              }}
              onChangeTo={setTo}
              onChangePlan={setPlanId}
              onRetryRoutes={loadRoutes}
              onContinue={() => goTo("payment")}
            />
          )}

          {phase === "payment" && (
            <PaymentStep
              route={route}
              plan={plan}
              quote={quote}
              totalCents={totalCents}
              onRemoveCard={removePaymentMethod}
              cards={cards}
              selectedCardId={selectedCardId}
              onSelectCard={setSelectedCardId}
              onOpenAddCard={() => setDrawerOpen(true)}
              onBackToRoute={() => goTo("route")}
              onContinue={() => goTo("review")}
            />
          )}

          {phase === "review" && (
            <ReviewStep
              route={route}
              plan={plan}
              quote={quote}
              totalCents={totalCents}
              card={selectedCard}
              payError={payError}
              paying={paying}
              onChangePayment={() => goTo("payment")}
              onPayNow={handlePayNow}
            />
          )}

          {phase === "confirmation" && receipt && (
            <ConfirmationStep
              receipt={receipt}
              onBackToHome={handleBackToHome}
              onViewReceipt={() => goTo("receipt")}
            />
          )}

          {phase === "receipt" && receipt && (
            <ReceiptView
              receipt={receipt}
              onBack={() => goTo("confirmation")}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <AddCardDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setCardError("");
        }}
        onSave={handleAddCard}
        error={cardError}
        saving={savingCard}
      />
    </div>
  );
}

export { BR03_MESSAGE };
