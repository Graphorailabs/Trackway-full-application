import { Group, Rect, Line, Text, Circle } from "react-konva";
// import { useSymbol } from "../context/SymbolContext";

export const SymbolPreviewCanvas = ({ symbolData, selected = false, selectedPinIndex = null, ownerId = null }: any) => {
  if (!symbolData) return null;

  // Use same scale as the main `SymbolPreview` for visual parity
  const SCALE = 6;
  // Selection colors shared by graphics and pins
  const SELECT_FILL = '#bff6ff';
  const SELECT_STROKE = '#00bcd4';

  // Extract graphics + pins
  const units = Array.isArray(symbolData) ? symbolData : symbolData.unit ? symbolData.unit : [];

  const graphics: any[] = [];
  const pins: any[] = [];

  units.forEach((u: any) => {
    if (Array.isArray(u.graphics)) graphics.push(...u.graphics);
    if (Array.isArray(u.pin)) pins.push(...u.pin);
  });

  // If the symbol is 'no_connect' / 'NC' (electrical_type), do not show pins
  const isNoConnectSymbol = (() => {
    const raw = (symbolData?.electrical_type ?? symbolData?.electricalType ?? symbolData?.electrical?.type ?? '') as any;
    const v = (raw ?? '').toString().trim().toLowerCase();
    return /^(no[_-]?connect|nc)$/.test(v);
  })();

  // Heuristic: swap a small top rectangle (notch) with a small inner circle
  // (black pin) so the circle appears at the top and the notch moves to the
  // circle's former location. This is visual-only at render time.
  if (graphics.length > 1) {
    const bboxWorld = (() => {
      if (!graphics || graphics.length === 0) return null;
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
          raw.forEach((pt: any) => {
            minX = Math.min(minX, pt[0]);
            minY = Math.min(minY, pt[1]);
            maxX = Math.max(maxX, pt[0]);
            maxY = Math.max(maxY, pt[1]);
          });
        } else if (g.kind === 'Circle' || g.kind === 'circle') {
          const c = g.data?.center ?? g.data?.cx ?? [g.cx ?? 0, g.cy ?? 0];
          const cx = Array.isArray(c) ? c[0] : c.x ?? 0;
          const cy = Array.isArray(c) ? c[1] : c.y ?? 0;
          const r = g.data?.radius ?? g.data?.r ?? 0;
          minX = Math.min(minX, cx - r);
          minY = Math.min(minY, cy - r);
          maxX = Math.max(maxX, cx + r);
          maxY = Math.max(maxY, cy + r);
        }
      });
      if (minX === Infinity) return null;
      return { minX, minY, maxX, maxY };
    })();

    if (bboxWorld) {
      const centerX = (bboxWorld.minX + bboxWorld.maxX) / 2;
      const centerY = (bboxWorld.minY + bboxWorld.maxY) / 2;
      let notchIdx = -1;
      let circleIdx = -1;

      graphics.forEach((g: any, i: number) => {
        if (notchIdx === -1 && g.kind === 'Rectangle' && g.data && g.data.start && g.data.end) {
          const { start, end } = g.data;
          const rx = (start[0] + end[0]) / 2;
          const ry = (start[1] + end[1]) / 2;
          const rw = Math.abs(end[0] - start[0]);
          const rh = Math.abs(end[1] - start[1]);
          const bboxW = bboxWorld.maxX - bboxWorld.minX;
          if (ry < centerY && Math.abs(rx - centerX) < bboxW * 0.35 && rw < bboxW * 0.6 && rh < bboxW * 0.4) {
            notchIdx = i;
          }
        }

        if (circleIdx === -1 && (g.kind === 'Circle' || g.kind === 'circle') && g.data) {
          let cx: number | null = null;
          let cy: number | null = null;
          if (g.data.center && Array.isArray(g.data.center)) {
            cx = g.data.center[0];
            cy = g.data.center[1];
          } else if (g.data.cx != null || g.data.cy != null) {
            cx = g.data.cx ?? g.data.x ?? null;
            cy = g.data.cy ?? g.data.y ?? null;
          } else if (g.cx != null || g.cy != null) {
            cx = g.cx ?? 0;
            cy = g.cy ?? 0;
          }
          const r = Number(g.data.r ?? g.data.radius ?? g.data.rad ?? 0);
          const bboxW = bboxWorld.maxX - bboxWorld.minX;
          if (cx !== null && cy !== null && r > 0 && r < bboxW * 0.15 && Math.abs(cx - centerX) < bboxW * 0.45) {
            if (cy > bboxWorld.minY + (bboxWorld.maxY - bboxWorld.minY) * 0.2) {
              circleIdx = i;
            }
          }
        }
      });

      if (notchIdx !== -1 && circleIdx !== -1) {
        const notch = graphics[notchIdx];
        const circ = graphics[circleIdx];

        const rect = notch.data;
        const rectCx = (rect.start[0] + rect.end[0]) / 2;
        const rectCy = (rect.start[1] + rect.end[1]) / 2;

        let cCx = 0;
        let cCy = 0;
        if (circ.data.center && Array.isArray(circ.data.center)) {
          cCx = circ.data.center[0];
          cCy = circ.data.center[1];
        } else {
          cCx = circ.data.cx ?? circ.data.x ?? circ.cx ?? 0;
          cCy = circ.data.cy ?? circ.data.y ?? circ.cy ?? 0;
        }

        const dx = cCx - rectCx;
        const dy = cCy - rectCy;

        // move rectangle to circle center
        notch.data.start = [rect.start[0] + dx, rect.start[1] + dy];
        notch.data.end = [rect.end[0] + dx, rect.end[1] + dy];

        // move circle center to former rectangle center
        if (circ.data.center && Array.isArray(circ.data.center)) {
          circ.data.center = [rectCx, rectCy];
        } else {
          circ.data.cx = rectCx;
          circ.data.cy = rectCy;
        }
      }
    }
  }
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

  const visiblePins = showPins ? pins.filter((p) => !isPinNoConnect(p)) : [];

  // compute bbox (in pixels after SCALE) so some text placement can use it
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

    graphics.forEach((g: any) => {
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
    if (!graphics || graphics.length === 0) return null;
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
  })();

  /* ---------------------------------------------------
        GRAPHICS RENDER
  ----------------------------------------------------- */
  const RenderGraphic = ({ g }: any) => {
    if (!g || !g.kind) return null;

    if (g.kind === "Rectangle") {
      const { start, end, stroke, fill } = g.data;

      const rectFill = selected ? SELECT_FILL : (fill?.type === "background" ? "#fff9d9" : "");
      const rectStroke = selected ? SELECT_STROKE : '#c2102a';

      return (
        <Rect
          x={start[0] * SCALE}
          y={start[1] * SCALE}
          width={(end[0] - start[0]) * SCALE}
          height={(end[1] - start[1]) * SCALE}
          stroke={rectStroke}
          strokeWidth={(stroke?.width || 0.254) * SCALE * 0.3}
          fill={rectFill}
        />
      );
    }

    if (g.kind === "Polyline") {
      const raw = g.data.pts.xy || [];
      const pts = raw.flat().map((v: number) => v * SCALE);
      const polyStroke = selected ? SELECT_STROKE : '#c2102a';

      return (
        <Line
          points={pts}
          stroke={polyStroke}
          strokeWidth={(g.data.stroke?.width || 0.254) * SCALE * 0.45}
          closed={false}
        />
      );
    }

    if (g.kind === "Circle" || g.kind === "circle") {
      // support multiple possible circle data shapes
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
            cx = c.x ?? c[0] ?? 0;
            cy = c.y ?? c[1] ?? 0;
          }
          r = g.data.r ?? g.data.radius ?? g.data.rad ?? 0;
        }
      }
      // fallback to top-level fields and coerce to numbers
      const cxN = Number(cx ?? g.cx ?? g.x ?? 0);
      const cyN = Number(cy ?? g.cy ?? g.y ?? 0);
      const rN = Number(r ?? g.r ?? g.radius ?? 0);

        // Determine fill behavior based on circle type
        const circleType = (g.data?.type ?? g.data?.fill?.type ?? g.fill?.type ?? '').toString().trim().toLowerCase();
        let fillColor: string | undefined = undefined;
        if (circleType === 'outline') fillColor = '#c2102a';
        else if (circleType === 'nond') fillColor = '';

        const circStroke = selected ? SELECT_STROKE : '#c2102a';
        const circFill = selected ? SELECT_FILL : fillColor;

        return <Circle x={cxN * SCALE} y={cyN * SCALE} radius={(rN || 0) * SCALE} stroke={circStroke} strokeWidth={(g.data?.stroke?.width || 0.254) * SCALE * 0.45} fill={circFill} />;
    }

    // -------- ARC ----------
    if (g.kind === "Arc" || g.kind === "arc") {
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
      const arcStroke = selected ? SELECT_STROKE : '#c2102a';

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
          cxC = mx;
          cyC = my;
          midUsedAsCenter = true;
        }
      }

      if (cxC === null || cyC === null) {
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
        return <Line points={[sx * SCALE, sy * SCALE, ex * SCALE, ey * SCALE]} stroke={arcStroke} strokeWidth={strokeW * SCALE * 0.45} />;
      }

      const segs = Math.max(6, Math.ceil(absDelta / (Math.PI / 24)));
      const ptsWorld: number[] = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const ang = a1 + delta * t;
        const x = cxC + Math.cos(ang) * r;
        const y = cyC + Math.sin(ang) * r;
        ptsWorld.push(x, y);
      }

      // keep original sweep direction (do not invert)

      const pts: number[] = ptsWorld.map((v) => v * SCALE);

      return <Line points={pts} stroke={arcStroke} strokeWidth={strokeW * SCALE * 0.45} />;
    }

    return null;
  };


  /* ---------------------------------------------------
        PIN RENDER (adapted from `symbolPreview.tsx`)
  ----------------------------------------------------- */
  // Parse and normalize pin names. Handles:
  // - ~{NAME} => inverted flag (draws a dashed bar above the pin number)
  // - V_{CC} => Vcc (concatenate subscript lowercased)
  // - Capitalize first letter
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
  const RenderPin = ({ pin, idx, pinsArr }: any) => {
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
      // swapped attachment edges per UX: right-facing (0) attach to LEFT edge,
      // left-facing (180) attach to RIGHT edge
      if (rot === 0) {
        ix = gfxBounds.minX;
        iy = py;
      } else if (rot === 180) {
        ix = gfxBounds.maxX;
        iy = py;
      } else if (rot === 90) {
        ix = px;
        iy = gfxBounds.maxY;
      } else if (rot === 270) {
        ix = px;
        iy = gfxBounds.minY;
      }
    }

    // Outer end: extend away from the graphic edge the pin is attached to
    let ex = ix;
    let ey = iy;
    if (gfxBounds) {
      if (rot === 0 || rot === 180) {
        if (ix === gfxBounds.minX) {
          ex = ix - len; // attached to left -> extend left
        } else {
          ex = ix + len; // attached to right -> extend right
        }
        ey = iy;
      } else {
        if (iy === gfxBounds.maxY) {
          ey = iy + len;
        } else {
          ey = iy - len;
        }
        ex = ix;
      }
    } else {
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
    const NUM_INSIDE_X = 6;

    let pinNumberX = ex;
    let pinNumberY: number;
    if (rot === 90) {
      pinNumberY = Math.max(iy, ey) + NUMBER_OUTSIDE_PAD;

      const txt = String(pin.number?.[''] ?? '');
      const estNumWidth = Math.max(8, txt.length * 6 * 0.6);
      pinNumberX = ex - estNumWidth / 2;

      // simple anti-overlap for down-facing pins
      if (Array.isArray(pinsArr)) {
        const myX = ex;
        const group = pinsArr
          .map((pp: any, j: number) => ({ pp, j }))
          .filter((it: any) => it.pp && it.pp.at && it.pp.at[2] === 90)
          .map((it: any) => ({ x: (it.pp.at[0] * SCALE), idx: it.j }));

        const nearby = group.filter((g: any) => Math.abs(g.x - myX) < 20).sort((a: any, b: any) => a.x - b.x);
        if (nearby.length > 1) {
          const myPos = nearby.findIndex((n: any) => n.idx === idx);
          const spacing = 12;
          const center = (nearby.length - 1) / 2;
          const offset = (myPos - center) * spacing;
          pinNumberX += offset;
        }
      }
    } else if (rot === 270) {
      pinNumberY = Math.min(iy, ey) - NUMBER_OUTSIDE_PAD;
    } else {
      const topY = Math.min(iy, ey);
      pinNumberY = topY - NUMBER_OUTSIDE_PAD;
    }

    if (rot === 0) {
      pinNumberX = ex - NUM_INSIDE_X + 10;
    } else if (rot === 180) {
      pinNumberX = ex + NUM_INSIDE_X - 26;
    }

    let pinNameX = ix;
    let pinNameY = iy;
    let nameAlign: 'left' | 'center' | 'right' = 'left';
    let pinNameRotation = 0;
    let pinNameOffset: { x?: number; y?: number } = {};
    const PIN_NAME_FONT = 6;

    if (rot === 0 || rot === 180) {
      const centerX = bbox ? (bbox.minX + bbox.maxX) / 2 : px;
      if (ix > centerX) {
        const txt = String(parsePinName(pin.name).text ?? '');
        const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6));
        pinNameX = ix - NAME_INSIDE_PAD - estWidth;
        pinNameY = iy - 4;
        nameAlign = 'right';
      } else {
        pinNameX = ix + NAME_INSIDE_PAD;
        pinNameY = iy - 4;
        nameAlign = 'left';
      }
    } else if (rot === 90) {
      pinNameRotation = -90;
      nameAlign = 'center';
      const txt = String(pin.name?.[''] ?? '');
      const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6));
      const estHeight = PIN_NAME_FONT * 1.2;
      pinNameOffset = { x: estWidth / 2, y: estHeight / 2 };
      pinNameX = ix - NAME_INSIDE_PAD + 7;
      pinNameY = iy - NAME_INSIDE_PAD - 4;
    } else if (rot === 270) {
      pinNameRotation = -90;
      nameAlign = 'center';
      const txt = String(pin.name?.[''] ?? '');
      const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6));
      const estHeight = PIN_NAME_FONT * 1.2;
      pinNameOffset = { x: estWidth / 2, y: estHeight / 2 };
      pinNameX = ix - NAME_INSIDE_PAD + 7;
      pinNameY = iy + NAME_INSIDE_PAD + 4;
    }

    const pinStroke = selected ? SELECT_STROKE : 'red';
    const pinTextColor = selected ? SELECT_STROKE : 'red';
    const pinNameColor = selected ? SELECT_STROKE : 'green';

    return (
      <>
        <Line points={[ix, iy, ex, ey]} stroke={pinStroke} strokeWidth={PIN_THICKNESS} />

        <Text
          x={pinNumberX}
          y={pinNumberY}
          text={String(pin.number?.[''] ?? '')}
          fontSize={8}
          fill={pinTextColor}
          align="center"
        />

        {/* no inversion bar above the number anymore; it's drawn above the name below */}

        {(() => {
          const txt = String(parsePinName(pin.name).text ?? '');
          const estWidth = Math.max(8, txt.length * (PIN_NAME_FONT * 0.6));
          const estHeight = PIN_NAME_FONT * 1.2;
          const bgX = nameAlign === 'right' ? (pinNameX - estWidth) : (nameAlign === 'center' ? (pinNameX - estWidth / 2) : pinNameX);
          const bgY = pinNameY - estHeight / 2;
          const isPinSelected = Boolean(selected) && typeof selectedPinIndex === 'number' && selectedPinIndex === idx;
          return (
            <>
              {isPinSelected && (
                <Rect
                  x={bgX - 2}
                  y={bgY - 2}
                  width={estWidth + 4}
                  height={estHeight + 4}
                  fill={SELECT_FILL}
                  cornerRadius={3}
                  listening={false}
                />
              )}
              <Text
                x={pinNameX}
                y={pinNameY}
                text={txt}
                fontSize={PIN_NAME_FONT}
                fill={pinNameColor}
                align={nameAlign}
                rotation={pinNameRotation}
                offsetX={pinNameOffset.x}
                offsetY={pinNameOffset.y}
                onClick={(e: any) => {
                  try { e.cancelBubble = true; } catch (err) {}
                  // notify external listeners about pin selection; include ownerId and pin index
                  window.dispatchEvent(new CustomEvent('select-pin', { detail: { ownerId, pinIndex: idx } }));
                }}
              />
            </>
          );
        })()}

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
          } else if (nameAlign === 'right') {
            startX = pinNameX - estWidth;
            endX = pinNameX;
          }
          const barY = pinNameY - (PIN_NAME_FONT * 0.9);
          return <Line points={[startX, barY, endX, barY]} stroke={pinNameColor} strokeWidth={1} dash={[4,3]} />;
        })()}
      </>
    );
  };

  /* Final lightweight non-interactive Group */
  return (
    <Group>
      {graphics.map((g, i) => (
        <RenderGraphic key={i} g={g} />
      ))}

      {showPins && visiblePins.map((p, i) => (
        <RenderPin key={i} pin={p} idx={i} pinsArr={visiblePins} />
      ))}
    </Group>
  );
};

