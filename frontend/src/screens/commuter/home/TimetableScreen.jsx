import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchDepartures, fetchRoutesFromDb, serviceDayFor, hhmm } from "../../../api/goldenway";

/**
 * Timetable — "when is my bus?"
 *
 * Thandi's question at 05:40 is not "show me a schedule", it's:
 *   "Did I miss it? How long do I have?"
 * So the screen answers with the NEXT departure first, huge, counting
 * down in minutes — then the rest of the day grouped into the real GABS
 * service waves (morning peak, midday, afternoon peak, evening).
 */

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function toMinutes(iso) {
  const [h, m] = (iso || "0:0").split(":").map(Number);
  return h * 60 + m;
}

function waveLabel(mins) {
  if (mins < 5 * 60) return "Early morning";
  if (mins < 9 * 60) return "Morning peak";
  if (mins < 15 * 60) return "Midday";
  if (mins < 19 * 60) return "Afternoon peak";
  return "Evening";
}

function countdownLabel(departureMins, nowMins) {
  const diff = departureMins - nowMins;
  if (diff <= 0 && diff > -5) return "Boarding now";
  if (diff < 0) return `${-diff} min ago`;
  if (diff === 0) return "Now";
  if (diff < 60) return `in ${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
}

/** fetchRoutesFromDb has no label field — build it from origin/destination. */
function routeLabel(r) {
  return r.label || r.name || `${r.origin} → ${r.destination}`;
}

export default function TimetableScreen({ hideCta = false }) {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [routeCode, setRouteCode] = useState("");
  const [direction, setDirection] = useState("OUTBOUND");
  const [departures, setDepartures] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const dayType = useMemo(() => serviceDayFor(), []);
  const dayLabel = { WEEKDAY: "Weekdays (Mon–Fri)", SATURDAY: "Saturday service", SUNDAY: "Sunday service" }[dayType];

  useEffect(() => {
    let cancelled = false;
    fetchRoutesFromDb()
      .then((list) => {
        if (cancelled) return;
        setRoutes(list || []);
        if (list?.length) setRouteCode(list[0].code);
      })
      .catch(() => !cancelled && setError("Could not load routes."));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!routeCode) return;
    let cancelled = false;
    setBusy(true);
    setError("");
    fetchDepartures(routeCode, direction, dayType)
      .then((list) => !cancelled && setDepartures(list || []))
      .catch(() => !cancelled && setError("Could not load the timetable."))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [routeCode, direction, dayType]);

  const route = routes.find((r) => r.code === routeCode);

  const { next, upcoming, waves } = useMemo(() => {
    const now = nowMinutes();
    const all = departures.map((d) => ({ iso: d, mins: toMinutes(d) }));
    const future = all.filter((d) => d.mins >= now - 5);
    const past = all.filter((d) => d.mins < now - 5);
    return {
      next: future[0] || null,
      upcoming: future.slice(1),
      waves: past.length ? [{ label: "Earlier today", items: past.slice(-4) }] : [],
    };
  }, [departures]);

  const routeOptions = [...new Set(routes.map((r) => r.label))];

  return (
    <div className="flex flex-col gap-5 px-5 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink-900">Timetable</h1>
        <span className="rounded-full bg-cream-100 border border-gold-500/20 px-3 py-1 text-[11px] font-semibold text-ink-900">
          {dayLabel}
        </span>
      </div>

      {/* Route + direction pickers */}
      <div className="rounded-2xl bg-white border border-ink-900/5 px-4 py-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wide text-slate-500">ROUTE</span>
          <select
            value={routeCode}
            onChange={(e) => setRouteCode(e.target.value)}
            className="rounded-xl border border-ink-900/10 bg-cream-50 px-3 py-2.5 text-[14px] font-medium text-ink-900"
          >
            {routes.map((r) => (
              <option key={r.code} value={r.code}>
                {routeLabel(r)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {["OUTBOUND", "INBOUND"].map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => setDirection(dir)}
              className={`rounded-xl border py-2.5 text-[13px] font-semibold transition-colors ${
                direction === dir
                  ? "border-gold-500 bg-cream-100 text-ink-900"
                  : "border-ink-900/10 bg-white text-slate-500"
              }`}
            >
              {dir === "OUTBOUND" ? "Towards city" : "Return trip"}
            </button>
          ))}
        </div>
      </div>

      {busy && (
        <div className="rounded-2xl bg-white border border-ink-900/5 px-4 py-8 text-center text-[13px] text-slate-500">
          Loading times…
        </div>
      )}

      {error && !busy && (
        <div className="rounded-2xl bg-white border border-ink-900/5 px-4 py-8 text-center text-[13px] text-slate-500">
          {error}
        </div>
      )}

      {!busy && !error && departures.length === 0 && (
        <div className="rounded-2xl bg-white border border-ink-900/5 px-4 py-8 text-center text-[13px] text-slate-500">
          No buses scheduled for {dayLabel.toLowerCase()} on this route.
          <p className="mt-1 text-[12px] text-slate-400">
            This route runs {dayType === "WEEKDAY" ? "Saturdays and Sundays" : "weekdays"} only.
          </p>
        </div>
      )}

      {!busy && !error && departures.length > 0 && (
        <>
          {/* NEXT BUS — the hero answer */}
          {next && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl px-5 py-5 text-ink-900"
              style={{ background: "linear-gradient(135deg, #ffd873 0%, #ffc52e 45%, #f0b429 100%)", boxShadow: "var(--shadow-glow-gold)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-wide opacity-70">NEXT BUS FROM ORIGIN</p>
                  <p className="font-display text-4xl font-bold leading-tight">{hhmm(next.iso)}</p>
                  <p className="text-[12px] font-semibold mt-0.5">
                    {countdownLabel(next.mins, nowMinutes())}
                    {route ? ` · ${routeLabel(route)}` : ""}
                  </p>
                </div>
                <span className="h-3 w-3 rounded-full bg-white/90 animate-pulse" aria-hidden="true" />
              </div>
            </motion.div>
          )}

          {!next && (
            <div className="rounded-2xl bg-white border border-ink-900/5 px-5 py-6 text-center">
              <p className="text-[14px] font-semibold text-ink-900">That was the last bus of the day</p>
              <p className="mt-1 text-[12px] text-slate-500">First bus tomorrow: check the morning peak below.</p>
            </div>
          )}

          {/* Rest of today, grouped */}
          {upcoming.length > 0 && (
            <div className="rounded-2xl bg-white border border-ink-900/5 px-4 py-4">
              <p className="text-[10px] font-bold tracking-wide text-slate-500 px-1 pb-2">REST OF TODAY</p>
              <div className="flex flex-wrap gap-2">
                {upcoming.map((d, i) => (
                  <span
                    key={d.iso + i}
                    className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold ${
                      i < 3 ? "bg-cream-100 border border-gold-500/25 text-ink-900" : "bg-cream-50 text-slate-600"
                    }`}
                  >
                    {hhmm(d.iso)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {waves.map((w) => (
            <div key={w.label} className="rounded-2xl bg-white border border-ink-900/5 px-4 py-4">
              <p className="text-[10px] font-bold tracking-wide text-slate-500 px-1 pb-2">{w.label.toUpperCase()}</p>
              <div className="flex flex-wrap gap-2">
                {w.items.map((d, i) => (
                  <span key={d.iso + "-p" + i} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[13px] text-slate-400 line-through">
                    {hhmm(d.iso)}
                  </span>
                ))}
              </div>
            </div>
          ))}

          <p className="px-1 text-[11px] leading-relaxed text-slate-400">
            Times are departure times from the route's first stop. Peak waves run every 15–20 min on this route; service
            reduces after the evening peak. Plan to arrive 3 minutes early — the bus won't wait, but the next one isn't
            far.
          </p>

          {!hideCta && (
            <button
              type="button"
              onClick={() => navigate("/load-trips")}
              className="btn-gold w-full py-3.5 text-[14px]"
            >
              Load trips for this route →
            </button>
          )}
        </>
      )}
    </div>
  );
}
