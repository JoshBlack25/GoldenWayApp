import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/auth";
import { useTrips } from "../../../context/trip";

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { rides, transactions, card, passExpiresOn, cardBusy } = useTrips();

  const name =
    user?.displayName || user?.email?.split("@")[0] || "Commuter";
  const firstName = user?.firstName || name.split(" ")[0];
  const surname = user?.surname || name.split(" ").slice(1).join(" ") || "";
  const lastRide = transactions.find((tx) => tx.type === "ride");
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).getFullYear()
    : new Date().getFullYear();
  const maskedId = user?.idNumber
    ? `${user.idNumber.slice(0, 6)} ${user.idNumber.slice(6, 10)} ${user.idNumber.slice(10)}`
    : "—";
  const genderLabel = user?.gender
    ? user.gender.charAt(0) + user.gender.slice(1).toLowerCase()
    : "—";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex flex-col px-5 pb-6">
      {/* Title bar */}
      <div className="flex items-center justify-between pb-4">
        <h1 className="flex items-center gap-2 font-display text-[17px] font-bold text-gold-500">
          <PersonIcon /> Profile
        </h1>
        <span className="font-display text-[15px] font-bold text-gold-500">
          GoldenWay
        </span>
      </div>

      {/* Identity header */}
      <div className="flex flex-col items-center text-center">
        <span
          className="h-20 w-20 rounded-full p-[3px] flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #ffd873, #f0b429)" }}
        >
          <span className="h-full w-full rounded-full bg-cream-200 flex items-center justify-center font-display text-2xl font-bold text-gold-700 border-2 border-white">
            {name[0]?.toUpperCase()}
          </span>
        </span>
        <h2 className="font-display text-lg font-bold text-ink-900 mt-3">
          {name}
        </h2>
        <p className="text-[12px] text-slate-500 mt-0.5">
          Gold Member since {memberSince}
        </p>
      </div>

      {/* Gold pass card */}
      <div className="mt-4 rounded-2xl px-4 py-3.5 flex items-center justify-between text-ink-900" style={{ background: "linear-gradient(135deg, #ffd873 0%, #ffc52e 45%, #f0b429 100%)", boxShadow: "var(--shadow-glow-gold)" }}>
        <div>
          <p className="text-[9px] font-bold tracking-[0.18em] text-ink-900/70">
            GOLDENWAY PASS
          </p>
          <p className="font-display text-[15px] font-bold text-ink-900 uppercase mt-0.5">
            {name}
          </p>
          <p className="text-[11px] font-semibold text-ink-900/80 mt-0.5">
            <span className="font-display text-[15px] font-bold">{rides}</span>{" "}
            journeys remaining
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <QrIcon />
          <span className="rounded-full bg-ink-900/85 px-2.5 py-0.5 text-[9px] font-bold tracking-wide text-gold-300">
            ACTIVE
          </span>
        </div>
      </div>

      {/* Personal identity */}
      <SectionTitle>PERSONAL IDENTITY</SectionTitle>
      <div className="rounded-2xl border border-ink-900/5 bg-white px-4 py-1 flex flex-col divide-y divide-ink-900/5">
        <DetailRow label="Name" value={firstName} />
        <DetailRow label="Surname" value={surname || "—"} />
        <DetailRow label="Gender" value={genderLabel} />
        <DetailRow
          label="DOB"
          value={
            user?.dateOfBirth
              ? new Date(user.dateOfBirth).toLocaleDateString("en-ZA", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"
          }
        />
        <DetailRow label="ID Number" value={maskedId} />
        <DetailRow label="Concession" value={user?.concessionType || "NONE"} />
      </div>

      {/* Contact details */}
      <SectionTitle>CONTACT DETAILS</SectionTitle>
      <div className="flex flex-col gap-2.5">
        <div className="rounded-2xl border border-ink-900/5 bg-white px-4 py-3 flex items-center gap-3">
          <span className="h-9 w-9 rounded-full bg-cream-200 flex items-center justify-center shrink-0">
            <MailIcon />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-wide text-slate-500">
              EMAIL ADDRESS
            </p>
            <p className="text-[13px] font-semibold text-ink-900 truncate">
              {user?.email || "johndoe@gmail.com"}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-ink-900/5 bg-white px-4 py-3 flex items-center gap-3">
          <span className="h-9 w-9 rounded-full bg-cream-200 flex items-center justify-center shrink-0">
            <PhoneIcon />
          </span>
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-slate-500">
              PHONE NUMBER
            </p>
            <p className="text-[13px] font-semibold text-ink-900">
              {user?.phone || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Account status */}
      <div className="mt-4 rounded-2xl border border-ink-900/5 bg-white px-4 py-3.5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-slate-500">
            ACCOUNT STATUS
          </p>
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600 mt-1">
            <CheckCircleIcon />
            {user?.concessionVerifiedAt
              ? "Fully Verified"
              : user?.concessionType && user.concessionType !== "NONE"
                ? "Verification Pending"
                : "Verified"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/profile/update")}
          className="rounded-lg bg-gold-400 px-3.5 py-2 text-[12px] font-semibold text-ink-900"
        >
          Edit Info
        </button>
      </div>

      {/* Ride history */}
      <div className="mt-4 flex items-center justify-between">
        <h3 className="font-display text-[13px] font-bold tracking-wide text-ink-900">
          RIDE HISTORY
        </h3>
        <button
          type="button"
          onClick={() => navigate("/history")}
          className="text-[11px] font-semibold text-gold-600"
        >
          VIEW ALL
        </button>
      </div>
      {lastRide && (
        <button
          type="button"
          onClick={() => navigate("/history")}
          className="mt-2.5 w-full text-left rounded-2xl border border-ink-900/5 bg-white px-4 py-3 flex items-center gap-3"
        >
          <span className="h-9 w-9 rounded-full bg-cream-200 flex items-center justify-center shrink-0">
            <BusIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-ink-900 truncate">
              {lastRide.title}
            </span>
            <span className="block text-[11px] text-slate-500 mt-0.5">
              {lastRide.meta}
            </span>
          </span>
          <span className="text-right shrink-0">
            <span className="block text-[12px] font-semibold text-red-500">
              -1 Ride
            </span>
            <span className="block text-[10px] text-slate-400">DONE</span>
          </span>
        </button>
      )}

      {/* Deactivation */}
      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-red-600">
          <AlertIcon /> ACCOUNT DEACTIVATION
        </p>
        <p className="text-[11px] text-red-500/90 leading-relaxed mt-1.5">
          Warning: By deactivating your account, you would have to contact the
          customer service unit.
        </p>
        <button
          type="button"
          className="text-[12px] font-semibold text-red-600 underline underline-offset-2 mt-2"
        >
          Proceed with Deactivation
        </button>
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 w-full rounded-xl border border-red-300 py-3.5 flex items-center justify-center gap-2 font-display font-semibold text-red-600 text-[14px]"
      >
        <LogoutIcon /> Logout
      </button>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-[10px] font-bold tracking-[0.16em] text-slate-500 mt-5 mb-2">
      {children}
    </h3>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="text-[12px] font-semibold text-ink-900 text-right">
        {value}
      </span>
    </div>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-900/80" fill="currentColor" aria-hidden="true">
      <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zM14 3h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm9-2h2v2h-2v-2zm4 0h3v2h-2v2h-2v-2h1v-2zm-4 4h2v3h-2v-3zm4 1h3v2h-3v-2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6.5 3.5c.6 0 1.1.4 1.3 1l1 2.6c.2.5 0 1.1-.3 1.5L7 10c1 2.3 2.7 4 5 5l1.4-1.5c.4-.4 1-.5 1.5-.3l2.6 1c.6.2 1 .7 1 1.3v2.2c0 1-.9 1.7-1.9 1.5C10.4 18.4 5.6 13.6 4.2 7.4 4 6.4 4.7 5.5 5.7 5.5h.8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.3 2.3L15.5 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="12" rx="2.5" />
      <path d="M4 12h16M8 17v2M16 17v2" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l10 18H2L12 3z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17.5v.01" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
