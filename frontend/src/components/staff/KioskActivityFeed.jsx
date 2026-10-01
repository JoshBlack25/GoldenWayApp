import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchKioskActivityToday } from "../../api/operations";

/**
 * KioskActivityFeed — "menu stack" list of every kiosk transaction
 * today (Sprint 2 K2, Joshua Black lane).
 *
 * Mobile-UX principles applied:
 * · Menu-stack pattern — one row per transaction, newest first, scannable
 *   at a glance: icon · card · product · amount.
 * · Progressive disclosure — a row is collapsed to one line; tapping it
 *   expands the receipt detail inline (product, time, receipt reference).
 * · Touch targets — every row is ≥52px tall with a 44px+ tap area.
 * · Simplified viz — leading icon tiles kind-code the transaction type
 *   (gold = cash load, ink = card fee) instead of dense tables.
 */
export default function KioskActivityFeed({ refreshKey = 0, limit = 40 }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchKioskActivityToday(limit);
      setRows(data);
      setError("");
    } catch (err) {
      setError(err?.message || "Could not load today's activity");
      setRows([]);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const totalCents = (rows || []).reduce((s, r) => s + r.amountCents, 0);

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="eyebrow text-ink-900/45">TODAY'S ACTIVITY</h2>
        {rows && (
          <p className="text-[11px] font-bold text-gold-700">
            {rows.length} transaction{rows.length === 1 ? "" : "s"} · R{(totalCents / 100).toFixed(2)}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-500/25 bg-red-100 px-4 py-2.5 text-[12.5px] text-red-700">
          {error}
        </p>
      )}

      {rows === null ? (
        <div className="mt-3 rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-[12.5px] text-ink-900/40">
          Loading activity…
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-ink-900/10 bg-white p-8 text-center">
          <p className="text-2xl">🧾</p>
          <p className="mt-2 text-[13px] font-semibold text-ink-900">No transactions yet today</p>
          <p className="mt-1 text-[12px] text-ink-900/50">
            Every cash load, card issue and replacement will appear here the moment it's paid.
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {rows.map((r) => {
              const open = openId === r.id;
              return (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-ink-900/10 bg-white overflow-hidden"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : r.id)}
                    aria-expanded={open}
                    className="w-full min-h-[56px] px-4 py-3 flex items-center gap-3 text-left active:bg-cream-200/60 transition-colors"
                  >
                    <span
                      className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border ${
                        r.kind === "FEE"
                          ? "bg-ink-900 border-ink-900 text-cream-50"
                          : "bg-gradient-to-br from-gold-400/30 to-gold-400/10 border-gold-400/40 text-gold-700"
                      }`}
                    >
                      {r.kind === "FEE" ? "💳" : "⚡"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold text-ink-900 truncate">{r.card}</span>
                        <span
                          className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${
                            r.kind === "FEE"
                              ? "border-ink-900/20 text-ink-900/60"
                              : "border-gold-500/40 bg-cream-100 text-gold-700"
                          }`}
                        >
                          {r.kind === "FEE" ? "CARD FEE" : r.product}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] text-ink-900/45">
                        {new Date(r.at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        receipt {r.receipt}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-[14.5px] font-bold text-ink-900">
                        R{(r.amountCents / 100).toFixed(2)}
                      </span>
                      <span className={`block text-[10px] text-ink-900/35 transition-transform ${open ? "rotate-180" : ""}`}>
                        ▼
                      </span>
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="border-t border-ink-900/5 bg-cream-100/60"
                      >
                        <dl className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                          <Detail label="Product" value={r.product} />
                          <Detail label="Type" value={r.kind === "FEE" ? "Card issue / replacement fee" : "Cash journey load"} />
                          <Detail label="Time" value={new Date(r.at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} />
                          <Detail label="Order" value={`#${r.id}`} />
                          <Detail label="Receipt" value={r.receipt} mono />
                          <Detail label="Amount paid" value={`R${(r.amountCents / 100).toFixed(2)}`} strong />
                        </dl>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {rows.length >= limit && (
            <li className="pt-1 text-center text-[11px] text-ink-900/35">
              Showing today's latest {limit} transactions
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function Detail({ label, value, mono, strong }) {
  return (
    <div>
      <dt className="text-[9.5px] font-bold tracking-[0.12em] text-ink-900/40">{label}</dt>
      <dd className={`mt-0.5 text-ink-900 ${mono ? "font-mono" : ""} ${strong ? "font-bold" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
