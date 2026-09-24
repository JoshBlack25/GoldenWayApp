import { useCallback, useEffect, useState } from "react";
import { fetchLiveAlerts } from "../../../api/goldenway";
import { fetchAllOpenRuns, withdrawAlert } from "../../../api/operations";

// ============================================================================
// READ ME FIRST — what this screen is and how it connects to the Driver lane
// ============================================================================
// Every alert shown below currently comes from ONE place: a DRIVER
// reporting DELAYED or BREAKDOWN on their run (see RunsScreen.jsx under
// screens/staff/driver/). A database trigger — handle_run_status_change()
// in supabase/migrations/0006_operations.sql — automatically inserts a
// row into the "service_alerts" table whenever that happens. Commuters
// see that same row as the red banner on their Home screen
// (HomeScreen.jsx calls fetchLiveAlerts(), same function used below).
//
// This screen is the admin-facing half of that loop: it lets an admin
// see which alerts are currently live, see which drivers are currently
// on the road (for context — "is this driver still marked BREAKDOWN, or
// did the alert just never get closed out?"), and withdraw an alert
// early if it's stale or wrong. It does NOT let an admin create a brand
// new alert from scratch — that's a separate, bigger feature (choosing a
// route, severity, and time window) that isn't built yet.
// ============================================================================

const SEVERITY_PILL = {
  INFO: "bg-sky-100 text-sky-700",
  WARNING: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const RUN_STATUS_PILL = {
  ON_TIME: "bg-emerald-100 text-emerald-700",
  DELAYED: "bg-amber-100 text-amber-700",
  BREAKDOWN: "bg-red-100 text-red-700",
  DIVERTED: "bg-sky-100 text-sky-700",
};

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Loads both the live alerts list AND the currently-open driver runs at
  // the same time (Promise.all — no reason to wait for one before
  // starting the other). Called once on first load, and again after an
  // alert is withdrawn so the list reflects the change immediately.
  const load = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([fetchLiveAlerts(), fetchAllOpenRuns()]);
      setAlerts(a);
      setRuns(r);
    } catch (err) {
      setError(err?.message || "Could not load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Runs when an admin taps "Withdraw" on an alert. Marks that alert as
  // ended (effective_to = now) via withdrawAlert() in operations.js, then
  // reloads the list so the withdrawn alert disappears.
  async function handleWithdraw(id) {
    if (busyId) return;
    setBusyId(id);
    setError("");
    setMsg("");
    try {
      await withdrawAlert(id);
      setMsg("Alert withdrawn — it will stop showing to commuters.");
      await load();
    } catch (err) {
      setError(err?.message || "Could not withdraw the alert");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="px-5 pt-2">
      <header>
        <h1 className="font-display text-xl font-bold text-ink-900">Alerts</h1>
        <p className="text-[13px] text-ink-900/50 mt-0.5">Live service alerts, driven by driver reports.</p>
      </header>

      {msg && <p role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-[12px] text-emerald-700">✓ {msg}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-[12px] text-red-600">{error}</p>}

      {/* Live fleet strip — quick context: which drivers are actually on
          the road right now, and what status they last reported. Reading
          vehicle_runs (the same table RunsScreen.jsx writes to). */}
      <div className="mt-5">
        <p className="eyebrow text-ink-900/40 mb-2">LIVE FLEET ({runs.length})</p>
        {loading ? (
          <div className="skeleton h-16 rounded-xl" />
        ) : runs.length === 0 ? (
          <p className="text-[12.5px] text-ink-900/40">No drivers currently on a run.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {runs.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-ink-900/10 bg-white px-4 py-2.5">
                <div>
                  <p className="text-[12.5px] font-semibold text-ink-900">{r.routeCode} · Bus {r.busId}</p>
                  <p className="text-[11px] text-ink-900/45">{r.driverName} · {r.direction?.toLowerCase()}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${RUN_STATUS_PILL[r.status] || "bg-ink-900/10 text-ink-900/60"}`}>
                  {r.status.replace("_", " ")}{r.delayMinutes > 0 ? ` +${r.delayMinutes}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active alerts list — what commuters are currently seeing on
          their Home screen. Withdrawing one here removes it from their
          view immediately (well, on their next data refresh). */}
      <div className="mt-6">
        <p className="eyebrow text-ink-900/40 mb-2">ACTIVE ALERTS ({alerts.length})</p>
        {loading ? (
          <>
            <div className="skeleton h-20 rounded-xl mb-1.5" />
            <div className="skeleton h-20 rounded-xl" />
          </>
        ) : alerts.length === 0 ? (
          <p className="text-[12.5px] text-ink-900/40">No live alerts right now.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {alerts.map((a) => (
              <div key={a.id} className="rounded-2xl border border-ink-900/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEVERITY_PILL[a.severity] || "bg-ink-900/10 text-ink-900/60"}`}>
                        {a.severity}
                      </span>
                      {a.routeCode && <span className="text-[11px] font-semibold text-ink-900/50">{a.routeCode}</span>}
                    </div>
                    <p className="mt-1 text-[13px] font-semibold text-ink-900">{a.title}</p>
                    <p className="mt-0.5 text-[12px] text-ink-900/55 leading-relaxed">{a.body}</p>
                    <p className="mt-1.5 text-[10.5px] text-ink-900/35">
                      since {new Date(a.effectiveFrom).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => handleWithdraw(a.id)}
                    className="shrink-0 rounded-xl border border-red-500/30 px-3 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busyId === a.id ? "…" : "Withdraw"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
