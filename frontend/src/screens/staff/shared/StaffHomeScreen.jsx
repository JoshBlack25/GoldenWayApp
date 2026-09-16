import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../../context/auth";
import { tabsForRole, Icons } from "../../../config/navigation";
import {
  fetchPendingConcessions,
  fetchKioskSalesSummary,
  fetchMySalesToday,
  fetchMyRuns,
} from "../../../api/operations";

/**
 * Staff dashboard landing (inside StaffLayout chrome). Each role sees a
 * greeting + its tool cards, driven by the same navigation config that
 * renders the role's tab bar — one source of truth.
 *
 * Sprint 2 §3.2: the strip under the greeting is the role's live data —
 * CLERK (K1) ships first: today's cash takings, receipts and the
 * concessions queue depth. Other lanes plug in their own ClerkStrip-style
 * component without touching this file's structure.
 */
const ROLE_BLURB = {
  ADMIN: "Runs the network: people, prices, timetables and alerts.",
  CLERK: "The kiosk counter: cards, cash loads and concession checks.",
  INSPECTOR: "Revenue protection: verify cards on board (BR-08).",
  DRIVER: "The road: run your route and keep commuters informed.",
  AGENT: "The voice: help commuters get where they're going.",
};

export default function StaffHomeScreen() {
  const { user } = useAuth();
  const role = user?.role || "STAFF";
  const tabs = tabsForRole(role).filter((t) => t.to !== "/staff");

  return (
    <div className="px-5 pt-2">
      <p className="eyebrow text-gold-600">WELCOME BACK</p>
      <h1 className="font-display text-2xl font-bold mt-1">
        {user?.firstName} {user?.surname}
      </h1>
      <p className="text-[13px] text-ink-900/55 mt-1">
        {role} — {ROLE_BLURB[role]}
      </p>

      {role === "CLERK" && <ClerkStrip />}
      {role === "DRIVER" && <DriverStrip />}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-6 grid gap-3 sm:grid-cols-2"
      >
        {tabs.map((t) => {
          const Icon = Icons[t.icon];
          return (
            <Link
              key={t.to}
              to={t.to}
              className="rounded-2xl border border-gold-400/40 bg-white p-5 transition-all hover:border-gold-400/80 hover:bg-cream-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-18px_rgba(240,180,41,0.35)]"
            >
              <span className="h-9 w-9 rounded-xl bg-cream-200 border border-gold-500/25 flex items-center justify-center mb-3">
                <Icon className="h-4.5 w-4.5 text-gold-600" />
              </span>
              <h2 className="font-display text-[15px] font-semibold text-ink-900">
                {t.label}
              </h2>
              <p className="text-[11px] font-bold tracking-[0.14em] text-gold-700 mt-2">OPEN →</p>
            </Link>
          );
        })}
      </motion.div>

      <p className="mt-8 text-[12px] text-ink-900/50">
        Commuter app?{" "}
        <Link to="/home" className="underline underline-offset-2 hover:text-gold-700">
          Open GoldenWay
        </Link>
      </p>
    </div>
  );
}

