import { useState } from "react";
import { useAuth } from "../../../context/auth";
import { updateMyStaffDetails } from "../../../api/staff";
import { deactivateMyAccount } from "../../../api/operations";

/**
 * Staff profile — the "Profile" tab every staff role shares (Home-first
 * nav skeleton). Full CRUD on the account itself:
 *   Create → /staff-signup request, admin-approved
 *   Read   → loaded below (my_profile_type carries phone too — 0015)
 *   Update → EditDetailsCard: name/surname/phone + opt-in password change
 *            (0013 design, current password re-verified server-side)
 *   Delete → "Deactivate my account" (soft-delete — nothing is
 *            hard-deleted anywhere else in this app either; runs/cards
 *            go through a status flag, not DELETE)
 */
export default function StaffProfileScreen() {
  const { user, logout, setUser } = useAuth();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState("");

  const rows = [
    ["ROLE", user?.role || "—"],
    ["EMAIL", user?.email || "—"],
  ];

  async function handleDeactivate() {
    if (deactivating) return;
    setDeactivating(true);
    setDeactivateError("");
    try {
      await deactivateMyAccount();
      await logout();
    } catch (err) {
      setDeactivateError(err?.message || "Could not deactivate your account.");
      setDeactivating(false);
    }
  }

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

      <div className="mt-4 rounded-2xl border border-ink-900/10 bg-white p-5">
        <p className="eyebrow text-ink-900/45">SESSION</p>
        <p className="mt-2 text-[12.5px] text-ink-900/55">
          Signed in to the GoldenWay staff console. Your role decides which tools appear in the tab bar.
        </p>
        <button
          type="button"
          onClick={() => setConfirmSignOut(true)}
          className="mt-4 w-full rounded-xl border border-ink-900/15 py-3 text-[13px] font-semibold text-ink-900/70 hover:bg-cream-200 active:scale-[0.99]"
        >
          Sign out
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-red-400/25 bg-white p-5">
        <p className="eyebrow text-red-500/80">DANGER ZONE</p>
        <p className="mt-2 text-[12.5px] text-ink-900/55">
          Deactivating removes your access to the staff console immediately. An admin can reactivate your account later.
          {user?.role === "DRIVER" && " You can't deactivate while a run is in progress — end it first."}
        </p>
        {deactivateError && (
          <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-[12px] text-red-600">
            {deactivateError}
          </p>
        )}
        <button
          type="button"
          onClick={() => setConfirmDeactivate(true)}
          className="mt-4 w-full rounded-xl border border-red-500/30 py-3 text-[13px] font-semibold text-red-600 hover:bg-red-50 active:scale-[0.99]"
        >
          Deactivate my account
        </button>
      </div>

      {confirmSignOut && (
        <ConfirmDialog
          title="Sign out?"
          body="You'll return to the login screen."
          confirmLabel="Sign out"
          onCancel={() => setConfirmSignOut(false)}
          onConfirm={logout}
        />
      )}

      {confirmDeactivate && (
        <ConfirmDialog
          danger
          title="Deactivate your account?"
          body="You'll be signed out immediately and won't be able to log back in until an admin reactivates you."
          confirmLabel={deactivating ? "Deactivating…" : "Deactivate"}
          confirmDisabled={deactivating}
          onCancel={() => setConfirmDeactivate(false)}
          onConfirm={handleDeactivate}
        />
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

function ConfirmDialog({ title, body, confirmLabel, confirmDisabled, danger, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 px-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-ink-900/10 bg-white p-6" style={{ boxShadow: "var(--shadow-card-lg)" }}>
        <h3 className="font-display text-[16px] font-bold text-ink-900">{title}</h3>
        <p className="mt-1.5 text-[12.5px] text-ink-900/60">{body}</p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-ink-900/15 py-2.5 text-[12.5px] font-semibold text-ink-900/70 hover:bg-cream-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-[12.5px] font-bold disabled:opacity-60 ${
              danger ? "bg-red-600 text-white" : "bg-ink-900 text-cream-50"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
