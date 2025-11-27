// WireTool.tsx
import  { useCallback, useEffect, useMemo, useState } from "react";
import { Path, Layer, Arc } from "react-konva";
import { useStage } from "../context/stageProvider";
import { makeOrthogonalRoundedPath } from "../hooks/makeOrthogonalPath";
import { useComponents } from "../context/ComponentContext";
import { useTool } from "../context/ToolContext";
import { useWires } from "../context/WireContext";
import { useSymbol } from "../context/SymbolContext";

type Wire = {
  id: string;
  points: {
  x: number;
  y: number;
  pinId?: string; // ✅ Identifies a pin if attached
}[];

};

type Point = { x: number; y: number };

type ClosestPin = {
  comp: any;
  pin: {
    id: string;
    x: number;
    y: number;
    connected: boolean;
    wireId: string | null;
  };
} | null;


export default function WireTool() {
  const { stageRef, state } = useStage();
  const { scale, position } = state;
  // const { getEffectiveStep } = useGrid();
  const { tool } = useTool();

  const step = 1; // or 2 for light snapping

  const baseStroke = 1;

  const { wires, setWires } = useWires();
  const [drawing, setDrawing] = useState<{ worldPoints: Point[] } | null>(null);
  const { components } = useComponents();
  const { placedSymbols, updatePlacedSymbol } = useSymbol();
  const { updateWirePinPosition } = useWires();




 function toWorldCoords(stage: any, state: any){
     const pointer = stage.getPointerPosition();
     if(!pointer) return;

     return {
        x: (pointer.x - state.position.x) / state.scale,
        y: (pointer.y - state.position.y) / state.scale,
     }
 }


  // 📍 WORLD ↔ SCREEN transforms
  const worldToScreen = useCallback(
    (w: Point): Point => ({
      x: w.x * scale + position.x,
      y: w.y * scale + position.y,
    }),
    [scale, position.x, position.y]
  );

  const screenToWorld = useCallback(
    (s: Point): Point => ({
      x: (s.x - position.x) / scale,
      y: (s.y - position.y) / scale,
    }),
    [scale, position.x, position.y]
  );

  

  // 📌 Snap to grid
  const snapWorld = useCallback(
    (w: Point) => {
      const snap = (v: number) => Math.round(v / step) * step;
      return { x: snap(w.x), y: snap(w.y) };
    },
    [step]
  );

  // 📏 Insert corners & convert → SCREEN
  const buildPolyline = useCallback(
    (worldPts: Point[]): Point[] => {
      if (worldPts.length < 2) return worldPts.map(worldToScreen);

      const pts: Point[] = [];
      pts.push(worldToScreen(worldPts[0]));

      for (let i = 0; i < worldPts.length - 1; i++) {
        const a = worldPts[i];
        const b = worldPts[i + 1];

        if (a.x !== b.x && a.y !== b.y) {
          // auto-corner to maintain 90°
          pts.push(worldToScreen({ x: b.x, y: a.y }));
        }
        pts.push(worldToScreen(b));
      }

      return pts;
    },
    [worldToScreen]
  );



// ✅ Improve getClosestPin with correct typing
function getClosestPin(world: Point): ClosestPin {
  let closest: ClosestPin = null;
  let minDist = 10;

  components.forEach((comp: any) => {
    comp.pins.forEach((pin: any) => {
      const dist = Math.hypot(world.x - pin.x, world.y - pin.y);

      if (dist < minDist) {
        closest = { comp, pin };
        minDist = dist;
      }
    });
  });

  // Also search placed symbol pins
  (placedSymbols || []).forEach((sym: any) => {
    (sym.pins || []).forEach((pin: any) => {
      const dist = Math.hypot(world.x - (pin.x ?? 0), world.y - (pin.y ?? 0));
      if (dist < minDist) {
        closest = { comp: sym, pin };
        minDist = dist;
      }
    });
  });

  return closest;
}


useEffect(() => {
  if (tool !== "wire") return;

  const stage = stageRef.current;
  if (!stage) return;

  const onMove = () => {
    if (!drawing) return;
    const pos = toWorldCoords(stage, state);
    if (!pos) return;

    setDrawing((d) =>
      d && ({
        worldPoints: d.worldPoints
          .slice(0, -1)
          .concat(snapWorld(pos))
      })
    );
  };

  const onClick = () => {
    const pos = toWorldCoords(stage, state);
    if (!pos) return;

    let worldPos = screenToWorld(pos);
    const target = getClosestPin(worldPos);

    // ✅ Snap wire endpoint exactly onto pin center
    if (target) {
      worldPos = { x: target.pin.x, y: target.pin.y };

      // If the pin belongs to a placed symbol, update via symbol context
      const sym = (placedSymbols || []).find((s: any) => s.id === target.comp?.id);
      if (sym) {
        const updatedPins = (sym.pins || []).map((p: any) => (p.id === target.pin.id ? { ...p, connected: true } : p));
        updatePlacedSymbol(sym.id, { pins: updatedPins });
      } else {
        // Otherwise assume it's a component pin and mutate (legacy behavior)
        target.pin.connected = true;
      }

      updateWirePinPosition(target.pin.id, worldPos.x, worldPos.y);
    }


    setDrawing((d) => {
      if (!d) return { worldPoints: [worldPos, worldPos] };

      const pts = [...d.worldPoints];
      const last = pts[pts.length - 2];

      if (last && last.x !== worldPos.x && last.y !== worldPos.y) {
        pts.splice(pts.length - 1, 1, { x: worldPos.x, y: last.y }, worldPos);
      } else {
        pts.splice(pts.length - 1, 1, worldPos);
      }

      return { worldPoints: [...pts, worldPos] };
    });
  };

    const finalize = () => {
      if (!drawing) return;

      const finalWorld = drawing.worldPoints.map(snapWorld);

      if (finalWorld.length >= 2) {
        setWires((w) => [...w, {
          id: Date.now().toString(),
          points: finalWorld  // ✅ PURE WORLD SPACE
        }]);
      }

      setDrawing(null);
    };


  stage.on("mousemove", onMove);
  stage.on("click", onClick);
  stage.on("dblclick", finalize);

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") finalize();
    if (ev.key === "Escape") setDrawing(null);
  });

  return () => {
    stage.off("mousemove", onMove);
    stage.off("click", onClick);
    stage.off("dblclick", finalize);
    window.removeEventListener("keydown", finalize);
  };
}, [tool, drawing, snapWorld, buildPolyline, state, stageRef, components]);


