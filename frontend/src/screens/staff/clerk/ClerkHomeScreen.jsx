import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../../context/auth";
import {
  fetchKioskSalesSummary,
  fetchPendingConcessions,
} from "../../../api/operations";
import KioskActivityFeed from "../../../components/staff/KioskActivityFeed";

/**
 * CLERK — standalone home (Sprint 2 lane of Joshua Black).
 *
 * Why a separate screen instead of a case in the shared home?
 * · The clerk's job is three fast transactions at a counter, not a
 *   generic tools grid — so we surface shortcuts directly into the
 *   Kiosk tabs, skipping the "tap to open kiosk → then pick a tab" step.
 * · Cash today + concessions queue are the KPIs they act on first, in
 *   that order.
 * · The quick actions land straight into the right Kiosk tab via
 *   ?tab=LOAD/ISSUE/REPLACE.
 */
const QUICK_ACTIONS = [
  { tab: "LOAD", label: "Cash load", sub: "Load a product with cash" },
  { tab: "ISSUE", label: "Issue card", sub: "New Gold Card · R40" },
  { tab: "REPLACE", label: "Lost card", sub: "Replace & retire old card" },
];

export default function ClerkHomeScreen() {
  const { user } = useAuth();
  const [sales, setSales] = useState(null);
  const [concessions, setConcessions] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.allSettled([fetchKioskSalesSummary(), fetchPendingConcessions()]).then(([s, q]) => {
      if (!live) return;
      if (s.status === "fulfilled") setSales(s.value);
      if (q.status === "fulfilled") setConcessions(q.value || []);
    });
    return () => {
      live = false;
    };
  }, [refreshKey]);

  const oldest = concessions?.[0];

  return (
    <div className="px-5 pt-2 pb-4">
      <p className="eyebrow text-gold-600">WELCOME BACK</p>
      <h1 className="font-display text-2xl font-bold mt-1">
        {user?.firstName} {user?.surname}
      </h1>
      <p className="text-[13px] text-ink-900/55 mt-1">The kiosk counter — cards, cash loads and concession checks.</p>

      {/* Hero — cash today */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 rounded-3xl border border-gold-400/40 bg-gradient-to-br from-gold-400/20 to-gold-400/5 p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <p className="eyebrow text-ink-900/45">CASH TODAY</p>
        <p className="font-display text-[40px] leading-none font-bold text-ink-900 mt-2">
          {sales ? `R${(sales.cents / 100).toFixed(2)}` : "..."}
        </p>
        <p className="text-[12.5px] text-ink-900/55 mt-1.5">
          {sales ? `${sales.orders} load${sales.orders === 1 ? "" : "s"} + ${sales.fees} card fee${sales.fees === 1 ? "" : "s"}` : "Counting the drawer"}
        </p>
      </motion.div>

      {/* Quick actions — straight into a Kiosk tab, no intermediate tap */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.tab}
            to={`/staff/kiosk?tab=${a.tab}`}
            className="min-h-[84px] rounded-2xl border border-ink-900/10 bg-white p-3.5 flex flex-col justify-between active:scale-[0.97] transition-transform hover:border-gold-400/60"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <span className="text-[12.5px] font-bold text-ink-900 leading-tight">{a.label}</span>
            <span className="text-[10px] text-ink-900/45 leading-snug">{a.sub}</span>
          </Link>
        ))}
      </div>

      {/* Concessions queue — richer than a bare count */}
      <Link
        to="/staff/concessions"
        className="mt-5 block rounded-2xl border border-ink-900/10 bg-white p-4 active:scale-[0.99] transition-transform hover:border-gold-400/60"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center justify-between">
          <p className="eyebrow text-ink-900/45">CONCESSIONS QUEUE</p>
          <span className="font-display text-[15px] font-bold text-ink-900">{concessions ? concessions.length : "..."}</span>
        </div>
        {concessions && concessions.length > 0 ? (
          <p className="text-[12.5px] text-ink-900/60 mt-1.5">
            Oldest: <span className="font-semibold text-ink-900">{oldest ? `${oldest.first_name} ${oldest.surname}` : "Pending request"}</span>
            {oldest?.concession_type && ` · ${oldest.concession_type}`}
          </p>
        ) : concessions ? (
          <p className="text-[12.5px] text-emerald-700 mt-1.5">No pending requests</p>
        ) : (
          <p className="text-[12.5px] text-ink-900/40 mt-1.5">Loading...</p>
        )}
      </Link>

      {/* Mini recent-activity preview */}
      <div className="mt-5 rounded-2xl border border-ink-900/10 bg-white p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="eyebrow text-ink-900/45">RECENT ACTIVITY</p>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="text-[11px] font-semibold text-gold-600 hover:text-gold-700"
          >
            Refresh
          </button>
        </div>
        <div className="max-h-[220px] overflow-y-auto no-scrollbar">
          <KioskActivityFeed refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
