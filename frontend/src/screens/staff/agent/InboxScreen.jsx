<<<<<<< HEAD
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabaseClient";
import {
  fetchTicketQueue,
  claimTicket,
  replyTicket,
  resolveTicket,
  escalateTicket,
  fetchTicketMessages,
} from "../../../api/operations";

/**
 * AGENT — Support inbox (D4, mocks M3/M9 agent side). Queue from
 * ticket_queue(); claim → IN_PROGRESS; reply via reply_ticket (auto-
 * claims); resolve or escalate. New commuter messages arrive live via
 * the realtime channel on ticket_messages.
 */
const SNIPPETS = [
  "Thanks for reaching out! I'm checking on that for you now.",
  "There's a delay on that route — the driver reported it and we've published an alert.",
  "Your card can be registered in the app under Card → Link an existing card.",
];

export default function InboxScreen() {
  const [queue, setQueue] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const bottomRef = useRef(null);
=======
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
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

  const load = useCallback(async () => {
    try {
      const q = await fetchTicketQueue();
      setQueue(q);
<<<<<<< HEAD
      return q;
    } catch (err) {
      setError(err?.message || "Could not load the queue");
      return [];
=======
      setError("");
    } catch (err) {
      setError(err?.message || "Could not load the queue");
    } finally {
      setLoading(false);
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    }
  }, []);

  useEffect(() => {
<<<<<<< HEAD
    load().then((q) => {
      if (q.length && !activeId) setActiveId(q[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    fetchTicketMessages(activeId)
      .then((msgs) => !cancelled && setMessages(msgs))
      .catch(() => !cancelled && setMessages([]));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`inbox-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${activeId}` },
        (payload) => {
          const m = payload.new;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, {
                  id: m.id,
                  from: m.sender === "COMMUTER" ? "user" : "agent",
                  text: m.body,
                  time: new Date(m.sent_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
                }],
          );
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function act(fn, okMsg) {
    if (busy) return;
    setBusy(true);
=======
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
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    setError("");
    setMsg("");
    try {
      await fn();
      setMsg(okMsg);
      await load();
    } catch (err) {
      setError(err?.message || "Action failed");
    } finally {
<<<<<<< HEAD
      setBusy(false);
    }
  }

  async function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy || !activeId) return;
    setDraft("");
    await act(async () => {
      await replyTicket(activeId, text);
      const { data } = await supabase
        .from("ticket_messages")
        .select("id, sender, body, sent_at")
        .eq("ticket_id", activeId)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setMessages((prev) =>
          prev.some((x) => x.id === data.id)
            ? prev
            : [...prev, { id: data.id, from: "agent", text: data.body, time: new Date(data.sent_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) }],
        );
      }
    }, "Reply sent.");
  }

  const active = queue.find((t) => t.id === activeId);

  return (
    <div className="px-5 pt-2">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-900">Support inbox</h1>
            <p className="text-[13px] text-ink-900/50 mt-0.5">
              {queue.filter((t) => t.status === "OPEN").length} open · {queue.filter((t) => t.status === "IN_PROGRESS").length} in progress
            </p>
          </div>
        </header>

        {msg && <p role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-[12px] text-emerald-300">✓ {msg}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-[12px] text-red-300">{error}</p>}

        {/* Queue */}
        <div className="mt-5 flex flex-col gap-2">
          {queue.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              className={`text-left rounded-2xl border p-4 transition-all ${
                t.id === activeId
                  ? "border-gold-400/50 bg-white"
                  : "border-ink-900/10 bg-white hover:border-ink-900/20"
              }`}
=======
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
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-semibold text-ink-900/90 truncate">
                  #{t.id} · {t.subject}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                  t.status === "OPEN"
<<<<<<< HEAD
                    ? t.priority === "HIGH" ? "bg-brand-500/15 text-red-300 border-brand-400/30" : "bg-sky-500/15 text-sky-300 border-sky-400/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-400/30"
                }`}>
                  {t.status === "OPEN" ? (t.priority === "HIGH" ? "URGENT" : "OPEN") : "IN PROGRESS"}
                </span>
              </div>
              <p className="text-[11.5px] text-ink-900/45 mt-1 truncate">
                {t.commuter} · {t.messageCount} message{t.messageCount === 1 ? "" : "s"} · {t.lastMessage || "no messages yet"}
              </p>
            </button>
          ))}
          {queue.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-900/10 py-10 text-center">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-[13px] text-ink-900/50">Queue clear — every ticket is resolved.</p>
            </div>
          )}
        </div>

        {/* Thread */}
        {active && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl border border-ink-900/10 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-ink-900/90">{active.subject}</p>
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
                      onClick={() => act(() => resolveTicket(active.id), `Ticket #${active.id} resolved.`)}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-400 active:scale-[0.97] disabled:opacity-50"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(() => escalateTicket(active.id, "Escalated from inbox"), "Escalated to ADMIN.")}
                      className="rounded-lg border border-ink-900/10 px-3 py-2 text-[11px] font-semibold text-ink-900/70 hover:text-ink-900 active:scale-[0.97] disabled:opacity-50"
                    >
                      Escalate
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 max-h-72 overflow-y-auto no-scrollbar pr-1">
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
              <div ref={bottomRef} />
            </div>

            {active.status !== "RESOLVED" && (
              <>
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {SNIPPETS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDraft(s)}
                      className="rounded-full border border-ink-900/10 px-2.5 py-1 text-[10.5px] text-ink-900/55 hover:text-ink-900 hover:border-white/35 transition-colors"
                    >
                      {s.slice(0, 34)}…
                    </button>
                  ))}
                </div>
                <form onSubmit={send} className="mt-3 flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Reply to the commuter…"
                    className="flex-1 rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 placeholder:text-ink-900/30 outline-none focus:border-gold-400/60"
                  />
                  <button type="submit" disabled={busy || !draft.trim()} className="btn-gold rounded-xl px-5 text-[13px] disabled:opacity-50">
                    Send
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      
=======
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
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    </div>
  );
}
