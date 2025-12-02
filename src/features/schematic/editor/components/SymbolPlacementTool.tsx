import { Circle, Group, Layer, Rect } from "react-konva";
import { useEffect, useState, useRef } from "react";
  // Store live drag positions for each symbol by id

import { useStage } from "../context/stageProvider";
import { useTool } from "../context/ToolContext";
import { useWires } from "../context/WireContext";
import { useGrid } from "../context/GlobalGrid";
import { useSymbol } from "../context/SymbolContext";

import { SymbolPreviewCanvas } from "./SymbolPreviewCanvas";

export default function SymbolPlacementTool() {
  const { stageRef, state } = useStage();
  const { scale, position } = state;

  const { tool, setTool, selectedSymbolId, setSelectedSymbolId } = useTool();
  const { updateWirePinPosition, wires } = useWires();
  const { gridStep } = useGrid();

  const {
    pendingSymbol,
    setPendingSymbol,
    selectedSymbol,
    setSelectedSymbol,
    symbolData,
    placedSymbols,
    addPlacedSymbol,
    updatePlacedSymbol,
    removePlacedSymbol,
    livePinPositionsRef,
    ...symbolCtx
  } = useSymbol();

   const liveDragPositions = useRef<{ [id: string]: { x: number; y: number } }>({});
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    console.log("SymbolPlacementTool mounted", { tool: (undefined as any) });
  }, []);

  const toWorld = (p: any) => ({ x: (p.x - position.x) / scale, y: (p.y - position.y) / scale });

  // Same visual scale used by preview canvas
  const SCALE = 5;

  // Create simple pin descriptors from symbol unit array (raw pin data)
  const getPinDescriptors = (units: any[]) => {
    if (!units) return [];
    const out: any[] = [];
    units.forEach((u) => {
      if (Array.isArray(u.pin)) {
        u.pin.forEach((p: any) => {
          const [x, y, rot] = p.at;
          out.push({ x, y, rot, length: p.length ?? 1 });
        });
      }
    });
    return out;
  };

  // Compute bounding box in local (scaled) coordinates for the symbol graphics
  const computeGfxBounds = (units: any[]) => {
    const graphics: any[] = [];
    units.forEach((u: any) => {
      if (Array.isArray(u.graphics)) graphics.push(...u.graphics);
    });
    if (!graphics.length) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const addPoint = (x: number, y: number) => {
      const sx = x * SCALE;
      const sy = y * SCALE;
      if (sx < minX) minX = sx;
      if (sy < minY) minY = sy;
      if (sx > maxX) maxX = sx;
      if (sy > maxY) maxY = sy;
    };

    graphics.forEach((g: any) => {
      if (!g || !g.kind) return;
      if (g.kind === 'Rectangle') {
        const { start, end } = g.data;
        addPoint(start[0], start[1]);
        addPoint(end[0], end[1]);
      } else if (g.kind === 'Polyline') {
        const raw = g.data?.pts?.xy || [];
        raw.forEach((pt: any) => addPoint(pt[0], pt[1]));
      }
    });

    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
  };

  const normalizeSymbol = (s: any) => {
    if (!s) return null;
    if (Array.isArray(s)) return { unit: s };
    if (s.unit && Array.isArray(s.unit)) return s;
    if (s.unit) return { unit: Array.from(s.unit) };
    return null;
  };

  const placeSymbol = () => {
    if (tool !== "symbol") return;

    const candidate = pendingSymbol ?? symbolData ?? (selectedSymbol && selectedSymbol.symbolData) ?? null;
    console.debug("placeSymbol candidate sources:", { pendingSymbol, symbolData, selectedSymbol });
    const normalized = normalizeSymbol(candidate);
    if (!normalized) {
      console.warn("No symbol data available to place", { candidate, pendingSymbol, symbolData, selectedSymbol });
      return;
    }

    const stage = stageRef.current;
    const ptr = stage?.getPointerPosition();
    if (!ptr) return;

    const worldPos = toWorld(ptr);
    const snappedX = Math.round(worldPos.x / gridStep) * gridStep;
    const snappedY = Math.round(worldPos.y / gridStep) * gridStep;

    // compute gfx bounds so we can attach pins to graphic edge and compute outer endpoints
    const gfxBounds = computeGfxBounds(normalized.unit);

    const pinDescriptors = getPinDescriptors(normalized.unit);
    const pins = pinDescriptors.map((pd) => {
      const pxLocal = pd.x * SCALE; // original pin origin in local coords
      const pyLocal = pd.y * SCALE;
      const lenLocal = (pd.length || 1) * SCALE * 1.6;

      // inner attachment point (ix,iy) - falls back to pin origin if no gfx bounds
      let ix = pxLocal;
      let iy = pyLocal;
      if (gfxBounds) {
        if (pd.rot === 0) {
          ix = gfxBounds.maxX;
          iy = pyLocal;
        } else if (pd.rot === 180) {
          ix = gfxBounds.minX;
          iy = pyLocal;
        } else if (pd.rot === 90) {
          ix = pxLocal;
          iy = gfxBounds.maxY;
        } else if (pd.rot === 270) {
          ix = pxLocal;
          iy = gfxBounds.minY;
        }
      }

      // outer endpoint in local coords
      let exLocal = ix;
      let eyLocal = iy;
      if (pd.rot === 0) exLocal = ix + lenLocal;
      else if (pd.rot === 180) exLocal = ix - lenLocal;
      else if (pd.rot === 90) eyLocal = iy + lenLocal;
      else if (pd.rot === 270) eyLocal = iy - lenLocal;

      const absX = snappedX + exLocal;
      const absY = snappedY + eyLocal;

      return {
        id: crypto.randomUUID(),
        offsetX: exLocal,
        offsetY: eyLocal,
        x: absX,
        y: absY,
        connected: false,
        wireId: null,
      } as any;
    });

    const placed = { id: crypto.randomUUID(), symbolId: selectedSymbolId, position: { x: snappedX, y: snappedY }, pins, symbolData: normalized };
    // add to placed array and select it (keep selectedSymbol as full object for compatibility)
    addPlacedSymbol(placed);
    setSelectedSymbol(placed);
    setSelectedSymbolId(placed.id);
    // clear pending and exit placement
    setPendingSymbol(null);
    setTool("none");
    setMousePos(null);
  };

  // Register handlers when in symbol mode
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleClick = () => placeSymbol();
    const handleMove = () => {
      const ptr = stage.getPointerPosition();
      if (!ptr) return;
      setMousePos(toWorld(ptr));
    };

    // Diagnostic: log the top-most Konva node under pointer on mousedown
    const debugHit = () => {
      try {
        const p = stage.getPointerPosition();
        if (!p) return;
        const node = stage.getIntersection(p);
        console.debug("[SymbolPlacementTool] mousedown hit ->", { pointer: p, nodeType: node?.getClassName?.(), nodeAttrs: node?.getAttrs?.() });
      } catch (err) {
        console.debug("[SymbolPlacementTool] mousedown debug failed", err);
      }
    };

    if (tool === "symbol") {
      stage.on("click", handleClick);
      stage.on("mousemove", handleMove);
      stage.on("mousedown", debugHit);
    } else {
      // helpful debug when handler isn't attached
      console.debug("SymbolPlacementTool: not attaching handlers, tool=", tool, "pendingSymbol=", pendingSymbol, "symbolData=", symbolData);
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPendingSymbol(null);
        setTool("none");
        setMousePos(null);
      }
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      stage.off("click", handleClick);
      stage.off("mousemove", handleMove);
      stage.off("mousedown", debugHit);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [tool, pendingSymbol, stageRef]);

  // Handle Delete / Backspace to remove selected placed symbol
  useEffect(() => {
    const handleDelete = (e: KeyboardEvent) => {
      const key = e.key;
      if ((key === "Backspace" || key === "Delete") && selectedSymbol) {
        e.preventDefault();
        try {
          const idToRemove = typeof selectedSymbol === "string" ? selectedSymbol : selectedSymbol?.id;
          if (idToRemove) removePlacedSymbol(idToRemove);
        } catch (err) {
          console.error("Failed to remove placed symbol", err);
        }
        setSelectedSymbol(null);
        setSelectedSymbolId(null);
      }
    };

    window.addEventListener("keydown", handleDelete);
    return () => window.removeEventListener("keydown", handleDelete);
  }, [selectedSymbol, removePlacedSymbol, setSelectedSymbol]);

  // During drag we avoid updating React state (which is expensive) —
  // let Konva move the node smoothly and only update app state on drag end.
  // Update pin positions live during drag
  const handleDragMove = (e: any, id: string) => {
    const stage = e.target.getStage();
    const ptr = stage?.getPointerPosition();
    if (!ptr) return;

    const worldPos = toWorld(ptr);
    const snappedX = Math.round(worldPos.x / gridStep) * gridStep;
    const snappedY = Math.round(worldPos.y / gridStep) * gridStep;

    // Store live position in ref for this symbol
    liveDragPositions.current[id] = { x: snappedX, y: snappedY };

    // Also update live pin positions in context for this symbol
    const placed = placedSymbols.find((p: any) => p.id === id);
    if (placed) {
      const livePins: { [pinId: string]: { x: number; y: number } } = {};
      (placed.pins || []).forEach((p: any) => {
        const px = snappedX + (p.offsetX ?? 0);
        const py = snappedY + (p.offsetY ?? 0);
        livePins[p.id] = { x: px, y: py };
      });
      livePinPositionsRef.current[id] = livePins;
    }
  };

  const handleDragEnd = (_: any, id: string) => {
    // On drag end, update state with the final position
    const pos = liveDragPositions.current[id];
    if (!pos) return;
    const placed = placedSymbols.find((p: any) => p.id === id);
    if (!placed) return;
    const updatedPins = (placed.pins || []).map((p: any) => {
      const px = pos.x + (p.offsetX ?? 0);
      const py = pos.y + (p.offsetY ?? 0);
      if (p.connected) updateWirePinPosition(p.id, px, py);
      return { ...p, x: px, y: py };
    });
    updatePlacedSymbol(id, { position: { x: pos.x, y: pos.y }, pins: updatedPins });
    // Clean up
    delete liveDragPositions.current[id];
    delete livePinPositionsRef.current[id];
    // Optionally reroute wires here as well
    const allPins = placedSymbols.flatMap((sym: any) => {
      if (sym.id === id) {
        return updatedPins;
      }
      return sym.pins || [];
    });
    window.dispatchEvent(new CustomEvent('symbol-pin-moved', { detail: { pins: allPins } }));
  };

  const ghostPos = mousePos && gridStep ? { x: Math.round(mousePos.x / gridStep) * gridStep, y: Math.round(mousePos.y / gridStep) * gridStep } : null;

  return (
    <Layer x={position.x} y={position.y} scale={{ x: scale, y: scale }}>
      {tool === "symbol" && pendingSymbol && ghostPos && (
        <Group x={ghostPos.x} y={ghostPos.y} opacity={0.6} listening={false}>
          <SymbolPreviewCanvas symbolData={pendingSymbol?.unit ?? pendingSymbol} />
        </Group>
      )}

      {Array.isArray(placedSymbols) && placedSymbols.map((placed: any) => {
        // Use live drag position if available, else use state
        const livePos = liveDragPositions.current[placed.id];
        const pos = livePos || placed.position;
        if (!placed?.position) return null;
        return (
          <Group
            key={placed.id}
            x={pos.x}
            y={pos.y}
            draggable
            onDragStart={() => console.debug('dragstart', placed.id)}
            onDragMove={(e) => handleDragMove(e, placed.id)}
            onDragEnd={(e) => handleDragEnd(e, placed.id)}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'move';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
              onClick={() => {
                // single-click to select (store full object + id)
                setSelectedSymbol(placed);
                setSelectedSymbolId(placed.id);
              }}
              onDblClick={() => {
                // also support double-click selection
                setSelectedSymbol(placed);
                setSelectedSymbolId(placed.id);
              }}
          >
            {/* capture rect to make the whole symbol easy to grab for dragging */}
            {(() => {
              const bounds = computeGfxBounds(placed.symbolData?.unit ?? placed.symbolData?.unit ?? []);
              if (bounds) {
                const w = bounds.maxX - bounds.minX;
                const h = bounds.maxY - bounds.minY;
                return <Rect x={bounds.minX} y={bounds.minY} width={w} height={h} fill="transparent" listening={true} />;
              }
              return null;
            })()}

            <SymbolPreviewCanvas symbolData={placed.symbolData?.unit ?? placed.symbolData} />

            {(Array.isArray(placed.pins) ? placed.pins : []).map((p: any) => {
              // Hide overlay if any wire endpoint is connected to this pin
              const isConnected = (wires || []).some((w: any) =>
                w.points.some((pt: any) => pt.pinId === p.id)
              ) || p.connected;
              if (isConnected) return null;
              return (
                <Group
                  key={p?.id ?? crypto.randomUUID()}
                  // Use local offsets (offsetX/Y) so the marker center aligns
                  // exactly with the pin outer endpoint drawn by SymbolPreviewCanvas.
                  x={(p?.offsetX ?? ((p?.x ?? 0) - (placed.position?.x ?? 0)))}
                  y={(p?.offsetY ?? ((p?.y ?? 0) - (placed.position?.y ?? 0)))}
                >
                  {/* Outer ring */}
                  <Circle
                    radius={5 / scale}
                    fill="#ffffff"
                    stroke="#c2102a"
                    strokeWidth={1.2 / scale}
                    listening={false}
                  />

                  {/* Inner filled dot */}
                  <Circle
                    radius={1.8 / scale}
                    fill="#c2102a"
                    listening={false}
                  />

                  {/* Invisible larger hit area for easier interactions */}
                  <Circle
                    radius={12 / scale}
                    fill="transparent"
                    listening={true}
                    hitStrokeWidth={20 / scale}
                    opacity={0}
                  />
                </Group>
              );
            })}
          </Group>
        );
      })}
    </Layer>
  );
}
