export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "2026-10-22" → local midnight of that day (a bare new Date(str) parses as UTC). */
export function parseDay(str) {
  const [y, m, d] = String(str).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from today until a date-only string. 0 = last valid day is today. */
export function daysUntil(str) {
  return Math.round((parseDay(str) - startOfToday()) / 86400000);
}

/** A loaded product is live if it's in date (valid_to is inclusive) and
 * still has balance. journeysTotal 0 marks weekly/monthly passes. */
export function isProductLive(p, today = startOfToday()) {
  return (
    parseDay(p.validTo) >= today &&
    (p.journeysTotal === 0 || p.journeysUsed < p.journeysTotal)
  );
}

/** Route codes the commuter can actually ride today. */
export function activeRouteCodes(card) {
  const today = startOfToday();
  const codes = (card?.loadedProducts || [])
    .filter((p) => p.routeCode && isProductLive(p, today))
    .map((p) => p.routeCode);
  return [...new Set(codes)];
}

/** First departure that hasn't left yet, from an ascending list of "HH:MM:SS". */
export function nextDeparture(departures, now = new Date()) {
  for (const iso of departures || []) {
    const [h, m] = iso.split(":").map(Number);
    const t = new Date(now);
    t.setHours(h, m, 0, 0);
    const mins = Math.round((t - now) / 60000);
    if (mins >= 0) return { time: iso.slice(0, 5), mins };
  }
  return null;
}

export function routeStatus(run) {
  if (!run)
    return { label: "SCHEDULED", className: "bg-slate-100 text-slate-500" };
  if (run.status === "BREAKDOWN")
    return { label: "BREAKDOWN", className: "bg-brand-100 text-brand-700" };
  if (run.status === "DELAYED")
    return {
      label: `+${run.delayMinutes} MIN`,
      className: "bg-amber-100 text-amber-700",
    };
  if (run.status === "DIVERTED")
    return { label: "DIVERTED", className: "bg-sky-100 text-sky-700" };
  return { label: "ON TIME", className: "bg-emerald-100 text-emerald-700" };
}
