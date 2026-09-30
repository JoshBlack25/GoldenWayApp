import { useEffect, useState } from "react";

/**
 * Free-transfer window (BR-04): after a paid tap, changing to a
 * DIFFERENT route within `windowMinutes` costs no journey.
 * Purely visual — the backend decides whether a tap is a transfer.
 */
export default function TransferCountdown({ startedAt, windowMinutes = 60 }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const total = windowMinutes * 60 * 1000;
  const remaining = Math.max(0, startedAt + total - now);
  const pct = Math.round((remaining / total) * 100);
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  if (remaining <= 0) {
    return (
      <p className="text-center text-[12px] text-slate-500">
        Free transfer window closed
      </p>
    );
  }

  return (
    <div
      className="w-full rounded-2xl border border-gold-500/30 bg-gold-50 px-4 py-3.5"
      role="timer"
      aria-label={`Free transfer window, ${mm} minutes ${ss} seconds left`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-gold-700">FREE TRANSFER WINDOW</p>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Change to a different route at no cost
          </p>
        </div>
        <span className="font-display text-[22px] font-bold tabular-nums text-ink-900">
          {mm}:{ss}
        </span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-cream-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-gold-500 transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
