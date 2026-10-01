import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const TABS = [
  { to: "/home", label: "Home", Icon: HomeIcon },
  { to: "/load-trips", label: "Load Trips", Icon: TicketIcon },
  { to: "/card", label: "Card", Icon: CardIcon },
  { to: "/history", label: "History", Icon: HistoryIcon },
  { to: "/profile", label: "Profile", Icon: ProfileIcon },
];

/**
 * Bottom tab bar shared by every dashboard screen. The active tab's
 * gold pill uses a shared layoutId so it glides smoothly to the new
 * position instead of just popping into place.
 */
export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="shrink-0 glass px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2" style={{ boxShadow: "var(--shadow-nav)" }}>
      <ul className="flex items-stretch justify-between">
        {TABS.map(({ to, label, Icon }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className="relative flex flex-col items-center gap-1 py-1.5 outline-none"
              >
                <span className="relative h-9 w-9 flex items-center justify-center">
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                      className="absolute inset-0 rounded-full"
                      style={{ background: "linear-gradient(135deg, #ffd873 0%, #ffc52e 45%, #f0b429 100%)", boxShadow: "var(--shadow-glow-gold)" }}
                    />
                  )}
                  <motion.span
                    animate={{ scale: active ? 1.25 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    className="relative flex items-center justify-center"
                  >
                    <Icon
                      className={`h-4.5 w-4.5 ${
                        active ? "text-ink-900" : "text-slate-400"
                      }`}
                    />
                  </motion.span>
                </span>
                <span
                  className={`text-[11px] leading-none transition-colors ${
                    active ? "font-semibold text-gold-700" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* --- inline icons --- */

function HomeIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M4 11.5L12 4l8 7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TicketIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.2a1.6 1.6 0 0 0 0 3.1V15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.7a1.6 1.6 0 0 0 0-3.1V9z"
        strokeLinejoin="round"
      />
      <path d="M14 7.5v9" strokeLinecap="round" strokeDasharray="1.6 2.2" />
    </svg>
  );
}

function CardIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="6" width="18" height="12" rx="2.2" />
      <path d="M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 9.5A8 8 0 1 1 4.6 15" strokeLinecap="round" />
      <path d="M4 5v4.5h4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v4l2.8 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProfileIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path
        d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
