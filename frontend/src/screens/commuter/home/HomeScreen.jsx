import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MapCanvas from "../../../components/MapCanvas";
import TransactionRow from "../../../components/TransactionRow";
import { useTrips } from "../../../context/trip";
import { fetchLiveAlerts } from "../../../api/goldenway";

/**
 * Home — answers Thandi's first three questions in five seconds:
 *   1. "Can I still get to work?"  → live journey balance
 *   2. "Is my bus running?"        → live GABS service alerts
 *   3. "Am I saving?"              → Gold Card vs cash messaging
 */
export default function HomeScreen() {
  const navigate = useNavigate();
  const { rides, pass, transactions, card, cardBusy, passExpiresOn } = useTrips();
  const [alerts, setAlerts] = useState([]);
  const recent = transactions.slice(0, 3);

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

  return (
    <div className="flex flex-col gap-5 px-5 pb-6">
      {/* Live GABS service alerts */}
      {alerts.length > 0 && (
        <button
          type="button"
          onClick={() => navigate("/alerts")}
          className="flex items-start gap-2.5 rounded-xl border border-brand-500/25 bg-brand-50 px-4 py-3 text-left"
        >
          <AlertIcon />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold tracking-wide text-brand-600">
              SERVICE ALERT
            </span>
            <span className="block text-[12px] font-medium text-ink-900 truncate">
              {alerts[0].title || alerts[0].body || "Service notice for your routes"}
            </span>
          </span>
          {alerts.length > 1 && (
            <span className="text-[11px] font-semibold text-brand-600 shrink-0">
              +{alerts.length - 1}
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
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-bold text-gold-500 leading-none">
                {rides}
              </span>
              <span className="font-display text-[15px] font-semibold text-ink-900">
                {rides === 1 ? "Journey" : "Journeys"} Left
              </span>
            </div>
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

      {/* Live map */}
      <button
        type="button"
        onClick={() => navigate("/route-42")}
        className="relative h-44 overflow-hidden rounded-2xl border border-ink-900/5 text-left"
        style={{ boxShadow: "var(--shadow-card-lg)" }}
        aria-label="Open live route tracking"
      >
        <MapCanvas />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold tracking-wide text-brand-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
          LIVE TRACKING
        </span>
      </button>

      {/* Current route card */}
      <div className="card px-4 py-4 flex items-center gap-3">
        <span className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #ffd873, #f0b429)", boxShadow: "var(--shadow-glow-gold)", color: "var(--color-ink-900)" }}>
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
          <QuickAction
            label="Top Up"
            onClick={() => navigate("/load-trips")}
          />
          <QuickAction
            label="Support"
            onClick={() => navigate("/support")}
          />
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
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="12" rx="2.2" />
        <path d="M14 7.5v9" strokeLinecap="round" strokeDasharray="1.6 2.2" />
      </svg>
    );
  if (label === "Top Up")
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    );
  if (label === "Timetable")
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="5" width="16" height="16" rx="2.2" />
        <path d="M4 10h16M8 3v4M16 3v4" strokeLinecap="round" />
        <path d="M8.5 15.5h.01M15.5 15.5h.01" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  if (label === "Buy Pass")
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.2a1.6 1.6 0 0 0 0 3.1V15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.7a1.6 1.6 0 0 0 0-3.1V9z" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
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
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-900" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="12" rx="2.5" />
      <path d="M4 12h16M8 17v2M16 17v2" strokeLinecap="round" />
    </svg>
  );
}

function PassIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="6" width="18" height="12" rx="2.2" />
      <path d="M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l10 18H2L12 3z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17.5v.01" strokeLinecap="round" />
    </svg>
  );
}
