import type { Footprint } from "trackway-parser-wasm";

export type FootprintLocalBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  hasGeometry: boolean;
};

const DEFAULT_HALF_SIZE = 5;

const toPoint = (raw: any): [number, number] => {
  if (Array.isArray(raw)) return [Number(raw[0]) || 0, Number(raw[1]) || 0];
  if (raw && typeof raw === "object") return [Number(raw.x) || 0, Number(raw.y) || 0];
  return [0, 0];
};

const pushPoint = (bounds: FootprintLocalBounds, x: number, y: number) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  bounds.minX = Math.min(bounds.minX, x);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxY = Math.max(bounds.maxY, y);
  bounds.hasGeometry = true;
};

const pushRect = (bounds: FootprintLocalBounds, x1: number, y1: number, x2: number, y2: number) => {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  pushPoint(bounds, left, top);
  pushPoint(bounds, right, bottom);
};

const pushCircle = (bounds: FootprintLocalBounds, cx: number, cy: number, radius: number) => {
  if (!Number.isFinite(radius)) return;
  pushPoint(bounds, cx - radius, cy - radius);
  pushPoint(bounds, cx + radius, cy + radius);
};

const pushPolygonPoints = (bounds: FootprintLocalBounds, rawPts: any) => {
  if (!rawPts) return;
  if (Array.isArray(rawPts)) {
    rawPts.forEach((pt) => {
      if (Array.isArray(pt)) pushPoint(bounds, Number(pt[0]) || 0, Number(pt[1]) || 0);
      else if (pt && typeof pt === "object") pushPoint(bounds, Number(pt.x) || 0, Number(pt.y) || 0);
    });
    return;
  }
  if (Array.isArray(rawPts?.xy)) {
    rawPts.xy.forEach((pt: any) => {
      if (Array.isArray(pt)) pushPoint(bounds, Number(pt[0]) || 0, Number(pt[1]) || 0);
      else if (pt && typeof pt === "object") pushPoint(bounds, Number(pt.x) || 0, Number(pt.y) || 0);
    });
  }
};

const pushGraphic = (bounds: FootprintLocalBounds, graphic: any) => {
  if (!graphic) return;
  const data = graphic.data ?? graphic;
  const kind = String(graphic.kind ?? data.kind ?? "").toLowerCase();
  if (kind === "line") {
    const start = toPoint(data.start ?? data.data?.start ?? [0, 0]);
    const end = toPoint(data.end ?? data.data?.end ?? [0, 0]);
    pushPoint(bounds, start[0], start[1]);
    pushPoint(bounds, end[0], end[1]);
    return;
  }
  if (kind === "rect" || kind === "rectangle") {
    const start = toPoint(data.start ?? data.data?.start ?? [0, 0]);
    const end = toPoint(data.end ?? data.data?.end ?? start);
    pushRect(bounds, start[0], start[1], end[0], end[1]);
    return;
  }
  if (kind === "polygon" || kind === "polyline" || kind === "curve" || kind === "bezier") {
    pushPolygonPoints(bounds, data.pts ?? data.data?.pts ?? null);
    return;
  }
  if (kind === "circle") {
    const center = toPoint(data.center ?? data.data?.center ?? [0, 0]);
    const radiusRaw = data.radius ?? data.r ?? data.data?.radius;
    let radius = Number(radiusRaw);
    if (!Number.isFinite(radius)) {
      const end = toPoint(data.end ?? data.data?.end ?? [center[0] + 1, center[1]]);
      radius = Math.hypot(end[0] - center[0], end[1] - center[1]);
    }
    pushCircle(bounds, center[0], center[1], radius);
    return;
  }
  if (kind === "arc") {
    const start = toPoint(data.start ?? data.data?.start ?? [0, 0]);
    const mid = toPoint(data.mid ?? data.data?.mid ?? [0, 0]);
    const end = toPoint(data.end ?? data.data?.end ?? [0, 0]);
    pushPoint(bounds, start[0], start[1]);
    pushPoint(bounds, mid[0], mid[1]);
    pushPoint(bounds, end[0], end[1]);
    return;
  }
  if (kind === "text") {
    const at = toPoint(data.at ?? data.data?.at ?? [0, 0]);
    pushPoint(bounds, at[0], at[1]);
    return;
  }
  // fallback: attempt to read `pts` or `at` if present
  if (data?.at) {
    const at = toPoint(data.at);
    pushPoint(bounds, at[0], at[1]);
  }
  pushPolygonPoints(bounds, data?.pts);
};

export function computeFootprintLocalBounds(fp: Footprint | any): FootprintLocalBounds {
  const bounds: FootprintLocalBounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    hasGeometry: false,
  };

  (fp.pads ?? []).forEach((pad: any) => {
    const at = pad.at ?? { x: 0, y: 0 };
    const [cx, cy] = toPoint(at);
    const sizeArr = pad.size ?? pad.data?.size ?? [1, 1];
    const w = Number(Array.isArray(sizeArr) ? sizeArr[0] : sizeArr?.x) || 1;
    const h = Number(Array.isArray(sizeArr) ? (sizeArr[1] ?? sizeArr[0]) : sizeArr?.y) || w;
    pushRect(bounds, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
  });

  (fp.graphics ?? []).forEach((g: any) => pushGraphic(bounds, g));
  ((fp as any).texts ?? []).forEach((t: any) => {
    const at = toPoint(t.at ?? t.data?.at ?? [0, 0]);
    pushPoint(bounds, at[0], at[1]);
  });

  if (!bounds.hasGeometry) {
    bounds.minX = -DEFAULT_HALF_SIZE;
    bounds.maxX = DEFAULT_HALF_SIZE;
    bounds.minY = -DEFAULT_HALF_SIZE;
    bounds.maxY = DEFAULT_HALF_SIZE;
  }

  return bounds;
}

export const getFootprintPlacement = (fp: Footprint | any) => {
  const raw = fp.at;
  if (Array.isArray(raw)) {
    return {
      x: Number(raw[0]) || 0,
      y: Number(raw[1]) || 0,
      angle: Number(raw[2]) || 0,
    };
  }
  if (raw && typeof raw === "object") {
    return {
      x: Number(raw.x) || 0,
      y: Number(raw.y) || 0,
      angle: Number(raw.angle) || 0,
    };
  }
  return { x: 0, y: 0, angle: 0 };
};
