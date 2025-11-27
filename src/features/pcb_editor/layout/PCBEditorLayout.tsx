import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { GitBranch, Layers, Loader2, PackagePlus, Save, Settings, Square, ZoomIn, ZoomOut, Circle as CircleIcon } from "lucide-react";
import { LuMousePointer2 } from "react-icons/lu";
import { CanvasViewport } from "@/features/pcb_editor/components/CanvasViewport";
import { ENABLE_PCB_DEBUG_LOG_BUTTON } from "@/features/pcb_editor/constants";
import { EditorSettingsModal } from "@/features/pcb_editor/components/settings/EditorSettingsModal";
import { LayerVisibilityModal } from "@/features/pcb_editor/components/layers/LayerVisibilityModal";
import { Toolbar, ToolbarItem } from "@/features/pcb_editor/components/toolbar/Toolbar";
import { GridProvider } from "@/features/pcb_editor/contexts/GridContext";
import { LayerProvider, useLayers, type LayerId } from "@/features/pcb_editor/contexts/LayerContext";
import { PcbProvider, usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import { ZoomProvider, useZoom } from "@/features/pcb_editor/contexts/ZoomContext";
import { FootprintManagerProvider, FootprintManagerModal } from "@/features/footprint_manager";
import type { FootprintMetadata } from "@/features/footprint_manager";
import { ToolProvider, useToolContext, type Tool } from "@/features/pcb_editor/contexts/ToolContext";
import { ShapeProvider } from "@/features/pcb_editor/contexts/ShapeContext";
import { SelectionProvider } from "@/features/pcb_editor/contexts/SelectionContext";
import { FootprintPreviewProvider, useFootprintPreview } from "@/features/pcb_editor/footprint/FootprintContext";
import PadHoverProvider from "@/features/pcb_editor/contexts/PadHoverContext";
import ViaHoverProvider from "@/features/pcb_editor/contexts/ViaHoverContext";
import { useFootprintManagers } from "@/features/footprint_manager/FootprintManagerContext";
import { ShapeSelectionModal } from "../components/shapes/ShapeSelectionModal";
import { RoutingProvider } from "@/features/pcb_editor/contexts/RoutingContext";

export function PCBEditorLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layersModalOpen, setLayersModalOpen] = useState(false);
  const [shapeModalOpen, setShapeModalOpen] = useState(false);
  const [footprintModalOpen, setFootprintModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleSaveSuccess = useCallback(() => {
    setToast({ id: Date.now(), message: "PCB saved successfully", variant: "success" });
  }, []);

  const handleSaveError = useCallback((message: string) => {
    setToast({ id: Date.now(), message, variant: "error" });
  }, []);

  

  const TopToolbar = () => {
    const { zoomIn, zoomOut, zoom } = useZoom();
    const { savePcb, isSaving, pcb } = usePcb();
    const SHOW_PCB_DEBUG = Boolean(ENABLE_PCB_DEBUG_LOG_BUTTON);
    const { layers, selectedLayerId, selectLayer } = useLayers();
    const handleSave = async () => {
      try {
        await savePcb();
        handleSaveSuccess();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save PCB";
        handleSaveError(message);
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
            onClick={() => setSettingsOpen(true)}
            className="!flex !h-7 !w-7 !items-center !justify-center !rounded-full !border-white/20 !bg-white/5 !p-0"
          >
            <Settings className="h-3 w-3" />
          </ToolbarItem>
          {SHOW_PCB_DEBUG ? (
            <ToolbarItem
              label="Log PCB"
              aria-label="Log PCB to console"
              onClick={() => {
                try {
                  console.log("[pcb-debug] current pcb state:", pcb);
                } catch (e) {
                  console.error("[pcb-debug] failed to log pcb", e);
                }
              }}
              className="!flex !h-7 !w-7 !items-center !justify-center !rounded-full !border-white/20 !bg-white/5 !p-0"
            >
              <Loader2 className="h-3 w-3" />
            </ToolbarItem>
          ) : null}
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
  };

  const RightToolbar = () => {
    const { tool, setTool } = useToolContext();

    return (
      <Toolbar
        placement="right"
        className="relative z-10 flex w-16 shrink-0 flex-col items-center gap-3 text-white"
      >
          <div className="flex flex-col items-center gap-2">
            {/* Selection tool button */}
            <SelectionToolButton tool={tool} setTool={setTool} />
          <ToolbarItem
            label="Place Footprint"
            labelSide="left"
            onClick={() => setFootprintModalOpen(true)}
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
            onClick={() => setTool("route")}
            active={tool === "route"}
            className="!flex !h-10 !w-10 !items-center !justify-center !rounded-lg !border-white/20 !bg-white/5 !p-0"
          >
            <GitBranch className="h-4 w-4" />
          </ToolbarItem>
          <ToolbarItem
            label="Place Via"
            labelSide="left"
            onClick={() => setTool("via")}
            active={tool === "via"}
            className="!flex !h-10 !w-10 !items-center !justify-center !rounded-lg !border-white/20 !bg-white/5 !p-0"
          >
            <CircleIcon className="h-4 w-4" />
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
    );
  };

  const SelectionToolButton = ({ tool, setTool }: { tool: Tool; setTool: (tool: Tool) => void }) => {
    return (
      <ToolbarItem
        label="Select"
        labelSide="left"
        onClick={() => setTool("select")}
        active={tool === "select"}
        className="!flex !h-10 !w-10 !items-center !justify-center !rounded-lg !border-white/20 !bg-white/5 !p-0"
      >
        <LuMousePointer2 className="h-4 w-4" />
      </ToolbarItem>
    );
  };

  // Controller that renders the FootprintManagerModal and handles placement
  function FootprintModalController({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
    const { placeFootprint } = usePcb();
    const managers = useFootprintManagers();
    const { setPreview } = useFootprintPreview();

    // We will lazily import the preview setter to avoid circular issues in some dev setups.
    // Use the FootprintPreviewProvider above to expose `useFootprintPreview`.
    // The actual placement flow will parse the footprint package and set preview active,
    // allowing the preview layer to show it following the cursor.
    const handlePlace = async (pkg: FootprintMetadata) => {
      // Fetch package data using the manager available via the FootprintManagerProvider
      try {
        const pkgData = pkg.source === "cloud" ? await managers.cloud.getPackage(pkg.id) : await (managers.local as any).getPackage(pkg.id);
        if (!pkgData || !pkgData.data) {
          // fallback: create minimal footprint instance
          const fp = {
            uuid: crypto.randomUUID(),
            at: { x: 0, y: 0, angle: 0 },
            path: pkg.id,
            properties: [{ key: "name", value: pkg.id }],
          } as unknown as import("trackway-parser-wasm").Footprint;
          // set as preview so user can still see something
          setPreview({ active: true, footprint: fp, x: 0, y: 0, angle: 0 });
          setOpen(false);
          return;
        }

        // Resolve ArrayBuffer/string to text
        let ab: ArrayBuffer | null = null;
        if (pkgData.data instanceof ArrayBuffer) ab = pkgData.data as ArrayBuffer;
        else if (typeof pkgData.data === "string" && pkgData.data.length) {
          const res = await fetch(pkgData.data);
          ab = await res.arrayBuffer();
        }

        if (!ab) throw new Error("Unsupported package data");
        const txt = new TextDecoder().decode(ab);

        // Parse via parser helpers (sexpr or json)
        let parsed: any = null;
        try {
          const parser = await import("trackway-parser-wasm");
          parsed = parser.footprintLibSexprToValue(txt as string);
        } catch (err) {
          try {
            const parser = await import("trackway-parser-wasm");
            parsed = parser.footprintLibJsonToValue(txt as string);
          } catch (err2) {
            // final fallback: minimal footprint
            parsed = null;
          }
        }

        const fpModel = parsed ? ((parsed as any).footprint ?? parsed) : null;
        if (!fpModel) {
          const fp = {
            uuid: crypto.randomUUID(),
            at: { x: 0, y: 0, angle: 0 },
            path: pkg.id,
            properties: [{ key: "name", value: pkg.id }],
          } as unknown as import("trackway-parser-wasm").Footprint;
          const ctx = (await import("@/features/pcb_editor/footprint/FootprintContext")).useFootprintPreview();
          ctx.setPreview({ active: true, footprint: fp, x: 0, y: 0, angle: 0 });
          setOpen(false);
          return;
        }

        // Set preview so the preview layer will render the parsed model at the cursor when user moves
        const instance = { ...fpModel, uuid: crypto.randomUUID(), at: { x: 0, y: 0, angle: 0 } } as import("trackway-parser-wasm").Footprint;
        setPreview({ active: true, footprint: instance, x: 0, y: 0, angle: 0 });
        setOpen(false);
      } catch (err) {
        // On error, fall back to immediate placement to avoid blocking user
        const fp = {
          uuid: crypto.randomUUID(),
          at: { x: 0, y: 0, angle: 0 },
          path: pkg.id,
          properties: [{ key: "name", value: pkg.id }],
        } as unknown as import("trackway-parser-wasm").Footprint;
        placeFootprint(fp, { x: 0, y: 0, angle: 0 });
        setOpen(false);
      }
    };

    return (
      <FootprintManagerModal open={open} onClose={() => setOpen(false)} onPlace={handlePlace} inEditor={true} />
    );
  }

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
              <SelectionProvider>
                <ShapeProvider>
                  <RoutingProvider>
                    <FootprintManagerProvider>
                      <FootprintPreviewProvider>
                        <ViaHoverProvider>
                        <PadHoverProvider>
                    <div className="flex h-full min-h-screen w-full flex-col bg-slate-950 text-white">
                  <TopToolbar />
                  <div className="flex flex-1 overflow-hidden">
                    <CanvasViewport />
                    <RightToolbar />
                  </div>
                  <EditorSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
                  <LayerVisibilityModal open={layersModalOpen} onClose={() => setLayersModalOpen(false)} />
                  <ShapeSelectionModal open={shapeModalOpen} onClose={() => setShapeModalOpen(false)} />
                  <FootprintModalController open={footprintModalOpen} setOpen={setFootprintModalOpen} />
                  
                  <StatusToast toast={toast} />
                </div>
                        </PadHoverProvider>
                        </ViaHoverProvider>
                      </FootprintPreviewProvider>
                    </FootprintManagerProvider>
                  </RoutingProvider>
                </ShapeProvider>
              </SelectionProvider>
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
