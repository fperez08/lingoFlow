"use client";

interface ConfirmationModalProps {
  isOpen: boolean;
  word: string;
  onCancel: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
}

export default function ConfirmationModal({
  isOpen,
  word,
  onCancel,
  onConfirm,
  isConfirming,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      data-testid="confirmation-modal"
      className="fixed inset-0 bg-black/40 backdrop-blur-[6px] z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-surface-container-lowest/90 dark:bg-slate-900/90 backdrop-blur-[24px] rounded-xl shadow-2xl border border-outline-variant/20 dark:border-slate-700/30 w-full max-w-md p-8 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="font-headline text-2xl font-extrabold text-on-surface dark:text-slate-100">
            Overwrite Definition?
          </h2>
        </div>

        <p className="text-on-surface-variant dark:text-slate-400 mb-6">
          &quot;{word}&quot; already has a saved definition. Do you want to
          replace it with a new AI-generated one?
        </p>

        <div className="flex justify-end gap-3">
          <button
            data-testid="confirmation-cancel"
            onClick={onCancel}
            className="px-6 py-3 bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 rounded-xl font-bold hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-colors"
          >
            Keep Current
          </button>
          <button
            data-testid="confirmation-confirm"
            onClick={onConfirm}
            disabled={isConfirming}
            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-xl font-bold px-6 py-3 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isConfirming ? "Generating..." : "Generate New"}
          </button>
        </div>
      </div>
    </div>
  );
}
