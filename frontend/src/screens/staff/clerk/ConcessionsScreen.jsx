import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  fetchPendingConcessions,
  fetchRecentVerifiedConcessions,
  verifyConcession,
} from "../../../api/operations";

/**
 * CLERK — Concession verification (Sprint 2 K3, Joshua Black).
 * BR-06: student/pensioner claims are verified at the counter. The queue
 * reads the real commuters table (CLERK RLS); verifying stamps
 * concession_verified_at via the 0002 RPC, and the 0007 trigger notifies
 * the commuter on their bell immediately.
 */
const TYPE_STYLE = {
  STUDENT: "border-sky-500/30 bg-sky-100 text-sky-700",
  PENSIONER: "border-violet-500/30 bg-violet-100 text-violet-700",
};

export default function ConcessionsScreen() {
  const [pending, setPending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([
        fetchPendingConcessions(),
        fetchRecentVerifiedConcessions(),
      ]);
      setPending(p);
      setRecent(r);
    } catch (err) {
      setError(err?.message || "Could not load the concessions queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleVerify(row) {
    if (busyId) return;
    setBusyId(row.id);
    setError("");
    try {
      await verifyConcession(row.id);
      setToast(`${row.first_name}'s ${row.concession_type.toLowerCase()} concession verified — they've been notified.`);
      await load();
    } catch (err) {
      setError(err?.message || "Verification failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="px-5 pt-2">
      <header>
        <h1 className="font-display text-xl font-bold text-ink-900">Concession checks</h1>
        <p className="text-[13px] text-ink-900/50 mt-0.5">
          Verify student &amp; pensioner claims (BR-06). The commuter is notified the moment you confirm.
        </p>
      </header>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-500/25 bg-red-100 px-4 py-2.5 text-[12.5px] text-red-700">
          {error}
        </p>
      )}
      {toast && (
        <p role="status" className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-100 px-4 py-2.5 text-[12.5px] text-emerald-700">
          ✓ {toast}
        </p>
      )}

      {/* Pending queue */}
      <section className="mt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow text-ink-900/45">AWAITING VERIFICATION</h2>
          <span className="text-[11px] font-bold text-gold-700">{pending.length} waiting</span>
        </div>

        {loading ? (
          <div className="mt-3 rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-[12.5px] text-ink-900/40">
            Loading queue…
          </div>
        ) : pending.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-ink-900/10 bg-white p-8 text-center">
            <p className="text-2xl">🎉</p>
            <p className="mt-2 text-[13px] font-semibold text-ink-900">Queue clear</p>
            <p className="mt-1 text-[12px] text-ink-900/50">Every claim has been verified. New sign-ups appear here automatically.</p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {pending.map((row) => (
              <motion.li
                key={row.id}
                layout
                className="rounded-2xl border border-ink-900/10 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-[14.5px] font-semibold text-ink-900 truncate">
                        {row.first_name} {row.surname}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${TYPE_STYLE[row.concession_type] || "border-ink-900/15 bg-cream-200 text-ink-900/60"}`}>
                        {row.concession_type}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-900/50">{row.email}</p>
                    <p className="mt-1 text-[11px] text-ink-900/40">
                      Claimed {row.created_at ? new Date(row.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "recently"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVerify(row)}
                    disabled={busyId === row.id}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2.5 text-[12px] font-bold text-ink-900 shadow-[0_10px_24px_-10px_rgba(240,180,41,0.8)] disabled:opacity-50 active:scale-[0.97]"
                  >
                    {busyId === row.id ? "Verifying…" : "Verify"}
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      {/* Recently verified */}
      {recent.length > 0 && (
        <section className="mt-7">
          <h2 className="eyebrow text-ink-900/45">RECENTLY VERIFIED</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {recent.map((row) => (
              <li key={row.id} className="flex items-center justify-between rounded-xl border border-ink-900/5 bg-white px-4 py-2.5">
                <div>
                  <p className="text-[13px] font-semibold text-ink-900">
                    {row.first_name} {row.surname}
                  </p>
                  <p className="text-[11px] text-ink-900/45">{row.concession_type}</p>
                </div>
                <p className="text-[11px] text-ink-900/40">
                  {row.concession_verified_at
                    ? new Date(row.concession_verified_at).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
