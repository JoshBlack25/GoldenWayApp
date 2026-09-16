/**
 * Shared starting point for dashboard pages. Drop this in a screen file
 * and build on top of it — swap it out once the real content is ready.
 */
export default function BlankCanvas({ title, owner }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-16 min-h-[70dvh]">
      <span className="text-[11px] uppercase tracking-[0.2em] text-gold-600">
        Dashboard
      </span>
      <h1 className="font-display text-2xl font-bold text-ink-900 mt-2">
        {title}
      </h1>
      <p className="text-slate-500 text-sm mt-2">
        Blank canvas — build this screen here.
      </p>
      {owner && (
        <p className="text-[12px] text-gold-600 font-medium mt-4">
          Owner: {owner}
        </p>
      )}
    </div>
  );
}
