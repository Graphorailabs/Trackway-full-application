import { Folder, FolderOpen } from "lucide-react";
import PackageRow from "./PackageRow";
import type { FootprintMetadata } from "../types";

type Props = {
  cat: string;
  items: FootprintMetadata[];
  onSelect: (m: FootprintMetadata) => void;
  selectedId?: string | null;
  onUninstallCategory?: (cat: string) => void;
  expanded: boolean;
  onToggle: () => void;
};

export default function CategoryLocal({ cat, items, onSelect, selectedId, onUninstallCategory, expanded, onToggle }: Props) {
  return (
    <div>
      <div className={`w-full text-left px-2 py-1 rounded flex items-center justify-between ${expanded ? "bg-emerald-500/10" : "hover:bg-white/3"}`}>
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
          <div className="w-4 h-4 text-slate-300 flex items-center justify-center">
            {expanded ? <FolderOpen className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
          </div>
          <span className="capitalize">{cat}</span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onUninstallCategory && onUninstallCategory(cat); }} className="text-xs text-rose-400">Uninstall</button>
          <span className="text-xs text-slate-400">{expanded ? "▾" : "▸"}</span>
        </div>
      </div>
      {expanded && (
        <div className="pl-4">
          <div className="flex flex-col gap-1">
            {items.map((it) => (
              <div key={it.id}>
                <PackageRow item={it} selectedId={selectedId} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
