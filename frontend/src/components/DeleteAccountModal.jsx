import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";

const PHRASE = "delete my account";

export default function DeleteAccountModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const canDelete =
    confirmationText.trim().toLowerCase() === PHRASE && password.length > 0;

  async function handleDelete() {
    if (!canDelete || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount(password);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err?.message || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  }

  function handleClose() {
    if (isDeleting) return;
    setConfirmationText("");
    setPassword("");
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="delete-account-title"
            className="font-display text-lg font-bold text-red-600"
          >
            Delete Account
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="text-slate-500 hover:text-slate-700 disabled:opacity-50 px-2 py-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-red-50/70 border border-red-200 p-4">
            <p className="text-[13px] font-semibold text-red-600 mb-2">
              This cannot be undone
            </p>
            <p className="text-[12px] text-red-600/90 leading-relaxed">
              Deleted permanently:
            </p>
            <ul className="text-[11px] text-red-600/90 mt-1 ml-4 list-disc space-y-1">
              <li>Your profile and personal details</li>
              <li>Your saved payment methods</li>
              <li>Your support tickets and notifications</li>
            </ul>
            <p className="text-[12px] text-red-600/90 leading-relaxed mt-3">
              <span className="font-semibold">
                Journeys left on your Gold Card are lost
              </span>{" "}
              and the card is retired. Payment receipts are kept for accounting,
              without your name.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-2xl bg-red-50/70 border border-red-200 p-3 text-[12px] text-red-600"
            >
              {error}
            </p>
          )}

          <div>
            <label
              htmlFor="delete-password"
              className="block text-[11px] font-semibold text-slate-600 mb-2 tracking-wide"
            >
              Enter your password
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isDeleting}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[13px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="delete-confirm"
              className="block text-[11px] font-semibold text-slate-600 mb-2 tracking-wide"
            >
              Type <span className="font-mono">{PHRASE}</span> to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              placeholder={PHRASE}
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isDeleting}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[13px] text-ink-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-slate-300 py-3 text-[13px] font-semibold text-ink-900 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
            className="flex-1 rounded-lg bg-red-600 py-3 text-[13px] font-semibold text-white disabled:opacity-50 hover:bg-red-700 transition-colors"
          >
            {isDeleting ? "Deleting…" : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
