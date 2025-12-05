import { useMemo } from "react";
import * as THREE from "three";

type Poly = Array<[number, number]>;

function flattenToPoints(candidate: any): Poly | null {
  if (!candidate) return null;
  // common shapes: candidate.points, candidate.pts (array of [x,y]), candidate.data?.pts?.xy (flat or nested)
  if (Array.isArray(candidate.points) && candidate.points.length) {
    const pts = candidate.points.map((p: any) => (Array.isArray(p) ? [p[0], p[1]] : [p.x ?? 0, p.y ?? 0]));
    return pts;
  }
  if (Array.isArray(candidate.pts) && candidate.pts.length) {
    // could be flat pairs or nested arrays
    if (Array.isArray(candidate.pts[0])) {
      return candidate.pts.map((p: any) => [p[0], p[1]]);
    }
    // flat numeric array
    if (typeof candidate.pts[0] === "number") {
      const arr: Poly = [];
      for (let i = 0; i + 1 < candidate.pts.length; i += 2) arr.push([candidate.pts[i], candidate.pts[i + 1]]);
      return arr;
    }
  }
  const maybe = candidate.data ?? candidate;
  if (maybe && maybe.pts && Array.isArray(maybe.pts?.xy) && maybe.pts.xy.length) {
    const xy = maybe.pts.xy;
    if (typeof xy[0] === "number") {
      const arr: Poly = [];
      for (let i = 0; i + 1 < xy.length; i += 2) arr.push([xy[i], xy[i + 1]]);
      return arr;
    }
    if (Array.isArray(xy[0])) return xy.map((p: any) => [p[0], p[1]]);
  }
  // fallback: maybe the graphic is a circle/rect; not supported here
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

export default function EdgeCutsRenderer({ pcb }: { pcb: any }) {
  const shapes = useMemo(() => {
    if (!pcb || !Array.isArray(pcb.graphics)) return [] as any[];
    // filter graphics to Edge.Cuts like layers
    const candidates = pcb.graphics.filter((g: any) => {
      const layer = (g.layer ?? g.data?.layer ?? "").toString().toLowerCase();
      return layer.includes("edge") && layer.includes("cut");
    });

    const polys: Poly[] = [];
    for (const g of candidates) {
      const p = flattenToPoints(g);
      if (p && p.length >= 3) polys.push(p);
    }

    // build containment tree
    const nodes = polys.map((poly, idx) => ({ poly, idx, area: Math.abs(polygonArea(poly)), parent: -1 as number, children: [] as number[] }));

    for (let i = 0; i < nodes.length; i++) {
      const cent = (() => {
        const poly = nodes[i].poly;
        let sx = 0, sy = 0;
        for (const p of poly) { sx += p[0]; sy += p[1]; }
        return [sx / poly.length, sy / poly.length] as [number, number];
      })();
      // find smallest-area polygon that contains this centroid (and is larger area)
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

    // compute depth
    const depth: number[] = new Array(nodes.length).fill(-1);
    function computeDepth(i: number) {
      if (depth[i] !== -1) return depth[i];
      const p = nodes[i].parent;
      if (p === -1) { depth[i] = 0; return 0; }
      depth[i] = computeDepth(p) + 1;
      return depth[i];
    }
    for (let i = 0; i < nodes.length; i++) computeDepth(i);

    // group by even-depth nodes as positive shapes with odd-depth children as holes
    const result: { outer: Poly; holes: Poly[] }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (depth[i] % 2 !== 0) continue; // odd depth nodes are holes for parent
      const outer = nodes[i].poly;
      const holes: Poly[] = [];
      for (const c of nodes[i].children) {
        if (depth[c] === depth[i] + 1) holes.push(nodes[c].poly);
      }
      result.push({ outer, holes });
    }

    return result;
  }, [pcb]);

  return (
    <group>
      {shapes.map((s, i) => {
        const shape = new THREE.Shape();
        const [sx, sy] = s.outer[0];
        shape.moveTo(sx, sy);
        for (let k = 1; k < s.outer.length; k++) shape.lineTo(s.outer[k][0], s.outer[k][1]);
        shape.lineTo(s.outer[0][0], s.outer[0][1]);

        for (const h of s.holes) {
          const hole = new THREE.Path();
          hole.moveTo(h[0][0], h[0][1]);
          for (let k = 1; k < h.length; k++) hole.lineTo(h[k][0], h[k][1]);
          hole.lineTo(h[0][0], h[0][1]);
          shape.holes.push(hole);
        }

        const extrudeSettings: THREE.ExtrudeGeometryOptions = { depth: 1, bevelEnabled: false };

        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
            <extrudeGeometry args={[shape, extrudeSettings]} />
            <meshStandardMaterial color="#0b5f3a" metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}
