<<<<<<< HEAD
/**
 * "STEP X OF 3" label + segmented progress bar, shared by the
 * Route, Payment, and Review steps.
 */
export default function StepperHeader({ step, title }) {
  return (
    <div className="px-5 pt-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wide text-gold-600">
          STEP {step} OF 3
        </span>
        <span className="text-[13px] font-semibold text-ink-900">{title}</span>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-gold-500" : "bg-cream-200"
=======
const STEPS = ["Route", "Payment", "Review"];

/**
 * "STEP X OF 3" label + segmented progress bar, shared by the
 * Route, Payment, and Review steps. Optional back arrow: steps live in
 * component state (not routes), so the browser back button would leave
 * the whole flow — this gives users a step-level way back.
 */
export default function StepperHeader({ step, title, onBack }) {
  return (
    <div className="px-5 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="-ml-2.5 px-2.5 py-2 text-xl leading-none text-ink-900"
            >
              &larr;
            </button>
          )}
          <span className="text-[11px] font-semibold tracking-wide text-gold-600">
            STEP {step} OF 3
          </span>
        </div>
        <span className="text-[13px] font-semibold text-ink-900">{title}</span>
      </div>

      <div
        className="mt-2.5 flex gap-1.5"
        role="progressbar"
        aria-label="Load trips progress"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={step}
        aria-valuetext={`Step ${step} of 3: ${STEPS[step - 1]}`}
      >
        {STEPS.map((name, i) => (
          <span
            key={name}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i + 1 <= step ? "bg-gold-500" : "bg-cream-200"
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
            }`}
          />
        ))}
      </div>
<<<<<<< HEAD
=======

      <div className="mt-1.5 flex gap-1.5" aria-hidden="true">
        {STEPS.map((name, i) => (
          <span
            key={name}
            className={`flex-1 text-[10px] ${
              i + 1 === step ? "font-semibold text-ink-900" : "text-slate-500"
            }`}
          >
            {name}
          </span>
        ))}
      </div>
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    </div>
  );
}
