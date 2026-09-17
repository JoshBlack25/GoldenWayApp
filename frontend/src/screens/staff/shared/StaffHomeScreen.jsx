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
  fetchTicketQueue,
  fetchAgentsOnline,
  fetchMyRuns,
  fetchRecentInspections,
  fetchStaffTeam,
} from "../../../api/operations";
import { fetchStaffRequests } from "../../../api/staff";
import ClerkHomeScreen from "../clerk/ClerkHomeScreen";

/**
 * Staff dashboard landing — mobile dashboard principles applied:
 *
 * · CONTENT PRIORITIZATION — one hero KPI per role, the number that role
 *   acts on first, rendered huge at the top of the content area.
 * · PROGRESSIVE DISCLOSURE — secondary metrics are tappable chips that
 *   navigate to the tool where the detail lives; nothing is crowded.
 * · TOUCH TARGETS — every card/chip row is ≥44px tall with generous
 *   spacing; main nav lives in the bottom bar (thumb zone).
 * · SIMPLIFIED VIZ — metric cards, not charts; narrow screens only.
 * · FAST — parallel queries, no animation blocks after first paint.
 */
const ROLE_BLURB = {
  ADMIN: "Runs the network: people, prices, timetables and alerts.",
  INSPECTOR: "Revenue protection: verify cards on board (BR-08).",
  DRIVER: "The road: run your route and keep commuters informed.",
  AGENT: "The voice: help commuters get where they're going.",
};

