import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { FOOTPRINT_PREVIEW_FLIP_ARC_POINTS as DEFAULT_FLIP_ARC_POINTS } from "@/features/footprint_manager/constants";

function toNumber(v: any, fallback = 0) {
  if (typeof v === "number") return v;
  if (Array.isArray(v) && typeof v[0] === "number") return v[0];
  return fallback;
}

type Point = { x: number; y: number };

function mod2pi(value: number) {
  const twoPi = Math.PI * 2;
  let v = value % twoPi;
  if (v < 0) v += twoPi;
  return v;
}

function circumcenter(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;
  const ax2ay2 = ax * ax + ay * ay;
  const bx2by2 = bx * bx + by * by;
  const cx2cy2 = cx * cx + cy * cy;
  const ux = (ax2ay2 * (by - cy) + bx2by2 * (cy - ay) + cx2cy2 * (ay - by)) / d;
  const uy = (ax2ay2 * (cx - bx) + bx2by2 * (ax - cx) + cx2cy2 * (bx - ax)) / d;
  return { x: ux, y: uy };
}

function parsePoint(raw: any): Point | null {
  if (!raw && raw !== 0) return null;
  if (Array.isArray(raw)) {
    const [x, y] = raw;
    const nx = Number(x);
    const ny = Number(y);
    if (Number.isFinite(nx) && Number.isFinite(ny)) return { x: nx, y: ny };
    return null;
  }
  if (typeof raw === "object") {
    const nx = Number(raw.x ?? (Array.isArray(raw.xy) ? raw.xy[0] : undefined));
    const ny = Number(raw.y ?? (Array.isArray(raw.xy) ? raw.xy[1] : undefined));
    if (Number.isFinite(nx) && Number.isFinite(ny)) return { x: nx, y: ny };
  }
  return null;
}

function buildArcPolyline(start: Point | null, mid: Point | null, end: Point | null, flipStartEndWhenMidIsCenter: boolean): Point[] | null {
  if (!start || !end) return null;
  let sx = start.x;
  let sy = start.y;
  let ex = end.x;
  let ey = end.y;
  const mx = mid?.x ?? null;
  const my = mid?.y ?? null;

  let cx: number | null = null;
  let cy: number | null = null;
  let midUsedAsCenter = false;

  if (mx !== null && my !== null) {
    const cc = circumcenter(sx, sy, mx, my, ex, ey);
    if (cc) {
      cx = cc.x;
      cy = cc.y;
    } else {
      cx = mx;
      cy = my;
      midUsedAsCenter = true;
      if (flipStartEndWhenMidIsCenter) {
        const tmpX = sx;
        const tmpY = sy;
        sx = ex;
        sy = ey;
        ex = tmpX;
        ey = tmpY;
      }
    }
  }

  if (cx === null || cy === null) {
    return [start, end];
  }

  const radius = Math.hypot(sx - cx, sy - cy);
  if (!isFinite(radius) || radius <= 1e-6) {
    return [start, end];
  }

  const startAngle = Math.atan2(sy - cy, sx - cx);
  const endAngle = Math.atan2(ey - cy, ex - cx);
  const midAngle = midUsedAsCenter || mx === null || my === null ? null : Math.atan2(my - cy, mx - cx);

  let delta = mod2pi(endAngle - startAngle);
  if (!midUsedAsCenter && midAngle !== null) {
    const ccwToMid = mod2pi(midAngle - startAngle);
    if (ccwToMid > delta + 1e-9) {
      delta -= Math.PI * 2;
    }
  } else if (midUsedAsCenter) {
    if (delta > Math.PI) delta -= Math.PI * 2;
  }

  if (Math.abs(delta) < 1e-6) {
    return [start, end];
  }

  const segments = Math.max(8, Math.ceil(Math.abs(delta) / (Math.PI / 24)));
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + delta * t;
    points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  return points;
}

