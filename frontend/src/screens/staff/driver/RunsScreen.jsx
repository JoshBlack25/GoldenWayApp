import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchRoutesFromDb, fetchDepartures } from "../../../api/goldenway";
import { fetchMyRuns, fetchBuses, startRun, reportRunStatus } from "../../../api/operations";
import StopTimeline from "../../../components/StopTimeline";

/**
 * DRIVER — My runs (D6). Start a run (route + fleet number from the real
 * buses table, plus an optional pre-trip note — D3), then report status
 * with big glove-friendly buttons. DELAYED/BREAKDOWN reports prompt for a
 * commuter-facing note (D5) and auto-publish a route service alert (0006
 * trigger) that commuters see instantly on Home + notifications.
 */
const STATUS_ACTIONS = [
  { code: "ON_TIME", label: "ON TIME", cls: "bg-emerald-500 hover:bg-emerald-400" },
  { code: "DELAYED", label: "+10 MIN", cls: "bg-amber-500 hover:bg-amber-400", delay: 10, needsNote: true },
  { code: "DELAYED", label: "+20 MIN", cls: "bg-orange-500 hover:bg-orange-400", delay: 20, needsNote: true },
  { code: "BREAKDOWN", label: "BREAKDOWN", cls: "bg-brand-500 hover:bg-brand-400", needsNote: true },
  { code: "COMPLETED", label: "END RUN", cls: "bg-ink-900 hover:bg-ink-900/85 border border-ink-900" },
];

function hhmm(iso) {
  return (iso || "").slice(0, 5);
}

function minutesUntil(hhmmStr, now = new Date()) {
  const [h, m] = hhmmStr.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return Math.round((target - now) / 60000);
}

const STATUS_PILL = {
  ON_TIME: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  DELAYED: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  BREAKDOWN: "bg-brand-500/15 text-red-300 border-brand-400/30",
  DIVERTED: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  COMPLETED: "bg-cream-300 text-ink-900/55 border-ink-900/15",
};

const NOTE_MAX = 300;

