import { useEffect, useState } from 'react';
import { Layer, Group, Circle } from 'react-konva';
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
  }, []);

  const { camera, zoom, viewportCenter } = useCameraViewport();
  
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
                  const x = p.offsetX ?? ((p.x ?? 0) - (placed.position?.x ?? 0));
                  const y = p.offsetY ?? ((p.y ?? 0) - (placed.position?.y ?? 0));
                  return (
                    <Circle
                      key={p.id}
                      x={x}
                      y={y}
                      radius={8}
                      fill="transparent"
                      listening={true}
                      onMouseEnter={(e) => {
                        try { e.cancelBubble = true; } catch {}
                        window.dispatchEvent(new CustomEvent('hover-pin', { detail: { pinId: p.id, x: p.x, y: p.y } }));
                      }}
                      onMouseLeave={(e) => {
                        try { e.cancelBubble = true; } catch {}
                        window.dispatchEvent(new CustomEvent('leave-pin', { detail: { pinId: p.id } }));
                      }}
                      onClick={(e) => {
                        try { e.cancelBubble = true; } catch {}
                        window.dispatchEvent(new CustomEvent('connect-wire-to-pin', { detail: { pinId: p.id, x: p.x, y: p.y } }));
                        window.dispatchEvent(new CustomEvent('select-pin', { detail: { pinId: p.id } }));
                      }}
                    />
                  );
                })}
              </Group>
            );
          })}
        </Layer>
      </CanvasStage>
    </div>
  );
}

