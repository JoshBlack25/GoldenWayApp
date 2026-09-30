import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { luhnValid } from "../../../../utils/saId";

function formatCardNumber(value) {
  const d = value.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  const d = value.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** True when MM/YY is this month or later. */
function expiryInFuture(month, yearRaw) {
  const m = parseInt(month, 10);
  let y = parseInt(yearRaw, 10);
  if (yearRaw.length === 2) y += 2000;
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  return y > thisYear || (y === thisYear && m >= thisMonth);
}

export default function AddCardDrawer({
  open,
  onClose,
  onSave,
  error = "",
  saving = false,
}) {
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const digits = number.replace(/\D/g, "");
  const [expMonth = "", expYear = ""] = (expiry || "")
    .split("/")
    .map((s) => s.trim());

  const numberComplete = digits.length >= 13;
  const numberOk = numberComplete && luhnValid(digits);
  const expiryShapeOk =
    /^(0?[1-9]|1[0-2])$/.test(expMonth) && /^\d{2}$/.test(expYear);
  const expiryOk = expiryShapeOk && expiryInFuture(expMonth, expYear);

  const canSave = Boolean(
    holder.trim() && numberOk && expiryOk && cvv.length >= 3,
  );

  const numberHint =
    numberComplete && !numberOk
      ? "Check the card number — it doesn't look valid."
      : "";
  const expiryHint = expiryShapeOk && !expiryOk ? "This card has expired." : "";

  // Start each opening with a clean form. (Not cleared on save, so a
  // failed save keeps everything the user typed.)
  useEffect(() => {
    if (!open) return;
    setHolder("");
    setNumber("");
    setExpiry("");
    setCvv("");
  }, [open]);

  // Close on Escape, the way a native sheet would.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  function handleSave(e) {
    e.preventDefault();
    if (!canSave || saving) return;
    // PCI: only safe tokenized fields leave this component — the full PAN
    // and CVV are discarded here; the DB stores brand + last4 + expiry.
    onSave({
      holderName: holder.trim(),
      number: digits,
      expMonth: parseInt(expMonth, 10),
      expYear: 2000 + parseInt(expYear, 10),
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink-900/40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-card-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="relative w-full max-w-[430px] bg-cream-50 rounded-t-3xl px-6 pt-3 pb-8 max-h-[92dvh] overflow-y-auto no-scrollbar"
          >
            <div className="h-1.5 w-10 rounded-full bg-ink-900/15 mx-auto mb-5" />

            <h2
              id="add-card-title"
              className="font-display text-xl font-bold text-ink-900"
            >
              Add New Card
            </h2>
            <p className="text-slate-500 text-[13px] mt-1">
              Add a payment method to your account.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700"
              >
                {error}
              </div>
            )}

            {/* Live card preview */}
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 px-5 py-5 text-cream-50 relative overflow-hidden">
              <div className="h-6 w-9 rounded bg-gold-400/80" />
              <p className="mt-6 text-lg tracking-[0.2em] font-mono">
                {number
                  ? formatCardNumber(number)
                  : "\u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022"}
              </p>
              <div className="mt-5 flex items-center justify-between text-[11px] text-cream-200/80">
                <div>
                  <p className="uppercase tracking-wide text-[9px]">
                    Cardholder
                  </p>
                  <p className="text-cream-50 text-[13px] mt-0.5">
                    {holder || "Your Name"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="uppercase tracking-wide text-[9px]">Expires</p>
                  <p className="text-cream-50 text-[13px] mt-0.5">
                    {expiry || "MM/YY"}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4 mt-5">
              <Field
                label="Cardholder Name"
                placeholder="Johnathan Doe"
                value={holder}
                onChange={setHolder}
                autoComplete="cc-name"
              />
              <Field
                label="Card Number"
                placeholder="0000 0000 0000 0000"
                value={formatCardNumber(number)}
                onChange={(v) => setNumber(v.replace(/\D/g, "").slice(0, 16))}
                inputMode="numeric"
                autoComplete="cc-number"
                hint={numberHint}
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Expiry Date"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(v) => setExpiry(formatExpiry(v))}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  hint={expiryHint}
                />
                <Field
                  label="CVV"
                  placeholder="•••"
                  value={cvv}
                  onChange={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  type="password"
                />
              </div>

              <p className="flex items-center gap-1.5 text-[11px] text-slate-500 justify-center mt-1">
                <LockIcon /> Only the brand and last 4 digits are stored
              </p>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={!canSave || saving}
                className="mt-1 btn-gold w-full py-4 text-[15px] disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save Card"}
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  inputMode,
  autoComplete,
  hint,
  type = "text",
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-700">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={hint ? true : undefined}
        className={`w-full field-shell py-3.5 text-[15px] text-ink-900 placeholder:text-slate-400 outline-none ${
          hint ? "!border-red-400" : ""
        }`}
      />
      {hint && <span className="text-[11px] text-red-600">{hint}</span>}
    </label>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}
