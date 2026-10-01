import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../context/auth";
import {
  fetchMyTickets,
  createTicket,
  fetchTicketMessages,
  sendCommuterMessage,
  fetchAgentsOnline,
} from "../../../api/operations";
import { supabase } from "../../../lib/supabaseClient";

/**
 * Support (D4, mocks M3 + M9) — real tickets over support_tickets /
 * ticket_messages. The commuter picks a ticket (or opens one), the
 * thread loads via RLS (they only ever see their own), and agent replies
 * arrive live through the 0009 realtime channel. "Agents online" comes
 * from the agents_online() RPC — no more fake green dot.
 */
export default function SupportScreen() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [opening, setOpening] = useState(false);
  const [agents, setAgents] = useState({ online: true, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const loadTickets = useCallback(async () => {
    try {
      const list = await fetchMyTickets();
      setTickets(list);
      return list;
    } catch (err) {
      setError(err?.message || "Could not load your tickets");
      return [];
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const list = await loadTickets();
      try {
        setAgents(await fetchAgentsOnline());
      } catch {
        /* badge only */
      }
      if (list.length > 0) setActiveTicket(list[0].id);
      setLoading(false);
    })();
  }, [user, loadTickets]);

  // Load the thread whenever the active ticket changes.
  useEffect(() => {
    if (!activeTicket) return;
    let cancelled = false;
    fetchTicketMessages(activeTicket)
      .then((msgs) => !cancelled && setMessages(msgs))
      .catch(() => !cancelled && setMessages([]));
    return () => {
      cancelled = true;
    };
  }, [activeTicket]);

  // Realtime: agent replies land live (0009 enables realtime on ticket_messages).
  useEffect(() => {
    if (!activeTicket) return;
    const channel = supabase
      .channel(`ticket-${activeTicket}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${activeTicket}` },
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
  }, [activeTicket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeTicket) return;
    setDraft("");
    try {
      await sendCommuterMessage(activeTicket, text);
      const row = await supabase
        .from("ticket_messages")
        .select("id, sender, body, sent_at")
        .eq("ticket_id", activeTicket)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (row.data) {
        setMessages((prev) =>
          prev.some((x) => x.id === row.data.id)
            ? prev
            : [...prev, {
                id: row.data.id,
                from: "user",
                text: row.data.body,
                time: new Date(row.data.sent_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
              }],
        );
      }
    } catch (err) {
      setError(err?.message || "Could not send the message");
    }
  }

  async function handleOpenTicket(e) {
    e.preventDefault();
    const subject = newSubject.trim();
    if (!subject || opening) return;
    setOpening(true);
    setError("");
    try {
      const id = await createTicket(subject, subject);
      const list = await loadTickets();
      setActiveTicket(id);
      setNewSubject("");
      setMessages([]);
      void list;
    } catch (err) {
      setError(err?.message || "Could not open the ticket");
    } finally {
      setOpening(false);
    }
  }

  const active = tickets.find((t) => t.id === activeTicket);

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-5 pb-3 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Support</h1>
          <p className="flex items-center gap-1.5 text-[12px] text-slate-500 mt-1">
            <span className={`h-1.5 w-1.5 rounded-full ${agents.online ? "bg-emerald-500" : "bg-slate-400"}`} />
            {agents.online ? `${agents.count} agent${agents.count === 1 ? "" : "s"} online` : "Agents offline — we'll reply soon"}
          </p>
        </div>
        <button
          type="button"
          className="h-11 w-11 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #ffd873, #f0b429)", boxShadow: "var(--shadow-glow-gold)", color: "var(--color-ink-900)" }}
          aria-label="Call support"
        >
          <PhoneIcon />
        </button>
      </div>

      {/* Ticket switcher */}
      <div className="px-5 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {tickets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTicket(t.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold border transition-colors ${
              t.id === activeTicket
                ? "bg-gold-400 border-gold-500 text-ink-900"
                : "bg-white border-ink-900/10 text-slate-500 hover:border-gold-500/40"
            }`}
          >
            #{t.id} · {t.status === "RESOLVED" ? "✓ " : ""}{t.subject.slice(0, 22)}{t.subject.length > 22 ? "…" : ""}
          </button>
        ))}
        {!loading && tickets.length === 0 && (
          <p className="text-[12px] text-slate-500">No tickets yet — open one below.</p>
        )}
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col gap-3 px-5 pb-4">
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] font-medium text-red-600">
            {error}
          </p>
        )}

        {active?.status === "RESOLVED" && (
          <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-[12px] font-medium text-emerald-700">
            This ticket was resolved. Open a new one if you still need help.
          </p>
        )}

        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex flex-col max-w-[80%] ${
              m.from === "user" ? "self-end items-end" : "self-start items-start"
            }`}
          >
            <div
              className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                m.from === "user" ? "text-ink-900 rounded-br-md" : "bg-cream-200 text-ink-900 rounded-bl-md"
              }`}
              style={
                m.from === "user"
                  ? { background: "linear-gradient(135deg, #ffd873 0%, #ffc52e 55%, #f0b429 100%)", boxShadow: "var(--shadow-glow-gold)" }
                  : undefined
              }
            >
              {m.text}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">{m.time}</span>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer or new-ticket form */}
      {activeTicket && active?.status !== "RESOLVED" ? (
        <form
          onSubmit={handleSend}
          className="sticky bottom-0 mt-auto flex items-center gap-2 glass px-5 py-3 border-t border-ink-900/5"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-ink-900/10 bg-white px-4 py-3 text-[13px] text-ink-900 placeholder:text-slate-400 outline-none focus:border-gold-500 transition-colors"
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.92 }}
            className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #ffd873, #f0b429)", boxShadow: "var(--shadow-glow-gold)", color: "var(--color-ink-900)" }}
            aria-label="Send message"
          >
            <SendIcon />
          </motion.button>
        </form>
      ) : (
        <form onSubmit={handleOpenTicket} className="sticky bottom-0 mt-auto glass px-5 py-3 border-t border-ink-900/5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Describe your issue to open a ticket…"
              className="flex-1 rounded-full border border-ink-900/10 bg-white px-4 py-3 text-[13px] text-ink-900 placeholder:text-slate-400 outline-none focus:border-gold-500 transition-colors"
            />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.92 }}
              disabled={opening || !newSubject.trim()}
              className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #ffd873, #f0b429)", boxShadow: "var(--shadow-glow-gold)", color: "var(--color-ink-900)" }}
              aria-label="Open ticket"
            >
              <PlusIcon />
            </motion.button>
          </div>
        </form>
      )}
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path
        d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
