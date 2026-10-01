import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TicketCard from "../../../components/TicketCard";
import TransactionRow from "../../../components/TransactionRow";
import TripLoadError from "../../../components/TripLoadError";
import { useTrips } from "../../../context/trip";
import { productLabel } from "../../../utils/productLabels";
import { daysUntil, isProductLive, parseDay } from "../../../utils/myRoutes";

function expiresIn(days) {
  if (days <= 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

export default function CardScreen() {
  const navigate = useNavigate();
  const {
    rides,
    pass,
    transactions,
    card,
    cardBusy,
    passExpiresOn,
    unlimitedPass,
  } = useTrips();
  const recent = transactions.slice(0, 4);
  const last4 = card ? card.cardNumber.slice(-4) : "••••";

  // Passes first, then soonest-expiring — the order taps consume them.
  const liveProducts = (card?.loadedProducts || [])
    .filter((p) => isProductLive(p))
    .sort((a, b) => {
      const aRank = a.journeysTotal === 0 ? 0 : 1;
      const bRank = b.journeysTotal === 0 ? 0 : 1;
      return aRank - bRank || parseDay(a.validTo) - parseDay(b.validTo);
    });

  return (
    <div className="flex flex-col gap-5 px-5 pb-6">
      <TripLoadError />
      <TicketCard
        last4={last4}
        expiry={
          passExpiresOn
            ? new Date(passExpiresOn).toLocaleDateString("en-ZA", {
                month: "2-digit",
                year: "2-digit",
              })
            : "—"
        }
      />

      {card && <CardNumberRow cardNumber={card.cardNumber} />}

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
          {cardBusy && !card
            ? "…"
            : unlimitedPass
              ? "Unlimited Rides"
              : `${rides} ${rides === 1 ? "Ride" : "Rides"} Left`}
        </h1>
        {unlimitedPass && rides > 0 && (
          <p className="text-[13px] text-slate-500 mt-1">
            + {rides} Go Easy {rides === 1 ? "journey" : "journeys"}
          </p>
        )}
        <p className="mt-2 text-[11px] font-semibold tracking-[0.14em] text-slate-500">
          {pass.label.toUpperCase()}
        </p>
        <p className="text-[13px] text-slate-500 mt-1">
          {pass.active ? expiresIn(pass.expiryDays) : "Top up to start riding"}
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

      {/* What's actually loaded on this card */}
      {liveProducts.length > 0 && (
        <div>
          <h2 className="font-display text-[15px] font-bold text-ink-900 mb-3">
            On Your Card
          </h2>
          <div className="flex flex-col gap-2.5">
            {liveProducts.map((p) => (
              <ProductRow key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}

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
          {recent.length === 0 && (
            <p className="rounded-xl bg-white border border-ink-900/5 px-4 py-5 text-center text-[13px] text-slate-500">
              Your journeys and top-ups will appear here.
            </p>
          )}
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

function CardNumberRow({ cardNumber }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(cardNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setShown(true); // clipboard blocked — at least reveal the number
    }
  }

  return (
    <div className="flex items-center justify-between rounded-xl bg-white border border-ink-900/5 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wide text-slate-500">
          CARD NUMBER
        </p>
        <p className="font-display text-[15px] font-bold text-ink-900 tracking-wide">
          {shown ? cardNumber : `GW-••••-${cardNumber.slice(-4)}`}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="text-[12px] font-semibold text-gold-600"
        >
          {shown ? "Hide" : "Show"}
        </button>
        <button
          type="button"
          onClick={copy}
          className="text-[12px] font-semibold text-gold-600"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function ProductRow({ p }) {
  const unlimited = p.journeysTotal === 0;
  const left = p.journeysTotal - p.journeysUsed;
  const days = daysUntil(p.validTo);
  const soon = days <= 3;
  const pct = unlimited ? 100 : Math.round((left / p.journeysTotal) * 100);

  return (
    <div className="card px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink-900 truncate">
            {productLabel(p.productCode)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {p.routeCode || "All routes"} · valid to{" "}
            {parseDay(p.validTo).toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${
            unlimited
              ? "bg-gold-100 text-gold-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {unlimited ? "UNLIMITED" : `${left} of ${p.journeysTotal} left`}
        </span>
      </div>
      {!unlimited && (
        <div className="mt-3 h-1.5 rounded-full bg-cream-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gold-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {soon && (
        <p className="mt-2 text-[11px] font-medium text-amber-700">
          {expiresIn(days)}
        </p>
      )}
    </div>
  );
}

function TicketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="6" width="18" height="12" rx="2.2" />
      <path d="M14 7.5v9" strokeLinecap="round" strokeDasharray="1.6 2.2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
