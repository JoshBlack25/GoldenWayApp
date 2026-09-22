/**
 * Tiny classnames helper (clsx-style) — the only thing mapcn's components
 * need from the shadcn ecosystem. Supports strings, falsy values, and
 * arrays; good enough for this codebase without adding a dependency.
 */
export function cn(...classes) {
  const out = [];
  for (const entry of classes) {
    if (!entry) continue;
    if (Array.isArray(entry)) {
      const nested = cn(...entry);
      if (nested) out.push(nested);
    } else {
      out.push(entry);
    }
  }
  return out.join(" ");
}
