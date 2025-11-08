// WireTool.tsx
import  { useCallback, useEffect, useMemo, useState } from "react";
import { Path, Layer, Arc } from "react-konva";
import { useStage } from "../context/stageProvider";
import { makeOrthogonalRoundedPath } from "../hooks/makeOrthogonalPath";
import { useComponents } from "../context/ComponentContext";
import { useTool } from "../context/ToolContext";
import { useWires } from "../context/WireContext";

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

  const baseStroke = 3;

  const { wires, setWires } = useWires();
  const [drawing, setDrawing] = useState<{ worldPoints: Point[] } | null>(null);
  const { components } = useComponents();
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
  worldPos = { x: target.pin.x, y: target.pin.y }; // ✅ only valid fields

  target.pin.connected = true;

  updateWirePinPosition(
      target.pin.id,
      worldPos.x,
      worldPos.y
  );
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
  let result: (Wire & { humps: Point[] })[] = [];

  wires.forEach((w1, i) => {
    let newPts = [...w1.points];
    let humps: Point[] = [];

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


  // ✨ Smooth live preview
  const previewPath = useMemo(() => {
    if (!drawing) return "";
    const snapped = drawing.worldPoints.map(snapWorld);
    const poly = buildPolyline(snapped);
    return makeOrthogonalRoundedPath(poly, 6);
  }, [drawing, snapWorld, buildPolyline]);



  return (
    <Layer
      x = {position.x}
      y = {position.y}
      scale={{x: scale, y: scale}}
      listening={false}
    >
      {/* ✅ Final wires */}

    {processedWires.map(w => (
        <Path
          key={w.id}
          data={makeOrthogonalRoundedPath(w.points, 6)}
          stroke="#29AF0F"
          strokeWidth={Math.max(baseStroke / scale, 1)}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      ))}

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
