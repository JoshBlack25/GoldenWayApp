import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { requestStaffAccess } from "../../api/auth";

const ROLES = ["DRIVER", "INSPECTOR", "CLERK", "AGENT", "ADMIN"];

/**
 * Staff Sign-Up (QuesAndSuggest point 2) — the employee onboarding door.
 * Creates a PENDING row in staff_access_requests; an ADMIN approves it in
 * the console, then the person signs up with the same email and the 0005
 * trigger attaches their approved role.
 */
export default function StaffSignupScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    surname: "",
    requestedRole: "DRIVER",
    motivation: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!form.firstName.trim() || !form.surname.trim()) {
      setError("Enter your first name and surname.");
      return;
    }
    setBusy(true);
    try {
      await requestStaffAccess(form);
      setSent(true);
    } catch (err) {
      setError(err?.message || "Could not submit the request. Try again shortly.");
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
        className="flex-1 px-7 pt-4 pb-8"
      >
        {sent ? (
          <div className="text-center mt-8">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-cream-200 flex items-center justify-center">
              <BadgeIcon />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900">
              Request sent
            </h1>
            <p className="text-slate-500 text-[14px] mt-2 leading-relaxed">
              A GoldenWay admin will review your{" "}
              <span className="font-semibold text-ink-700">{form.requestedRole}</span>{" "}
              access request for{" "}
              <span className="font-semibold text-ink-700">{form.email.trim()}</span>.
              Once approved, sign up with that same email to finish setting up
              your account.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-7 w-full btn-gold py-4 text-[15px]"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-ink-900 text-center">
              Staff Sign-Up
            </h1>
            <p className="text-slate-500 text-[14px] text-center mt-2 leading-relaxed">
              Request employee access. An admin approves every account before
              it goes live.
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

              <Field label="Work Email" type="email" placeholder="you@goldenway.example" value={form.email} onChange={set("email")} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" placeholder="Zanele" value={form.firstName} onChange={set("firstName")} />
                <Field label="Surname" placeholder="Khumalo" value={form.surname} onChange={set("surname")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink-700">Requested Role</label>
                <div className="field-shell">
                  <select
                    value={form.requestedRole}
                    onChange={set("requestedRole")}
                    className="w-full py-3.5 text-[15px] text-ink-900 bg-transparent outline-none appearance-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink-700">
                  Motivation <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.motivation}
                  onChange={set("motivation")}
                  placeholder="e.g. Qualified NCPD driver, 8 years on the Malmesbury line."
                  className="field-shell w-full py-3.5 text-[14px] text-ink-900 placeholder:text-slate-400 outline-none resize-none items-start"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={busy}
                className="mt-2 w-full btn-gold py-4 text-[15px] disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Request Access"}
              </motion.button>
            </form>
          </>
        )}

        <p className="text-center text-[13px] text-slate-500 mt-6">
          Commuter?{" "}
          <Link to="/register" className="font-semibold text-gold-600">
            Create a commuter account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

function Field({ label, type = "text", placeholder, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-ink-700">{label}</label>
      <div className="field-shell">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full py-3.5 text-[15px] text-ink-900 placeholder:text-slate-400 bg-transparent outline-none"
        />
      </div>
    </div>
  );
}

function BadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8.5 17c.6-1.8 1.9-2.8 3.5-2.8s2.9 1 3.5 2.8" strokeLinecap="round" />
    </svg>
  );
}
