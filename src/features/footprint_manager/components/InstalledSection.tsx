import type { FootprintMetadata } from "../types";
import CategoryLocal from "./CategoryLocal";

type Props = {
  installed: FootprintMetadata[];
  debouncedSearch: string;
  tokenMatch: (target: string, q: string) => boolean;
  expandedLocal: Record<string, boolean>;
  setExpandedLocal: (fn: (p: Record<string, boolean>) => Record<string, boolean>) => void;
  setSelected: (m: FootprintMetadata | null) => void;
  selectedId?: string | null;
  handleUninstallCategory: (cat: string) => Promise<void>;
};

export default function InstalledSection({ installed, debouncedSearch, tokenMatch, expandedLocal, setExpandedLocal, setSelected, selectedId, handleUninstallCategory }: Props) {
  const q = debouncedSearch;
  const isSearching = !!q;
  const grouped: Record<string, FootprintMetadata[]> = {};
  for (const it of installed) {
    const cat = it.category || "local";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  }
  const cats = Object.keys(grouped);
  if (cats.length === 0) return <div className="text-xs text-slate-500">No local footprints</div>;
  return (
    <>
      {cats
        .filter((cat) => {
          if (!isSearching) return true;
          if (tokenMatch(cat, q)) return true;
          return grouped[cat].some((it) => tokenMatch(it.name, q));
        })
        .map((cat) => (
          <div key={cat} className="mb-2">
            <CategoryLocal
              cat={cat}
              items={grouped[cat].filter((it) => (isSearching ? tokenMatch(it.name, q) : true))}
              onSelect={setSelected}
              selectedId={selectedId}
              onUninstallCategory={handleUninstallCategory}
              expanded={!!expandedLocal[cat]}
              onToggle={() => setExpandedLocal((p) => ({ ...p, [cat]: !p[cat] }))}
            />
          </div>
        ))}
    </>
  );
}
