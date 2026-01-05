import { useEffect, useState, useRef } from 'react';
import { Layer, Group, Circle, Rect } from 'react-konva';
import { PIN_HIGHLIGHT_COLOR, PIN_HIGHLIGHT_STROKE, PIN_HIGHLIGHT_STROKE_WIDTH, PIN_HIGHLIGHT_RADIUS_OFFSET, PIN_HIT_RADIUS, PIN_HIGHLIGHT_OPACITY } from '../constant';
import { usePlacedSymbol } from '../context/PlacedSymbolContext';
import { useTool } from '../context/LeftToolbarContext';
import { useSymbol } from '../context/SymbolContext';
import { SymbolPreviewCanvas } from './SymbolPreviewCanvas';
import { useCameraViewport } from './canvas/CameraViewPort';
import CanvasStage from './CanvaStage';

export default function PlacedSymbolsRenderer() {
  const { placedSymbols, updatePlacedSymbol, livePinPositionsRef, removePlacedSymbol } = usePlacedSymbol();
  const { selectedSymbol, setSelectedSymbol } = useSymbol();
  const { tool } = useTool();
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    try { console.info('[PlacedSymbolsRenderer] placedSymbols changed', { count: Array.isArray(placedSymbols) ? placedSymbols.length : 0, ids: Array.isArray(placedSymbols) ? placedSymbols.slice(0,5).map((p:any)=>p.id) : null }); } catch (e) {}
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [placedSymbols, livePinPositionsRef]);

  const { camera, zoom, viewportCenter, screenToWorld } = useCameraViewport();
  
  // Delete selected symbol with Delete/Backspace
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        try {
          if (selectedSymbol && typeof removePlacedSymbol === 'function') {
            removePlacedSymbol(selectedSymbol.id);
            setSelectedSymbol(null);
          }
        } catch (err) {
          // ignore
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSymbol, removePlacedSymbol, setSelectedSymbol]);

  const computePlacedBBox = (placed: any) => {
    try {
      const unit = placed.symbolData?.unit ?? placed.symbolData;
      if (!unit || !Array.isArray(unit)) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const add = (x: number, y: number) => {
        const sx = x; const sy = y;
        if (sx < minX) minX = sx; if (sy < minY) minY = sy; if (sx > maxX) maxX = sx; if (sy > maxY) maxY = sy;
      };
      for (const u of unit) {
        if (Array.isArray(u.graphics)) {
          for (const g of u.graphics) {
            if (!g || !g.kind) continue;
            if (g.kind === 'Rectangle') {
              const { start, end } = g.data; add(start[0], start[1]); add(end[0], end[1]);
            } else if (g.kind === 'Polyline') {
              const raw = g.data?.pts?.xy || []; raw.forEach((pt: any) => add(pt[0], pt[1]));
            } else if (g.kind === 'Circle' || g.kind === 'circle') {
              const cx = Number(g.data?.cx ?? g.cx ?? g.x ?? 0); const cy = Number(g.data?.cy ?? g.cy ?? g.y ?? 0); const r = Number(g.data?.r ?? g.r ?? g.radius ?? 0);
              add(cx - r, cy - r); add(cx + r, cy + r);
            }
          }
        }
        if (Array.isArray(u.pin)) {
          for (const p of u.pin) {
            add(p.at[0], p.at[1]);
          }
        }
      }
      if (minX === Infinity) return null;
      // account for placed.position offset
      const pos = placed.position || { x: 0, y: 0 };
      return { minX: minX + pos.x, minY: minY + pos.y, maxX: maxX + pos.x, maxY: maxY + pos.y };
    } catch (err) { return null; }
  };

  const handleMouseDown = (e: any) => {
    try {
      // First try to find the clicked Group/node by walking the Konva node tree
      let node: any = e.target as any;
      let foundId: string | undefined;
      while (node) {
        try {
          if (typeof node.id === 'function') {
            const id = node.id();
            if (id && placedSymbols.find((p: any) => p.id === id)) { foundId = id; break; }
          } else if (node.attrs && node.attrs.id) {
            const id = node.attrs.id;
            if (id && placedSymbols.find((p: any) => p.id === id)) { foundId = id; break; }
          }
        } catch (err) {}
        node = node.getParent ? node.getParent() : null;
      }

      if (foundId) {
        // Click landed on a placed symbol Group -> select that symbol
        try { const ps = placedSymbols.find((p: any) => p.id === foundId); if (ps) setSelectedSymbol(ps); } catch {}
        return;
      }

      // Fallback: perform world-space bbox hit-test using the event's client coords
      const evt = e?.evt ?? (e as any);
      const cx = evt.clientX; const cy = evt.clientY;
      if (typeof cx === 'number' && typeof cy === 'number') {
        const world = screenToWorld({ x: cx, y: cy });
        // find topmost placed symbol whose bbox contains the world point
        for (let i = placedSymbols.length - 1; i >= 0; i--) {
          const placed = placedSymbols[i];
          const bb = computePlacedBBox(placed);
          if (!bb) continue;
          if (world.x >= bb.minX && world.x <= bb.maxX && world.y >= bb.minY && world.y <= bb.maxY) {
            try { setSelectedSymbol(placed); } catch {}
            return;
          }
        }
      }

      // If we reach here, nothing selected -> deselect
      try { setSelectedSymbol(null); } catch (err) {}
    } catch (err) {
      // ignore
    }
  };

  // Manual drag state for fallback dragging when Konva draggable doesn't fire
  const manualDragRef = useRef<{ id: string | null; offsetX: number; offsetY: number; initX?: number; initY?: number } | null>(null);
  const startManualDrag = (placed: any, clientX: number, clientY: number) => {
    try {
      const world = screenToWorld({ x: clientX, y: clientY });
      const pos = placed.position || { x: 0, y: 0 };
      const offsetX = world.x - pos.x;
      const offsetY = world.y - pos.y;
      manualDragRef.current = { id: placed.id, offsetX, offsetY, initX: pos.x, initY: pos.y };
      
      let lastPos: { x: number; y: number } | null = null;
      const onMove = (ev: PointerEvent) => {
        try {
          const w = screenToWorld({ x: ev.clientX, y: ev.clientY });
          const st = manualDragRef.current;
          if (!st || !st.id) return;
          const nx = w.x - st.offsetX; const ny = w.y - st.offsetY;
          try { updatePlacedSymbol(st.id, { position: { x: nx, y: ny } }); } catch (err) { /* ignore */ }
          lastPos = { x: nx, y: ny };
          // update livePinPositionsRef for immediate snap/hover accuracy
          try {
            const ref = livePinPositionsRef as any;
            if (ref && ref.current) {
              const placedObj = placedSymbols.find((p: any) => p.id === st.id);
              if (placedObj) {
                ref.current[st.id] = ref.current[st.id] || {};
                for (const p of (placedObj.pins || [])) {
                  const ox = p.offsetX ?? ((p.x ?? 0) - (placedObj.position?.x ?? 0));
                  const oy = p.offsetY ?? ((p.y ?? 0) - (placedObj.position?.y ?? 0));
                  ref.current[st.id][p.id] = { x: nx + ox, y: ny + oy };
                }
              }
            }
          } catch (err) {}
        } catch (err) {}
      };
        const onUp = (_ev: PointerEvent) => {
        try {
          // dispatch final placed-symbol-moved with pin absolute positions
          const st = manualDragRef.current;
          if (st && st.id && lastPos) {
            try {
              const placedObj = placedSymbols.find((p: any) => p.id === st.id) || placed;
              const pins = Array.isArray(placedObj.pins) ? placedObj.pins.map((p: any) => {
                const ox = p.offsetX ?? ((p.x ?? 0) - (placedObj.position?.x ?? 0));
                const oy = p.offsetY ?? ((p.y ?? 0) - (placedObj.position?.y ?? 0));
                const newX = lastPos!.x + ox;
                const newY = lastPos!.y + oy;
                const prevX = (st.initX ?? (placedObj.position?.x ?? 0)) + ox;
                const prevY = (st.initY ?? (placedObj.position?.y ?? 0)) + oy;
                return { id: p.id, x: newX, y: newY, prevX, prevY };
              }) : [];
              try { window.dispatchEvent(new CustomEvent('placed-symbol-moved', { detail: { placedId: st.id, pins } })); } catch (err) {}
            } catch (err) {}
          }
        } catch {}
        try { manualDragRef.current = null; } catch {}
        try { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); } catch {}
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    } catch (err) {}
  };

  // Hovered pin state for rendering highlight
  const [hoveredPin, setHoveredPin] = useState<{ x: number; y: number;  pinId?: string } | null>(null);
   console.log("[PlacedSymbolsRenderer] hoveredPin ->", hoveredPin);
  useEffect(() => {
    // short-lived debug: dump a sample of livePinPositionsRef.current for 10s
    try {
      const ref = (livePinPositionsRef as any)?.current || {};
      const sample = {} as any;
      let i = 0;
      for (const sid of Object.keys(ref || {})) {
        if (i++ > 5) break;
        sample[sid] = Object.keys(ref[sid] || {}).slice(0, 5).reduce((acc: any, pid: string) => { acc[pid] = ref[sid][pid]; return acc; }, {});
      }
      // sample captured for dev only; suppressed in production
    } catch (err) { /* suppressed */ }
    // Ensure livePinPositionsRef is initialized from stored placedSymbols so
    // hover detection works before any drag events occur.
    try {
      // diagnostic: print placedSymbols ids and pin counts
      try {
        // placedSymbols diagnostic suppressed
      } catch (err) { /* suppressed */ }
      const ref = (livePinPositionsRef as any);
      console.log
      if (ref && ref.current && Array.isArray(placedSymbols)) {
        let total = 0;
        for (const placed of placedSymbols) {
          const pos = placed.position || { x: 0, y: 0 };
          ref.current[placed.id] = ref.current[placed.id] || {};
          for (const p of (placed.pins || [])) {
            const ox = p.offsetX ?? ((p.x ?? 0) - (pos.x ?? 0));
            const oy = p.offsetY ?? ((p.y ?? 0) - (pos.y ?? 0));
            ref.current[placed.id][p.id] = { x: (pos.x ?? 0) + ox, y: (pos.y ?? 0) + oy };
            total++;
          }
        }
        // initialized livePinPositionsRef populated (debug suppressed)
      }
    } catch (err) { /* suppressed */ }

      const onHover = (ev: Event) => {
      try {
        const d: any = (ev as CustomEvent).detail || {};
        if (typeof d.x === 'number' && typeof d.y === 'number') {
          // debug: log hover events to help diagnose missing highlight
          try { /* hover-pin event suppressed */ } catch (err) {}
          setHoveredPin({ x: d.x, y: d.y, pinId: d.pinId });
        }
      } catch (err) {}
    };
    const onLeave = (_ev: Event) => { setHoveredPin(null); };
    window.addEventListener('hover-pin', onHover as EventListener);
    window.addEventListener('leave-pin', onLeave as EventListener);
    return () => {
      window.removeEventListener('hover-pin', onHover as EventListener);
      window.removeEventListener('leave-pin', onLeave as EventListener);
    };
  }, []);

  // Fallback hover detection using mouse position -> world coords -> livePinPositionsRef
  useEffect(() => {
    // Fallback hover detection (no local debug vars required)
      const onMove = (ev: MouseEvent) => {
      try {
        const el = document.querySelector('main[role="presentation"]') as HTMLElement | null;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const local = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
        // Use screen-space hit testing so zoom doesn't affect detection
          const lp = (livePinPositionsRef as any)?.current || {};
          let best: any = null; let bestDistPx = Infinity;
          // count total live pins for diagnostics
          let lpCount = 0;
          for (const sid of Object.keys(lp || {})) lpCount += Object.keys(lp[sid] || {}).length;
          const tolPx = (PIN_HIT_RADIUS + PIN_HIGHLIGHT_RADIUS_OFFSET + 0.4) * zoom; // convert mm -> pixels
        for (const symId of Object.keys(lp || {})) {
          const pins = lp[symId] || {};
          for (const pid of Object.keys(pins || {})) {
            const p = pins[pid]; if (!p) continue;
            const screenX = viewportCenter.x + (p.x - camera.x) * zoom;
            const screenY = viewportCenter.y + (p.y - camera.y) * zoom;
            const dx = screenX - local.x; const dy = screenY - local.y;
            const dpx = Math.hypot(dx, dy);
              if (dpx < bestDistPx) { 
                  bestDistPx = dpx;
                  best = { 
                  x: p.x, y: p.y, 
                  pinId: pid
                };
               }
          }
        }
          if (lpCount === 0) {
            // no live pins available
          }
          if (best && bestDistPx <= tolPx) {
            setHoveredPin({ x: best.x, y: best.y, pinId: best.pinId });
          } else {
            // log near-misses to help tune threshold (only when there are pins)
            if (best && lpCount > 0 && bestDistPx <= tolPx * 2) {
              // near-miss suppressed
            }
            setHoveredPin(null);
          }
      } catch (err) { /* suppressed */ }
    };
    // Attach both mousemove and pointermove for broader device coverage
    window.addEventListener('mousemove', onMove, { passive: true } as any);
    window.addEventListener('pointermove', onMove as any, { passive: true } as any);
    return () => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('pointermove', onMove as any);
    };
  }, [screenToWorld, livePinPositionsRef]);

  // Global pointerdown fallback: when Konva events don't reach group handlers
  // (some environments may suppress Konva events), use a window-level listener
  // to perform a world-space bbox hit-test and select the topmost symbol.
  useEffect(() => {
    const onPointerDown = (ev: PointerEvent) => {
      try {
        const cx = ev.clientX, cy = ev.clientY;
        if (typeof cx !== 'number' || typeof cy !== 'number') return;
        const world = screenToWorld({ x: cx, y: cy });
        
        for (let i = (placedSymbols || []).length - 1; i >= 0; i--) {
          const placed = placedSymbols[i];
          const bb = computePlacedBBox(placed);
          if (!bb) continue;
          if (world.x >= bb.minX && world.x <= bb.maxX && world.y >= bb.minY && world.y <= bb.maxY) {
              try { setSelectedSymbol(placed); } catch (err) {}
              // If the clicked symbol is the selected one and tool allows, start manual drag here
              try {
                if (tool !== 'wire') {
                  startManualDrag(placed, cx, cy);
                }
              } catch (err) {}
              return;
            }
        }
        try { setSelectedSymbol(null); } catch (err) {}
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('pointerdown', onPointerDown, { passive: false });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [placedSymbols, screenToWorld, setSelectedSymbol, tool]);


  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
      <CanvasStage width={size.width} height={size.height} zoom={zoom} viewportCenter={viewportCenter} camera={camera} onMouseDown={handleMouseDown}>
        <Layer>
          {Array.isArray(placedSymbols) && placedSymbols.map((placed: any) => {
            const pos = placed.position || { x: 0, y: 0 };
            const isSelected = Boolean(selectedSymbol && selectedSymbol.id === placed.id);
            return (
              <Group
                id={placed.id}
                key={placed.id}
                x={pos.x}
                y={pos.y}
                rotation={placed.rotation ?? 0}
                listening={true}
                // Allow dragging (start only when user interacts). We still mark
                // the symbol as selected on interaction so other UI can react.
                draggable={isSelected && tool !== 'wire'}
                onMouseDown={(e:any) => {
                  try { e.cancelBubble = true; } catch (err) {}
                  try {
                    if (tool === 'wire') return;
                    const evt = e?.evt ?? e;
                    const clientX = evt?.clientX ?? (evt?.touches && evt.touches[0]?.clientX) ?? null;
                    const clientY = evt?.clientY ?? (evt?.touches && evt.touches[0]?.clientY) ?? null;
                    if (!isSelected) {
                      setSelectedSymbol(placed);
                          // start native Konva drag if possible, otherwise fall back to manual drag
                          try {
                            requestAnimationFrame(() => {
                              try {
                                const stage = (e && e.target && typeof e.target.getStage === 'function') ? e.target.getStage() : null;
                                const node = stage ? stage.findOne('#' + placed.id) : null;
                                if (node && typeof node.startDrag === 'function') {
                                  // ensure draggable flag is enabled on the Konva node then start drag
                                  try { node.draggable(true); } catch {}
                                    try { node.startDrag();
                                      // if native drag didn't begin, fallback to manual drag shortly after
                                      setTimeout(() => {
                                        try {
                                          const n2 = stage ? stage.findOne('#' + placed.id) : null;
                                          if (!n2 || (typeof n2.isDragging === 'function' && !n2.isDragging())) {
                                            if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY);
                                          }
                                        } catch (err) {}
                                      }, 60);
                                      return;
                                    } catch {}
                                }
                              } catch (err) {}
                              if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY);
                            });
                          } catch {}
                      return;
                    }
                        // already selected -> try native Konva drag, fallback to manual
                        try {
                          const stage = (e && e.target && typeof e.target.getStage === 'function') ? e.target.getStage() : null;
                          const node = stage ? stage.findOne('#' + placed.id) : null;
                          if (node && typeof node.startDrag === 'function') {
                              try { node.startDrag();
                                setTimeout(() => {
                                  try {
                                    const n2 = stage ? stage.findOne('#' + placed.id) : null;
                                    if (!n2 || (typeof n2.isDragging === 'function' && !n2.isDragging())) {
                                      if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY);
                                    }
                                  } catch (err) {}
                                }, 60);
                              } catch (err) { if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY); }
                          } else {
                            if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY);
                          }
                        } catch (err) { if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY); }
                  } catch (err) {}
                }}
                onTouchStart={(e:any) => {
                  try { e.cancelBubble = true; } catch (err) {}
                  try {
                    if (tool === 'wire') return;
                    const touch = (e?.evt?.touches && e.evt.touches[0]) || (e?.touches && e.touches[0]);
                    const clientX = touch?.clientX ?? null;
                    const clientY = touch?.clientY ?? null;
                    if (!isSelected) {
                      setSelectedSymbol(placed);
                        try {
                          requestAnimationFrame(() => {
                            try {
                              const stage = (e && e.target && typeof e.target.getStage === 'function') ? e.target.getStage() : null;
                              const node = stage ? stage.findOne('#' + placed.id) : null;
                              if (node && typeof node.startDrag === 'function') {
                                try { node.draggable(true); } catch {}
                                try { node.startDrag();
                                  setTimeout(() => {
                                    try {
                                      const n2 = stage ? stage.findOne('#' + placed.id) : null;
                                      if (!n2 || (typeof n2.isDragging === 'function' && !n2.isDragging())) {
                                        if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY);
                                      }
                                    } catch (err) {}
                                  }, 60);
                                  return;
                                } catch {}
                              }
                            } catch (err) {}
                            if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY);
                          });
                        } catch {}
                      return;
                    }
                      try {
                        const stage = (e && e.target && typeof e.target.getStage === 'function') ? e.target.getStage() : null;
                        const node = stage ? stage.findOne('#' + placed.id) : null;
                        if (node && typeof node.startDrag === 'function') {
                          try { node.startDrag();
                            setTimeout(() => {
                              try {
                                const n2 = stage ? stage.findOne('#' + placed.id) : null;
                                if (!n2 || (typeof n2.isDragging === 'function' && !n2.isDragging())) {
                                  if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY);
                                }
                              } catch (err) {}
                            }, 60);
                          } catch (err) { if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY); }
                        } else {
                          if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY);
                        }
                      } catch (err) { if (typeof clientX === 'number' && typeof clientY === 'number') startManualDrag(placed, clientX, clientY); }
                  } catch (err) {}
                }}
                // Keep double-click handlers for explicit selection as well
                onDblClick={(e:any) => { try{ e.cancelBubble = true }catch{}; setSelectedSymbol(placed); }}
                onDblTap={(e:any) => { try{ e.cancelBubble = true }catch{}; setSelectedSymbol(placed); }}
                onDragStart={(e:any) => {
                  try { e.cancelBubble = true; } catch {}
                  try { } catch {}
                }}
                onDragMove={(e:any) => {
                  // update live pin positions so routing preview can snap while dragging
                  try {
                    const nx = e.target.x(); const ny = e.target.y();
                    try { } catch {}
                    const pins = Array.isArray(placed.pins) ? placed.pins : [];
                    const ref = livePinPositionsRef as any;
                    if (ref && ref.current) {
                      ref.current[placed.id] = ref.current[placed.id] || {};
                      for (const p of pins) {
                        const ox = p.offsetX ?? ((p.x ?? 0) - (placed.position?.x ?? 0));
                        const oy = p.offsetY ?? ((p.y ?? 0) - (placed.position?.y ?? 0));
                        ref.current[placed.id][p.id] = { 
                          x: nx + ox, y: ny + oy,
                        };
                      }
                    }
                  } catch (err) {}
                }}
                onDragEnd={(e:any) => {
                  try { e.cancelBubble = true; } catch {}
                  try { } catch {}
                  try {
                    const nx = e.target.x(); const ny = e.target.y();
                    // update placed symbol master state
                    updatePlacedSymbol(placed.id, { position: { x: nx, y: ny } });
                    // also update absolute pin coords inside the placed object
                    if (Array.isArray(placed.pins)) {
                      const newPins = placed.pins.map((p: any) => {
                        const ox = p.offsetX ?? ((p.x ?? 0) - (placed.position?.x ?? 0));
                        const oy = p.offsetY ?? ((p.y ?? 0) - (placed.position?.y ?? 0));
                        return { ...p, x: nx + ox, y: ny + oy };
                      });
                      updatePlacedSymbol(placed.id, { pins: newPins });
                      try {
                        const prevPos = placed.position || { x: 0, y: 0 };
                        const pinsWithPrev = newPins.map((pp: any) => ({ id: pp.id, x: pp.x, y: pp.y, prevX: (prevPos.x + ((pp.offsetX ?? ((pp.x ?? 0) - (placed.position?.x ?? 0))))), prevY: (prevPos.y + ((pp.offsetY ?? ((pp.y ?? 0) - (placed.position?.y ?? 0)))) ) }));
                        window.dispatchEvent(new CustomEvent('placed-symbol-moved', { detail: { placedId: placed.id, pins: pinsWithPrev } }));
                      } catch (err) {}
                    }
                    // update livePinPositionsRef with final positions
                    try {
                      const ref = livePinPositionsRef as any;
                      if (ref && ref.current) {
                        ref.current[placed.id] = ref.current[placed.id] || {};
                        for (const p of (placed.pins || [])) {
                          const ox = p.offsetX ?? ((p.x ?? 0) - (placed.position?.x ?? 0));
                          const oy = p.offsetY ?? ((p.y ?? 0) - (placed.position?.y ?? 0));
                          ref.current[placed.id][p.id] = { x: nx + ox, y: ny + oy };
                        }
                      }
                    } catch (err) {}
                  } catch (err) {
                    // ignore
                  }
                }}
              >
                {/* Render symbol using existing Konva-based preview canvas */}
                {/* @ts-ignore - SymbolPreviewCanvas uses Konva primitives */}
                <SymbolPreviewCanvas symbolData={placed.symbolData?.unit ?? placed.symbolData} selected={isSelected} ownerId={placed.id} />

                {/* Invisible bbox overlay to reliably receive clicks/selects when child shapes don't bubble events */}
                {(() => {
                  const bb = computePlacedBBox(placed);
                  if (!bb) return null;
                  const localX = bb.minX - (placed.position?.x ?? 0);
                  const localY = bb.minY - (placed.position?.y ?? 0);
                  const w = bb.maxX - bb.minX; const h = bb.maxY - bb.minY;
                  return (
                    <Rect
                      x={localX}
                      y={localY}
                      width={w}
                      height={h}
                      fill={'transparent'}
                      listening={true}
                      onMouseDown={(e:any) => { try { e.cancelBubble = true; } catch {} try { setSelectedSymbol(placed); } catch {} }}
                    />
                  );
                })()}

                {/* Render invisible hit circles for each placed pin so wires can start/finish */}
                {(Array.isArray(placed.pins) ? placed.pins : []).map((p: any) => {
                  // offsetX/Y are relative offsets where the pin end is drawn
                  const relX = p.offsetX ?? ((p.x ?? 0) - (placed.position?.x ?? 0));
                  const relY = p.offsetY ?? ((p.y ?? 0) - (placed.position?.y ?? 0));
                  const absX = (placed.position?.x ?? 0) + relX;
                  const absY = (placed.position?.y ?? 0) + relY;
                  return (
                      <Circle
                        key={p.id}
                        x={relX}
                        y={relY}
                        radius={PIN_HIT_RADIUS}
                        fill="transparent"
                        listening={true}
                      onMouseEnter={(e) => {
                        try { e.cancelBubble = true; } catch {}
                        window.dispatchEvent(new CustomEvent('hover-pin', { detail: { pinId: p.id, x: absX, y: absY } }));
                      }}
                      onMouseLeave={(e) => {
                        try { e.cancelBubble = true; } catch {}
                        window.dispatchEvent(new CustomEvent('leave-pin', { detail: { pinId: p.id } }));
                      }}
                      onClick={(e) => {
                        try { e.cancelBubble = true; } catch {}
                        window.dispatchEvent(new CustomEvent('connect-wire-to-pin', { detail: { pinId: p.id, x: absX, y: absY } }));
                        window.dispatchEvent(new CustomEvent('select-pin', { detail: { pinId: p.id } }));
                      }}
                    />
                  );
                })}

              </Group>
            );
          })}
          {/* Pin hover highlight (render on top of all placed symbols) */}
         
          
          {hoveredPin && (
            <Circle
              x={hoveredPin.x}
              y={hoveredPin.y}
              radius={PIN_HIT_RADIUS + PIN_HIGHLIGHT_RADIUS_OFFSET}
              stroke={PIN_HIGHLIGHT_STROKE}
              strokeWidth={Math.max(0.6, PIN_HIGHLIGHT_STROKE_WIDTH)}
              fill={PIN_HIGHLIGHT_COLOR}
              opacity={PIN_HIGHLIGHT_OPACITY}
              shadowBlur={6}
              listening={false}
            />
          )}
        </Layer>
      </CanvasStage>
    </div>
  );
}

