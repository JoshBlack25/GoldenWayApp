import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TicketCard from "../../../components/TicketCard";
import TransactionRow from "../../../components/TransactionRow";
import TripLoadError from "../../../components/TripLoadError";
import { useTrips } from "../../../context/trip";

export default function CardScreen() {
  const navigate = useNavigate();
  const { rides, pass, transactions, card, cardBusy, passExpiresOn } = useTrips();
  const recent = transactions.slice(0, 4);
  const last4 = card ? card.cardNumber.slice(-4) : "••••";

  return (
    <div className="flex flex-col gap-5 px-5 pb-6">
      <TripLoadError />
      <TicketCard last4={last4} expiry={passExpiresOn
        ? new Date(passExpiresOn).toLocaleDateString("en-ZA", { month: "2-digit", year: "2-digit" })
        : "—"} />

      {/* Balance */}
      <div className="flex flex-col items-center text-center">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide ${
            pass.active
              ? "bg-emerald-50 text-emerald-600"
              : "bg-brand-50 text-brand-600"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              pass.active ? "bg-emerald-500" : "bg-brand-500"
            }`}
          />
          {pass.active ? "ACTIVE" : "NO ACTIVE PASS"}
        </span>
        <h1 className="font-display text-4xl font-bold text-ink-900 mt-2 leading-none">
          {cardBusy && !card ? "…" : rides} {rides === 1 ? "Ride" : "Rides"} Left
        </h1>
        <p className="mt-2 text-[11px] font-semibold tracking-[0.14em] text-slate-500">
          {pass.label.toUpperCase()}
        </p>
        <p className="text-[13px] text-slate-500 mt-1">
          {pass.active
            ? `Expires in ${pass.expiryDays} ${pass.expiryDays === 1 ? "day" : "days"}`
            : "Top up to start riding"}
        </p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/use-ticket")}
          className="btn-gold py-3.5 text-[13px]"
        >
          <TicketIcon /> Use Bus Ticket
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/load-trips")}
          className="btn-ghost py-3.5 text-[13px]"
        >
          <PlusIcon /> Top Up
        </motion.button>
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[15px] font-bold text-ink-900">
            Recent Transactions
          </h2>
          <button
            type="button"
            onClick={() => navigate("/history")}
            className="text-[12px] font-semibold text-gold-600"
          >
            VIEW ALL
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {recent.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              onClick={() => navigate("/history")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="6" width="18" height="12" rx="2.2" />
      <path d="M14 7.5v9" strokeLinecap="round" strokeDasharray="1.6 2.2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
