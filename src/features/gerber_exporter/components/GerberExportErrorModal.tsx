import { X } from "lucide-react";

type GerberExportErrorModalProps = {
  open: boolean;
  error: string | null;
  onClose: () => void;
};

export function GerberExportErrorModal({ open, error, onClose }: GerberExportErrorModalProps) {
  if (!open || !error) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gerber-export-error-title"
      onClick={onClose}
    >
      <div
        className="w-[min(92vw,560px)] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Export</p>
            <h2 id="gerber-export-error-title" className="mt-1 text-lg font-semibold text-white">
              Export failed
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:text-white"
            aria-label="Close error dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6">
          <p className="text-sm text-white/80 mb-3">Gerber export failed with the following error:</p>

          <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <pre className="max-h-40 w-full overflow-auto text-xs text-white/70 whitespace-pre-wrap">{error}</pre>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GerberExportErrorModal;
