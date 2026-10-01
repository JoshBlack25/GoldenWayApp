import { useState } from "react";
import { useAuth } from "../../../context/auth";

/**
 * Staff profile — the "Profile" tab every staff role shares (Home-first
 * nav skeleton). Read-only identity + session actions; commuters keep
 * their own richer profile screen.
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
