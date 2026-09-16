import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchStaffTeam, setStaffActive } from "../../../api/operations";
import { ApiError } from "../../../api/client";

/**
 * ADMIN — Staff team (D2/D7, mock M6). Real staff rows with activate /
 * deactivate via set_staff_active() — deactivation, never deletion, per
 * the ownership matrix. The active flag is what blocks sign-in
 * (AuthProvider refuses inactive staff sessions).
 */
const ROLE_PILL = {
  ADMIN: "bg-red-500/15 text-red-300 border-red-400/30",
  CLERK: "bg-gold-400/10 text-gold-300 border-gold-400/30",
  INSPECTOR: "bg-sky-400/10 text-sky-300 border-sky-400/30",
  DRIVER: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  AGENT: "bg-violet-400/10 text-violet-300 border-violet-400/30",
};

export default function TeamScreen() {
  const [team, setTeam] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      setTeam(await fetchStaffTeam());
    } catch (err) {
      setError(err?.message || "Could not load the team");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(member) {
    if (busyId) return;
    setBusyId(member.id);
    setError("");
    setMsg("");
    try {
      await setStaffActive(member.id, !member.active);
      setMsg(`${member.firstName} ${member.surname} ${member.active ? "deactivated — they can no longer sign in" : "reactivated"}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the account");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="px-5 pt-2">
        <header>
          <h1 className="font-display text-xl font-bold text-ink-900">Staff team</h1>
          <p className="text-[13px] text-ink-900/50 mt-0.5">
            {team.filter((t) => t.active).length} active of {team.length} accounts
          </p>
        </header>

        {msg && <p role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-[12px] text-emerald-300">✓ {msg}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-[12px] text-red-300">{error}</p>}

        <div className="mt-5 flex flex-col gap-2">
          {team.map((m) => (
            <motion.div
              key={m.id}
              layout
              className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${
                m.active ? "border-ink-900/10 bg-white" : "border-ink-900/5 bg-cream-200 opacity-75"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-semibold text-ink-900/90 truncate">
                    {m.firstName} {m.surname}
                  </p>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-bold tracking-wider ${ROLE_PILL[m.role] || "border-ink-900/15 text-ink-900/55"}`}>
                    {m.role}
                  </span>
                </div>
                <p className="text-[11.5px] text-ink-900/45 truncate mt-0.5">{m.email}</p>
                {!m.active && <p className="text-[10.5px] text-red-300/80 mt-0.5">Deactivated — sign-in blocked</p>}
              </div>
              <button
                type="button"
                disabled={busyId === m.id}
                onClick={() => toggle(m)}
                className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-all active:scale-[0.97] disabled:opacity-50 ${
                  m.active
                    ? "border border-ink-900/10 text-ink-900/70 hover:text-ink-900 hover:border-red-400/50 hover:bg-red-500/10"
                    : "bg-emerald-500 text-white hover:bg-emerald-400"
                }`}
              >
                {busyId === m.id ? "…" : m.active ? "Deactivate" : "Reactivate"}
              </button>
            </motion.div>
          ))}
        </div>
      
    </div>
  );
}
