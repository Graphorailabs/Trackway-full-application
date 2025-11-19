import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { GitBranch, Layers, Loader2, PackagePlus, Save, Settings, Square, ZoomIn, ZoomOut } from "lucide-react";
import { CanvasViewport } from "@/features/pcb_editor/components/CanvasViewport";
import { EditorSettingsModal } from "@/features/pcb_editor/components/settings/EditorSettingsModal";
import { LayerVisibilityModal } from "@/features/pcb_editor/components/layers/LayerVisibilityModal";
import { Toolbar, ToolbarItem } from "@/features/pcb_editor/components/toolbar/Toolbar";
import { GridProvider } from "@/features/pcb_editor/contexts/GridContext";
import { LayerProvider, useLayers, type LayerId } from "@/features/pcb_editor/contexts/LayerContext";
import { PcbProvider, usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import { ZoomProvider, useZoom } from "@/features/pcb_editor/contexts/ZoomContext";
import { ToolProvider } from "@/features/pcb_editor/contexts/ToolContext";
import { ShapeProvider } from "@/features/pcb_editor/contexts/ShapeContext";
import { ShapeSelectionModal } from "../components/shapes/ShapeSelectionModal";

type TopToolbarProps = {
  onOpenSettings: () => void;
  onSaveSuccess: () => void;
  onSaveError: (message: string) => void;
};

function TopToolbar({ onOpenSettings, onSaveSuccess, onSaveError }: TopToolbarProps) {
  const { zoomIn, zoomOut, zoom } = useZoom();
  const { savePcb, isSaving } = usePcb();
  const { layers, selectedLayerId, selectLayer } = useLayers();

  const handleSave = async () => {
    try {
      await savePcb();
      onSaveSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save PCB";
      onSaveError(message);
    }
  };

  const handleLayerChange = (event: ChangeEvent<HTMLSelectElement>) => {
    selectLayer(event.target.value as LayerId);
  };

  return (
    <Toolbar placement="top" className="justify-start">
      <div className="flex items-center gap-3">
        <ToolbarItem
          label="Save"
          aria-label="Save PCB"
          onClick={handleSave}
          disabled={isSaving}
          className="!flex !h-7 !w-7 !items-center !justify-center !rounded-full !border-emerald-400/40 !bg-emerald-500/10 !p-0 !text-emerald-200"
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        </ToolbarItem>
        <ToolbarItem
          label="Settings"
          aria-label="Editor settings"
          onClick={onOpenSettings}
          className="!flex !h-7 !w-7 !items-center !justify-center !rounded-full !border-white/20 !bg-white/5 !p-0"
        >
          <Settings className="h-3 w-3" />
        </ToolbarItem>
        <div className="flex items-center gap-2">
          <ToolbarItem
            label="Zoom out"
            aria-label="Zoom out"
            onClick={zoomOut}
            className="!flex !h-7 !w-7 !items-center !justify-center !rounded-full !border-white/20 !bg-white/5 !p-0"
          >
            <ZoomOut className="h-3 w-3" />
          </ToolbarItem>
          <div className="min-w-[3rem] rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-center text-[10px] font-semibold tracking-wide text-white/80">
            {(zoom * 100).toFixed(0)}%
          </div>
          <ToolbarItem
            label="Zoom in"
            aria-label="Zoom in"
            onClick={zoomIn}
            className="!flex !h-7 !w-7 !items-center !justify-center !rounded-full !border-white/20 !bg-white/5 !p-0"
          >
            <ZoomIn className="h-3 w-3" />
          </ToolbarItem>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">Layer</span>
          <select
            value={selectedLayerId}
            onChange={handleLayerChange}
            className="bg-transparent text-xs font-semibold text-white focus:outline-none"
            aria-label="Select active layer"
          >
            {layers.map((layer) => (
              <option
                key={layer.canonical_name}
                value={layer.canonical_name}
                className="bg-slate-900 text-white"
              >
                {layer.user_name ?? layer.canonical_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Toolbar>
  );
}

export function PCBEditorLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layersModalOpen, setLayersModalOpen] = useState(false);
  const [shapeModalOpen, setShapeModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleSaveSuccess = useCallback(() => {
    setToast({ id: Date.now(), message: "PCB saved successfully", variant: "success" });
  }, []);

  const handleSaveError = useCallback((message: string) => {
    setToast({ id: Date.now(), message, variant: "error" });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <PcbProvider>
      <LayerProvider>
        <ZoomProvider>
          <GridProvider>
            <ToolProvider>
              <ShapeProvider>
                <div className="flex h-full min-h-screen w-full flex-col bg-slate-950 text-white">
                  <TopToolbar
                    onOpenSettings={() => setSettingsOpen(true)}
                    onSaveSuccess={handleSaveSuccess}
                    onSaveError={handleSaveError}
                  />
                  <div className="flex flex-1 overflow-hidden">
                    <CanvasViewport />
                    <Toolbar
                      placement="right"
                      className="relative z-10 flex w-16 shrink-0 flex-col items-center gap-3 text-white"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <ToolbarItem
                          label="Place Footprint"
                          labelSide="left"
                          className="!flex !h-10 !w-10 !items-center !justify-center !rounded-lg !border-white/20 !bg-white/5 !p-0"
                        >
                          <PackagePlus className="h-4 w-4" />
                        </ToolbarItem>
                        <ToolbarItem
                          label="Draw Shape"
                          labelSide="left"
                          onClick={() => setShapeModalOpen(true)}
                          active={shapeModalOpen}
                          className="!flex !h-10 !w-10 !items-center !justify-center !rounded-lg !border-white/20 !bg-white/5 !p-0"
                        >
                          <Square className="h-4 w-4" />
                        </ToolbarItem>
                        <ToolbarItem
                          label="Route Trace"
                          labelSide="left"
                          className="!flex !h-10 !w-10 !items-center !justify-center !rounded-lg !border-white/20 !bg-white/5 !p-0"
                        >
                          <GitBranch className="h-4 w-4" />
                        </ToolbarItem>
                        <ToolbarItem
                          label="Layer Stack"
                          labelSide="left"
                          onClick={() => setLayersModalOpen(true)}
                          active={layersModalOpen}
                          className="!flex !h-10 !w-10 !items-center !justify-center !rounded-lg !border-white/20 !bg-white/5 !p-0"
                        >
                          <Layers className="h-4 w-4" />
                        </ToolbarItem>
                      </div>
                    </Toolbar>
                  </div>
                  <EditorSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
                  <LayerVisibilityModal open={layersModalOpen} onClose={() => setLayersModalOpen(false)} />
                  <ShapeSelectionModal open={shapeModalOpen} onClose={() => setShapeModalOpen(false)} />
                  <StatusToast toast={toast} />
                </div>
              </ShapeProvider>
            </ToolProvider>
          </GridProvider>
        </ZoomProvider>
      </LayerProvider>
    </PcbProvider>
  );
}

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

function StatusToast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  const palette =
    toast.variant === "success"
      ? "bg-emerald-400/90 text-emerald-950 border-emerald-200/60"
      : "bg-rose-500/90 text-rose-50 border-rose-200/60";

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-50 flex flex-col gap-2">
      <div className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-2xl ${palette}`}>
        {toast.message}
      </div>
    </div>
  );
}

export default PCBEditorLayout;
