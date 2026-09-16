/**
 * The Golden Arrow transit pass, shown on the Card and Use Bus Ticket
 * screens. Purely visual — the data comes from props.
 * Deluxe edition: embossed metal-gradient finish, engraved digits, chip.
 */
export default function TicketCard({ last4 = "4921", expiry = "09/27" }) {
  return (
    <div
      className="relative overflow-hidden rounded-[1.75rem] px-6 py-6 text-ink-900"
      style={{
        background:
          "linear-gradient(135deg, #ffe9ad 0%, #ffd873 22%, #ffc52e 48%, #f0b429 78%, #d9a441 100%)",
        boxShadow: "var(--shadow-glow-gold), 0 32px 64px -28px rgba(185, 133, 42, 0.55)",
      }}
    >
      {/* diagonal sheen band */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rotate-12 rounded-full bg-white/30 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-[-3rem] h-36 w-36 rounded-full bg-white/15 blur-2xl" />
      {/* guilloche-style dots (subtle security-print texture) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(rgba(36,31,16,0.9) 1px, transparent 1.2px)",
          backgroundSize: "12px 12px",
        }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-display text-[17px] font-bold tracking-wide">
            GOLDEN ARROW
          </p>
          <p className="eyebrow text-ink-900/70 mt-0.5">PREMIUM COMMUTER</p>
        </div>
        <ContactlessIcon />
      </div>

      {/* chip + engraved number */}
      <div className="relative mt-5 flex items-center gap-3">
        <span
          className="h-7 w-9 rounded-md border border-ink-900/25"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.25) 45%, rgba(185,133,42,0.35))",
          }}
        />
        <p className="font-display text-[22px] font-bold tracking-[0.14em] text-ink-900/90 [text-shadow:0_1px_0_rgba(255,255,255,0.5)]">
          **** {last4}
        </p>
      </div>

      <div className="relative mt-3 flex items-end justify-between">
        <div>
          <p className="eyebrow text-ink-900/60">EXPIRY DATE</p>
          <p className="font-display text-[15px] font-bold">{expiry}</p>
        </div>
        <p className="font-display text-[10px] font-bold tracking-[0.22em] text-ink-900/55">
          EST. 1861
        </p>
      </div>
    </div>
  );
}

function ContactlessIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7 text-ink-900"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" strokeOpacity="0.35" />
      <path
        d="M9 9.5c1.6 1.4 1.6 3.6 0 5M12 7.5c2.7 2.4 2.7 6.6 0 9M15 6c3.6 3.2 3.6 8.8 0 12"
        strokeLinecap="round"
      />
    </svg>
  );
}
