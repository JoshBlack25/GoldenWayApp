import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchLiveAlerts } from "../../../api/goldenway";

/**
 * /alerts (commuter) — every currently-live service_alerts row, exactly
 * what the ADMIN published in the staff console. Reads straight from
 * service_alerts (RLS: service_alerts_read allows any authenticated
 * user), so this works for every commuter regardless of whether they
 * own a gold card yet or got a push notification for it.
 */
const SEVERITY_STYLE = {
  INFO: { ring: "border-ink-900/10 bg-cream-200 text-ink-700", icon: "ℹ️" },
  WARNING: { ring: "border-gold-500/30 bg-gold-400/10 text-gold-700", icon: "⚠️" },
  CRITICAL: { ring: "border-brand-500/25 bg-brand-50 text-brand-600", icon: "🚨" },
};

export default function AlertsScreen() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchLiveAlerts()
      .then((list) => {
        if (!cancelled) setAlerts(list || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Could not load service alerts");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-5 pt-2 pb-8">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-ink-900 text-xl leading-none px-1 -ml-1"
            aria-label="Back"
          >
            &larr;
          </button>
          <h1 className="font-display text-[16px] font-bold text-gold-500">Service alerts</h1>
          <span className="w-6" aria-hidden="true" />
        </header>
        <p className="text-[13px] text-ink-900/50 text-center mt-0.5">
          {loading
            ? "Loading…"
            : alerts.length > 0
              ? `${alerts.length} live alert${alerts.length === 1 ? "" : "s"}`
              : "Nothing to report right now"}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 pb-10">
          {error && (
            <div className="rounded-2xl border border-brand-500/25 bg-brand-50 px-4 py-3 text-[13px] text-brand-600">
              {error}
            </div>
          )}

          {!loading && !error && alerts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-900/10 py-12 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-[13px] text-ink-900/50">
                No service disruptions — everything's running as scheduled.
              </p>
            </div>
          )}

          {alerts.map((a, i) => {
            const style = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.INFO;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                className={`card rounded-2xl border p-4 ${style.ring}`}
              >
                <div className="flex items-start gap-3">
                  <span className="h-10 w-10 shrink-0 rounded-xl border border-ink-900/10 bg-cream-100 flex items-center justify-center text-[16px]">
                    {style.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13.5px] font-semibold text-ink-900">{a.title}</span>
                      {a.routeCode ? (
                        <span className="text-[10px] font-bold tracking-wide text-ink-900/50 border border-ink-900/15 rounded-full px-2 py-0.5">
                          ROUTE {a.routeCode}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold tracking-wide text-ink-900/50 border border-ink-900/15 rounded-full px-2 py-0.5">
                          NETWORK-WIDE
                        </span>
                      )}
                    </span>
                    {a.body && (
                      <span className="block text-[12px] text-ink-900/60 mt-1 leading-relaxed">
                        {a.body}
                      </span>
                    )}
                    <span className="block text-[11px] text-ink-900/35 mt-1.5">
                      Since{" "}
                      {new Date(a.effectiveFrom).toLocaleString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
