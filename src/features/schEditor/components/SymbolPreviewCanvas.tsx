import { useState } from 'react';
import { useRouting } from '../context/WireContext';
import { Group, Rect, Line, Text, Circle } from 'react-konva';

const SCALE = 6;

export const SymbolPreviewCanvas = ({ symbolData, selected = false, ownerId, previewPins, onPinClick }: any) => {
  if (!symbolData) return null;

  const data = Array.isArray(symbolData) ? symbolData : symbolData.unit ? symbolData.unit : symbolData;
  const units = Array.isArray(data) ? data : [];

  const graphicsData: any[] = [];
  const pinsData: any[] = [];
  units.forEach((u: any) => {
    if (Array.isArray(u.graphics)) graphicsData.push(...u.graphics);
    if (Array.isArray(u.pin)) pinsData.push(...u.pin);
  });

  // Detect no-connect symbols: if electrical_type is 'no_connect' or 'NC' we hide pins
  const isNoConnectSymbol = (() => {
    const raw = (symbolData?.electrical_type ?? symbolData?.electricalType ?? symbolData?.electrical?.type ?? '') as any;
    const v = (raw ?? '').toString().trim().toLowerCase();
    return /^(no[_-]?connect|nc)$/.test(v);
  })();
  const showPins = !isNoConnectSymbol;

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

  const visiblePins = showPins ? pinsData.filter((p) => !isPinNoConnect(p)) : [];

  // compute bounding boxes
  const bbox = (() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const add = (x: number, y: number) => {
      const sx = x * SCALE; const sy = y * SCALE;
      if (sx < minX) minX = sx; if (sy < minY) minY = sy; if (sx > maxX) maxX = sx; if (sy > maxY) maxY = sy;
    };
    graphicsData.forEach((g: any) => {
      if (!g || !g.kind) return;
      if (g.kind === 'Rectangle') {
        const { start, end } = g.data; add(start[0], start[1]); add(end[0], end[1]);
      } else if (g.kind === 'Polyline') {
        const raw = g.data?.pts?.xy || []; raw.forEach((pt: any) => add(pt[0], pt[1]));
      } else if (g.kind === 'Circle' || g.kind === 'circle') {
        const cx = g.data?.cx ?? g.data?.x ?? 0; const cy = g.data?.cy ?? g.data?.y ?? 0; const r = g.data?.r ?? g.data?.radius ?? 0;
        add(cx - (r || 0), cy - (r || 0)); add(cx + (r || 0), cy + (r || 0));
      }
    });
    if (showPins) {
      visiblePins.forEach((p: any) => { const [px, py] = p.at; add(px, py); const len = (p.length || 1) * SCALE * 1.6; const rot = p.at[2]; if (rot === 0) add(px + len / SCALE, py); else if (rot === 180) add(px - len / SCALE, py); else if (rot === 90) add(px, py + len / SCALE); else if (rot === 270) add(px, py - len / SCALE); });
    }
    if (minX === Infinity) return null; return { minX, minY, maxX, maxY };
  })();

  const gfxBounds = (() => {
    if (!graphicsData || graphicsData.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const addPoint = (x: number, y: number) => { const sx = x * SCALE; const sy = y * SCALE; if (sx < minX) minX = sx; if (sy < minY) minY = sy; if (sx > maxX) maxX = sx; if (sy > maxY) maxY = sy; };
    graphicsData.forEach((g: any) => {
      if (!g || !g.kind) return;
      if (g.kind === 'Rectangle') { const { start, end } = g.data; addPoint(start[0], start[1]); addPoint(end[0], end[1]); }
      else if (g.kind === 'Polyline') { const raw = g.data?.pts?.xy || []; raw.forEach((pt: any) => addPoint(pt[0], pt[1])); }
    });
    if (minX === Infinity) return null; return { minX, minY, maxX, maxY };
  })();

  // Renderers (graphics)
  const RenderGraphics = ({ g }: any) => {
    if (!g || !g.kind) return null;
    if (g.kind === 'Rectangle') {
      const { start, end, stroke, fill } = g.data;
      return <Rect x={start[0] * SCALE} y={start[1] * SCALE} width={(end[0] - start[0]) * SCALE} height={(end[1] - start[1]) * SCALE} stroke="#c2102a" strokeWidth={(stroke?.width || 0.254) * SCALE * 0.3} fill={fill?.type === 'background' ? '#fff9d9' : ''} />;
    }
    if (g.kind === 'Polyline') {
      const raw = g.data?.pts?.xy || []; const pts = raw.flat().map((v: number) => v * SCALE);
      return <Line points={pts} stroke="#c2102a" strokeWidth={(g.data.stroke?.width || 0.254) * SCALE * 0.45} closed={false} />;
    }
    if (g.kind === 'Circle' || g.kind === 'circle') {
      let cx = Number(g.data?.cx ?? g.cx ?? g.x ?? 0); let cy = Number(g.data?.cy ?? g.cy ?? g.y ?? 0); let r = Number(g.data?.r ?? g.r ?? g.radius ?? 0);
      return <Circle x={cx * SCALE} y={cy * SCALE} radius={(r || 0) * SCALE} stroke="#c2102a" strokeWidth={(g.data?.stroke?.width || 0.254) * SCALE * 0.45} />;
    }
    if (g.kind === 'Arc' || g.kind === 'arc') {
      const startRaw = g.start ?? g.data?.start ?? [0, 0]; const endRaw = g.end ?? g.data?.end ?? [0, 0];
      const sx = Number(Array.isArray(startRaw) ? startRaw[0] : startRaw.x) || 0; const sy = Number(Array.isArray(startRaw) ? startRaw[1] : startRaw.y) || 0;
      const ex = Number(Array.isArray(endRaw) ? endRaw[0] : endRaw.x) || 0; const ey = Number(Array.isArray(endRaw) ? endRaw[1] : endRaw.y) || 0;
      return <Line points={[sx * SCALE, sy * SCALE, ex * SCALE, ey * SCALE]} stroke="#c2102a" strokeWidth={(g.data?.stroke?.width || 0.254) * SCALE * 0.45} />;
    }
    return null;
  };

  // Pin renderer (mirrors SymbolPreview logic)
  const RenderPin = ({ pin, idx, pins }: any) => {
    const [connected, setConnected] = useState(false);
    let routing: any = null;
    try { routing = useRouting(); } catch (e) { routing = null; }
    // Only allow SymbolPreviewCanvas to directly initiate wire connections when
    // rendering a preview (ownerId === 'preview') or when an explicit
    // `onPinClick`/`previewPins` handler is provided. For placed symbols the
    // canonical hit-circles in `PlacedSymbolsRenderer` dispatch world coords.
    const canAutoConnect = Boolean(onPinClick && Array.isArray(previewPins)) || ownerId === 'preview';
    const [px_raw, py_raw, rot] = pin.at; const px = px_raw * SCALE; const py = py_raw * SCALE;

    const PIN_LENGTH_MULTIPLIER = 1; const PIN_THICKNESS = 0.8; const len = (pin.length || 1) * SCALE * PIN_LENGTH_MULTIPLIER;

    let ix = px; let iy = py;
    if (gfxBounds) {
      if (rot === 0) { ix = gfxBounds.minX; iy = py; }
      else if (rot === 180) { ix = gfxBounds.maxX; iy = py; }
      else if (rot === 90) { ix = px; iy = gfxBounds.maxY; }
      else if (rot === 270) { ix = px; iy = gfxBounds.minY; }
    }

    let ex = ix; let ey = iy;
    if (gfxBounds) {
      if (rot === 0 || rot === 180) {
        if (ix === gfxBounds.minX) { ex = ix - len; } else { ex = ix + len; }
        ey = iy;
      } else {
        if (iy === gfxBounds.maxY) { ey = iy + len; } else { ey = iy - len; }
        ex = ix;
      }
    } else {
      if (rot === 0) { ex = ix + len; ey = iy; }
      else if (rot === 180) { ex = ix - len; ey = iy; }
      else if (rot === 90) { ex = ix; ey = iy + len; }
      else if (rot === 270) { ex = ix; ey = iy - len; }
    }

    // Text placement logic (adapted from preview)
    const NAME_INSIDE_PAD = 6; const NUMBER_OUTSIDE_PAD = 8; const NUM_INSIDE_X = 6;
    let pinNumberX = ex; let pinNumberY: number;
    if (rot === 90) {
      pinNumberY = Math.max(iy, ey) + NUMBER_OUTSIDE_PAD;
      const txt = String(pin.number?.[''] ?? ''); const estNumWidth = Math.max(8, txt.length * 6 * 0.6); pinNumberX = ex - estNumWidth / 2;
      if (Array.isArray(pins)) {
        const myX = ex; const group = pins.map((pp: any, j: number) => ({ pp, j })).filter((it: any) => it.pp && it.pp.at && it.pp.at[2] === 90).map((it: any) => ({ x: (it.pp.at[0] * SCALE), idx: it.j }));
        const nearby = group.filter((g: any) => Math.abs(g.x - myX) < 20).sort((a: any, b: any) => a.x - b.x);
        if (nearby.length > 1) { const myPos = nearby.findIndex((n: any) => n.idx === idx); const spacing = 12; const center = (nearby.length - 1) / 2; const offset = (myPos - center) * spacing; pinNumberX += offset; }
      }
    } else if (rot === 270) { pinNumberY = Math.min(iy, ey) - NUMBER_OUTSIDE_PAD + 10; } else { const topY = Math.min(iy, ey); pinNumberY = topY - NUMBER_OUTSIDE_PAD; }
    if (rot === 0) { pinNumberX = ex - NUM_INSIDE_X + 10; } else if (rot === 180) { pinNumberX = ex + NUM_INSIDE_X - 19; }

    let pinNameX = ix; let pinNameY = iy; let nameAlign: 'left' | 'center' | 'right' = 'left'; let pinNameRotation = 0; let pinNameOffset: { x?: number; y?: number } = {};
    const PIN_NAME_FONT = 6;

    const parsePinName = (raw: any) => {
      const s = (raw?.[''] ?? raw ?? '').toString(); let inverted = false; let out = s.trim(); const mInv = out.match(/^~\{(.+)\}$/); if (mInv) { inverted = true; out = mInv[1]; } out = out.replace(/([A-Za-z])_\{([^}]+)\}/g, (_: any, a: string, b: string) => a + b.toLowerCase()); out = out.replace(/^\{(.+)\}$/, "$1"); if (out.length > 0) out = out.charAt(0).toUpperCase() + out.slice(1); return { text: out, inverted };
    };

    if (rot === 0 || rot === 180) {
      const centerX = bbox ? (bbox.minX + bbox.maxX) / 2 : px;
      if (ix > centerX) {
        const txt = String(parsePinName(pin.name).text ?? ''); const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6)); pinNameX = ix - NAME_INSIDE_PAD - estWidth; pinNameY = iy - 4; nameAlign = 'left';
      } else { pinNameX = ix + NAME_INSIDE_PAD - 4; pinNameY = iy - 4; nameAlign = 'left'; }
    } else if (rot === 90) {
      pinNameRotation = -90; nameAlign = 'center'; const txt = String(pin.name?.[''] ?? ''); const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6)); const estHeight = PIN_NAME_FONT * 1.2; pinNameOffset = { x: estWidth / 2, y: estHeight / 2 }; pinNameX = ix - NAME_INSIDE_PAD + 7; pinNameY = iy - NAME_INSIDE_PAD - 4;
    } else if (rot === 270) {
      pinNameRotation = -90; nameAlign = 'center'; const txt = String(pin.name?.[''] ?? ''); const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6)); const estHeight = PIN_NAME_FONT * 1.2; pinNameOffset = { x: estWidth / 2, y: estHeight / 2 }; pinNameX = ix - NAME_INSIDE_PAD + 7; pinNameY = iy + NAME_INSIDE_PAD + 4;
    }

    return (
      <>
        <Line points={[ix, iy, ex, ey]} stroke="red" strokeWidth={PIN_THICKNESS} />
        <Text x={pinNumberX} y={pinNumberY} text={String(pin.number?.[''] ?? '')} fontSize={8} fill="red" align="center" />
        <Text x={pinNameX} y={pinNameY} text={String(parsePinName(pin.name).text ?? '')} fontSize={PIN_NAME_FONT} fill="green" align={nameAlign} rotation={pinNameRotation} offsetX={pinNameOffset.x} offsetY={pinNameOffset.y} />
        {(() => {
          const parsed = parsePinName(pin.name); if (!parsed.inverted) return null; const txt = String(parsed.text ?? ''); const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6)); let startX = pinNameX; let endX = pinNameX + estWidth; if (nameAlign === 'center') { startX = pinNameX - estWidth / 2; endX = pinNameX + estWidth / 2; } else if (nameAlign === 'left') { startX = pinNameX - estWidth; endX = pinNameX; } const barY = pinNameY - (PIN_NAME_FONT * 0.9); return <Line points={[startX, barY, endX, barY]} stroke="black" strokeWidth={1} dash={[4,3]} />;
        })()}

        {/* end-cap circle shown when pin is not connected. If `onPinClick` is provided
            (we're rendering a preview and want interactive tap-to-connect), make the
            circle clickable and call the handler with the pin's absolute world coords
            provided via `previewPins`. When clicked we mark this pin locally connected
            so the circle disappears. */}
        {!(pin.connected || connected) && (
          <Circle
            x={ex}
            y={ey}
            radius={3}
            fill="#ffffff"
            stroke="#c2102a"
            strokeWidth={1}
            listening={canAutoConnect && (Boolean(onPinClick && Array.isArray(previewPins)) || Boolean(routing && routing.isDrawing))}
            onClick={(e: any) => {
              try { e.cancelBubble = true; } catch (err) {}
              if (!canAutoConnect) return;
              const preview = Array.isArray(previewPins) ? previewPins[idx] : undefined;
              if (onPinClick) onPinClick(preview ?? { x: ex, y: ey, id: `${ownerId}-pin-${idx}` }, idx);
              else {
                try { window.dispatchEvent(new CustomEvent('connect-wire-to-pin', { detail: { pinId: `${ownerId}-pin-${idx}`, x: ex, y: ey } })); } catch (err) {}
              }
              setConnected(true);
            }}
            onMouseEnter={(e: any) => {
              try { e.cancelBubble = true; } catch (err) {}
              if (!canAutoConnect) return;
              // If the routing tool is active and drawing, automatically connect
              if (routing && routing.isDrawing) {
                const preview = Array.isArray(previewPins) ? previewPins[idx] : undefined;
                if (onPinClick) onPinClick(preview ?? { x: ex, y: ey, id: `${ownerId}-pin-${idx}` }, idx);
                else {
                  try { window.dispatchEvent(new CustomEvent('connect-wire-to-pin', { detail: { pinId: `${ownerId}-pin-${idx}`, x: ex, y: ey } })); } catch (err) {}
                }
                setConnected(true);
              }
            }}
          />
        )}
      </>
    );
  };

  return (
    <Group x={0} y={0} offsetX={bbox ? (bbox.minX + bbox.maxX) / 2 : 0} offsetY={bbox ? (bbox.minY + bbox.maxY) / 2 : 0}>
      {/* Selection visual similar to KiCad: dashed outline + small corner handles */}
      {selected && ((): any => {
        const box = bbox || gfxBounds;
        if (!box) return null;
        const padding = 6; // extra space around symbol
        const x = box.minX - padding;
        const y = box.minY - padding;
        const w = (box.maxX - box.minX) + padding * 2;
        const h = (box.maxY - box.minY) + padding * 2;
        const handleR = 3;
        const stroke = '#1976d2';
        return (
          <>
            <Rect x={x} y={y} width={w} height={h} stroke={stroke} strokeWidth={2} dash={[6, 4]} listening={false} />
            {/* corner handles */}
            <Circle x={x} y={y} radius={handleR} fill={stroke} listening={false} />
            <Circle x={x + w} y={y} radius={handleR} fill={stroke} listening={false} />
            <Circle x={x} y={y + h} radius={handleR} fill={stroke} listening={false} />
            <Circle x={x + w} y={y + h} radius={handleR} fill={stroke} listening={false} />
          </>
        );
      })()}

      {graphicsData.map((g, i) => (<RenderGraphics key={i} g={g} />))}
      {showPins && visiblePins.map((p: any, i: number) => (<RenderPin key={i} pin={p} idx={i} pins={visiblePins} />))}
    </Group>
  );
};

export default SymbolPreviewCanvas;
