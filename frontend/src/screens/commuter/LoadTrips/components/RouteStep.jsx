import { motion } from "framer-motion";
import StepperHeader from "./StepperHeader";
<<<<<<< HEAD
import {
  formatCents,
  BR03_MESSAGE,
} from "../data/loadTripsData";
=======
import { formatCents, BR03_MESSAGE } from "../data/loadTripsData";
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

/**
 * Step 1 — live route + product selection. Routes and plans come from the
 * backend catalogue; prices are effective-dated cents. Excluded routes
 * (BR-03) hide Go Easy plans and show the GABS exclusion notice verbatim.
 */
export default function RouteStep({
<<<<<<< HEAD
  routes,
=======
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
  origins,
  destinations,
  from,
  to,
  route,
  planId,
  products,
  productsBusy,
  routesBusy,
  routesError,
  quote,
<<<<<<< HEAD
=======
  quoteBusy = false,
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
  onChangeFrom,
  onChangeTo,
  onChangePlan,
  onRetryRoutes,
  onContinue,
<<<<<<< HEAD
}) {
  const excluded = Boolean(route && !route.goEasyEligible);
  const plan = products.find((p) => p.id === planId) || null;

  return (
    <div className="flex flex-col">
      <StepperHeader step={1} title="Ticket Setup" />
=======
  onBack,
}) {
  const excluded = Boolean(route && !route.goEasyEligible);
  const selectedPlan = products.find((p) => p.id === planId) || null;
  const total = quote?.priceCents ?? selectedPlan?.priceCents ?? 0;
  const priceLoading = productsBusy || quoteBusy;

  return (
    <div className="flex flex-col">
      <StepperHeader step={1} title="Ticket Setup" onBack={onBack} />
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

      <div className="px-5 pt-5 flex flex-col gap-5">
        {/* Gold (transit) card being loaded — informational */}
        <div className="flex items-center gap-2.5 rounded-xl bg-cream-200/70 border border-gold-500/15 px-4 py-3">
          <span className="text-[10px] font-bold tracking-wide text-navy-900 bg-white rounded px-1.5 py-0.5 border border-ink-900/10">
            GOLD
          </span>
          <span className="text-[14px] font-medium text-ink-900">
            Gold Card &bull; your balance is protected
          </span>
        </div>

        <div>
          <h2 className="font-display font-semibold text-ink-900 text-[15px] mb-3">
            Route
          </h2>

          {routesBusy ? (
<<<<<<< HEAD
            <div className="rounded-xl border border-ink-900/10 bg-white px-4 py-6 text-center text-[13px] text-slate-500">
              Loading routes…
            </div>
          ) : routesError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center">
=======
            <div
              className="flex flex-col gap-3"
              aria-busy="true"
              aria-label="Loading routes"
            >
              <div className="skeleton h-[74px] w-full" />
              <div className="skeleton h-[74px] w-full" />
            </div>
          ) : routesError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center"
            >
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
              <p className="text-[13px] text-red-600">{routesError}</p>
              <button
                type="button"
                onClick={onRetryRoutes}
<<<<<<< HEAD
                className="mt-2 text-[13px] font-semibold text-gold-600"
              >
                Retry
=======
                className="link-action mt-2 text-[13px] font-semibold text-gold-600"
              >
                Try again
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <LocationSelect
                label="From"
                value={from}
                onChange={onChangeFrom}
                options={origins}
                icon="pin"
              />
              <LocationSelect
                label="To"
                value={to}
                onChange={onChangeTo}
                options={destinations}
                icon="flag"
              />
            </div>
          )}

          {excluded && (
            <p className="mt-3 rounded-xl border border-brand-500/25 bg-brand-50 px-4 py-3 text-[12px] font-medium text-brand-600">
              {BR03_MESSAGE}
            </p>
          )}
        </div>

        <div>
