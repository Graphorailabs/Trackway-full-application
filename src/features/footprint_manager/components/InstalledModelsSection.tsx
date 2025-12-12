import type { Footprint3DModelMetadata } from "../types";
import ModelCategoryLocal from "./ModelCategoryLocal";

type Props = {
  models: Footprint3DModelMetadata[];
  debouncedSearch: string;
  tokenMatch: (target: string, q: string) => boolean;
  expandedLocal: Record<string, boolean>;
  setExpandedLocal: (fn: (p: Record<string, boolean>) => Record<string, boolean>) => void;
  handleUninstallCategory: (cat: string) => Promise<void> | void;
  selectedModelId?: string | null;
  onSelectModel: (meta: Footprint3DModelMetadata) => void;
};

export default function InstalledModelsSection({ models, debouncedSearch, tokenMatch, expandedLocal, setExpandedLocal, handleUninstallCategory, selectedModelId, onSelectModel }: Props) {
  const grouped: Record<string, Footprint3DModelMetadata[]> = {};
  for (const model of models) {
    const cat = model.category || "local";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(model);
  }
  const cats = Object.keys(grouped);
  if (cats.length === 0) return <div className="text-xs text-slate-500">No local 3D models</div>;
  const q = debouncedSearch;
  const isSearching = !!q;
  return (
    <>
      {cats
        .filter((cat) => {
          if (!isSearching) return true;
          if (tokenMatch(cat, q)) return true;
          return grouped[cat].some((model) => tokenMatch(model.name, q) || (model.footprintName ? tokenMatch(model.footprintName, q) : false));
        })
        .map((cat) => (
          <div key={cat} className="mb-2">
            <ModelCategoryLocal
              cat={cat}
              items={grouped[cat].filter((model) => {
                if (!isSearching) return true;
                return tokenMatch(model.name, q) || (model.footprintName ? tokenMatch(model.footprintName, q) : false);
              })}
              expanded={!!expandedLocal[cat]}
              onToggle={() => setExpandedLocal((prev) => ({ ...prev, [cat]: !prev[cat] }))}
              onUninstallCategory={handleUninstallCategory}
              selectedId={selectedModelId}
              onSelect={onSelectModel}
            />
          </div>
        ))}
    </>
  );
}
