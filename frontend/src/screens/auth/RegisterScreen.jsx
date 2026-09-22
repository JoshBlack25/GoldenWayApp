import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/auth";
import { ApiError } from "../../api/client";
import {
  formatIdNumber,
  luhnValid,
  idNumberValid,
  deriveDobFromId,
} from "../../utils/saId";

/**
 * RegisterScreen — real POST /auth/register.
 * The backend (CommuterFactory) validates: names, SA-format phone
 * ((+27|0)xxxxxxxxx), a 13-digit SA ID with a valid Luhn checksum, age ≥ 5,
 * and unique email/ID (409). Field-level errors come back as 400
 * { field: "message" } and are shown next to each input.
 *
 * DOB auto-fill: SA IDs encode YYMMDD as the first 6 digits. We derive and
 * populate Date of Birth from that as the user types the ID, but stop
 * overwriting it the moment they edit DOB manually.
 *
 * Gender removed (2026-09) — dropped from public.commuters; see
 * supabase/migrations/0014_remove_gender.sql.
 */

// ID formatting/checksum/DOB derivation live in utils/saId.js (shared,
// unit-tested against the backend contract).

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", surname: "" };
  if (parts.length === 1) return { firstName: parts[0], surname: "" };
  return { firstName: parts[0], surname: parts.slice(1).join(" ") };
}

