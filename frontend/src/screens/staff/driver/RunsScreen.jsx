import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchRoutesFromDb } from "../../../api/goldenway";
import { fetchMyRuns, fetchBuses, startRun, reportRunStatus } from "../../../api/operations";

/**
 * DRIVER — My runs (D6). Start a run (route + fleet number from the real
 * buses table), then report status with big glove-friendly buttons.
 * DELAYED/BREAKDOWN reports auto-publish a route service alert (0006
 * trigger) that commuters see instantly on Home + notifications.
 */
const STATUS_ACTIONS = [
  { code: "ON_TIME", label: "ON TIME", cls: "bg-emerald-500 hover:bg-emerald-400" },
  { code: "DELAYED", label: "+10 MIN", cls: "bg-amber-500 hover:bg-amber-400", delay: 10 },
  { code: "DELAYED", label: "+20 MIN", cls: "bg-orange-500 hover:bg-orange-400", delay: 20 },
  { code: "BREAKDOWN", label: "BREAKDOWN", cls: "bg-brand-500 hover:bg-brand-400" },
  { code: "COMPLETED", label: "END RUN", cls: "bg-ink-900 hover:bg-ink-900/85 border border-ink-900" },
];

const STATUS_PILL = {
  ON_TIME: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  DELAYED: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  BREAKDOWN: "bg-brand-500/15 text-red-300 border-brand-400/30",
  DIVERTED: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  COMPLETED: "bg-cream-300 text-ink-900/55 border-ink-900/15",
};

export default function RunsScreen() {
  const [runs, setRuns] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routeCode, setRouteCode] = useState("");
  const [busId, setBusId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const [myRuns, busList] = await Promise.all([fetchMyRuns(), fetchBuses()]);
      setRuns(myRuns);
      setBuses(busList);
      if (busList.length && !busId) setBusId(busList[0].fleet_no);
    } catch (err) {
      setError(err?.message || "Could not load runs");
    }
  }, [busId]);

  useEffect(() => {
    fetchRoutesFromDb().then(setRoutes).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRun = runs.find((r) => r.status !== "COMPLETED");

  async function handleStart(e) {
    e.preventDefault();
    if (busy || !routeCode || !busId) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await startRun(routeCode, busId, "OUTBOUND");
      setMsg(`Run started on ${routeCode} with bus ${busId}`);
      await load();
    } catch (err) {
      setError(err?.message || "Could not start the run");
    } finally {
      setBusy(false);
    }
  }

  async function report(status, delayMinutes = 0) {
    if (!openRun || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await reportRunStatus(openRun.id, status, delayMinutes);
      setMsg(
        status === "COMPLETED"
          ? "Run completed — nice work."
          : status === "ON_TIME"
            ? "Reported on time."
            : `Reported ${status.replace("_", " ").toLowerCase()}${updated?.delayMinutes ? ` (+${updated.delayMinutes} min)` : ""} — commuters on this route have been alerted.`,
      );
      await load();
    } catch (err) {
      setError(err?.message || "Could not report the status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-2">
        <header>
          <h1 className="font-display text-xl font-bold text-ink-900">My runs</h1>
          <p className="text-[13px] text-ink-900/50 mt-0.5">Start your run and keep commuters informed.</p>
        </header>

        {msg && <p role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-[12px] text-emerald-300">✓ {msg}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-[12px] text-red-300">{error}</p>}

        {openRun ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl border border-gold-400/30 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow text-ink-900/40">ACTIVE RUN #{openRun.id}</p>
                <p className="font-display text-lg font-bold text-gold-300 mt-0.5">
                  {openRun.routeCode} · Bus {openRun.busId}
                </p>
                <p className="text-[12px] text-ink-900/50">
                  {openRun.direction.toLowerCase()} · started {new Date(openRun.startedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${STATUS_PILL[openRun.status]}`}>
                {openRun.status.replace("_", " ")}{openRun.delayMinutes > 0 ? ` +${openRun.delayMinutes}` : ""}
              </span>
            </div>

            <p className="eyebrow text-ink-900/40 mt-6 mb-2">REPORT STATUS</p>
            <div className="grid grid-cols-2 gap-2.5">
              {STATUS_ACTIONS.map((a, i) => (
                <motion.button
                  key={a.code + a.label}
                  type="button"
                  disabled={busy}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => report(a.code, a.delay || 0)}
                  className={`${a.cls} rounded-2xl py-5 font-display text-[14px] font-bold text-white shadow-lg transition-all disabled:opacity-50 ${i === STATUS_ACTIONS.length - 1 ? "col-span-2" : ""}`}
                >
                  {busy ? "…" : a.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleStart} className="mt-5 rounded-2xl border border-ink-900/10 bg-white p-5">
            <p className="eyebrow text-ink-900/40">START A RUN</p>
            <div className="mt-3 flex flex-col gap-3">
              <select
                value={routeCode}
                onChange={(e) => setRouteCode(e.target.value)}
                className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3.5 text-[14px] text-ink-900 outline-none focus:border-gold-400/60"
              >
                <option value="">Choose your route…</option>
                {routes.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.code} — {r.origin} → {r.destination}
                  </option>
                ))}
              </select>
              <select
                value={busId}
                onChange={(e) => setBusId(e.target.value)}
                className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3.5 text-[14px] text-ink-900 outline-none focus:border-gold-400/60"
              >
                <option value="">Choose your bus…</option>
                {buses.map((b) => (
                  <option key={b.fleet_no} value={b.fleet_no}>
                    {b.fleet_no}{b.depot ? ` · ${b.depot}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={busy || !routeCode || !busId}
                className="btn-gold w-full py-4 text-[15px] disabled:opacity-50"
              >
                {busy ? "Starting…" : "Start run"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6">
          <p className="eyebrow text-ink-900/40 mb-2">RECENT RUNS</p>
          <div className="flex flex-col gap-1.5">
            {runs.filter((r) => r.status === "COMPLETED").slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-ink-900/10 bg-white px-4 py-2.5 text-[12px]">
                <span className="text-ink-900/65">{r.routeCode} · {r.busId}</span>
                <span className="flex items-center gap-2 text-ink-900/45">
                  {new Date(r.startedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${STATUS_PILL[r.status]}`}>DONE</span>
                </span>
              </div>
            ))}
            {runs.length === 0 && <p className="text-[12.5px] text-ink-900/40">No runs yet — start your first one above.</p>}
          </div>
        </div>
      
    </div>
  );
}