export default function StaffHomeScreen() {
  const { user } = useAuth();
  const role = user?.role || "STAFF";

  if (role === "CLERK") return <ClerkHomeScreen />;

  const tabs = tabsForRole(role).filter((t) => t.to !== "/staff");

  return (
    <div className="px-5 pt-2 pb-4">
      <p className="eyebrow text-gold-600">WELCOME BACK</p>
      <h1 className="font-display text-2xl font-bold mt-1">
        {user?.firstName} {user?.surname}
      </h1>
      <p className="text-[13px] text-ink-900/55 mt-1">
        {role} — {ROLE_BLURB[role]}
      </p>

      {role === "CLERK" && <ClerkStrip />}
      {role === "DRIVER" && <DriverStrip />}
      <HeroKpi role={role} />

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
              className="min-h-[76px] rounded-2xl border border-gold-400/40 bg-white p-5 transition-all hover:border-gold-400/80 hover:bg-cream-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-18px_rgba(240,180,41,0.35)]"
            >
              <span className="h-9 w-9 rounded-xl bg-cream-200 border border-gold-500/25 flex items-center justify-center mb-3">
                <Icon className="h-4.5 w-4.5 text-gold-600" />
              </span>
              <h2 className="font-display text-[15px] font-semibold text-ink-900">
                {t.label}
              </h2>
              <p className="text-[11px] font-bold tracking-[0.14em] text-gold-700 mt-2">
                OPEN →
              </p>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero KPI — the ONE number this role acts on first                   */
/* ------------------------------------------------------------------ */

function HeroKpi({ role }) {
  switch (role) {
    case "AGENT":
      return <AgentHero />;
    case "DRIVER":
      return <DriverHero />;
    case "INSPECTOR":
      return <InspectorHero />;
    case "ADMIN":
      return <AdminHero />;
    default:
      return null;
  }
}

function HeroCard({ chip, value, label, sub, to, tone = "gold" }) {
  const toneBg =
    tone === "emerald"
      ? "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30"
      : tone === "red"
        ? "from-brand-500/15 to-brand-500/5 border-brand-500/30"
        : "from-gold-400/20 to-gold-400/5 border-gold-400/40";
  const inner = (
    <div
      className={`min-h-[104px] rounded-3xl border bg-gradient-to-br p-5 ${toneBg}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="eyebrow text-ink-900/45">{chip}</p>
      <p className="font-display text-[40px] leading-none font-bold text-ink-900 mt-2">
        {value}
      </p>
      <p className="text-[12.5px] text-ink-900/55 mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-ink-900/40 mt-0.5">{sub}</p>}
    </div>
  );
  return to ? (
    <Link
      to={to}
      className="block mt-5 active:scale-[0.99] transition-transform"
    >
      {inner}
    </Link>
  ) : (
    <div className="mt-5">{inner}</div>
  );
}

/** MetricChipRow — progressive disclosure: tap a metric → its tool. */
function MetricChipRow({ items }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2.5">
      {items.filter(Boolean).map(({ label, value, to, loading }) => (
        <Link
          key={label}
          to={to}
          className="min-h-[64px] rounded-2xl border border-ink-900/10 bg-white px-4 py-3 flex flex-col justify-center active:scale-[0.98] transition-transform hover:border-gold-400/60"
        >
          <p className="font-display text-[18px] font-bold text-ink-900 leading-none">
            {loading ? "…" : value}
          </p>
          <p className="text-[9.5px] font-bold tracking-[0.12em] text-ink-900/40 mt-1.5">
            {label}
          </p>
        </Link>
      ))}
    </div>
  );
}

/* --- AGENT: open tickets is the hero; online teammates secondary --- */
function AgentHero() {
  const [state, setState] = useState({ queue: null, online: null });
  useEffect(() => {
    let live = true;
    Promise.allSettled([fetchTicketQueue(), fetchAgentsOnline()]).then(
      ([q, a]) => {
        if (!live) return;
        const open =
          q.status === "fulfilled"
            ? (q.value || []).filter((t) => t.status !== "RESOLVED")
            : [];
        setState({
          queue: q.status === "fulfilled" ? open : [],
          online: a.status === "fulfilled" ? (a.value?.count ?? 0) : 0,
        });
      },
    );
    return () => {
      live = false;
    };
  }, []);

  const openCount = state.queue?.length;
  const oldest = state.queue?.[0];
  return (
    <>
      <HeroCard
        chip="OPEN TICKETS"
        value={openCount ?? "…"}
        label={
          openCount === 0
            ? "Queue clear — nice work"
            : oldest
              ? `Next up: “${oldest.subject}”`
              : "Loading queue"
        }
        sub={openCount > 0 ? "Tap to claim the next commuter" : null}
        to="/staff/inbox"
        tone={openCount > 3 ? "red" : openCount === 0 ? "emerald" : "gold"}
      />
      <MetricChipRow
        items={[
          {
            label: "AGENTS ONLINE",
            value: state.online ?? "…",
            to: "/staff/inbox",
          },
          {
            label: "IN PROGRESS",
            value:
              state.queue?.filter((t) => t.status === "IN_PROGRESS").length ??
              "…",
            to: "/staff/inbox",
          },
        ]}
      />
    </>
  );
}

/* --- DRIVER: current run status is the hero --- */
function DriverHero() {
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

  const open = runs?.find((r) => r.status !== "COMPLETED");
  const todayCount = runs?.filter(
    (r) => r.serviceDay === new Date().toISOString().slice(0, 10),
  ).length;
  return (
    <>
      <HeroCard
        chip={open ? "CURRENT RUN" : "NO RUN OPEN"}
        value={open ? open.routeCode : "—"}
        label={
          open
            ? `Bus ${open.busId} · ${open.status.replace("_", " ")}${open.delayMinutes ? ` · +${open.delayMinutes} min` : ""}`
            : "Start a run from My Runs"
        }
        sub={open ? "Tap to report status" : null}
        to="/staff/runs"
        tone={open?.status === "BREAKDOWN" ? "red" : open ? "gold" : "emerald"}
      />
      <MetricChipRow
        items={[
          { label: "RUNS TODAY", value: todayCount ?? "…", to: "/staff/runs" },
          {
            label: "RECENT RUNS",
            value: runs?.length ?? "…",
            to: "/staff/runs",
          },
        ]}
      />
    </>
  );
}

/* --- INSPECTOR: today's verification count is the hero --- */
function InspectorHero() {
  const [inspections, setInspections] = useState(null);
  useEffect(() => {
    let live = true;
    fetchRecentInspections(50)
      .then((rows) => live && setInspections(rows))
      .catch(() => live && setInspections([]));
    return () => {
      live = false;
    };
  }, []);

  const today = new Date().toDateString();
  const todayRows =
    inspections?.filter((r) => new Date(r.at).toDateString() === today) || [];
  const invalid = todayRows.filter(
    (r) => (r.outcome || "").toUpperCase() !== "VALID",
  ).length;
  return (
    <>
      <HeroCard
        chip="INSPECTIONS TODAY"
        value={inspections ? todayRows.length : "…"}
        label={
          invalid > 0
            ? `${invalid} flagged card${invalid === 1 ? "" : "s"} on board`
            : "All cards checked were valid"
        }
        sub="Tap to verify a card"
        to="/staff/verify"
        tone={invalid > 0 ? "red" : "emerald"}
      />
      <MetricChipRow
        items={[
          {
            label: "RECENT LOOKUPS",
            value: inspections?.length ?? "…",
            to: "/staff/verify",
          },
          {
            label: "FLAGGED (ALL)",
            value:
              inspections?.filter(
                (r) => (r.outcome || "").toUpperCase() !== "VALID",
              ).length ?? "…",
            to: "/staff/verify",
          },
        ]}
      />
    </>
  );
}

/* --- CLERK: today's cash is the hero (K1) --- */
function ClerkHero() {
  const [sales, setSales] = useState(null);
  const [queue, setQueue] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.allSettled([
      fetchKioskSalesSummary(),
      fetchPendingConcessions(),
    ]).then(([s, q]) => {
      if (!live) return;
      if (s.status === "fulfilled") setSales(s.value);
      if (q.status === "fulfilled") setQueue(q.value.length);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <HeroCard
        chip="CASH TODAY"
        value={sales ? `R${(sales.cents / 100).toFixed(2)}` : "…"}
        label={
          sales
            ? `${sales.orders} load${sales.orders === 1 ? "" : "s"} + ${sales.fees} card fee${sales.fees === 1 ? "" : "s"}`
            : "Counting the drawer"
        }
        sub="Tap to open the kiosk"
        to="/staff/kiosk"
      />
      <MetricChipRow
        items={[
          {
            label: "CONCESSIONS QUEUE",
            value: queue ?? "…",
            to: "/staff/concessions",
          },
          {
            label: "CARD FEES TODAY",
            value: sales ? sales.fees : "…",
            to: "/staff/kiosk",
          },
        ]}
      />
    </>
  );
}

/* --- ADMIN: pending onboarding is the hero; network strip secondary --- */
function AdminHero() {
  const [state, setState] = useState({
    pending: null,
    team: null,
    tickets: null,
  });
  useEffect(() => {
    let live = true;
    Promise.allSettled([
      fetchStaffRequests(),
      fetchStaffTeam(),
      fetchTicketQueue(),
    ]).then(([r, t, q]) => {
      if (!live) return;
      const pending =
        r.status === "fulfilled"
          ? (r.value || []).filter((x) => x.status === "PENDING")
          : [];
      const open =
        q.status === "fulfilled"
          ? (q.value || []).filter((x) => x.status !== "RESOLVED")
          : [];
      setState({
        pending: r.status === "fulfilled" ? pending : [],
        team: t.status === "fulfilled" ? t.value : [],
        tickets: q.status === "fulfilled" ? open : [],
      });
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <HeroCard
        chip="PENDING ONBOARDING"
        value={state.pending?.length ?? "…"}
        label={
          state.pending?.length
            ? "Access requests waiting on you"
            : "No access requests waiting"
        }
        sub="Tap to review requests"
        to="/staff/onboarding"
        tone={(state.pending?.length || 0) > 0 ? "gold" : "emerald"}
      />
      <MetricChipRow
        items={[
          {
            label: "OPEN TICKETS",
            value: state.tickets?.length ?? "…",
            to: "/staff/inbox",
          },
          {
            label: "STAFF ACCOUNTS",
            value: state.team?.length ?? "…",
            to: "/staff/team",
          },
        ]}
      />
    </>
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
