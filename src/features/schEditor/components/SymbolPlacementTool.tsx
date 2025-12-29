import { useEffect, useState, useRef } from 'react';
import { Layer, Group } from 'react-konva';
import { useSymbol } from '../context/SymbolContext';
import { useTool } from '../context/LeftToolbarContext';
// use built-in UUID when available
import SymbolPreviewCanvas from './SymbolPreviewCanvas';
import CanvasStage from './CanvaStage';
import { useCameraViewport } from './canvas/CameraViewPort';
import { useRouting } from '../context/WireContext';

const SCALE = 6;

export default function SymbolPlacementTool() {
  const { tool } = useTool();
  const { pendingSymbol, setPendingSymbol, addPlacedSymbol, setSelectedSymbol } = useSymbol();

  const [pos, setPos] = useState({ x: 0, y: 0 }); // world coordinates
  const [_dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  
  const { screenToWorld, viewportCenter, camera, zoom } = useCameraViewport();
  const routing = useRouting ? useRouting() : null;
  const armedAtRef = useRef<number | null>(null);

  // compute bbox center so preview aligns same as placed renderer
  const computeBBoxCenter = (unit: any[]) => {
    if (!unit || !Array.isArray(unit)) return { cx: 0, cy: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    unit.forEach((u: any) => {
      if (Array.isArray(u.graphics)) {
        u.graphics.forEach((g: any) => {
          if (!g || !g.kind) return;
          if (g.kind === 'Rectangle') {
            const { start, end } = g.data;
            minX = Math.min(minX, start[0]*SCALE, end[0]*SCALE);
            minY = Math.min(minY, start[1]*SCALE, end[1]*SCALE);
            maxX = Math.max(maxX, start[0]*SCALE, end[0]*SCALE);
            maxY = Math.max(maxY, start[1]*SCALE, end[1]*SCALE);
          } else if (g.kind === 'Polyline') {
            const raw = g.data?.pts?.xy || [];
            raw.forEach((pt: any) => { minX = Math.min(minX, pt[0]*SCALE); minY = Math.min(minY, pt[1]*SCALE); maxX = Math.max(maxX, pt[0]*SCALE); maxY = Math.max(maxY, pt[1]*SCALE); });
          } else if (g.kind === 'Circle' || g.kind === 'circle') {
            const cx = (g.data?.cx ?? g.data?.x ?? 0) * SCALE;
            const cy = (g.data?.cy ?? g.data?.y ?? 0) * SCALE;
            const r = (g.data?.r ?? g.data?.radius ?? 0) * SCALE;
            minX = Math.min(minX, cx - r); minY = Math.min(minY, cy - r); maxX = Math.max(maxX, cx + r); maxY = Math.max(maxY, cy + r);
          }
        });
      }
      if (Array.isArray(u.pin)) {
        u.pin.forEach((p: any) => { minX = Math.min(minX, p.at[0]*SCALE); minY = Math.min(minY, p.at[1]*SCALE); maxX = Math.max(maxX, p.at[0]*SCALE); maxY = Math.max(maxY, p.at[1]*SCALE); });
      }
    });
    if (minX === Infinity) return { cx: 0, cy: 0 };
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  };

    useEffect(() => {
    if (!pendingSymbol) return;
    const onMove = (e: MouseEvent) => {
      const world = screenToWorld({ x: e.clientX, y: e.clientY });
      setPos(world);
    };
    const onClick = (_e: MouseEvent) => {
      // place symbol at current pos
      if (!pendingSymbol) return;
      // ignore the click that closed the modal: only accept clicks after a short delay
      if (armedAtRef.current && Date.now() - armedAtRef.current < 250) {
        // consume the click but do not place
        armedAtRef.current = null;
        return;
      }
      if (draggingRef.current) return; // ignore click if user was dragging
      const unit = pendingSymbol; // expected to be unit array
      const id = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2,9);
      const bboxCenter = computeBBoxCenter(unit);

          const pins: any[] = [];
          // build pin entries with absolute coords and offsets
          unit.forEach((u: any) => {
            if (!Array.isArray(u.pin)) return;
            u.pin.forEach((p: any, _idx: number) => {
              const px = (p.at[0] * SCALE) - bboxCenter.cx;
              const py = (p.at[1] * SCALE) - bboxCenter.cy;
              const absX = pos.x + px;
              const absY = pos.y + py;
              pins.push({ id: `${id}-pin-${pins.length}`, x: absX, y: absY, offsetX: px, offsetY: py, number: p.number, name: p.name });
            });
          });

      const placed = {
        id,
        symbolData: { unit: unit },
        position: { x: pos.x, y: pos.y }, // world coords
        pins,
        rotation: 0,
      };

      addPlacedSymbol(placed);
      setSelectedSymbol(placed);
      // If the routing tool is active and drawing, attempt to connect the
      // in-progress wire to any placed pin that's near the current preview
      // endpoint. This mirrors the user's clicking-on-pin behavior but is
      // triggered automatically when placing a symbol under a live wire.
      try {
        const r = routing as any;
        if (r && r.isDrawing && Array.isArray(r.previewTracks) && r.previewTracks.length) {
          const last = r.previewTracks[r.previewTracks.length - 1];
          if (last) {
            // find nearest pin within threshold
            const THRESH = 8; // world units / same units used for hit circles
            let nearest: any = null;
            let bestDist = Infinity;
            for (const p of pins) {
              const dx = (p.x ?? 0) - last.x;
              const dy = (p.y ?? 0) - last.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < bestDist) { bestDist = d; nearest = p; }
            }
            if (nearest && bestDist <= THRESH) {
              window.dispatchEvent(new CustomEvent('connect-wire-to-pin', { detail: { pinId: nearest.id, x: nearest.x, y: nearest.y } }));
              window.dispatchEvent(new CustomEvent('select-pin', { detail: { pinId: nearest.id } }));
            }
          }
        }
      } catch (err) {
        // non-fatal: routing may not be available in some contexts
      }
      setPendingSymbol(null);
      armedAtRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('click', onClick);
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
          try { setPendingSymbol(null); } catch {}
        }
      };
      window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
        window.removeEventListener('keydown', onKey);
    };
  }, [pendingSymbol, pos.x, pos.y]);

    // When pendingSymbol is armed, initialize preview at the camera/world center
    useEffect(() => {
      if (!pendingSymbol) return;
      // place preview at camera center so user sees it immediately
      // record armed timestamp so we can ignore the modal-close click
      armedAtRef.current = Date.now();
      setPos({ x: camera.x, y: camera.y });
    }, [pendingSymbol, camera.x, camera.y]);
  if (tool !== 'symbol' || !pendingSymbol) return null;

  const width = window.innerWidth;
  const height = window.innerHeight;

  // compute preview pin absolute positions so preview canvas can dispatch
  // connect events with world coordinates while the symbol is being moved
  const previewPins: any[] = [];
  try {
    const unit = pendingSymbol;
    if (unit && Array.isArray(unit)) {
      const bboxCenter = computeBBoxCenter(unit);
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
      unit.forEach((u: any) => {
        if (!Array.isArray(u.pin)) return;
        u.pin.forEach((p: any) => {
          if (isPinNoConnect(p)) return; // mirror preview filtering
          const px = (p.at[0] * SCALE) - bboxCenter.cx;
          const py = (p.at[1] * SCALE) - bboxCenter.cy;
          const absX = pos.x + px;
          const absY = pos.y + py;
          previewPins.push({ id: `preview-pin-${previewPins.length}`, x: absX, y: absY, offsetX: px, offsetY: py, number: p.number, name: p.name });
        });
      });
    }
  } catch (e) {
    // ignore
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 70 }}>
      <CanvasStage width={width} height={height} zoom={zoom} viewportCenter={viewportCenter} camera={camera}>
        <Layer>
          <Group x={pos.x} y={pos.y} draggable onDragStart={() => { setDragging(true); draggingRef.current = true; }} onDragEnd={(e) => { setDragging(false); draggingRef.current = false; setPos({ x: e.target.x(), y: e.target.y() }); }}>
            {/* @ts-ignore */}
            <SymbolPreviewCanvas
              symbolData={pendingSymbol}
              selected={true}
              
              ownerId={'preview'}
              previewPins={previewPins}
              onPinClick={(pin: any, _idx: number) => {
                try { window.dispatchEvent(new CustomEvent('connect-wire-to-pin', { detail: { pinId: pin.id, x: pin.x, y: pin.y } })); } catch (e) {}
                try { window.dispatchEvent(new CustomEvent('select-pin', { detail: { pinId: pin.id } })); } catch (e) {}
              }}
            />
          </Group>
        </Layer>
      </CanvasStage>
    </div>
  );
}
