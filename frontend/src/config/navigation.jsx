/**
 * Navigation config — the single source of truth for both surfaces.
 *
 * The COMMUTER app and the STAFF console each have their own tab bar,
 * but they share the same icon set and the same "Home first, Profile
 * last" skeleton — so a user switching between the two surfaces always
 * knows where they are. Role pages live in the role's own folder
 * (screens/staff/<role>/), which is also each team lane's workspace
 * (SPRINT2-STAFF-UI-PLAN.md §2).
 *
 * Adding a page = add an entry here + a Route in App.jsx. The nav bars
 * (BottomNav for commuters, StaffLayout's tab bar for staff) render
 * straight from these tables.
 */

import {
  HomeIcon,
  TicketIcon,
  CardIcon,
  HistoryIcon,
  ProfileIcon,
  ScanIcon,
  BusIcon,
  InboxIcon,
  ChatIcon,
  KioskIcon,
  PeopleIcon,
  CatalogIcon,
  AlertIcon,
} from "./navigationIcons";

// --- shared icon set (identical glyphs across both surfaces) ----------
export const Icons = {
  home: HomeIcon,
  ticket: TicketIcon,
  card: CardIcon,
  history: HistoryIcon,
  profile: ProfileIcon,
  verify: ScanIcon,
  bus: BusIcon,
  inbox: InboxIcon,
  chat: ChatIcon,
  kiosk: KioskIcon,
  people: PeopleIcon,
  catalog: CatalogIcon,
  alert: AlertIcon,
};

// --- COMMUTER tabs (BottomNav) ----------------------------------------
export const COMMUTER_TABS = [
  { to: "/home", label: "Home", icon: "home" },
  { to: "/load-trips", label: "Load Trips", icon: "ticket" },
  { to: "/card", label: "Card", icon: "card" },
  { to: "/history", label: "History", icon: "history" },
  { to: "/profile", label: "Profile", icon: "profile" },
];

// --- STAFF tabs per role (StaffLayout tab bar) -------------------------
// Shared skeleton: Home first, Profile-ish last; middle = the role's tools.
export const STAFF_TABS = {
  ADMIN: [
    { to: "/staff", label: "Home", icon: "home", end: true },
    { to: "/staff/onboarding", label: "Onboarding", icon: "people" },
    { to: "/staff/catalog", label: "Catalog", icon: "catalog" },
    { to: "/staff/alerts", label: "Alerts", icon: "alert" },
    { to: "/staff/team", label: "Team", icon: "profile" },
  ],
  CLERK: [
    { to: "/staff", label: "Home", icon: "home", end: true },
    { to: "/staff/kiosk", label: "Kiosk", icon: "kiosk" },
    { to: "/staff/concessions", label: "Verify", icon: "verify" }, // Joshua Black S2-K3
    { to: "/staff/profile", label: "Profile", icon: "profile" },
  ],
  INSPECTOR: [
    { to: "/staff", label: "Home", icon: "home", end: true },
    { to: "/staff/verify", label: "Verify", icon: "verify" },
    { to: "/staff/inspections", label: "History", icon: "history" }, // lane: inspection history view
    { to: "/staff/profile", label: "Profile", icon: "profile" },
  ],
  DRIVER: [
    { to: "/staff", label: "Home", icon: "home", end: true },
    { to: "/staff/runs", label: "My Runs", icon: "bus" },
    { to: "/staff/timetable", label: "Timetable", icon: "ticket" }, // lane: route reference (Aidan)
    { to: "/staff/profile", label: "Profile", icon: "profile" },
  ],
  AGENT: [
    { to: "/staff", label: "Home", icon: "home", end: true },
    { to: "/staff/inbox", label: "Inbox", icon: "inbox" },
    { to: "/staff/chats", label: "Chats", icon: "chat" }, // live chat log (was "Snippets" placeholder)
    { to: "/staff/profile", label: "Profile", icon: "profile" },
  ],
};

export function tabsForRole(role) {
  return STAFF_TABS[role] || STAFF_TABS.AGENT;
}

