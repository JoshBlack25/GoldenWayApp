/**
 * Vertical stop timeline shared by the Route 42 live-tracking screen and
 * the trip detail screen. Each stop carries a state: done | current | upcoming.
 */
export default function StopTimeline({ stops }) {
  return (
    <ol className="flex flex-col">
      {stops.map((stop, i) => (
        <li key={stop.label} className="flex gap-3">
          {/* rail + dot */}
          <div className="flex flex-col items-center">
            <StopDot state={stop.state} />
            {i < stops.length - 1 && (
              <span
                className={`w-0.5 flex-1 min-h-8 ${
                  stop.state === "done"
                    ? "bg-gradient-to-b from-gold-400 to-gold-500"
                    : stop.state === "current"
                      ? "bg-gradient-to-b from-gold-500 to-ink-900/10"
                      : "bg-ink-900/10"
                }`}
              />
            )}
          </div>
          {/* label */}
          <div className={`pb-5 ${i === stops.length - 1 ? "pb-0" : ""}`}>
            <p
              className={`text-[14px] leading-tight ${
                stop.state === "upcoming"
                  ? "text-slate-400"
                  : "font-semibold text-ink-900"
              }`}
            >
              {stop.label}
            </p>
            <p
              className={`text-[11px] mt-1 ${
                stop.state === "current"
                  ? "font-semibold text-gold-600"
                  : "text-slate-500"
              }`}
            >
              {stop.time}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function StopDot({ state }) {
  if (state === "done") {
    return (
      <span className="h-5 w-5 rounded-full bg-gold-500 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="#3d2f05" strokeWidth="3">
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative h-5 w-5 shrink-0 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-gold-500/30 animate-ping" />
        <span
          className="h-3.5 w-3.5 rounded-full border-2 border-white"
          style={{ background: "#f0b429", boxShadow: "0 0 0 3px rgba(240,180,41,0.25), 0 2px 8px rgba(240,180,41,0.5)" }}
        />
      </span>
    );
  }
  return <span className="h-3 w-3 rounded-full border-2 border-ink-900/20 bg-white mt-1 ml-1 shrink-0" />;
}
