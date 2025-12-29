import { Folder, FolderOpen } from "lucide-react";
import type { FootprintMetadata } from "../types";
import PackageRow from "./PackageRow";

type Props = {
  categories: string[];
  cloudItems: Record<string, FootprintMetadata[]>;
  expandedCloud: Record<string, boolean>;
  toggleCloudCategory: (cat: string) => Promise<void>;
  loadingCategories?: Record<string, boolean>;
  selected?: FootprintMetadata | null;
  setSelected: (m: FootprintMetadata | null) => void;
  debouncedSearch: string;
  tokenMatch: (target: string, q: string) => boolean;
};

export default function CloudSection({ categories, cloudItems, expandedCloud, toggleCloudCategory, loadingCategories, selected, setSelected, debouncedSearch, tokenMatch }: Props) {
  const q = debouncedSearch;
  const isSearching = !!q;
  const visible = categories.filter((c) => {
    if (!isSearching) return true;
    if (tokenMatch(c, q)) return true;
    const items = cloudItems[c];
    if (!items) return true; // show category while items may be loading so we can display a loader
    return items.some((it) => tokenMatch(it.name, q));
  });

  return (
    <>
      {visible.map((c) => (
        <div key={c} className="mb-2">
          <div className={`w-full text-left px-2 py-1 rounded flex items-center justify-between ${expandedCloud[c] ? "bg-emerald-500/10" : "hover:bg-white/3"}`}>
            <button onClick={() => toggleCloudCategory(c)} className="flex items-center gap-2 flex-1 text-left">
              <div className="w-4 h-4 text-slate-300 flex items-center justify-center">
                {expandedCloud[c] ? <FolderOpen className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
              </div>
              <span className="capitalize">{c}</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{expandedCloud[c] ? "▾" : "▸"}</span>
            </div>
          </div>
          {expandedCloud[c] && (
            <div className="pl-3 mt-1">
              <div className="flex flex-col">
                {(!cloudItems[c] && loadingCategories && loadingCategories[c]) ? (
                  <div className="text-xs text-slate-400 px-2 py-1">Loading…</div>
                ) : cloudItems[c] ? (
                  (isSearching ? cloudItems[c].filter((it) => tokenMatch(it.name, q)) : cloudItems[c]).map((it) => (
                    <PackageRow key={it.id} item={it} selectedId={selected?.id} onSelect={setSelected} />
                  ))
                ) : (
                  <div className="text-xs text-slate-500 px-2 py-1">No items</div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
