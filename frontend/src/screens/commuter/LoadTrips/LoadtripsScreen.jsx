import { useCallback, useEffect, useMemo, useState } from "react";
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
  INITIAL_CARDS,
  MAX_SAVED_CARDS,
  BR03_MESSAGE,
} from "./data/loadTripsData";

/**
 * Load Trips — the real purchase flow against the GoldenWay backend:
 *   1. Route        live routes from /fares/routes, live plans per route,
 *                   save-vs-cash quote from /fares/quote (BR-09, BR-03)
 *   2. Payment      demo wallet (no payment-card backend yet)
 *   3. Review       quote total in cents, GABS savings messaging
 *   4. Confirmation real TopUpOrder: order → pay → product loaded onto
 *                   the card; receipt reference comes from the database.
 */
export default function LoadtripsScreen() {
  const navigate = useNavigate();
  const { purchase } = useTrips();

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
  const [, setQuoteBusy] = useState(false);

  const [cards, setCards] = useState(INITIAL_CARDS);
  const [selectedCardId, setSelectedCardId] = useState(INITIAL_CARDS[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [receipt, setReceipt] = useState(null);

  const selectedCard = cards.find((c) => c.id === selectedCardId) || cards[0];

  // 1. Live route catalogue on mount.
  useEffect(() => {
    let cancelled = false;
    setRoutesBusy(true);
    fetchRoutes()
      .then((list) => {
        if (cancelled) return;
        setRoutes(list);
        if (list.length) {
          setFrom(list[0].from);
          setTo(list[0].to);
        }
      })
      .catch(() => {
        if (!cancelled)
          setRoutesError("Could not load the route catalogue. Pull down to retry.");
      })
      .finally(() => {
        if (!cancelled) setRoutesBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // 3. Save-vs-cash quote for the selection.
  useEffect(() => {
    if (!route || !plan) {
      setQuote(null);
      return;
    }
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

  function handleAddCard(newCard) {
    if (cards.length >= MAX_SAVED_CARDS) return;
    setCards((prev) => [...prev, newCard]);
    setSelectedCardId(newCard.id);
    setDrawerOpen(false);
  }

  // 4. Real purchase: order → pay → product loaded on the card.
  const handlePayNow = useCallback(async () => {
    if (!route || !plan || paying) return;
    setPaying(true);
    setPayError("");
    try {
      const order = await purchase(plan.trips, plan.label, plan.label, {
        productCode: plan.id,
        routeCode: plan.family === "GO_EASY" ? route.code : route.code,
        amountCents: totalCents,
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
      setPhase("confirmation");
    } catch (err) {
      setPayError(
        err?.status === 400
          ? "The load was rejected — check that this product is still valid for the route."
          : err?.message || "Payment could not be completed. Please try again.",
      );
    } finally {
      setPaying(false);
    }
  }, [route, plan, paying, purchase, totalCents, quote, selectedCard]);

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
      [...new Set(routes.filter((r) => r.from === from).map((r) => r.to))].sort(),
    [routes, from],
  );

  return (
    <div className="relative">
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
              routesBusy={routesBusy}
              routesError={routesError}
              quote={quote}
              onChangeFrom={(next) => {
                setFrom(next);
                const firstTo =
                  routes.find((r) => r.from === next)?.to || "";
                setTo(firstTo);
              }}
              onChangeTo={setTo}
              onChangePlan={setPlanId}
              onRetryRoutes={() => window.location.reload()}
              onContinue={() => setPhase("payment")}
            />
          )}

          {phase === "payment" && (
            <PaymentStep
              route={route}
              plan={plan}
              quote={quote}
              totalCents={totalCents}
              cards={cards}
              selectedCardId={selectedCardId}
              onSelectCard={setSelectedCardId}
              onOpenAddCard={() => setDrawerOpen(true)}
              onBackToRoute={() => setPhase("route")}
              onContinue={() => setPhase("review")}
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
              onChangePayment={() => setPhase("payment")}
              onPayNow={handlePayNow}
            />
          )}

          {phase === "confirmation" && receipt && (
            <ConfirmationStep
              receipt={receipt}
              onBackToHome={handleBackToHome}
              onViewReceipt={() => setPhase("receipt")}
            />
          )}

          {phase === "receipt" && receipt && (
            <ReceiptView
              receipt={receipt}
              onBack={() => setPhase("confirmation")}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <AddCardDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleAddCard}
      />
    </div>
  );
}

export { BR03_MESSAGE };
