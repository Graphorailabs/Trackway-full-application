// WireTool.tsx
import  { useCallback, useEffect, useMemo, useState } from "react";
import { Path, Layer, Arc } from "react-konva";
import { useStage } from "../context/stageProvider";

import { makeOrthogonalRoundedPath } from "../hooks/makeOrthogonalPath";
import { useComponents } from "../context/ComponentContext";
import { useTool } from "../context/ToolContext";
import { useWires } from "../context/WireContext";
import { useSymbol } from "../context/SymbolContext";



type Point = { x: number; y: number; pinId?: string };

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
  const [previewRoutes, setPreviewRoutes] = useState<Record<string, Point[]>>({});
  const [drawing, setDrawing] = useState<{ worldPoints: Point[] } | null>(null);
  const { components } = useComponents();
  const { placedSymbols, updatePlacedSymbol, livePinPositionsRef } = useSymbol();
  const { updateWirePinPosition } = useWires();

  // Fast listeners for hover/connect events from pin hit areas.
  // These are intentionally always-active (not gated by `tool`) to make
  // hover detection and click-to-start extremely responsive.
  useEffect(() => {
    // Only enable fast hover/connect listeners while in wire mode; the
    // always-on behavior caused selection/hover jitter. Gate it to improve
    // responsiveness and reduce accidental wire selection when cursor moves.
    if (tool !== 'wire') return;
    const onHoverPin = () => {
      try {
        const stage = stageRef.current;
        const container = stage?.container();
        if (container) container.style.cursor = 'crosshair';
      } catch (err) {
        // ignore
      }
    };

    const onLeavePin = () => {
      try {
        const stage = stageRef.current;
        const container = stage?.container();
        if (container) container.style.cursor = 'default';
      } catch (err) {}
    };

    const onConnectQuick = (ev: any) => {
      try {
        const d = ev.detail || {};
        const targetPinId = d.pinId;
        const worldPos = { x: d.x, y: d.y };
        if (!targetPinId) return;

        // Mark pin connected on placed symbols or components
        const sym = (placedSymbols || []).find((s: any) => (s.pins || []).some((pp: any) => pp.id === targetPinId));
        if (sym) {
          const updatedPins = (sym.pins || []).map((p: any) => (p.id === targetPinId ? { ...p, connected: true } : p));
          updatePlacedSymbol(sym.id, { pins: updatedPins });
        } else {
          components.forEach((comp: any) => {
            (comp.pins || []).forEach((p: any) => {
              if (p.id === targetPinId) p.connected = true;
            });
          });
        }

        // update existing wires that reference this pinId
        setWires((prevWires: any[]) =>
          prevWires.map((wire: any) => ({
            ...wire,
            points: wire.points.map((pt: any) => (pt.pinId === targetPinId ? { ...pt, connected: true } : pt)),
          }))
        );

        updateWirePinPosition(targetPinId, worldPos.x, worldPos.y);

        // Start or extend drawing anchored at this pin
        setDrawing((d) => {
          if (!d) return { worldPoints: [{ ...worldPos, pinId: targetPinId }, { ...worldPos, pinId: targetPinId }] };

          const pts = [...d.worldPoints];
          const last = pts[pts.length - 2];
          const newPoint = { ...worldPos, pinId: targetPinId };
          if (last && last.x !== worldPos.x && last.y !== worldPos.y) {
            pts.splice(pts.length - 1, 1, { x: worldPos.x, y: last.y }, newPoint);
          } else {
            pts.splice(pts.length - 1, 1, newPoint);
          }
          return { worldPoints: [...pts, newPoint] };
        });
      } catch (err) {
        console.error('quick connect failed', err);
      }
    };

    window.addEventListener('hover-pin', onHoverPin);
    window.addEventListener('leave-pin', onLeavePin);
    window.addEventListener('connect-wire-to-pin', onConnectQuick as any);

    return () => {
      window.removeEventListener('hover-pin', onHoverPin);
      window.removeEventListener('leave-pin', onLeavePin);
      window.removeEventListener('connect-wire-to-pin', onConnectQuick as any);
    };
  }, [tool, placedSymbols, components, updatePlacedSymbol, setWires, updateWirePinPosition, stageRef]);



  // --- Reroute wires on pin move (must be inside component) ---
  useEffect(() => {
    // Live-moving preview: compute preview Manhattan routes for wires
    // connected to the moved pins. We do not mutate stored wires here.
    function onSymbolPinMoving(e: any) {
      const { pins } = e.detail || {};
      if (!Array.isArray(pins)) return;
      const movedIds = new Set((pins || []).map((p: any) => p.id));

      setPreviewRoutes((prev) => {
        const next = { ...prev };
        (wires || []).forEach((wire: any) => {
          const affected = (wire.points || []).some((pt: any) => pt?.pinId && movedIds.has(pt.pinId));
          if (!affected) return;

          const livePts = (wire.points || []).map((pt: any) => {
            if (pt && pt.pinId) {
              const live = pins.find((p: any) => p.id === pt.pinId);
              if (live) return { x: live.x, y: live.y, pinId: pt.pinId };
            }
            return { x: pt.x, y: pt.y, pinId: pt.pinId };
          });

          try {
            const routed = manhattanRoutePolyline(livePts);
            const cleaned = removeSmallSegments(compressOrthogonal(routed));
            next[wire.id] = cleaned;
          } catch (err) {
            console.error('preview route failed', err);
          }
        });
        return next;
      });
    }

    // Finalize on drag end: compute final routed polylines and persist
    function onSymbolDragEnd(e: any) {
      const { pins } = e.detail || {};
      if (!Array.isArray(pins)) return;
      const movedIds = new Set((pins || []).map((p: any) => p.id));

      setWires((prev) => {
        return (prev || []).map((wire: any) => {
          const affected = (wire.points || []).some((pt: any) => pt?.pinId && movedIds.has(pt.pinId));
          if (!affected) return wire;

          const livePts = (wire.points || []).map((pt: any) => {
            if (pt && pt.pinId) {
              const live = pins.find((p: any) => p.id === pt.pinId);
              if (live) return { x: live.x, y: live.y, pinId: pt.pinId };
            }
            return { x: pt.x, y: pt.y, pinId: pt.pinId };
          });

          try {
            const routed = manhattanRoutePolyline(livePts);
            const cleanedRaw = removeSmallSegments(compressOrthogonal(routed));
            // ensure endpoints keep pinId if original had them
            const newPoints = cleanedRaw.map((p: any) => ({ x: p.x, y: p.y, pinId: p.pinId ?? undefined }));
            const orig = wire.points || [];
            if (orig[0]?.pinId) newPoints[0].pinId = orig[0].pinId;
            if (orig[orig.length - 1]?.pinId) newPoints[newPoints.length - 1].pinId = orig[orig.length - 1].pinId;
            return { ...wire, points: newPoints };
          } catch (err) {
            console.error('final route failed', err);
            return wire;
          }
        });
      });

      // clear previews for moved wires
      setPreviewRoutes((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((wid) => {
          const wire = wires.find((w: any) => w.id === wid);
          if (!wire) delete next[wid];
          else {
            const affected = (wire.points || []).some((pt: any) => pt?.pinId && movedIds.has(pt.pinId));
            if (affected) delete next[wid];
          }
        });
        return next;
      });
    }

    window.addEventListener('symbol-pin-moving', onSymbolPinMoving);
    window.addEventListener('symbol-drag-end', onSymbolDragEnd);
    return () => {
      window.removeEventListener('symbol-pin-moving', onSymbolPinMoving);
      window.removeEventListener('symbol-drag-end', onSymbolDragEnd);
    };
  }, [setWires]);

 function toWorldCoords(stage: any, state: any){
     // Prefer Konva's absolute transform inversion when available. This
     // maps the pointer position into the stage's world coordinates
     // correctly even when the stage has been panned/scaled.
     try {
       const pointer = stage.getPointerPosition && stage.getPointerPosition();
       if (!pointer) return;
       const abs = stage.getAbsoluteTransform && stage.getAbsoluteTransform();
       if (abs && abs.copy && abs.point) {
         // Some Konva versions expose a `point` method on Transform
         const inv = abs.copy().invert();
         // `point` expects an object {x,y}
         const p = inv.point(pointer);
         return { x: p.x, y: p.y };
       }

       // Fallback: use stored state (pan/zoom) if transform isn't available
       return {
         x: (pointer.x - state.position.x) / state.scale,
         y: (pointer.y - state.position.y) / state.scale,
       };
     } catch (err) {
       // On any error, fallback to previous method
       const pointer = stage.getPointerPosition && stage.getPointerPosition();
       if (!pointer) return;
       return {
         x: (pointer.x - state.position.x) / state.scale,
         y: (pointer.y - state.position.y) / state.scale,
       };
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
    let pinId: string | undefined = undefined;
    const target = getClosestPin(worldPos);

    // ✅ Snap wire endpoint exactly onto pin center
    if (target) {
      worldPos = { x: target.pin.x, y: target.pin.y };
      pinId = target.pin.id;

      // If the pin belongs to a placed symbol, update via symbol context
      const sym = (placedSymbols || []).find((s: any) => s.id === target.comp?.id);
      if (sym) {
        const updatedPins = (sym.pins || []).map((p: any) =>
          (p.id === target.pin.id ? { ...p, connected: true } : p)
        );
        updatePlacedSymbol(sym.id, { pins: updatedPins });
      } else {
        // Otherwise assume it's a component pin and mutate (legacy behavior)
        target.pin.connected = true;
      }

      // Also update all wires that connect to this pinId to mark the endpoint as connected
      setWires((prevWires: any[]) =>
        prevWires.map((wire: any) => ({
          ...wire,
          points: wire.points.map((pt: any) =>
            pt.pinId === target.pin.id ? { ...pt, connected: true } : pt
          ),
        }))
      );

      updateWirePinPosition(target.pin.id, worldPos.x, worldPos.y);
    }

    setDrawing((d) => {
      if (!d) return { worldPoints: [{ ...worldPos, pinId }, { ...worldPos, pinId }] };

      const pts = [...d.worldPoints];
      const last = pts[pts.length - 2];

      let newPoint = { ...worldPos, pinId };
      if (last && last.x !== worldPos.x && last.y !== worldPos.y) {
        pts.splice(pts.length - 1, 1, { x: worldPos.x, y: last.y }, newPoint);
      } else {
        pts.splice(pts.length - 1, 1, newPoint);
      }

      return { worldPoints: [...pts, newPoint] };
    });
  };


    const finalize = () => {
      if (!drawing) return;

      // Keep pinId on points if present
        let finalWorld = drawing.worldPoints.map((pt) => ({ ...snapWorld(pt), pinId: pt.pinId }));

        // Clean up tiny jogs and compress orthogonal segments before saving
        if (finalWorld.length >= 2) {
          // Clean and ensure each point has a `pinId` property (may be undefined)
          const cleaned = removeSmallSegments(compressOrthogonal(finalWorld)).map((p: any) => ({ x: p.x, y: p.y, pinId: p.pinId ?? undefined }));
          setWires((w) => [...w, {
            id: Date.now().toString(),
            points: cleaned  // ✅ PURE WORLD SPACE, with pinId if attached
          }]);
        }

      setDrawing(null);
    };


  stage.on("mousemove", onMove);
  stage.on("click", onClick);
  stage.on("dblclick", finalize);

  // Allow external components to request connecting a wire to a specific pin
  // (e.g. clicking a placement overlay). The event detail must be { pinId, x, y }
  const onExternalConnect = (ev: any) => {
    try {
      const d = ev.detail || {};
      const pinId = d.pinId;
      if (!pinId) return;
      let worldPos = { x: d.x, y: d.y };

      // same logic as onClick when snapping to a pin: mark pin connected and
      // update placed symbol/component state and wire positions
      const targetPinId = pinId;

      // Try to find placed symbol that contains this pin
      const sym = (placedSymbols || []).find((s: any) => (s.pins || []).some((pp: any) => pp.id === targetPinId));
      if (sym) {
        const updatedPins = (sym.pins || []).map((p: any) => (p.id === targetPinId ? { ...p, connected: true } : p));
        updatePlacedSymbol(sym.id, { pins: updatedPins });
      } else {
        // try components list
        components.forEach((comp: any) => {
          (comp.pins || []).forEach((p: any) => {
            if (p.id === targetPinId) p.connected = true;
          });
        });
      }

      // update existing wires that reference this pinId
      setWires((prevWires: any[]) =>
        prevWires.map((wire: any) => ({
          ...wire,
          points: wire.points.map((pt: any) => (pt.pinId === targetPinId ? { ...pt, connected: true } : pt)),
        }))
      );

      updateWirePinPosition(targetPinId, worldPos.x, worldPos.y);

      // Now synthesize drawing behavior: if not currently drawing, start a new drawing anchored to this pin
      setDrawing((d) => {
        if (!d) return { worldPoints: [{ ...worldPos, pinId: targetPinId }, { ...worldPos, pinId: targetPinId }] };

        const pts = [...d.worldPoints];
        const last = pts[pts.length - 2];

        let newPoint = { ...worldPos, pinId: targetPinId };
        if (last && last.x !== worldPos.x && last.y !== worldPos.y) {
          pts.splice(pts.length - 1, 1, { x: worldPos.x, y: last.y }, newPoint);
        } else {
          pts.splice(pts.length - 1, 1, newPoint);
        }

        return { worldPoints: [...pts, newPoint] };
      });
    } catch (err) {
      console.error('external connect handler failed', err);
    }
  };

  window.addEventListener('connect-wire-to-pin', onExternalConnect as any);

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") finalize();
    if (ev.key === "Escape") setDrawing(null);
  });

  return () => {
    stage.off("mousemove", onMove);
    stage.off("click", onClick);
    stage.off("dblclick", finalize);
    window.removeEventListener("keydown", finalize);
    window.removeEventListener('connect-wire-to-pin', onExternalConnect as any);
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



// Helper to get live pin position by pinId
function getLivePinPosition(pinId: string): Point | null {
  // Search placedSymbols first
  // Check live drag positions first
  for (const symId of Object.keys(livePinPositionsRef.current || {})) {
    const pinsForSym = livePinPositionsRef.current[symId] || {};
    if (pinsForSym[pinId]) return { x: pinsForSym[pinId].x, y: pinsForSym[pinId].y };
  }

  for (const sym of placedSymbols || []) {
    for (const pin of sym.pins || []) {
      if (pin.id === pinId) return { x: pin.x, y: pin.y };
    }
  }
  // Search components
  for (const comp of components || []) {
    for (const pin of comp.pins || []) {
      if (pin.id === pinId) return { x: pin.x, y: pin.y };
    }
  }
  return null;
}


function getProcessedWires() {
  try {
    const result: Array<{ id: string; points: Point[]; humps: Point[] }> = [];
    wires.forEach((w1, i) => {
      // defensive guards
      if (!w1 || !Array.isArray(w1.points) || w1.points.length === 0) return;

      // For each point, if pinId is present, use live position
      const newPts: Point[] = w1.points.map((pt) => {
        if (pt && pt.pinId) {
          const live = getLivePinPosition(pt.pinId);
          if (live) return { ...pt, ...live };
        }
        return pt;
      });
      const humps: Point[] = [];
      wires.forEach((w2, j) => {
        if (i === j) return;
        if (!w2 || !Array.isArray(w2.points) || w2.points.length < 2) return;
        for (let a = 0; a < newPts.length - 1; a++) {
          for (let b = 0; b < w2.points.length - 1; b++) {
            // Only insert humps for true wire-to-wire crossings, not at endpoints
            // Avoid cutting the wire at the very start or end (pin connection)
            if (a === 0 || a + 1 === newPts.length - 1) continue;
            if (b === 0 || b + 1 === w2.points.length - 1) continue;
            const segA1 = newPts[a];
            const segA2 = newPts[a + 1];
            const segB1 = w2.points[b];
            const segB2 = w2.points[b + 1];
            if (!segA1 || !segA2 || !segB1 || !segB2) continue;
            const cross = segmentIntersection(segA1, segA2, segB1, segB2);
            if (!cross) continue;
            const { clippedPoints, humpCenter } = insertHumpOnWireSegment(newPts.slice(a, a + 2), cross);
            newPts.splice(a, 2, ...clippedPoints);
            humps.push(humpCenter);
          }
        }
      });
      // compress & remove tiny segments from processed points so display is clean
      const cleanedRaw = removeSmallSegments(compressOrthogonal(newPts));
      // Ensure each point has a `pinId` key (possibly undefined) to satisfy types
      const cleaned = cleanedRaw.map((p: any) => ({ x: p.x, y: p.y, pinId: p.pinId ?? undefined }));
      result.push({ ...w1, points: cleaned, humps });
    });
    return result;
  } catch (err) {
    console.error("getProcessedWires failed:", err);
    return [];
  }
}


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

// Remove very small consecutive segments (world units) that create tiny jogs
const removeSmallSegments = (pts: Point[], minLen = 4) => {
  if (!pts || pts.length < 2) return pts;
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const prev = out[out.length - 1];
    const dx = Math.abs(p.x - prev.x);
    const dy = Math.abs(p.y - prev.y);
    const len = Math.hypot(dx, dy);
    // If this segment is too short, skip adding this point (merge with prev)
    if (len < minLen) {
      // Instead of pushing p, replace prev with p to keep topology
      out[out.length - 1] = p;
      continue;
    }
    out.push(p);
  }

  // After removal, also compress colinear again
  return compressOrthogonal(out);
};


  // ✨ Smooth live preview
  const previewPath = useMemo(() => {
    if (!drawing) return "";
    // drawing.worldPoints are already in WORLD coordinates. For an accurate
    // preview that follows the cursor correctly at any zoom level we must
    // route in WORLD space (not screen space). Feed snapped world points
    // directly to the Manhattan router and then build the path from the
    // resulting WORLD coordinates.
    const snappedWorld = drawing.worldPoints.map((p) => snapWorld(p));
    const routedWorld = manhattanRoutePolyline(snappedWorld);
    // When live-dragging symbols, prefer sharp 90° corners (radius=0)
    // so the wire remains perpendicular and doesn't draw rounded loops.
    const liveDragging = Object.keys(livePinPositionsRef.current || {}).length > 0;
    const previewRadius = liveDragging ? 0 : 6;
    return makeOrthogonalRoundedPath(routedWorld, previewRadius);
  }, [drawing, snapWorld, buildPolyline]);



  return (
    <Layer
      x = {position.x}
      y = {position.y}
      scale={{x: scale, y: scale}}
      listening={false}
    >
      {/* ✅ Final wires */}

    {getProcessedWires().map(w => {
      const routed = manhattanRoutePolyline(w.points);
        // Determine stroke width based on connected pin thickness (if any)
        let maxPinThickness = 0;
        (w.points || []).forEach((pt: any) => {
          if (pt.pinId) {
            // find pin object to read pinThickness
            for (const sym of placedSymbols || []) {
              const p = (sym.pins || []).find((pp: any) => pp.id === pt.pinId);
              if (p && p.pinThickness) maxPinThickness = Math.max(maxPinThickness, p.pinThickness);
            }
          }
        });
        // Derive stroke width so it matches the connected pin visual stroke.
        // `pinThickness` is stored in the symbol as a visual thickness (world units);
        // convert to pixel/stage units by dividing by `scale`.
        const strokeFromPin = maxPinThickness ? (maxPinThickness / scale) : undefined;
        const pixelStroke = Math.max(strokeFromPin ?? baseStroke / scale, 0.5);

        // If any symbol is being dragged (live positions exist), render
        // wires with sharp 90° corners to keep them perpendicular during drag.
        const liveDragging = Object.keys(livePinPositionsRef.current || {}).length > 0;
        const cornerRadius = liveDragging ? 0 : 6;

        return (
          <Path
            key={w.id}
            data={makeOrthogonalRoundedPath(routed, cornerRadius)}
            stroke="#29AF0F"
             strokeWidth={Math.max(pixelStroke, 0.5)}   
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        );
      })}

    {/* Live preview routes for wires connected to the symbol being dragged */}
    {Object.entries(previewRoutes).map(([wid, pts]) => {
      const liveDragging = Object.keys(livePinPositionsRef.current || {}).length > 0;
      const r = liveDragging ? 0 : 6;
      // compute stroke similar to processed wires
      let maxPinThickness = 0;
      const wire = wires.find((w: any) => w.id === wid);
      (wire?.points || []).forEach((pt: any) => {
        if (pt?.pinId) {
          for (const sym of placedSymbols || []) {
            const p = (sym.pins || []).find((pp: any) => pp.id === pt.pinId);
            if (p && p.pinThickness) maxPinThickness = Math.max(maxPinThickness, p.pinThickness);
          }
        }
      });
      const strokeFromPin = maxPinThickness ? (maxPinThickness / scale) : undefined;
      const pixelStroke = Math.max(strokeFromPin ?? baseStroke / scale, 0.5);
      return (
        <Path
          key={`preview-${wid}`}
          data={makeOrthogonalRoundedPath(pts, r)}
          stroke="#2a9908ff"
          strokeWidth={Math.max(pixelStroke, 0.5)}
          lineCap="round"
          lineJoin="round"
          opacity={0.6}
          dash={[8 / scale, 6 / scale]}
          listening={false}
        />
      );
    })}

  {/* ✅ Draw hump arcs on top */}
  {getProcessedWires().flatMap(w =>
    w.humps.map((p: Point, i: number) => (
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
          // Match preview stroke width to processed wire logic:
          // compute max connected pin thickness (if any) and derive pixel stroke
          strokeWidth={(() => {
            try {
              let maxPinThickness = 0;
              (drawing.worldPoints || []).forEach((pt: any) => {
                if (pt && pt.pinId) {
                  for (const sym of placedSymbols || []) {
                    const p = (sym.pins || []).find((pp: any) => pp.id === pt.pinId);
                    if (p && p.pinThickness) maxPinThickness = Math.max(maxPinThickness, p.pinThickness);
                  }
                }
              });
              const strokeFromPin = maxPinThickness ? (maxPinThickness / scale) : undefined;
              const pixelStroke = Math.max(strokeFromPin ?? baseStroke / scale, 0.5);
              return Math.max(pixelStroke, 0.5);
            } catch (err) {
              return Math.max(baseStroke / scale, 1);
            }
          })()}
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
