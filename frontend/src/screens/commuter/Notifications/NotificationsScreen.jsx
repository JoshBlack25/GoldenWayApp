import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
<<<<<<< HEAD
import { useNotifications } from "../../../context/NotificationProvider";
=======
import { useNotifications } from "../../../context/useNotifications";
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

/**
 * /notifications (D3, mock M2) — the real notifications list from the
 * 0007 triggers. "Mark all read" calls the mark_notifications_read RPC.
 */
const TYPE_STYLE = {
  TOPUP: { icon: "💳", ring: "border-emerald-400/30 bg-emerald-400/10" },
  JOURNEY: { icon: "🚌", ring: "border-gold-400/30 bg-gold-400/10" },
<<<<<<< HEAD
  ALERT: { icon: "⚠️", ring: "border-brand-500/30 bg-brand-500/10" },
=======
  ALERT: { icon: "⚠️", ring: "border-red-400/30 bg-red-400/10" },
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
  TICKET: { icon: "💬", ring: "border-sky-400/30 bg-sky-400/10" },
  CONCESSION: { icon: "🎓", ring: "border-violet-400/30 bg-violet-400/10" },
  CARD: { icon: "✨", ring: "border-gold-400/30 bg-gold-400/10" },
  INSPECTION: { icon: "🔍", ring: "border-sky-400/30 bg-sky-400/10" },
<<<<<<< HEAD
  STAFF_DECISION: { icon: "📋", ring: "border-white/20 bg-white/10" },
=======
  STAFF_DECISION: { icon: "📋", ring: "border-ink-900/10 bg-ink-900/5" },
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
};

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { notifications, unread, markAllRead, markRead } = useNotifications();

  useEffect(() => {
    document.title = "Notifications — GoldenWay";
  }, []);

  return (
<<<<<<< HEAD
    <div className="min-h-dvh text-white" style={{ background: "radial-gradient(90% 50% at 50% -10%, rgba(240,180,41,0.10) 0%, rgba(240,180,41,0) 60%), linear-gradient(180deg, #0b1526 0%, #0e1930 60%, #12203d 100%)" }}>
=======
    <div className="min-h-dvh bg-cream-100">
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
      <div className="mx-auto max-w-2xl px-5 py-8">
        <header className="flex items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
<<<<<<< HEAD
              className="text-[11px] tracking-[0.18em] text-white/40 hover:text-white/70 font-semibold"
            >
              ← BACK
            </button>
            <h1 className="font-display text-2xl font-bold mt-1">Notifications</h1>
            <p className="text-[13px] text-white/50 mt-0.5">
=======
              className="text-[11px] tracking-[0.18em] text-slate-400 hover:text-gold-700 font-semibold transition-colors"
            >
              ← BACK
            </button>
            <h1 className="font-display text-2xl font-bold text-ink-900 mt-1">
              Notifications
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
<<<<<<< HEAD
              className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-[12px] font-medium text-white/70 hover:text-white hover:border-gold-400/50 hover:bg-white/5 transition-colors active:scale-[0.98]"
=======
              className="shrink-0 rounded-lg border border-ink-900/10 bg-white px-3 py-2 text-[12px] font-medium text-slate-500 hover:text-ink-900 hover:border-gold-500/50 hover:bg-gold-50 transition-colors active:scale-[0.98]"
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
            >
              Mark all read
            </button>
          )}
        </header>

        <div className="mt-6 flex flex-col gap-2.5 pb-10">
          {notifications.length === 0 && (
<<<<<<< HEAD
            <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-[13px] text-white/50">
                Notifications about top-ups, journeys, delays and tickets land here.
=======
            <div className="rounded-2xl border border-dashed border-ink-900/10 bg-white/60 py-12 text-center">
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-[13px] text-slate-500">
                Notifications about top-ups, journeys, delays and tickets land
                here.
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
              </p>
            </div>
          )}

          {notifications.map((n, i) => {
            const style = TYPE_STYLE[n.type] || TYPE_STYLE.JOURNEY;
            return (
              <motion.button
                key={n.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => {
                  if (!n.readAt) markRead([n.id]);
                  if (n.linkPath) navigate(n.linkPath);
                }}
                className={`text-left rounded-2xl border p-4 flex items-start gap-3 transition-all active:scale-[0.99] ${
<<<<<<< HEAD
                  n.readAt ? "border-white/10 bg-navy-900/50" : `${style.ring} bg-navy-900/80`
                }`}
              >
                <span className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center text-[16px] ${n.readAt ? "border-white/10 bg-white/5" : style.ring}`}>
=======
                  n.readAt
                    ? "border-ink-900/10 bg-white/70"
                    : `${style.ring} bg-white shadow-sm`
                }`}
              >
                <span
                  className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center text-[16px] ${n.readAt ? "border-ink-900/10 bg-ink-900/5" : style.ring}`}
                >
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
                  {style.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
<<<<<<< HEAD
                    <span className={`text-[13.5px] font-semibold truncate ${n.readAt ? "text-white/70" : "text-white"}`}>
                      {n.title}
                    </span>
                    {!n.readAt && <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
                  </span>
                  {n.body && (
                    <span className="block text-[12px] text-white/55 mt-0.5 leading-relaxed">
                      {n.body}
                    </span>
                  )}
                  <span className="block text-[11px] text-white/35 mt-1">
                    {new Date(n.createdAt).toLocaleString("en-ZA", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
=======
                    <span
                      className={`text-[13.5px] font-semibold truncate ${n.readAt ? "text-slate-500" : "text-ink-900"}`}
                    >
                      {n.title}
                    </span>
                    {!n.readAt && (
                      <span className="h-2 w-2 rounded-full bg-gold-500 shrink-0" />
                    )}
                  </span>
                  {n.body && (
                    <span className="block text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                      {n.body}
                    </span>
                  )}
                  <span className="block text-[11px] text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
                    })}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
