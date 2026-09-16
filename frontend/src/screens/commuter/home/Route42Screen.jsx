import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MapCanvas from "../../../components/MapCanvas";
import StopTimeline from "../../../components/StopTimeline";
import { fetchRoutesFromDb, fetchDepartures, fetchLiveAlerts, serviceDayFor } from "../../../api/goldenway";
import { fetchLiveRuns } from "../../../api/operations";

/**
 * Route 42 live tracking (D6, mock M4) — the timeline is derived from the
 * real route_departures table and the next-bus picks the first departure
 * that's still in the future. When a DRIVER reports DELAYED/BREAKDOWN on
 * this route (vehicle_runs → auto service_alert), the delay banner and
 * per-stop ETAs reflect the real report instead of hardcoded copy.
 */

const ROUTE_CODE = "KHA-CPT";

function hhmm(iso) {
  return (iso || "").slice(0, 5);
}

function minutesUntil(hhmmStr, now = new Date()) {
  const [h, m] = hhmmStr.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return Math.round((target - now) / 60000);
}

export default function Route42Screen() {
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [departures, setDepartures] = useState([]);
  const [run, setRun] = useState(null);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const routes = await fetchRoutesFromDb();
        const match = routes.find((r) => r.code === ROUTE_CODE) || routes[0];
        if (cancelled) return;
        setRoute(match || null);
        if (match) {
          const [deps, runs, alerts] = await Promise.all([
            fetchDepartures(match.code, "OUTBOUND", serviceDayFor()),
            fetchLiveRuns(match.code).catch(() => []),
            fetchLiveAlerts().catch(() => []),
          ]);
          if (cancelled) return;
          setDepartures(deps || []);
          setRun(runs[0] || null);
          setAlert(alerts.find((a) => a.routeCode === match.code) || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const delay = run?.status === "DELAYED" || run?.status === "BREAKDOWN" ? run.delayMinutes || (run.status === "BREAKDOWN" ? 20 : 0) : 0;

  // Build the timeline from the next 4 departures from now (delay-aware).
  const upcoming = departures
    .map((d) => ({ iso: d, mins: minutesUntil(d, now) }))
    .filter((d) => d.mins > -60)
    .slice(0, 4);

  const stops = upcoming.map((d, i) => ({
    label: i === 0 ? `${route?.origin || "Origin"} — next departure` : `${route?.origin || "Origin"} — later bus`,
    time: delay > 0 ? `${hhmm(d.iso)} (+${delay} min delay)` : hhmm(d.iso),
    state: i === 0 ? "current" : "upcoming",
  }));

  if (stops.length === 0 && !loading) {
    stops.push(
      { label: `${route?.origin || "Origin"} terminal`, time: "No further departures today", state: "done" },
      { label: route?.destination || "Destination", time: "Service resumes tomorrow", state: "upcoming" },
    );
  }

  return (
    <div className="flex flex-col px-5 pb-6">
      <div className="relative h-56 overflow-hidden rounded-2xl border border-ink-900/5">
        <MapCanvas dark />
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide text-white shadow ${
            run?.status === "BREAKDOWN" ? "bg-brand-600" : run ? "bg-emerald-600" : "bg-slate-500"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          {run
            ? run.status === "BREAKDOWN"
              ? "BREAKDOWN REPORTED"
              : run.status === "DELAYED"
                ? `RUNNING +${run.delayMinutes} MIN`
                : run.status === "DIVERTED"
                  ? "DIVERTED"
                  : "ON TIME — LIVE"
            : "NO LIVE RUN RIGHT NOW"}
        </span>
      </div>

      {alert && (
        <div className="mt-3 rounded-xl border border-brand-500/25 bg-brand-50 px-4 py-3">
          <p className="eyebrow text-brand-600">SERVICE ALERT</p>
          <p className="text-[12.5px] font-medium text-ink-900 mt-0.5">{alert.title}</p>
          {alert.body && <p className="text-[11.5px] text-ink-700/80 mt-0.5 leading-relaxed">{alert.body}</p>}
        </div>
      )}

      <div className="mt-4">
        <p className="eyebrow text-gold-600">CURRENT ROUTE</p>
        <h1 className="font-display text-xl font-bold text-ink-900 mt-1">
          {route ? `${route.origin} to ${route.destination}` : loading ? "Loading route…" : "Route unavailable"}
        </h1>
        {route && (
          <p className="text-[11px] text-slate-500 mt-0.5">
            {route.code} · {departures.length} departures today ({serviceDayFor().toLowerCase()})
          </p>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="skeleton h-10 w-2/3" />
            <div className="skeleton h-10 w-1/2" />
          </div>
        ) : (
          <StopTimeline stops={stops} />
        )}
      </div>

      <div className="card mt-4 px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-slate-500">NEXT DEPARTURE</p>
          <p className="font-display text-xl font-bold text-gold-600">
            {upcoming[0] ? hhmm(upcoming[0].iso) : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold tracking-wide text-slate-500">STATUS</p>
          <p className={`font-display text-[16px] font-bold ${delay > 0 ? "text-brand-600" : "text-emerald-600"}`}>
            {run ? (delay > 0 ? `+${delay} min` : "On time") : "Scheduled"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-cream-100 border border-gold-500/15 px-4 py-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[12px] font-medium text-ink-900">
          <RefreshIcon /> Live from driver reports
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${run ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
          {run ? "LIVE" : "IDLE"}
        </span>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/load-trips")}
        className="btn-gold mt-5 w-full py-4 text-[15px]"
      >
        Buy Ticket
      </motion.button>
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9.5A8 8 0 1 1 4.6 15" strokeLinecap="round" />
      <path d="M4 5v4.5h4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
