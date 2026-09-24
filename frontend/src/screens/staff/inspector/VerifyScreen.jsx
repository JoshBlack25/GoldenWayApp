import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { lookupCardForInspection, logInspectionOutcome, fetchMyRecentInspections } from "../../../api/operations";

// ============================================================================
// READ ME FIRST — how this file talks to the database
// ============================================================================
// This is a React "screen" (a page/component). It does not touch the
// database directly. Instead it calls plain JavaScript functions imported
// above from "../../../api/operations" (that file is
// frontend/src/api/operations.js). Each of those functions sends one
// request to Supabase, which runs a named function ("RPC" = Remote
// Procedure Call) written in SQL inside the database itself. The SQL for
// every one of those functions lives in the supabase/migrations/ folder.
//
// The three-step chain to remember, for every action on this screen:
//   1. User clicks a button here (VerifyScreen.jsx)
//   2. That calls a function from api/operations.js
//   3. That function calls supabase.rpc("some_name", ...), which runs the
//      SQL function of that EXACT name in the database.
//
// For this screen specifically:
//   - lookupCardForInspection(cardNumber)
//       -> calls the database function  lookup_card_for_inspection()
//       -> defined in supabase/migrations/0006_operations.sql
//          (its permission/security rules were tightened later in
//          supabase/migrations/0016_inspector_hardening.sql)
//   - logInspectionOutcome(cardNumber, outcome, note)
//       -> calls the database function  log_inspection_outcome()
//       -> also defined in 0006_operations.sql, hardened in 0016
//   - fetchMyRecentInspections(limit)
//       -> does NOT call a database function — it reads straight from the
//          "inspection_events" table (a normal SELECT query), filtered to
//          only this inspector's own records
//
// If someone asks "where does the data actually come from / get saved?",
// the answer is always: search the .sql files in supabase/migrations/ for
// the function name shown in api/operations.js.
// ============================================================================

const NOTE_MAX = 300; // matches the 300-character limit enforced again on the server side (see 0016 migration) — this is just so the user gets instant feedback instead of waiting for an error

/**
 * INSPECTOR — Handheld verifier (D5, BR-08). Card number in, live card
 * report out via lookup_card_for_inspection() (privacy-safe: first name +
 * initial only), then the outcome is logged with log_inspection_outcome().
 */

// The 5 possible outcomes an inspector can record for a card check.
// "code" is the exact value saved to the database (it must match the list
// of allowed values in the "outcome" column, enforced by a CHECK constraint
// in supabase/migrations/0006_operations.sql). "label"/"cls" are just for
// how the button looks on screen.
const OUTCOMES = [
  { code: "VALID", label: "Valid", cls: "bg-emerald-500" },
  { code: "NO_PRODUCT", label: "No product", cls: "bg-amber-500" },
  { code: "EXPIRED_PRODUCT", label: "Expired", cls: "bg-orange-500" },
  { code: "UNREGISTERED_CARD", label: "Unregistered", cls: "bg-sky-500" },
  { code: "REFUSED", label: "Refused", cls: "bg-brand-500" },
];

export default function VerifyScreen() {
  // ---- Everything below is just "memory" for this screen while it's open.
  // React calls this "state" — when one of these changes, the screen
  // automatically redraws itself to match. None of this is saved anywhere
  // permanent; it all resets if the page reloads.

  const [cardNumber, setCardNumber] = useState(""); // whatever the inspector has typed into the search box
  const [report, setReport] = useState(null); // the card's details, once we've looked one up (null = nothing looked up yet)
  const [note, setNote] = useState(""); // the optional note typed before logging an outcome
  const [busy, setBusy] = useState(false); // true while a "look up" request is in flight (disables the button so you can't double-click)
  const [logging, setLogging] = useState(false); // true while a "log outcome" request is in flight
  const [error, setError] = useState(""); // an error message to show, if something went wrong
  const [loggedMsg, setLoggedMsg] = useState(""); // a "success!" message to show after logging an outcome
  const [recent, setRecent] = useState([]); // this inspector's own last few lookups, shown at the bottom of the screen

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

  // Runs when the inspector submits the "Look up" search box.
  // Sends the typed card number to the database (via
  // lookupCardForInspection -> lookup_card_for_inspection() in SQL) and
  // stores whatever comes back in `report`, which is what makes the card
  // details section below appear.
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

  // ---- Everything below this point is just what gets drawn on screen
  // (JSX — it looks like HTML mixed into JavaScript). The logic that
  // decides WHAT to show/do already happened above.
  return (
    <div className="px-5 pt-2">
        {/* Page title */}
        <header>
          <h1 className="font-display text-xl font-bold text-ink-900">Handheld verifier</h1>
          <p className="text-[13px] text-ink-900/50 mt-0.5">
            Look up any Gold Card on board — read-only, privacy-safe (BR-08).
          </p>
        </header>

        {/* The card-number search box + "Look up" button. Submitting this
            form runs the lookup() function defined above. */}
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

        {/* Error / success banners — only show up when there's actually
            something in the `error` or `loggedMsg` state above. */}
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-[12px] text-red-600">
            {error}
          </p>
        )}
        {loggedMsg && (
          <p role="status" className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-[12px] text-emerald-700">
            ✓ {loggedMsg}
          </p>
        )}

        {/* The card report card — only appears once `report` has data in
            it (i.e. after a successful lookup). Everything inside here is
            exactly what the database's lookup_card_for_inspection()
            function returned, just laid out nicely. */}
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-ink-900/10 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[15px] font-bold tracking-wider text-gold-700">{report.cardNumber}</p>
                <p className="text-[12px] text-ink-900/50 mt-0.5">
                  {/* Privacy note: the database deliberately only ever sends back
                      the owner's first name + surname initial (e.g. "Thandi D."),
                      never full contact details — see lookup_card_for_inspection()
                      in the SQL for where that privacy limit is enforced. */}
                  {report.registered ? `Registered · ${report.ownerName || "owner"}` : "Unregistered card"}
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${
                report.status === "ACTIVE" ? "border-emerald-400/30 text-emerald-700 bg-emerald-50" : "border-ink-900/15 text-ink-900/55"
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

            {/* Note box + the 5 outcome buttons. Tapping any outcome button
                calls log(outcome) defined above, which is what actually
                saves the inspection to the database. */}
            <div className="mt-4">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for the inspection record"
                maxLength={NOTE_MAX}
                className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-2.5 text-[12.5px] text-ink-900 placeholder:text-ink-900/30 outline-none focus:border-gold-400/60"
              />
              <span className="mt-1 block text-right text-[10px] text-ink-900/30">{note.length}/{NOTE_MAX}</span>
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

        {/* "Your recent lookups" — a shortcut list at the bottom of the
            screen. Tapping one of these just re-fills the search box with
            that card number (it doesn't look it up automatically — the
            inspector still has to press "Look up"). This list comes from
            fetchMyRecentInspections(), which only returns THIS inspector's
            own past lookups, not the whole team's (that fuller, shared
            history lives on the separate "History" tab / screen —
            see InspectionHistoryScreen.jsx). */}
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
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.outcome === "VALID" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
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

// A small reusable "label + big number" box, used twice above
// (JOURNEYS LEFT and CONCESSION). Just a display helper, no logic.
function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-cream-300 px-3.5 py-3">
      <p className="eyebrow text-ink-900/40">{label}</p>
      <p className="font-display text-[16px] font-bold text-ink-900 mt-0.5 truncate">{value}</p>
    </div>
  );
}
