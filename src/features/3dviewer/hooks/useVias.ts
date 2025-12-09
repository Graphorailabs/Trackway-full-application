import { useMemo } from "react";
import useEdgeCuts, { computeBoardBounds, type BoardBounds } from "./useEdgeCuts";
import type { Pcb, Track, TrackVia } from "../../../../pkg/trackway_parser_wasm";

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

export default function useVias(pcb: Pcb | null | undefined) {
  const shapes = useEdgeCuts(pcb);
  const boardBounds = useMemo<BoardBounds | null>(() => computeBoardBounds(shapes, pcb ?? undefined), [shapes, pcb]);

  // Keep these constants here (renderer will consume)
  const boardDepth = 1;
  const padThickness = 0.12;
  const barrelExtra = 0.04;

  const rawVias = useMemo(() => {
    if (!pcb) return [] as TrackVia[];
    return ((pcb.tracks || []) as Track[]).filter((t) => t.kind === "via").map((t) => t.data as TrackVia);
  }, [pcb]);

  const visibleVias = useMemo(() => {
    return rawVias
      .map((v) => {
        const at = v.at ?? [0, 0];
        const padR = (Number(v.size) || 0.8) / 2;
        const drillR = Math.max(0.12, Number(v.drill) || padR / 2);
        return { ...v, at, padR, drillR };
      })
      .filter((v) => pointInShapeCollections([v.at[0], v.at[1]], shapes));
  }, [rawVias, shapes]);

  return { visibleVias, boardDepth, padThickness, barrelExtra, boardBounds };
}
