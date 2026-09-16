import { motion } from "framer-motion";

/**
 * One transaction line used on Home, Card and History. Optional onClick
 * turns it into a link-style row (History uses this to open trip detail).
 */
export default function TransactionRow({ tx, onClick }) {
  const Wrapper = onClick ? motion.button : "div";

  return (
    <Wrapper
      {...(onClick
        ? {
            type: "button",
            onClick: () => onClick(tx),
            whileTap: { scale: 0.98 },
            className:
              "w-full text-left flex items-center gap-3 rounded-2xl border border-ink-900/5 bg-white px-3.5 py-3 transition-all hover:border-gold-500/50 hover:shadow-[var(--shadow-card)] hover:-translate-y-px",
          }
        : {
            className:
              "flex items-center gap-3 rounded-2xl border border-ink-900/5 bg-white px-3.5 py-3",
          })}
    >
      <span className="h-9 w-9 rounded-full bg-cream-100 border border-gold-500/20 flex items-center justify-center shrink-0">
        {tx.type === "topup" ? <PlusIcon /> : <BusIcon />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-ink-900 truncate">
          {tx.title}
        </span>
        <span className="block text-[11px] text-slate-500 mt-0.5">
          {tx.meta}
        </span>
      </span>
      <span
        className={`text-[12px] font-semibold shrink-0 ${
          tx.negative ? "text-red-500" : "text-emerald-600"
        }`}
      >
        {tx.amount}
      </span>
    </Wrapper>
  );
}

function BusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-gold-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="5" width="16" height="12" rx="2.5" />
      <path d="M4 12h16M8 17v2M16 17v2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-gold-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
