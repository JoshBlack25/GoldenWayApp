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
            }`}
          />
        ))}
      </div>
    </div>
  );
}
