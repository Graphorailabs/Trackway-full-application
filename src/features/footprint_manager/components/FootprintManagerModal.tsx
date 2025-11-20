// react runtime available globally for JSX
import { PackagePlus, Cloud, Folder, X } from "lucide-react";
import FootprintPreview from "./FootprintPreview";
import { useEffect } from "react";
import SearchBar from "./SearchBar";
import CloudSection from "./CloudSection";
import InstalledSection from "./InstalledSection";
import FooterActions from "./FooterActions";
import { useFootprintManager } from "../hooks/useFootprintManager";
import type { FootprintMetadata } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  onPlace?: (pkg: FootprintMetadata) => void;
  // if opened from within PCB editor, show place button
  inEditor?: boolean;
};

export default function FootprintManagerModal({ open, onClose, onPlace, inEditor = false }: Props) {
  const manager = useFootprintManager(open);
  const {
    // search
    search,
    setSearch,
    debouncedSearch,
    tokenMatch,
    // cloud
    categories,
    expandedCloud,
    cloudItems,
    toggleCloudCategory,
    handleInstallCategory,
    loadingCategories,
    // installed
    installed,
    handleUninstallCategory,
    handleUninstall,
    handleInstallZipEvent,
    // UI
    viewMode,
    setViewMode,
    expandedLocal,
    setExpandedLocal,
    selected,
    setSelected,
  } = manager;

  useEffect(() => {
    if (selected) console.log("Footprint selected metadata:", selected);
  }, [selected]);

  return !open ? null : (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-[95vw] max-w-5xl h-[80vh] bg-gradient-to-b from-slate-900/95 to-slate-900 text-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div>
            <div className="text-lg font-semibold">Footprint Manager</div>
            <div className="text-xs text-slate-400">Manage footprint libraries and install .pretty packages</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded hover:bg-white/5 transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left vertical tab bar */}
          <div className="w-20 border-r border-white/5 flex flex-col items-center py-3 gap-2 bg-slate-900/50">
            <button
              title="Cloud"
              className={`w-12 h-12 rounded-lg flex items-center justify-center transition ${viewMode === "cloud" ? "bg-emerald-500/10 ring-1 ring-emerald-400/20" : "hover:bg-white/3"}`}
              onClick={() => setViewMode("cloud")}
            >
              <Cloud className="h-4 w-4" />
            </button>
            <button
              title="Installed"
              className={`w-12 h-12 rounded-lg flex items-center justify-center transition ${viewMode === "installed" ? "bg-emerald-500/10 ring-1 ring-emerald-400/20" : "hover:bg-white/3"}`}
              onClick={() => setViewMode("installed")}
            >
              <Folder className="h-4 w-4" />
            </button>
          </div>

          {/* Middle column: controls + tree */}
          <div className="flex-1 p-3 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <SearchBar search={search} setSearch={setSearch} />
              <label className="cursor-pointer px-3 py-2 rounded bg-emerald-600/10 text-sm hover:bg-emerald-600/12 transition flex items-center gap-2">
                <input type="file" accept=".zip" onChange={handleInstallZipEvent} className="hidden" />
                <PackagePlus className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-semibold text-emerald-200">Install package</span>
              </label>
            </div>

            <div className="flex-1 overflow-auto border rounded bg-slate-800 p-2">
              {viewMode === "cloud" ? (
                <CloudSection
                  categories={categories}
                  cloudItems={cloudItems}
                  expandedCloud={expandedCloud}
                  toggleCloudCategory={toggleCloudCategory}
                    handleInstallCategory={handleInstallCategory}
                    loadingCategories={loadingCategories}
                  selected={selected}
                  setSelected={setSelected}
                  debouncedSearch={debouncedSearch}
                  tokenMatch={tokenMatch}
                />
              ) : (
                <InstalledSection
                  installed={installed}
                  debouncedSearch={debouncedSearch}
                  tokenMatch={tokenMatch}
                  expandedLocal={expandedLocal}
                  setExpandedLocal={setExpandedLocal}
                  setSelected={setSelected}
                  selectedId={selected?.id}
                  handleUninstallCategory={handleUninstallCategory}
                />
              )}
            </div>
          </div>

          {/* Right column: preview */}
          <div className="w-80 border-l border-white/5 p-3">
            <div className="text-xs text-slate-400 mb-2">Preview</div>
            <div className="h-full overflow-auto">
              <FootprintPreview meta={selected} />
            </div>
            <div className="mt-3">
              {selected && selected.source === "local" && (
                <button onClick={() => selected && handleUninstall(selected.id)} className="px-3 py-2 rounded bg-rose-600/80">uninstall</button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div>
          {/* footer component */}
          <FooterActions selected={selected} inEditor={inEditor} onPlace={onPlace} onClose={onClose} handleUninstall={handleUninstall} />
        </div>
      </div>
    </div>
  );
}
