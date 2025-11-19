import { type MouseEvent } from "react";
import { X } from "lucide-react";

import { useLayers, type LayerId } from "@/features/pcb_editor/contexts/LayerContext";

type LayerVisibilityModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LayerVisibilityModal({ open, onClose }: LayerVisibilityModalProps) {
  const { layers, selectedLayerId, selectLayer, visibility, setLayerVisibility } = useLayers();

  if (!open) return null;

  const handleBackdropClick = () => {
    onClose();
  };

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleSelect = (id: LayerId) => {
    selectLayer(id);
  };

  const handleVisibilityChange = (id: LayerId, visible: boolean) => {
    setLayerVisibility(id, visible);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-labelledby="layer-visibility-title"
      onClick={handleBackdropClick}
    >
      <div
        className="w-[min(560px,90vw)] rounded-2xl border border-white/10 bg-slate-950/95 text-white shadow-2xl"
        onClick={handleCardClick}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Layers</p>
            <h2 id="layer-visibility-title" className="text-lg font-semibold">
              Layer visibility
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <p className="text-sm text-white/70">
            Toggle which layers are visible in the canvas and choose the active editing layer.
          </p>
          <div className="mt-4 space-y-3">
            {layers.map((layer) => {
              const layerId = layer.canonical_name;
              const displayName = layer.user_name ?? layer.canonical_name;
              const shortName = layer.canonical_name;
              const isSelected = layerId === selectedLayerId;
              const isVisible = visibility[layerId] ?? true;
              return (
                <div
                  key={layerId}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-black/30"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {displayName}
                      <span className="ml-2 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
                        {shortName}
                      </span>
                    </p>
                    <p className="text-xs text-white/60">{layer.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-2 text-xs text-white/70">
                      <input
                        type="radio"
                        name="active-layer"
                        value={layerId}
                        checked={isSelected}
                        onChange={() => handleSelect(layerId)}
                        className="h-3.5 w-3.5 accent-emerald-400"
                      />
                      Active layer
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/70">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={(event) => handleVisibilityChange(layerId, event.target.checked)}
                        className="h-3.5 w-3.5 accent-emerald-400"
                      />
                      Visible
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
