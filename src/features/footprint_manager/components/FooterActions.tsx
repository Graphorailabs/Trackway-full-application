import type { FootprintMetadata } from "../types";

type Props = {
  selected: FootprintMetadata | null;
  inEditor?: boolean;
  onPlace?: (pkg: FootprintMetadata) => void;
  onClose: () => void;
  handleUninstall: (id: string) => void;
};

export default function FooterActions({ selected, inEditor, onPlace, onClose, handleUninstall }: Props) {
  return (
    <div className="flex items-center justify-end gap-3 p-3 border-t border-white/5 bg-gradient-to-t from-slate-900/60">
      {selected && selected.source === "local" && (
        <button
          onClick={() => selected && handleUninstall(selected.id)}
          className="flex items-center gap-2 h-10 px-5 rounded-full bg-red-600/90 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm font-medium shadow-sm transition"
        >
          <span className="hidden sm:inline">Uninstall</span>
          <span className="inline sm:hidden">Remove</span>
        </button>
      )}
      {inEditor && selected && (
        <button
          onClick={() => onPlace && selected && onPlace(selected)}
          className="flex items-center gap-2 h-10 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold text-white shadow-md transform active:scale-95 transition"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 7l7-5 7 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>Place</span>
        </button>
      )}
      <button
        onClick={onClose}
        className="h-10 px-5 rounded-full border border-white/10 text-sm text-slate-200 hover:bg-white/6 transition flex items-center gap-2"
      >
        Close
      </button>
    </div>
  );
}
