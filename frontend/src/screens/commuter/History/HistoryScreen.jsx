import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTrips } from "../../../context/trip";

export default function HistoryScreen() {
  const navigate = useNavigate();
  const { transactions, rides } = useTrips();
  const [query, setQuery] = useState("");

  // Real stats from the live feed: ride events this month + hours on the road
  // (rough 45 min per trip, the GABS cross-town average).
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyTrips = transactions.filter(
    (tx) =>
      tx.type === "ride" && tx._at && new Date(tx._at) >= monthStart,
  ).length;
  const hoursCommuting = Math.round(monthlyTrips * 0.75);

  const filtered = useMemo(() => {
    if (!query.trim()) return transactions;
    const q = query.toLowerCase();
    return transactions.filter((tx) => tx.title.toLowerCase().includes(q));
  }, [transactions, query]);

  return (
    <div className="flex flex-col px-5 pb-6">
      <div className="flex items-center justify-between pb-4">
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-gold-500">
          <ClockIcon /> History
        </h1>
        <span className="text-slate-400" aria-hidden="true">
          <SearchIcon />
        </span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2.5 rounded-xl border border-ink-900/10 bg-cream-100 px-4">
        <SearchIcon small />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a route or trip ID..."
          className="w-full py-3.5 text-[14px] text-ink-900 placeholder:text-slate-400 bg-transparent outline-none"
          aria-label="Search trips"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <StatCard
          label="MONTHLY TRIPS"
          value={String(monthlyTrips)}
          border="border-l-2 border-l-gold-500"
        />
        <StatCard
          label="TIME COMMUTING"
          value={String(hoursCommuting)}
          unit="HR"
          border="border-l-2 border-l-teal-500"
        />
      </div>

      {/* Recent trips */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[15px] font-bold text-ink-900">
            Recent Trips
          </h2>
          <button type="button" className="text-[12px] font-semibold text-gold-600">
            Download PDF
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {filtered.length === 0 && (
            <p className="rounded-xl bg-white border border-ink-900/5 px-4 py-6 text-center text-[13px] text-slate-500">
              No trips yet — your taps and top-ups will show up here.
            </p>
          )}
          {filtered.map((tx) => (
            <motion.button
              key={tx.id}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/trip")}
              className="w-full text-left flex items-center gap-3 rounded-xl border border-ink-900/5 bg-white px-3.5 py-3 transition-colors hover:border-gold-500/40"
            >
              <span className="h-9 w-9 rounded-full bg-cream-200 flex items-center justify-center shrink-0">
                <BusIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink-900 truncate">
                  {tx.title}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  {tx.meta}
                </span>
              </span>
              <span
                className={`text-[12px] font-semibold shrink-0 ${
                  tx.negative ? "text-red-500" : "text-emerald-600"
                }`}
              >
                {tx.amount}
              </span>
            </motion.button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-[13px] text-slate-400 py-6">
              No trips match &ldquo;{query}&rdquo;.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, border }) {
  return (
    <div className={`rounded-xl bg-white border border-ink-900/5 ${border} px-4 py-3.5`}>
      <p className="text-[10px] font-semibold tracking-wide text-slate-500">
        {label}
      </p>
      <p className="font-display text-2xl font-bold text-ink-900 mt-1">
        {value}
        {unit && (
          <span className="ml-1 text-[11px] font-semibold text-teal-600">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

function BusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="12" rx="2.5" />
      <path d="M4 12h16M8 17v2M16 17v2" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ small }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={small ? "h-4 w-4 text-slate-400 shrink-0" : "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" strokeLinecap="round" />
    </svg>
  );
}
