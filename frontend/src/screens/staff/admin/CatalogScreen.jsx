import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  fetchRoutes,
  fetchFareProducts,
  setFareProductActive,
  fetchRouteFareTable,
  setRouteFarePrice,
  endRouteFarePrice,
} from "../../../api/catalog";
import { ApiError } from "../../../api/client";

/**
 * ADMIN — Catalog & fares (S2-D4). Edits the tables
 * fares_products_for_route() reads (0004), so a price set here is the
 * price the commuter app charges on the next load — this screen IS the
 * price authority's control panel, not a preview of it.
 */

const FAMILY_LABEL = {
  GO_EASY: "Go Easy",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  FLEXI_ZONE: "Flexi Zone",
};

function rand(cents) {
  return `R${(cents / 100).toFixed(2)}`;
}

export default function CatalogScreen() {
  const [routes, setRoutes] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState("");
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [busyCode, setBusyCode] = useState(null);
  const [message, setMessage] = useState(null); // {kind, text}
  const [priceModal, setPriceModal] = useState(null); // { productCode, entry? }

  const loadBase = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([fetchRoutes(), fetchFareProducts()]);
      setRoutes(r);
      setProducts(p);
      setSelectedRoute((cur) => cur || r.find((x) => x.active)?.code || r[0]?.code || "");
    } catch (err) {
      setMessage({ kind: "err", text: err?.message || "Could not load the catalogue" });
    }
  }, []);

  const loadEntries = useCallback(async (routeCode) => {
    if (!routeCode) return;
    setLoadingEntries(true);
    try {
      setEntries(await fetchRouteFareTable(routeCode));
    } catch (err) {
      setMessage({ kind: "err", text: err?.message || "Could not load fares for that route" });
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    loadEntries(selectedRoute);
  }, [selectedRoute, loadEntries]);

  async function toggleProduct(product) {
    if (busyCode) return;
    setBusyCode(product.code);
    setMessage(null);
    try {
      await setFareProductActive(product.code, !product.active);
      setProducts((rows) =>
        rows.map((r) => (r.code === product.code ? { ...r, active: !product.active } : r)),
      );
      setMessage({
        kind: "ok",
        text: `${product.code} ${product.active ? "deactivated" : "activated"} — this applies network-wide.`,
      });
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof ApiError ? err.message : "Could not update the product" });
    } finally {
      setBusyCode(null);
    }
  }

  async function endPrice(entry) {
    if (busyCode) return;
    setBusyCode(entry.productCode);
    setMessage(null);
    try {
      await endRouteFarePrice(entry.id);
      setMessage({ kind: "ok", text: `${entry.productCode} removed from sale on ${selectedRoute}.` });
      await loadEntries(selectedRoute);
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof ApiError ? err.message : "Could not end that price" });
    } finally {
      setBusyCode(null);
    }
  }

  const unpricedProducts = useMemo(
    () => products.filter((p) => p.active && !entries.some((e) => e.productCode === p.code)),
    [products, entries],
  );

  const selectedRouteMeta = routes.find((r) => r.code === selectedRoute);

  return (
    <div className="px-5 pt-2 pb-8">
      <div className="mx-auto max-w-3xl">
        <header>
          <h1 className="font-display text-xl font-bold text-ink-900">Catalog &amp; fares</h1>
          <p className="text-[13px] text-ink-900/50 mt-1">
            Manage fare products and what each route charges. Changes apply to the live app immediately.
          </p>
        </header>

        {message && (
          <div
            role="status"
            className={`mt-4 rounded-xl px-4 py-3 text-[12px] font-medium ${
              message.kind === "ok"
                ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border border-red-400/30 bg-red-400/10 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ---------------------------------------------------------- */}
        {/* Fare products — network-wide catalogue                     */}
        {/* ---------------------------------------------------------- */}
        <section className="mt-6">
          <p className="eyebrow text-gold-600">FARE PRODUCTS</p>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
            {products.map((p) => (
              <div
                key={p.code}
                className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${
                  p.active ? "border-ink-900/10 bg-white" : "border-ink-900/5 bg-cream-200 opacity-75"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink-900/90 truncate">
                    {p.code}
                    <span className="ml-2 text-[10.5px] font-bold tracking-wider text-gold-700">
                      {FAMILY_LABEL[p.family] || p.family}
                    </span>
                  </p>
                  <p className="text-[11.5px] text-ink-900/45 mt-0.5">
                    {p.journeys} journey{p.journeys === 1 ? "" : "s"} · {p.validDays ?? p.valid_days} days
                    {p.transfersAllowed ?? p.transfers_allowed ? ` · ${p.transfersAllowed ?? p.transfers_allowed} transfer(s)` : ""}
                  </p>
                  {!p.active && <p className="text-[10.5px] text-red-300/80 mt-0.5">Inactive — hidden from every route</p>}
                </div>
                <button
                  type="button"
                  disabled={busyCode === p.code}
                  onClick={() => toggleProduct(p)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-all active:scale-[0.97] disabled:opacity-50 ${
                    p.active
                      ? "border border-ink-900/10 text-ink-900/70 hover:text-ink-900 hover:border-red-400/50 hover:bg-red-500/10"
                      : "bg-emerald-500 text-white hover:bg-emerald-400"
                  }`}
                >
                  {busyCode === p.code ? "…" : p.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Route pricing                                               */}
        {/* ---------------------------------------------------------- */}
        <section className="mt-8">
          <p className="eyebrow text-gold-600">ROUTE PRICING</p>

          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="mt-2 w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 outline-none focus:border-gold-400/60"
          >
            {routes.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code} — {r.name} {r.active ? "" : "(inactive)"}
              </option>
            ))}
          </select>

          {selectedRouteMeta && (
            <p className="mt-2 text-[11.5px] text-ink-900/45">
              {selectedRouteMeta.origin} → {selectedRouteMeta.destination}
              {selectedRouteMeta.go_easy_eligible ? " · Go Easy eligible" : ""}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2.5">
            {loadingEntries && <p className="text-[13px] text-ink-900/40 py-6 text-center">Loading fares…</p>}

            {!loadingEntries && entries.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink-900/10 py-8 text-center">
                <p className="text-[13px] text-ink-900/50">No priced products on this route yet.</p>
              </div>
            )}

            {!loadingEntries &&
              entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-ink-900/10 bg-white p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink-900/90 truncate">
                      {entry.productCode}
                      {!entry.productActive && (
                        <span className="ml-2 text-[10px] font-bold text-red-400">PRODUCT INACTIVE</span>
                      )}
                    </p>
                    <p className="font-display text-[19px] font-bold text-ink-900 mt-0.5">{rand(entry.priceCents)}</p>
                    <p className="text-[11px] text-ink-900/40 mt-0.5">
                      Live since {new Date(entry.effectiveFrom).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPriceModal({ productCode: entry.productCode, entry })}
                      className="rounded-lg border border-ink-900/10 px-3 py-2 text-[11px] font-semibold text-ink-900/70 hover:text-ink-900 hover:border-gold-400/50"
                    >
                      Edit price
                    </button>
                    <button
                      type="button"
                      disabled={busyCode === entry.productCode}
                      onClick={() => endPrice(entry)}
                      className="rounded-lg border border-ink-900/10 px-3 py-2 text-[11px] font-semibold text-ink-900/70 hover:text-red-400 hover:border-red-400/50 disabled:opacity-50"
                    >
                      End
                    </button>
                  </div>
                </motion.div>
              ))}
          </div>

          {unpricedProducts.length > 0 && (
            <div className="mt-4">
              <p className="text-[11.5px] text-ink-900/45 mb-2">Not yet priced on this route:</p>
              <div className="flex flex-wrap gap-2">
                {unpricedProducts.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setPriceModal({ productCode: p.code })}
                    className="btn-gold px-3.5 py-2 text-[11.5px] rounded-lg"
                  >
                    + Price {p.code}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <PriceModal
        open={!!priceModal}
        productCode={priceModal?.productCode}
        entry={priceModal?.entry}
        routeCode={selectedRoute}
        onClose={() => setPriceModal(null)}
        onSaved={(msg) => {
          setPriceModal(null);
          setMessage({ kind: "ok", text: msg });
          loadEntries(selectedRoute);
        }}
      />
    </div>
  );
}

