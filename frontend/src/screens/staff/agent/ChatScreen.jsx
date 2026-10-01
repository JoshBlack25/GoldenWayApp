import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  fetchTicketQueue,
  claimTicket,
  resolveTicket,
  escalateTicket,
  setAgentOnline,
} from "../../../api/operations";
import useTicketChat from "../../../hooks/useTicketChat";

/**
 * AGENT — Chats (the chat log; the tab that used to be "Snippets").
 * Opened from the Inbox by tapping a ticket. One ticket is on screen at
 * a time: full-height thread, WhatsApp-style message-by-message realtime
 * via useTicketChat, and the workflow actions (claim / resolve /
 * escalate) live in the thread header so the matter can be closed
 * without leaving the conversation. `?ticket=` selects the thread; when
 * absent the first unclaimed-or-latest ticket is picked.
 */
export default function ChatScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramId = searchParams.get("ticket");

  const [queue, setQueue] = useState([]);
  const [activeId, setActiveId] = useState(paramId ? Number(paramId) : null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const bottomRef = useRef(null);

  // Chat engine: fetch + realtime message-by-message + optimistic send.
  const { messages, send: sendChat, sending } = useTicketChat({
    ticketId: activeId,
    sender: "AGENT",
  });

  const load = useCallback(async () => {
    try {
      const q = await fetchTicketQueue();
      setQueue(q);
      return q;
    } catch (err) {
      setError(err?.message || "Could not load the queue");
      return [];
    }
  }, []);

  useEffect(() => {
    load().then((q) => {
      if (!activeId && q.length) setActiveId(q[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync ?ticket= <-> activeId so Inbox navigation lands on the thread.
  useEffect(() => {
    if (paramId && Number(paramId) !== activeId) setActiveId(Number(paramId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramId]);

  // Agent presence heartbeat (0011): on open + once a minute while open.
  useEffect(() => {
    setAgentOnline(true).catch(() => {});
    const beat = setInterval(() => setAgentOnline(true).catch(() => {}), 60_000);
    return () => clearInterval(beat);
  }, []);

  function selectTicket(id) {
    setActiveId(id);
    setSearchParams({ ticket: String(id) }, { replace: true });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function act(fn, okMsg) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await fn();
      setMsg(okMsg);
      await load();
    } catch (err) {
      setError(err?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !activeId) return;
    setDraft("");
    const ok = await sendChat(text);
    if (!ok) {
      setDraft(text); // restore draft on failure
      return;
    }
    await load(); // queue preview refresh
  }

  const active = queue.find((t) => t.id === activeId);

  return (
    <div className="px-5 pt-2 flex flex-col min-h-full">
      <header className="shrink-0 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900">Chats</h1>
          <p className="text-[13px] text-ink-900/50 mt-0.5">
            {queue.length} active conversation{queue.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/staff/inbox")}
          className="rounded-xl border border-ink-900/10 bg-white px-3 py-2 text-[11.5px] font-semibold text-ink-900/70 hover:border-gold-500/50 transition-colors active:scale-[0.98]"
        >
          Inbox
        </button>
      </header>

      {msg && <p role="status" className="shrink-0 mt-3 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-2.5 text-[12px] text-emerald-700">✓ {msg}</p>}
      {error && <p role="alert" className="shrink-0 mt-3 rounded-xl border border-red-500/30 bg-red-50 px-4 py-2.5 text-[12px] text-red-600">{error}</p>}

      {/* Thread switcher — horizontal chips, one per active ticket */}
      {queue.length > 0 && (
        <div className="shrink-0 mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {queue.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTicket(t.id)}
              className={`shrink-0 max-w-[220px] rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                t.id === activeId
                  ? "bg-gold-400 border-gold-500 text-ink-900"
                  : "border-ink-900/10 bg-white text-ink-900/60 hover:border-gold-500/50"
              }`}
            >
              #{t.id} · {t.subject.slice(0, 24)}{t.subject.length > 24 ? "…" : ""}
            </button>
          ))}
        </div>
      )}

      {/* Thread */}
      {active && (
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 mb-4 flex-1 flex flex-col rounded-2xl border border-ink-900/10 bg-white p-5"
        >
          <div className="flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink-900/90 truncate">{active.subject}</p>
              <p className="text-[11.5px] text-ink-900/45 mt-0.5">
                {active.commuter} · {active.status}
                {active.assignedTo ? " · claimed" : " · unclaimed"}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {!active.assignedTo && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(() => claimTicket(active.id), `Ticket #${active.id} claimed.`)}
                  className="rounded-lg bg-gold-400 px-3 py-2 text-[11px] font-bold text-ink-900 hover:brightness-105 active:scale-[0.97] disabled:opacity-50"
                >
                  Claim
                </button>
              )}
              {active.assignedTo && active.status !== "RESOLVED" && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(() => resolveTicket(active.id), `Ticket #${active.id} marked resolved.`)}
                    className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-400 active:scale-[0.97] disabled:opacity-50"
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(() => escalateTicket(active.id, "Escalated from chats"), "Escalated to ADMIN.")}
                    className="rounded-lg border border-ink-900/10 px-3 py-2 text-[11px] font-semibold text-ink-900/70 hover:text-ink-900 active:scale-[0.97] disabled:opacity-50"
                  >
                    Escalate
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Message log — the page's body, flexes to fill */}
          <div className="mt-4 flex-1 flex flex-col gap-2.5 overflow-y-auto no-scrollbar pr-1">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col max-w-[85%] ${m.from === "agent" ? "self-end items-end" : "self-start items-start"}`}>
                <div className={`rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                  m.from === "agent" ? "bg-gold-400/90 text-ink-900 rounded-br-md" : "bg-cream-300 text-ink-900/85 rounded-bl-md border border-ink-900/10"
                }`}>
                  {m.text}
                </div>
                <span className="text-[10px] text-ink-900/30 mt-1">{m.time}</span>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-[12px] text-ink-900/35 my-auto text-center">No messages yet — say hello.</p>
            )}
            <div ref={bottomRef} />
          </div>

          {active.status !== "RESOLVED" ? (
            <form onSubmit={send} className="shrink-0 mt-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Reply to the commuter…"
                className="flex-1 rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 placeholder:text-ink-900/30 outline-none focus:border-gold-400/60"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="btn-gold rounded-xl px-5 text-[13px] disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </form>
          ) : (
            <p className="shrink-0 mt-3 rounded-xl bg-cream-200 px-4 py-2.5 text-[11.5px] text-ink-900/50 text-center">
              This ticket is resolved — the commuter can open a new one if needed.
            </p>
          )}
        </motion.div>
      )}

      {queue.length === 0 && (
        <div className="flex-1 rounded-2xl border border-dashed border-ink-900/10 py-14 text-center mb-4">
          <p className="text-2xl mb-1">🎉</p>
          <p className="text-[13px] text-ink-900/50">No active conversations.</p>
          <button
            type="button"
            onClick={() => navigate("/staff/inbox")}
            className="mt-3 text-[12px] font-semibold text-gold-700 underline underline-offset-2"
          >
            Open the inbox
          </button>
        </div>
      )}
    </div>
  );
}
