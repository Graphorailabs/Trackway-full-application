/**
 * ShapesCanvas
 *
 * Central assembly component for PCB shape rendering and interaction.
 *
 * Overview
 * - This module owns the top-level canvas area used by PCB editing tools.
 * - It assembles small, focused subcomponents (e.g. `CanvasStage`,
 *   `SelectionHighlight`, `SelectionContextMenu`, `TextOverlay`) and uses
 *   pure helper functions in `ShapesCanvasService` to keep logic testable
 *   and maintainable.
 *
 * Responsibilities
 * - Wire viewport transforms (provided by `useCameraViewport`) into the
 *   Konva `Stage` transform so stage coordinates map to PCB world coords.
 * - Convert pointer events into the drawing lifecycle exposed by
 *   `useShapeContext()` (startDrawing, updateDrawing, finishDrawing,
 *   advanceArcToSweep, addPolygonPoint, resetDrawing).
 * - Render persisted graphics (via `ShapesRenderer.renderShape`) and
 *   drawing previews (`renderPreviewShape`) that exactly match persisted
 *   render rules (important for arcs, text overlays and stroke widths).
 * - Handle selection interactions (select, drag/move, context menu) using
 *   `useSelection()` rather than packing selection into `ToolContext`.
 *
 * Key integration points
 * - Providers required: `useCameraViewport`, `useShapeContext`,
 *   `useToolContext`, `usePcb`, `useLayers`, `useSelection`.
 * - Persisted shape types are canonicalized against
 *   `pkg/trackway_parser_wasm.d.ts` (e.g. `GraphicArc` is persisted as
 *   `{ start, mid, end, layer, width, uuid }`). Renderer computes angles
 *   at render-time from this canonical representation.
 *
 * Extending the canvas
 * - Add a new tool: implement drawing lifecycle in `ShapeContext`, add
 *   render support in `ShapesRenderer.tsx`, and add any preview helpers
 *   here in `ShapesCanvas` (prefer small helper functions in
 *   `ShapesCanvasService.ts`).
 * - Keep interaction handlers small: move pure logic into
 *   `ShapesCanvasService` and keep `ShapesCanvas` focused on assembling
 *   subcomponents and passing handlers/props.
 */
import { Layer, Text, Arc } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCameraViewport } from "@/features/pcb_editor/components/canvas/CameraViewport";
import { useMeasurementSafe } from "@/features/pcb_editor/contexts/MeasurementContext";
import { useShapeContext } from "../../contexts/ShapeContext";
import { useToolContext } from "../../contexts/ToolContext";
import { usePcb } from "../../contexts/PcbContext";
import { useLayers } from "../../contexts/LayerContext";
// footprint preview hook not needed here now
import type { Xy } from "trackway-parser-wasm";
import { useState, useRef, useEffect } from "react";
import { useSelection } from "@/features/pcb_editor/contexts/SelectionContext";
import type { Pt } from "../layers/routing/octilinearRouter";
import { useRouting } from "../../contexts/RoutingContext";
import { usePadHover } from "@/features/pcb_editor/contexts/PadHoverContext";
import { useViaHover } from "@/features/pcb_editor/contexts/ViaHoverContext";
import { ENABLE_ENDPOINT_SNAP, ENDPOINT_SNAP_TOLERANCE, ENABLE_PAD_HIGHLIGHT } from "@/features/pcb_editor/constants";
import { PAD_SNAP_RADIUS } from "@/features/pcb_editor/constants";
import { renderShape, renderPreviewShape } from "./ShapesRenderer";

