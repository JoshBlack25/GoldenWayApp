import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchRoutesFromDb, fetchProductsForRouteFromDb } from "../../../api/goldenway";
import {
  recordCashSale,
  clerkIssueCard,
  clerkReplaceLostCard,
  fetchMyKioskSalesToday,
} from "../../../api/operations";

/**
 * CLERK — Kiosk (0008 RPCs, Sprint 2 lane of Joshua Black).
 * Three real transactions: cash product load (BR-09 price authority lives
 * in the RPC), new card issue against a 13-digit SA ID (R40 fee), and
 * lost-card replacement (R40, fresh card — journeys do NOT carry over).
 * Every success renders a printable receipt (K4); the replace action is
 * guarded by a confirm dialog (K5) because it retires the old card.
 */
const TABS = [
  { id: "LOAD", label: "Cash load" },
  { id: "ISSUE", label: "Issue card" },
  { id: "REPLACE", label: "Lost card" },
];

export default function KioskScreen() {
  const [tab, setTab] = useState("LOAD");
  const [routes, setRoutes] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesToday, setSalesToday] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  // load form
  const [cardNumber, setCardNumber] = useState("");
  const [routeCode, setRouteCode] = useState("");
  const [productCode, setProductCode] = useState("");

  // issue form
  const [idNumber, setIdNumber] = useState("");
  const [issueRoute, setIssueRoute] = useState("");
  const [issueProduct, setIssueProduct] = useState("");

  // replace form
  const [oldCard, setOldCard] = useState("");

  useEffect(() => {
    fetchRoutesFromDb()
      .then((r) => {
        setRoutes(r);
        if (r.length) setRouteCode(r[0].code);
      })
      .catch(() => {});
    fetchMyKioskSalesToday().then(setSalesToday).catch(() => {});
  }, []);

  useEffect(() => {
    if (!routeCode) return;
    fetchProductsForRouteFromDb(routeCode)
      .then((p) => {
        setProducts(p);
        setProductCode(p[0]?.code || "");
      })
      .catch(() => setProducts([]));
  }, [routeCode]);

  useEffect(() => {
    if (!issueRoute) return;
    fetchProductsForRouteFromDb(issueRoute)
      .then((p) => setIssueProduct(p[0]?.code || ""))
      .catch(() => {});
  }, [issueRoute]);

  async function run(fn) {
    if (busy) return;
    setBusy(true);
    setError("");
    setReceipt(null);
    setConfirmReplace(false);
    try {
      const result = await fn();
      setReceipt(result);
      fetchMyKioskSalesToday().then(setSalesToday).catch(() => {});
    } catch (err) {
      setError(err?.message || "Transaction failed");
    } finally {
      setBusy(false);
    }
  }

  const selected = products.find((p) => p.code === productCode);

  return (
    <div className="px-5 pt-2">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900">Kiosk</h1>
          <p className="text-[13px] text-ink-900/50 mt-0.5">Cards, cash loads and replacements — all real transactions.</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-gold-400/40 bg-white px-4 py-2.5 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="font-display text-xl font-bold text-gold-600">{salesToday}</p>
          <p className="eyebrow text-ink-900/40">TODAY</p>
        </div>
      </header>

      <div className="mt-5 flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setReceipt(null);
              setError("");
              setConfirmReplace(false);
            }}
            className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-colors ${
              tab === t.id
                ? "bg-gradient-to-r from-gold-400 to-gold-500 text-ink-900 shadow-[0_8px_18px_-8px_rgba(240,180,41,0.8)]"
                : "border border-ink-900/10 text-ink-900/50 hover:text-ink-900/85"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-500/25 bg-red-100 px-4 py-2.5 text-[12.5px] text-red-700">
          {error}
        </p>
      )}
      {receipt && <Receipt receipt={receipt} />}

      {tab === "LOAD" && (
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => recordCashSale(cardNumber, productCode, routeCode));
          }}
          className="mt-4 rounded-2xl border border-ink-900/10 bg-white p-5 flex flex-col gap-3"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <L label="Card number">
            <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value.toUpperCase())} placeholder="GW-XXXX-XXXX" className={inputCls} />
          </L>
          <L label="Route">
            <select value={routeCode} onChange={(e) => setRouteCode(e.target.value)} className={inputCls}>
              {routes.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} — {r.origin} → {r.destination}
                </option>
              ))}
            </select>
          </L>
          <L label="Product">
            <select value={productCode} onChange={(e) => setProductCode(e.target.value)} className={inputCls}>
              {products.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} · {p.journeys} journeys
                </option>
              ))}
            </select>
          </L>
          {selected && (
            <div className="flex items-center justify-between rounded-xl bg-cream-200 border border-gold-400/30 px-4 py-3">
              <span className="text-[12px] text-ink-900/55">Price (regulated fare table)</span>
              <span className="font-display text-[17px] font-bold text-gold-600">R{(selected.priceCents / 100).toFixed(2)}</span>
            </div>
          )}
          <button type="submit" disabled={busy || !cardNumber || !productCode} className="btn-gold w-full py-3.5 text-[14px] disabled:opacity-50">
            {busy ? "Processing…" : "Record CASH sale"}
          </button>
        </motion.form>
      )}

      {tab === "ISSUE" && (
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => clerkIssueCard(idNumber, issueProduct ? issueRoute : null, issueProduct || null));
          }}
          className="mt-4 rounded-2xl border border-ink-900/10 bg-white p-5 flex flex-col gap-3"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <L label="Commuter's 13-digit SA ID">
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 13))}
              placeholder="9005155001084"
              inputMode="numeric"
              className={`${inputCls} font-mono tracking-wider`}
            />
          </L>
          <L label="Optional: load a product in the same visit">
            <div className="flex gap-2">
              <select value={issueRoute} onChange={(e) => setIssueRoute(e.target.value)} className={inputCls}>
                <option value="">No product</option>
                {routes.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.code}
                  </option>
                ))}
              </select>
              {issueRoute && (
                <select value={issueProduct} onChange={(e) => setIssueProduct(e.target.value)} className={inputCls}>
                  {products.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </L>
          <p className="text-[11.5px] text-ink-900/45">R40 card fee is recorded automatically as a CASH sale with its own receipt.</p>
          <button type="submit" disabled={busy || idNumber.length !== 13} className="btn-gold w-full py-3.5 text-[14px] disabled:opacity-50">
            {busy ? "Issuing…" : "Issue Gold Card (R40)"}
          </button>
        </motion.form>
      )}

      {tab === "REPLACE" && (
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmReplace(true);
          }}
          className="mt-4 rounded-2xl border border-ink-900/10 bg-white p-5 flex flex-col gap-3"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <L label="Lost card number">
            <input value={oldCard} onChange={(e) => setOldCard(e.target.value.toUpperCase())} placeholder="GW-XXXX-XXXX" className={inputCls} />
          </L>
          <p className="text-[11.5px] text-ink-900/45">
            The old card is retired permanently and a fresh card is issued for the same owner (R40 replacement fee).
            Remaining journeys do <strong>not</strong> carry over.
          </p>
          <button type="submit" disabled={busy || !oldCard} className="btn-gold w-full py-3.5 text-[14px] disabled:opacity-50">
            {busy ? "Replacing…" : "Replace lost card"}
          </button>
        </motion.form>
      )}

      {/* K5 — confirm dialog: replacement is irreversible */}
      {confirmReplace && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 px-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmReplace(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl border border-ink-900/10 bg-white p-6"
            style={{ boxShadow: "var(--shadow-card-lg)" }}
          >
            <p className="text-2xl">⚠️</p>
            <h3 className="mt-2 font-display text-[16px] font-bold text-ink-900">Replace card {oldCard}?</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-900/60">
              This marks the old card <strong>LOST</strong> forever, issues a new number, and charges the R40 fee.
              Un-used journeys on the lost card are not transferred.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmReplace(false)}
                className="flex-1 rounded-xl border border-ink-900/15 py-2.5 text-[12.5px] font-semibold text-ink-900/70 hover:bg-cream-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => run(() => clerkReplaceLostCard(oldCard))}
                disabled={busy}
                className="flex-1 rounded-xl bg-ink-900 py-2.5 text-[12.5px] font-bold text-cream-50 disabled:opacity-50"
              >
                {busy ? "Replacing…" : "Confirm replacement"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13.5px] text-ink-900 placeholder:text-ink-900/30 outline-none focus:border-gold-500/60 focus:ring-2 focus:ring-gold-400/25";

function L({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow text-ink-900/45">{label}</span>
      {children}
    </label>
  );
}

function Receipt({ receipt }) {
  const LABELS = {
    id: "Order",
    cardNumber: "Card",
    card_number: "Card",
    productCode: "Product",
    product_code: "Product",
    routeCode: "Route",
    route_code: "Route",
    amountCents: "Amount",
    amount_cents: "Amount",
    status: "Status",
    receiptReference: "Receipt",
    receipt_reference: "Receipt",
    newCardNumber: "New card",
    oldCardNumber: "Old card",
    replacementFeeReceipt: "Fee receipt",
    feeReceiptReference: "Fee receipt",
    issuedCardNumber: "New card",
    productId: "Product",
  };
  const fmt = (k, v) => {
    if (/cents/i.test(k)) return `R${(Number(v) / 100).toFixed(2)}`;
    if (/^\d{4}-\d{2}-\d{2}T/.test(String(v))) {
      return new Date(v).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    }
    return String(v);
  };
  const rows = Object.entries(receipt || {})
    .filter(([, v]) => v !== null && v !== undefined)
    .filter(([k]) => LABELS[k] !== undefined);
  const fallback = rows.length === 0 ? Object.entries(receipt || {}) : rows;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-100 p-5"
      id="kiosk-receipt"
    >
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold tracking-wide text-emerald-700">✓ TRANSACTION COMPLETE</p>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-emerald-600/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-200/60"
        >
          🖨 Print
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {fallback.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-[12.5px]">
            <span className="text-ink-900/50">{LABELS[k] || k.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
            <span className="font-mono font-semibold text-ink-900">{fmt(k, v)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
