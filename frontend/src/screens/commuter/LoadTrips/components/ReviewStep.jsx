import { motion } from "framer-motion";
import StepperHeader from "./StepperHeader";
import { formatCents } from "../data/loadTripsData";

/**
 * Step 3 — review the live quote and pay. The savings figure comes from
 * the backend's cash-comparison (BR-09); payment errors from the real
 * order/pay calls are surfaced here.
 */
export default function ReviewStep({
  route,
  plan,
  quote,
  totalCents,
  card,
  payError,
  paying,
  onChangePayment,
  onPayNow,
}) {
  const savings = quote?.savingsCents ?? 0;

  return (
    <div className="flex flex-col">
      <StepperHeader step={3} title="Confirmation" />

      <div className="px-5 pt-5 flex flex-col gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900">
            Review Trip
          </h1>
          <p className="text-slate-500 text-[13px] mt-1">
            Please confirm your selection before payment.
          </p>
        </div>

        <div className="rounded-2xl border border-ink-900/5 bg-white px-4 py-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500">
              <RouteGlyph /> ROUTE DETAILS
            </span>
            <BusGlyph />
          </div>
          <div className="flex flex-col gap-3">
            <StopRow label={route?.from || "—"} filled={false} />
            <StopRow label={route?.to || "—"} filled />
          </div>
          <p className="mt-3 text-[11px] font-semibold tracking-wide text-gold-600">
            {route?.code} · {route?.label}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoCard
            label="PASS"
            title={plan?.label || "—"}
            subtitle={
              plan
                ? plan.trips > 0
                  ? `${plan.trips} journeys · ${plan.validDays} days`
                  : `Unlimited · ${plan.validDays} days`
                : "Commuter Bundle"
            }
          />
          <InfoCard
            label="PAYMENT"
            title={`${card?.brand || "Card"} •••• ${card?.last4 || "••••"}`}
            subtitle={`Exp ${card?.expiry || "—"}`}
          />
        </div>

        <div className="rounded-2xl px-4 py-4 flex items-center justify-between text-ink-900" style={{ background: "linear-gradient(135deg, #ffd873 0%, #ffc52e 45%, #f0b429 100%)", boxShadow: "var(--shadow-glow-gold)" }}>
          <div>
            <p className="text-[11px] font-semibold text-ink-900/70">
              TOTAL AMOUNT
            </p>
            <p className="font-display font-bold text-ink-900 text-2xl">
              {formatCents(totalCents)}
            </p>
          </div>
          {savings > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-semibold text-ink-900/70">
                YOU SAVE VS CASH
              </p>
              <p className="font-display font-bold text-ink-900 text-[15px]">
                {formatCents(savings)}
              </p>
            </div>
          )}
        </div>

        {plan?.transfersAllowed > 0 && (
          <p className="text-[12px] text-slate-500 text-center leading-relaxed px-2">
            Includes 1 free transfer per journey within 60 minutes (BR-04).
          </p>
        )}

        {payError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-600 text-center"
          >
            {payError}
          </div>
        )}
      </div>

      <div className="mt-4 px-5 pb-6 flex flex-col items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          disabled={paying || !plan}
          onClick={onPayNow}
          className="btn-gold w-full py-4 text-[15px] gap-2 disabled:opacity-50"
        >
          {paying ? "Processing payment…" : (
            <>
              Pay Now <span aria-hidden="true">&rarr;</span>
            </>
          )}
        </motion.button>
        <button
          type="button"
          onClick={onChangePayment}
          className="text-[13px] font-medium text-slate-500"
        >
          Change Payment Method
        </button>
      </div>
    </div>
  );
}

function StopRow({ label, filled }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
          filled ? "bg-gold-500" : "border-2 border-gold-500 bg-white"
        }`}
      />
      <span className="text-[14px] font-medium text-ink-900">{label}</span>
    </div>
  );
}

function InfoCard({ label, title, subtitle }) {
  return (
    <div className="rounded-xl border border-ink-900/5 bg-white px-3.5 py-3">
      <p className="text-[10px] font-semibold tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-[13px] font-semibold text-ink-900 mt-1 truncate">
        {title}
      </p>
      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{subtitle}</p>
    </div>
  );
}

function RouteGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M7 3v13a3 3 0 0 0 3 3h7" strokeLinecap="round" />
      <path d="M4 9l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BusGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-gold-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="5" width="16" height="12" rx="2.5" />
      <path d="M4 12h16M8 17v2M16 17v2" strokeLinecap="round" />
    </svg>
  );
}
