import { useEffect, useState } from "react";
import { useAuth } from "../../../context/auth";
import { updateMyStaffDetails } from "../../../api/staff";

/**
 * Staff profile — the "Profile" tab every staff role shares (Home-first
 * nav skeleton). Self-service "My details" (migration 0013): name,
 * surname, phone, and an opt-in password change that requires the
 * CURRENT password (verified server-side) plus confirmation of the new
 * one. Commuters keep their own richer profile screen.
 */
export default function StaffProfileScreen() {
  const { user, logout, setUser } = useAuth();
  const [confirm, setConfirm] = useState(false);

  const rows = [
    ["ROLE", user?.role || "—"],
    ["EMAIL", user?.email || "—"],
  ];

  return (
    <div className="px-5 pt-2">
      <p className="eyebrow text-gold-600">STAFF ACCOUNT</p>
      <h1 className="font-display text-2xl font-bold mt-1">
        {user?.firstName} {user?.surname}
      </h1>

      <EditDetailsCard user={user} setUser={setUser} />

      <div className="mt-4 rounded-2xl border border-ink-900/10 bg-white p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <ul className="flex flex-col divide-y divide-ink-900/5">
          {rows.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between py-3">
              <span className="text-[11px] font-bold tracking-[0.12em] text-ink-900/40">{k}</span>
              <span className="text-[13px] font-semibold text-ink-900 truncate max-w-[60%] text-right">{v}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Agent self-service contact details (0011) — AGENT only */}

      <div className="mt-4 rounded-2xl border border-ink-900/10 bg-white p-5">
        <p className="eyebrow text-ink-900/45">SESSION</p>
        <p className="mt-2 text-[12.5px] text-ink-900/55">
          Signed in to the GoldenWay staff console. Your role decides which tools appear in the tab bar.
        </p>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="mt-4 w-full rounded-xl border border-red-500/30 py-3 text-[13px] font-semibold text-red-600 hover:bg-red-50 active:scale-[0.99]"
        >
          Sign out
        </button>
      </div>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 px-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirm(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-ink-900/10 bg-white p-6" style={{ boxShadow: "var(--shadow-card-lg)" }}>
            <h3 className="font-display text-[16px] font-bold text-ink-900">Sign out?</h3>
            <p className="mt-1.5 text-[12.5px] text-ink-900/60">You'll return to the login screen.</p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="flex-1 rounded-xl border border-ink-900/15 py-2.5 text-[12.5px] font-semibold text-ink-900/70 hover:bg-cream-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex-1 rounded-xl bg-ink-900 py-2.5 text-[12.5px] font-bold text-cream-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// My details — editable name / phone + opt-in password change (0013)
// ---------------------------------------------------------------------

const PHONE_RE = /^(\+27|0)\d{9}$/;

function EditDetailsCard({ user, setUser }) {
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    surname: user?.surname || "",
    phone: user?.phone || "",
  });
  const [changePassword, setChangePassword] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setPwField = (key) => (e) => setPw((p) => ({ ...p, [key]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setDone("");

    const phone = form.phone.trim();
    if (phone && !PHONE_RE.test(phone)) {
      setError("Phone must be a valid SA number, e.g. 0821234567.");
      return;
    }

    if (changePassword) {
      if (!pw.current) {
        setError("Enter your current password to change it.");
        return;
      }
      if (pw.next.length < 8) {
        setError("New password must be at least 8 characters.");
        return;
      }
      if (pw.next !== pw.confirm) {
        setError("New password and confirmation do not match.");
        return;
      }
    }

    setBusy(true);
    try {
      const updated = await updateMyStaffDetails({
        firstName: form.firstName,
        surname: form.surname,
        phone,
        changePassword,
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      setUser((u) => ({ ...u, firstName: updated.firstName, surname: updated.surname, phone: updated.phone }));
      setForm({ firstName: updated.firstName, surname: updated.surname, phone: updated.phone || "" });
      setPw({ current: "", next: "", confirm: "" });
      setChangePassword(false);
      setDone(updated.passwordChanged ? "Details and password updated." : "Details updated.");
    } catch (err) {
      setError(err?.payload?.error || err?.message || "Update failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="mt-5 rounded-2xl border border-ink-900/10 bg-white p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="eyebrow text-ink-900/45">MY DETAILS</p>
      <p className="mt-1.5 text-[12.5px] text-ink-900/55">
        Update how your name appears and the mobile number we reach you on.
      </p>

      <div className="mt-4 flex flex-col gap-3.5">
        <Field label="FIRST NAME" value={form.firstName} onChange={setField("firstName")} />
        <Field label="SURNAME" value={form.surname} onChange={setField("surname")} />
        <Field
          label="MOBILE NUMBER"
          value={form.phone}
          onChange={setField("phone")}
          placeholder="0821234567"
          inputMode="tel"
        />
      </div>

      {/* Opt-in password change */}
      <label className="mt-4 flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={changePassword}
          onChange={(e) => {
            setChangePassword(e.target.checked);
            setError("");
            setDone("");
          }}
          className="mt-0.5 h-4 w-4 accent-gold-500"
        />
        <span className="text-[12.5px] font-semibold text-ink-900">
          I also want to change my password
        </span>
      </label>

      {changePassword && (
        <div className="mt-3 rounded-xl border border-gold-500/30 bg-cream-100/70 p-3.5 flex flex-col gap-3">
          <PwField
            label="CURRENT PASSWORD"
            value={pw.current}
            onChange={setPwField("current")}
            autoComplete="current-password"
          />
          <PwField
            label="NEW PASSWORD (MIN 8 CHARS)"
            value={pw.next}
            onChange={setPwField("next")}
            autoComplete="new-password"
          />
          <PwField
            label="CONFIRM NEW PASSWORD"
            value={pw.confirm}
            onChange={setPwField("confirm")}
            autoComplete="new-password"
            invalid={pw.confirm.length > 0 && pw.confirm !== pw.next}
          />
          <p className="text-[11px] text-ink-900/45">
            Your current password is verified against the database before the
            change is applied.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12px] font-semibold text-red-600">
          {error}
        </p>
      )}
      {done && !error && (
        <p className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] font-semibold text-emerald-700">
          ✓ {done}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn-gold mt-4 w-full py-3.5 text-[13px] disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, inputMode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold tracking-[0.14em] text-slate-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        className="field-shell w-full py-3 text-[13.5px] text-ink-900"
      />
    </label>
  );
}

function PwField({ label, value, onChange, autoComplete, invalid }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold tracking-[0.14em] text-slate-500">{label}</span>
      <input
        type="password"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className={`field-shell w-full py-3 text-[13.5px] text-ink-900 ${
          invalid ? "border-red-400" : ""
        }`}
      />
    </label>
  );
}