export default function useFootprint(fp: any) {
  const at = fp?.at ?? {};
  const x = (at.x ?? 0) as number;
  const y = (at.y ?? 0) as number;

  const isFlipped = useMemo(() => {
    if (!fp) return false;
    const checkLayer = (layer: any) => {
      if (!layer) return false;
      if (typeof layer === "string") return layer.startsWith("B.");
      if (typeof layer === "object" && typeof layer.canonical_name === "string") return layer.canonical_name.startsWith("B.");
      return false;
    };
    if (Array.isArray(fp.pads)) {
      for (const p of fp.pads) {
        if (Array.isArray(p.layers) && p.layers.some(checkLayer)) return true;
        if (Array.isArray(p.data?.layers) && p.data.layers.some(checkLayer)) return true;
      }
    }
    if (Array.isArray(fp.graphics)) {
      for (const g of fp.graphics) {
        if (checkLayer(g.layer)) return true;
        if (Array.isArray(g.layers) && g.layers.some(checkLayer)) return true;
      }
    }
    if (Array.isArray(fp.layers) && fp.layers.some(checkLayer)) return true;
    return false;
  }, [fp]);

  const bbox = useMemo(() => {
    let minx = Infinity,
      miny = Infinity,
      maxx = -Infinity,
      maxy = -Infinity;
    const flipArcPointsForBbox = typeof window !== "undefined" && typeof (window as any).FOOTPRINT_PREVIEW_FLIP_ARC_POINTS === "boolean"
      ? Boolean((window as any).FOOTPRINT_PREVIEW_FLIP_ARC_POINTS)
      : DEFAULT_FLIP_ARC_POINTS;
    const addPoint = (px: number, py: number) => {
      if (!isFinite(px) || !isFinite(py)) return;
      minx = Math.min(minx, px);
      miny = Math.min(miny, py);
      maxx = Math.max(maxx, px);
      maxy = Math.max(maxy, py);
    };
    if (Array.isArray(fp.pads)) {
      for (const p of fp.pads) {
        const atx = toNumber(p.at?.x ?? p.at ?? p.x, 0);
        const aty = toNumber(p.at?.y ?? (Array.isArray(p.at) ? p.at[1] : undefined) ?? p.y, 0);
        const sz = p.size ?? p.data?.size ?? p.data?.shape ?? null;
        const half = Array.isArray(sz) && typeof sz[0] === "number" ? Math.max(sz[0], sz[1] ?? sz[0]) / 2 : 1;
        addPoint(atx - half, aty - half);
        addPoint(atx + half, aty + half);
      }
    }
    if (Array.isArray(fp.graphics)) {
      for (const g of fp.graphics) {
        const hasArcPoints = (arr: any) => Array.isArray(arr) && arr.length === 3 && Array.isArray(arr[0]) && Array.isArray(arr[1]) && Array.isArray(arr[2]);
        const pointsTriplet = hasArcPoints(g?.data?.points) ? g.data.points : null;
        const hasExplicitTriplet = Array.isArray(g?.start) && Array.isArray(g?.mid) && Array.isArray(g?.end);
        const hasDataTriplet = Array.isArray(g?.data?.start) && Array.isArray(g?.data?.mid) && Array.isArray(g?.data?.end);
        if (g.kind === "arc" || pointsTriplet || hasExplicitTriplet || hasDataTriplet) {
          const start = parsePoint(g.start ?? g.data?.start ?? pointsTriplet?.[0]);
          const mid = parsePoint(g.mid ?? g.data?.mid ?? pointsTriplet?.[1]);
          const end = parsePoint(g.end ?? g.data?.end ?? pointsTriplet?.[2]);
          const polyline = buildArcPolyline(start, mid, end, flipArcPointsForBbox);
          if (polyline) {
            polyline.forEach((pt) => addPoint(pt.x, pt.y));
            continue;
          }
        }
        if (Array.isArray(g.start) && typeof g.start[0] === "number") addPoint(g.start[0], g.start[1]);
        if (Array.isArray(g.end) && typeof g.end[0] === "number") addPoint(g.end[0], g.end[1]);
        if (Array.isArray(g.data?.start) && typeof g.data.start[0] === "number") addPoint(g.data.start[0], g.data.start[1]);
        if (Array.isArray(g.data?.end) && typeof g.data.end[0] === "number") addPoint(g.data.end[0], g.data.end[1]);
        if (g.data && g.data.start && typeof g.data.start.x === 'number') addPoint(g.data.start.x, g.data.start.y);
        if (g.data && g.data.end && typeof g.data.end.x === 'number') addPoint(g.data.end.x, g.data.end.y);
        if (Array.isArray(g.pts)) {
          for (const pt of g.pts) {
            if (Array.isArray(pt)) addPoint(pt[0], pt[1]);
            else if (pt && typeof pt.x === "number") addPoint(pt.x, pt.y);
          }
        }
        if (g.data && g.data.pts && Array.isArray(g.data.pts.xy)) {
          for (const pt of g.data.pts.xy) {
            if (Array.isArray(pt)) addPoint(pt[0], pt[1]);
          }
        }
        if (Array.isArray(g.at) && typeof g.at[0] === 'number') addPoint(g.at[0], g.at[1]);
        if (g.at && typeof g.at.x === 'number') addPoint(g.at.x, g.at.y);
        if (typeof g.x === 'number') addPoint(g.x, g.y ?? 0);
        if (Array.isArray(g.center) && typeof g.center[0] === "number") addPoint(g.center[0], g.center[1]);
        if (g.data && Array.isArray(g.data.center) && typeof g.data.center[0] === 'number') addPoint(g.data.center[0], g.data.center[1]);
      }
    }
    if (!isFinite(minx)) {
      minx = -5;
      miny = -5;
      maxx = 5;
      maxy = 5;
    }
    const pad = 1;
    return { minx: minx - pad, miny: miny - pad, maxx: maxx + pad, maxy: maxy + pad };
  }, [fp]);

  const widthUnits = Math.max(0.0001, bbox.maxx - bbox.minx);
  const heightUnits = Math.max(0.0001, bbox.maxy - bbox.miny);
  const bboxCenterX = bbox.minx + widthUnits / 2;
  const bboxCenterY = bbox.miny + heightUnits / 2;

  const rawAngle = at?.angle ?? 0;
  const angleRad = Math.abs(rawAngle) > Math.PI * 2 ? ((rawAngle as number) * Math.PI) / 180 : (rawAngle as number);

  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const wUnits = widthUnits;
    const hUnits = heightUnits;
    const maxPx = 1024;
    const pxPerUnit = Math.max(16, Math.min(maxPx / Math.max(wUnits, hUnits), 256));
    const cw = Math.max(32, Math.min(2048, Math.ceil(wUnits * pxPerUnit)));
    const ch = Math.max(32, Math.min(2048, Math.ceil(hUnits * pxPerUnit)));

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);

    const toCanvasX = (vx: number) => Math.round((vx - bbox.minx) * (cw / wUnits));
    const toCanvasY = (vy: number) => Math.round(ch - (vy - bbox.miny) * (ch / hUnits));

    const flipArcPoints = typeof window !== "undefined" && typeof (window as any).FOOTPRINT_PREVIEW_FLIP_ARC_POINTS === "boolean"
      ? Boolean((window as any).FOOTPRINT_PREVIEW_FLIP_ARC_POINTS)
      : DEFAULT_FLIP_ARC_POINTS;

    ctx.lineWidth = Math.max(1, Math.round(Math.min(cw, ch) * 0.002));
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#fff";
    if (Array.isArray(fp.pads)) {
      for (const p of fp.pads) {
        const atx = toNumber(p.at?.x ?? p.at ?? p.x, 0);
        const aty = toNumber(p.at?.y ?? (Array.isArray(p.at) ? p.at[1] : undefined) ?? p.y, 0);
        const sizeArr = Array.isArray(p.size) ? p.size : Array.isArray(p.data?.size) ? p.data.size : typeof p.size === 'number' ? [p.size, p.size] : [1, 1];
        const wUnitsPad = Number(sizeArr[0] ?? 1) || 1;
        const hUnitsPad = Number(sizeArr[1] ?? wUnitsPad) || wUnitsPad;
        const shape = (p.shape ?? p.data?.shape ?? "rect") as string;

        const cx = toCanvasX(atx);
        const cy = toCanvasY(aty);
        const pw = Math.max(1, Math.round(wUnitsPad * (cw / wUnits)));
        const ph = Math.max(1, Math.round(hUnitsPad * (ch / hUnits)));

        if (shape === "circle" || shape === "round" || (Math.abs(pw - ph) <= 1)) {
          const rpx = Math.max(1, Math.round(Math.max(pw, ph) / 2));
          ctx.beginPath();
          ctx.arc(cx, cy, rpx, 0, Math.PI * 2);
          ctx.fill();
          // draw drill hole if present
          const drill = p.drill?.diameter ?? p.data?.drill?.diameter ?? p.drill?.r;
          if (drill && !p.pad_type?.toString().toLowerCase().includes("np")) {
            const dr = Number(drill) / 2;
            const drPx = Math.max(1, Math.round(dr * (cw / wUnits)));
            ctx.beginPath();
            ctx.fillStyle = "#0000";
            ctx.globalCompositeOperation = "destination-out";
            ctx.arc(cx, cy, drPx, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "#fff";
          }
        } else {
          // rectangle/oval
          const rx = Math.max(1, Math.round(pw));
          const ry = Math.max(1, Math.round(ph));
          const left = cx - rx / 2;
          const top = cy - ry / 2;
          // if pad looks like an oblong (rounded), draw rounded rect
          const radius = Math.min(rx, ry) * 0.2;
          // rounded rect path
          ctx.beginPath();
          ctx.moveTo(left + radius, top);
          ctx.lineTo(left + rx - radius, top);
          ctx.quadraticCurveTo(left + rx, top, left + rx, top + radius);
          ctx.lineTo(left + rx, top + ry - radius);
          ctx.quadraticCurveTo(left + rx, top + ry, left + rx - radius, top + ry);
          ctx.lineTo(left + radius, top + ry);
          ctx.quadraticCurveTo(left, top + ry, left, top + ry - radius);
          ctx.lineTo(left, top + radius);
          ctx.quadraticCurveTo(left, top, left + radius, top);
          ctx.closePath();
          ctx.fill();
          // drill
          const drill = p.drill?.diameter ?? p.data?.drill?.diameter ?? p.drill?.r;
          if (drill && !p.pad_type?.toString().toLowerCase().includes("np")) {
            const dr = Number(drill) / 2;
            const drillPx = Math.max(1, Math.round(dr * (cw / wUnits)));
            ctx.beginPath();
            ctx.globalCompositeOperation = "destination-out";
            ctx.arc(cx, cy, drillPx, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "#fff";
          }
        }
      }
    }

    if (Array.isArray(fp.graphics)) {
      for (const g of fp.graphics) {
        ctx.beginPath();

        // arcs: either explicit (kind==='arc') with start/mid/end or data.mid
        const hasArcPoints = (arr: any) => Array.isArray(arr) && arr.length === 3 && Array.isArray(arr[0]) && Array.isArray(arr[1]) && Array.isArray(arr[2]);
        const pointsTriplet = hasArcPoints(g.data?.points) ? g.data.points : null;
        const hasExplicitTriplet = Array.isArray(g.start) && Array.isArray(g.mid) && Array.isArray(g.end);
        const hasDataTriplet = Array.isArray(g.data?.start) && Array.isArray(g.data?.mid) && Array.isArray(g.data?.end);
        if (g.kind === "arc" || pointsTriplet || hasExplicitTriplet || hasDataTriplet) {
          const start = parsePoint(g.start ?? g.data?.start ?? pointsTriplet?.[0]);
          const mid = parsePoint(g.mid ?? g.data?.mid ?? pointsTriplet?.[1]);
          const end = parsePoint(g.end ?? g.data?.end ?? pointsTriplet?.[2]);
          const polyline = buildArcPolyline(start, mid, end, flipArcPoints);
          if (polyline && polyline.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(toCanvasX(polyline[0].x), toCanvasY(polyline[0].y));
            for (let i = 1; i < polyline.length; i++) {
              ctx.lineTo(toCanvasX(polyline[i].x), toCanvasY(polyline[i].y));
            }
            ctx.stroke();
            continue;
          }
        }

        // line: start/end may be on g or g.data
        const start = Array.isArray(g.start) && typeof g.start[0] === 'number' ? g.start : Array.isArray(g.data?.start) ? g.data.start : null;
        const end = Array.isArray(g.end) && typeof g.end[0] === 'number' ? g.end : Array.isArray(g.data?.end) ? g.data.end : null;
        if (start && end) {
          const sx = toCanvasX(start[0]);
          const sy = toCanvasY(start[1]);
          const ex = toCanvasX(end[0]);
          const ey = toCanvasY(end[1]);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          continue;
        }

        // polygon/pts: try several shapes
        const pts = Array.isArray(g.pts) && g.pts.length ? g.pts : Array.isArray(g.data?.pts?.xy) ? g.data.pts.xy : null;
        if (pts && pts.length) {
          const first = pts[0];
          const fx = Array.isArray(first) ? first[0] : first.x;
          const fy = Array.isArray(first) ? first[1] : first.y;
          ctx.beginPath();
          ctx.moveTo(toCanvasX(fx), toCanvasY(fy));
          for (let i = 1; i < pts.length; i++) {
            const pt = pts[i];
            const px = Array.isArray(pt) ? pt[0] : pt.x;
            const py = Array.isArray(pt) ? pt[1] : pt.y;
            ctx.lineTo(toCanvasX(px), toCanvasY(py));
          }
          if (g.closed || g.kind === 'polygon') ctx.closePath();
          ctx.stroke();
          continue;
        }

        // circle: center + radius may be in different places (or center+end)
        const center = Array.isArray(g.center) ? g.center : Array.isArray(g.data?.center) ? g.data.center : null;
        let radius: number | null = typeof g.data?.radius === 'number' ? g.data.radius : typeof g.r === 'number' ? g.r : typeof g.radius === 'number' ? g.radius : null;
        // if radius not directly available, try computing it from center+end
        const endPt = Array.isArray(g.end) ? g.end : Array.isArray(g.data?.end) ? g.data.end : null;
        if (center && (radius === null || !isFinite(radius)) && endPt) {
          const dx = endPt[0] - center[0];
          const dy = endPt[1] - center[1];
          const rcalc = Math.hypot(dx, dy);
          if (isFinite(rcalc) && rcalc > 0) radius = rcalc;
        }
        if (center && typeof radius === 'number') {
          const ccx = toCanvasX(center[0]);
          const ccy = toCanvasY(center[1]);
          const pr = Math.max(1, Math.round(radius * (cw / wUnits)));
          ctx.beginPath();
          ctx.arc(ccx, ccy, pr, 0, Math.PI * 2);
          ctx.stroke();
          continue;
        }

        // fallback: single point graphics (at or x/y) -> small dot
        let pxVal: number | null = null;
        let pyVal: number | null = null;
        if (Array.isArray(g.at) && typeof g.at[0] === 'number') {
          pxVal = g.at[0];
          pyVal = g.at[1];
        } else if (g.at && typeof g.at.x === 'number') {
          pxVal = g.at.x;
          pyVal = g.at.y;
        } else if (typeof g.x === 'number') {
          pxVal = g.x;
          pyVal = g.y ?? 0;
        }
        if (pxVal !== null && pyVal !== null) {
          const ccx = toCanvasX(pxVal);
          const ccy = toCanvasY(pyVal);
          ctx.beginPath();
          ctx.arc(ccx, ccy, Math.max(1, Math.round(Math.min(cw, ch) * 0.003)), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = true;
    tex.needsUpdate = true;

    if (textureRef.current) {
      textureRef.current.dispose();
    }
    textureRef.current = tex;
    setTexture(tex);

    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      setTexture(null);
    };
  }, [fp, bbox, widthUnits, heightUnits]);

  return {
    texture,
    widthUnits,
    heightUnits,
    bboxCenterX,
    bboxCenterY,
    x,
    y,
    angleRad,
    isFlipped,
  };
}
