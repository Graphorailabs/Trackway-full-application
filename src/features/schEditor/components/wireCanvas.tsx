/**
 * RoutingCanvas
 *
 * Renders PCB tracks (finalized and preview) using Konva.
 *
 * Responsibilities:
 * - Render finalized tracks from the PCB data.
 * - Render preview tracks during routing operations.
 * - Handle different layers and visibility.
 */

import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { Layer, Line, Group, Circle, Rect, Text } from "react-konva";
import { usePlacedSymbol } from '../context/PlacedSymbolContext';
import CanvasStage from "./CanvaStage";
import { useCameraViewport } from "./canvas/CameraViewPort";
import { useRouting } from "../context/WireContext";
import { useTool } from "../context/LeftToolbarContext";
import type { WireSegment } from "@/types/project";

// Local types for wires (exported so other modules can reuse if needed)
export type Uuid = string;
export type Pts = { xy: [number, number][] } | { x: number; y: number }[] | Array<[number, number]> | { x: number; y: number }[];
export type Stroke = { width?: number; type?: string } | any;

export interface Wire {
  pts?: { xy: [number, number][] } | null;
  points?: { x: number; y: number }[] | null;
  stroke?: Stroke;
  uuid?: Uuid;
  id?: string | number;
  width?: number;
  layer?: string;
}

/**
 * RoutingCanvas (routing-only)
 *
 * Simplified: render routing preview and finalized tracks from the
 * `WireContext`. Removed PCB-specific dependencies (pcb, layers, vias)
 * so this component focuses purely on rendering routing geometry.
 */
