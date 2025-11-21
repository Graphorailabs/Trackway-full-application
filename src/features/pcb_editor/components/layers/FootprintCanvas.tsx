import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { Layer } from "react-konva";
import CanvasStage from "./CanvasStage";
import { useToolContext } from "@/features/pcb_editor/contexts/ToolContext";
import FootprintKonvaLayer from "@/features/pcb_editor/footprint/FootprintKonvaLayer";
import FootprintPreviewLayer from "@/features/pcb_editor/footprint/FootprintPreviewLayer";
import { useCameraViewport } from "@/features/pcb_editor/components/canvas/CameraViewport";
import { useGrid } from "@/features/pcb_editor/contexts/GridContext";
import { useFootprintPreview } from "@/features/pcb_editor/footprint/FootprintContext";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import { useSelection } from "@/features/pcb_editor/contexts/SelectionContext";
import type { KonvaEventObject } from "konva/lib/Node";

export default function FootprintCanvas() {
  const { camera, zoom, viewportCenter, screenToWorld } = useCameraViewport();
  const { minorSpacing, renderMinorPx } = useGrid();
  const { preview, setPreview, clearPreview } = useFootprintPreview();
  const { placeFootprint, updateFootprint } = usePcb();
  const { select, clear, openContextMenu, selectedUuid } = useSelection();
  const { tool } = useToolContext();

  const draggingRef = useRef(false);
  const dragLastPosRef = useRef<[number, number] | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const computeSnapped = (worldPos: { x: number; y: number }) => {
    if (!minorSpacing) return worldPos;
    const baseMm = minorSpacing;
    const displayPx = renderMinorPx ?? Math.max(1, baseMm * zoom);
    const displayMult = Math.max(1, displayPx / (baseMm * zoom));
    const visibleStep = baseMm * displayMult;
    const snap = (v: number) => Math.round(v / visibleStep) * visibleStep;
    return { x: snap(worldPos.x), y: snap(worldPos.y) };
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    console.log("[FootprintCanvas] MouseDown event", { tool, previewActive: preview?.active });
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) {
      console.log("[FootprintCanvas] No pointer position");
      return;
    }
    const worldPos = screenToWorld(pos);
    console.log("[FootprintCanvas] WorldPos", worldPos);

    // If preview active, place footprint
    if (preview?.active && preview?.footprint) {
      console.log("[FootprintCanvas] Placing footprint preview");
      const placeAt = computeSnapped(worldPos);
      placeFootprint(preview.footprint as any, { x: placeAt.x, y: placeAt.y, angle: preview.angle ?? 0 });
      clearPreview();
      return;
    }

    // Selection of footprints: walk Konva parents to find group id
    let node: any = e.target as any;
    let targetId: string | undefined;
    while (node) {
      try {
        if (typeof node.id === "function") {
          const id = node.id();
          if (id) {
            targetId = id;
            break;
          }
        } else if (node.attrs && node.attrs.id) {
          targetId = node.attrs.id;
          break;
        }
      } catch (err) {}
      node = node.getParent ? node.getParent() : null;
    }
    console.log("[FootprintCanvas] TargetId", targetId);

    if (targetId) {
      console.log("[FootprintCanvas] Selecting footprint", targetId);
      select(targetId);
      // Start dragging if selection tool is active
      if (tool === "select") {
        draggingRef.current = true;
        dragLastPosRef.current = [worldPos.x, worldPos.y];
      }
      return;
    }

    // No footprint targeted: clear selection
    console.log("[FootprintCanvas] No footprint targeted, clearing selection");
    clear();
  };

  const handleMouseUp = () => {
    if (draggingRef.current) {
      draggingRef.current = false;
      dragLastPosRef.current = null;
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const worldPos = screenToWorld(pos);
    if (preview?.active) {
      const snapped = computeSnapped(worldPos);
      setPreview({ ...(preview as any), x: snapped.x, y: snapped.y });
    }
    // If dragging a selected footprint, update its position
    if (draggingRef.current && dragLastPosRef.current && selectedUuid) {
      const last = dragLastPosRef.current;
      const dx = worldPos.x - last[0];
      const dy = worldPos.y - last[1];
      dragLastPosRef.current = [worldPos.x, worldPos.y];
      updateFootprint(selectedUuid, (fp: any) => {
        const at = fp.at ?? { x: 0, y: 0, angle: 0 };
        return { ...fp, at: { x: (at.x ?? 0) + dx, y: (at.y ?? 0) + dy, angle: at.angle ?? 0 } } as any;
      });
    }
  };

  // Context menu handling for footprint canvas (container-relative coords)
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (selectedUuid) openContextMenu({ x, y });
      else openContextMenu(null);
    };
    window.addEventListener("contextmenu", onCtx);
    return () => window.removeEventListener("contextmenu", onCtx);
  }, [selectedUuid, openContextMenu]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (preview?.active) {
          clearPreview();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [preview, clearPreview]);

  // Allow pointer events only when a footprint preview is active (placing footprint).
  // This prevents the footprint canvas from stealing events from the shapes canvas.
  const pointerEvents = (preview?.active) ? "auto" : "none";
  const zIndex = (preview?.active) ? 20 : 10;
  return (
    <div className="absolute inset-0" style={{ pointerEvents, zIndex }} ref={containerRef}>
      <CanvasStage
        width={size.width}
        height={size.height}
        zoom={zoom}
        viewportCenter={viewportCenter}
        camera={camera}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          <FootprintKonvaLayer />
        </Layer>
        <Layer listening={false}>
          <FootprintPreviewLayer />
        </Layer>
      </CanvasStage>
    </div>
  );
}
