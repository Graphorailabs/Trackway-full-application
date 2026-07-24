import React from "react";
import type { FootprintMetadata } from "../types";

type Props = {
  items: FootprintMetadata[];
  onSelect: (item: FootprintMetadata) => void;
  selectedId?: string | null;
  renderActions?: (item: FootprintMetadata) => React.ReactNode;
};

export default function FootprintList({ items, onSelect, selectedId, renderActions }: Props) {
  return (
    <div className="flex flex-col gap-3 overflow-auto p-2">
      {items.map((it) => (
        <div key={it.id} className={`w-full rounded-md transition-shadow duration-150 ${selectedId === it.id ? "bg-emerald-500/6 ring-1 ring-emerald-400/20 shadow-inner" : "hover:shadow-lg hover:bg-white/3"}`}>
          <button
            onClick={() => onSelect(it)}
            className="w-full text-left rounded-md px-3 py-2 flex items-center gap-3"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-600 rounded-md flex items-center justify-center text-sm font-semibold text-white shadow-sm overflow-hidden">
              {it.thumbnailUrl ? <img src={it.thumbnailUrl} alt={it.name} className="w-full h-full object-cover" /> : <span className="uppercase">{it.name.slice(0,1)}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm truncate">{it.name}</div>
                <div className="text-xs text-slate-400 px-2 py-0.5 rounded bg-white/3">{it.category ?? "uncategorized"}</div>
              </div>
              <div className="text-xs text-slate-400 truncate mt-1">{it.description}</div>
            </div>
            {renderActions ? <div className="ml-3">{renderActions(it)}</div> : null}
          </button>
        </div>
      ))}
    </div>
  );
}
