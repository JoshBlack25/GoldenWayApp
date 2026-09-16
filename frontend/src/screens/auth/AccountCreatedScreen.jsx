import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/auth";

export default function AccountCreatedScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="app-shell flex flex-col px-7 pt-6 pb-8">
      <span className="text-center text-[13px] font-semibold tracking-wide text-gold-500">
        Success
      </span>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 -mt-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 14,
            delay: 0.1,
          }}
          className="h-20 w-20 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #ffd873 0%, #ffc52e 45%, #f0b429 100%)", boxShadow: "var(--shadow-glow-gold)" }}
        >
          <CheckIcon />
        </motion.div>

        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Account Created Successfully
          </h1>
          <p className="text-slate-500 text-[14px] mt-2 leading-relaxed px-4">
            Welcome to GoldenWay. Your account is ready to use.
          </p>
        </div>

        <div className="w-full flex items-center gap-3 rounded-2xl border border-ink-900/5 bg-white px-4 py-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.08)]">
          <div className="h-9 w-9 rounded-full bg-cream-200 flex items-center justify-center shrink-0">
            <StarIcon />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-gold-600">
              MEMBERSHIP ACTIVE
            </p>
            <p className="text-[15px] font-semibold text-ink-900">
              GoldenWay Tier 1
            </p>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => navigate("/home", { replace: true })}
          className="mt-1 w-full rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 py-4 font-display font-semibold text-ink-900 text-[15px] flex items-center justify-center gap-2 shadow-[0_10px_24px_-10px_rgba(240,180,41,0.8)]"
        >
          {user ? "Start Riding →" : (<>Go to Login <span aria-hidden="true">→</span></>)}
        </motion.button>
      </div>

      <div className="flex flex-col items-center gap-2 pt-4">
        <p className="text-[12px] text-slate-500">
          Powered by{" "}
          <span className="font-medium text-ink-700">
            Golden Arrow Bus Services
          </span>
        </p>
        <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-gold-600">
          <ShieldCheckIcon />
          SECURE ACTIVATION
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="#3d2f05"
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

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="var(--color-gold-500)"
    >
      <path d="M12 2.5l2.9 6 6.6.7-4.9 4.5 1.3 6.6L12 16.9 6.1 20.3l1.3-6.6-4.9-4.5 6.6-.7L12 2.5z" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12l1.8 1.8L14.8 10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
