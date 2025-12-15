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
    livePinPositionsRef
    // ...symbolCtx
  } = useSymbol();

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

   const liveDragPositions = useRef<{ [id: string]: { x: number; y: number } }>({});
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  
  // debounce timer for live dispatches to avoid flooding the router
  const dispatchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    console.log("SymbolPlacementTool mounted", { tool: (undefined as any) });
  }, []);

  // Listen for pin selection events dispatched by the preview or pin hit areas
  useEffect(() => {
    const onSelectPin = (ev: any) => {
      try {
        const d = ev.detail || {};
        if (d.pinId) {
          setSelectedPinId(d.pinId ?? null);
          return;
        }
        // If preview dispatched ownerId+pinIndex, resolve to placed pin id
        if (d.ownerId && typeof d.pinIndex === 'number') {
          const owner = (placedSymbols || []).find((s: any) => s.id === d.ownerId);
          if (owner && Array.isArray(owner.pins)) {
            // Robust mapping: reconstruct visible pins from the owner's symbolData
            // and compute their outer endpoint offsets, then match against placed
            // pin offsets (offsetX/offsetY). This works for older placed objects
            // that may have different pin arrays.
            try {
              const units = owner.symbolData?.unit ?? owner.symbolData ?? [];
              // flatten raw pins and filter NC same as preview
              const rawPins: any[] = [];
              units.forEach((u: any) => { if (Array.isArray(u.pin)) rawPins.push(...u.pin); });
              const visibleRawPins = rawPins.filter((p) => !isPinNoConnect(p));

              // compute gfxBounds in local pixels (same as preview)
              const graphics: any[] = [];
              units.forEach((u: any) => { if (Array.isArray(u.graphics)) graphics.push(...u.graphics); });
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              graphics.forEach((g: any) => {
                if (!g || !g.kind) return;
                if (g.kind === 'Rectangle') {
                  const { start, end } = g.data;
                  minX = Math.min(minX, start[0], end[0]);
                  minY = Math.min(minY, start[1], end[1]);
                  maxX = Math.max(maxX, start[0], end[0]);
                  maxY = Math.max(maxY, start[1], end[1]);
                } else if (g.kind === 'Polyline') {
                  const raw = g.data?.pts?.xy || [];
                  raw.forEach((pt: any) => { minX = Math.min(minX, pt[0]); minY = Math.min(minY, pt[1]); maxX = Math.max(maxX, pt[0]); maxY = Math.max(maxY, pt[1]); });
                } else if (g.kind === 'Circle' || g.kind === 'circle') {
                  const c = g.data?.center ?? g.data?.cx ?? [g.cx ?? 0, g.cy ?? 0];
                  const cx = Array.isArray(c) ? c[0] : c.x ?? 0;
                  const cy = Array.isArray(c) ? c[1] : c.y ?? 0;
                  const r = Number(g.data?.radius ?? g.data?.r ?? 0);
                  minX = Math.min(minX, cx - r);
                  minY = Math.min(minY, cy - r);
                  maxX = Math.max(maxX, cx + r);
                  maxY = Math.max(maxY, cy + r);
                }
              });
              const gfxBoundsLocal = (minX === Infinity) ? null : { minX, minY, maxX, maxY };

              // helper to compute outer endpoint (exLocal,eyLocal) for a raw pin
              const SCALE = 6;
              const computeOuter = (pin: any) => {
                const [px_raw, py_raw, rot] = pin.at;
                const px = px_raw * SCALE;
                const py = py_raw * SCALE;
                const len = (pin.length || 1) * SCALE * 1;
                let ix = px, iy = py;
                if (gfxBoundsLocal) {
                  if (rot === 0) { ix = gfxBoundsLocal.minX; iy = py; }
                  else if (rot === 180) { ix = gfxBoundsLocal.maxX; iy = py; }
                  else if (rot === 90) { ix = px; iy = gfxBoundsLocal.maxY; }
                  else if (rot === 270) { ix = px; iy = gfxBoundsLocal.minY; }
                }
                let ex = ix, ey = iy;
                if (gfxBoundsLocal) {
                  if (rot === 0 || rot === 180) {
                    if (ix === gfxBoundsLocal.minX) ex = ix - len; else ex = ix + len;
                    ey = iy;
                  } else {
                    if (iy === gfxBoundsLocal.maxY) ey = iy + len; else ey = iy - len;
                    ex = ix;
                  }
                } else {
                  if (rot === 0) { ex = ix + len; ey = iy; }
                  else if (rot === 180) { ex = ix - len; ey = iy; }
                  else if (rot === 90) { ex = ix; ey = iy + len; }
                  else if (rot === 270) { ex = ix; ey = iy - len; }
                }
                return { ex, ey };
              };

              const targetRaw = visibleRawPins[d.pinIndex];
              if (!targetRaw) {
                setSelectedPinId(null);
                return;
              }
              const target = computeOuter(targetRaw);
              // find closest placed pin by comparing offsetX/offsetY
              const found = owner.pins.find((pp: any) => {
                const dx = Math.abs((pp.offsetX ?? 0) - target.ex);
                const dy = Math.abs((pp.offsetY ?? 0) - target.ey);
                return dx < 2 && dy < 2;
              });
              if (found) {
                setSelectedPinId(found.id ?? null);
                return;
              }
              // fallback: if owner.pins has an index matching pinIndex, use it
              if (owner.pins[d.pinIndex]) {
                setSelectedPinId(owner.pins[d.pinIndex].id ?? null);
                return;
              }
            } catch (err) {
              // fall through to clearing selection
            }
          }
        }
        // fallback: clear
        setSelectedPinId(null);
      } catch (err) {}
    };
    window.addEventListener('select-pin', onSelectPin);
    return () => window.removeEventListener('select-pin', onSelectPin);
  }, [placedSymbols]);

  const toWorld = (p: any) => ({ x: (p.x - position.x) / scale, y: (p.y - position.y) / scale });

  // Same visual scale used by preview canvas
  const SCALE = 6;
  // Keep pin length multiplier in sync with preview renderer
  const PIN_LENGTH_MULTIPLIER = 1;

  // Create simple pin descriptors from symbol unit array (raw pin data)
  const getPinDescriptors = (units: any[]) => {
    if (!units) return [];
    const out: any[] = [];
    units.forEach((u) => {
      if (Array.isArray(u.pin)) {
        u.pin.forEach((p: any) => {
          // skip pins that are NC / not connected so indices align with
          // the preview renderer which also filters NC pins
          if (isPinNoConnect(p)) return;
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

  // detect NC-like pin names (matches NC, no_connect, not connected, etc.)
  const isPinNoConnect = (p: any) => {
    const raw = (p?.name?.[''] ?? p?.name ?? '') as any;
    let s = (raw ?? '').toString().trim();
    const mInv = s.match(/^~\{(.+)\}$/);
    if (mInv) s = mInv[1];
    s = s.replace(/([A-Za-z])_\{([^}]+)\}/g, (_: any, a: string, b: string) => a + b.toLowerCase());
    s = s.replace(/^\{(.+)\}$/, "$1");
    const v = s.trim().toLowerCase();
    return /^(nc|not[_\s-]?connect|no[_\s-]?connect|notconnected)$/.test(v);
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
      const lenLocal = (pd.length || 1) * SCALE * PIN_LENGTH_MULTIPLIER;

      // inner attachment point (ix,iy) - falls back to pin origin if no gfx bounds
      let ix = pxLocal;
      let iy = pyLocal;
      if (gfxBounds) {
        // NOTE: swapped attachment edges to match preview canvas UX
        if (pd.rot === 0) {
          // right-facing pin: attach to LEFT edge
          ix = gfxBounds.minX;
          iy = pyLocal;
        } else if (pd.rot === 180) {
          // left-facing pin: attach to RIGHT edge
          ix = gfxBounds.maxX;
          iy = pyLocal;
        } else if (pd.rot === 90) {
          // down-facing -> bottom edge
          ix = pxLocal;
          iy = gfxBounds.maxY;
        } else if (pd.rot === 270) {
          // up-facing -> top edge
          ix = pxLocal;
          iy = gfxBounds.minY;
        }
      }

      // outer endpoint in local coords: extend OUTWARD away from the graphic edge
      let exLocal = ix;
      let eyLocal = iy;
      if (gfxBounds) {
        if (pd.rot === 0 || pd.rot === 180) {
          if (ix === gfxBounds.minX) {
            // attached to left edge -> extend left
            exLocal = ix - lenLocal;
          } else {
            // attached to right edge -> extend right
            exLocal = ix + lenLocal;
          }
          eyLocal = iy;
        } else {
          // vertical pins
          if (iy === gfxBounds.maxY) {
            eyLocal = iy + lenLocal;
          } else {
            eyLocal = iy - lenLocal;
          }
          exLocal = ix;
        }
      } else {
        // fallback: rotation-based extension
        if (pd.rot === 0) exLocal = ix + lenLocal;
        else if (pd.rot === 180) exLocal = ix - lenLocal;
        else if (pd.rot === 90) eyLocal = iy + lenLocal;
        else if (pd.rot === 270) eyLocal = iy - lenLocal;
      }

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
        // approximate visual thickness for this pin (used to size wires)
        pinThickness: (pd.length || 1) * 1.2,
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
    // Clicking on empty canvas should deselect the current symbol. When the
    // active tool is `symbol` we skip deselection because clicks are used to
    // place new symbols and the placement handler runs in that case.
    const handleStageClickDeselect = () => {
      try {
        if (tool === 'symbol') return; // don't deselect while placing symbols
        const ptr = stage.getPointerPosition();
        if (!ptr) return;
        // If click didn't hit any shape, deselect
        const node = stage.getIntersection(ptr);
        if (!node && typeof setSelectedSymbolId === 'function') {
          setSelectedSymbol(null);
          setSelectedSymbolId(null);
          setSelectedPinId(null);
        }
      } catch (err) {
        // ignore
      }
    };

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

    // Always attach the deselect handler so clicking empty canvas clears selection.
    stage.on("click", handleStageClickDeselect);

    if (tool === "symbol") {
      stage.on("click", handleClick);
      stage.on("mousemove", handleMove);
      stage.on("mousedown", debugHit);
    } else {
      // helpful debug when handler isn't attached
      console.debug("SymbolPlacementTool: not attaching placement handlers, tool=", tool, "pendingSymbol=", pendingSymbol, "symbolData=", symbolData);
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
      stage.off("click", handleStageClickDeselect);
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
    // Debounce dispatch and only send pins for the symbol being dragged
    if (dispatchTimerRef.current) window.clearTimeout(dispatchTimerRef.current);
    dispatchTimerRef.current = window.setTimeout(() => {
      const sym = placedSymbols.find((p: any) => p.id === id);
      if (!sym) return;
      const liveForSym = livePinPositionsRef.current[id] || {};
      const pinsPayload = (sym.pins || []).map((p: any) => {
        const live = liveForSym[p.id];
        return { id: p.id, x: live ? live.x : p.x, y: live ? live.y : p.y };
      });
      // Live-moving event (debounced) — used by WireTool to draw preview routes
      window.dispatchEvent(new CustomEvent('symbol-pin-moving', { detail: { pins: pinsPayload, symbolId: id } }));
    }, 60);
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
    // Optionally reroute wires here as well — dispatch final drag event
    const allPins = placedSymbols.flatMap((sym: any) => {
      if (sym.id === id) {
        return updatedPins;
      }
      return sym.pins || [];
    });

    // Dispatch final drag-end with pins for the dragged symbol first, so
    // listeners can finalize routing before we clear live refs.
    window.dispatchEvent(new CustomEvent('symbol-drag-end', { detail: { pins: allPins, symbolId: id } }));

    // Clean up
    delete liveDragPositions.current[id];
    delete livePinPositionsRef.current[id];
  };

  const ghostPos = mousePos && gridStep ? { x: Math.round(mousePos.x / gridStep) * gridStep, y: Math.round(mousePos.y / gridStep) * gridStep } : null;

  return (
    <Layer x={position.x} y={position.y} scale={{ x: scale, y: scale }}>
      {tool === "symbol" && pendingSymbol && ghostPos && (
        <Group x={ghostPos.x} y={ghostPos.y} opacity={0.6} listening={false}>
          <SymbolPreviewCanvas symbolData={pendingSymbol?.unit ?? pendingSymbol} selected={false} selectedPinId={selectedPinId} selectedPinIndex={null} ownerId={null} />
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
            rotation={placed.rotation ?? 0}
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
              onClick={(e) => {
                  // prevent stage-level click handlers (placement) from also firing
                  // when selecting an existing symbol
                  try { e.cancelBubble = true; } catch {}
                  // single-click to select (store full object + id)
                  setSelectedSymbol(placed);
                  setSelectedSymbolId(placed.id);
                  setSelectedPinId(null);
                }}
                onDblClick={(e) => {
                  try { e.cancelBubble = true; } catch {}
                  // also support double-click selection
                  setSelectedSymbol(placed);
                  setSelectedSymbolId(placed.id);
                  setSelectedPinId(null);
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

            <SymbolPreviewCanvas
              symbolData={placed.symbolData?.unit ?? placed.symbolData}
              selected={selectedSymbolId === placed.id}
              selectedPinId={selectedPinId}
              selectedPinIndex={selectedPinId ? ((placed.pins || []).findIndex((pp: any) => pp.id === selectedPinId)) : null}
              ownerId={placed.id}
            />

            {(() => {
              // flatten original raw pin definitions from the symbol so we can
              // detect per-pin NC names. The placed.pins array was created from
              // the flattened pin list in the same order, so indices align.
              const units = placed.symbolData?.unit ?? placed.symbolData ?? [];
              const rawPins: any[] = [];
              if (Array.isArray(units)) {
                units.forEach((u: any) => {
                  if (Array.isArray(u.pin)) rawPins.push(...u.pin);
                });
              }

              return (Array.isArray(placed.pins) ? placed.pins : []).map((p: any, idx: number) => {
                // Hide overlay if any wire endpoint is connected to this pin
                const isConnected = (wires || []).some((w: any) =>
                  w.points.some((pt: any) => pt.pinId === p.id)
                ) || p.connected;
                if (isConnected) return null;

                // If the original pin name indicates NC, skip rendering the circle
                const rawPin = rawPins[idx];
                if (rawPin && isPinNoConnect(rawPin)) return null;

                return (
                  <Group
                    key={p?.id ?? crypto.randomUUID()}
                    // Use local offsets (offsetX/Y) so the marker center aligns
                    // exactly with the pin outer endpoint drawn by SymbolPreviewCanvas.
                    x={(p?.offsetX ?? ((p?.x ?? 0) - (placed.position?.x ?? 0)))}
                    y={(p?.offsetY ?? ((p?.y ?? 0) - (placed.position?.y ?? 0)))}
                  >
                    {/* Single small visible marker (reduced weight) - border only */}
                    <Circle
                      radius={2.6 / scale}
                      fill="transparent"
                      stroke="#c2102a"
                      strokeWidth={1.2 / scale}
                      listening={false}
                    />

                    {/* Invisible larger hit area for easier interactions; handle wire connect on click */}
                    <Circle
                      radius={12 / scale}
                      fill="transparent"
                      listening={true}
                      hitStrokeWidth={20 / scale}
                      opacity={0}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'crosshair';
                        window.dispatchEvent(new CustomEvent('hover-pin', { detail: { pinId: p.id, x: p.x, y: p.y } }));
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                        window.dispatchEvent(new CustomEvent('leave-pin', { detail: { pinId: p.id } }));
                      }}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        window.dispatchEvent(new CustomEvent('connect-wire-to-pin', { detail: { pinId: p.id, x: p.x, y: p.y } }));
                        // also mark this pin as selected so preview can highlight it
                        window.dispatchEvent(new CustomEvent('select-pin', { detail: { pinId: p.id } }));
                      }}
                    />
                  </Group>
                );
              });
            })()}
          </Group>
        );
      })}
    </Layer>
  );
}
