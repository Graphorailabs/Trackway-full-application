import type React from "react";
import type { Footprint3DModelMetadata } from "../types";
import { Boxes } from "lucide-react";

type Props = {
  item: Footprint3DModelMetadata;
  selectedId?: string | null;
  onSelect: (m: Footprint3DModelMetadata) => void;
};

export default function ModelRow({ item, selectedId, onSelect }: Props) {
  const handleSelect = (e: React.MouseEvent) => {
    try { e.stopPropagation(); } catch (err) {}
    onSelect(item);
  };

  const isSelected = selectedId === item.id;

  return (
    <div
      className={`flex items-center gap-3 px-2 py-1 rounded cursor-pointer ${isSelected ? "bg-cyan-500/15" : "hover:bg-white/3"}`}
      role="button"
      tabIndex={0}
      onMouseDown={handleSelect}
      onClick={handleSelect}
    >
      <div className="w-5 h-5 text-emerald-200 flex items-center justify-center">
        <Boxes className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{item.name}</div>
        <div className="text-[11px] text-slate-400 truncate">
          {(item.format ? item.format.toUpperCase() : "MODEL")}
          {item.footprintName ? ` • matches ${item.footprintName}` : ""}
        </div>
      </div>
    </div>
  );
}
