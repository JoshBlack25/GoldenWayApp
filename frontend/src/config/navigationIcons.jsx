/**
 * Shared icon set for both nav bars (commuter + staff) — one stroke
 * style, 1.8 width, 24px grid. Split out of navigation.jsx so that file
 * stays component-free and fast refresh keeps working.
 */

export function HomeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 11.5L12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TicketIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.2a1.6 1.6 0 0 0 0 3.1V15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.7a1.6 1.6 0 0 0 0-3.1V9z" strokeLinejoin="round" />
      <path d="M14 7.5v9" strokeLinecap="round" strokeDasharray="1.6 2.2" />
    </svg>
  );
}

export function CardIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="6" width="18" height="12" rx="2.2" />
      <path d="M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

export function HistoryIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9.5A8 8 0 1 1 4.6 15" strokeLinecap="round" />
      <path d="M4 5v4.5h4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v4l2.8 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProfileIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ScanIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" strokeLinecap="round" />
      <path d="M8.5 12h7" strokeLinecap="round" />
    </svg>
  );
}

export function BusIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="12" rx="2.5" />
      <path d="M4 12h16M8 17v2M16 17v2" strokeLinecap="round" />
    </svg>
  );
}

export function InboxIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 13l2.5-6.5A2 2 0 0 1 7.4 5h9.2a2 2 0 0 1 1.9 1.5L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" strokeLinejoin="round" />
      <path d="M3 13h5l1.5 2.5h5L16 13h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KioskIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 11h6M9 15h3" strokeLinecap="round" />
    </svg>
  );
}

export function PeopleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c1.2-3.2 3.6-4.5 5.5-4.5s4.3 1.3 5.5 4.5" strokeLinecap="round" />
      <circle cx="16.5" cy="9.5" r="2.3" />
      <path d="M16.5 14.5c1.7 0 3.4 1.1 4.3 3.5" strokeLinecap="round" />
    </svg>
  );
}

export function CatalogIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9h16M9 9v11" strokeLinecap="round" />
    </svg>
  );
}

export function AlertIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l10 18H2L12 3z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17.5v.01" strokeLinecap="round" />
    </svg>
  );
}
