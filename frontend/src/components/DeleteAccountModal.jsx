import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";

export default function DeleteAccountModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationText, setConfirmationText] = useState("");

  if (!isOpen) return null;

  const isConfirmed = confirmationText.toLowerCase() === "delete my account";

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteAccount();
      // Redirect to login after successful deletion
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err?.message || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmationText("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 animate-in fade-in">
      <div className="w-full rounded-t-3xl bg-white p-5 animate-in slide-in-from-bottom-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-red-600">Delete Account</h2>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-red-50/70 border border-red-200 p-4">
            <p className="text-[13px] font-semibold text-red-600 mb-2">This action cannot be undone</p>
            <p className="text-[12px] text-red-500/90 leading-relaxed">
              Deleting your account will permanently remove:
            </p>
            <ul className="text-[11px] text-red-500/90 mt-2 ml-4 list-disc space-y-1">
              <li>Your profile and personal information</li>
              <li>Your travel history and transaction records</li>
              <li>Your registered payment cards</li>
              <li>Any active passes or journeys</li>
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-2xl bg-red-50/70 border border-red-200 p-3">
              <p className="text-[12px] text-red-600">{error}</p>
            </div>
          )}

          {/* Confirmation input */}
          <div>
            <label htmlFor="confirm-text" className="block text-[11px] font-semibold text-slate-600 mb-2 tracking-wide">
              Type the text below to confirm:
            </label>
            <input
              id="confirm-text"
              type="text"
              placeholder="delete my account"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isDeleting}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[13px] font-semibold text-ink-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-500 mt-1.5">
              Exact text: <span className="font-mono font-semibold">delete my account</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-5 pt-4 border-t border-slate-200">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-slate-300 py-3 text-[13px] font-semibold text-ink-900 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="flex-1 rounded-lg bg-red-600 py-3 text-[13px] font-semibold text-white disabled:opacity-50 hover:bg-red-700 transition-colors"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>

        <p className="text-[10px] text-slate-500 mt-3 text-center">
          If you have questions, contact our support team before deleting.
        </p>
      </div>
    </div>
  );
}
