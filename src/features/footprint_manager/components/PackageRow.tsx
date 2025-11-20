import type { FootprintMetadata } from "../types";
import { File } from "lucide-react";

type Props = {
  item: FootprintMetadata;
  selectedId?: string | null;
  onSelect: (m: FootprintMetadata) => void;
};

export default function PackageRow({ item, selectedId, onSelect }: Props) {
  return (
    <div key={item.id} className={`flex items-center gap-3 px-2 py-1 rounded ${selectedId === item.id ? "bg-emerald-500/6" : "hover:bg-white/3"}`}>
      <div className="w-4 h-4 text-slate-400 flex items-center justify-center">
        <File className="h-3 w-3 text-slate-300" />
      </div>
      <button onClick={() => onSelect(item)} className="flex-1 text-left text-sm truncate">{item.name}</button>
    </div>
  );
}