//intersection detection
  function segmentIntersection(p1: Point, p2: Point, p3: Point, p4: Point){
      const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
       if(Math.abs(d) < 1e-9) return null;

       const ua = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
       const ub = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;

       if(ua <= 0 || ua >= 1 || ub <= 0 || ub >= 1) return null;
       return {
          x: p1.x + ua * (p2.x  - p1.x), 
          y: p1.y + ua * (p2.y - p1.y)
       };
  }

  //adding crossover arc
function insertHumpOnWireSegment(
  points: Point[],
  cross: Point,
  radius: number = 6
): { clippedPoints: Point[]; humpCenter: Point } {
  const p1 = points[0];
  const p2 = points[1];

  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (len < 1e-6) return { clippedPoints: points, humpCenter: cross };

  const dx = (p2.x - p1.x) / len;
  const dy = (p2.y - p1.y) / len;

  const gap = radius * 2.6; // ✅ Remove more wire for full clearance


  const cut1 = {
    x: cross.x - dx * gap / 2,
    y: cross.y - dy * gap / 2,
  };

  const cut2 = {
    x: cross.x + dx * gap / 2,
    y: cross.y + dy * gap / 2,
  };

  return {
    clippedPoints: [p1, cut1, cut2, p2], // ✅ wire will skip arc region
    humpCenter: cross
  };
}


