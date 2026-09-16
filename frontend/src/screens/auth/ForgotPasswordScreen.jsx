import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { requestPasswordReset } from "../../api/auth";

/**
 * Forgot Password — sends a real reset email via Supabase Auth (mock M1).
 * The email's link lands on /reset-password where the new password is set.
 */
export default function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Enter the email address on your GoldenWay account.");
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err?.message || "Could not send the reset email. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell flex flex-col">
      <div className="flex items-center px-5 pt-5 pb-4">
        <img src="/images/Logo1.png" alt="GoldenWay" className="h-6 w-auto" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex-1 px-7 pt-4"
      >
        <div className="flex justify-center mb-5">
          <img src="/images/Logo2.png" alt="GoldenWay" className="h-16 w-auto" />
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-cream-200 flex items-center justify-center">
              <MailCheckIcon />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900">
              Check your email
            </h1>
            <p className="text-slate-500 text-[14px] mt-2 leading-relaxed">
              We sent a password reset link to{" "}
              <span className="font-semibold text-ink-700">{email.trim()}</span>.
              Open it on this device to set your new password.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-7 w-full btn-gold py-4 text-[15px]"
            >
              Back to Sign In
            </button>
            <p className="text-[12px] text-slate-400 mt-4">
              Didn&apos;t get it? Check your spam folder, or{" "}
              <button
                type="button"
                className="font-semibold text-gold-600"
                onClick={() => setSent(false)}
              >
                try another email
              </button>
              .
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-ink-900 text-center">
              Forgot Password?
            </h1>
            <p className="text-slate-500 text-[14px] text-center mt-2 leading-relaxed">
              Enter your account email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-7">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-600"
                >
                  {error}
                </div>
              )}

              <Field
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={setEmail}
                autoComplete="email"
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={busy}
                className="mt-2 w-full btn-gold py-4 text-[15px] disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send Reset Link"}
              </motion.button>
            </form>
          </>
        )}

        <p className="text-center text-[13px] text-slate-500 mt-6 pb-8">
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-gold-600">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

function Field({ label, type, placeholder, value, onChange, autoComplete }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-ink-700">{label}</label>
      <div className="field-shell">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full py-3.5 text-[15px] text-ink-900 placeholder:text-slate-400 bg-transparent outline-none"
        />
      </div>
    </div>
  );
}

function MailCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 17l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
