import { useEffect, useState } from 'react';
import { Layer, Group, Circle } from 'react-konva';
import { PIN_HIGHLIGHT_COLOR, PIN_HIGHLIGHT_STROKE, PIN_HIGHLIGHT_STROKE_WIDTH, PIN_HIGHLIGHT_RADIUS_OFFSET, PIN_HIT_RADIUS, PIN_HIGHLIGHT_OPACITY } from '../constant';
import { usePlacedSymbol } from '../context/PlacedSymbolContext';
import { useSymbol } from '../context/SymbolContext';
import { SymbolPreviewCanvas } from './SymbolPreviewCanvas';
import { useCameraViewport } from './canvas/CameraViewPort';
import CanvasStage from './CanvaStage';

export default function PlacedSymbolsRenderer() {
  const { placedSymbols, updatePlacedSymbol, livePinPositionsRef, removePlacedSymbol } = usePlacedSymbol();
  const { selectedSymbol, setSelectedSymbol } = useSymbol();
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
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

  const handleMouseDown = (e: any) => {
    // Walk up Konva node tree to see if click landed on a placed symbol Group
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

    if (!foundId) {
      // Clicked outside any placed symbol -> deselect
      try { setSelectedSymbol(null); } catch (err) {}
    }
  };

  // Hovered pin state for rendering highlight
  const [hoveredPin, setHoveredPin] = useState<{ x: number; y: number; pinId?: string } | null>(null);

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
        const debugList: any = (Array.isArray(placedSymbols) ? placedSymbols.map((ps: any) => ({ id: ps.id, pins: Array.isArray(ps.pins) ? ps.pins.length : 0 })) : placedSymbols);
        // placedSymbols diagnostic suppressed
      } catch (err) { /* suppressed */ }
      const ref = (livePinPositionsRef as any);
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
    let last = { x: NaN, y: NaN };
    // detection threshold: pin radius + highlight offset + small tolerance
    const THRESH = PIN_HIT_RADIUS + PIN_HIGHLIGHT_RADIUS_OFFSET + 0.4; // mm
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
              if (dpx < bestDistPx) { bestDistPx = dpx; best = { x: p.x, y: p.y, pinId: pid }; }
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
                draggable={true}
                onMouseDown={(e:any) => {
                  try { e.cancelBubble = true; } catch (err) {}
                  try { setSelectedSymbol(placed); } catch (err) {}
                  try { if (e.target && typeof e.target.startDrag === 'function') e.target.startDrag(); } catch (err) {}
                }}
                onTouchStart={(e:any) => {
                  try { e.cancelBubble = true; } catch (err) {}
                  try { setSelectedSymbol(placed); } catch (err) {}
                  try { if (e.target && typeof e.target.startDrag === 'function') e.target.startDrag(); } catch (err) {}
                }}
                // Keep double-click handlers for explicit selection as well
                onDblClick={(e:any) => { try{ e.cancelBubble = true }catch{}; setSelectedSymbol(placed); }}
                onDblTap={(e:any) => { try{ e.cancelBubble = true }catch{}; setSelectedSymbol(placed); }}
                onDragStart={(e:any) => {
                  try { e.cancelBubble = true; } catch {}
                }}
                onDragMove={(e:any) => {
                  // update live pin positions so routing preview can snap while dragging
                  try {
                    const nx = e.target.x(); const ny = e.target.y();
                    const pins = Array.isArray(placed.pins) ? placed.pins : [];
                    const ref = livePinPositionsRef as any;
                    if (ref && ref.current) {
                      ref.current[placed.id] = ref.current[placed.id] || {};
                      for (const p of pins) {
                        const ox = p.offsetX ?? ((p.x ?? 0) - (placed.position?.x ?? 0));
                        const oy = p.offsetY ?? ((p.y ?? 0) - (placed.position?.y ?? 0));
                        ref.current[placed.id][p.id] = { x: nx + ox, y: ny + oy };
                      }
                    }
                  } catch (err) {}
                }}
                onDragEnd={(e:any) => {
                  try { e.cancelBubble = true; } catch {}
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

