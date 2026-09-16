import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { lookupCardForInspection, logInspectionOutcome, fetchRecentInspections } from "../../../api/operations";

/**
 * INSPECTOR — Handheld verifier (D5, BR-08). Card number in, live card
 * report out via lookup_card_for_inspection() (privacy-safe: first name +
 * initial only), then the outcome is logged with log_inspection_outcome().
 */
const OUTCOMES = [
  { code: "VALID", label: "Valid", cls: "bg-emerald-500" },
  { code: "NO_PRODUCT", label: "No product", cls: "bg-amber-500" },
  { code: "EXPIRED_PRODUCT", label: "Expired", cls: "bg-orange-500" },
  { code: "UNREGISTERED_CARD", label: "Unregistered", cls: "bg-sky-500" },
  { code: "REFUSED", label: "Refused", cls: "bg-brand-500" },
];

export default function VerifyScreen() {
  const [cardNumber, setCardNumber] = useState("");
  const [report, setReport] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState("");
  const [loggedMsg, setLoggedMsg] = useState("");
  const [recent, setRecent] = useState([]);

  async function loadRecent() {
    try {
      setRecent(await fetchRecentInspections(8));
    } catch {
      /* additive */
    }
  }

  useEffect(() => {
    loadRecent();
  }, []);

  async function lookup(e) {
    e?.preventDefault();
    if (!cardNumber.trim() || busy) return;
    setBusy(true);
    setError("");
    setLoggedMsg("");
    setReport(null);
    try {
      setReport(await lookupCardForInspection(cardNumber));
    } catch (err) {
      setError(err?.message || "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  async function log(outcome) {
    if (logging) return;
    setLogging(true);
    setError("");
    try {
      await logInspectionOutcome(report.cardNumber, outcome, note.trim() || null);
      setLoggedMsg(`Logged: ${outcome} on ${report.cardNumber}`);
      setNote("");
      setReport(null);
      setCardNumber("");
      loadRecent();
    } catch (err) {
      setError(err?.message || "Could not log the outcome");
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="px-5 pt-2">
        <header>
          <h1 className="font-display text-xl font-bold text-ink-900">Handheld verifier</h1>
          <p className="text-[13px] text-ink-900/50 mt-0.5">
            Look up any Gold Card on board — read-only, privacy-safe (BR-08).
          </p>
        </header>

        <form onSubmit={lookup} className="mt-5 flex gap-2">
          <input
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value.toUpperCase())}
            placeholder="GW-XXXX-XXXX"
            className="flex-1 rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3.5 font-mono text-[15px] tracking-wider text-ink-900 placeholder:text-ink-900/25 outline-none focus:border-gold-400/60"
          />
          <button
            type="submit"
            disabled={busy || !cardNumber.trim()}
            className="btn-gold rounded-xl px-5 py-3.5 text-[13px] disabled:opacity-50"
          >
            {busy ? "…" : "Look up"}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-[12px] text-red-300">
            {error}
          </p>
        )}
        {loggedMsg && (
          <p role="status" className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-[12px] text-emerald-300">
            ✓ {loggedMsg}
          </p>
        )}

        {report && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-ink-900/10 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[15px] font-bold tracking-wider text-gold-300">{report.cardNumber}</p>
                <p className="text-[12px] text-ink-900/50 mt-0.5">
                  {report.registered ? `Registered · ${report.ownerName || "owner"}` : "Unregistered card"}
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${
                report.status === "ACTIVE" ? "border-emerald-400/30 text-emerald-300" : "border-ink-900/15 text-ink-900/55"
              }`}>
                {report.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat label="JOURNEYS LEFT" value={report.journeysRemaining ?? "—"} />
              <Stat label="CONCESSION" value={report.concessionType && report.concessionType !== "NONE" ? `${report.concessionType}${report.concessionVerified ? " ✓" : " (unverified)"}` : "—"} />
            </div>

            {report.loadedProducts?.length > 0 && (
              <div className="mt-4">
                <p className="eyebrow text-ink-900/40">LOADED PRODUCTS</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {report.loadedProducts.map((p) => (
                    <div key={p.productCode + (p.routeCode || "")} className="flex items-center justify-between rounded-lg bg-cream-300 px-3 py-2 text-[12px]">
                      <span className="font-semibold text-ink-900/85">{p.productCode}{p.routeCode ? ` · ${p.routeCode}` : ""}</span>
                      <span className="text-ink-900/50">{p.journeysTotal - p.journeysUsed} left · to {p.validTo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.recentInspections?.length > 0 && (
              <p className="mt-3 text-[11px] text-ink-900/40">
                Past inspections: {report.recentInspections.map((i) => `${i.outcome} (${new Date(i.at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })})`).join(" · ")}
              </p>
            )}

            <div className="mt-4">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for the inspection record"
                className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-2.5 text-[12.5px] text-ink-900 placeholder:text-ink-900/30 outline-none focus:border-gold-400/60"
              />
              <p className="eyebrow text-ink-900/40 mt-4 mb-2">LOG OUTCOME</p>
              <div className="flex flex-wrap gap-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.code}
                    type="button"
                    disabled={logging}
                    onClick={() => log(o.code)}
                    className={`rounded-xl ${o.cls} px-3.5 py-2.5 text-[12px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {recent.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow text-ink-900/40 mb-2">YOUR RECENT LOOKUPS</p>
            <div className="flex flex-col gap-1.5">
              {recent.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setCardNumber(r.card_number)}
                  className="flex items-center justify-between rounded-xl border border-ink-900/10 bg-white px-4 py-2.5 text-[12px] hover:border-ink-900/20 transition-colors"
                >
                  <span className="font-mono text-ink-900/70">{r.card_number}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-ink-900/45">{new Date(r.at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.outcome === "VALID" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                      {r.outcome}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-cream-300 px-3.5 py-3">
      <p className="eyebrow text-ink-900/40">{label}</p>
      <p className="font-display text-[16px] font-bold text-ink-900 mt-0.5 truncate">{value}</p>
    </div>
  );
}
