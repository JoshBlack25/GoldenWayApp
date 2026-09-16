/**
 * Staff avatar — gold gradient ring + initials on cream, mirroring the
 * commuter header's avatar (one brand, one canvas).
 */
export default function StaffAvatar({ user }) {
  const initial = (user?.firstName || "S")[0].toUpperCase();
  return (
    <div
      className="h-10 w-10 rounded-full p-[2px] shrink-0"
      style={{ background: "linear-gradient(135deg, #ffd873, #f0b429)" }}
      title={`${user?.firstName || ""} ${user?.surname || ""} · ${user?.role || ""}`}
    >
      <span className="h-full w-full rounded-full overflow-hidden flex items-center justify-center bg-cream-200 font-display text-[13px] font-bold text-gold-700 border-2 border-white">
        {initial}
      </span>
    </div>
  );
}
