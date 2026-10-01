import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTrips } from "../../../context/trip";

/**
 * Real tap result from the backend Deduction:
 *   wasTransfer = true  → "Free transfer!" (BR-04, no journey deducted)
 *   wasTransfer = false → one journey deducted
 */
export default function RideSuccessScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { rides, passExpiresOn } = useTrips();

  const deduction = state?.deduction || null;
  const routeLabel = state?.routeLabel || deduction?.routeCode || "your journey";
  const wasTransfer = Boolean(deduction?.wasTransfer);

  return (
    <div className="flex flex-col px-6 pt-6 pb-8 min-h-full">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className={`h-20 w-20 rounded-full flex items-center justify-center ${
            wasTransfer ? "bg-cream-100" : "bg-emerald-50"
          }`}
        >
          {wasTransfer ? <TransferIcon /> : <CheckIcon />}
        </motion.div>

        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            {wasTransfer ? "Free transfer!" : "Ride Successful!"}
          </h1>
          <p className="text-slate-500 text-[14px] mt-2 leading-relaxed px-4">
            {wasTransfer
              ? `You changed buses within 60 minutes — your transfer onto ${routeLabel} was free.`
              : `1 journey has been deducted for ${routeLabel}.`}
          </p>
        </div>

        <div className="w-full rounded-2xl bg-white border border-ink-900/5 shadow-[0_2px_14px_-6px_rgba(0,0,0,0.08)] px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-slate-500">
                REMAINING BALANCE
              </p>
              <p className="font-display text-xl font-bold text-ink-900 mt-1">
                {rides} {rides === 1 ? "Journey" : "Journeys"} Left
              </p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-cream-200 flex items-center justify-center">
              <TicketIcon />
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-ink-900/5 flex items-center gap-2 text-[12px] text-slate-500">
            <ClockIcon />
            {passExpiresOn
              ? `Pass valid until ${new Date(passExpiresOn).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`
              : "Top up to keep your pass active"}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => navigate("/card")}
          className="btn-gold w-full py-4 text-[15px]"
        >
          Done
        </motion.button>
        <button
          type="button"
          onClick={() => navigate("/history")}
          className="btn-ghost w-full py-4 text-[15px]"
        >
          View Recent Transactions
        </button>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-9 w-9"
      fill="none"
      stroke="#16a34a"
      strokeWidth="2.4"
    >
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-9 w-9"
      fill="none"
      stroke="#b9852a"
      strokeWidth="2.2"
    >
      <path
        d="M4 8h13l-3-3M20 16H7l3 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-gold-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="6" width="18" height="12" rx="2.2" />
      <path d="M14 7.5v9" strokeLinecap="round" strokeDasharray="1.6 2.2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
