import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchTicketMessages,
  mapTicketMessage,
  sendCommuterMessage,
  replyTicket,
  subscribeTicketMessages,
} from "../api/operations";

/**
 * useTicketChat — the single chat engine for agent ↔ commuter threads.
 * Both current screens (SupportScreen, agent InboxScreen) run on this,
 * so the view layer can be replaced without touching chat behavior.
 *
 * Delivers message-by-message (WhatsApp-style): every INSERT on the
 * thread — the other side's messages *and* your own echo — lands in
 * `messages` live. Your own echo is deduped against the RPC's returned
 * row, so optimistic sending stays correct.
 *
 * Contract (all a UI needs):
 *   { messages, send, sending, loading, error } — messages are
 *   mapTicketMessage() shapes ({ id, from: 'user'|'agent', text, time }).
 */
export default function useTicketChat({ ticketId, sender }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(Boolean(ticketId));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  // The row the last send returned; its realtime echo is skipped.
  const lastSentIdRef = useRef(null);

  const upsert = useCallback((m) => {
    setMessages((prev) =>
      prev.some((x) => x.id === m.id)
        ? prev
        : [...prev, m].sort((a, b) =>
            a.sentAt === b.sentAt ? a.id - b.id : new Date(a.sentAt) - new Date(b.sentAt),
          ),
    );
  }, []);

  // Initial thread load, refetched whenever the ticket changes.
  useEffect(() => {
    if (!ticketId) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchTicketMessages(ticketId)
      .then((msgs) => {
        if (!cancelled) setMessages(msgs);
      })
      .catch((err) => {
        if (!cancelled) {
          setMessages([]);
          setError(err?.message || "Could not load the conversation");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  // Live INSERTs — message-by-message delivery (0011 realtime).
  useEffect(() => {
    if (!ticketId) return undefined;
    return subscribeTicketMessages(ticketId, (m) => {
      if (m.id === lastSentIdRef.current) {
        lastSentIdRef.current = null; // own echo — already optimistically added
        return;
      }
      upsert(m);
    });
  }, [ticketId, upsert]);

  /**
   * Optimistic send: the caller's draft clears instantly; the message
   * appears the moment the RPC returns. On failure the error is set and
   * `send` returns false so the caller can restore the draft.
   */
  const send = useCallback(
    async (text) => {
      const body = (text || "").trim();
      if (!body || !ticketId || sending) return false;
      setSending(true);
      setError("");
      try {
        const row =
          sender === "AGENT"
            ? await replyTicket(ticketId, body)
            : await sendCommuterMessage(ticketId, body);
        const m = mapTicketMessage(row);
        lastSentIdRef.current = m.id;
        upsert(m);
        return true;
      } catch (err) {
        setError(err?.message || "Could not send the message");
        return false;
      } finally {
        setSending(false);
      }
    },
    [ticketId, sender, sending, upsert],
  );

  return { messages, send, sending, loading, error };
}
