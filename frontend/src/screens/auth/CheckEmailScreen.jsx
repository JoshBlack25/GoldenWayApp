import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";

/**
 * /check-email (0017) — shown right after signUp() when Confirm Email
 * is on. No session exists yet, so this is purely informational until
 * the user clicks the link in their inbox and lands on
 * /account-created. Offers a resend in case the email didn't arrive.
 */
export default function CheckEmailScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState("");

  async function handleResend() {
    if (!email || resending) return;
    setResending(true);
    setResendError("");
    setResent(false);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/account-created`,
        },
      });
      if (error) throw error;
      setResent(true);
    } catch (err) {
      setResendError(
        err?.message || "Could not resend the email. Please try again shortly.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="app-shell flex flex-col px-7 pt-6 pb-8">
      <span className="text-center text-[13px] font-semibold tracking-wide text-gold-500">
        One more step
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
          style={{
            background:
              "linear-gradient(135deg, #ffd873 0%, #ffc52e 45%, #f0b429 100%)",
            boxShadow: "var(--shadow-glow-gold)",
          }}
        >
          <MailIcon />
        </motion.div>

        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Check your email
          </h1>
          <p className="text-slate-500 text-[14px] mt-2 leading-relaxed px-4">
            {email ? (
              <>
                We've sent a verification link to{" "}
                <span className="font-semibold text-ink-900">{email}</span>.
              </>
            ) : (
              "We've sent a verification link to your email address."
            )}{" "}
            Click it to activate your account — then you can log in.
          </p>
        </div>

        {resendError && (
          <div
            role="alert"
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-600"
          >
            {resendError}
          </div>
        )}

        {resent && (
          <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-medium text-emerald-700 text-center">
            Verification email resent — check your inbox (and spam folder).
          </div>
        )}

        <div className="w-full flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleResend}
            disabled={!email || resending}
            className="w-full rounded-xl border border-ink-900/10 bg-white py-3.5 text-[14px] font-semibold text-ink-900 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.08)] disabled:opacity-50 transition-colors"
          >
            {resending ? "Resending…" : "Resend verification email"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="w-full rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 py-4 font-display font-semibold text-ink-900 text-[15px] shadow-[0_10px_24px_-10px_rgba(240,180,41,0.8)]"
          >
            Go to Login
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 pt-4">
        <p className="text-[12px] text-slate-500">
          Wrong email?{" "}
          <button
            type="button"
            onClick={() => navigate("/register", { replace: true })}
            className="font-medium text-gold-600 underline underline-offset-2"
          >
            Sign up again
          </button>
        </p>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="#3d2f05"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