function PriceModal({ open, productCode, entry, routeCode, onClose, onSaved }) {
  const [rands, setRands] = useState(entry ? (entry.priceCents / 100).toFixed(2) : "");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setRands(entry ? (entry.priceCents / 100).toFixed(2) : "");
      setEffectiveFrom(new Date().toISOString().slice(0, 10));
      setError("");
    }
  }, [open, entry]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    setError("");
    const value = Number(rands);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a price greater than R0.00.");
      return;
    }
    setSaving(true);
    try {
      await setRouteFarePrice({
        routeCode,
        productCode,
        priceCents: Math.round(value * 100),
        effectiveFrom,
      });
      onSaved(`${productCode} on ${routeCode} is now ${rand(Math.round(value * 100))}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the price");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" role="dialog" aria-modal="true">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-ink-900/10 bg-white p-6"
      >
        <h2 className="font-display text-lg font-bold">{entry ? "Edit price" : "Add price"}</h2>
        <p className="text-[12px] text-ink-900/50 mt-1">
          {productCode} on {routeCode}
        </p>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-[12px] text-red-300">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3">
          <label className="text-[11px] font-semibold text-ink-900/50">
            Price (Rand)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={rands}
              onChange={(e) => setRands(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 placeholder:text-ink-900/30 outline-none focus:border-gold-400/60"
            />
          </label>
          <label className="text-[11px] font-semibold text-ink-900/50">
            Effective from
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink-900/10 bg-cream-200 px-4 py-3 text-[13px] text-ink-900 outline-none focus:border-gold-400/60"
            />
          </label>
          {entry && (
            <p className="text-[11px] text-ink-900/40">
              The current price stays live until the day before this date, so nothing mid-transaction breaks.
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-ink-900/10 py-2.5 text-[12px] font-semibold text-ink-900/70 hover:text-ink-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 py-2.5 text-[12px] font-bold text-ink-900 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save price"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
