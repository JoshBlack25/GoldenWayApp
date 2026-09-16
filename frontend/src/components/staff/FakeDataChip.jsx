/**
 * FakeDataChip — visible "planned feature" marker (Sprint 3 board).
 *
 * Screens backed by placeholder data render this once near the header.
 * It sets demo-day expectations honestly without breaking the premium
 * look. When a lane ships the real backend flow, delete the chip and
 * the fake seed data — the layout/route work is already done.
 *
 * Usage:  <FakeDataChip note="Real fares editor lands in Sprint 3" />
 */
export default function FakeDataChip({ note = "Sample data — real flow lands in Sprint 3" }) {
  return (
    <div
      className="mt-2 flex items-center gap-2 rounded-full border border-gold-500/30 bg-cream-100 px-3 py-1.5 self-start"
      title={note}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-gold-500" style={{ boxShadow: "var(--shadow-glow-gold)" }} />
      <span className="text-[10px] font-bold tracking-[0.12em] text-gold-700">SAMPLE DATA</span>
      <span className="text-[10.5px] text-ink-900/45 hidden sm:inline">· {note}</span>
    </div>
  );
}
