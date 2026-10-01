import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TicketCard from "../../../components/TicketCard";
import { useTrips } from "../../../context/trip";
import { ApiError } from "../../../api/client";
import { fetchRoutes } from "../LoadTrips/data/loadTripsData";

const VALIDATOR_DELAY_MS = 2600;

/**
 * Simulated bus validator wired to the real tap endpoint (BR-07). Thandi
 * picks the route she is boarding, taps, and the backend decides whether
 * it's a journey or a free transfer (BR-04). A no-balance card routes her
 * straight to the top-up flow instead of failing silently.
 */
export default function UseTicketScreen() {
  const navigate = useNavigate();
  const { rides, pass, deductRide, card, cardBusy } = useTrips();
  const [routeCode, setRouteCode] = useState("");
  const [routes, setRoutes] = useState([]);
  const [tapping, setTapping] = useState(false);
  const [error, setError] = useState("");

  // Real routes for the picker, Go-Easy-eligible ones first.
  useEffect(() => {
    let cancelled = false;
    fetchRoutes()
      .then((list) => {
        if (cancelled) return;
        const eligible = list.filter((r) => r.goEasyEligible);
        setRoutes(eligible.length ? eligible : list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.code === routeCode) || null,
    [routes, routeCode],
  );

  async function confirmTap() {
    if (!selectedRoute || tapping) return;
    setTapping(true);
    setError("");
    try {
      const deduction = await deductRide(selectedRoute.code);
      navigate("/ride-success", {
        replace: true,
        state: { deduction, routeLabel: selectedRoute.label },
      });
    } catch (err) {
      setTapping(false);
      if (err instanceof ApiError && err.status === 400) {
        setError("No journeys left on this card — top up to keep riding.");
      } else {
        setError(err?.message || "The validator did not respond. Try again.");
      }
    }
  }

  const noBalance = !cardBusy && card && rides <= 0;

  return (
    <div className="flex flex-col items-center px-6 pb-8 min-h-full">
      <div className="flex items-center gap-2 w-full pb-4">
        <BackButton onClick={() => navigate("/card")} />
        <h1 className="font-display text-lg font-bold text-gold-500">
          Use Bus Ticket
        </h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
        <motion.div
          animate={tapping ? { scale: [1, 1.06, 1] } : { y: [0, -4, 0] }}
          transition={
            tapping
              ? { duration: 0.5 }
              : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          }
          className="w-full max-w-[300px]"
        >
          <TicketCard />
        </motion.div>

        {/* Which bus are you boarding? */}
        <div className="w-full flex flex-col gap-1.5">
          <label
            htmlFor="tap-route"
            className="text-[11px] font-semibold tracking-wide text-slate-500"
          >
            BOARDING ROUTE
          </label>
          <div className="field-shell">
            <PinIcon />
            <select
              id="tap-route"
              value={routeCode}
              onChange={(e) => setRouteCode(e.target.value)}
              className="w-full py-3.5 text-[15px] text-ink-900 bg-transparent outline-none appearance-none"
            >
              <option value="">Choose your route…</option>
              {routes.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} — {r.from} → {r.to}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </div>
        </div>

        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-ink-900 leading-snug">
            {tapping
              ? "Ticket validated"
              : noBalance
                ? "Your card is empty"
                : `${rides} ${rides === 1 ? "journey" : "journeys"} ready`}
          </h2>
          <p className="mt-2 flex items-center justify-center gap-2 text-[13px] text-slate-500">
            {tapping ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Validating&hellip;
              </>
            ) : noBalance ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {pass.label}
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-pulse" />
                {pass.active ? pass.label : "Waiting for reader…"}
              </>
            )}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="w-full rounded-xl border border-brand-500/25 bg-brand-50 px-4 py-3 text-[12px] font-medium text-brand-600 text-center"
          >
            {error}
          </div>
        )}
      </div>

      {noBalance && !tapping ? (
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => navigate("/load-trips")}
          className="btn-gold mt-2 w-full py-4 text-[15px]"
        >
          Top Up Now
        </motion.button>
      ) : (
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          disabled={!selectedRoute || tapping}
          onClick={confirmTap}
          className="btn-gold mt-2 w-full py-4 text-[15px] disabled:opacity-40"
        >
          {tapping ? "Validating…" : "Tap to Validate"}
        </motion.button>
      )}

      <div className="card w-full mt-4 px-4 py-3.5 flex items-start gap-3">
        <span className="h-8 w-8 rounded-full bg-cream-200 flex items-center justify-center shrink-0">
          <InfoIcon />
        </span>
        <p className="text-[12px] text-slate-500 leading-relaxed">
          Tap once per journey. If you change buses within 60 minutes, your
          transfer is free.
        </p>
      </div>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-ink-900 text-xl leading-none px-1 -ml-1"
      aria-label="Back"
    >
      &larr;
    </button>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-gold-500 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-slate-400 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-gold-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 11v5" strokeLinecap="round" />
    </svg>
  );
}
