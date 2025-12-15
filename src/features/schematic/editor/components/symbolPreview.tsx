import { useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Text, Group, Circle } from "react-konva";

// import { useSymbol } from "../context/SymbolContext";

export const SymbolPreview = ({data} : any) => {
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
//  const { pendingSymbol, setPendingSymbol, addComponent , setSelectedSymbol, selectedSymbol} = useSymbol();
  // const {symbolData} = useSymbol();
  
  // const data = symbolData;
  const SCALE = 6;


  if (!data) return <div>No symbol data found</div>;

  const units = Array.isArray(data) ? data : data.unit ? data.unit : [];

  const graphicsData: any[] = [];
  const pinsData: any[] = [];

  units.forEach((u: any) => {
    if (Array.isArray(u.graphics)) graphicsData.push(...u.graphics);
    if (Array.isArray(u.pin)) pinsData.push(...u.pin);
  });

  // Detect no-connect symbols: if electrical_type is 'no_connect' or 'NC' we hide pins
  const isNoConnectSymbol = (() => {
    const raw = (data?.electrical_type ?? data?.electricalType ?? data?.electrical?.type ?? '') as any;
    const v = (raw ?? '').toString().trim().toLowerCase();
    return /^(no[_-]?connect|nc)$/.test(v);
  })();
  const showPins = !isNoConnectSymbol;

  // Helper: detect per-pin "NC" (not connected) names so we can hide those pins
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

  // compute bounding box (in pixels after SCALE) so we can center the symbol
  const bbox = (() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const add = (x: number, y: number) => {
      const sx = x * SCALE;
      const sy = y * SCALE;
      if (sx < minX) minX = sx;
      if (sy < minY) minY = sy;
      if (sx > maxX) maxX = sx;
      if (sy > maxY) maxY = sy;
    };

    graphicsData.forEach((g: any) => {
      if (!g || !g.kind) return;
      if (g.kind === 'Rectangle') {
        const { start, end } = g.data;
        add(start[0], start[1]);
        add(end[0], end[1]);
      } else if (g.kind === 'Polyline') {
        const raw = g.data?.pts?.xy || [];
        raw.forEach((pt: any) => add(pt[0], pt[1]));
      }
    });

    // include pins so bbox includes pin lines
    if (showPins) {
      visiblePins.forEach((p: any) => {
      const [px, py] = p.at;
      add(px, py);
      // include outer endpoint approx
      const len = (p.length || 1) * SCALE * 1.6;
      const rot = p.at[2];
      if (rot === 0) add(px + len / SCALE, py);
      else if (rot === 180) add(px - len / SCALE, py);
      else if (rot === 90) add(px, py + len / SCALE);
      else if (rot === 270) add(px, py - len / SCALE);
      });
    }

    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
  })();

  // Compute bounding box for the symbol graphics (used to snap pin inner endpoint)
  const gfxBounds = (() => {
    if (!graphicsData || graphicsData.length === 0) return null;
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

    graphicsData.forEach((g: any) => {
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
  })();


  
  // -----------------------------
  // GRAPHICS RENDERER
  // -----------------------------
  const RenderGraphics = ({ g }: any) => {
    if (!g || !g.kind) return null;

    // -------- RECTANGLE ----------
    if (g.kind === "Rectangle") {
      const { start, end, stroke, fill } = g.data;

      return (
        <Rect
          x={start[0] * SCALE}
          y={start[1] * SCALE}
          width={(end[0] - start[0]) * SCALE}
          height={(end[1] - start[1]) * SCALE}
          stroke="#c2102a"
          strokeWidth={(stroke?.width || 0.254) * SCALE * 0.3}
          fill={fill?.type === "background" ? "#fff9d9" : ""}
        />
      );
    }

    // -------- POLYLINE ----------
    if (g.kind === "Polyline") {
      const raw = g.data.pts.xy; // [[x,y],[x,y]...]
      const pts = raw.flat().map((v: number) => v * SCALE);

      return (
        <Line
          points={pts}
          stroke="#c2102a"
          strokeWidth={(g.data.stroke?.width || 0.254) * SCALE * 0.45}
          closed={false}
        />
      );
    }

    if (g.kind === "Circle" || g.kind === "circle") {
      // support several circle data shapes
      let cx: number | undefined;
      let cy: number | undefined;
      let r: number | undefined;
      if (g.data) {
        if (g.data.cx != null || g.data.cy != null) {
          cx = g.data.cx ?? g.data.x ?? 0;
          cy = g.data.cy ?? g.data.y ?? 0;
          r = g.data.r ?? g.data.radius ?? 0;
        } else if (g.data.center) {
          const c = g.data.center;
          if (Array.isArray(c)) {
            cx = c[0];
            cy = c[1];
          } else if (c && typeof c === 'object') {
            cx = c.x  ?? c[0] ?? 0;
            cy = c.y ?? c[1] ?? 0;
          }
          r = g.data.r ?? g.data.radius ?? g.data.rad ?? 0;
        }
      }
      const cxN = Number(cx ?? g.cx ?? g.x ?? 0);
      const cyN = Number(cy ?? g.cy ?? g.y ?? 0);
      const rN = Number(r ?? g.r ?? g.radius ?? 0);

      // Determine fill behavior based on circle type
      const circleType = (g.data?.type ?? g.data?.fill?.type ?? g.fill?.type ?? '').toString().trim().toLowerCase();
      let fillColor: string | undefined = undefined;
      if (circleType === 'outline') fillColor = '#c2102a';
      else if (circleType === 'nond') fillColor = '';

      return <Circle x={cxN * SCALE} y={cyN * SCALE} radius={(rN || 0) * SCALE} stroke="#c2102a" strokeWidth={(g.data?.stroke?.width || 0.254) * SCALE * 0.45} fill={fillColor} />;
    }

    // -------- ARC ----------
    if (g.kind === "Arc" || g.kind === "arc") {
      // canonical arc: { start, mid, end }
      const startRaw = g.start ?? g.data?.start ?? [0, 0];
      const midRaw = g.mid ?? g.data?.mid ?? null;
      const endRaw = g.end ?? g.data?.end ?? [0, 0];

      const sx = Number(Array.isArray(startRaw) ? startRaw[0] : startRaw.x) || 0;
      const sy = Number(Array.isArray(startRaw) ? startRaw[1] : startRaw.y) || 0;
      const ex = Number(Array.isArray(endRaw) ? endRaw[0] : endRaw.x) || 0;
      const ey = Number(Array.isArray(endRaw) ? endRaw[1] : endRaw.y) || 0;

      let mx: number | null = null;
      let my: number | null = null;
      if (midRaw) {
        mx = Number(Array.isArray(midRaw) ? midRaw[0] : midRaw.x) || 0;
        my = Number(Array.isArray(midRaw) ? midRaw[1] : midRaw.y) || 0;
      }

      const strokeW = Number(g.data?.stroke?.width ?? 0.254) || 0.254;

      // compute circumcenter
      const circumcenter = (ax: number, ay: number, bx: number, by: number, cx_: number, cy_: number) => {
        const d = 2 * (ax * (by - cy_) + bx * (cy_ - ay) + cx_ * (ay - by));
        if (Math.abs(d) < 1e-12) return null;
        const ax2 = ax * ax + ay * ay;
        const bx2 = bx * bx + by * by;
        const cx2 = cx_ * cx_ + cy_ * cy_;
        const ux = (ax2 * (by - cy_) + bx2 * (cy_ - ay) + cx2 * (ay - by)) / d;
        const uy = (ax2 * (cx_ - bx) + bx2 * (ax - cx_) + cx2 * (bx - ax)) / d;
        return { x: ux, y: uy };
      };

      const mod2pi = (a: number) => {
        const twoPi = Math.PI * 2;
        let v = a % twoPi;
        if (v < 0) v += twoPi;
        return v;
      };

      // try to compute center
      let cxC: number | null = null;
      let cyC: number | null = null;
      let midUsedAsCenter = false;
      if (mx !== null && my !== null) {
        const cc = circumcenter(sx, sy, mx, my, ex, ey);
        if (cc) {
          cxC = cc.x;
          cyC = cc.y;
          midUsedAsCenter = false;
        } else {
          // fallback: treat mid as explicit center
          cxC = mx;
          cyC = my;
          midUsedAsCenter = true;
        }
      }

      if (cxC === null || cyC === null) {
        // degenerate: draw simple line
        return <Line points={[sx * SCALE, sy * SCALE, ex * SCALE, ey * SCALE]} stroke="black" strokeWidth={strokeW * SCALE * 0.45} />;
      }

      const r = Math.hypot(sx - cxC, sy - cyC) || 0;
      const a1 = Math.atan2(sy - cyC, sx - cxC);
      const am = (mx !== null && my !== null) ? Math.atan2(my - cyC, mx - cxC) : null;
      const a2 = Math.atan2(ey - cyC, ex - cxC);

      let ccwTotal = mod2pi(a2 - a1);
      let delta = ccwTotal;
      if (!midUsedAsCenter && am !== null) {
        const ccwToMid = mod2pi(am - a1);
        if (ccwToMid <= ccwTotal + 1e-12) {
          delta = ccwTotal;
        } else {
          delta = ccwTotal - Math.PI * 2;
        }
      } else if (midUsedAsCenter) {
        if (ccwTotal > Math.PI) delta = ccwTotal - Math.PI * 2;
        else delta = ccwTotal;
      }

      const absDelta = Math.abs(delta);
      if (absDelta < 1e-12) {
        return <Line points={[sx * SCALE, sy * SCALE, ex * SCALE, ey * SCALE]} stroke="black" strokeWidth={strokeW * SCALE * 0.45} />;
      }

      const segs = Math.max(6, Math.ceil(absDelta / (Math.PI / 24)));
      const pts: number[] = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const ang = a1 + delta * t;
        const x = cxC + Math.cos(ang) * r;
        const y = cyC + Math.sin(ang) * r;
        pts.push(x * SCALE, y * SCALE);
      }

      return <Line points={pts} stroke="#c2102a" strokeWidth={strokeW * SCALE * 0.45} />;
    }

    return null;
  };


  const RenderPin = ({ pin, idx, pins }: any) => {
    const [px_raw, py_raw, rot] = pin.at;
    const px = px_raw * SCALE;
    const py = py_raw * SCALE;

    const PIN_LENGTH_MULTIPLIER = 1;
    const PIN_THICKNESS = 0.8;

    const len = (pin.length || 1) * SCALE * PIN_LENGTH_MULTIPLIER;

    // Determine inner attachment point (ix,iy) that should touch the graphic boundary
    let ix = px;
    let iy = py;

    if (gfxBounds) {
      // NOTE: swapped attachment edges per UX request:
      // place pins that are nominally right-facing (rot === 0) on the left edge,
      // and pins nominally left-facing (rot === 180) on the right edge.
      if (rot === 0) {
        // right-facing pin: attach to LEFT edge (swapped)
        ix = gfxBounds.minX;
        iy = py;
      } else if (rot === 180) {
        // left-facing pin: attach to RIGHT edge (swapped)
        ix = gfxBounds.maxX;
        iy = py;
      } else if (rot === 90) {
        // down-facing -> bottom edge
        ix = px;
        iy = gfxBounds.maxY;
      } else if (rot === 270) {
        // up-facing -> top edge
        ix = px;
        iy = gfxBounds.minY;
      }
    }

    // Outer end of the pin extends from the attachment point
    // Ensure the pin extends OUTWARD away from the graphic so it does not cross
    // the rectangle when we swapped attachment edges earlier.
    let ex = ix;
    let ey = iy;
    if (gfxBounds) {
      // For horizontal pins, extend away from the graphic edge they are attached to
      if (rot === 0 || rot === 180) {
        if (ix === gfxBounds.minX) {
          // attached to left edge -> extend left (outside)
          ex = ix - len;
        } else {
          // attached to right edge -> extend right (outside)
          ex = ix + len;
        }
        ey = iy;
      } else {
        // vertical pins: if attached to bottom edge -> extend down, else extend up
        if (iy === gfxBounds.maxY) {
          ey = iy + len;
        } else {
          ey = iy - len;
        }
        ex = ix;
      }
    } else {
      // fallback: use original rotation-based extension
      if (rot === 0) {
        ex = ix + len;
        ey = iy;
      } else if (rot === 180) {
        ex = ix - len;
        ey = iy;
      } else if (rot === 90) {
        ex = ix;
        ey = iy + len;
      } else if (rot === 270) {
        ex = ix;
        ey = iy - len;
      }
    }

    // Text positioning
    const NAME_INSIDE_PAD = 6;
    const NUMBER_OUTSIDE_PAD = 8;

    // const pinNumberX = ex;
    // let pinNumberY: number;
    //  const NAME_PAD = 6;
    // const NUM_PAD = 8;
    const NUM_INSIDE_X = 6; // small horizontal nudge to move number toward the symbol edge

    let pinNumberX = ex;
    let pinNumberY: number;
    // place the pin number outside the symbol for down-facing pins
    if (rot === 90) {
      // down-facing: place number below the outer end
      pinNumberY = Math.max(iy, ey) + NUMBER_OUTSIDE_PAD;
    
      // center number horizontally on the pin tip (reduce overlap)
      const txt = String(pin.number?.[''] ?? '');
      const estNumWidth = Math.max(8, txt.length * 6 * 0.6);
      pinNumberX = ex - estNumWidth / 2;

      // simple anti-overlap: gather nearby down-facing pins and spread numbers horizontally
      if (Array.isArray(pins)) {
        const myX = ex;
        const group = pins
          .map((pp: any, j: number) => ({ pp, j }))
          .filter((it: any) => it.pp && it.pp.at && it.pp.at[2] === 90)
          .map((it: any) => ({ x: (it.pp.at[0] * SCALE), idx: it.j }));

        const nearby = group.filter((g: any) => Math.abs(g.x - myX) < 20).sort((a: any, b: any) => a.x - b.x);
        if (nearby.length > 1) {
          const myPos = nearby.findIndex((n: any) => n.idx === idx);
          const spacing = 12; // px spacing between numbers
          const center = (nearby.length - 1) / 2;
          const offset = (myPos - center) * spacing;
          pinNumberX += offset;
        }
      }
    } else if (rot === 270) {
      // up-facing: place number above the outer end

      pinNumberY = Math.min(iy, ey) - NUMBER_OUTSIDE_PAD + 10;
    } else {
      // left/right: place number above the pin line
      const topY = Math.min(iy, ey);
      pinNumberY = topY - NUMBER_OUTSIDE_PAD;
    }

     if (rot === 0) {
      pinNumberX = ex - NUM_INSIDE_X + 10;
    } else if (rot === 180) {
      // left-side pins: nudge the number a few pixels to the right so it sits
      // just inside the symbol and avoids overlapping the pin line.
      pinNumberX = ex + NUM_INSIDE_X - 19;
    }
    let pinNameX = ix;
    let pinNameY = iy;
    let nameAlign: 'left' | 'center' | 'right' = 'left';
    let pinNameRotation = 0;
    // optional manual offset (not usually needed) - keep for fine tuning
    let pinNameOffset: { x?: number; y?: number } = {};
    const PIN_NAME_FONT = 6;

    // Parse/normalize pin names (same behavior as canvas)
    const parsePinName = (raw: any) => {
      const s = (raw?.[''] ?? raw ?? '').toString();
      let inverted = false;
      let out = s.trim();

      const mInv = out.match(/^~\{(.+)\}$/);
      if (mInv) {
        inverted = true;
        out = mInv[1];
      }

      out = out.replace(/([A-Za-z])_\{([^}]+)\}/g, (_: any, a: string, b: string) => a + b.toLowerCase());
      out = out.replace(/^\{(.+)\}$/, "$1");
      if (out.length > 0) out = out.charAt(0).toUpperCase() + out.slice(1);
      return { text: out, inverted };
    };

    if (rot === 0 || rot === 180) {
      // place names based on which side of the symbol the pin is on:
      // pins on the right side -> name to the left; pins on the left side -> name to the right
      const centerX = bbox ? (bbox.minX + bbox.maxX) / 2 : px;
      if (ix > centerX) {
        // pin is on right half: place text so its RIGHT edge is NAME_INSIDE_PAD from the attach
        const txt = String(parsePinName(pin.name).text ?? '');
        const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6));
        pinNameX = ix - NAME_INSIDE_PAD - estWidth; // left edge so right edge = ix - pad
        pinNameY = iy - 4;
        nameAlign = 'left';
      } else {
        // pin is on left half
        pinNameX = ix + NAME_INSIDE_PAD - 4;
        pinNameY = iy - 4;
        nameAlign = 'left';
      }
    } else if (rot === 90) {
      // down-facing: render the pin name vertically and center it on the inner attach
      pinNameRotation = -90;
      nameAlign = 'center';
      // estimate text metrics so we can center the rotation pivot
      const txt = String(pin.name?.[''] ?? '');
      const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6));
      const estHeight = PIN_NAME_FONT * 1.2;
      pinNameOffset = { x: estWidth / 2, y: estHeight / 2 };
      // shift left so vertical label sits closer to the symbol edge (match left-pin spacing)
      pinNameX = ix - NAME_INSIDE_PAD + 7;
      pinNameY = iy -  NAME_INSIDE_PAD - 4;
    } else if (rot === 270) {
      // up-facing: vertical centered on inner attach
      pinNameRotation = -90;
      nameAlign = 'center';
      const txt = String(pin.name?.[''] ?? '');
      const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6));
      const estHeight = PIN_NAME_FONT * 1.2;
      pinNameOffset = { x: estWidth / 2, y: estHeight / 2 };
      // shift left so vertical label sits closer to the symbol edge (match left-pin spacing)
      pinNameX = ix - NAME_INSIDE_PAD + 7;
      pinNameY = iy + NAME_INSIDE_PAD + 4;
    }

    return (
      <>
        {/* Pin line: draws from inner attachment (ix,iy) to outer end (ex,ey) */}
        <Line points={[ix, iy, ex, ey]} stroke="red" strokeWidth={PIN_THICKNESS} />

        {/* Pin number (always above the pin) */}
        <Text
          x={pinNumberX}
          y={pinNumberY}
          text={String(pin.number?.[''] ?? '')}
          fontSize={8}
          fill="red"
          align="center"
        />

        {/* inversion bar moved: it's drawn above the pin name below */}

        {/* Pin name (kept inside the symbol body) */}
        <Text
          x={pinNameX}
          y={pinNameY}
          text={String(parsePinName(pin.name).text ?? '')}
          fontSize={PIN_NAME_FONT}
          fill="green"
          align={nameAlign}
          rotation={pinNameRotation}
          offsetX={pinNameOffset.x}
          offsetY={pinNameOffset.y}
        />

        {/* dashed inversion bar above the pin name when label is inverted (~{NAME}) */}
        {(() => {
          const parsed = parsePinName(pin.name);
          if (!parsed.inverted) return null;
          const txt = String(parsed.text ?? '');
          const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6));
          let startX = pinNameX;
          let endX = pinNameX + estWidth;
          if (nameAlign === 'center') {
            startX = pinNameX - estWidth / 2;
            endX = pinNameX + estWidth / 2;
          } else if (nameAlign === 'left') {
            startX = pinNameX - estWidth;
            endX = pinNameX;
          }
          const barY = pinNameY - (PIN_NAME_FONT * 0.9);
          return <Line points={[startX, barY, endX, barY]} stroke="black" strokeWidth={1} dash={[4,3]} />;
        })()}
      </>
    );
  };


  const stageWidth = window.innerWidth * 0.7;
  const stageHeight = window.innerHeight * 0.7;

  const handleWheel = (e: any) => {
  e.evt.preventDefault();

  const stage = stageRef.current;
  const pointer = stage.getPointerPosition();

  const oldScale = scale;
  const scaleBy = 1.05;

  const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

  const mousePointTo = {
    x: (pointer.x - stagePos.x) / oldScale,
    y: (pointer.y - stagePos.y) / oldScale,
  };

  setScale(newScale);
  setStagePos({
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  });
};
  return (
    <Stage
     ref={stageRef} 
     listening={false} 
     width={stageWidth} 
     height={stageHeight} 
     draggable scaleX={scale} 
     scaleY={scale} 
     x={stagePos.x} 
     y={stagePos.y}
      className="bg-white" 
       onWheel={handleWheel}
      >
      <Layer>
        <Group x={stageWidth / 2} y={stageHeight / 2} offsetX={bbox ? (bbox.minX + bbox.maxX) / 2 : 0} offsetY={bbox ? (bbox.minY + bbox.maxY) / 2 : 0}>
          {/* GRAPHICS */}
          {graphicsData.map((g, i) => (
            <RenderGraphics key={i} g={g} />
          ))}

          {/* PINS */}
          {showPins && visiblePins.map((p, i) => (
            <RenderPin key={i} pin={p} idx={i} pins={visiblePins} />
          ))}
        </Group>
      </Layer>
    </Stage>
  );
};
