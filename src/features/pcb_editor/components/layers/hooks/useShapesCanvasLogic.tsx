import { useLayoutEffect, useRef, useState, useEffect } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCameraViewport } from "@/features/pcb_editor/components/canvas/CameraViewport";
import { useMeasurementSafe } from "@/features/pcb_editor/contexts/MeasurementContext";
import { useShapeContext } from "../../../contexts/ShapeContext";
import { useToolContext } from "../../../contexts/ToolContext";
import { usePcb } from "../../../contexts/PcbContext";
import { useLayers } from "../../../contexts/LayerContext";
import { useGrid } from "@/features/pcb_editor/contexts/GridContext";
import { PAD_SNAP_RADIUS } from "@/features/pcb_editor/constants";
import { useFootprintPreview } from "@/features/pcb_editor/footprint/FootprintContext";
import { useSelection } from "../../../contexts/SelectionContext";
// import { DEFAULT_SHAPE_STROKE, DEFAULT_SHAPE_WIDTH, ENABLE_SNAP_TO_VISIBLE_GRID } from "@/features/pcb_editor/constants";
import { updateGraphicDataByKind } from "../ShapesCanvasService";

export function useShapesCanvasLogic() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const { camera, zoom, viewportCenter, screenToWorld } = useCameraViewport();
  const measurement = useMeasurementSafe();
  const {
    isDrawing,
    // startPoint,
    // currentPoint,
    polygonPoints,
    arcPhase,
    // arcStartPoint,
    // arcRadius,
    startDrawing,
    addPolygonPoint,
    advanceArcToSweep,
    updateDrawing,
    finishDrawing,
    resetDrawing,
  } = useShapeContext();

  const { pcb, addGraphicItem, updatePcb, placeFootprint, updateFootprint } = usePcb();
  const { minorSpacing, renderMinorPx } = useGrid();
  const { selectedUuid, select, clear, openContextMenu } = useSelection();
  const { tool, setTool, textEffects: defaultTextEffects } = useToolContext();
  const { selectedLayerId } = useLayers();
  const { preview, setPreview, clearPreview } = useFootprintPreview();

  // text overlay state
  const [textInput, setTextInput] = useState<string>("");
  const [textPos, setTextPos] = useState<any | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [overlayEffects, setOverlayEffects] = useState<any | undefined>(defaultTextEffects);
  const initialColor = (defaultTextEffects && ((defaultTextEffects.font as unknown as { color?: string })?.color)) ?? "#000000";
  const [overlayColor, setOverlayColor] = useState<string>(initialColor);

  // dragging state
  const draggingRef = useRef(false);
  const dragLastPosRef = useRef<[number, number] | null>(null);

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
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const worldPos = screenToWorld(pos);

    // If a footprint preview is active, place it at the clicked world position
    if (preview?.active && preview?.footprint) {
      const placeAt = computeSnapped(worldPos);
      placeFootprint(preview.footprint as any, { x: placeAt.x, y: placeAt.y, angle: preview.angle ?? 0 });
      clearPreview();
      return;
    }

    if (tool === "select") {
      // Walk up Konva node ancestors to find a node with an `id` set
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
        } catch (err) {
          // ignore
        }
        node = node.getParent ? node.getParent() : null;
      }

      if (targetId) {
        select(targetId);
        draggingRef.current = true;
        dragLastPosRef.current = [worldPos.x, worldPos.y];
        return;
      }

      // If Konva didn't hit anything we can still try geometric hit-testing
      // for PCB tracks (segments and vias) so the select tool can pick them.
      // This allows routing canvas (a different stage) to be selectable
      // from the main shapes stage via a geometric hit test.
      // segment/via selection tolerance
      const hitTol = PAD_SNAP_RADIUS;
      // helper: point-segment distance
      const pointSegmentDist = (px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }) => {
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const wx = px - a.x;
        const wy = py - a.y;
        const c1 = vx * wx + vy * wy;
        if (c1 <= 0) return Math.hypot(px - a.x, py - a.y);
        const c2 = vx * vx + vy * vy;
        if (c2 <= c1) return Math.hypot(px - b.x, py - b.y);
        const t = c1 / c2;
        const projx = a.x + t * vx;
        const projy = a.y + t * vy;
        return Math.hypot(px - projx, py - projy);
      };

      for (const tr of (pcb.tracks ?? [])) {
        try {
          if (tr.kind === 'segment') {
            const d: any = tr.data ?? {};
            const s = { x: d.start?.[0] ?? 0, y: d.start?.[1] ?? 0 };
            const e = { x: d.end?.[0] ?? 0, y: d.end?.[1] ?? 0 };
            const dist = pointSegmentDist(worldPos.x, worldPos.y, s, e);
            if (dist <= hitTol) {
              const nodeId = (d.uuid as string) || `__track:${s.x}:${s.y}:${e.x}:${e.y}:${d.width ?? 0}`;
              // select as a route (select entire connected trace)
              select(`__route:${nodeId}`);
              draggingRef.current = true;
              dragLastPosRef.current = [worldPos.x, worldPos.y];
              return;
            }
          } else if (tr.kind === 'via') {
            const v: any = tr.data ?? {};
            const at = { x: (v.at?.[0]) ?? 0, y: (v.at?.[1]) ?? 0 };
            const size = Number(v.size) || 0.8;
            const radius = Math.max(size / 2, 0.2) + hitTol;
            const d = Math.hypot(worldPos.x - at.x, worldPos.y - at.y);
            if (d <= radius) {
              if (v.uuid) select(v.uuid as string);
              else select(`via-${Math.round(at.x)}-${Math.round(at.y)}`);
              draggingRef.current = true;
              dragLastPosRef.current = [worldPos.x, worldPos.y];
              return;
            }
          }
        } catch (err) {
          // ignore per-track errors
        }
      }

        // If Konva didn't provide a target id, try a geometric hit-test
        // against footprints so clicks on placed footprints still select them
        // even if the footprint stage is not receiving pointer events.
        const hitFootprint = (pcb.footprints ?? []).find((fp) => {
          try {
            const pads = (fp.pads ?? []) as any[];
            const graphics = (fp.graphics ?? []) as any[];
            const texts = ((fp as any).texts ?? []) as any[];
            const points: Array<[number, number]> = [];
            pads.forEach((p) => {
              const at = p.at ?? { x: 0, y: 0 };
              const sizeArr = p.size ?? [1, 1];
              const w = sizeArr[0] ?? 1;
              const h = sizeArr[1] ?? w;
              points.push([ (at.x ?? 0) - w / 2, (at.y ?? 0) - h / 2 ]);
              points.push([ (at.x ?? 0) + w / 2, (at.y ?? 0) + h / 2 ]);
            });
            graphics.forEach((g) => {
              if (!g) return;
              if (g.kind === "line") {
                const s = g.start ?? g.data?.start ?? [0, 0];
                const e = g.end ?? g.data?.end ?? [0, 0];
                points.push([s.x ?? s[0] ?? 0, s.y ?? s[1] ?? 0]);
                points.push([e.x ?? e[0] ?? 0, e.y ?? e[1] ?? 0]);
              } else if (g.kind === "polygon") {
                const rawPts = g.pts ?? g.data?.pts ?? null;
                if (Array.isArray(rawPts)) {
                  rawPts.forEach((pt: any) => points.push([pt[0] ?? pt.x ?? 0, pt[1] ?? pt.y ?? 0]));
                } else if (rawPts && Array.isArray(rawPts.xy)) {
                  rawPts.xy.forEach((pt: any) => points.push([pt[0] ?? pt.x ?? 0, pt[1] ?? pt.y ?? 0]));
                }
              } else if (g.kind === "rect") {
                const s = g.start ?? g.data?.start ?? [0, 0];
                const e = g.end ?? g.data?.end ?? [0, 0];
                points.push([s[0] ?? s.x ?? 0, s[1] ?? s.y ?? 0]);
                points.push([e[0] ?? e.x ?? 0, e[1] ?? e.y ?? 0]);
              }
            });
            texts.forEach((t) => {
              const at = t.at ?? { x: 0, y: 0 };
              points.push([at.x ?? 0, at.y ?? 0]);
            });
            if (!points.length) return false;
            const xs = points.map((p) => p[0]);
            const ys = points.map((p) => p[1]);
            const minX = xs.length ? Math.min(...xs) : -5;
            const maxX = xs.length ? Math.max(...xs) : 5;
            const minY = ys.length ? Math.min(...ys) : -5;
            const maxY = ys.length ? Math.max(...ys) : 5;
            const at = fp.at ?? { x: 0, y: 0, angle: 0 } as { x?: number; y?: number; angle?: number };
            const cx = at.x ?? 0;
            const cy = at.y ?? 0;
            const angle = at.angle ?? 0;
            const dx = worldPos.x - cx;
            const dy = worldPos.y - cy;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const localX = dx * c + dy * s;
            const localY = -dx * s + dy * c;
            return localX >= minX && localX <= maxX && localY >= minY && localY <= maxY;
          } catch (err) {
            return false;
          }
        });

        if (hitFootprint) {
          select((hitFootprint as any).uuid as string);
          draggingRef.current = true;
          dragLastPosRef.current = [worldPos.x, worldPos.y];
          return;
        }

        clear();
        return;
    }

    if (tool === "polygon") {
      const snappedPos = computeSnapped(worldPos);
      if (!isDrawing) {
        startDrawing([snappedPos.x, snappedPos.y]);
      } else {
        const firstPoint = polygonPoints[0];
        const dist = Math.sqrt(Math.pow(firstPoint[0] - snappedPos.x, 2) + Math.pow(firstPoint[1] - snappedPos.y, 2));
        if (dist < 5 / zoom) {
          const newShape = finishDrawing();
          if (newShape) addGraphicItem(newShape);
        } else {
          addPolygonPoint([snappedPos.x, snappedPos.y]);
        }
      }
      return;
    }

    if (tool === "arc") {
      const snappedPos = computeSnapped(worldPos);
      if (!isDrawing) {
        startDrawing([snappedPos.x, snappedPos.y]);
      } else if (isDrawing && arcPhase === "sweep") {
        const newShape = finishDrawing([snappedPos.x, snappedPos.y]);
        if (newShape) addGraphicItem(newShape);
      }
      return;
    }

    if (tool === "text") {
      const snappedPos = computeSnapped(worldPos);
      setTextPos([snappedPos.x, snappedPos.y]);
      setShowTextInput(true);
      return;
    }

    // default: start drawing
    const snappedPos = computeSnapped(worldPos);
    startDrawing([snappedPos.x, snappedPos.y]);
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const worldPos = screenToWorld(pos);
    const snappedPos = computeSnapped(worldPos);

    if (preview?.active) {
      setPreview({ ...(preview as any), x: snappedPos.x, y: snappedPos.y });
    }

    updateDrawing(tool === "select" ? [worldPos.x, worldPos.y] : [snappedPos.x, snappedPos.y]);

    if (tool === "select" && draggingRef.current && dragLastPosRef.current) {
      const last = dragLastPosRef.current;
      const dx = worldPos.x - last[0];
      const dy = worldPos.y - last[1];
      dragLastPosRef.current = [worldPos.x, worldPos.y];
      if (!selectedUuid) return;

      const isGraphic = (pcb.graphics ?? []).some((g) => ((g.data as any).uuid) === selectedUuid);
      if (isGraphic) {
        updatePcb((current) => ({
          ...current,
          graphics: ((current.graphics ?? []).map((g) => {
            const uuid = (g.data as any).uuid;
            if (uuid !== selectedUuid) return g;
            const d = updateGraphicDataByKind(g.kind, g.data as any, dx, dy);
            return { ...g, data: d as any };
          })) as any,
        }));
      } else {
        updateFootprint(selectedUuid, (fp: any) => {
          const at = fp.at ?? { x: 0, y: 0, angle: 0 } as any;
          return { ...fp, at: { x: (at.x ?? 0) + dx, y: (at.y ?? 0) + dy, angle: at.angle ?? 0 } } as any;
        });
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && tool === "arc" && arcPhase === "circle") {
      advanceArcToSweep();
      return;
    }

    if (tool === "select" && draggingRef.current) {
      draggingRef.current = false;
      dragLastPosRef.current = null;
      return;
    }

    if (tool !== "polygon") {
      const newShape = finishDrawing();
      if (newShape) addGraphicItem(newShape);
    }
  };

  // Keyboard: Escape behaviour & contextmenu handling
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showTextInput) {
          setShowTextInput(false);
          setTextInput("");
          setTextPos(null);
          return;
        }
        if (preview?.active) {
          clearPreview();
          try { setTool("select"); } catch (err) {}
          return;
        }
        if (isDrawing) {
          resetDrawing();
          return;
        }
        resetDrawing();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showTextInput, preview, isDrawing, resetDrawing, clearPreview, setTool]);

  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) return;
      e.preventDefault();
      if (selectedUuid) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        openContextMenu({ x, y });
      } else {
        openContextMenu(null);
      }
    };
    window.addEventListener("contextmenu", onCtx);
    return () => window.removeEventListener("contextmenu", onCtx);
  }, [selectedUuid, openContextMenu]);

  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && textInput.trim() && textPos) {
      const layer = (selectedLayerId) ?? ((pcb.graphics?.[0]?.data as unknown as { layer?: string })?.layer) ?? "F.Cu";
      const data: Record<string, unknown> = {
        text: textInput,
        at: { x: textPos[0], y: textPos[1] },
        layer,
        uuid: crypto.randomUUID(),
        effects: overlayEffects ?? defaultTextEffects ?? {},
      };
      if (overlayColor) (data as Record<string, unknown>)["color"] = overlayColor;

      addGraphicItem({ kind: "text", data } as any);

      setTextInput("");
      setTextPos(null);
      setShowTextInput(false);
    }
  };

  return {
    containerRef,
    size,
    showTextInput,
    setShowTextInput,
    textPos,
    setTextPos,
    textInput,
    setTextInput,
    handleTextInputKeyDown,
    overlayEffects,
    setOverlayEffects,
    overlayColor,
    setOverlayColor,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    measurement,
    camera,
    zoom,
    viewportCenter,
  } as const;
}

export default useShapesCanvasLogic;
