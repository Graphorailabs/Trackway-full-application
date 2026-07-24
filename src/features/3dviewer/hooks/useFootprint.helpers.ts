import type { FootprintGraphic, FootprintPad } from "trackway-parser-wasm";
import {
  FOOTPRINT_ZERO_AT,
  FOOTPRINT_ARC_MIN_SEGMENTS,
  FOOTPRINT_ARC_MAX_STEP,
} from "@/features/3dviewer/constants";

export type FootprintPoint = { x: number; y: number };

const isPoint = (pt: FootprintPoint | null): pt is FootprintPoint => Boolean(pt && Number.isFinite(pt.x) && Number.isFinite(pt.y));

type ArcPointSource = {
  start?: unknown;
  mid?: unknown;
  end?: unknown;
  points?: unknown;
};

type GraphicPointCollector = (x: number, y: number) => void;

type PadDrill = FootprintPad["drill"];

const TWO_PI = Math.PI * 2;

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const mod2pi = (value: number) => {
  let v = value % TWO_PI;
  if (v < 0) v += TWO_PI;
  return v;
};

const circumcenter = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;
  const ax2ay2 = ax * ax + ay * ay;
  const bx2by2 = bx * bx + by * by;
  const cx2cy2 = cx * cx + cy * cy;
  const ux = (ax2ay2 * (by - cy) + bx2by2 * (cy - ay) + cx2cy2 * (ay - by)) / d;
  const uy = (ax2ay2 * (cx - bx) + bx2by2 * (ax - cx) + cx2cy2 * (bx - ax)) / d;
  return { x: ux, y: uy } satisfies FootprintPoint;
};

export function parsePoint(raw: unknown): FootprintPoint | null {
  if (!raw && raw !== 0) return null;
  if (Array.isArray(raw)) {
    const [x, y] = raw;
    const nx = Number(x);
    const ny = Number(y);
    if (Number.isFinite(nx) && Number.isFinite(ny)) return { x: nx, y: ny };
    return null;
  }
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as { x?: unknown; y?: unknown; xy?: [unknown, unknown] };
    const nx = Number(obj.x ?? (Array.isArray(obj.xy) ? obj.xy[0] : undefined));
    const ny = Number(obj.y ?? (Array.isArray(obj.xy) ? obj.xy[1] : undefined));
    if (Number.isFinite(nx) && Number.isFinite(ny)) return { x: nx, y: ny };
  }
  return null;
}

export function pointsFromAny(source: unknown): FootprintPoint[] {
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.map((entry) => parsePoint(entry)).filter(isPoint);
  }
  if (typeof source === "object") {
    const obj = source as { xy?: unknown; pts?: { xy?: unknown } };
    if (Array.isArray(obj.xy)) {
      return obj.xy.map((entry) => parsePoint(entry)).filter(isPoint);
    }
    if (obj.pts && Array.isArray(obj.pts.xy)) {
      return obj.pts.xy.map((entry) => parsePoint(entry)).filter(isPoint);
    }
  }
  return [];
}

export function buildArcPolyline(
  start: FootprintPoint | null,
  mid: FootprintPoint | null,
  end: FootprintPoint | null,
  flipStartEndWhenMidIsCenter: boolean,
): FootprintPoint[] | null {
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
  if (!Number.isFinite(radius) || radius <= 1e-6) {
    return [start, end];
  }

  const startAngle = Math.atan2(sy - cy, sx - cx);
  const endAngle = Math.atan2(ey - cy, ex - cx);
  const midAngle = midUsedAsCenter || mx === null || my === null ? null : Math.atan2(my - cy, mx - cx);

  let delta = mod2pi(endAngle - startAngle);
  if (!midUsedAsCenter && midAngle !== null) {
    const ccwToMid = mod2pi(midAngle - startAngle);
    if (ccwToMid > delta + 1e-9) {
      delta -= TWO_PI;
    }
  } else if (midUsedAsCenter && delta > Math.PI) {
    delta -= TWO_PI;
  }

  if (Math.abs(delta) < 1e-6) {
    return [start, end];
  }

  const segments = Math.max(FOOTPRINT_ARC_MIN_SEGMENTS, Math.ceil(Math.abs(delta) / FOOTPRINT_ARC_MAX_STEP));
  const points: FootprintPoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + delta * t;
    points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  return points;
}

