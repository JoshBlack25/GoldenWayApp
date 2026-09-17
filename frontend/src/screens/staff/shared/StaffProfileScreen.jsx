import { useEffect, useState } from "react";
import { useAuth } from "../../../context/auth";
import {
  fetchMyStaffProfile,
  updateMyStaffProfile,
} from "../../../api/operations";

/**
 * Staff profile — the "Profile" tab every staff role shares (Home-first
 * nav skeleton). Identity + session actions; AGENT additionally gets the
 * self-service contact section (0011): first name, surname and phone are
 * editable via update_my_staff_profile, and email is fixed (auth.users
 * owns it — changing it would break onboarding linkage). DOB / ID number
 * don't exist for staff accounts, so they're intentionally absent.
 * Other roles keep the read-only view — their lanes belong to their teams.
 */
export default function StaffProfileScreen() {
  const { user, logout } = useAuth();
  const [confirm, setConfirm] = useState(false);

  const rows = [
    ["NAME", `${user?.firstName || ""} ${user?.surname || ""}`.trim()],
    ["ROLE", user?.role || "—"],
    ["EMAIL", user?.email || "—"],
  ];

  return (
    <div className="px-5 pt-2">
      <p className="eyebrow text-gold-600">STAFF ACCOUNT</p>
      <h1 className="font-display text-2xl font-bold mt-1">
        {user?.firstName} {user?.surname}
      </h1>

      <div className="mt-5 rounded-2xl border border-ink-900/10 bg-white p-5" style={{ boxShadow: "var(--shadow-card)" }}>
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
      {user?.role === "AGENT" && <AgentContactSection />}

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

/**
 * Agent contact details — reads the live staff row (0011 phone column),
 * "Edit" opens an inline form backed by update_my_staff_profile. The
 * backend validates the SA phone format and writes an audit entry.
 */
function AgentContactSection() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", surname: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let live = true;
    fetchMyStaffProfile()
      .then((p) => {
        if (!live) return;
        setProfile(p);
        setForm({ firstName: p?.firstName || "", surname: p?.surname || "", phone: p?.phone || "" });
      })
      .catch(() => live && setProfile(null));
    return () => {
      live = false;
    };
  }, []);

  async function save(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const updated = await updateMyStaffProfile(form);
      setProfile(updated);
      setMsg("Profile updated.");
      setEditing(false);
    } catch (err) {
      setError(err?.message || "Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  const detailRows = [
    ["FIRST NAME", profile?.firstName || "—"],
    ["SURNAME", profile?.surname || "—"],
    ["PHONE", profile?.phone || "Not set yet"],
    ["EMAIL", profile?.email || "—"],
  ];

  return (
    <div className="mt-4 rounded-2xl border border-ink-900/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-ink-900/45">CONTACT DETAILS</p>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setForm({
                firstName: profile?.firstName || "",
                surname: profile?.surname || "",
                phone: profile?.phone || "",
              });
              setEditing(true);
              setMsg("");
              setError("");
            }}
            className="rounded-lg bg-gold-400 px-3 py-1.5 text-[11px] font-bold text-ink-900 hover:brightness-105 active:scale-[0.97]"
          >
            Edit
          </button>
        )}
      </div>

      {msg && <p role="status" className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-50 px-3.5 py-2 text-[11.5px] text-emerald-700">✓ {msg}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-50 px-3.5 py-2 text-[11.5px] text-red-600">{error}</p>}

      {editing ? (
        <form onSubmit={save} className="mt-3 flex flex-col gap-3">
          <ProfileField
            label="FIRST NAME"
            value={form.firstName}
            onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
          />
          <ProfileField
            label="SURNAME"
            value={form.surname}
            onChange={(v) => setForm((f) => ({ ...f, surname: v }))}
          />
          <ProfileField
            label="PHONE"
            value={form.phone}
            placeholder="0821234567"
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
          />
          <div className="rounded-xl border-l-4 border-gold-400 bg-cream-100 px-3.5 py-2.5">
            <p className="text-[11px] text-ink-900/55 leading-relaxed">
              Email can't be changed here — it's tied to your sign-in. Phone must be a valid SA number.
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-ink-900/15 py-2.5 text-[12.5px] font-semibold text-ink-900/70 hover:bg-cream-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-gold flex-1 rounded-xl py-2.5 text-[12.5px] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-ink-900/5">
          {detailRows.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between py-3">
              <span className="text-[11px] font-bold tracking-[0.12em] text-ink-900/40">{k}</span>
              <span className="text-[13px] font-semibold text-ink-900 truncate max-w-[60%] text-right">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProfileField({ label, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold tracking-[0.14em] text-ink-900/40">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 placeholder:text-ink-900/30 outline-none focus:border-gold-400/60"
      />
    </label>
  );
}