<<<<<<< HEAD
          <h2 className="font-display font-semibold text-ink-900 text-[15px] mb-3">
            Select Ticket Plan
          </h2>
          {productsBusy ? (
            <div className="rounded-xl border border-ink-900/10 bg-white px-4 py-6 text-center text-[13px] text-slate-500">
              Loading fares…
=======
          <h2
            id="plan-heading"
            className="font-display font-semibold text-ink-900 text-[15px] mb-3"
          >
            Select Ticket Plan
          </h2>
          {productsBusy ? (
            <div
              className="flex flex-col gap-3"
              aria-busy="true"
              aria-label="Loading fares"
            >
              <div className="skeleton h-[68px] w-full" />
              <div className="skeleton h-[68px] w-full" />
              <div className="skeleton h-[68px] w-full" />
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-ink-900/10 bg-white px-4 py-6 text-center text-[13px] text-slate-500">
              No ticket plans available for this route yet.
            </div>
          ) : (
<<<<<<< HEAD
            <div className="flex flex-col gap-3">
              {products.map((plan) => {
                const active = plan.id === planId;
                const perRide =
                  plan.trips > 0 ? plan.priceCents / plan.trips : null;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => onChangePlan(plan.id)}
=======
            <div
              role="radiogroup"
              aria-labelledby="plan-heading"
              className="flex flex-col gap-3"
            >
              {products.map((p) => {
                const active = p.id === planId;
                const perRide = p.trips > 0 ? p.priceCents / p.trips : null;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChangePlan(p.id)}
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
                    className={`relative text-left rounded-xl border px-4 py-3.5 transition-colors ${
                      active
                        ? "border-gold-500 bg-cream-100"
                        : "border-ink-900/10 bg-white"
                    }`}
                  >
<<<<<<< HEAD
                    {plan.goEasy && plan.transfersAllowed > 0 && (
=======
                    {p.goEasy && p.transfersAllowed > 0 && (
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
                      <span className="absolute -top-2.5 left-4 text-[10px] font-bold tracking-wide bg-gold-400 text-ink-900 px-2 py-0.5 rounded-full">
                        FREE TRANSFER
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-ink-900 text-[15px]">
<<<<<<< HEAD
                          {plan.label}
                        </p>
                        <p className="text-[12px] text-slate-500 mt-0.5">
                          {plan.trips > 0
                            ? `${plan.trips} journeys · valid ${plan.validDays} days`
                            : `Unlimited · valid ${plan.validDays} days`}
=======
                          {p.label}
                        </p>
                        <p className="text-[12px] text-slate-500 mt-0.5">
                          {p.trips > 0
                            ? `${p.trips} journeys · valid ${p.validDays} days`
                            : `Unlimited · valid ${p.validDays} days`}
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-ink-900 text-[16px]">
<<<<<<< HEAD
                          {formatCents(plan.priceCents)}
=======
                          {formatCents(p.priceCents)}
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {perRide !== null
                            ? `${formatCents(perRide)} / ride`
<<<<<<< HEAD
                            : plan.family === "WEEKLY"
                              ? "per week"
                              : plan.family === "MONTHLY"
=======
                            : p.family === "WEEKLY"
                              ? "per week"
                              : p.family === "MONTHLY"
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
                                ? "per month"
                                : "per pass"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {quote && quote.savingsCents > 0 && (
          <div className="rounded-xl bg-cream-100 border border-gold-500/20 px-4 py-3 flex items-center justify-between">
            <span className="text-[12px] font-medium text-ink-900">
              vs paying cash on every trip
            </span>
            <span className="font-display font-bold text-[15px] text-gold-600">
              You save {formatCents(quote.savingsCents)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 px-5 pb-6 flex items-center justify-between gap-4">
<<<<<<< HEAD
        <div>
          <p className="text-[11px] text-slate-500">Total Amount</p>
          <p className="font-display font-bold text-ink-900 text-xl">
            {formatCents(totalCents(route, quote, plan))}
          </p>
=======
        <div aria-live="polite">
          <p className="text-[11px] text-slate-500">Total Amount</p>
          {priceLoading ? (
            <div
              className="skeleton mt-1 h-6 w-20"
              aria-label="Loading price"
            />
          ) : (
            <p className="font-display font-bold text-ink-900 text-xl">
              {formatCents(total)}
            </p>
          )}
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
<<<<<<< HEAD
          disabled={!route || !plan}
          onClick={onContinue}
          className="btn-gold px-6 py-3.5 text-[15px] gap-2 disabled:opacity-40"
        >
          Continue <span aria-hidden="true">&rarr;</span>
=======
          disabled={!route || !selectedPlan || priceLoading}
          onClick={onContinue}
          className="btn-gold px-6 py-3.5 text-[15px] gap-2 disabled:opacity-40"
        >
          {quoteBusy ? (
            "Checking price…"
          ) : (
            <>
              Continue <span aria-hidden="true">&rarr;</span>
            </>
          )}
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
        </motion.button>
      </div>
    </div>
  );
}

<<<<<<< HEAD
function totalCents(route, quote, plan) {
  if (quote?.priceCents != null) return quote.priceCents;
  return plan?.priceCents ?? 0;
}

=======
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
function LocationSelect({ label, value, onChange, options, icon }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-wide text-slate-500">
        {label.toUpperCase()}
      </span>
      <div className="field-shell">
        {icon === "pin" ? <PinIcon /> : <FlagIcon />}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full py-3.5 text-[15px] text-ink-900 bg-transparent outline-none appearance-none"
        >
          {options.length === 0 && <option value="">—</option>}
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </div>
    </label>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
<<<<<<< HEAD
      className="h-4 w-4 text-gold-500 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
=======
      className="h-4 w-4 text-gold-600 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    >
      <path
        d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-ink-900/70 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
<<<<<<< HEAD
=======
      aria-hidden="true"
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    >
      <path d="M6 21V4" strokeLinecap="round" />
      <path d="M6 4h11l-2.5 3.5L17 11H6" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
<<<<<<< HEAD
      className="h-4 w-4 text-slate-400 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
=======
      className="h-4 w-4 text-slate-500 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