import { getDimensionsText } from "@/features/pcb_editor/utils/shapeUtils";
import SelectionHighlight from "./SelectionHighlight";
import SelectionContextMenu from "./SelectionContextMenu";
import TextOverlay from "./TextOverlay";
import CanvasStage from "./CanvasStage";
import GridDebugOverlay from "../canvas/GridDebugOverlay";
// Footprint rendering moved to a dedicated canvas `FootprintCanvas`.
import {
	computeArcPreviewProps,
	computeInputScreenPos,
} from "./ShapesCanvasService";
import useShapesCanvasLogic from "./hooks/useShapesCanvasLogic";
export default function ShapesCanvas() {

    const DEFAULT_STROKE = "#d32f2f";
	const DEFAULT_WIDTH = 0.25;
	const { camera, zoom, viewportCenter, screenToWorld } = useCameraViewport();
	const measurement = useMeasurementSafe();
	const {
		isDrawing,
		startPoint,
		currentPoint,
		polygonPoints,
		arcPhase,
		arcStartPoint,
		arcRadius,
	} = useShapeContext();
    const { pcb, addVia, addTrack, removeVia, updateViaPosition } = usePcb();
    const { tool, textEffects: defaultTextEffects, strokeWidth: toolStrokeWidth, viaSize } = useToolContext();
    const { visibility, selectedLayerId } = useLayers();
	const {
		containerRef,
		size,
		showTextInput,
		textPos,
		textInput,
		setTextInput,
		handleTextInputKeyDown,
		overlayEffects,
		setOverlayEffects,
		overlayColor,
		setOverlayColor,
		handleMouseDown: originalHandleMouseDown,
		handleMouseMove: originalHandleMouseMove,
		handleMouseUp: originalHandleMouseUp,
	} = useShapesCanvasLogic();

    // Selection helper (safe fallback if provider missing)
    const { select } = (() => {
        try {
            return useSelection();
        } catch (e) {
            return { select: (_: string | null) => {} } as const;
        }
    })();

    // Track via dragging state when user drags a via from the top canvas
    const draggingViaRef = useRef<string | null>(null);

    const handleViaMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        const stagePos = e.target.getStage ? e.target.getStage()?.getPointerPosition() : null;
        if (!stagePos) return;
        const worldPos = screenToWorld({ x: stagePos.x, y: stagePos.y });
        try {
            const id = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `via-${Date.now()}-${Math.floor(Math.random()*10000)}`;
            const via: import("trackway-parser-wasm").TrackVia = {
                at: [worldPos.x, worldPos.y],
                size: viaSize ?? 0.8,
                drill: (viaSize ?? 0.8) / 2,
                layers: ["F.Cu", "B.Cu"],
                net: 0,
                uuid: id,
            } as any;
            addVia?.(via);
        } catch (err) {
            // ignore
        }
    };

    const tryStartViaDrag = (worldPos: { x: number; y: number }) => {
        try {
            if (!worldPos) return false;
            if ((tool as string) !== 'select') return false;
            const hit = findViaUnderCursor(worldPos);
            if (hit && hit.uuid) {
                draggingViaRef.current = hit.uuid;
                try { select(hit.uuid); } catch (err) {}
                return true;
            }
        } catch (err) {}
        return false;
    };

    const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        if (tool === "route") {
            handleRoutingMouseDown(e);
        } else if (tool === "via") {
            handleViaMouseDown(e);
        } else {
            const stagePos = e.target.getStage ? e.target.getStage()?.getPointerPosition() : null;
            if (stagePos) {
                const worldPos = screenToWorld({ x: stagePos.x, y: stagePos.y });
                if (tryStartViaDrag(worldPos)) return;
            }
            originalHandleMouseDown(e);
        }
    };

    const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
        const stagePos = e.target.getStage ? e.target.getStage()?.getPointerPosition() : null;
        if (!stagePos) {
            if (tool === "route") handleRoutingMouseMove(e);
            else originalHandleMouseMove(e);
            return;
        }
        const worldPos = screenToWorld({ x: stagePos.x, y: stagePos.y });
        // update pad hover state from ShapesCanvas so footprint canvas (which
        // may have pointerEvents disabled) still shows pad highlight.
        if (ENABLE_PAD_HIGHLIGHT) {
            const padHit = findPadUnderCursor(worldPos);
            if (padHit) padHoverApi.setHovered({ fpUuid: padHit.fpUuid ?? "", padIndex: padHit.padIndex });
            else padHoverApi.setHovered(null);
            // via hover/magnet points
            const viaHit = findViaUnderCursor(worldPos);
            if (viaHit && viaHit.uuid) {
                viaHoverApi.setHovered({ uuid: viaHit.uuid, point: viaHit.point });
            } else {
                viaHoverApi.setHovered(null);
            }
        }

        if (tool === "route") {
            handleRoutingMouseMove(e);
        } else {
            const dragging = draggingViaRef.current;
            if (dragging && updateViaPosition) {
                try {
                    updateViaPosition(dragging, { x: worldPos.x, y: worldPos.y });
                } catch (err) {}
                return;
            }
            originalHandleMouseMove(e);
        }
    };

    const handleMouseUp = (_e: KonvaEventObject<MouseEvent>) => {
        if (tool === "route") {
            // For route, mouse up is handled in mouse down for finish
        } else {
            if (draggingViaRef.current) {
                draggingViaRef.current = null;
                return;
            }
            originalHandleMouseUp();
        }
    };

    // Right-click handler on the canvas stage: when routing, place a via
    // at the click location and connect the current routing start to it.
    const handleCanvasContextMenu = (e: KonvaEventObject<MouseEvent>) => {
        try {
            e.evt.preventDefault();
        } catch (err) {}
        // Only act when route tool active and routing session is ongoing
        if (tool !== "route" || !routingActive || !routingStart) return;
        const stagePos = e.target.getStage ? e.target.getStage()?.getPointerPosition() : null;
        if (!stagePos) return;
        let worldPos = screenToWorld({ x: stagePos.x, y: stagePos.y });
        const snap = findNearestEndpoint(worldPos);
        if (snap) worldPos = snap;

        // create via
        const viaId = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `via-${Date.now()}-${Math.floor(Math.random()*10000)}`;
        const viaObj: import("trackway-parser-wasm").TrackVia = {
            at: [worldPos.x, worldPos.y],
            size: viaSize ?? 0.8,
            drill: (viaSize ?? 0.8) / 2,
            layers: ["F.Cu", "B.Cu"],
            net: 0,
            uuid: viaId,
        } as any;
        // add via to PCB first so collision checks treat via endpoints as non-blocking
        addVia?.(viaObj);

        // Build connecting segment from routingStart to via center
        const segId = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `seg-${Date.now()}-${Math.floor(Math.random()*10000)}`;
        const currentLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
        const seg = { start: [routingStart.x, routingStart.y], end: [worldPos.x, worldPos.y], width: routerParams.trackWidth, layer: currentLayer, net: 0, uuid: segId } as any;

        // If the segment would collide, remove the via and abort
        if (!segmentsAreFree([seg])) {
            console.warn('[routing] cannot place via: connecting segment would collide.');
            try { removeVia?.(viaId); } catch (err) { /* ignore */ }
            return;
        }

        // Commit the connecting segment and continue routing from the via
        console.log('[routing] placing via during routing', { viaId, at: worldPos, segId, layer: currentLayer });
        addTrack?.({ kind: 'segment', data: seg } as any);
        // record placed segment locally
                        placedSegmentsRef.current.push({ start: { x: seg.start[0], y: seg.start[1] }, end: { x: seg.end[0], y: seg.end[1] }, width: seg.width, layer: seg.layer });

        // Toggle routing session layer so next segments are on the other side
        const nextLayer = currentLayer === 'F.Cu' ? 'B.Cu' : 'F.Cu';
        try { setCurrentTraceLayer(nextLayer); } catch (err) {}

        // Continue routing from the via center
        setRoutingStart({ x: worldPos.x, y: worldPos.y });
        setRoutingActive(true);
        routingActiveRef.current = true;
        setPreviewTracks([]);
        // Request a fresh preview when the mouse moves; worker will get updated start from move handler
        return;
    };

    // Routing state
    const [routingStart, setRoutingStart] = useState<Pt | null>(null);
    const [routingActive, setRoutingActive] = useState(false);
    const { previewTracks, setPreviewTracks, currentTraceLayer, setCurrentTraceLayer, resetCurrentTraceLayer } = useRouting();
    const workerRef = useRef<Worker | null>(null);
    const routingActiveRef = useRef<boolean>(false);
    const workerRequestIdRef = useRef<number>(0);
    // Segments placed during the current continuous routing session.
    // Stored in a ref so we can include them in obstacle lists immediately
    // without waiting for `pcb` state to update.
    const placedSegmentsRef = useRef<Array<{ start: Pt; end: Pt; width: number; layer?: string }>>([]);

    // Build worker obstacles excluding segments that end at via centers so
    // vias are not treated as blocking obstacles for continuation routing.
    // When `layer` is provided, only return obstacles on that layer so the
    // worker computes routes against the correct copper layer.
    const buildWorkerObstacles = (layer?: string) => {
        const viaCenters: Pt[] = (pcb.tracks || []).filter(t => t.kind === 'via').map((t: any) => {
            const v = t.data as any;
            const at = v.at ?? [0, 0];
            return { x: Number(at[0]) || 0, y: Number(at[1]) || 0 } as Pt;
        });
        const viaTol = ENABLE_ENDPOINT_SNAP ? ENDPOINT_SNAP_TOLERANCE : 1e-6;
        const isNearVia = (pt: Pt) => viaCenters.some(vc => Math.hypot(vc.x - pt.x, vc.y - pt.y) <= viaTol + 1e-9);
        const pcbSegs = (pcb.tracks || [])
            .filter(t => t.kind === 'segment')
            .map((t: any) => ({ start: { x: t.data.start[0], y: t.data.start[1] }, end: { x: t.data.end[0], y: t.data.end[1] }, width: t.data.width ?? 0.25, layer: (t.data.layer as string) || undefined }))
            .filter(o => !isNearVia(o.start) && !isNearVia(o.end));

        const placedFiltered = (placedSegmentsRef.current || []).filter(o => !isNearVia(o.start) && !isNearVia(o.end));

        // If caller requested a specific layer, filter obstacles to that layer
        if (layer) {
            const pcbLayer = pcbSegs.filter(o => (o as any).layer === layer);
            const placedLayer = placedFiltered.filter(o => (o as any).layer === layer);
            // eslint-disable-next-line no-console
            console.log('[routing] buildWorkerObstacles()', { layer, pcbCount: pcbLayer.length, placedCount: placedLayer.length });
            return [...pcbLayer, ...placedLayer];
        }

        // no layer filtering requested: return all obstacles
        return [...pcbSegs, ...placedFiltered];
    };

    useEffect(() => {
        // Initialize worker (module type so `import` inside worker works)
        workerRef.current = new Worker(new URL('./routing/RoutingWorker.ts', import.meta.url), { type: 'module' });
        workerRef.current.onmessage = (e) => {
            if (e.data.type === 'routeResult') {
                // Ignore stale responses that don't match the last request id
                if (typeof e.data.id !== 'number' || e.data.id !== workerRequestIdRef.current) return;
                // Avoid applying worker results after routing was finalized.
                if (!routingActiveRef.current) return;
                if (e.data.result.success && e.data.result.path) {
                    setPreviewTracks(e.data.result.path);
                } else {
                    setPreviewTracks([]);
                }
            }
        };
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    // keep a ref in sync so worker message handler can check latest active state
    useEffect(() => {
        routingActiveRef.current = routingActive;
    }, [routingActive]);

    // Handle Escape to cancel routing
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setRoutingStart(null);
                setPreviewTracks([]);
                setRoutingActive(false);
                routingActiveRef.current = false;
                placedSegmentsRef.current = [];
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [setPreviewTracks]);

    const routerParams = {
        gridStep: 0.1,
        trackWidth: 0.25,
        clearance: 0.1,
        maxNodes: 1000,
        maxShoveDepth: 3,
        shoveStep: 0.1,
        orthoCost: 1,
        diagCost: Math.sqrt(2),
        turnPenalty: 0.2,
        shovePenalty: 10,
    };

    // Local collision helpers (copy of worker collision logic) used to
    // prevent committing segments that would immediately collide with
    // existing PCB tracks or session-placed segments.
    const segsIntersectLocal = (a1: Pt, a2: Pt, b1: Pt, b2: Pt) => {
        const orient = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
        const onSegment = (p: Pt, q: Pt, r: Pt) => (Math.min(p.x, r.x) <= q.x && q.x <= Math.max(p.x, r.x) && Math.min(p.y, r.y) <= q.y && q.y <= Math.max(p.y, r.y));
        const o1 = orient(a1, a2, b1);
        const o2 = orient(a1, a2, b2);
        const o3 = orient(b1, b2, a1);
        const o4 = orient(b1, b2, a2);
        if (o1 === 0 && onSegment(a1, b1, a2)) return true;
        if (o2 === 0 && onSegment(a1, b2, a2)) return true;
        if (o3 === 0 && onSegment(b1, a1, b2)) return true;
        if (o4 === 0 && onSegment(b1, a2, b2)) return true;
        return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
    };

    const pointSegmentDistLocal = (px: Pt, a: Pt, b: Pt) => {
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const wx = px.x - a.x;
        const wy = px.y - a.y;
        const c1 = vx * wx + vy * wy;
        if (c1 <= 0) return Math.hypot(px.x - a.x, px.y - a.y);
        const c2 = vx * vx + vy * vy;
        if (c2 <= c1) return Math.hypot(px.x - b.x, px.y - b.y);
        const t = c1 / c2;
        const projx = a.x + t * vx;
        const projy = a.y + t * vy;
        return Math.hypot(px.x - projx, px.y - projy);
    };

    const segSegDistLocal = (a1: Pt, a2: Pt, b1: Pt, b2: Pt) => {
        if (segsIntersectLocal(a1, a2, b1, b2)) return 0;
        const d1 = pointSegmentDistLocal(a1, b1, b2);
        const d2 = pointSegmentDistLocal(a2, b1, b2);
        const d3 = pointSegmentDistLocal(b1, a1, a2);
        const d4 = pointSegmentDistLocal(b2, a1, a2);
        return Math.min(d1, d2, d3, d4);
    };



    const findBlockingObstacleLocal = (p1: Pt, p2: Pt, _trackWidth: number, clearance: number, layer?: string) => {
        // Build obstacles from PCB tracks (segments). However, if there are
        // via centers at some segment endpoints, those segment endpoints
        // should not block routing through the via — treat them as non-
        // blocking so vias act as gateways between layers.
        const viaCenters: Pt[] = (pcb.tracks || []).filter(t => t.kind === 'via').map((t: any) => {
            const v = t.data as any;
            const at = v.at ?? [0,0];
            return { x: Number(at[0]) || 0, y: Number(at[1]) || 0 } as Pt;
        });
        const viaTol = ENABLE_ENDPOINT_SNAP ? ENDPOINT_SNAP_TOLERANCE : 1e-6;
        const isNearVia = (pt: Pt) => viaCenters.some(vc => Math.hypot(vc.x - pt.x, vc.y - pt.y) <= viaTol + 1e-9);
        const pcbObstacles = (pcb.tracks || [])
            .filter(t => t.kind === 'segment')
            .map((t: any) => ({ start: { x: t.data.start[0], y: t.data.start[1] }, end: { x: t.data.end[0], y: t.data.end[1] }, width: t.data.width ?? 0.25, layer: (t.data.layer as string) || undefined }))
            .filter(o => {
                // If either obstacle endpoint is essentially a via center,
                // treat this obstacle as non-blocking for via passage.
                if (isNearVia(o.start) || isNearVia(o.end)) return false;
                return true;
            });
        const placedFiltered = (placedSegmentsRef.current || []).filter(o => !isNearVia(o.start) && !isNearVia(o.end));

        // Combine and, if a layer was provided, keep only obstacles on same layer
        let allObstacles: Array<{ start: Pt; end: Pt; width: number; layer?: string }> = [...pcbObstacles, ...placedFiltered];
        if (layer) {
            allObstacles = allObstacles.filter(o => (o as any).layer === layer);
        }
        const eps = 1e-4;
        const ptsEq = (a: Pt, b: Pt) => Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
        const endpointTol = ENABLE_ENDPOINT_SNAP ? ENDPOINT_SNAP_TOLERANCE : 0; // allow small gaps near endpoints to be considered touching
        const ptDist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
        for (const o of allObstacles) {
            // Only consider obstacles on the same copper layer as the
            // candidate segment; segments on different layers don't collide.
            if (layer && (o as any).layer !== layer) continue;
            if (ptsEq(p1, o.start) || ptsEq(p1, o.end) || ptsEq(p2, o.start) || ptsEq(p2, o.end)) continue;
            const thresh = (o.width / 2) + clearance + (_trackWidth / 2);
            const dist = segSegDistLocal(p1, p2, o.start, o.end);
            if (dist <= thresh) {
                // If the closest approach is due to a segment endpoint being
                // very near an obstacle endpoint, allow it (this is the
                // continuation case). Check point-to-point distances and if
                // the minimal point-to-point distance is near the segment-to-
                // segment distance, and within endpointTol, treat as non-blocking.
                const dists = [
                    ptDist(p1, o.start), ptDist(p1, o.end),
                    ptDist(p2, o.start), ptDist(p2, o.end)
                ];
                const minPtDist = Math.min(...dists);
                if (endpointTol > 0 && minPtDist <= endpointTol && Math.abs(minPtDist - dist) <= 1e-3) {
                    // treat as touching at endpoint — not a blocker
                    continue;
                }
                console.log('[routing] blocking obstacle detected', { obstacle: o, dist, thresh, nearViaStart: isNearVia(o.start), nearViaEnd: isNearVia(o.end), layer });
                return { obstacle: o, dist, thresh };
            }
        }
        return null;
    };

        // Find via under or near cursor (within PAD_SNAP_RADIUS). Returns { uuid, point, via }
        const findViaUnderCursor = (cursorWorld: Pt) => {
            const SNAP_RADIUS = PAD_SNAP_RADIUS;
            for (const t of (pcb.tracks || [])) {
                if (t.kind !== 'via') continue;
                const via = (t as any).data as any;
                const atArr = via.at ?? [0, 0];
                const gx = Number(atArr[0]) || 0;
                const gy = Number(atArr[1]) || 0;
                const size = Number(via.size) || 0.8;
                const radius = Math.max(size / 2, 0.2) + SNAP_RADIUS;
                const dx = cursorWorld.x - gx;
                const dy = cursorWorld.y - gy;
                const dist = Math.hypot(dx, dy);
                if (dist <= radius) return { uuid: via.uuid as string | undefined, point: { x: gx, y: gy }, via };
            }
            return null;
        };

    // Find nearest endpoint among PCB tracks and session-placed segments.
    const findNearestEndpoint = (pt: Pt, tol = ENDPOINT_SNAP_TOLERANCE): Pt | null => {
        if (!ENABLE_ENDPOINT_SNAP) return null;
        const eps = 1e-6;
        const endpoints: Pt[] = [];
        for (const t of (pcb.tracks || []).filter(x => x.kind === 'segment')) {
            const seg = (t as any).data;
            endpoints.push({ x: seg.start[0], y: seg.start[1] });
            endpoints.push({ x: seg.end[0], y: seg.end[1] });
        }
        for (const s of placedSegmentsRef.current) {
            endpoints.push(s.start);
            endpoints.push(s.end);
        }
        // Include via centers as magnet endpoints
        for (const v of (pcb.tracks || []).filter(x => x.kind === 'via')) {
            const via = (v as any).data as any;
            const at = via.at ?? [0,0];
            endpoints.push({ x: Number(at[0]) || 0, y: Number(at[1]) || 0 });
        }
            // Include pad centers from placed footprints so endpoint-snap works
            for (const fp of (pcb.footprints || [])) {
                const at = fp.at ?? { x: 0, y: 0, angle: 0 };
                const angle = at.angle ?? 0;
                const c = Math.cos(angle);
                const s = Math.sin(angle);
                const pads = (fp.pads ?? []) as any[];
                for (const p of pads) {
                    const pat = p.at ?? { x: 0, y: 0 };
                    const localX = Number(pat.x) || 0;
                    const localY = Number(pat.y) || 0;
                    const gx = at.x + (localX * c - localY * s);
                    const gy = at.y + (localX * s + localY * c);
                    endpoints.push({ x: gx, y: gy });
                }
            }
        let best: Pt | null = null;
        let bestD = Infinity;
        for (const e of endpoints) {
            const d = Math.hypot(e.x - pt.x, e.y - pt.y);
            if (d + eps < bestD) {
                bestD = d;
                best = e;
            }
        }
        if (bestD <= tol) return best;
        return null;
    };

    const findViaAtPoint = (pt: Pt) => {
        // Match via centers allowing a small tolerance so floating point
        // differences or worker path approximations still hit the via.
        const tol = ENDPOINT_SNAP_TOLERANCE || 1e-3;
        for (const t of (pcb.tracks || [])) {
            if (t.kind !== 'via') continue;
            const via = (t as any).data as any;
            const atArr = via.at ?? [0, 0];
            const gx = Number(atArr[0]) || 0;
            const gy = Number(atArr[1]) || 0;
            const dx = pt.x - gx;
            const dy = pt.y - gy;
            const dist = Math.hypot(dx, dy);
            if (dist <= tol) return via;
        }
        return null;
    };

    // Pad hover hook (safe fallback if provider missing)
    const padHoverApi = (() => {
        try {
            return usePadHover();
        } catch (e) {
            return { hovered: null as any, setHovered: (_: any) => {} } as const;
        }
    })();

    // Via hover hook (safe fallback if provider missing)
    const viaHoverApi = (() => {
        try {
            return useViaHover();
        } catch (e) {
            return { hovered: null as any, setHovered: (_: any) => {} } as const;
        }
    })();

    // Find pad under or near cursor (within PAD_SNAP_RADIUS). Returns { fpUuid, padIndex, point }
    const findPadUnderCursor = (cursorWorld: Pt) => {
        const SNAP_RADIUS = PAD_SNAP_RADIUS;
        for (const fp of (pcb.footprints || [])) {
            const at = fp.at ?? { x: 0, y: 0, angle: 0 };
            const angle = at.angle ?? 0;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const pads = (fp.pads ?? []) as any[];
            for (let i = 0; i < pads.length; i++) {
                const p = pads[i];
                const pat = p.at ?? { x: 0, y: 0 };
                const localX = Number(pat.x) || 0;
                const localY = Number(pat.y) || 0;
                const gx = at.x + (localX * c - localY * s);
                const gy = at.y + (localX * s + localY * c);
                const sizeArr = p.size ?? [1, 1];
                const w = Number(sizeArr[0]) || 1;
                const h = Number(sizeArr[1]) || w;
                const dx = cursorWorld.x - gx;
                const dy = cursorWorld.y - gy;
                const dist = Math.hypot(dx, dy);
                // quick approx: use bbox radius
                const radius = Math.max(w, h) / 2 + SNAP_RADIUS;
                if (dist <= radius) return { fpUuid: fp.uuid, padIndex: i, point: { x: gx, y: gy } };
            }
        }
        return null;
    };

    // Try to finalize a connection to any pad near `cursorWorld`.
    // If `fromPt` is provided, snap to the pad-side center aligned with
    // the incoming direction (so the segment connects at the side center).
    // Returns { connected, pad?, point?, net? }
    const tryFinalizeAtCursor = (cursorWorld: Pt, fromPt?: Pt) => {
        const SNAP_RADIUS = PAD_SNAP_RADIUS;
        // If the via hover provider indicates a hovered via, prefer that
        // as the finalization target — the UI highlight should be
        // authoritative for snapping behavior.
        try {
            const vh = viaHoverApi?.hovered;
            if (vh && vh.uuid) {
                const tv = (pcb.tracks || []).find(t => t.kind === 'via' && ((t.data as any)?.uuid === vh.uuid));
                if (tv) {
                    const via = (tv as any).data as any;
                    const atArr = via.at ?? [0,0];
                    const gx = Number(atArr[0]) || 0;
                    const gy = Number(atArr[1]) || 0;
                    const viaNet = via.net ?? null;
                    return { connected: true, via, point: { x: gx, y: gy }, net: viaNet } as any;
                }
            }
        } catch (err) {
            // ignore and fall back to radius-based detection
        }
        // Check vias first: they act as magnet points similar to pad centers
        for (const t of (pcb.tracks || [])) {
            if (t.kind !== 'via') continue;
            const via = (t as any).data as any;
            const atArr = via.at ?? [0,0];
            const gx = Number(atArr[0]) || 0;
            const gy = Number(atArr[1]) || 0;
            const dx = cursorWorld.x - gx;
            const dy = cursorWorld.y - gy;
            const dist = Math.hypot(dx, dy);
            if (dist <= SNAP_RADIUS) {
                const viaNet = via.net ?? null;
                return { connected: true, via, point: { x: gx, y: gy }, net: viaNet } as any;
            }
        }
        // First: check magnet points (pad centers) — invisible anchor points that
        // immediately finalize a route when the endpoint is on them.
        for (const fp of (pcb.footprints || [])) {
            const at = fp.at ?? { x: 0, y: 0, angle: 0 };
            const angle = at.angle ?? 0;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const pads = (fp.pads ?? []) as any[];
            for (let i = 0; i < pads.length; i++) {
                const p = pads[i];
                const pat = p.at ?? { x: 0, y: 0 };
                const localX = Number(pat.x) || 0;
                const localY = Number(pat.y) || 0;
                const gx = at.x + (localX * c - localY * s);
                const gy = at.y + (localX * s + localY * c);
                const dx = cursorWorld.x - gx;
                const dy = cursorWorld.y - gy;
                const dist = Math.hypot(dx, dy);
                if (dist <= SNAP_RADIUS) {
                    const pad = p;
                    const padNet = (pad.net ?? pad.net_name) ?? null;
                    return { connected: true, pad, point: { x: gx, y: gy }, net: padNet };
                }
            }
        }

        // gather candidate pads from placed footprints for perimeter snapping
        const candidates: Array<{ pad: any; fp: any }> = [];
        for (const fp of (pcb.footprints || [])) {
            const at = fp.at ?? { x: 0, y: 0, angle: 0 };
            const angle = at.angle ?? 0;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const pads = (fp.pads ?? []) as any[];
            for (const p of pads) {
                // compute pad bbox in world coordinates for quick reject
                const pat = p.at ?? { x: 0, y: 0 };
                const localX = Number(pat.x) || 0;
                const localY = Number(pat.y) || 0;
                const gx = at.x + (localX * c - localY * s);
                const gy = at.y + (localX * s + localY * c);
                const sizeArr = p.size ?? [1, 1];
                const w = Number(sizeArr[0]) || 1;
                const h = Number(sizeArr[1]) || w;
                const minX = gx - w / 2 - SNAP_RADIUS;
                const maxX = gx + w / 2 + SNAP_RADIUS;
                const minY = gy - h / 2 - SNAP_RADIUS;
                const maxY = gy + h / 2 + SNAP_RADIUS;
                if (cursorWorld.x < minX || cursorWorld.x > maxX || cursorWorld.y < minY || cursorWorld.y > maxY) continue;
                candidates.push({ pad: p, fp });
            }
        }

        let bestPad: any = null;
        let bestPoint: Pt | null = null;
        let bestDist = Infinity;

        const ptDist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

        for (const { pad, fp } of candidates) {
            const at = fp.at ?? { x: 0, y: 0, angle: 0 };
            const angle = at.angle ?? 0;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const pat = pad.at ?? { x: 0, y: 0 };
            const localX = Number(pat.x) || 0;
            const localY = Number(pat.y) || 0;
            const center: Pt = { x: at.x + (localX * c - localY * s), y: at.y + (localX * s + localY * c) };
            const shape = (pad.shape ?? "rect") as string;
            const sizeArr = pad.size ?? [1, 1];
            const w = Number(sizeArr[0]) || 1;
            const h = Number(sizeArr[1]) || w;

            // compute nearest point on pad copper (perimeter or interior)
            let snap: Pt | null = null;
            if (shape === "circle" || shape === "round") {
                const r = Math.max(w, h) / 2;
                // If we have an origin point, snap to the perimeter point on the
                // side facing the origin (so a track connects into the pad)
                if (fromPt) {
                    const dx = fromPt.x - center.x;
                    const dy = fromPt.y - center.y;
                    const d = Math.hypot(dx, dy) || 1e-9;
                    snap = { x: center.x + (dx / d) * Math.max(w, h) / 2, y: center.y + (dy / d) * Math.max(w, h) / 2 };
                } else {
                    const dx = cursorWorld.x - center.x;
                    const dy = cursorWorld.y - center.y;
                    const d = Math.hypot(dx, dy);
                    if (d <= r) {
                        if (d <= 1e-9) snap = { x: center.x, y: center.y };
                        else snap = { x: center.x + (dx / d) * r, y: center.y + (dy / d) * r };
                    } else {
                        snap = { x: center.x + (dx / d) * r, y: center.y + (dy / d) * r };
                    }
                }
            } else {
                // rectangle/oval fallback: treat as axis-aligned rect in footprint coords
                // compute cursor in footprint-local coords
                const dx = cursorWorld.x - center.x;
                const dy = cursorWorld.y - center.y;
                const halfW = w / 2;
                const halfH = h / 2;
                const cx = Math.max(-halfW, Math.min(halfW, dx));
                const cy = Math.max(-halfH, Math.min(halfH, dy));
                // nearest point in world coords
                snap = { x: center.x + cx, y: center.y + cy };
                // if we have an origin, snap to the center of the nearest edge
                if (fromPt) {
                    const inDx = fromPt.x - center.x;
                    const inDy = fromPt.y - center.y;
                    if (Math.abs(inDx) > Math.abs(inDy)) {
                        // incoming from left/right -> snap to side center
                        snap = { x: center.x + (inDx > 0 ? halfW : -halfW), y: center.y };
                    } else {
                        // incoming from top/bottom -> snap to top/bottom center
                        snap = { x: center.x, y: center.y + (inDy > 0 ? halfH : -halfH) };
                    }
                } else {
                    // if inside rect (dx between -halfW..halfW and dy between -halfH..halfH)
                    if (dx >= -halfW && dx <= halfW && dy >= -halfH && dy <= halfH) {
                        // snap to nearest perimeter if desired; here we use nearest perimeter
                        const distLeft = Math.abs(dx + halfW);
                        const distRight = Math.abs(halfW - dx);
                        const distTop = Math.abs(dy + halfH);
                        const distBottom = Math.abs(halfH - dy);
                        const minEdge = Math.min(distLeft, distRight, distTop, distBottom);
                        if (minEdge === distLeft) snap = { x: center.x - halfW, y: center.y + dy };
                        else if (minEdge === distRight) snap = { x: center.x + halfW, y: center.y + dy };
                        else if (minEdge === distTop) snap = { x: center.x + dx, y: center.y - halfH };
                        else snap = { x: center.x + dx, y: center.y + halfH };
                    }
                }
            }

            if (!snap) continue;
            const dist = ptDist(cursorWorld, snap);
            if (dist <= SNAP_RADIUS && dist < bestDist) {
                bestDist = dist;
                bestPad = { pad, fp };
                bestPoint = snap;
            }
        }

        if (!bestPad || !bestPoint) return { connected: false };

        // Determine resulting net
        const pad = bestPad.pad;
        const padNet = (pad.net ?? pad.net_name) ?? null;
        const resultantNet = padNet; // policy: adopt pad net if present

        return { connected: true, pad, point: bestPoint, net: resultantNet };
    };

    const segmentsAreFree = (segments: Array<{ start: [number, number]; end: [number, number]; width: number; layer?: string }>) => {
        for (const s of segments) {
            const p1: Pt = { x: s.start[0], y: s.start[1] };
            const p2: Pt = { x: s.end[0], y: s.end[1] };
            const segLayer = (s.layer as string) || (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
            const blocker = findBlockingObstacleLocal(p1, p2, s.width, routerParams.clearance, segLayer);
            if (blocker) {
                console.warn("Routing placement blocked — segment would hit obstacle:", { segment: s, obstacle: blocker.obstacle, dist: blocker.dist, thresh: blocker.thresh, layer: segLayer });
                return false;
            }
        }
        return true;
    };

    const handleRoutingMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        const stagePos = e.target.getStage ? e.target.getStage()?.getPointerPosition() : null;
        if (!stagePos) return;
        let worldPos = screenToWorld({ x: stagePos.x, y: stagePos.y });
        // Snap click to a nearby endpoint so continuation clicks succeed.
        const snap = findNearestEndpoint(worldPos);
        if (snap) worldPos = snap;
        // If routing not active yet, start continuous routing
        if (!routingActive) {
            // starting a new session: clear any leftover placed segments
            placedSegmentsRef.current = [];
            setRoutingActive(true);
            routingActiveRef.current = true;
            // initialize routing session trace layer from currently selected layer
            try {
                resetCurrentTraceLayer((selectedLayerId as string) || "F.Cu");
            } catch (err) {
                // ignore if routing context not available
            }
            setRoutingStart(worldPos);
            return;
        }

        if (!routingStart) {
            // defensive: ensure we have a start when active
            setRoutingStart(worldPos);
            return;
        }

        // routingActive && routingStart -> finish segment and continue
        {
            // Finish routing, add track to PCB
            if (previewTracks.length > 1) {
                // Convert path to track segments
                const segments: any[] = [];
                // Use routing session layer if present, fall back to selected layer
                let initialLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                for (let i = 0; i < previewTracks.length - 1; i++) {
                    segments.push({
                        start: [previewTracks[i].x, previewTracks[i].y],
                        end: [previewTracks[i + 1].x, previewTracks[i + 1].y],
                        width: routerParams.trackWidth,
                        layer: initialLayer,
                        net: 0, // TODO: determine net
                    });
                }
                // Allow finalization to pads if the click is near a pad.
                // Also check the actual last preview point: sometimes the preview
                // endpoint may lie directly on a pad even if the click was off.
                const lastPreview = previewTracks[previewTracks.length - 1];
                const prevPreview = previewTracks.length > 1 ? previewTracks[previewTracks.length - 2] : null;
                // If pad hover context indicates we're over a pad, prefer the
                // pad center as the finalize point so clicking snaps to the
                // invisible magnet instead of the exact cursor position.
                let finalizeClickPos = worldPos;
                try {
                    const hovered = padHoverApi?.hovered;
                    if (hovered && hovered.fpUuid) {
                        const fp = (pcb.footprints || []).find((f: any) => f.uuid === hovered.fpUuid);
                        if (fp) {
                            const pad = (fp.pads ?? [])[hovered.padIndex];
                            if (pad) {
                                const at = fp.at ?? { x: 0, y: 0, angle: 0 };
                                const angle = at.angle ?? 0;
                                const c = Math.cos(angle);
                                const s = Math.sin(angle);
                                const pat = pad.at ?? { x: 0, y: 0 };
                                const localX = Number(pat.x) || 0;
                                const localY = Number(pat.y) || 0;
                                const gx = at.x + (localX * c - localY * s);
                                const gy = at.y + (localX * s + localY * c);
                                finalizeClickPos = { x: gx, y: gy };
                            }
                        }
                    }
                } catch (err) {
                    // ignore
                }
                const finalizeClick = tryFinalizeAtCursor(finalizeClickPos, prevPreview ?? undefined);
                const finalizeLast = tryFinalizeAtCursor(lastPreview, prevPreview ?? undefined);
                const finalize = finalizeClick.connected ? finalizeClick : (finalizeLast.connected ? finalizeLast : { connected: false });

                // If finalize.connected, snap the last endpoint to the pad or via.
                // Pads terminate routing; vias act as magnet points but allow
                // continuous routing through them (do not stop the session).
                if (finalize.connected) {
                    console.debug('[routing] finalize detected (preview branch)', { finalize });
                    const finalPoint = finalize.point as Pt;
                    const padNet = finalize.net ?? null;
                    // adjust the last point of previewTracks to the snapped point
                    previewTracks[previewTracks.length - 1] = finalPoint;
                    // Convert path to track segments
                    const segmentsFinal: any[] = [];
                    // Start routing on the routing-session layer (fallback to selected layer)
                    let currentLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                    for (let i = 0; i < previewTracks.length - 1; i++) {
                        const a = previewTracks[i];
                        const b = previewTracks[i + 1];
                        segmentsFinal.push({
                            start: [a.x, a.y],
                            end: [b.x, b.y],
                            width: routerParams.trackWidth,
                            layer: currentLayer,
                            net: padNet ?? 0,
                        });
                        // If we pass through a via at the segment end, toggle layer for next segment
                        const via = findViaAtPoint({ x: b.x, y: b.y } as Pt);
                        if (via) {
                            const nextLayer = currentLayer === "F.Cu" ? "B.Cu" : "F.Cu";
                            console.log('[routing] via encountered (finalize branch)', { viaUuid: (via as any).uuid ?? null, at: (via as any).at ?? null, currentLayer, nextLayer });
                            currentLayer = nextLayer;
                        }
                    }
                    if (!segmentsAreFree(segmentsFinal)) {
                        console.warn("Routing placement blocked due to collision with existing geometry (after pad snap).);");
                        setPreviewTracks([]);
                        return;
                    }
                    // Add segments via context helper
                    for (const s of segmentsFinal) {
                        console.log('[routing] committing segment (finalize)', { layer: s.layer, start: s.start, end: s.end });
                        addTrack?.({ kind: "segment", data: s } as any);
                    }
                    try { setCurrentTraceLayer(currentLayer); } catch (err) { /* ignore if absent */ }

                    // If the finalize target was a via, keep routing active and
                    // continue from the via center (do not stop). If it was a
                    // pad, stop routing as before.
                    const finalizedVia = (finalize as any).via;
                    if (finalizedVia) {
                        // continue routing from via
                        console.debug('[routing] connected to via — continuing routing from via');
                        const last = finalPoint;
                        setRoutingStart({ x: last.x, y: last.y });
                        setRoutingActive(true);
                        routingActiveRef.current = true;
                        // record placed segments
                        placedSegmentsRef.current.push(...segmentsFinal.map(s => ({ start: { x: s.start[0], y: s.start[1] }, end: { x: s.end[0], y: s.end[1] }, width: s.width, layer: s.layer })));
                        // request an updated preview using the new start
                        if (workerRef.current) {
                            const obstacles = buildWorkerObstacles(currentLayer);
                            workerRequestIdRef.current += 1;
                            workerRef.current.postMessage({ type: 'route', id: workerRequestIdRef.current, start: { x: last.x, y: last.y }, goal: worldPos, params: routerParams, obstacles });
                        }
                        setPreviewTracks([]);
                        return;
                    }

                    // finalize: stop routing (pad case)
                    console.debug('[routing] finalizing: stopping routing (preview branch)');
                    routingActiveRef.current = false;
                    setRoutingStart(null);
                    setRoutingActive(false);
                    placedSegmentsRef.current = [];
                    setPreviewTracks([]);
                    return;
                }

                // Prevent committing segments that collide with existing
                // tracks or segments placed this session.
                if (!segmentsAreFree(segments)) {
                    console.warn("Routing placement blocked due to collision with existing geometry.");
                    // keep routing active so user can try a different endpoint
                    setPreviewTracks([]);
                    return;
                }
                // Add to PCB
                // Assign layers while adding: start on routing-session layer and toggle when passing vias
                let currentLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                    for (const s of segments) {
                    const endPt = { x: s.end[0], y: s.end[1] } as Pt;
                    console.log('[routing] committing segment (commit)', { layer: currentLayer, start: s.start, end: s.end });
                    addTrack?.({ kind: "segment", data: { ...s, layer: currentLayer } } as any);
                    const via = findViaAtPoint(endPt);
                    if (via) {
                        const nextLayer = currentLayer === "F.Cu" ? "B.Cu" : "F.Cu";
                        console.log('[routing] via encountered (commit branch)', { viaUuid: (via as any).uuid ?? null, at: (via as any).at ?? null, currentLayer, nextLayer });
                        currentLayer = nextLayer;
                    }
                    }
                    try { setCurrentTraceLayer(currentLayer); } catch (err) { /* ignore if absent */ }
                // Continue routing from the last placed point (continuous routing)
                const last = previewTracks[previewTracks.length - 1];
                setRoutingStart({ x: last.x, y: last.y });
                // keep routingActive true so next click continues
                setRoutingActive(true);
                routingActiveRef.current = true;

                // Record placed segments locally so subsequent worker calls
                // include them immediately as obstacles (no need to wait for
                // `pcb` state to propagate).
                placedSegmentsRef.current.push(...segments.map(s => ({ start: { x: s.start[0], y: s.start[1] }, end: { x: s.end[0], y: s.end[1] }, width: s.width, layer: s.layer })));

                // Immediately request an updated preview from the worker using
                // the newly placed endpoint as start and the current mouse
                // position as goal. Include PCB tracks and locally placed
                // segments as obstacles so the worker has an up-to-date
                // collision set.
                    if (workerRef.current) {
                        const workerLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                        const obstacles = buildWorkerObstacles(workerLayer);
                        workerRequestIdRef.current += 1;
                        workerRef.current.postMessage({ type: 'route', id: workerRequestIdRef.current, start: { x: last.x, y: last.y }, goal: worldPos, params: routerParams, obstacles });
                }
                return;
            }
            // If there was no preview path yet (worker not returned fast enough),
            // compute a minimal octilinear candidate locally and place it so
            // clicks feel immediate and routing continues.
            const gridStep = routerParams.gridStep;
            const worldToGrid = (p: Pt) => ({ gx: Math.round(p.x / gridStep), gy: Math.round(p.y / gridStep) });
            const gridToWorld = (gx: number, gy: number) => ({ x: gx * gridStep, y: gy * gridStep });
            const makeMinimal = (s: Pt, g: Pt) => {
                const sG = worldToGrid(s);
                const gG = worldToGrid(g);
                if (sG.gx === gG.gx || sG.gy === gG.gy) return [gridToWorld(sG.gx, sG.gy), gridToWorld(gG.gx, gG.gy)];
                const dx = gG.gx - sG.gx;
                const dy = gG.gy - sG.gy;
                const absdx = Math.abs(dx);
                const absdy = Math.abs(dy);
                if (absdx === absdy) return [gridToWorld(sG.gx, sG.gy), gridToWorld(gG.gx, gG.gy)];
                const signx = dx < 0 ? -1 : 1;
                const signy = dy < 0 ? -1 : 1;
                const diag = Math.min(absdx, absdy);
                const midGx = sG.gx + diag * signx;
                const midGy = sG.gy + diag * signy;
                return [gridToWorld(sG.gx, sG.gy), gridToWorld(midGx, midGy), gridToWorld(gG.gx, gG.gy)];
            };

                    if (routingStart) {
                const candidate = makeMinimal(routingStart, worldPos);
                if (candidate.length > 1) {
                    const segments: any[] = [];
                    let currentLayer = (currentTraceLayer as string) || (selectedLayerId as string) || 'F.Cu';
                    for (let i = 0; i < candidate.length - 1; i++) {
                        const a = candidate[i];
                        const b = candidate[i + 1];
                        segments.push({ start: [a.x, a.y], end: [b.x, b.y], width: routerParams.trackWidth, layer: currentLayer, net: 0 });
                        const via = findViaAtPoint({ x: b.x, y: b.y } as Pt);
                        if (via) {
                            const nextLayer = currentLayer === 'F.Cu' ? 'B.Cu' : 'F.Cu';
                            console.log('[routing] via encountered (minimal candidate build)', { viaUuid: (via as any).uuid ?? null, at: (via as any).at ?? null, currentLayer, nextLayer });
                            currentLayer = nextLayer;
                        }
                    }
                                    // Prevent committing segments that collide with existing
                                    // tracks or segments placed this session.
                                    if (!segmentsAreFree(segments)) {
                                        console.warn("Routing placement blocked due to collision with existing geometry.");
                                        setPreviewTracks([]);
                                        return;
                                    }
                                    // Before continuing, check if the last endpoint is a pad —
                                    // if so, finalize to pad and stop continuous routing.
                                    const last = candidate[candidate.length - 1];
                                    const prev = candidate.length > 1 ? candidate[candidate.length - 2] : null;
                                    const finalizeCandidate = tryFinalizeAtCursor(last, prev ?? undefined);
                                    if (finalizeCandidate.connected) {
                                        console.debug('[routing] finalize detected (minimal candidate branch)', { finalizeCandidate });
                                        const padNet = finalizeCandidate.net ?? null;
                                        const snapped = finalizeCandidate.point as Pt;
                                        candidate[candidate.length - 1] = snapped;
                                        const segmentsFinal: any[] = [];
                                        let currentLayer = (currentTraceLayer as string) || (selectedLayerId as string) || 'F.Cu';
                                        for (let i = 0; i < candidate.length - 1; i++) {
                                            const a = candidate[i];
                                            const b = candidate[i + 1];
                                            segmentsFinal.push({ start: [a.x, a.y], end: [b.x, b.y], width: routerParams.trackWidth, layer: currentLayer, net: padNet ?? 0 });
                                            const via = findViaAtPoint({ x: b.x, y: b.y } as Pt);
                                            if (via) {
                                                const nextLayer = currentLayer === 'F.Cu' ? 'B.Cu' : 'F.Cu';
                                                console.log('[routing] via encountered (minimal finalize branch)', { viaUuid: (via as any).uuid ?? null, at: (via as any).at ?? null, currentLayer, nextLayer });
                                                currentLayer = nextLayer;
                                            }
                                        }
                                        if (!segmentsAreFree(segmentsFinal)) {
                                            console.warn('Routing placement blocked due to collision with existing geometry.');
                                            setPreviewTracks([]);
                                            return;
                                        }
                                        for (const s of segmentsFinal) {
                                            console.log('[routing] committing segment (minimal finalize)', { layer: s.layer, start: s.start, end: s.end });
                                            addTrack?.({ kind: 'segment', data: s } as any);
                                        }
                                        try { setCurrentTraceLayer(currentLayer); } catch (err) { }
                                        placedSegmentsRef.current.push(...segmentsFinal.map(s => ({ start: { x: s.start[0], y: s.start[1] }, end: { x: s.end[0], y: s.end[1] }, width: s.width, layer: s.layer })));
                                        // If finalize target is a via, continue routing from it
                                        const finalizedVia = (finalizeCandidate as any).via;
                                        if (finalizedVia) {
                                            console.debug('[routing] connected to via — continuing routing (minimal candidate)');
                                            const snappedPt = snapped;
                                            routingActiveRef.current = true;
                                            setRoutingActive(true);
                                            setRoutingStart({ x: snappedPt.x, y: snappedPt.y });
                                            // request updated preview
                                                if (workerRef.current) {
                                                    const obstacles = buildWorkerObstacles(currentLayer);
                                                    workerRequestIdRef.current += 1;
                                                    workerRef.current.postMessage({ type: 'route', id: workerRequestIdRef.current, start: { x: snappedPt.x, y: snappedPt.y }, goal: worldPos, params: routerParams, obstacles });
                                                }
                                            setPreviewTracks([]);
                                            return;
                                        }

                                        console.debug('[routing] finalizing: stopping routing (minimal candidate branch)');
                                        routingActiveRef.current = false;
                                        setRoutingStart(null);
                                        setRoutingActive(false);
                                        setPreviewTracks([]);
                                        placedSegmentsRef.current = [];
                                        return;
                                    }

                                    // otherwise commit and continue routing
                                        for (const s of segments) addTrack?.({ kind: 'segment', data: s } as any);
                                        // record placed segments so worker avoids them right away
                                        placedSegmentsRef.current.push(...segments.map(s => ({ start: { x: s.start[0], y: s.start[1] }, end: { x: s.end[0], y: s.end[1] }, width: s.width, layer: s.layer })));
                                    setRoutingStart({ x: last.x, y: last.y });
                            // trigger worker to update preview for continued routing
                                if (workerRef.current) {
                                    const workerLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                                    const obstacles = buildWorkerObstacles(workerLayer);
                                    workerRequestIdRef.current += 1;
                                    workerRef.current.postMessage({ type: 'route', id: workerRequestIdRef.current, start: { x: last.x, y: last.y }, goal: worldPos, params: routerParams, obstacles });
                                }
                    return;
                }
            }

            // Fallback: treat click as starting a new segment
            setRoutingStart(worldPos);
        }
    };

    const handleRoutingMouseMove = (e: KonvaEventObject<MouseEvent>) => {
        if (routingActive && routingStart) {
            const stagePos = e.target.getStage ? e.target.getStage()?.getPointerPosition() : null;
            if (!stagePos) return;
            let worldPos = screenToWorld({ x: stagePos.x, y: stagePos.y });
            // Snap preview goal to nearby endpoint for accurate preview.
            const snap = findNearestEndpoint(worldPos);
            if (snap) worldPos = snap;
            // Provide an immediate local octilinear preview so UI is responsive
            // even when the worker is still computing. The worker will overwrite
            // the preview when its result arrives.
            try {
                const gridStep = routerParams.gridStep;
                const worldToGrid = (p: Pt) => ({ gx: Math.round(p.x / gridStep), gy: Math.round(p.y / gridStep) });
                const gridToWorld = (gx: number, gy: number) => ({ x: gx * gridStep, y: gy * gridStep });
                const startG = worldToGrid(routingStart);
                const goalG = worldToGrid(worldPos);
                let localCandidate: Pt[] = [];
                if (startG.gx === goalG.gx || startG.gy === goalG.gy) {
                    localCandidate = [gridToWorld(startG.gx, startG.gy), gridToWorld(goalG.gx, goalG.gy)];
                } else if (Math.abs(goalG.gx - startG.gx) === Math.abs(goalG.gy - startG.gy)) {
                    localCandidate = [gridToWorld(startG.gx, startG.gy), gridToWorld(goalG.gx, goalG.gy)];
                } else {
                    const dx = goalG.gx - startG.gx;
                    const dy = goalG.gy - startG.gy;
                    const signx = dx < 0 ? -1 : 1;
                    const signy = dy < 0 ? -1 : 1;
                    const diag = Math.min(Math.abs(dx), Math.abs(dy));
                    const midGx = startG.gx + diag * signx;
                    const midGy = startG.gy + diag * signy;
                    localCandidate = [gridToWorld(startG.gx, startG.gy), gridToWorld(midGx, midGy), gridToWorld(goalG.gx, goalG.gy)];
                }
                setPreviewTracks(localCandidate);
            } catch (err) {
                // fall back silently if anything goes wrong
            }
            // Build simple linear obstacles from existing PCB tracks and any
            // segments placed this session so the worker can avoid routing
            // through them. Only send obstacles for the active routing layer
            // so the worker allows crossings on other copper layers.
            const workerLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
            const obstacles = buildWorkerObstacles(workerLayer);

            if (workerRef.current) {
                workerRequestIdRef.current += 1;
                workerRef.current.postMessage({
                    type: "route",
                    id: workerRequestIdRef.current,
                    start: routingStart,
                    goal: worldPos,
                    params: routerParams,
                    obstacles,
                });
            }
        }
    };

    // Always allow pointer events on the shapes canvas so drawing tools work.
    // Footprint canvas will only accept pointer events during preview.
    const pointerEvents = "auto";
    const zIndex = 20;

	// pointer down/up/move handled by hook

	// Note: text input keydown handler is provided by the hook (`handleTextInputKeyDown`).

	// Mouse handlers are provided by the hook: `handleMouseDown`, `handleMouseMove`, `handleMouseUp`.

	// Mouse up handled by hook.

	// Keyboard and context menu behavior handled inside the hook.

	const inputScreenPos = textPos
		? computeInputScreenPos(textPos, camera, zoom, viewportCenter)
		: { x: 0, y: 0 };

	return (
        <div className="absolute inset-0" style={{ pointerEvents, zIndex }} ref={containerRef}>
            <GridDebugOverlay />
            <TextOverlay
                showTextInput={showTextInput}
                textPos={textPos}
                inputScreenPos={inputScreenPos}
                textInput={textInput}
                setTextInput={setTextInput}
                handleTextInputKeyDown={handleTextInputKeyDown}
                overlayEffects={overlayEffects}
                setOverlayEffects={setOverlayEffects}
                overlayColor={overlayColor}
                setOverlayColor={setOverlayColor}
            />
            <CanvasStage
                width={size.width}
                height={size.height}
                zoom={zoom}
                viewportCenter={viewportCenter}
                camera={camera}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={handleCanvasContextMenu}
            >
                <Layer>
                    {pcb.graphics
                        ?.filter((item) => {
                                const layer = (item.data as unknown as { layer?: string })?.layer as string | undefined;
                                if (!layer) return true;
                                return !!visibility[layer];
                            })
                        .map(renderShape)}
                    <SelectionHighlight />
                    {/* Konva preview of the text currently being edited so the DOM input matches world rendering */}
                    {showTextInput && textPos && (
                        <Text
                            x={textPos[0]}
                            y={textPos[1]}
                            text={textInput || ""}
                            fontSize={(overlayEffects?.font?.size?.[0]) ?? (defaultTextEffects?.font?.size?.[0]) ?? 16}
                            fontStyle={`${(overlayEffects?.font?.bold ?? defaultTextEffects?.font?.bold) ? "bold" : "normal"} ${(overlayEffects?.font?.italic ?? defaultTextEffects?.font?.italic) ? "italic" : "normal"}`}
                            fill={overlayColor}
                            listening={false}
                        />
                    )}
                    {isDrawing && currentPoint && (
                        <>
                            {(tool === "polygon" && polygonPoints && polygonPoints.length > 0)
                                ? renderPreviewShape(
                                    tool,
                                    polygonPoints[0],
                                    currentPoint,
                                    polygonPoints,
                                    [],
                                    DEFAULT_STROKE,
                                    toolStrokeWidth,
                                )
                                : (tool === "arc" && isDrawing)
                                    ? (
                                        arcPhase === "circle" && startPoint
                                            ? renderPreviewShape("circle", startPoint, currentPoint, [], [], DEFAULT_STROKE, toolStrokeWidth)
                                        : (arcPhase === "sweep" && arcStartPoint && arcRadius && startPoint)
                                            ? (() => {
                                                const props = computeArcPreviewProps(startPoint as Xy, arcStartPoint as Xy, currentPoint as Xy, arcRadius as number, Number(toolStrokeWidth), DEFAULT_STROKE);
                                                return <Arc {...props} />;
                                            })()
                                            : null
                                    )
                                : (startPoint && currentPoint)
                                    ? renderPreviewShape(tool, startPoint, currentPoint, [], [], DEFAULT_STROKE, DEFAULT_WIDTH)
                                    : null}

                            {(startPoint && currentPoint)
                                            ? (() => {
                                                let label = "";
                                                if (tool === "arc") {
                                                    if (arcPhase === "circle") {
                                                        const dx = startPoint[0] - currentPoint[0];
                                                        const dy = startPoint[1] - currentPoint[1];
                                                        const mm = Math.sqrt(dx * dx + dy * dy);
                                                        label = `R: ${measurement.formatLength(mm)}`;
                                                    } else if (arcPhase === "sweep") {
                                                        if (typeof arcRadius === "number") {
                                                            label = `R: ${measurement.formatLength(arcRadius)}`;
                                                        } else if (arcStartPoint) {
                                                            const dx = startPoint[0] - arcStartPoint[0];
                                                            const dy = startPoint[1] - arcStartPoint[1];
                                                            const mm = Math.sqrt(dx * dx + dy * dy);
                                                            label = `R: ${measurement.formatLength(mm)}`;
                                                        }
                                                    }
                                                } else {
                                                    // format other tools' dimension values with units
                                                    const dx = Math.abs(startPoint[0] - currentPoint[0]);
                                                    const dy = Math.abs(startPoint[1] - currentPoint[1]);
                                                    switch (tool) {
                                                        case "rect":
                                                            label = `W: ${measurement.formatLength(dx)} H: ${measurement.formatLength(dy)}`;
                                                            break;
                                                        case "circle": {
                                                            const r = Math.sqrt(dx * dx + dy * dy);
                                                            label = `R: ${measurement.formatLength(r)}`;
                                                            break;
                                                        }
                                                        case "line": {
                                                            const len = Math.sqrt(dx * dx + dy * dy);
                                                            label = `L: ${measurement.formatLength(len)}`;
                                                            break;
                                                        }
                                                        default:
                                                            label = getDimensionsText(tool, startPoint, currentPoint);
                                                    }
                                                }
                                                return label ? (
                                                    <Text
                                                        x={currentPoint[0]}
                                                        y={currentPoint[1]}
                                                        offsetX={-10}
                                                        offsetY={-10}
                                                        text={label}
                                                        fontSize={12 / zoom}
                                                        fill="white"
                                                    />
                                                ) : null;
                                            })()
                            : null}
                        </>
                    )}
                </Layer>
                {/* Footprint rendering moved to `FootprintCanvas` (separate Stage). */}
            </CanvasStage>
            <SelectionContextMenu />
        </div>
    );
}
