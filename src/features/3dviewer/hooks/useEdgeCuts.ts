import { useMemo } from "react";
import type { PcbGraphicItem, Pcb } from "trackway-parser-wasm";

export type Poly = Array<[number, number]>;

export type BoardBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
};

type LegacyBoardInfo = {
  width?: number;
  height?: number;
};

type PcbWithLegacyBoard = Pcb & { board?: LegacyBoardInfo | null };

function flattenToPoints(candidate: PcbGraphicItem | any): Poly | null {
  if (!candidate) return null;
  const item = (candidate && typeof candidate === "object" && "kind" in candidate && candidate.data) ? candidate.data : candidate;

  if (item && item.pts && Array.isArray(item.pts.xy) && item.pts.xy.length) {
    return item.pts.xy.map((p: any) => [p[0], p[1]] as [number, number]);
  }

  if (Array.isArray(item.pts) && item.pts.length) {
    if (Array.isArray(item.pts[0])) return item.pts.map((p: any) => [p[0], p[1]]);
    if (typeof item.pts[0] === "number") {
      const arr: Poly = [];
      for (let i = 0; i + 1 < item.pts.length; i += 2) arr.push([item.pts[i], item.pts[i + 1]]);
      return arr;
    }
  }

  if (item && item.start && item.end) {
    const [x1, y1] = item.start;
    const [x2, y2] = item.end;
    return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
  }

  if (item && item.center && item.end) {
    const [cx, cy] = item.center;
    const [ex, ey] = item.end;
    const r = Math.hypot(ex - cx, ey - cy);
    const segs = 64;
    const arr: Poly = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      arr.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return arr;
  }

  if (item && item.start && item.mid && item.end) {
    const [sx, sy] = item.start as [number, number];
    const [mx, my] = item.mid as [number, number];
    const [ex, ey] = item.end as [number, number];
    const ax = sx, ay = sy, bx = mx, by = my, cx2 = ex, cy2 = ey;
    const d = 2 * (ax * (by - cy2) + bx * (cy2 - ay) + cx2 * (ay - by));
    if (Math.abs(d) < 1e-9) return null;
    const asq = ax * ax + ay * ay;
    const bsq = bx * bx + by * by;
    const csq = cx2 * cx2 + cy2 * cy2;
    const ux = (asq * (by - cy2) + bsq * (cy2 - ay) + csq * (ay - by)) / d;
    const uy = (asq * (cx2 - bx) + bsq * (ax - cx2) + csq * (bx - ax)) / d;
    const r = Math.hypot(sx - ux, sy - uy);
    let startA = Math.atan2(sy - uy, sx - ux);
    let midA = Math.atan2(my - uy, mx - ux);
    let endA = Math.atan2(ey - uy, ex - ux);
    const norm = (a: number) => {
      let v = a % (Math.PI * 2);
      if (v < 0) v += Math.PI * 2;
      return v;
    };
    startA = norm(startA);
    midA = norm(midA);
    endA = norm(endA);
    const isBetweenCCW = (a: number, b: number, x: number) => {
      if (b >= a) return x > a && x < b;
      return x > a || x < b;
    };
    let delta = endA - startA;
    if (delta <= -Math.PI * 2) delta += Math.PI * 2;
    if (delta > Math.PI * 2) delta -= Math.PI * 2;
    const midOnCCW = isBetweenCCW(startA, endA, midA);
    if (!midOnCCW) {
      if (delta > 0) delta = delta - Math.PI * 2;
    }
    const baseSegs = 64;
    const segs = Math.max(6, Math.ceil((Math.abs(delta) / (Math.PI * 2)) * baseSegs));
    const arr: Poly = [];
    for (let i = 0; i <= segs; i++) {
      const a = startA + (delta * (i / segs));
      arr.push([ux + Math.cos(a) * r, uy + Math.sin(a) * r]);
    }
    return arr;
  }

  return null;
}

function polygonArea(poly: Poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    sum += x1 * y2 - x2 * y1;
  }
  return 0.5 * sum;
}

function pointInPoly(pt: [number, number], poly: Poly) {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

export default function useEdgeCuts(pcb: Pcb | null | undefined) {
  return useMemo(() => {
    if (!pcb || !Array.isArray(pcb.graphics)) return [] as any[];
    const candidates = pcb.graphics.filter((g: any) => {
      const layer = ((g.layer ?? g.data?.layer ?? "") as string).toString().toLowerCase();
      if (!(layer.includes("edge") && layer.includes("cut"))) return false;
      const kind = (g.kind ?? (g.data && (g.data.kind ?? ""))).toString().toLowerCase();
      if (kind === "arc" || kind === "line") return false;
      return true;
    });

    const polys: Poly[] = [];
    for (const g of candidates) {
      const p = flattenToPoints(g);
      if (p && p.length >= 3) polys.push(p);
    }

    const nodes = polys.map((poly, idx) => ({ poly, idx, area: Math.abs(polygonArea(poly)), parent: -1 as number, children: [] as number[] }));

    for (let i = 0; i < nodes.length; i++) {
      const cent = (() => {
        const poly = nodes[i].poly;
        let sx = 0, sy = 0;
        for (const p of poly) { sx += p[0]; sy += p[1]; }
        return [sx / poly.length, sy / poly.length] as [number, number];
      })();
      let parentIdx = -1;
      let parentArea = Infinity;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const a = nodes[j];
        if (a.area <= nodes[i].area) continue;
        if (pointInPoly(cent, a.poly)) {
          if (a.area < parentArea) {
            parentArea = a.area;
            parentIdx = j;
          }
        }
      }
      nodes[i].parent = parentIdx;
      if (parentIdx >= 0) nodes[parentIdx].children.push(i);
    }

    const depth: number[] = new Array(nodes.length).fill(-1);
    function computeDepth(i: number) {
      if (depth[i] !== -1) return depth[i];
      const p = nodes[i].parent;
      if (p === -1) { depth[i] = 0; return 0; }
      depth[i] = computeDepth(p) + 1;
      return depth[i];
    }
    for (let i = 0; i < nodes.length; i++) computeDepth(i);

    const result: { outer: Poly; holes: Poly[] }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (depth[i] % 2 !== 0) continue;
      const outer = nodes[i].poly;
      const holes: Poly[] = [];
      for (const c of nodes[i].children) {
        if (depth[c] === depth[i] + 1) holes.push(nodes[c].poly);
      }
      result.push({ outer, holes });
    }

    try { console.debug("useEdgeCuts parsed shapes", { count: result.length }); } catch (e) {}
    return result;
  }, [pcb]);
}

export function computeBoardBounds(shapes: { outer: Poly; holes: Poly[] }[], pcb?: Pcb | null) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const collect = (points: Poly | undefined) => {
    if (!points) return;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  };

  for (const shape of shapes) {
    collect(shape.outer);
    if (Array.isArray(shape.holes)) {
      for (const hole of shape.holes) collect(hole);
    }
  }

  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
    const legacyBoard = (pcb as PcbWithLegacyBoard | null)?.board ?? null;
    const width = legacyBoard?.width;
    const height = legacyBoard?.height;
    if (typeof width === "number" && typeof height === "number") {
      return {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        centerX: width / 2,
        centerY: height / 2,
      } satisfies BoardBounds;
    }
    return null;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  } satisfies BoardBounds;
}