export function getArcPolyline(raw: ArcPointSource | null | undefined, flipArcPoints: boolean): FootprintPoint[] | null {
  if (!raw) return null;
  const start = parsePoint(raw.start ?? (Array.isArray(raw.points) ? raw.points[0] : null));
  const mid = parsePoint(raw.mid ?? (Array.isArray(raw.points) ? raw.points[1] : null));
  const end = parsePoint(raw.end ?? (Array.isArray(raw.points) ? raw.points[2] : null));
  return buildArcPolyline(start, mid, end, flipArcPoints);
}

export function extendBoundsWithGraphic(
  graphic: FootprintGraphic,
  addPoint: GraphicPointCollector,
  flipArcPoints: boolean,
) {
  switch (graphic.kind) {
    case "arc": {
      const polyline = getArcPolyline(graphic.data, flipArcPoints);
      if (polyline) {
        polyline.forEach((pt) => addPoint(pt.x, pt.y));
        return;
      }
      break;
    }
    case "line": {
      const start = parsePoint(graphic.data.start);
      const end = parsePoint(graphic.data.end);
      if (start) addPoint(start.x, start.y);
      if (end) addPoint(end.x, end.y);
      if (start || end) return;
      break;
    }
    case "polygon": {
      const pts = pointsFromAny(graphic.data.pts);
      if (pts.length) {
        pts.forEach((pt) => addPoint(pt.x, pt.y));
        return;
      }
      break;
    }
    case "rect": {
      const start = parsePoint(graphic.data.start);
      const end = parsePoint(graphic.data.end);
      if (start) addPoint(start.x, start.y);
      if (end) addPoint(end.x, end.y);
      if (start || end) return;
      break;
    }
    case "circle": {
      const center = parsePoint(graphic.data.center);
      const edge = parsePoint(graphic.data.end);
      if (center && edge) {
        const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
        if (radius > 0) {
          addPoint(center.x - radius, center.y - radius);
          addPoint(center.x + radius, center.y + radius);
        } else {
          addPoint(center.x, center.y);
        }
        return;
      }
      break;
    }
    case "curve": {
      const pts = pointsFromAny(graphic.data.pts);
      if (pts.length) {
        pts.forEach((pt) => addPoint(pt.x, pt.y));
        return;
      }
      break;
    }
    case "text": {
      const anchor = parsePoint(graphic.data.at);
      if (anchor) {
        addPoint(anchor.x, anchor.y);
        return;
      }
      break;
    }
    case "text_box": {
      const pts = pointsFromAny(graphic.data.pts);
      if (pts.length) {
        pts.forEach((pt) => addPoint(pt.x, pt.y));
        return;
      }
      const start = parsePoint(graphic.data.start);
      const end = parsePoint(graphic.data.end);
      if (start) addPoint(start.x, start.y);
      if (end) addPoint(end.x, end.y);
      if (start || end) return;
      break;
    }
    case "dimension": {
      const pts = pointsFromAny(graphic.data.pts);
      if (pts.length) {
        pts.forEach((pt) => addPoint(pt.x, pt.y));
        const textAt = parsePoint(graphic.data.gr_text?.at);
        if (textAt) addPoint(textAt.x, textAt.y);
        return;
      }
      break;
    }
    default:
      break;
  }
}

export function extractLayerName(layer: unknown): string | null {
  if (layer === null || typeof layer === "undefined") return null;
  if (typeof layer === "string") return layer;
  if (typeof layer === "object") {
    const layerObj = layer as { canonical_name?: unknown; canonicalName?: unknown; name?: unknown };
    if (typeof layerObj.canonical_name === "string") return layerObj.canonical_name;
    if (typeof layerObj.canonicalName === "string") return layerObj.canonicalName;
    if (typeof layerObj.name === "string") return layerObj.name;
  }
  return null;
}

export function getPadCenter(pad: FootprintPad): FootprintPoint {
  const at = pad.at ?? FOOTPRINT_ZERO_AT;
  return parsePoint(at) ?? { x: 0, y: 0 };
}

export function getPadSize(pad: FootprintPad): [number, number] {
  const raw = pad.size;
  const width = Math.max(0.01, toNumber(raw?.[0], 1));
  const height = Math.max(0.01, toNumber(raw?.[1] ?? raw?.[0], raw?.[0] ?? 1));
  return [width, height];
}

export function getPadShapeName(pad: FootprintPad): string {
  return String(pad.shape ?? "rect");
}

export function getPadDrillValue(pad: FootprintPad): PadDrill | null {
  return pad.drill ?? null;
}