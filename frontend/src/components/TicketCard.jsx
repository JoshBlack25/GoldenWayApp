import { motion } from "framer-motion";

/**
 * The Golden Arrow transit pass, shown on the Card and Use Bus Ticket
 * screens. Purely visual — the data comes from props.
 * Deluxe edition: embossed metal-gradient finish, engraved digits, chip,
 * and a one-time sheen sweep on entry.
 */
export default function TicketCard({ last4 = "4921", expiry = "09/27" }) {
  return (
    <motion.div
      role="img"
      aria-label={`Golden Arrow Gold Card ending ${last4}, expires ${expiry}`}
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative flex aspect-[1.586/1] flex-col justify-between overflow-hidden rounded-[1.75rem] px-6 py-5 text-ink-900"
      style={{
        background:
          "linear-gradient(135deg, #ffe9ad 0%, #ffd873 22%, #ffc52e 48%, #f0b429 78%, #d9a441 100%)",
        boxShadow:
          "var(--shadow-glow-gold), 0 32px 64px -28px rgba(185, 133, 42, 0.55)",
      }}
    >
      {/* soft light blobs */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rotate-12 rounded-full bg-white/30 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-[-3rem] h-36 w-36 rounded-full bg-white/15 blur-2xl" />

      {/* guilloche-style dots (subtle security-print texture) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(36,31,16,0.9) 1px, transparent 1.2px)",
          backgroundSize: "12px 12px",
        }}
      />

      {/* one-time sheen sweep */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "450%" }}
        transition={{ duration: 1.4, delay: 0.5, ease: "easeInOut" }}
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
      <div className="relative flex items-center gap-3">
        <span
          className="h-7 w-9 rounded-md border border-ink-900/25"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.25) 45%, rgba(185,133,42,0.35))",
          }}
        />
        <p className="font-display text-[22px] font-bold tracking-[0.14em] text-ink-900/90 [text-shadow:0_1px_0_rgba(255,255,255,0.5)]">
          •••• {last4}
        </p>
      </div>

      <div className="relative flex items-end justify-between">
        <div>
          <p className="eyebrow text-ink-900/70">EXPIRY DATE</p>
          <p className="font-display text-[15px] font-bold">{expiry}</p>
        </div>
        <p className="font-display text-[10px] font-bold tracking-[0.22em] text-ink-900/65">
          EST. 1861
        </p>
      </div>
    </motion.div>
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
