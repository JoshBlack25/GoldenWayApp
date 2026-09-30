import { useState } from "react";
import { motion } from "framer-motion";
import StepperHeader from "./StepperHeader";
import { formatCents, MAX_SAVED_CARDS } from "../data/loadTripsData";

/**
 * Step 2 — payment method. Saved methods come from the user's DB wallet
 * (migration 0016, brand + last4 only); the amount shown is the live
 * quote total in cents. Payment itself runs through the simulated
 * gateway (pay_topup_order) — no real money moves.
 */
export default function PaymentStep({
  route,
  plan,
  quote,
  totalCents,
  cards,
  selectedCardId,
  onSelectCard,
  onOpenAddCard,
  onRemoveCard,
  onBackToRoute,
  onContinue,
}) {
  const canAddCard = cards.length < MAX_SAVED_CARDS;
  const [confirmId, setConfirmId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [removeError, setRemoveError] = useState("");

  async function handleRemove(id) {
    setBusyId(id);
    setRemoveError("");
    try {
      await onRemoveCard(id);
      setConfirmId("");
    } catch (err) {
      setRemoveError(err?.message || "Could not remove the card. Try again.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="flex flex-col">
      <StepperHeader step={2} title="Payment Method" onBack={onBackToRoute} />

      <div className="px-5 pt-5 flex flex-col gap-5">
        <div className="flex items-center justify-between rounded-xl bg-cream-200/70 border border-gold-500/15 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-slate-500">
              LOADING ONTO
            </p>
            <p className="text-[14px] font-medium text-ink-900">
              {route ? route.label : "Gold Card"}
              {plan ? ` · ${plan.label}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToRoute}
            className="link-action text-[13px] font-semibold text-gold-600"
          >
            Change
          </button>
        </div>

        <div>
          <h2
            id="payment-heading"
            className="font-display font-semibold text-ink-900 text-[15px] mb-3"
          >
            Select Payment
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="payment-heading"
            className="flex flex-col gap-3"
          >
            {cards.map((card) => {
              const active = card.id === selectedCardId;
              const confirming = confirmId === card.id;
              const busy = busyId === card.id;
              return (
                <div
                  key={card.id}
                  className={`flex items-center rounded-xl border transition-colors ${
                    active
                      ? "border-gold-500 bg-cream-100"
                      : "border-ink-900/10 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSelectCard(card.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <BrandChip brand={card.brand} />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900 text-[14px]">
                          {card.brand}
                          {card.isDefault && (
                            <span className="ml-2 text-[10px] font-semibold tracking-wide text-gold-600">
                              DEFAULT
                            </span>
                          )}
                        </p>
                        <p className="text-[12px] text-slate-500">
                          &bull;&bull;&bull;&bull; {card.last4} · expires{" "}
                          {card.expiry}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        active ? "border-gold-500" : "border-ink-900/20"
                      }`}
                    >
                      {active && (
                        <span className="h-2.5 w-2.5 rounded-full bg-gold-500" />
                      )}
                    </span>
                  </button>

                  {onRemoveCard &&
                    (confirming ? (
                      <div className="flex shrink-0 items-center gap-3 pr-4">
                        <button
                          type="button"
                          onClick={() => handleRemove(card.id)}
                          disabled={busy}
                          className="link-action text-[12px] font-semibold text-brand-600 disabled:opacity-50"
                        >
                          {busy ? "Removing…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId("")}
                          disabled={busy}
                          className="link-action text-[12px] font-semibold text-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveError("");
                          setConfirmId(card.id);
                        }}
                        aria-label={`Remove ${card.brand} ending ${card.last4}`}
                        className="link-action mr-4 shrink-0 text-[12px] font-semibold text-slate-500"
                      >
                        Remove
                      </button>
                    ))}
                </div>
              );
            })}

            {canAddCard && (
              <button
                type="button"
                onClick={onOpenAddCard}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gold-500/40 py-3.5 text-[14px] font-medium text-gold-600"
              >
                <PlusIcon /> Add New Card
              </button>
            )}
          </div>

          {removeError && (
            <p
              role="alert"
              className="mt-3 text-[12px] font-medium text-brand-600"
            >
              {removeError}
            </p>
          )}
          {!cards.length && (
            <p className="mt-3 text-[12px] text-slate-500 px-1">
              No saved cards yet — add one to continue. Only the brand and last
              4 digits are stored.
            </p>
          )}
          {!canAddCard && (
            <p className="mt-3 text-[12px] text-slate-500 px-1">
              You can save up to {MAX_SAVED_CARDS} cards
              {onRemoveCard ? " — remove one to add another." : "."}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-cream-200/60 px-4 py-4 flex flex-col gap-2.5">
          {quote && quote.cashCompareCents > 0 && (
            <Row
              label="Peak cash (for comparison)"
              value={formatCents(quote.cashCompareCents)}
              strike
            />
          )}
          {quote && quote.includesTransfer && (
            <Row label="Transfers" value="1 free per journey" />
          )}
          <div className="h-px bg-ink-900/10 my-1" />
          <Row label="Total" value={formatCents(totalCents)} emphasize />
        </div>
      </div>

      <div className="mt-6 px-5 pb-6 flex flex-col items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          disabled={!selectedCardId}
          onClick={onContinue}
          className="btn-gold w-full py-4 text-[15px] gap-2 disabled:opacity-40"
        >
          Continue <span aria-hidden="true">&rarr;</span>
        </motion.button>
      </div>
    </div>
  );
}

function Row({ label, value, emphasize, strike }) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-[13px] ${emphasize ? "font-semibold text-ink-900" : "text-slate-500"}`}
      >
        {label}
      </span>
      <span
        className={
          emphasize
            ? "font-display font-bold text-gold-600 text-[17px]"
            : strike
              ? "text-[13px] text-slate-500 line-through"
              : "text-[13px] text-ink-900"
        }
      >
        {value}
      </span>
    </div>
  );
}

function BrandChip({ brand }) {
  const styles =
    brand === "Visa"
      ? "bg-navy-900"
      : brand === "Mastercard"
        ? "bg-gradient-to-br from-red-500 to-orange-400"
        : "bg-ink-900/70";
  return (
    <span
      className={`h-7 w-10 rounded-md flex items-center justify-center shrink-0 ${styles}`}
    >
      {brand === "Mastercard" ? (
        <svg viewBox="0 0 24 16" className="h-3.5 w-6" aria-hidden="true">
          <circle cx="9" cy="8" r="6" fill="#EB001B" opacity="0.9" />
          <circle cx="15" cy="8" r="6" fill="#F79E1B" opacity="0.9" />
        </svg>
      ) : (
        <span className="text-[9px] font-bold text-white tracking-wide">
          {brand === "Visa" ? "VISA" : "CARD"}
        </span>
      )}
    </span>
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
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
