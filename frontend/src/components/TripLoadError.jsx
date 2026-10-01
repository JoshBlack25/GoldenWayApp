import { useTrips } from "../context/trip";

/**
 * TripLoadError — shared retry card for when the dashboard data failed to
 * load (offline, backend down, permission). Reads loadError + refreshTrips
 * from TripProvider so Home/Card/History never show a silent zero balance.
 */
function friendlyMessage(raw) {
  if (/AUTH_REQUIRED/i.test(raw))
    return "Your session has expired. Please sign in again.";
  if (/Failed to fetch|network|offline/i.test(raw))
    return "You appear to be offline. Check your connection and try again.";
  return raw;
}

export default function TripLoadError({ className = "" }) {
  const { loadError, cardBusy, refreshTrips } = useTrips();
  if (!loadError) return null;

  const isAuthError = /AUTH_REQUIRED/i.test(loadError);

  return (
    <div
      role="alert"
      className={`rounded-2xl border border-red-200 bg-red-50 px-5 py-5 flex flex-col items-center text-center ${className}`}
    >
      <span className="text-2xl mb-1.5" aria-hidden="true">⚠️</span>
      <p className="text-[13px] font-semibold text-red-700">
        Couldn&apos;t load your card details
      </p>
      <p className="mt-1 text-[12px] text-red-600/80 leading-relaxed">
        {friendlyMessage(loadError)}
      </p>
      {!isAuthError && (
        <button
          type="button"
          onClick={refreshTrips}
          disabled={cardBusy}
          className="mt-3 rounded-xl bg-red-600 px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {cardBusy ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}
