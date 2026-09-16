import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/auth";
import { ApiError } from "../../api/client";

export default function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password to sign in.");
      return;
    }
    setBusy(true);
    try {
      const profile = await login(email.trim(), password);
      // One login, two surfaces: staff land in the console, commuters in
      // the app — unless a protected route originally wanted them.
      if (profile?.isStaff) {
        navigate("/staff", { replace: true });
      } else {
        navigate(location.state?.from || "/home", { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Incorrect email or password. Please try again.");
      } else {
        setError("Could not reach the GoldenWay service. Try again shortly.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell flex flex-col">
      {/* Header bar */}
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
          <img
            src="/images/Logo2.png"
            alt="GoldenWay"
            className="h-16 w-auto"
          />
        </div>

        <h1 className="font-display text-2xl font-bold text-ink-900 text-center">
          Welcome Back
        </h1>
        <p className="text-slate-500 text-[14px] text-center mt-2 leading-relaxed">
          Sign in to manage your commute and top up your transit card.
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
            icon={<MailIcon />}
          />
          {/* deluxe: fields share the .field-shell primitive from index.css */}

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-ink-700">
              Password
            </label>
            <div className="field-shell">
              <LockIcon />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full py-3.5 text-[15px] text-ink-900 placeholder:text-slate-400 bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-slate-500 shrink-0"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="self-end text-[13px] font-medium text-ink-700 -mt-1"
          >
            Forgot Password?
          </button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={busy}
            className="btn-gold mt-2 w-full py-4 text-[15px] disabled:opacity-60"
          >
            {busy ? "Signing in…" : (
              <>
                Login <span aria-hidden="true">&rarr;</span>
              </>
            )}
          </motion.button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-ink-900/10" />
          <span className="text-[11px] tracking-wide text-slate-400">
            OR CONTINUE WITH
          </span>
          <div className="h-px flex-1 bg-ink-900/10" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SocialButton label="Google" icon={<GoogleIcon />} />
          <SocialButton label="Apple" icon={<AppleIcon />} />
        </div>

        <p className="text-center text-[13px] text-slate-500 mt-6">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="font-semibold text-gold-600"
          >
            Sign Up
          </button>
        </p>

        <p className="text-center text-[12px] text-slate-400 mt-2 pb-8">
          GoldenWay employee?{" "}
          <button
            type="button"
            onClick={() => navigate("/staff-signup")}
            className="font-medium text-ink-700 underline underline-offset-2"
          >
            Request staff access
          </button>
        </p>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  icon,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-ink-700">{label}</label>
      <div className="field-shell">
        {icon}
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

function SocialButton({ label, icon }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 rounded-xl border border-ink-900/10 bg-white/80 py-3 text-[14px] font-medium text-ink-900 shadow-[var(--shadow-card)] transition-all hover:border-gold-500/40 hover:bg-white active:scale-[0.98]"
    >
      {icon}
      {label}
    </button>
  );
}

/* --- inline icons (no external icon package needed yet) --- */

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-slate-400 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-slate-400 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path
        d="M10.6 5.1A10.7 10.7 0 0 1 12 5c5 0 9 4 10 7-.4 1.2-1.3 2.6-2.6 3.9M6.6 6.6C4.5 8 3.1 10 2 12c1 3 5 7 10 7 1.5 0 2.9-.3 4.1-.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.9 10a3 3 0 0 0 4.2 4.2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.3-1.7 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.1 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 9.4-4.9 9.4-7.9 0-.5-.05-.9-.13-1.3H12z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-ink-900">
      <path d="M16.4 1.3c.1 1-.3 2-1 2.8-.6.8-1.7 1.4-2.7 1.3-.1-1 .4-2 1-2.7.7-.8 1.8-1.4 2.7-1.4zM19.9 17c-.5 1.2-.8 1.7-1.5 2.7-1 1.4-2.3 3.2-4 3.2-1.5 0-1.9-1-3.9-1s-2.5 1-4 1c-1.7 0-3-1.6-4-3-2.3-3.4-2.5-7.3-1.1-9.4.9-1.5 2.4-2.4 3.9-2.4 1.5 0 2.5 1 3.8 1 1.2 0 2-1 3.9-1 1.4 0 2.9.8 3.9 2.1-3.4 1.9-2.9 6.7 1 7.8z" />
    </svg>
  );
}