/** K1 — CLERK live strip: real money, real receipts, real queue depth. */
function ClerkStrip() {
  const [sales, setSales] = useState(null);
  const [mine, setMine] = useState(null);
  const [queue, setQueue] = useState(null);

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const [s, m, q] = await Promise.all([
          fetchKioskSalesSummary(),
          fetchMySalesToday(),
          fetchPendingConcessions(),
        ]);
        if (!live) return;
        setSales(s);
        setMine(m);
        setQueue(q.length);
      } catch {
        if (live) {
          setSales({ orders: 0, fees: 0, cents: 0 });
          setMine({ count: 0, receipts: [] });
          setQueue(0);
        }
      }
    }
    load();
    return () => {
      live = false;
    };
  }, []);

  const stats = [
    { label: "CASH TODAY", value: sales ? `R${(sales.cents / 100).toFixed(2)}` : "…" },
    { label: "SALES", value: sales ? `${sales.orders}+${sales.fees}` : "…" },
    { label: "MINE", value: mine ? String(mine.count) : "…" },
    { label: "CONCESSIONS", value: queue === null ? "…" : String(queue) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.3 }}
      className="mt-4"
    >
      <div className="rounded-2xl border border-gold-400/30 bg-white p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-baseline justify-between px-1">
          <p className="eyebrow text-ink-900/45">TODAY AT THE KIOSK</p>
          <Link to="/staff/kiosk" className="text-[11px] font-bold text-gold-700">
            Open kiosk →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-cream-200 px-2 py-2.5 text-center">
              <p className="font-display text-[15px] font-bold text-ink-900 leading-none">{s.value}</p>
              <p className="mt-1.5 text-[8.5px] font-bold tracking-[0.12em] text-ink-900/40">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {mine?.receipts?.length > 0 && (
        <div className="mt-3 rounded-2xl border border-ink-900/10 bg-white p-4">
          <p className="eyebrow text-ink-900/45">MY SALES TODAY</p>
          <ul className="mt-2 flex flex-col divide-y divide-ink-900/5">
            {mine.receipts.slice(0, 4).map((r, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-[12px]">
                <span className="font-mono text-ink-900/70">{r.card}</span>
                <span className="text-ink-900/45">{r.product}</span>
                <span className="font-semibold text-ink-900">R{(r.cents / 100).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          {mine.receipts.length > 4 && (
            <p className="mt-1 text-[11px] text-ink-900/40">+ {mine.receipts.length - 4} more</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

const DRIVER_STATUS_PILL = {
  ON_TIME: "bg-emerald-100 text-emerald-700 border-emerald-400/30",
  DELAYED: "bg-amber-100 text-amber-700 border-amber-400/30",
  BREAKDOWN: "bg-brand-50 text-brand-600 border-brand-500/30",
  DIVERTED: "bg-sky-100 text-sky-700 border-sky-400/30",
};

function elapsedLabel(startedAt) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
}

/** D1 — DRIVER live strip: current run at a glance + this week's on-time rate. */
function DriverStrip() {
  const [runs, setRuns] = useState(null);

  useEffect(() => {
    let live = true;
    fetchMyRuns()
      .then((r) => live && setRuns(r))
      .catch(() => live && setRuns([]));
    return () => {
      live = false;
    };
  }, []);

  if (runs === null) return null;

  const openRun = runs.find((r) => r.status !== "COMPLETED");
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const completedThisWeek = runs.filter(
    (r) => r.status === "COMPLETED" && new Date(r.startedAt).getTime() >= weekAgo,
  );
  const onTimePct = completedThisWeek.length
    ? Math.round((completedThisWeek.filter((r) => !r.delayMinutes).length / completedThisWeek.length) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.3 }}
      className="mt-4"
    >
      <div className="rounded-2xl border border-gold-400/30 bg-white p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-baseline justify-between px-1">
          <p className="eyebrow text-ink-900/45">{openRun ? "ACTIVE RUN" : "MY RUNS"}</p>
          <Link to="/staff/runs" className="text-[11px] font-bold text-gold-700">
            {openRun ? "Manage run →" : "Start a run →"}
          </Link>
        </div>

        {openRun ? (
          <div className="mt-3 flex items-center justify-between px-1">
            <div>
              <p className="font-display text-[15px] font-bold text-ink-900">
                {openRun.routeCode} · Bus {openRun.busId}
              </p>
              <p className="text-[11px] text-ink-900/45 mt-0.5">started {elapsedLabel(openRun.startedAt)}</p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${DRIVER_STATUS_PILL[openRun.status] || DRIVER_STATUS_PILL.ON_TIME}`}>
              {openRun.status.replace("_", " ")}{openRun.delayMinutes > 0 ? ` +${openRun.delayMinutes}` : ""}
            </span>
          </div>
        ) : (
          <p className="mt-2 px-1 text-[12.5px] text-ink-900/50">No run in progress.</p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-cream-200 px-2 py-2.5 text-center">
            <p className="font-display text-[15px] font-bold text-ink-900 leading-none">{completedThisWeek.length}</p>
            <p className="mt-1.5 text-[8.5px] font-bold tracking-[0.12em] text-ink-900/40">RUNS THIS WEEK</p>
          </div>
          <div className="rounded-xl bg-cream-200 px-2 py-2.5 text-center">
            <p className="font-display text-[15px] font-bold text-ink-900 leading-none">{onTimePct === null ? "—" : `${onTimePct}%`}</p>
            <p className="mt-1.5 text-[8.5px] font-bold tracking-[0.12em] text-ink-900/40">ON TIME</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
