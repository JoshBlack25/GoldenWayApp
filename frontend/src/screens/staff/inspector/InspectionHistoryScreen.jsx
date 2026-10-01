import { useEffect, useMemo, useState } from "react";
import { fetchRecentInspections } from "../../../api/operations";

const OUTCOME_PILL = {
  VALID: "bg-emerald-100 text-emerald-700",
  NO_PRODUCT: "bg-amber-100 text-amber-700",
  EXPIRED_PRODUCT: "bg-orange-100 text-orange-700",
  UNREGISTERED_CARD: "bg-sky-100 text-sky-700",
  REFUSED: "bg-red-100 text-red-700",
};

const FILTERS = ["ALL", "FLAGGED", "VALID"];

export default function InspectionHistoryScreen() {

  const [rows, setRows] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(""); 
  const [filter, setFilter] = useState("ALL"); 

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

  const filtered = useMemo(() => {
    if (filter === "ALL") return rows;
    if (filter === "VALID") return rows.filter((r) => r.outcome === "VALID");
    return rows.filter((r) => r.outcome !== "VALID");
  }, [rows, filter]);

  const flaggedToday = useMemo(() => {
    const today = new Date().toDateString();
    return rows.filter((r) => r.outcome !== "VALID" && new Date(r.at).toDateString() === today).length;
  }, [rows]);

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
