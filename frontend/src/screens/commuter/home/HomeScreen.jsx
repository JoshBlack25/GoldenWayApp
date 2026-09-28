import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TransactionRow from "../../../components/TransactionRow";
import TripLoadError from "../../../components/TripLoadError";
import { useTrips } from "../../../context/trip";
import { useAuth } from "../../../context/auth";
import {
  fetchLiveAlerts,
  fetchRoutesFromDb,
  fetchDepartures,
  serviceDayFor,
} from "../../../api/goldenway";
import { fetchLiveRunsForRoutes } from "../../../api/operations";
import {
  activeRouteCodes,
  nextDeparture,
  routeStatus,
} from "../../../utils/myRoutes";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Home — answers a commuter's first questions in five seconds:
 *   1. "Can I still get to work?"  → live journey balance
 *   2. "Is my bus running?"        → alerts + status for MY routes
 *   3. "When's the next one?"      → next departure per route
 */
export default function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    rides,
    pass,
    transactions,
    card,
    cardBusy,
    passExpiresOn,
    unlimitedPass,
  } = useTrips();
  const [alerts, setAlerts] = useState([]);
  const recent = transactions.slice(0, 3);
  const myRouteCodes = useMemo(() => activeRouteCodes(card), [card]);

  useEffect(() => {
    let cancelled = false;
    fetchLiveAlerts()
      .then((list) => {
        if (!cancelled) setAlerts(list || []);
      })
      .catch(() => {
        // Alerts are additive; Home still works without them.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Only alerts that affect this commuter: network-wide, or on a route
  // they hold a live product for.
  const relevantAlerts = useMemo(
    () =>
      alerts.filter((a) => !a.routeCode || myRouteCodes.includes(a.routeCode)),
    [alerts, myRouteCodes],
  );

  return (
    <div className="flex flex-col gap-5 px-5 pb-6">
      <div>
        <p className="text-[12px] text-slate-500">{greeting()}</p>
        <h1 className="font-display text-[20px] font-bold text-ink-900 leading-tight">
          {user?.firstName || "Welcome"}
        </h1>
      </div>

      {/* Card/balance load failure — never show a silent zero balance */}
      <TripLoadError />

      {/* Live service alerts that affect me */}
      {relevantAlerts.length > 0 && (
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          className="flex items-start gap-2.5 rounded-xl border border-brand-500/25 bg-brand-50 px-4 py-3 text-left"
        >
          <AlertIcon />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold tracking-wide text-brand-600">
              SERVICE ALERT
            </span>
            <span className="block text-[12px] font-medium text-ink-900 truncate">
              {relevantAlerts[0].title ||
                relevantAlerts[0].body ||
                "Service notice for your routes"}
            </span>
          </span>
          {relevantAlerts.length > 1 && (
            <span className="text-[11px] font-semibold text-brand-600 shrink-0">
              +{relevantAlerts.length - 1}
            </span>
          )}
        </button>
      )}

      {/* Rides remaining + pass — the "can I get to work" answer */}
      <div className="card-lg px-5 py-5 flex flex-col items-center text-center">
        {cardBusy && !card ? (
          <div className="py-2 text-[13px] text-slate-400">
            Loading your balance…
          </div>
        ) : (
          <>
            {unlimitedPass ? (
              <>
                <span className="font-display text-3xl font-bold text-gold-500 leading-none">
                  Unlimited
                </span>
                <span className="mt-1.5 font-display text-[15px] font-semibold text-ink-900">
                  rides on {unlimitedPass.routeCode}
                </span>
                {rides > 0 && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    + {rides} Go Easy {rides === 1 ? "journey" : "journeys"}
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-bold text-gold-500 leading-none">
                  {rides}
                </span>
                <span className="font-display text-[15px] font-semibold text-ink-900">
                  {rides === 1 ? "Journey" : "Journeys"} Left
                </span>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 rounded-full bg-cream-100 border border-gold-500/20 px-3 py-1">
              <PassIcon />
              <span className="text-[11px] font-semibold text-ink-900">
                {pass.active ? `${pass.label} — Active` : pass.label}
              </span>
            </div>
            {pass.active && passExpiresOn && (
              <p className="mt-2 text-[11px] text-slate-500">
                Valid until{" "}
                {new Date(passExpiresOn).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            )}
            {!pass.active && rides <= 0 && (
              <button
                type="button"
                onClick={() => navigate("/load-trips")}
                className="mt-3 w-full btn-gold py-3 text-[14px]"
              >
                Load Trips
              </button>
            )}
          </>
        )}
      </div>

      {/* My routes — live status + next departure */}
      <YourRoutesCard
        loading={cardBusy && !card}
        routeCodes={myRouteCodes}
        onOpenAll={() => navigate("/routes")}
        onOpenRoute={(code) => navigate(`/routes/${code}`)}
      />

      {/* Gold card */}
      <div className="card px-4 py-4 flex items-center gap-3">
        <span
          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, #ffd873, #f0b429)",
            boxShadow: "var(--shadow-glow-gold)",
            color: "var(--color-ink-900)",
          }}
        >
          <BusIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-wide text-gold-600">
            YOUR GOLD CARD
          </p>
          <p className="font-display text-[16px] font-bold text-ink-900 leading-tight truncate">
            {card ? `${card.cardNumber.slice(0, 8)}••••` : "GW-••••-••••"}
          </p>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Balance protected · free transfers included
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/card")}
          className="text-[12px] font-semibold text-gold-600 shrink-0"
        >
          View
        </button>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display text-[15px] font-bold text-ink-900 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            label="Use Ticket"
            onClick={() => navigate("/use-ticket")}
          />
          <QuickAction
            label="Timetable"
            onClick={() => navigate("/timetable")}
          />
          <QuickAction label="Top Up" onClick={() => navigate("/load-trips")} />
          <QuickAction label="Support" onClick={() => navigate("/support")} />
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[15px] font-bold text-ink-900">
            Recent Activity
          </h2>
          <button
            type="button"
            onClick={() => navigate("/history")}
            className="text-[12px] font-semibold text-gold-600"
          >
            View All
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {recent.length === 0 && (
            <p className="rounded-xl bg-white border border-ink-900/5 px-4 py-5 text-center text-[13px] text-slate-500">
              Your journeys and top-ups will appear here.
            </p>
          )}
          {recent.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              onClick={() => navigate("/history")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function YourRoutesCard({ loading, routeCodes, onOpenAll, onOpenRoute }) {
  const [routes, setRoutes] = useState([]);
  const [live, setLive] = useState({});
  const [next, setNext] = useState({});

  useEffect(() => {
    if (routeCodes.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const shown = routeCodes.slice(0, 3);
        const [all, liveMap] = await Promise.all([
          fetchRoutesFromDb(),
          fetchLiveRunsForRoutes(shown),
        ]);
        if (cancelled) return;
        setRoutes(all.filter((r) => shown.includes(r.code)));
        setLive(liveMap);
        const entries = await Promise.all(
          shown.map(async (code) => {
            const deps = await fetchDepartures(
              code,
              "OUTBOUND",
              serviceDayFor(),
            ).catch(() => []);
            return [code, nextDeparture(deps)];
          }),
        );
        if (!cancelled) setNext(Object.fromEntries(entries));
      } catch {
        // Additive card — Home still works without it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeCodes]);

  // Early returns come AFTER the hooks above (rules of hooks).
  if (loading) {
    return (
      <div className="card px-4 py-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-10 w-full mt-3" />
      </div>
    );
  }

  if (routeCodes.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpenAll}
        className="card px-4 py-4 text-left flex items-center justify-between"
      >
        <span>
          <span className="block text-[10px] font-bold tracking-wide text-gold-600">
            YOUR ROUTES
          </span>
          <span className="block text-[13px] text-slate-500 mt-0.5">
            Load a trip to see live status for your route.
          </span>
        </span>
        <span className="text-[12px] font-semibold text-gold-600 shrink-0">
          Browse
        </span>
      </button>
    );
  }

  return (
    <div className="card px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold tracking-wide text-gold-600">
          YOUR ROUTES
        </p>
        <button
          type="button"
          onClick={onOpenAll}
          className="text-[12px] font-semibold text-gold-600"
        >
          See all
        </button>
      </div>
      <div className="flex flex-col divide-y divide-ink-900/5">
        {routes.map((r) => {
          const status = routeStatus(live[r.code]);
          const n = next[r.code];
          return (
            <button
              key={r.code}
              type="button"
              onClick={() => onOpenRoute(r.code)}
              className="flex items-center gap-3 py-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink-900 truncate">
                  {r.origin} → {r.destination}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  {n
                    ? n.mins === 0
                      ? "Departing now"
                      : `Next bus in ${n.mins} min · ${n.time}`
                    : "No more departures today"}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${status.className}`}
              >
                {status.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuickAction({ label, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="flex items-center justify-center gap-2 rounded-xl bg-white border border-gold-500/30 py-3.5 text-[13px] font-semibold text-ink-900 shadow-[var(--shadow-card)] transition-all hover:border-gold-500 hover:-translate-y-px active:scale-[0.98]"
    >
      <ActionIcon label={label} />
      {label}
    </motion.button>
  );
}

function ActionIcon({ label }) {
  const cls = "h-4 w-4 text-gold-600";
  if (label === "Use Ticket")
    return (
      <svg
        viewBox="0 0 24 24"
        className={cls}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="6" width="18" height="12" rx="2.2" />
        <path d="M14 7.5v9" strokeLinecap="round" strokeDasharray="1.6 2.2" />
      </svg>
    );
  if (label === "Top Up")
    return (
      <svg
        viewBox="0 0 24 24"
        className={cls}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    );
  if (label === "Timetable")
    return (
      <svg
        viewBox="0 0 24 24"
        className={cls}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="4" y="5" width="16" height="16" rx="2.2" />
        <path d="M4 10h16M8 3v4M16 3v4" strokeLinecap="round" />
        <path
          d="M8.5 15.5h.01M15.5 15.5h.01"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 24 24"
      className={cls}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.9-.9L3 20l1-4.9a8.4 8.4 0 1 1 17-3.6z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-ink-900"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="5" width="16" height="12" rx="2.5" />
      <path d="M4 12h16M8 17v2M16 17v2" strokeLinecap="round" />
    </svg>
  );
}

function PassIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 text-gold-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="6" width="18" height="12" rx="2.2" />
      <path d="M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-brand-500 shrink-0 mt-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3l10 18H2L12 3z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17.5v.01" strokeLinecap="round" />
    </svg>
  );
}
