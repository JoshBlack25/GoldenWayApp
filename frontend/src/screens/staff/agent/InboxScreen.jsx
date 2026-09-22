import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  fetchTicketQueue,
  claimTicket,
  resolveTicket,
  escalateTicket,
  setAgentOnline,
  subscribeAllTickets,
} from "../../../api/operations";

/**
 * AGENT — Inbox (the notifications/queue page). Every active ticket is
 * a card: status, priority, last message preview, who spoke last (0011
 * stamps). Tapping a card opens that conversation on the Chats tab.
 * Workflow actions stay here too — claim, resolve, escalate — so the
 * matter can be closed from the list without opening the chat. The list
 * is live: any ticket UPDATE anywhere (claim/resolve/escalate/new
 * message stamp, from any agent) refreshes it via the 0011 realtime
 * publication. The thread itself lives in ChatScreen.
 */
export default function InboxScreen() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const q = await fetchTicketQueue();
      setQueue(q);
      setError("");
    } catch (err) {
      setError(err?.message || "Could not load the queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Live queue: any ticket change (any agent, any ticket) refreshes.
    return subscribeAllTickets(() => load());
  }, [load]);

  // Agent presence heartbeat (0011): on open + once a minute while open.
  useEffect(() => {
    setAgentOnline(true).catch(() => {});
    const beat = setInterval(() => setAgentOnline(true).catch(() => {}), 60_000);
    return () => clearInterval(beat);
  }, []);

  async function act(id, fn, okMsg) {
    if (busyId) return;
    setBusyId(id);
    setError("");
    setMsg("");
    try {
      await fn();
      setMsg(okMsg);
      await load();
    } catch (err) {
      setError(err?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const openCount = queue.filter((t) => t.status === "OPEN").length;
  const progressCount = queue.filter((t) => t.status === "IN_PROGRESS").length;

  function relTime(iso) {
    if (!iso) return "";
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }

  return (
    <div className="px-5 pt-2 pb-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900">Inbox</h1>
          <p className="text-[13px] text-ink-900/50 mt-0.5">
            {openCount} open · {progressCount} in progress
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/staff/chats")}
          className="rounded-xl border border-ink-900/10 bg-white px-3 py-2 text-[11.5px] font-semibold text-ink-900/70 hover:border-gold-500/50 transition-colors active:scale-[0.98]"
        >
          Chats
        </button>
      </header>

      {msg && <p role="status" className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-2.5 text-[12px] text-emerald-700">✓ {msg}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-50 px-4 py-2.5 text-[12px] text-red-600">{error}</p>}

      {/* Ticket cards — tap to open the chat, action buttons inline */}
      <div className="mt-5 flex flex-col gap-2.5">
        {queue.map((t) => (
          <motion.div
            key={t.id}
            layout
            className="rounded-2xl border border-ink-900/10 bg-white p-4"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <button
              type="button"
              onClick={() => navigate(`/staff/chats?ticket=${t.id}`)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-semibold text-ink-900/90 truncate">
                  #{t.id} · {t.subject}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                  t.status === "OPEN"
                    ? t.priority === "HIGH"
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-cream-200 text-gold-700 border-gold-500/30"
                    : "bg-sky-50 text-sky-600 border-sky-200"
                }`}>
                  {t.status === "OPEN" ? (t.priority === "HIGH" ? "URGENT" : "NEW") : "IN PROGRESS"}
                </span>
              </div>
              <p className="text-[11.5px] text-ink-900/45 mt-1 truncate">
                {t.lastSender === "AGENT" ? "You: " : ""}
                {t.lastMessage || "no messages yet"}
              </p>
              <p className="text-[10.5px] text-ink-900/35 mt-1">
                {t.commuter} · {t.messageCount} message{t.messageCount === 1 ? "" : "s"}
                {t.lastMessageAt ? ` · ${relTime(t.lastMessageAt)}` : ""}
                {t.assignedTo ? " · claimed" : " · unclaimed"}
              </p>
            </button>

            <div className="mt-3 flex gap-2">
              {!t.assignedTo && (
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => act(t.id, () => claimTicket(t.id), `Ticket #${t.id} claimed.`)}
                  className="rounded-lg bg-gold-400 px-3 py-1.5 text-[11px] font-bold text-ink-900 hover:brightness-105 active:scale-[0.97] disabled:opacity-50"
                >
                  Claim
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/staff/chats?ticket=${t.id}`)}
                className="rounded-lg border border-ink-900/10 px-3 py-1.5 text-[11px] font-semibold text-ink-900/70 hover:border-gold-500/50 active:scale-[0.97]"
              >
                Open chat
              </button>
              {t.assignedTo && (
                <>
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => act(t.id, () => resolveTicket(t.id), `Ticket #${t.id} marked resolved.`)}
                    className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 active:scale-[0.97] disabled:opacity-50"
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => act(t.id, () => escalateTicket(t.id, "Escalated from inbox"), "Escalated to ADMIN.")}
                    className="rounded-lg border border-ink-900/10 px-3 py-1.5 text-[11px] font-semibold text-ink-900/60 hover:text-ink-900 active:scale-[0.97] disabled:opacity-50"
                  >
                    Escalate
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ))}

        {loading && queue.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-900/10 py-10 text-center">
            <p className="text-[13px] text-ink-900/40">Loading the queue…</p>
          </div>
        )}

        {!loading && queue.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-900/10 py-12 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-[13px] text-ink-900/50">Queue clear — every ticket is resolved.</p>
          </div>
        )}
      </div>
    </div>
  );
}
