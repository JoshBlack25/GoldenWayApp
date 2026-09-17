import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/auth";
import { useNotifications } from "../context/useNotifications";
import { tabsForRole, Icons } from "../config/navigation";
import StaffAvatar from "../components/staff/StaffAvatar";

/**
 * StaffLayout — the staff twin of DashboardLayout, on the SAME cream/gold
 * palette as the commuter app (wireframes: one brand, one canvas). The
 * gold pill, glass header and slide-fade transitions are shared idioms;
 * the role badge strip is the only staff-specific chrome.
 */
export default function StaffLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unread } = useNotifications() || {};
  const tabs = tabsForRole(user?.role);

  return (
    <div className="staff-shell h-dvh flex flex-col text-ink-900">
      {/* Glass header — mirrors the commuter DashboardHeader exactly */}
      <header className="shrink-0 glass flex items-center justify-between px-5 pt-4 pb-3 z-10">
        <StaffAvatar user={user} />
        <div className="flex flex-col items-center leading-none">
          <span className="font-display text-[17px] font-bold tracking-tight bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 bg-clip-text text-transparent">
            GoldenWay
          </span>
          <span className="text-[8px] tracking-[0.3em] text-ink-900/45 font-semibold mt-1">
            STAFF CONSOLE
          </span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="h-10 rounded-xl border border-ink-900/10 bg-white/80 px-3 text-[11.5px] font-semibold text-ink-700 hover:border-gold-500/50 transition-colors active:scale-[0.98]"
        >
          Sign out
        </button>
      </header>

      {/* Role context strip */}
      <div className="shrink-0 px-5 pt-3 pb-1 flex items-center gap-2">
        <span className="rounded-full border border-gold-500/40 bg-cream-100 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] text-gold-700">
          {user?.role}
        </span>
        <span className="text-[12px] text-slate-500 truncate">
          {user?.firstName} {user?.surname}
        </span>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("staff:open-notifications"))}
            className="ml-auto text-[11px] font-semibold text-gold-700 bg-cream-100 border border-gold-500/25 rounded-full px-2.5 py-0.5"
            title="Unread notifications"
          >
            🔔 {unread}
          </button>
        )}
      </div>

      {/* Page body with commuter-style transitions */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="min-h-full pb-6"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Role tab bar — gliding gold pill, same idiom as commuter BottomNav */}
      <nav
        className="shrink-0 glass px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
        style={{ boxShadow: "var(--shadow-nav)" }}
      >
        <ul className="flex items-stretch justify-between">
          {tabs.map(({ to, label, icon, end }) => {
            const Icon = Icons[icon];
            const active = end
              ? location.pathname === to
              : location.pathname.startsWith(to);
            return (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={end}
                  className="relative flex flex-col items-center gap-1 py-1.5 outline-none"
                >
                  <span className="relative h-8 w-8 flex items-center justify-center">
                    {active && (
                      <motion.span
                        layoutId="staff-nav-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: "linear-gradient(135deg, #ffd873 0%, #ffc52e 45%, #f0b429 100%)",
                          boxShadow: "var(--shadow-glow-gold)",
                        }}
                      />
                    )}
                    <motion.span
                      animate={{ scale: active ? 1.2 : 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      className="relative flex items-center justify-center"
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-ink-900" : "text-slate-400"}`} />
                    </motion.span>
                  </span>
                  <span
                    className={`text-[10.5px] leading-none transition-colors ${
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
    </div>
  );
}
