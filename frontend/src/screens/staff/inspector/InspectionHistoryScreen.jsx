import { useEffect, useMemo, useState } from "react";
import { fetchRecentInspections } from "../../../api/operations";

// ============================================================================
// READ ME FIRST — how this file talks to the database
// ============================================================================
// Same pattern as VerifyScreen.jsx in this same folder: this screen never
// talks to the database directly. It calls fetchRecentInspections() from
// frontend/src/api/operations.js, which runs a normal read (a SELECT
// query, not a special database function this time) against the
// "inspection_events" table. That table gets its rows written to it
// whenever ANY inspector logs an outcome on the Verify screen
// (log_inspection_outcome(), see supabase/migrations/0006_operations.sql).
//
// The permission rule that lets this screen see EVERY inspector's records
// (not just the person currently logged in) lives in the database, not
// here — it's the "inspection_events_read" policy, defined in
// supabase/migrations/0006_operations.sql and tightened in
// supabase/migrations/0016_inspector_hardening.sql. If you ever wonder
// "why can this account see other people's inspections?", that policy is
// the answer — this screen is just displaying whatever the database
// allowed it to read.
// ============================================================================

/**
 * INSPECTOR — Inspection history (BR-08 audit trail). The team-wide log
 * behind the "fare evasion counter-measure" — every INSPECTOR/ADMIN can
 * read all rows (RLS), so this is deliberately the fuller record; the
 * "recent lookups" list on the Verify screen is this inspector's own
 * quick-recall shortlist instead.
 */

// Colour badge for each possible outcome value (must match the outcomes
// listed in VerifyScreen.jsx and the CHECK constraint on the "outcome"
// column in the database — see 0006_operations.sql).
const OUTCOME_PILL = {
  VALID: "bg-emerald-100 text-emerald-700",
  NO_PRODUCT: "bg-amber-100 text-amber-700",
  EXPIRED_PRODUCT: "bg-orange-100 text-orange-700",
  UNREGISTERED_CARD: "bg-sky-100 text-sky-700",
  REFUSED: "bg-red-100 text-red-700",
};

// The three tabs at the top of the screen (ALL records / only the
// problem ones / only the clean ones).
const FILTERS = ["ALL", "FLAGGED", "VALID"];

export default function InspectionHistoryScreen() {
  // ---- "Memory" for this screen (React state) — see VerifyScreen.jsx for
  // a fuller explanation of what state means. Short version: whenever one
  // of these values changes, the screen redraws itself automatically.

  const [rows, setRows] = useState([]); // every inspection record fetched from the database (unfiltered)
  const [loading, setLoading] = useState(true); // true while the first fetch is still in progress (shows the grey skeleton boxes)
  const [error, setError] = useState(""); // an error message, if the fetch failed
  const [filter, setFilter] = useState("ALL"); // which of the three filter tabs is currently selected

  // Runs ONCE, the moment this screen first opens: asks the database for
  // the 75 most recent inspection records (across every inspector) and
  // stores them in `rows`. Nothing here re-runs automatically after that
  // — if you want it to refresh, you'd have to reload the page or add a
  // manual "refresh" button (there isn't one yet).
  useEffect(() => {
    let cancelled = false;
    fetchRecentInspections(75)
      .then((r) => !cancelled && setRows(r))
      .catch(() => !cancelled && setError("Could not load inspection history."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Takes the full `rows` list and narrows it down based on which filter
  // tab is selected. This happens entirely in the browser (no extra
  // database call) — all 75 records were already downloaded above, this
  // just decides which ones to actually display.
  const filtered = useMemo(() => {
    if (filter === "ALL") return rows;
    if (filter === "VALID") return rows.filter((r) => r.outcome === "VALID");
    return rows.filter((r) => r.outcome !== "VALID");
  }, [rows, filter]);

  // Counts how many non-VALID ("flagged") records happened today, purely
  // to show the little amber banner near the top. Also computed in the
  // browser from the already-downloaded `rows`, not a fresh database call.
  const flaggedToday = useMemo(() => {
    const today = new Date().toDateString();
    return rows.filter((r) => r.outcome !== "VALID" && new Date(r.at).toDateString() === today).length;
  }, [rows]);

  // ---- Below this point is just what gets drawn on screen. All the
  // decisions (what to fetch, what to filter) already happened above.
  return (
    <div className="px-5 pt-2">
      <header>
        <h1 className="font-display text-xl font-bold text-ink-900">Inspection history</h1>
        <p className="text-[13px] text-ink-900/50 mt-0.5">The full revenue-protection log — every inspector's outcomes.</p>
      </header>

      {flaggedToday > 0 && (
        <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-[12px] text-amber-700">
          {flaggedToday} flagged card{flaggedToday === 1 ? "" : "s"} today (not VALID)
        </p>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-[12px] text-red-600">{error}</p>}

      {/* The 3 filter tabs — clicking one just changes the `filter` state
          above, which changes what `filtered` contains, which changes
          what the list below shows. No database call happens here. */}
      <div className="mt-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${
              filter === f ? "border-gold-500 bg-cream-100 text-ink-900" : "border-ink-900/10 bg-white text-ink-900/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* The actual list. Three possible states:
            1. still loading  -> grey "skeleton" placeholder boxes
            2. loaded but empty -> a friendly "nothing here yet" message
            3. loaded with data -> one row per inspection record */}
      <div className="mt-4 flex flex-col gap-1.5">
        {loading ? (
          <>
            <div className="skeleton h-14 rounded-xl" />
            <div className="skeleton h-14 rounded-xl" />
            <div className="skeleton h-14 rounded-xl" />
          </>
        ) : filtered.length === 0 ? (
          <p className="mt-4 text-center text-[12.5px] text-ink-900/40">No inspections logged yet.</p>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-ink-900/10 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] font-semibold text-ink-900/80 tracking-wide">{r.card_number}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${OUTCOME_PILL[r.outcome] || "bg-ink-900/10 text-ink-900/60"}`}>
                  {r.outcome.replace("_", " ")}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-[11px] text-ink-900/45 truncate max-w-[70%]">{r.note || "—"}</p>
                <span className="text-[11px] text-ink-900/40">
                  {new Date(r.at).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