const processedWires = useMemo(() => {
  const result: (Wire & { humps: Point[] })[] = [];

  wires.forEach((w1, i) => {
    const newPts = [...w1.points];
    const humps: Point[] = [];

    wires.forEach((w2, j) => {
      if (i === j) return;

      for (let a = 0; a < w1.points.length - 1; a++) {
        for (let b = 0; b < w2.points.length - 1; b++) {
          const cross = segmentIntersection(
            w1.points[a], w1.points[a + 1],
            w2.points[b], w2.points[b + 1]
          );
          if (!cross) continue;

          const { clippedPoints, humpCenter } =
            insertHumpOnWireSegment(w1.points.slice(a, a+2), cross);

          newPts.splice(a, 2, ...clippedPoints); // ✅ Replace segment
          humps.push(humpCenter);
        }
      }
    });

    result.push({ ...w1, points: newPts, humps });
  });

  return result;
}, [wires]);


// ----------------------
// Manhattan router
// ----------------------
// Simple grid-based A* router that returns orthogonal waypoints between points.
const manhattanRoutePolyline = (pts: Point[]): Point[] => {
  if (!pts || pts.length < 2) return pts;
  const out: Point[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const seg = routeSegmentManhattan(a, b);
    if (i === 0) out.push(...seg);
    else out.push(...seg.slice(1)); // avoid duplicating junction
  }
  return out;
};

// Build obstacle rects from components and placed symbols (approximated)
const buildObstacles = () => {
  const rects: { x1: number; y1: number; x2: number; y2: number }[] = [];

  // components: use pin positions to form a bbox
  components.forEach((c: any) => {
    if (!c.pins || c.pins.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    c.pins.forEach((p: any) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    const pad = 8; // world units padding
    rects.push({ x1: minX - pad, y1: minY - pad, x2: maxX + pad, y2: maxY + pad });
  });

  // placed symbols: attempt to compute gfx bbox from symbolData.graphics (if present)
  (placedSymbols || []).forEach((s: any) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const units = Array.isArray(s.symbolData) ? s.symbolData : s.symbolData?.unit || [];
    units.forEach((u: any) => {
      if (Array.isArray(u.graphics)) {
        u.graphics.forEach((g: any) => {
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
          }
        });
      }
    });

    if (minX !== Infinity) {
      // transform by placed position and scale (assume 1:1 world coords)
      const px = s.position?.x ?? 0;
      const py = s.position?.y ?? 0;
      const pad = 8;
      rects.push({ x1: px + minX - pad, y1: py + minY - pad, x2: px + maxX + pad, y2: py + maxY + pad });
    }
  });

  return rects;
};

