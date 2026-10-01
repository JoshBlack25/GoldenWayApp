import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  lookupCardForInspection,
  logInspectionOutcome,
  fetchMyRecentInspections,
  searchCardNumbers,
  blockCard,
  verifyConcession,
} from "../../../api/operations";

const NOTE_MAX = 300;

const OUTCOMES = [
  { code: "VALID", label: "Valid", cls: "bg-emerald-500" },
  { code: "NO_PRODUCT", label: "No product", cls: "bg-amber-500" },
  { code: "EXPIRED_PRODUCT", label: "Expired", cls: "bg-orange-500" },
  { code: "UNREGISTERED_CARD", label: "Unregistered", cls: "bg-sky-500" },
  { code: "REFUSED", label: "Refused", cls: "bg-brand-500" },
];

// Statuses an inspector is allowed to block (must match block_card() in the database)
const BLOCKABLE = ["ACTIVE", "UNREGISTERED"];

export default function VerifyScreen() {
  const [cardNumber, setCardNumber] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [report, setReport] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState("");
  const [loggedMsg, setLoggedMsg] = useState("");
  const [recent, setRecent] = useState([]);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  // Used to ignore slow, out-of-date suggestion responses
  const suggestReq = useRef(0);

  const statusStyle = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "BLOCKED":
        return "bg-red-100 text-red-700";
      case "UNREGISTERED":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-ink-100 text-ink-900/50";
    }
  };

  // Loads "your recent lookups" from the database. Called once when the
  // screen first opens, and again every time an outcome is logged (so the
  // list stays up to date).
  async function loadRecent() {
    try {
      setRecent(await fetchMyRecentInspections(8));
    } catch {
      /* additive */
    }
  }

  // Runs loadRecent() exactly once, right when the screen first appears.
  useEffect(() => {
    loadRecent();
  }, []);

  // Looks a card up and converts the database's snake_case answer into the
  // camelCase shape this screen uses. Returns null when the card doesn't exist.
  // lookup_card_for_inspection() returns one jsonb object, but we also accept
  // an array so the screen still works if the function is ever changed back.
  async function fetchReport(number) {
    const result = await lookupCardForInspection(number);
    const data = Array.isArray(result) ? result[0] : result;
    if (!data) return null;
    return {
      cardNumber: data.card_number,
      status: data.status,
      registered: data.registered,
      ownerName: data.owner_name,
      commuterId: data.commuter_id,
      concessionType: data.concession_type,
      concessionVerified: data.concession_verified,
      journeysRemaining: data.journeys_remaining,
      loadedProducts: (data.loaded_products || []).map((p) => ({
        productCode: p.product_code,
        routeCode: p.route_code,
        journeysTotal: p.journeys_total,
        journeysUsed: p.journeys_used,
        validTo: p.valid_to,
      })),
      recentInspections: data.recent_inspections || [],
    };
  }

  async function lookup(e) {
    e?.preventDefault();
    if (!cardNumber.trim() || busy) return;
    setBusy(true);
    setError("");
    setLoggedMsg("");
    setReport(null);
    setSuggestions([]);
    try {
      const r = await fetchReport(cardNumber);
      if (!r) setError("Card not found");
      else setReport(r);
    } catch (err) {
      setError(err?.message || "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  // Runs when the inspector taps one of the outcome buttons (Valid, No
  // product, etc.). Sends the chosen outcome + optional note to the
  // database (via logInspectionOutcome -> log_inspection_outcome() in
  // SQL), which permanently saves a new row in the inspection_events
  // table. Afterwards it clears the screen back to the empty search box
  // and refreshes "your recent lookups".
  async function log(outcome) {
    if (logging) return;
    setLogging(true);
    setError("");
    try {
      await logInspectionOutcome(
        report.cardNumber,
        outcome,
        note.trim() || null,
      );
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

  async function handleInputChange(e) {
    const value = e.target.value.toUpperCase();
    setCardNumber(value);

    const myReq = ++suggestReq.current;
    if (value.length >= 3) {
      try {
        const results = await searchCardNumbers(value);
        if (myReq === suggestReq.current) setSuggestions(results || []);
      } catch {
        if (myReq === suggestReq.current) setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  }

  // Blocking is one database call (block_card). The database checks the role,
  // changes the status, writes the audit entry and sends the notifications.
  async function handleBlockCard() {
    if (!report?.cardNumber) return;
    setBusy(true);
    setError("");
    try {
      await blockCard(report.cardNumber, note.trim() || null);
      const fresh = await fetchReport(report.cardNumber);
      if (fresh) setReport(fresh);
      setLoggedMsg(`Card ${report.cardNumber} has been BLOCKED`);
      setNote("");
      loadRecent();
    } catch (err) {
      setError(err?.message || "Failed to block card");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyConcession(commuterId) {
    if (!commuterId) return;
    setBusy(true);
    setError("");
    try {
      await verifyConcession(commuterId);
      const fresh = await fetchReport(report.cardNumber);
      if (fresh) setReport(fresh);
      setLoggedMsg(`Concession verified for ${report.cardNumber}`);
    } catch (err) {
      setError(err?.message || "Failed to verify concession");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-2">
      {/* Page title */}
      <header>
        <h1 className="font-display text-xl font-bold text-ink-900">
          Handheld verifier
        </h1>
        <p className="text-[13px] text-ink-900/50 mt-0.5">
          Look up any Gold Card on board — read-only, privacy-safe (BR-08).
        </p>
      </header>

      {/* Card-number search box + "Look up" button */}
      <form onSubmit={lookup} className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <input
            value={cardNumber}
            onChange={handleInputChange}
            placeholder="GW-XXXX-XXXX"
            className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3.5 font-mono text-[15px] tracking-wider text-ink-900 placeholder:text-ink-900/25 outline-none focus:border-gold-400/60"
          />
          {suggestions.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-ink-900/10 bg-white shadow-lg z-10">
              {suggestions.map((s) => (
                <li
                  key={s.card_number}
                  onClick={() => {
                    setCardNumber(s.card_number);
                    setSuggestions([]);
                  }}
                  className="px-4 py-2 text-[13px] font-mono text-ink-900 cursor-pointer hover:bg-cream-200 flex justify-between"
                >
                  <span>{s.card_number}</span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle(s.status)}`}
                  >
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={busy || !cardNumber.trim()}
          className="btn-gold rounded-xl px-5 py-3.5 text-[13px] disabled:opacity-50"
        >
          {busy ? "…" : "Look up"}
        </button>
      </form>

      {/* Error / success banners */}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-[12px] text-red-600"
        >
          {error}
        </p>
      )}
      {loggedMsg && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-[12px] text-emerald-700"
        >
          ✓ {loggedMsg}
        </p>
      )}

      {/* The card report — appears after a successful lookup */}
      {report && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-ink-900/10 bg-white p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[15px] font-bold tracking-wider text-gold-700">
                {report.cardNumber}
              </p>
              <p className="text-[12px] text-ink-900/50 mt-0.5">
                {report.registered
                  ? `Registered · ${report.ownerName || "owner"}`
                  : "Unregistered card"}
              </p>
            </div>
            <div className="flex items-center">
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${
                  report.status === "ACTIVE"
                    ? "border-emerald-400/30 text-emerald-700 bg-emerald-50"
                    : report.status === "BLOCKED"
                      ? "border-red-400/30 text-red-700 bg-red-50"
                      : "border-ink-900/15 text-ink-900/55"
                }`}
              >
                {report.status}
              </span>
              {BLOCKABLE.includes(report.status) && (
                <button
                  type="button"
                  onClick={() => setShowBlockConfirm(true)}
                  disabled={busy}
                  className="ml-3 rounded-lg bg-red-500 px-3 py-1 text-[11px] font-bold text-white hover:brightness-110 disabled:opacity-50"
                >
                  Block Card
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat
              label="JOURNEYS LEFT"
              value={report.journeysRemaining ?? "—"}
            />
            <Stat
              label="CONCESSION"
              value={
                report.concessionType && report.concessionType !== "NONE"
                  ? `${report.concessionType}${report.concessionVerified ? " ✓" : " (unverified)"}`
                  : "—"
              }
            />
          </div>

          {report.concessionType &&
            report.concessionType !== "NONE" &&
            !report.concessionVerified && (
              <button
                type="button"
                onClick={() => handleVerifyConcession(report.commuterId)}
                disabled={busy}
                className="mt-2 rounded-lg bg-blue-500 px-3 py-1 text-[11px] font-bold text-white hover:brightness-110 disabled:opacity-50"
              >
                Verify Concession
              </button>
            )}

          {report.loadedProducts?.length > 0 && (
            <div className="mt-4">
              <p className="eyebrow text-ink-900/40">LOADED PRODUCTS</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {report.loadedProducts.map((p) => (
                  <div
                    key={p.productCode + (p.routeCode || "") + p.validTo}
                    className="flex items-center justify-between rounded-lg bg-cream-300 px-3 py-2 text-[12px]"
                  >
                    <span className="font-semibold text-ink-900/85">
                      {p.productCode}
                      {p.routeCode ? ` · ${p.routeCode}` : ""}
                    </span>
                    <span className="text-ink-900/50">
                      {p.journeysTotal - p.journeysUsed} left · to {p.validTo}
                    </span>
                  </div>
                ))}
              </div>
              {/* Manual journey deduction (validator-failure fallback, with a
                  required reason) gets added here once its database function exists. */}
            </div>
          )}

          {report.recentInspections?.length > 0 && (
            <p className="mt-3 text-[11px] text-ink-900/40">
              Past inspections:{" "}
              {report.recentInspections
                .map(
                  (i) =>
                    `${i.outcome} (${new Date(i.at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })})`,
                )
                .join(" · ")}
            </p>
          )}

          {/* Note box + the 5 outcome buttons */}
          <div className="mt-4">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for the inspection record"
              maxLength={NOTE_MAX}
              className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-2.5 text-[12.5px] text-ink-900 placeholder:text-ink-900/30 outline-none focus:border-gold-400/60"
            />
            <span className="mt-1 block text-right text-[10px] text-ink-900/30">
              {note.length}/{NOTE_MAX}
            </span>
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

      {/* Shortcut list of recent lookups. Tapping one re-fills the search box. */}
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
                <span className="font-mono text-ink-900/70">
                  {r.card_number}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-ink-900/45">
                    {new Date(r.at).toLocaleTimeString("en-ZA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      r.outcome === "VALID"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {r.outcome}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Block confirmation dialog. It lives at the top level of the screen
          (not inside the recent-lookups list) so it always opens. */}
      {showBlockConfirm && report && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[300px]">
            <h2 className="text-[14px] font-bold text-ink-900 mb-3">
              Confirm Block
            </h2>
            <p className="text-[12px] text-ink-900/70 mb-4">
              Are you sure you want to block card{" "}
              <span className="font-mono">{report.cardNumber}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBlockConfirm(false)}
                className="rounded-lg border border-ink-900/20 px-3 py-1 text-[12px] text-ink-900 hover:bg-cream-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowBlockConfirm(false);
                  await handleBlockCard();
                }}
                className="rounded-lg bg-red-500 px-3 py-1 text-[12px] font-bold text-white hover:brightness-110"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// A small reusable "label + big number" box.
function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-cream-300 px-3.5 py-3">
      <p className="eyebrow text-ink-900/40">{label}</p>
      <p className="font-display text-[16px] font-bold text-ink-900 mt-0.5 truncate">
        {value}
      </p>
    </div>
  );
}
