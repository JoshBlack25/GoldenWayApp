import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function UpdateProfileScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "John",
    surname: "Doe",
    dob: "15 May 1990",
    idNumber: "900515 5000 081",
    email: "johndoe@gmail.com",
    phone: "+27 94 678 9972",
  });
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="flex flex-col px-5 pb-6 min-h-full">
      {/* Title bar */}
      <div className="flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={() =>
            step === 1 ? navigate("/profile") : setStep(step - 1)
          }
          className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900"
        >
          <span className="text-xl leading-none">&larr;</span> Update Profile
        </button>
        <span className="font-display text-[14px] font-bold text-gold-500">
          GoldenWay
        </span>
      </div>

      {/* Stepper */}
      <div className="flex items-center px-2 pb-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <StepDot n={n} current={step} />
            {n < 3 && (
              <span
                className={`h-0.5 flex-1 mx-1 rounded ${
                  n < step ? "bg-gold-500" : "bg-ink-900/10"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <StepYourDetails
          form={form}
          set={set}
          onNext={() => setStep(2)}
          onCancel={() => navigate("/profile")}
        />
      )}
      {step === 2 && (
        <StepContactDetails
          form={form}
          onNext={() => setStep(3)}
          onCancel={() => navigate("/profile")}
        />
      )}
      {step === 3 && (
        <StepSuccess
          name={`${form.firstName} ${form.surname}`}
          onDone={() => navigate("/profile")}
        />
      )}
    </div>
  );
}

function StepDot({ n, current }) {
  const active = n <= current;
  const isCurrent = n === current;
  return (
    <span
      className={`h-8 w-8 rounded-full flex items-center justify-center font-display text-[12px] font-bold shrink-0 transition-colors ${
        active
          ? isCurrent
            ? "bg-gold-500 text-ink-900 shadow-[0_0_0_4px_rgba(240,180,41,0.25)]"
            : "bg-gold-400 text-ink-900"
          : "bg-cream-200 text-slate-400"
      }`}
      aria-current={isCurrent ? "step" : undefined}
    >
      {n}
    </span>
  );
}

function StepYourDetails({ form, set, onNext, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col flex-1"
    >
      <div className="rounded-2xl border border-ink-900/5 bg-white px-4 py-5">
        <h1 className="font-display text-xl font-bold text-ink-900 mb-4">
          Your Details
        </h1>
        <div className="flex flex-col gap-4">
          <WizardField
            label="FIRST NAME"
            value={form.firstName}
            onChange={set("firstName")}
          />
          <WizardField
            label="SURNAME"
            value={form.surname}
            onChange={set("surname")}
          />
          <WizardField
            label="DATE OF BIRTH"
            value={form.dob}
            onChange={set("dob")}
          />
          <WizardField
            label="ID NUMBER"
            value={form.idNumber}
            onChange={set("idNumber")}
          />
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        className="mt-5 btn-gold w-full py-4 text-[15px]"
      >
        Next &rarr;
      </motion.button>
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 text-[13px] font-medium text-slate-500"
      >
        Cancel
      </button>

      <div className="mt-6 rounded-xl bg-cream-200/80 px-4 py-3.5 flex items-start gap-3">
        <span className="h-7 w-7 rounded-full bg-gold-400 flex items-center justify-center shrink-0 text-[12px] font-bold text-ink-900">
          i
        </span>
        <div>
          <p className="text-[12px] font-bold text-ink-900">Security Note</p>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
            This information is used to verify your identity for secure transit
            card management and insurance purposes.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function StepContactDetails({ form, onNext, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col flex-1"
    >
      <div className="rounded-2xl border border-ink-900/5 bg-white px-4 py-5">
        <h1 className="font-display text-xl font-bold text-ink-900">
          Contact Details
        </h1>
        <p className="text-[12px] text-slate-500 leading-relaxed mt-1 mb-4">
          Please verify your communication methods to receive ride alerts.
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-semibold text-ink-700 mb-1.5">
              Email Address
            </p>
            <div className="field-shell">
              <MailIcon />
              <span className="py-3.5 text-[14px] text-ink-900">
                {form.email}
              </span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-ink-700 mb-1.5">
              Phone Number
            </p>
            <div className="field-shell justify-between">
              <span className="flex items-center gap-2.5 py-3.5 text-[14px] text-ink-900">
                <PhoneIcon /> {form.phone}
              </span>
              <span className="rounded-md bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-700">
                VERIFIED
              </span>
            </div>
          </div>
          <div className="rounded-xl border-l-4 border-gold-400 bg-cream-100 px-4 py-3 flex items-start gap-2.5">
            <InfoIcon />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              These details are used for e-tickets and emergency route updates.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl overflow-hidden relative h-28 bg-navy-900">
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900/90 to-navy-900/40" />
        <div className="absolute inset-0 flex items-center px-5">
          <p className="font-display text-lg font-bold text-gold-300">
            Stay Connected
          </p>
        </div>
        <BusGlyph />
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        className="mt-5 btn-gold w-full py-4 text-[15px]"
      >
        Next &rarr;
      </motion.button>
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 text-[13px] font-medium text-slate-500"
      >
        Cancel
      </button>
    </motion.div>
  );
}

function StepSuccess({ name, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col flex-1"
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 14,
            delay: 0.1,
          }}
          className="h-24 w-24 rounded-full bg-emerald-50 flex items-center justify-center"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-11 w-11"
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
        </motion.div>

        <div className="text-center">
          <h1 className="font-display text-xl font-bold text-ink-900 leading-snug">
            Your details have been updated successfully
          </h1>
          <p className="text-slate-500 text-[13px] mt-2">
            Profile details for {name} have been saved.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-ink-900/5 bg-white px-4 py-4">
          <div className="flex items-center gap-3 pb-3 border-b border-ink-900/5">
            <span className="h-10 w-10 rounded-full bg-cream-200 border-2 border-gold-400 flex items-center justify-center font-display text-[13px] font-bold text-gold-700">
              {name[0]}
            </span>
            <div>
              <p className="text-[10px] font-bold tracking-wide text-gold-600">
                ACTIVE ACCOUNT
              </p>
              <p className="text-[14px] font-semibold text-ink-900">{name}</p>
            </div>
          </div>
          <div className="pt-3 flex items-center justify-between">
            <span className="text-[12px] text-slate-500">Update Type</span>
            <span className="rounded-md bg-cream-200 px-2 py-1 text-[10px] font-semibold text-ink-900">
              General Info
            </span>
          </div>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[12px] text-slate-500">Timestamp</span>
            <span className="text-[12px] font-semibold text-ink-900">
              {new Date().toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              &bull;{" "}
              {new Date().toLocaleTimeString("en-ZA", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onDone}
        className="btn-gold w-full py-4 text-[13px] tracking-[0.1em]"
      >
        BACK TO PROFILE
      </motion.button>
      <button
        type="button"
        className="mt-3 text-[13px] font-medium text-slate-500"
      >
        View Transaction History
      </button>
    </motion.div>
  );
}

function WizardField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-shell w-full py-3.5 text-[14px] text-ink-900 outline-none items-start"
      />
    </label>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-gold-600 shrink-0"
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
      className="h-4 w-4 text-gold-600 shrink-0"
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

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-gold-600 shrink-0 mt-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 11v5" strokeLinecap="round" />
    </svg>
  );
}

function BusGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-16 w-16 absolute right-4 bottom-3 text-gold-400/80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect x="4" y="4" width="16" height="13" rx="2.5" />
      <path d="M4 11h16M8 17v2.5M16 17v2.5" strokeLinecap="round" />
      <circle cx="8.5" cy="14" r="0.6" fill="currentColor" />
      <circle cx="15.5" cy="14" r="0.6" fill="currentColor" />
    </svg>
  );
}