export default function RunsScreen() {
  const [runs, setRuns] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routeCode, setRouteCode] = useState("");
  const [busId, setBusId] = useState("");
  const [direction, setDirection] = useState("OUTBOUND");
  const [pretripNote, setPretripNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [departures, setDepartures] = useState([]);
  const [composing, setComposing] = useState(null); // { code, delay, label } | null
  const [composerNote, setComposerNote] = useState("");
  const [composerError, setComposerError] = useState("");

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
    let cancelled = false;
    Promise.all([
      fetchRoutesFromDb()
        .then((list) => !cancelled && setRoutes(list || []))
        .catch(() => !cancelled && setError("Could not load routes — check your connection and reload.")),
      load(),
    ]).finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRun = runs.find((r) => r.status !== "COMPLETED");

  // D4 — today's remaining departures on the active run's route, so the
  // driver can see where they sit against the schedule while running.
  useEffect(() => {
    if (!openRun) {
      setDepartures([]);
      return;
    }
    let cancelled = false;
    fetchDepartures(openRun.routeCode, openRun.direction, openRun.serviceDay)
      .then((list) => !cancelled && setDepartures(list || []))
      .catch(() => !cancelled && setDepartures([]));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRun?.id, openRun?.routeCode, openRun?.direction, openRun?.serviceDay]);

  const timelineStops = useMemo(() => {
    if (!openRun || departures.length === 0) return [];
    const now = new Date();
    const withMins = departures.map((d) => ({ iso: d, mins: minutesUntil(d, now) }));
    const currentIdx = withMins.findIndex((d) => d.mins > -5);
    const windowStart = Math.max(0, (currentIdx === -1 ? withMins.length : currentIdx) - 1);
    return withMins.slice(windowStart, windowStart + 5).map((d, i) => ({
      label: `Departure ${hhmm(d.iso)}`,
      time: d.mins > 0 ? `in ${d.mins} min` : d.mins > -5 ? "boarding now" : "departed",
      state: d.mins <= -5 ? "done" : windowStart + i === currentIdx ? "current" : "upcoming",
    }));
  }, [openRun, departures]);

  async function handleStart(e) {
    e.preventDefault();
    if (busy || !routeCode || !busId) return;
    if (pretripNote.trim().length > NOTE_MAX) {
      setError(`Pre-trip note: keep it under ${NOTE_MAX} characters.`);
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await startRun(routeCode, busId, direction, pretripNote.trim() || null);
      setMsg(`Run started on ${routeCode} with bus ${busId}`);
      setPretripNote("");
      await load();
    } catch (err) {
      setError(err?.message || "Could not start the run");
    } finally {
      setBusy(false);
    }
  }

  /** Returns true on success so the note-composer modal knows whether to close. */
  async function report(status, delayMinutes = 0, note = null) {
    if (!openRun || busy) return false;
    setBusy(true);
    setError("");
    try {
      const updated = await reportRunStatus(openRun.id, status, delayMinutes, note);
      setMsg(
        status === "COMPLETED"
          ? "Run completed — nice work."
          : status === "ON_TIME"
            ? "Reported on time."
            : `Reported ${status.replace("_", " ").toLowerCase()}${updated?.delayMinutes ? ` (+${updated.delayMinutes} min)` : ""} — commuters on this route have been alerted.`,
      );
      await load();
      return true;
    } catch (err) {
      setError(err?.message || "Could not report the status");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleActionTap(action) {
    if (!openRun || busy) return;
    setMsg("");
    setError("");
    if (action.needsNote) {
      setComposerNote("");
      setComposerError("");
      setComposing(action);
      return;
    }
    report(action.code, action.delay || 0);
  }

  async function confirmComposer() {
    if (!composing || busy) return;
    const note = composerNote.trim();
    if (note.length > NOTE_MAX) {
      setComposerError(`Keep it under ${NOTE_MAX} characters.`);
      return;
    }
    const ok = await report(composing.code, composing.delay || 0, note || null);
    if (ok) setComposing(null);
  }

  useEffect(() => {
    if (!composing) return;
    const onKey = (e) => {
      if (e.key === "Escape") setComposing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [composing]);

  return (
    <div className="px-5 pt-2">
        <header>
          <h1 className="font-display text-xl font-bold text-ink-900">My runs</h1>
          <p className="text-[13px] text-ink-900/50 mt-0.5">Start your run and keep commuters informed.</p>
        </header>

        {msg && <p role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-[12px] text-emerald-300">✓ {msg}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-[12px] text-red-300">{error}</p>}

        {loading ? (
          <div className="mt-5 flex flex-col gap-3">
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-10 rounded-xl w-2/3" />
          </div>
        ) : openRun ? (
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
                  onClick={() => handleActionTap(a)}
                  className={`${a.cls} rounded-2xl py-5 font-display text-[14px] font-bold text-white shadow-lg transition-all disabled:opacity-50 ${i === STATUS_ACTIONS.length - 1 ? "col-span-2" : ""}`}
                >
                  {busy ? "…" : a.label}
                </motion.button>
              ))}
            </div>

            {timelineStops.length > 0 && (
              <div className="mt-6">
                <p className="eyebrow text-ink-900/40 mb-3">TODAY'S SCHEDULE — {openRun.routeCode}</p>
                <StopTimeline stops={timelineStops} />
              </div>
            )}
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
              {routes.length === 0 && (
                <p className="text-[11.5px] text-ink-900/40">No active routes found — contact ADMIN if this looks wrong.</p>
              )}
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
              {buses.length === 0 && (
                <p className="text-[11.5px] text-ink-900/40">No active buses found — contact ADMIN if this looks wrong.</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {["OUTBOUND", "INBOUND"].map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setDirection(dir)}
                    className={`rounded-xl border py-2.5 text-[13px] font-semibold transition-colors ${
                      direction === dir ? "border-gold-500 bg-cream-100 text-ink-900" : "border-ink-900/10 bg-white text-ink-900/50"
                    }`}
                  >
                    {dir === "OUTBOUND" ? "Outbound" : "Return trip"}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold tracking-wide text-ink-900/40">PRE-TRIP NOTE (OPTIONAL)</span>
                <textarea
                  value={pretripNote}
                  onChange={(e) => setPretripNote(e.target.value)}
                  placeholder="Odometer, bus condition, anything worth logging before you pull out…"
                  rows={2}
                  maxLength={NOTE_MAX}
                  className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 outline-none focus:border-gold-400/60 resize-none"
                />
                <span className="self-end text-[10px] text-ink-900/30">{pretripNote.length}/{NOTE_MAX}</span>
              </label>
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

        {composing && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 px-5 pb-8 sm:items-center" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm rounded-2xl bg-white p-5"
            >
              <p className="eyebrow text-ink-900/40">{composing.label} — TELL COMMUTERS WHY (OPTIONAL)</p>
              <textarea
                autoFocus
                value={composerNote}
                onChange={(e) => {
                  setComposerNote(e.target.value);
                  setComposerError("");
                }}
                placeholder="e.g. Traffic on the N2, expect delays…"
                rows={3}
                maxLength={NOTE_MAX}
                className="mt-3 w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 outline-none focus:border-gold-400/60 resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                {composerError ? (
                  <span className="text-[11px] text-red-600">{composerError}</span>
                ) : (
                  <span />
                )}
                <span className="text-[10px] text-ink-900/30">{composerNote.length}/{NOTE_MAX}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setComposing(null)}
                  className="rounded-xl border border-ink-900/10 py-3 text-[13px] font-semibold text-ink-900/60 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmComposer}
                  className="btn-gold rounded-xl py-3 text-[13px] disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <div className="mt-6">
          <p className="eyebrow text-ink-900/40 mb-2">RECENT RUNS</p>
          <div className="flex flex-col gap-1.5">
            {runs.filter((r) => r.status === "COMPLETED").slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-ink-900/10 bg-white px-4 py-2.5 text-[12px]">
                <span className="text-ink-900/65">{r.routeCode} · {r.busId}</span>
                <span className="flex items-center gap-2 text-ink-900/45">
                  {new Date(r.startedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${STATUS_PILL[r.status]}`}>
                    {r.delayMinutes > 0 ? `+${r.delayMinutes} MIN` : "ON TIME"}
                  </span>
                </span>
              </div>
            ))}
            {!loading && runs.length === 0 && <p className="text-[12.5px] text-ink-900/40">No runs yet — start your first one above.</p>}
          </div>
        </div>
      
    </div>
  );
}
