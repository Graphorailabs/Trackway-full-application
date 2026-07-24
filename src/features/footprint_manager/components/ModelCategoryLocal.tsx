import { Box, Boxes } from "lucide-react";
import type { Footprint3DModelMetadata } from "../types";
import ModelRow from "./ModelRow";

type Props = {
  cat: string;
  items: Footprint3DModelMetadata[];
  expanded: boolean;
  onToggle: () => void;
  onUninstallCategory?: (cat: string) => void;
  selectedId?: string | null;
  onSelect: (m: Footprint3DModelMetadata) => void;
};

export default function ModelCategoryLocal({ cat, items, expanded, onToggle, onUninstallCategory, selectedId, onSelect }: Props) {
  const hasItems = items.length > 0;
  return (
    <div>
      <div className={`w-full text-left px-2 py-1 rounded flex items-center justify-between ${expanded ? "bg-cyan-500/10" : "hover:bg-white/3"}`}>
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
          <div className="w-4 h-4 text-slate-300 flex items-center justify-center">
            {expanded ? <Boxes className="h-3 w-3" /> : <Box className="h-3 w-3" />}
          </div>
          <span className="capitalize">{cat}</span>
        </button>
        <div className="flex items-center gap-2">
          {hasItems && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUninstallCategory && onUninstallCategory(cat);
              }}
              className="text-xs text-rose-400"
            >
              Uninstall
            </button>
          )}
          <span className="text-xs text-slate-400">{expanded ? "▾" : "▸"}</span>
        </div>
      </div>
      {expanded && hasItems && (
        <div className="pl-4">
          <div className="flex flex-col gap-1">
            {items.map((it) => (
              <div key={it.id}>
                <ModelRow item={it} selectedId={selectedId} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </div>
      )}
      {expanded && !hasItems && (
        <div className="pl-4 text-[11px] text-slate-500 py-2">No models in this category</div>
      )}
    </div>
  );
}