export default function RegisterScreen() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dobSource, setDobSource] = useState("empty"); // "empty" | "auto" | "manual"
  const [concessionType, setConcessionType] = useState("NONE");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const idDigits = idNumber.replace(/\D/g, "");
  const idError = useMemo(() => {
    if (!idDigits) return "";
    if (idDigits.length !== 13) return "SA ID must be 13 digits";
    if (!luhnValid(idDigits))
      return "This ID number fails the checksum — please check it";
    return "";
  }, [idDigits]);

  // Auto-fill DOB from the ID as it's typed, unless the user has manually edited DOB.
  useEffect(() => {
    if (dobSource === "manual") return;
    const derived = deriveDobFromId(idDigits);
    if (derived) {
      setDateOfBirth(derived);
      setDobSource("auto");
    } else if (dobSource === "auto" && idDigits.length < 6) {
      setDateOfBirth("");
      setDobSource("empty");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idDigits]);

  const minDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 120);
    return d.toISOString().slice(0, 10);
  }, []);
  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 5);
    return d.toISOString().slice(0, 10);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setFieldErrors({});

    const { firstName, surname } = splitName(fullName);
    const clientErrors = {};
    if (!firstName || !surname)
      clientErrors.fullName = "Enter your first name and surname";
    if (password.length < 8)
      clientErrors.password = "Password must be at least 8 characters";
    if (password !== confirmPassword)
      clientErrors.confirmPassword = "Passwords do not match";
    if (!idNumberValid(idDigits))
      clientErrors.idNumber = "Enter a valid 13-digit SA ID number";
    if (!dateOfBirth) clientErrors.dateOfBirth = "Select your date of birth";
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      return;
    }

    setBusy(true);
    try {
      await register({
        firstName,
        surname,
        email: email.trim(),
        phone: phone.trim(),
        password,
        dateOfBirth,
        idNumber: idDigits,
        concessionType,
      });
      navigate("/account-created", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError(
            "An account already exists with this email or ID number. Try logging in instead.",
          );
        } else if (
          err.status === 400 &&
          err.fieldErrors &&
          Object.keys(err.fieldErrors).length
        ) {
          setFieldErrors(err.fieldErrors);
          setError("Please fix the highlighted fields.");
        } else {
          setError(err.message || "Registration failed. Please try again.");
        }
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
      <div className="flex items-center gap-2 px-5 pt-5 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-ink-900 text-xl leading-none -ml-1 px-1"
          aria-label="Back"
        >
          &larr;
        </button>
        <img src="/images/Logo1.png" alt="GoldenWay" className="h-6 w-auto" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex-1 px-7 pt-2 overflow-y-auto pb-8 no-scrollbar"
      >
        <div className="flex justify-center mb-4">
          <img
            src="/images/Logo2.png"
            alt="GoldenWay"
            className="h-16 w-auto"
          />
        </div>

        <h1 className="font-display text-2xl font-bold text-ink-900 text-center">
          Create Account
        </h1>
        <p className="text-slate-500 text-[14px] text-center mt-2 leading-relaxed">
          Join the community of daily commuters.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-600"
            >
              {error}
            </div>
          )}

          <Field
            label="Full Name"
            type="text"
            placeholder="e.g. Thandiwe Mbeki"
            value={fullName}
            onChange={setFullName}
            autoComplete="name"
            icon={<PersonIcon />}
            error={fieldErrors.firstName || fieldErrors.surname}
          />

          <Field
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            icon={<MailIcon />}
            error={fieldErrors.email}
          />

          <Field
            label="Phone Number"
            type="tel"
            placeholder="072 123 4567"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
            icon={<PhoneIcon />}
            error={fieldErrors.phone}
          />

          <Field
            label="SA ID Number"
            type="text"
            inputMode="numeric"
            placeholder="900515 5000 081"
            value={formatIdNumber(idDigits)}
            onChange={(v) => setIdNumber(v.replace(/\D/g, "").slice(0, 13))}
            icon={<IdIcon />}
            error={fieldErrors.idNumber || idError}
          />

          <SelectField
            label="Concession"
            value={concessionType}
            onChange={setConcessionType}
            options={[
              { value: "NONE", label: "None" },
              { value: "STUDENT", label: "Student −15%" },
              { value: "PENSIONER", label: "Pensioner −20%" },
            ]}
          />

          <Field
            label="Date of Birth"
            type="date"
            value={dateOfBirth}
            onChange={(v) => {
              setDateOfBirth(v);
              setDobSource("manual");
            }}
            min={minDob}
            max={maxDob}
            icon={<CalendarIcon />}
            error={fieldErrors.dateOfBirth}
            hint={
              dobSource === "auto" ? "Auto-filled from your ID number" : null
            }
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-ink-700">
              Password
            </label>
            <div className="field-shell">
              <LockIcon />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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
            {fieldErrors.password && (
              <p className="text-[11px] text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <Field
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            icon={<ShieldIcon />}
            error={fieldErrors.confirmPassword}
          />

          <label className="flex items-start gap-2.5 mt-1 select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-ink-900/20 accent-gold-500 shrink-0"
            />
            <span className="text-[13px] text-slate-500 leading-snug">
              I agree to{" "}
              <span className="font-semibold text-gold-600">
                Terms &amp; Conditions
              </span>{" "}
              and{" "}
              <span className="font-semibold text-gold-600">
                Privacy Policy
              </span>
            </span>
          </label>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={!agreed || busy}
            className="mt-2 w-full btn-gold py-4 text-[15px] disabled:opacity-50"
          >
            {busy ? "Creating account…" : "Sign Up"}
          </motion.button>
        </form>

        <p className="text-center text-[13px] text-slate-500 mt-6">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-semibold text-gold-600"
          >
            Login
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
  error,
  inputMode,
  min,
  max,
  hint,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-ink-700">{label}</label>
      <div className={`field-shell ${error ? "!border-red-400" : ""}`}>
        {icon}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          inputMode={inputMode}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full py-3.5 text-[15px] text-ink-900 placeholder:text-slate-400 bg-transparent outline-none"
        />
      </div>
      {error ? (
        <p className="text-[11px] text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-gold-600 font-medium">{hint}</p>
      ) : null}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-ink-700">{label}</label>
      <div className="field-shell">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full py-3.5 text-[15px] text-ink-900 bg-transparent outline-none appearance-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </div>
    </div>
  );
}

/* --- inline icons --- */

function PersonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-slate-400 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path
        d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-slate-400 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M6.5 3.5c.6 0 1.1.4 1.3 1l1 2.6c.2.5 0 1.1-.3 1.5L7 10c1 2.3 2.7 4 5 5l1.4-1.5c.4-.4 1-.5 1.5-.3l2.6 1c.6.2 1 .7 1 1.3v2.2c0 1-.9 1.7-1.9 1.5C10.4 18.4 5.6 13.6 4.2 7.4 4 6.4 4.7 5.5 5.7 5.5h.8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IdIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-slate-400 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path
        d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14.5 9.5H18M14.5 13H18"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-slate-400 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
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

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-slate-400 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-slate-400 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
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
