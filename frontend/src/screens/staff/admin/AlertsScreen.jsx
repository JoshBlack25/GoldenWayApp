import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchRoutes, fetchActiveAlerts, fetchPastAlerts, createServiceAlert, expireAlert } from "../../../api/catalog";
import { ApiError } from "../../../api/client";

/**
 * ADMIN — Service alerts (S2-D4). Publishing here inserts into
 * service_alerts, which the notify_alert_published() trigger (0007)
 * fans out to every affected commuter's notification feed straight
 * away — no client-side notification code, the DB does the fan-out.
 */

const SEVERITY = ["INFO", "WARNING", "CRITICAL"];

const SEVERITY_STYLE = {
  INFO: "border-ink-900/15 bg-cream-200 text-ink-700",
  WARNING: "border-gold-500/40 bg-gold-400/10 text-gold-700",
  CRITICAL: "border-brand-500/30 bg-brand-50 text-brand-600",
};

export default function AlertsScreen() {
  const [routes, setRoutes] = useState([]);
  const [active, setActive] = useState([]);
  const [past, setPast] = useState([]);
  const [showPast, setShowPast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([fetchRoutes(), fetchActiveAlerts()]);
      setRoutes(r);
      setActive(a);
    } catch (err) {
      setMessage({ kind: "err", text: err?.message || "Could not load alerts" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function loadPast() {
    setShowPast(true);
    if (past.length) return;
    try {
      setPast(await fetchPastAlerts());
    } catch {
      // Past-alert history is a nice-to-have; a failed fetch here isn't blocking.
    }
  }

  async function endNow(alert) {
    if (busyId) return;
    setBusyId(alert.id);
    setMessage(null);
    try {
      await expireAlert(alert.id);
      setMessage({ kind: "ok", text: `“${alert.title}” ended.` });
      await load();
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof ApiError ? err.message : "Could not end that alert" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="px-5 pt-2 pb-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-900">Service alerts</h1>
            <p className="text-[13px] text-ink-900/50 mt-1">
              Publishing an alert notifies affected commuters immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="btn-gold shrink-0 px-4 py-2.5 text-[12px] rounded-lg"
          >
            + New alert
          </button>
        </header>

        {message && (
          <div
            role="status"
            className={`mt-4 rounded-xl px-4 py-3 text-[12px] font-medium ${
              message.kind === "ok"
                ? "border border-gold-500/30 bg-gold-400/10 text-gold-700"
                : "border border-brand-500/25 bg-brand-50 text-brand-600"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3">
          {loading && <p className="text-[13px] text-ink-900/40 py-6 text-center">Loading…</p>}

          {!loading && active.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-900/10 py-10 text-center">
              <p className="text-[13px] text-ink-900/50">No active alerts. The network is quiet. 🎉</p>
            </div>
          )}

          {!loading &&
            active.map((a) => (
              <motion.article
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-ink-900/10 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-[15px] font-semibold text-ink-900">{a.title}</h2>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-bold tracking-wider ${SEVERITY_STYLE[a.severity]}`}>
                        {a.severity}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-ink-900/40 mt-1">
                      {a.route_code ? `Route ${a.route_code}` : "Network-wide"} · since{" "}
                      {new Date(a.effective_from).toLocaleString()}
                      {a.effective_to ? ` · ends ${new Date(a.effective_to).toLocaleString()}` : ""}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-900/70">{a.body}</p>
                <button
                  type="button"
                  disabled={busyId === a.id}
                  onClick={() => endNow(a)}
                  className="mt-4 rounded-lg border border-ink-900/10 px-3 py-2 text-[11px] font-semibold text-ink-900/70 hover:text-brand-600 hover:border-brand-500/50 disabled:opacity-50"
                >
                  {busyId === a.id ? "…" : "End now"}
                </button>
              </motion.article>
            ))}
        </div>

        <div className="mt-6">
          {!showPast ? (
            <button
              type="button"
              onClick={loadPast}
              className="text-[12px] font-semibold text-gold-700 hover:underline underline-offset-2"
            >
              Show past alerts
            </button>
          ) : (
            <>
              <p className="eyebrow text-gold-600">PAST ALERTS</p>
              <div className="mt-2 flex flex-col gap-2">
                {past.length === 0 && <p className="text-[12.5px] text-ink-900/40">No past alerts yet.</p>}
                {past.map((a) => (
                  <div key={a.id} className="rounded-xl border border-ink-900/5 bg-cream-200 px-4 py-3">
                    <p className="text-[12.5px] font-semibold text-ink-900/70">
                      {a.title} <span className="text-[10px] font-normal text-ink-900/40">({a.severity})</span>
                    </p>
                    <p className="text-[11px] text-ink-900/40 mt-0.5">
                      {a.route_code ? `Route ${a.route_code}` : "Network-wide"} · ended{" "}
                      {new Date(a.effective_to).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ComposeModal
        open={composeOpen}
        routes={routes}
        onClose={() => setComposeOpen(false)}
        onPublished={(msg) => {
          setComposeOpen(false);
          setMessage({ kind: "ok", text: msg });
          load();
        }}
      />
    </div>
  );
}

function ComposeModal({ open, routes, onClose, onPublished }) {
  const [form, setForm] = useState({ title: "", body: "", severity: "INFO", routeCode: "", effectiveTo: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ title: "", body: "", severity: "INFO", routeCode: "", effectiveTo: "" });
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.body.trim()) {
      setError("Title and message are both required.");
      return;
    }
    setSaving(true);
    try {
      const row = await createServiceAlert({
        title: form.title,
        body: form.body,
        severity: form.severity,
        routeCode: form.routeCode || null,
        effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : null,
      });
      onPublished(
        `Published — notified ${form.routeCode ? `commuters on ${form.routeCode}` : "every commuter"}.`,
      );
      return row;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not publish the alert");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" role="dialog" aria-modal="true">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-ink-900/10 bg-white p-6 max-h-[85vh] overflow-y-auto no-scrollbar"
      >
        <h2 className="font-display text-lg font-bold">New service alert</h2>
        <p className="text-[12px] text-ink-900/50 mt-1">
          Commuters are notified the moment this is published.
        </p>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-brand-500/25 bg-brand-50 px-3 py-2 text-[12px] text-brand-600">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3">
          <input
            placeholder="Title, e.g. Route 42 delayed"
            value={form.title}
            onChange={set("title")}
            className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 placeholder:text-ink-900/30 outline-none focus:border-gold-400/60"
          />
          <textarea
            rows={3}
            placeholder="What's happening and what should commuters expect?"
            value={form.body}
            onChange={set("body")}
            className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 placeholder:text-ink-900/30 outline-none focus:border-gold-400/60 resize-none"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.severity}
              onChange={set("severity")}
              className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 outline-none focus:border-gold-400/60"
            >
              {SEVERITY.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={form.routeCode}
              onChange={set("routeCode")}
              className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 outline-none focus:border-gold-400/60"
            >
              <option value="">Network-wide</option>
              {routes.map((r) => (
                <option key={r.code} value={r.code}>{r.code}</option>
              ))}
            </select>
          </div>

          <label className="text-[11px] font-semibold text-ink-900/50">
            Ends at (optional)
            <input
              type="datetime-local"
              value={form.effectiveTo}
              onChange={set("effectiveTo")}
              className="mt-1 w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 outline-none focus:border-gold-400/60"
            />
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-ink-900/10 py-2.5 text-[12px] font-semibold text-ink-900/70 hover:text-ink-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 py-2.5 text-[12px] font-bold text-ink-900 disabled:opacity-50"
          >
            {saving ? "Publishing…" : "Publish"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
