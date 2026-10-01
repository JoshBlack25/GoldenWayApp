import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTrips } from "../../../context/trip";
import { fetchRoutesFromDb } from "../../../api/goldenway";
import { fetchLiveRunsForRoutes } from "../../../api/operations";
import { activeRouteCodes } from "../../../utils/myRoutes";

export default function RoutesScreen() {
  const navigate = useNavigate();
  const { card } = useTrips();
  const [routes, setRoutes] = useState([]);
  const [liveByRoute, setLiveByRoute] = useState({});
  const [loading, setLoading] = useState(true);

  const myRouteCodes = useMemo(() => activeRouteCodes(card), [card]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await fetchRoutesFromDb();
        if (cancelled) return;
        setRoutes(all);
        const live = await fetchLiveRunsForRoutes(all.map((r) => r.code));
        if (!cancelled) setLiveByRoute(live);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myRoutes = routes.filter((r) => myRouteCodes.includes(r.code));
  const otherRoutes = routes.filter((r) => !myRouteCodes.includes(r.code));

  return (
    <div className="flex flex-col gap-6 px-5 pb-6">
      <div>
        <p className="eyebrow text-gold-600">GET AROUND</p>
        <h1 className="font-display text-xl font-bold text-ink-900 mt-1">
          Routes
        </h1>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      ) : (
        <>
          {myRoutes.length > 0 && (
            <Section
              title="Your Routes"
              routes={myRoutes}
              live={liveByRoute}
              onOpen={(c) => navigate(`/routes/${c}`)}
            />
          )}
          <Section
            title={myRoutes.length > 0 ? "All Routes" : "Routes"}
            routes={otherRoutes}
            live={liveByRoute}
            onOpen={(c) => navigate(`/routes/${c}`)}
          />
        </>
      )}
    </div>
  );
}

function Section({ title, routes, live, onOpen }) {
  if (routes.length === 0) return null;
  return (
    <div>
      <h2 className="font-display text-[14px] font-bold text-ink-900 mb-3">
        {title}
      </h2>
      <div className="flex flex-col gap-2.5">
        {routes.map((r) => (
          <RouteRow
            key={r.code}
            route={r}
            run={live[r.code]}
            onClick={() => onOpen(r.code)}
          />
        ))}
      </div>
    </div>
  );
}

function RouteRow({ route, run, onClick }) {
  const status = statusFor(run);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl bg-white border border-ink-900/5 px-4 py-3.5 text-left shadow-[var(--shadow-card)] transition-all hover:border-gold-500/40"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-ink-900 truncate">
          {route.origin} → {route.destination}
        </span>
        <span className="block text-[11px] text-slate-500 mt-0.5">
          {route.code}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${status.className}`}
      >
        {status.label}
      </span>
    </motion.button>
  );
}

function statusFor(run) {
  if (!run)
    return { label: "SCHEDULED", className: "bg-slate-100 text-slate-500" };
  if (run.status === "BREAKDOWN")
    return { label: "BREAKDOWN", className: "bg-brand-100 text-brand-700" };
  if (run.status === "DELAYED")
    return {
      label: `+${run.delayMinutes} MIN`,
      className: "bg-amber-100 text-amber-700",
    };
  if (run.status === "DIVERTED")
    return { label: "DIVERTED", className: "bg-sky-100 text-sky-700" };
  return { label: "ON TIME", className: "bg-emerald-100 text-emerald-700" };
}
