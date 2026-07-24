import { useMemo } from "react";
import useEdgeCuts, { computeBoardBounds, type BoardBounds } from "./useEdgeCuts";
import type { Pcb, Track, TrackSegment } from "../../../../pkg/trackway_parser_wasm";

type Poly = Array<[number, number]>;

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

function pointInShapeCollections(pt: [number, number], shapes: { outer: Poly; holes: Poly[] }[]) {
  for (const s of shapes) {
    if (!s.outer || s.outer.length < 3) continue;
    if (!pointInPoly(pt, s.outer)) continue;
    if (Array.isArray(s.holes)) {
      let inHole = false;
      for (const h of s.holes) {
        if (pointInPoly(pt, h)) { inHole = true; break; }
      }
      if (inHole) continue;
    }
    return true;
  }
  return false;
}

export default function useFrontCopper(pcb: Pcb | null | undefined) {
  const shapes = useEdgeCuts(pcb);
  const boardBounds = useMemo<BoardBounds | null>(() => computeBoardBounds(shapes, pcb ?? undefined), [shapes, pcb]);

  // configuration constants (kept here so renderer stays thin)
  const boardDepth = 1;
  // make copper thinner so traces look proportionate to vias
  const copperThickness = 0.06;
  const zAt = boardDepth + copperThickness / 2 + 0.01;

  const visibleSegments = useMemo(() => {
    if (!pcb) return [] as TrackSegment[];
    const segs = ((pcb.tracks || []) as Track[])
      .filter((t) => t.kind === "segment")
      .map((t) => t.data as TrackSegment);
    const front = segs.filter((s) => s.layer !== "B.Cu");
    return front.filter((s) => {
      const mx = (s.start[0] + s.end[0]) / 2;
      const my = (s.start[1] + s.end[1]) / 2;
      return pointInShapeCollections([mx, my], shapes);
    });
  }, [pcb, shapes]);

  return { shapes, visibleSegments, boardDepth, copperThickness, zAt, boardBounds };
}