export function RoutingCanvas({ tracks }: { tracks?: WireSegment[] }) {
  // Draw finalized track segments (if provided) and routing preview from context
  const routing = useRouting() as any;
  const { previewTracks, previewIncompatibleWithPad: _previewIncompatibleWithPad, setPreviewTracks, isDrawing: routingIsDrawing, startDrawing, stopDrawing, prepareWorker: _prepareWorker, postWorkerMessage, selectedWireId, setSelectedWireId, removeWire } = routing;
  const { camera, zoom, viewportCenter, screenToWorld } = useCameraViewport();
  const { tool } = useTool();
  const { placedSymbols, livePinPositionsRef } = (() => {
    try { return usePlacedSymbol(); } catch (e) { return { placedSymbols: [] as any[], livePinPositionsRef: { current: {} } as any }; }
  })();

  const isPointOnPlacedPin = (pt: { x: number; y: number } | null) => {
    if (!pt) return false;
    const THRESH = 6; // world units tolerance (increased to match canvas/grid scale)
    try {
      // 1) Check live pin positions (covers dragging/preview cases)
      const lp = (livePinPositionsRef && (livePinPositionsRef as any).current) || {};
      for (const symId of Object.keys(lp || {})) {
        const pinsMap = lp[symId] || {};
        for (const pinId of Object.keys(pinsMap || {})) {
          const p = pinsMap[pinId];
          if (!p) continue;
          const dx = p.x - pt.x; const dy = p.y - pt.y;
          if (Math.hypot(dx, dy) <= THRESH) return true;
        }
      }

      // 2) Fallback: check static placedSymbols list
      if (Array.isArray(placedSymbols)) {
        for (const sym of (placedSymbols || [])) {
          if (!Array.isArray(sym.pins)) continue;
          for (const pin of sym.pins) {
            const px = pin?.x; const py = pin?.y;
            if (typeof px !== 'number' || typeof py !== 'number') continue;
            const dx = px - pt.x; const dy = py - pt.y;
            if (Math.hypot(dx, dy) <= THRESH) return true;
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return false;
  };

  // Hover state for auto-select behavior
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [hoverScreenPos, setHoverScreenPos] = useState<{ x: number; y: number } | null>(null);

  const toWorldFromClient = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: clientX, y: clientY } as { x: number; y: number };
    const rect = el.getBoundingClientRect();
    return screenToWorld({ x: clientX - rect.left, y: clientY - rect.top });
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [wiresState, setWiresState] = useState<Wire[] | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Prefer `tracks` prop when provided (PCB editor). For schematic editor we
  // render canonical `wires` maintained by the Kicad provider; those are
  // published via window events (`set-wires` / `wire-committed` / `wire-added`).
  const segsFromWires = (wiresState || []).flatMap((w: Wire) => {
    // wire may expose `points` as {x,y}[] or `pts.xy` as [[x,y],...]
    let ptsArr: { x: number; y: number }[] = [];
    if (Array.isArray(w.points)) ptsArr = w.points as { x: number; y: number }[];
    else if (w.pts && Array.isArray((w.pts as any).xy)) ptsArr = (w.pts as any).xy.map((p: any) => ({ x: p[0], y: p[1] }));
    else if (Array.isArray(w.points)) ptsArr = (w.points as any).map((p: any) => ({ x: p.x ?? p[0], y: p.y ?? p[1] }));

    const segsOut: any[] = [];
    for (let i = 0; i < ptsArr.length - 1; i++) {
      segsOut.push({ start: [ptsArr[i].x, ptsArr[i].y], end: [ptsArr[i + 1].x, ptsArr[i + 1].y], uuid: (w.id ?? w.uuid ?? String(w.id)) as string, width: w.width ?? (w.stroke?.width ?? 1), layer: w.layer ?? 'F.Cu' });
    }
    return segsOut;
  });

  let segs: any[] = [];
  if (Array.isArray(tracks) && tracks.length > 0) {
    const t0: any = tracks[0];
    if (t0 && Array.isArray((t0 as any).points)) {
      // tracks provided as `WireSegment` (project type) -> convert to start/end segments
      segs = (tracks as WireSegment[]).flatMap((w) => {
        const pts = w.points || [];
        const out: any[] = [];
        for (let i = 0; i < pts.length - 1; i++) {
          out.push({ start: [pts[i].x, pts[i].y], end: [pts[i + 1].x, pts[i + 1].y], uuid: String(w.id ?? (w as any).uuid ?? String(w.id)), width: 1, layer: 'F.Cu' });
        }
        return out;
      });
    } else if (t0 && ((t0 as any).start && (t0 as any).end)) {
      segs = tracks as any[];
    } else {
      segs = segsFromWires;
    }
  } else {
    segs = segsFromWires;
  }

  // Group segments by their uuid (wire id). Render each group as a single polyline
  // so selecting any part selects the whole wire (KiCad-like behavior).
  const grouped: Record<string, any[]> = {};
  segs.forEach((s) => {
    const gid = s.uuid || `__track:${s.start[0]}:${s.start[1]}:${s.end[0]}:${s.end[1]}`;
    if (!grouped[gid]) grouped[gid] = [];
    grouped[gid].push(s);
  });

  // Build a map of endpoint positions -> list of (groupId, which) so we can
  // detect overlapping endpoints (wire-wire coincidences). When multiple
  // wires share the exact same endpoint coordinates we slightly offset each
  // rendered rectangle so every wire's start/end marker remains visible.
  const endpointCollisionMap: Record<string, string[]> = {};
  Object.entries(grouped).forEach(([gid, segments]) => {
    if (!Array.isArray(segments) || segments.length === 0) return;
    const startPt = { x: segments[0].start[0], y: segments[0].start[1] };
    const endSeg = segments[segments.length - 1];
    const endPt = { x: endSeg.end[0], y: endSeg.end[1] };
    const keyStart = `${startPt.x.toFixed(6)}:${startPt.y.toFixed(6)}`;
    const keyEnd = `${endPt.x.toFixed(6)}:${endPt.y.toFixed(6)}`;
    // Only count endpoints that are not attached to placed pins (those we
    // intentionally hide). We'll offset visible endpoints only.
    if (!isPointOnPlacedPin(startPt)) {
      endpointCollisionMap[keyStart] = endpointCollisionMap[keyStart] || [];
      endpointCollisionMap[keyStart].push(`${gid}::start`);
    }
    if (!isPointOnPlacedPin(endPt)) {
      endpointCollisionMap[keyEnd] = endpointCollisionMap[keyEnd] || [];
      endpointCollisionMap[keyEnd].push(`${gid}::end`);
    }
  });

  const renderGroupedWire = (groupId: string, segments: any[], idx: number) => {
    const layerStroke = (segments[0]?.layer === 'wire') ? '#09982aff' : '#e53935';
    // build a single points array: start of first, then end of each segment
    const points: number[] = [];
    if (segments.length > 0) {
      points.push(segments[0].start[0], segments[0].start[1]);
      segments.forEach((seg) => {
        points.push(seg.end[0], seg.end[1]);
      });
    }
    const isSelected = selectedWireId === groupId;
    const stroke = isSelected ? '#e53935' : layerStroke; // keep selected wire red
    const strokeWidth = isSelected ? Math.max(2, (segments[0]?.width || 1) + 2) : (segments[0]?.width || 1);
    // build vertex list from points array
    const vertices: { x: number; y: number }[] = [];
    for (let i = 0; i < points.length; i += 2) {
      vertices.push({ x: points[i], y: points[i + 1] });
    }

    // Use an invisible but wide 'hit' line to improve clickability on thin
    // wires. The visible line is rendered with `listening={false}` so the
    // hit-area handles pointer events uniformly across zoom levels.
    const hitWidth = Math.max(10, strokeWidth * 4);
    // helper to start drawing from a world point when in wire tool
    const maybeStartDrawingFrom = (worldPoint: { x: number; y: number } | null) => {
      if (!worldPoint) return;
      try {
        if (tool === 'wire' && !routingIsDrawing) {
          try { startDrawing(worldPoint); } catch {}
          try { setPreviewTracks([worldPoint]); } catch {}
          try { postWorkerMessage({ type: 'route', id: Date.now(), start: worldPoint, goal: worldPoint, params: { gridStep:1, trackWidth:0.6, clearance:0.2, maxNodes:2000 } }); } catch {}
        }
      } catch (err) {}
    };

    // click handler for the whole wire body
    const handleGroupClick = (e: any) => {
      try { e.cancelBubble = true; } catch (err) {}
      try { setSelectedWireId(groupId); } catch (err) {}
      try { const clientX = e.evt?.clientX ?? e.clientX; const clientY = e.evt?.clientY ?? e.clientY; const world = toWorldFromClient(clientX, clientY); maybeStartDrawingFrom(world); } catch (err) {}
    };

    // click handler for endpoints
    const endpointClick = (pt: { x: number; y: number }, which: 'start' | 'end') => (e: any) => {
      try { e.cancelBubble = true; } catch (err) {}
      try { setSelectedWireId(groupId); } catch (err) {}
      try { window.dispatchEvent(new CustomEvent('connect-wire-to-pin', { detail: { x: pt.x, y: pt.y, wireId: groupId, end: which } })); } catch (err) {}
      try { const clientX = e.evt?.clientX ?? e.clientX; const clientY = e.evt?.clientY ?? e.clientY; const world = toWorldFromClient(clientX, clientY); maybeStartDrawingFrom(world); } catch (err) {}
    };

    return (
      <Group key={groupId || `group-${idx}`}>
        <Line
          id={`${groupId}-hit`}
          points={points}
          stroke={stroke}
          strokeWidth={hitWidth}
          opacity={0.001}
          lineCap="round"
          lineJoin="round"
          listening={true}
          onClick={handleGroupClick}
          onTap={handleGroupClick}
          onDblClick={(e:any)=>{ try{ e.cancelBubble=true }catch{}; try{ setSelectedWireId(groupId); }catch{} }}
        />
        <Line
          id={groupId}
          points={points}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
        {isSelected && vertices.map((v, i) => (
          <Circle
            key={`handle-${groupId}-${i}`}
            x={v.x}
            y={v.y}
            radius={4}
            fill={stroke}
            stroke="#ffffff"
            strokeWidth={1}
            listening={true}
            onClick={(e:any)=>{ try{ e.cancelBubble=true }catch{}; try{ setSelectedWireId(groupId); }catch{} }}
          />
        ))}
        {/* Show endpoint markers only when the endpoint is NOT connected to
            a placed pin or any other drawn wire. */}
        {vertices.length >= 2 && (() => {
          const start = vertices[0];
          const end = vertices[vertices.length - 1];
          const size = 10;
          // Keep pin detection tolerant (pins may be placed slightly off-grid),
          // but require near-exact equality for wire-wire connections to avoid
          // false positives when the user starts drawing a new wire.
         // const PIN_TH = 6; // world units (used by isPointOnPlacedPin internally)
          const WIRE_EPS = 1e-4; // small epsilon for wire endpoint equality

          const pointClose = (a: { x: number; y: number }, b: { x: number; y: number }) => {
            return Math.hypot(a.x - b.x, a.y - b.y) <= WIRE_EPS;
          };

          const isPointConnectedToAnyWire = (pt: { x: number; y: number }) => {
            for (const [otherId, segs] of Object.entries(grouped)) {
              if (otherId === groupId) continue;
              for (const s of segs) {
                const a = { x: s.start[0], y: s.start[1] };
                const b = { x: s.end[0], y: s.end[1] };
                if (pointClose(pt, a) || pointClose(pt, b)) return true;
              }
            }
            return false;
          };

          const startOnPin = isPointOnPlacedPin(start); // uses PIN_TH internally
          const endOnPin = isPointOnPlacedPin(end);
          // Only consider an endpoint "connected" when it attaches to a placed pin.
          // Previously we treated wire-wire equality as a connection which hid
          // endpoint rectangles when a new wire started from an existing wire.
          // Keep rectangles visible for wire-wire joints so each wire shows its
          // own start/end markers even after additional wires are drawn nearby.
          const startConnected = startOnPin;
          const endConnected = endOnPin;

          // Debug: emit console info to help diagnose missing markers during
          // interactive testing. Remove or guard these logs in production.
          try {
            const keyS = `${start.x.toFixed(6)}:${start.y.toFixed(6)}`;
            const keyE = `${end.x.toFixed(6)}:${end.y.toFixed(6)}`;
            const collS = endpointCollisionMap[keyS] || [];
            const collE = endpointCollisionMap[keyE] || [];
            console.debug('[wireCanvas] endpoint', { groupId, start, end, startOnPin, endOnPin, collStartCount: collS.length, collEndCount: collE.length, startConnected, endConnected });
          } catch (err) {}

          // Per-endpoint behavior: show a box for each endpoint that is NOT
          // connected to a pin or another wire. Keep wire-wire matching
          // strict (small epsilon) so starting a new wire nearby doesn't
          // accidentally hide existing boxes.
          return (
            <>
              {!startConnected && (() => {
                const key = `${start.x.toFixed(6)}:${start.y.toFixed(6)}`;
                const coll = endpointCollisionMap[key] || [];
                const idx = coll.indexOf(`${groupId}::start`);
                const offsetAmt = coll.length > 1 && idx >= 0 ? (idx - (coll.length - 1) / 2) * 6 : 0;
                return (
                  <Rect
                    x={start.x - size / 2 + offsetAmt}
                    y={start.y - size / 2}
                    width={size}
                    height={size}
                    fill={'transparent'}
                    stroke={'#22c55e'}
                    strokeWidth={2}
                    cornerRadius={2}
                    listening={true}
                    onClick={endpointClick(start, 'start')}
                  />
                );
              })()}
              {!endConnected && (() => {
                const key = `${end.x.toFixed(6)}:${end.y.toFixed(6)}`;
                const coll = endpointCollisionMap[key] || [];
                const idx = coll.indexOf(`${groupId}::end`);
                const offsetAmt = coll.length > 1 && idx >= 0 ? (idx - (coll.length - 1) / 2) * 6 : 0;
                return (
                  <Rect
                    x={end.x - size / 2 + offsetAmt}
                    y={end.y - size / 2}
                    width={size}
                    height={size}
                    fill={'transparent'}
                    stroke={'#22c55e'}
                    strokeWidth={2}
                    cornerRadius={2}
                    listening={true}
                    onClick={endpointClick(end, 'end')}
                  />
                );
              })()}
            </>
          );
        })()}
      </Group>
    );
  };

  const previewLines: { start: any; end: any; width: number }[] = [];
  if (Array.isArray(previewTracks)) {
    for (let i = 0; i < previewTracks.length - 1; i++) {
      previewLines.push({ start: previewTracks[i], end: previewTracks[i + 1], width: 1.0 });
    }
  }

  // Local interactive drawing state (click-to-start, click-to-finalize)
  // Note: authoritative drawing state comes from RoutingContext (`routing.isDrawing`).
  const [isDrawing, setIsDrawing] = useState(false);
  const [localSegments, setLocalSegments] = useState<{ start: { x: number; y: number }; end: { x: number; y: number }; width: number }[]>([]);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const preferredAxisRef = useRef<'h' | 'v' | null>(null);
  const startScreenRef = useRef<{ x: number; y: number } | null>(null);
  const shiftPressedRef = useRef<boolean>(false);
  const AXIS_LOCK_THRESHOLD = 6; // pixels
  // Keep local `isDrawing` in sync with routing context for convenience.
  useEffect(() => {
    setIsDrawing(Boolean(routingIsDrawing));
    if (!routingIsDrawing) {
      // cancel local start when routing stops
      startRef.current = null;
      try { setPreviewTracks([]); } catch {}
    }
  }, [routingIsDrawing]);

  // Worker is managed by RoutingProvider; use `postWorkerMessage` to send messages

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const toWorld = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      return screenToWorld({ x: clientX - rect.left, y: clientY - rect.top });
    };

    const onClick = (ev: MouseEvent) => {
      const w = toWorld(ev.clientX, ev.clientY);
      lastMousePosRef.current = w;
      if (!routingIsDrawing) {
        // If routing hasn't been enabled via context, start routing when the
        // user has the wire tool selected and clicks the canvas (click-to-start).
        if (tool === 'wire') {
          startRef.current = w;
          startScreenRef.current = { x: ev.clientX, y: ev.clientY };
          preferredAxisRef.current = null;
          try { startDrawing(startRef.current); } catch (e) {}
          try { setPreviewTracks([startRef.current]); } catch (e) {}
          try { postWorkerMessage({ type: 'route', id: Date.now(), start: startRef.current, goal: startRef.current, preferredAxis: preferredAxisRef.current, params: {
            gridStep: 1, trackWidth: 0.6, clearance: 0.2, maxNodes: 2000, maxShoveDepth: 2, shoveStep: 1, orthoCost: 1, diagCost: 1.4, turnPenalty: 0.2, shovePenalty: 1000
          } }); } catch (e) {}
          return;
        }
        // otherwise ignore clicks
        return;
      }

      if (!startRef.current) {
        // first click while routing: set start point
        startRef.current = w;
        startScreenRef.current = { x: ev.clientX, y: ev.clientY };
        preferredAxisRef.current = null;
        // prime preview using start point
        try { setPreviewTracks([startRef.current]); } catch {}
        // optionally request worker route for start->start if available
        try { postWorkerMessage({ type: 'route', id: Date.now(), start: startRef.current, goal: startRef.current, preferredAxis: preferredAxisRef.current, params: {
          gridStep: 1, trackWidth: 0.6, clearance: 0.2, maxNodes: 2000, maxShoveDepth: 2, shoveStep: 1, orthoCost: 1, diagCost: 1.4, turnPenalty: 0.2, shovePenalty: 1000
        } }); } catch (e) {}
        return;
      }

      // While already drawing, a single click should add a corner/turn and
      // continue drawing from that corner (KiCad-like behavior). Do NOT
      // finalize the whole wire here — double-click or Escape will finalize.

      // If we have a worker or client preview path, convert that into
      // finalized local segments and continue from the final preview point.
      if (Array.isArray(previewTracks) && previewTracks.length > 1) {
        const parts: any[] = [];
        for (let i = 0; i < previewTracks.length - 1; i++) parts.push({ start: previewTracks[i], end: previewTracks[i + 1], width: 1.0 });
        setLocalSegments((prev) => [...prev, ...parts]);
        // continue drawing from the last point of the preview
        const lastPoint = previewTracks[previewTracks.length - 1];
        startRef.current = lastPoint;
        // reset screen/axis state so next segment re-locks from this click
        startScreenRef.current = { x: ev.clientX, y: ev.clientY };
        preferredAxisRef.current = null;
        // reset preview to begin from new start
        try { setPreviewTracks([startRef.current]); } catch (e) {}
      } else {
        // While already drawing, a single click should add a corner/turn and
        // continue drawing from that corner (KiCad-like behavior). Do NOT
        // finalize the whole wire here — double-click or Escape will finalize.

        // If we have a worker or client preview path, convert that into
        // finalized local segments and continue from the final preview point.
        if (Array.isArray(previewTracks) && previewTracks.length > 1) {
          const parts: any[] = [];
          for (let i = 0; i < previewTracks.length - 1; i++) parts.push({ start: previewTracks[i], end: previewTracks[i + 1], width: 1.0 });
          setLocalSegments((prev) => [...prev, ...parts]);
          // continue drawing from the last point of the preview
          const lastPoint = previewTracks[previewTracks.length - 1];
          startRef.current = lastPoint;
          // reset screen/axis state so next segment re-locks from this click
          startScreenRef.current = { x: ev.clientX, y: ev.clientY };
          preferredAxisRef.current = null;
          // reset preview to begin from new start
          try { setPreviewTracks([startRef.current]); } catch (e) {}
        } else {
          // No preview available — build a simple Manhattan two-segment turn
          const s = startRef.current;
          if (s) {
            // determine effective axis (respect shift toggle)
            let effectiveAxis: 'h' | 'v' | null = preferredAxisRef.current;
            if (effectiveAxis && shiftPressedRef.current) effectiveAxis = effectiveAxis === 'h' ? 'v' : 'h';
            if (!effectiveAxis) {
              const dxScreen = ev.clientX - (startScreenRef.current?.x ?? ev.clientX);
              const dyScreen = ev.clientY - (startScreenRef.current?.y ?? ev.clientY);
              effectiveAxis = Math.abs(dxScreen) >= Math.abs(dyScreen) ? 'h' : 'v';
            }
            let corner = { x: s.x, y: s.y };
            if (effectiveAxis === 'h') corner = { x: w.x, y: s.y };
            else corner = { x: s.x, y: w.y };
            setLocalSegments((prev) => [...prev, { start: s, end: corner, width: 1.0 }, { start: corner, end: w, width: 1.0 }]);
            // continue drawing from the clicked point
            startRef.current = w;
            startScreenRef.current = { x: ev.clientX, y: ev.clientY };
            preferredAxisRef.current = null;
            try { setPreviewTracks([startRef.current]); } catch (e) {}
          }
        }
        // keep drawing mode active so subsequent clicks add more corners
      }
    };

    const onDblClick = (ev: MouseEvent) => {
      if (!routingIsDrawing) return;
      const w = toWorld(ev.clientX, ev.clientY);
      lastMousePosRef.current = w;
      if (Array.isArray(previewTracks) && previewTracks.length > 1) {
        const parts: any[] = [];
        for (let i = 0; i < previewTracks.length - 1; i++) parts.push({ start: previewTracks[i], end: previewTracks[i + 1], width: 1.0 });
        setLocalSegments((prev) => [...prev, ...parts]);
      } else {
        const s = startRef.current;
        if (s) setLocalSegments((prev) => [...prev, { start: { x: s.x, y: s.y }, end: { x: w.x, y: w.y }, width: 1.0 }]);
      }
      startRef.current = null;
      preferredAxisRef.current = null;
      startScreenRef.current = null;
      try { stopDrawing(); } catch (e) {}
    };

    const onMove = (ev: MouseEvent) => {
      if (!routingIsDrawing) return;
      const w = toWorld(ev.clientX, ev.clientY);
      lastMousePosRef.current = w;
      // If user started routing via toolbar (no click), initialize startRef
      if (!startRef.current) {
        startRef.current = w;
        startScreenRef.current = { x: ev.clientX, y: ev.clientY };
        preferredAxisRef.current = null;
      }

      // If axis not locked yet, use screen-space movement against threshold
      if (preferredAxisRef.current === null && startScreenRef.current) {
        const dxScreen = ev.clientX - startScreenRef.current.x;
        const dyScreen = ev.clientY - startScreenRef.current.y;
        if (Math.abs(dxScreen) >= AXIS_LOCK_THRESHOLD || Math.abs(dyScreen) >= AXIS_LOCK_THRESHOLD) {
          preferredAxisRef.current = Math.abs(dxScreen) >= Math.abs(dyScreen) ? 'h' : 'v';
        }
      }

      // Determine effective axis considering Shift toggle
      let effectiveAxis: 'h' | 'v' | null = preferredAxisRef.current;
      if (effectiveAxis && shiftPressedRef.current) {
        effectiveAxis = effectiveAxis === 'h' ? 'v' : 'h';
      }

      // Build an immediate L-shaped preview locally (fast rubberband)
      const start = startRef.current;
      if (effectiveAxis === null) {
        // no axis locked yet: show a simple straight preview start->cursor
        setPreviewTracks([start, w]);
      } else {
        let corner = { x: start.x, y: start.y };
        if (effectiveAxis === 'h') {
          corner = { x: w.x, y: start.y };
        } else {
          corner = { x: start.x, y: w.y };
        }
        setPreviewTracks([start, corner, w]);
      }
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        if (routingIsDrawing) {
          if (Array.isArray(previewTracks) && previewTracks.length > 1) {
            const parts: any[] = [];
            for (let i = 0; i < previewTracks.length - 1; i++) parts.push({ start: previewTracks[i], end: previewTracks[i + 1], width: 1.0 });
            setLocalSegments((prev) => [...prev, ...parts]);
          } else if (startRef.current && lastMousePosRef.current) {
            const s = startRef.current; const w = lastMousePosRef.current;
            setLocalSegments((prev) => [...prev, { start: { x: s.x, y: s.y }, end: { x: w.x, y: w.y }, width: 1.0 }]);
          }
        }
        startRef.current = null;
        preferredAxisRef.current = null;
        try { stopDrawing(); } catch (e) {}
      }

      // Delete selected wire when user presses Delete or Backspace (KiCad-like)
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        try {
          const sel = selectedWireId as string | undefined;
          if (sel && typeof removeWire === 'function') {
            removeWire(sel);
          }
        } catch (err) {
          // ignore
        }
      }
    };

    const onStartWire = (_ev: Event) => {
      // Start drawing mode via legacy event; use routing.startDrawing
      startRef.current = null;
      preferredAxisRef.current = null;
      try { startDrawing(); } catch (e) {}
      // request worker if we have a last mouse pos
      try { postWorkerMessage({ type: 'route', id: Date.now(), start: lastMousePosRef.current, goal: lastMousePosRef.current, preferredAxis: preferredAxisRef.current ?? undefined, params: {
        gridStep: 1, trackWidth: 0.6, clearance: 0.2, maxNodes: 2000, maxShoveDepth: 2, shoveStep: 1, orthoCost: 1, diagCost: 1.4, turnPenalty: 0.2, shovePenalty: 1000
      } }); } catch (e) {}
    };

    const onConnectToPin = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      try { console.debug('[RoutingCanvas] connect-wire-to-pin event', detail); } catch (err) {}
      if (typeof detail.x === 'number' && typeof detail.y === 'number') {
        startRef.current = { x: detail.x, y: detail.y };
        lastMousePosRef.current = { x: detail.x, y: detail.y };
        try { startDrawing(startRef.current); } catch (e) {}
        // request an initial self-route to populate previewTracks via worker
        try { postWorkerMessage({ type: 'route', id: Date.now(), start: startRef.current, goal: startRef.current, preferredAxis: preferredAxisRef.current ?? undefined, params: {
          gridStep: 1, trackWidth: 0.6, clearance: 0.2, maxNodes: 2000, maxShoveDepth: 2, shoveStep: 1, orthoCost: 1, diagCost: 1.4, turnPenalty: 0.2, shovePenalty: 1000
        } }); } catch (e) {}
        try { setPreviewTracks([startRef.current]); } catch (err) {}
        return;
      }

      // If x/y weren't provided, but we have a pinId, try to resolve world coords
      if (detail && detail.pinId) {
        try {
          // placedSymbols store pins with id & world x/y coordinates
          for (const sym of (placedSymbols || [])) {
            if (!Array.isArray(sym.pins)) continue;
            const found = sym.pins.find((pp: any) => pp.id === detail.pinId);
            if (found) {
              const px = found.x ?? (found.x === 0 ? 0 : undefined);
              const py = found.y ?? (found.y === 0 ? 0 : undefined);
              if (typeof px === 'number' && typeof py === 'number') {
                startRef.current = { x: px, y: py };
                lastMousePosRef.current = { x: px, y: py };
                try { startDrawing(startRef.current); } catch (e) {}
                try { postWorkerMessage({ type: 'route', id: Date.now(), start: startRef.current, goal: startRef.current, preferredAxis: preferredAxisRef.current ?? undefined, params: {
                  gridStep: 1, trackWidth: 0.6, clearance: 0.2, maxNodes: 2000, maxShoveDepth: 2, shoveStep: 1, orthoCost: 1, diagCost: 1.4, turnPenalty: 0.2, shovePenalty: 1000
                } }); } catch (e) {}
                try { setPreviewTracks([startRef.current]); } catch (err) {}
                return;
              }
            }
          }
        } catch (err) {
          try { console.warn('[RoutingCanvas] failed to resolve pinId coords', detail.pinId, err); } catch (e) {}
        }
      }
    };

    const onShiftDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Shift') shiftPressedRef.current = true;
    };
    const onShiftUp = (ev: KeyboardEvent) => {
      if (ev.key === 'Shift') shiftPressedRef.current = false;
    };

    el.addEventListener('click', onClick);
    el.addEventListener('dblclick', onDblClick);
    window.addEventListener('mousemove', onMove);
    // hover detection (independent from routing move handler)
    const onHover = (ev: MouseEvent) => {
      try {
        const world = toWorld(ev.clientX, ev.clientY);
        // find nearest group/segment
        let bestId: string | null = null;
        let bestDist = Infinity;
        const TH = 6; // world units threshold
        Object.entries(grouped).forEach(([gid, segments]) => {
          for (const s of segments) {
            const a = { x: s.start[0], y: s.start[1] };
            const b = { x: s.end[0], y: s.end[1] };
            const d = pointToSegmentDistance(world, a, b);
            if (d < bestDist) { bestDist = d; bestId = gid; }
          }
        });
        if (bestDist <= TH) {
          // only set hovered when not already selected
          if (bestId && bestId !== selectedWireId) {
            setHoveredWireId(bestId);
            setHoverScreenPos(world);
          } else {
            setHoveredWireId(null);
            setHoverScreenPos(null);
          }
        } else {
          setHoveredWireId(null);
          setHoverScreenPos(null);
        }
      } catch (err) {}
    };
    window.addEventListener('mousemove', onHover);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keydown', onShiftDown);
    window.addEventListener('keyup', onShiftUp);
    window.addEventListener('start-wire', onStartWire as EventListener);
    window.addEventListener('connect-wire-to-pin', onConnectToPin as EventListener);

    // listen for wire lifecycle events so this canvas can render canonical wires
    const onSetWires = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const list = Array.isArray(detail) ? detail : (detail.wires || detail.list || null);
      if (Array.isArray(list)) setWiresState(list);
    };
    const onWireCommit = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      if (detail && detail.wire) {
        // merge/replace single wire
        setWiresState((prev) => {
          const arr = Array.isArray(prev) ? [...prev] : [];
          const idx = arr.findIndex((x) => x.id === detail.wire.id || x.uuid === detail.wire.id);
          if (idx >= 0) arr[idx] = detail.wire; else arr.push(detail.wire);
          return arr;
        });
      }
    };
    const onWireRemoved = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const wid = detail?.wireId;
      if (!wid) return;
      setWiresState((prev) => (Array.isArray(prev) ? prev.filter((w) => (w.id ?? w.uuid) !== wid) : prev));
    };
    window.addEventListener('set-wires', onSetWires as EventListener);
    window.addEventListener('wire-committed', onWireCommit as EventListener);
    window.addEventListener('wire-added', onWireCommit as EventListener);
    window.addEventListener('wire-removed', onWireRemoved as EventListener);

    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousemove', onHover);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keydown', onShiftDown);
      window.removeEventListener('keyup', onShiftUp);
      window.removeEventListener('start-wire', onStartWire as EventListener);
      window.removeEventListener('connect-wire-to-pin', onConnectToPin as EventListener);
        window.removeEventListener('set-wires', onSetWires as EventListener);
        window.removeEventListener('wire-committed', onWireCommit as EventListener);
        window.removeEventListener('wire-added', onWireCommit as EventListener);
        window.removeEventListener('wire-removed', onWireRemoved as EventListener);
    };
  }, [isDrawing, routingIsDrawing, tool, screenToWorld, startDrawing, stopDrawing, setPreviewTracks, postWorkerMessage, grouped, selectedWireId]);

  // Helper: shortest distance from point p to segment ab
  const pointToSegmentDistance = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const vx = b.x - a.x; const vy = b.y - a.y;
    const wx = p.x - a.x; const wy = p.y - a.y;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);
    const t = c1 / c2;
    const projx = a.x + t * vx; const projy = a.y + t * vy;
    return Math.hypot(p.x - projx, p.y - projy);
  };

  return (
    <div className="absolute inset-0" ref={containerRef} style={{ pointerEvents: 'auto' }}>
      <CanvasStage width={size.width} height={size.height} zoom={zoom} viewportCenter={viewportCenter} camera={camera}>
        <Layer>
          {/* finalized tracks: render each grouped wire as a single polyline */}
          {Object.entries(grouped).map(([gid, segments], idx) => renderGroupedWire(gid, segments, idx))}
          {/* local finalized wires created by click interactions */}
          {localSegments.map((seg, i) => (
            console.log(seg,i),
            <Line
              key={`local-${i}`}
              points={[seg.start.x, seg.start.y, seg.end.x, seg.end.y]}
              stroke="#06a13fff" /* green */
              strokeWidth={seg.width}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          ))}

          {/* endpoint markers for the in-progress local segments polyline */}
          {localSegments.length > 0 && (() => {
            const pts: { x: number; y: number }[] = [];
            pts.push({ x: localSegments[0].start.x, y: localSegments[0].start.y });
            for (let i = 0; i < localSegments.length; i++) pts.push({ x: localSegments[i].end.x, y: localSegments[i].end.y });
            const start = pts[0];
            const end = pts[pts.length - 1];
            const size = 10;
            return (
              <>
                <Rect x={start.x - size/2} y={start.y - size/2} width={size} height={size} fill={'transparent'} stroke={'#22c55e'} strokeWidth={1} cornerRadius={0.5} listening={true} onClick={(e:any)=>{try{e.cancelBubble=true}catch{}; try{ window.dispatchEvent(new CustomEvent('connect-wire-to-pin',{detail:{x:start.x,y:start.y,wireId:'local',end:'start'}})) }catch{}}} />
                <Rect x={end.x - size/2} y={end.y - size/2} width={size} height={size} fill={'transparent'} stroke={'#22c55e'} strokeWidth={1} cornerRadius={0.5} listening={true} onClick={(e:any)=>{try{e.cancelBubble=true}catch{}; try{ window.dispatchEvent(new CustomEvent('connect-wire-to-pin',{detail:{x:end.x,y:end.y,wireId:'local',end:'end'}})) }catch{}}} />
              </>
            );
          })()}

          {/* preview */}
          {previewLines.map((line, i) => {
            // Show preview as a solid green line with reduced opacity
            const stroke = '#22c55e'; // match local finalized wire color (green)
            const opacity = 0.6;
            return (
              <Line
                key={`preview-${i}`}
                points={[line.start.x, line.start.y, line.end.x, line.end.y]}
                stroke={stroke}
                strokeWidth={1.5}
                opacity={opacity}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            );
          })}

          {/* endpoint markers for the preview polyline (from previewTracks) */}
          {/* {Array.isArray(previewTracks) && previewTracks.length >= 2 && (() => {
            const start = previewTracks[0];
            const end = previewTracks[previewTracks.length - 1];
            const size = 8;
            const startOnPin = isPointOnPlacedPin(start);
            const endOnPin = isPointOnPlacedPin(end);
            return (
              <>
                {startOnPin && (
                  <Rect x={start.x - size/2} y={start.y - size/2} width={size} height={size} fill={'transparent'} stroke={'#22c55e'} strokeWidth={2} cornerRadius={2} listening={true} onClick={(e:any)=>{try{e.cancelBubble=true}catch{}; try{ window.dispatchEvent(new CustomEvent('connect-wire-to-pin',{detail:{x:start.x,y:start.y,wireId:'preview',end:'start'}})) }catch{}}} />
                )}
                {!endOnPin && (
                  <Rect x={end.x - size/2} y={end.y - size/2} width={size} height={size} fill={'transparent'} stroke={'#22c55e'} strokeWidth={2} cornerRadius={2} listening={true} onClick={(e:any)=>{try{e.cancelBubble=true}catch{}; try{ window.dispatchEvent(new CustomEvent('connect-wire-to-pin',{detail:{x:end.x,y:end.y,wireId:'preview',end:'end'}})) }catch{}}} />
                )}
              </>
            );
          })()} */}

          {/* dynamic preview from local click-draw removed — use gray dashed `previewTracks` only */}
          {/* Pencil indicator when hovering a wire to suggest starting a draw */}
          {hoveredWireId && hoverScreenPos && !routingIsDrawing && !selectedWireId && (
            <Text x={hoverScreenPos.x + 6} y={hoverScreenPos.y + 6} text={'✏️'} fontSize={16} listening={false} />
          )}
        </Layer>
      </CanvasStage>
    </div>
  );
}

export default RoutingCanvas;