// A very small A* on integer grid
const routeSegmentManhattan = (start: Point, end: Point): Point[] => {
  const gridSize = 8; // world units per cell
  const obstacles = buildObstacles();

  const snapToGrid = (p: Point) => ({ x: Math.round(p.x / gridSize), y: Math.round(p.y / gridSize) });
  const unsnap = (g: { x: number; y: number }) => ({ x: g.x * gridSize, y: g.y * gridSize });

  const s = snapToGrid(start);
  const e = snapToGrid(end);

  // quick direct orthogonal path if aligned
  if (s.x === e.x || s.y === e.y) return [start, end];

  const key = (n: any) => `${n.x},${n.y}`;

  const inObstacle = (gx: number, gy: number) => {
    const wx = gx * gridSize;
    const wy = gy * gridSize;
    return obstacles.some(r => wx >= r.x1 && wx <= r.x2 && wy >= r.y1 && wy <= r.y2);
  };

  const neighbors = (n: any) => {
    return [
      { x: n.x + 1, y: n.y },
      { x: n.x - 1, y: n.y },
      { x: n.x, y: n.y + 1 },
      { x: n.x, y: n.y - 1 },
    ].filter((nb) => !inObstacle(nb.x, nb.y));
  };

  const h = (n: any) => Math.abs(n.x - e.x) + Math.abs(n.y - e.y);

  const open: Map<string, { n: any; g: number; f: number; parent?: any }> = new Map();
  const closed: Set<string> = new Set();

  open.set(key(s), { n: s, g: 0, f: h(s) });

  while (open.size > 0) {
    // find lowest f
    let currentKey = "";
    let current: any = null;
    for (const [k, v] of open) {
      if (!current || v.f < current.f) {
        current = v; currentKey = k;
      }
    }

    if (!current) break;

    open.delete(currentKey);
    closed.add(currentKey);

    if (current.n.x === e.x && current.n.y === e.y) {
      // reconstruct
      const path: any[] = [];
      let cur = current;
      while (cur) {
        path.push(cur.n);
        cur = (cur as any).parent;
      }
      path.reverse();
      // convert to world points and compress straight segments
      const worldPts = path.map(unsnap);
      return compressOrthogonal(worldPts);
    }

    for (const nb of neighbors(current.n)) {
      const k = key(nb);
      if (closed.has(k)) continue;
      const g = current.g + 1;
      const existing = open.get(k);
      if (!existing || g < existing.g) {
        open.set(k, { n: nb, g, f: g + h(nb), parent: current });
      }
    }
  }

  // fallback: simple L-shaped: horizontal then vertical
  return [start, { x: end.x, y: start.y }, end];
};

// compress consecutive colinear points (world coords)
const compressOrthogonal = (pts: Point[]) => {
  if (!pts || pts.length === 0) return pts;
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const prev = out[out.length - 1];
    if (prev.x === p.x && prev.y === p.y) continue;
    // if same line as previous segment, replace
    if (out.length >= 2) {
      const prev2 = out[out.length - 2];
      if ((prev2.x === prev.x && prev.x === p.x) || (prev2.y === prev.y && prev.y === p.y)) {
        out[out.length - 1] = p;
        continue;
      }
    }
    out.push(p);
  }
  return out;
};


  // ✨ Smooth live preview
  const previewPath = useMemo(() => {
    if (!drawing) return "";
    const snapped = drawing.worldPoints.map(snapWorld);
    const poly = buildPolyline(snapped);
    // Route each consecutive segment with Manhattan router to avoid obstacles
    const routed = manhattanRoutePolyline(poly);
    return makeOrthogonalRoundedPath(routed, 6);
  }, [drawing, snapWorld, buildPolyline]);



  return (
    <Layer
      x = {position.x}
      y = {position.y}
      scale={{x: scale, y: scale}}
      listening={false}
    >
      {/* ✅ Final wires */}

    {processedWires.map(w => {
        const routed = manhattanRoutePolyline(w.points);
        return (
          <Path
            key={w.id}
            data={makeOrthogonalRoundedPath(routed, 6)}
            stroke="#29AF0F"
            strokeWidth={Math.max(baseStroke / scale, 0.5)}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        )
      })}

  {/* ✅ Draw hump arcs on top */}
  {processedWires.flatMap(w =>
    w.humps.map((p, i) => (
      <Arc
        key={`${w.id}-hump-${i}`}
        x={p.x}
        y={p.y}
        innerRadius={6 / scale}
        outerRadius={(6 + 1.2) / scale}
        angle={180}
        rotation={90}  // ✅ vertical arc
        stroke="#c2102aff"
        strokeWidth={1.5 / scale}
        listening={false}
      />
    ))
  )}

 
    
      {/* ✅ Live glowing preview */}
    {drawing && previewPath && (
        <Path
          data={previewPath}
          stroke="#2a9908ff"  // bright green but we reduce visibility with low opacity
          strokeWidth={Math.max(baseStroke / scale, 1)}
          opacity={0.25} // ✅ faint watermark look
          lineCap="round"
          lineJoin="round"
          //dash={[6 / scale, 6 / scale]} // ✅ dashed ghost wire
          listening={false}
        />
        )}

    </Layer>
  );
}
