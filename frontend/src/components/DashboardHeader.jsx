import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
<<<<<<< HEAD
import { useNotifications } from "../context/NotificationProvider";
=======
import { useNotifications } from "../context/useNotifications";
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

/**
 * Top bar shown on every dashboard screen — avatar left, wordmark, and a
 * notification bell right, per the approved wireframes. Deluxe edition:
 * frosted glass, gold-ringed avatar, GABS-red live dot, notified bell.
 */
export default function DashboardHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unread } = useNotifications() || {};

  return (
<<<<<<< HEAD
    <div className="shrink-0 glass flex items-center justify-between px-5 pt-5 pb-3 z-10">
      <button
        type="button"
        onClick={() => navigate("/profile")}
        className="h-10 w-10 rounded-full p-[2px] shrink-0 transition-transform active:scale-95"
=======
    <div className="shrink-0 glass flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 z-10">
      <button
        type="button"
        onClick={() => navigate("/profile")}
        className="h-11 w-11 rounded-full p-[2px] shrink-0 transition-transform active:scale-95"
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
        style={{ background: "linear-gradient(135deg, #ffd873, #f0b429)" }}
        aria-label="Open profile"
      >
        <span className="h-full w-full rounded-full overflow-hidden flex items-center justify-center bg-cream-200 font-display text-[13px] font-bold text-gold-700 border-2 border-white">
          {(user?.displayName || user?.firstName || "G")[0].toUpperCase()}
        </span>
      </button>

      <Link
        to="/home"
        className="font-display text-[17px] font-bold tracking-tight flex flex-col items-center leading-none"
      >
<<<<<<< HEAD
        <span className="bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 bg-clip-text text-transparent">
          GoldenWay
        </span>
        <span className="text-[8px] tracking-[0.3em] text-ink-900/45 font-semibold mt-1">
=======
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #8a6112 0%, #c58f1a 50%, #8a6112 100%)",
          }}
        >
          GoldenWay
        </span>
        <span className="text-[9px] tracking-[0.3em] text-ink-900/60 font-semibold mt-1">
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
          THE BUS FOR US
        </span>
      </Link>

      <button
        type="button"
        onClick={() => navigate("/notifications")}
<<<<<<< HEAD
        className="relative h-10 w-10 rounded-full glass border border-ink-900/5 flex items-center justify-center shrink-0 text-ink-900/75 transition-colors hover:text-ink-900 active:scale-95"
        aria-label="Notifications"
=======
        className="relative h-11 w-11 rounded-full glass border border-ink-900/5 flex items-center justify-center shrink-0 text-ink-900/75 transition-colors hover:text-ink-900 active:scale-95"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-cream-50">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" strokeLinecap="round" />
    </svg>
  );
}
