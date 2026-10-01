import { motion } from "framer-motion";
import { formatCents } from "../data/loadTripsData";

/**
 * Full receipt for a completed purchase. All figures come from the real
 * TopUpOrder (amountCents, receiptReference, route) — no client math.
 */
export default function ReceiptView({ receipt, onBack }) {
  return (
    <div className="flex flex-col px-6 pt-5 pb-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-ink-900 text-xl leading-none px-1 -ml-1"
          aria-label="Back"
        >
          &larr;
        </button>
        <h1 className="font-display text-lg font-bold text-ink-900">Receipt</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-5 rounded-2xl bg-white border border-ink-900/5 shadow-[0_2px_16px_-6px_rgba(0,0,0,0.1)] overflow-hidden"
      >
        <div className="px-5 pt-6 pb-5 flex flex-col items-center border-b border-dashed border-ink-900/10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-200 text-gold-600 text-[11px] font-semibold px-3 py-1">
            <DotIcon /> PAID
          </span>
          <p className="font-display font-bold text-ink-900 text-2xl mt-3">
            {formatCents(receipt.totalCents)}
          </p>
          <p className="text-slate-500 text-[12px] mt-1">{receipt.dateLabel}</p>
        </div>

        <div className="px-5 py-5 flex flex-col gap-3">
          <ReceiptRow label="Transaction ID" value={receipt.reference} />
          <ReceiptRow label="Route" value={receipt.routeLabel} />
          <ReceiptRow label="Ticket Plan" value={receipt.planLabel} />
          {receipt.planTrips > 0 && (
            <ReceiptRow label="Journeys" value={`${receipt.planTrips} rides`} />
          )}
          {receipt.transfersAllowed > 0 && (
            <ReceiptRow label="Transfers" value="1 free per journey" />
          )}
          <ReceiptRow
            label="Payment Method"
            value={`${receipt.card?.brand || "Card"} •••• ${receipt.card?.last4 || "••••"}`}
          />
        </div>

        <div className="px-5 py-5 border-t border-dashed border-ink-900/10 flex flex-col gap-2.5">
          {receipt.savingsCents > 0 && (
            <ReceiptRow
              label="You saved vs cash"
              value={formatCents(receipt.savingsCents)}
              muted
            />
          )}
          <div className="h-px bg-ink-900/10 my-1" />
          <ReceiptRow
            label="Total Paid"
            value={formatCents(receipt.totalCents)}
            strong
          />
        </div>
      </motion.div>

      <div className="flex flex-col gap-3 mt-6">
        <button
          type="button"
          className="w-full rounded-xl border border-ink-900/10 py-4 font-display font-semibold text-ink-900 text-[15px]"
        >
          Share Receipt
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={onBack}
          className="btn-gold w-full py-4 text-[15px]"
        >
          Done
        </motion.button>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, muted, strong }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span
        className={`text-[13px] text-right truncate max-w-[60%] ${
          strong
            ? "font-display font-bold text-gold-600 text-[16px]"
            : muted
              ? "text-ink-900/80"
              : "font-medium text-ink-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DotIcon() {
  return <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />;
}
