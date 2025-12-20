import type { KonvaEventObject } from "konva/lib/Node";
import type { Pt } from "../routing/octilinearRouter";
import type React from 'react';
import { useRef } from "react";
import { findViaUnderCursor, findPadUnderCursor, tryFinalizeAtCursor, findNearestEndpoint, findViaAtPoint, findPadCenterUnderCursor } from "../services/PadViaService";
import { segmentsAreFree, findBlockingObstacleLocal } from "../services/CollisionService";
import { routerParams } from "../constants/routingConstants";
import { buildWorkerObstacles } from "../services/RoutingService";
import { ENABLE_PAD_HIGHLIGHT, PAD_SNAP_RADIUS, ENABLE_PAD_CENTER_DEBUG } from "@/features/pcb_editor/constants";

/**
 * useMouseHandlers
 *
 * Centralized pointer handler factory used by `ShapesCanvas`. The hook
 * returns a small set of handlers that encapsulate routing, via start/drag,
 * pad hover updates and delegating back to the original canvas handlers
 * when appropriate.
 *
 * Important: this is not a React hook that returns React state. It is a
 * helper factory which returns handler functions and uses internal refs to
 * track transient state (e.g. `draggingViaRef`). Callers should pass in
 * the canonical `originalHandleMouse*` callbacks so low-level interactions
 * (selection/drag) continue to work.
 *
 * @returns an object with `{ handleMouseDown, handleMouseMove, handleMouseUp, handleCanvasContextMenu }`.
 */
export const useMouseHandlers = (
    tool: string,
    screenToWorld: (pt: { x: number; y: number }) => { x: number; y: number },
    select: (id: string | null) => void,
    updateViaPosition: ((id: string, pos: { x: number; y: number }) => void) | undefined,
    addVia: ((via: any) => void) | undefined,
    addTrack: ((track: any) => void) | undefined,
    removeVia: ((id: string) => void) | undefined,
    viaSize: number | undefined,
    routingStart: Pt | null,
    setRoutingStart: (pt: Pt | null) => void,
    routingActive: boolean,
    setRoutingActive: (active: boolean) => void,
    routingActiveRef: React.MutableRefObject<boolean>,
    workerRef: React.MutableRefObject<Worker | null>,
    workerRequestIdRef: React.MutableRefObject<number>,
    placedSegmentsRef: React.MutableRefObject<Array<{ uuid?: string; start: Pt; end: Pt; width: number; layer?: string }>>,
    routingOriginRef: React.MutableRefObject<Pt | null>,
    setPreviewTracks: (tracks: Pt[]) => void,
    previewTracks: Pt[],
    _previewIncompatibleWithPad: boolean,
    setPreviewIncompatibleWithPad: (v: boolean) => void,
    currentTraceLayer: string | undefined,
    setCurrentTraceLayer: ((layer: string) => void) | undefined,
    resetCurrentTraceLayer: (() => void) | undefined,
    selectedLayerId: string | undefined,
    pcb: any,
    padHoverApi: any,
    viaHoverApi: any,
    originalHandleMouseDown: (e: KonvaEventObject<MouseEvent>) => void,
    originalHandleMouseMove: (e: KonvaEventObject<MouseEvent>) => void,
    originalHandleMouseUp: () => void
) => {
    const draggingViaRef = useRef<string | null>(null);

    const makeUuid = (prefix: string) => {
        try {
            if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) return (crypto as any).randomUUID() as string;
        } catch (err) {}
        return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    };

    const stopRouting = () => {
        try {
            routingActiveRef.current = false;
        } catch (err) {}
        try { setRoutingStart(null); } catch (err) {}
        try { setRoutingActive(false); } catch (err) {}
        try { placedSegmentsRef.current = []; } catch (err) {}
        try { routingOriginRef.current = null; } catch (err) {}
        try { setPreviewTracks([]); } catch (err) {}
    };

    const computePadCenterFromPadMeta = (padMeta: any) => {
        try {
            if (!padMeta) return null;
            const fpUuid = padMeta.fpUuid ?? padMeta.fp?.uuid ?? null;
            const padIndex = (typeof padMeta.padIndex !== 'undefined') ? padMeta.padIndex : (padMeta.index ?? null);
            if (!fpUuid || padIndex === null || typeof padIndex === 'undefined') return null;
            const fp = (pcb.footprints || []).find((f: any) => f.uuid === fpUuid);
            if (!fp) return null;
            const pads = fp.pads ?? [];
            const pad = pads[padIndex];
            if (!pad) return null;
            // footprint placement: support array [x,y,angle] or object {x,y,angle}
            let atx = 0, aty = 0, angle = 0;
            if (Array.isArray(fp.at)) {
                atx = Number(fp.at[0]) || 0;
                aty = Number(fp.at[1]) || 0;
                angle = Number(fp.at[2]) || 0;
            } else {
                atx = Number(fp.at?.x) || 0;
                aty = Number(fp.at?.y) || 0;
                angle = Number(fp.at?.angle) || 0;
            }
            // pad local position: support array [x,y] or object {x,y} or flat x/y
            let localX = 0, localY = 0;
            if (Array.isArray(pad.at)) {
                localX = Number(pad.at[0]) || 0;
                localY = Number(pad.at[1]) || 0;
            } else {
                localX = Number(pad.at?.x ?? pad.x) || 0;
                localY = Number(pad.at?.y ?? pad.y) || 0;
            }
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const gx = atx + (localX * c - localY * s);
            const gy = aty + (localX * s + localY * c);
            return { x: gx, y: gy } as Pt;
        } catch (err) {
            return null;
        }
    };

    // Centralized canonical pad center resolver. Given either a finalize
    // result or a pad metadata object, always compute the pad's canonical
    // center using PCB footprint placement. Do NOT rely on any caller-
    // supplied `point` field; compute it consistently here.
    const resolveCanonicalCenter = (obj: any) : Pt | null => {
        try {
            if (!obj) return null;
            // If obj looks like a finalize result, prefer its pad metadata
            const padMeta = (obj.padHit ?? obj.pad) ?? obj;
            const center = computePadCenterFromPadMeta(padMeta);
            return center;
        } catch (err) {
            return null;
        }
    };

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
            const hit = findViaUnderCursor(worldPos, pcb);
            if (hit && hit.uuid) {
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
            const padHit = findPadUnderCursor(worldPos, pcb);
            if (padHit) padHoverApi.setHovered({ fpUuid: padHit.fpUuid ?? "", padIndex: padHit.padIndex });
            else padHoverApi.setHovered(null);
            // via hover/magnet points
            const viaHit = findViaUnderCursor(worldPos, pcb);
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

    const handleCanvasContextMenu = (e: KonvaEventObject<MouseEvent>) => {
        try {
            e.evt.preventDefault();
        } catch (err) {}
        // Only act when route tool active and routing session is ongoing
        if (tool !== "route" || !routingActive || !routingStart) return;
        const stagePos = e.target.getStage ? e.target.getStage()?.getPointerPosition() : null;
        if (!stagePos) return;
        let worldPos = screenToWorld({ x: stagePos.x, y: stagePos.y });
        const snap = findNearestEndpoint(worldPos, pcb, placedSegmentsRef);
        if (snap) worldPos = snap;

        // create via
        const viaId = makeUuid('via');
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
        const segId = makeUuid('seg');
        const currentLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
        const seg = { start: [routingStart.x, routingStart.y], end: [worldPos.x, worldPos.y], width: routerParams.trackWidth, layer: currentLayer, net: 0, uuid: segId } as any;

        // If the segment would collide, remove the via and abort
        if (!segmentsAreFree([seg], routerParams.clearance, findBlockingObstacleLocal, currentTraceLayer, selectedLayerId, pcb, placedSegmentsRef)) {
            console.warn('[routing] cannot place via: connecting segment would collide.');
            try { removeVia?.(viaId); } catch (err) { /* ignore */ }
            return;
        }

        // Commit the connecting segment and continue routing from the via
        console.log('[routing] placing via during routing', { viaId, at: worldPos, segId, layer: currentLayer });
        addTrack?.({ kind: 'segment', data: seg } as any);
        // record placed segment locally
        placedSegmentsRef.current.push({ uuid: seg.uuid, start: { x: seg.start[0], y: seg.start[1] }, end: { x: seg.end[0], y: seg.end[1] }, width: seg.width, layer: seg.layer });

        // Toggle routing session layer so next segments are on the other side
        const nextLayer = currentLayer === 'F.Cu' ? 'B.Cu' : 'F.Cu';
        try { setCurrentTraceLayer?.(nextLayer); } catch (err) {}

        // Continue routing from the via center
        setRoutingStart({ x: worldPos.x, y: worldPos.y });
        setRoutingActive(true);
        routingActiveRef.current = true;
        setPreviewTracks([]);
        // Request a fresh preview when the mouse moves; worker will get updated start from move handler
        return;
    };

    const handleRoutingMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        const stagePos = e.target.getStage ? e.target.getStage()?.getPointerPosition() : null;
        if (!stagePos) return;
        let worldPos = screenToWorld({ x: stagePos.x, y: stagePos.y });
        // Snap click to a nearby endpoint so continuation clicks succeed.
        const snap = findNearestEndpoint(worldPos, pcb, placedSegmentsRef);
        if (snap) worldPos = snap;
        // If routing not active yet, start continuous routing
        if (!routingActive) {
            // starting a new session: clear any leftover placed segments
            placedSegmentsRef.current = [];
            try { routingOriginRef.current = null; } catch (err) {}
            setRoutingActive(true);
            routingActiveRef.current = true;
            // initialize routing session trace layer from currently selected layer
            try {
                resetCurrentTraceLayer?.();
            } catch (err) {
                // ignore if routing context not available
            }
            // If the user clicked inside a pad or on a via, snap the routing
            // start to the canonical pad/via centre so the session begins
            // exactly at the magnet point instead of the raw cursor.
            try {
                const requestedLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                // First prefer a strict inside-pad test which is more robust
                // for very small pads.
                // Try strict detection first (no extra margin)
                let padCenterHit = findPadCenterUnderCursor(worldPos, pcb, requestedLayer as any, undefined);
                // If small pad missed, try with a larger forgiving margin
                if (!padCenterHit) padCenterHit = findPadCenterUnderCursor(worldPos, pcb, requestedLayer as any, Math.max(0.5, (typeof PAD_SNAP_RADIUS === 'number' ? PAD_SNAP_RADIUS : 0.2)));
                if (padCenterHit) {
                    const startPt = computePadCenterFromPadMeta(padCenterHit) ?? (padCenterHit.point as Pt);
                    if (startPt) {
                        try {
                            if (ENABLE_PAD_CENTER_DEBUG || ENABLE_PAD_HIGHLIGHT) {
                                console.debug('[routing-debug] snapping start to pad center', { worldPos, padCenterHit, startPt });
                            }
                        } catch (err) {}
                        setRoutingStart(startPt);
                        routingOriginRef.current = startPt;
                        return;
                    }
                }

                // Fallback: tryFinalizeAtCursor also handles vias and perimeter snaps
                const fs = tryFinalizeAtCursor(worldPos, undefined, pcb, padHoverApi, viaHoverApi, requestedLayer as any);
                if (fs && fs.connected) {
                    const startPt = resolveCanonicalCenter(fs) ?? (fs.point as Pt);
                    if (startPt) {
                        try {
                            if (ENABLE_PAD_CENTER_DEBUG || ENABLE_PAD_HIGHLIGHT) {
                                console.debug('[routing-debug] finalize-at-click snapping start', { worldPos, fs, startPt });
                            }
                        } catch (err) {}
                        setRoutingStart(startPt);
                        routingOriginRef.current = startPt;
                        return;
                    }
                }
            } catch (err) {
                // ignore finalize failures and fall back to raw click
            }
            setRoutingStart(worldPos);
            routingOriginRef.current = worldPos;
            return;
        }

        if (!routingStart) {
            // defensive: ensure we have a start when active
            try {
                const placed = placedSegmentsRef.current || [];
                const last = placed.length ? placed[placed.length - 1].end : null;
                const fallback = last ?? routingOriginRef.current ?? worldPos;
                setRoutingStart({ x: fallback.x, y: fallback.y });
            } catch (err) {
                setRoutingStart(worldPos);
            }
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
                        uuid: makeUuid('seg'),
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
                // Use the actual click location for finalize checks but supply
                // the same `prevPreview` used for preview checks so snapping
                // is consistent between preview and click finalize paths.
                const requestedLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                const finalizeClick = tryFinalizeAtCursor(worldPos, prevPreview ?? undefined, pcb, padHoverApi, viaHoverApi, requestedLayer as any);
                const finalizeLast = tryFinalizeAtCursor(lastPreview, prevPreview ?? undefined, pcb, padHoverApi, viaHoverApi, requestedLayer as any);
                const finalize = finalizeClick.connected ? finalizeClick : (finalizeLast.connected ? finalizeLast : { connected: false });

                // If finalize.connected, snap the last endpoint to the pad or via.
                // Pads terminate routing; vias act as magnet points but allow
                // continuous routing through them (do not stop the session).
                if (finalize.connected) {
                    console.debug('[routing] finalize detected (preview branch)', { finalize });
                    // Prefer the pad's true center when available so clicks
                    // inside the pad always snap to the pad center. Use
                    // the finalize result (which was computed with layer
                    // awareness) to find the pad; fall back to re-checking
                    // the click position with `tryFinalizeAtCursor` so we
                    // don't snap to pads that don't accept the current layer.
                    // use computePadCenterFromPadMeta helper above

                    let finalPoint = resolveCanonicalCenter(finalize) ?? (finalize.point as Pt);
                    // Use the finalize object (already computed with layer) if it
                    // contains pad info. Otherwise, re-run a layer-aware finalize
                    // check at the click location to see if the click should snap
                    // to a pad center for this layer.
                    try {
                        // Always compute canonical pad center via resolver so
                        // all code paths use the same point. If the resolver
                        // finds a pad center, prefer it; otherwise, re-check
                        // the click position to detect a pad for this layer.
                        try {
                            const center = resolveCanonicalCenter(finalize);
                            if (center) finalPoint = center;
                            else {
                                const clickFinalize = tryFinalizeAtCursor(worldPos, prevPreview ?? undefined, pcb, padHoverApi, viaHoverApi, requestedLayer as any);
                                const clickCenter = resolveCanonicalCenter(clickFinalize);
                                if (clickCenter) {
                                    finalPoint = clickCenter;
                                    (finalize as any).padHit = (clickFinalize as any).padHit ?? (clickFinalize as any).pad ?? (finalize as any).padHit;
                                }
                            }
                        } catch (err) {
                            // ignore and fall back to finalize.point
                        }
                    } catch (err) {
                        // ignore and fall back to finalize.point
                    }
                    const padNet = finalize.net ?? null;
                    // adjust the last point of previewTracks to the snapped point
                    previewTracks[previewTracks.length - 1] = finalPoint;
                    // Convert path to track segments. Ensure the final segment
                    // explicitly ends at the canonical pad center so the route
                    // endpoint is exactly snapped.
                    const segmentsFinal: any[] = [];
                    // Start routing on the routing-session layer (fallback to selected layer)
                    let currentLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                    for (let i = 0; i < previewTracks.length - 1; i++) {
                        const a = previewTracks[i];
                        const isLastSeg = (i === previewTracks.length - 2);
                        const b = previewTracks[i + 1];
                        const endX = isLastSeg ? finalPoint.x : b.x;
                        const endY = isLastSeg ? finalPoint.y : b.y;
                        segmentsFinal.push({
                            start: [a.x, a.y],
                            end: [endX, endY],
                            width: routerParams.trackWidth,
                            layer: currentLayer,
                            net: padNet ?? 0,
                            uuid: makeUuid('seg'),
                        });
                        // If we pass through a via at the segment end, toggle layer for next segment
                        const via = findViaAtPoint({ x: endX, y: endY } as Pt, pcb);
                        if (via) {
                            const nextLayer = currentLayer === "F.Cu" ? "B.Cu" : "F.Cu";
                            console.log('[routing] via encountered (finalize branch)', { viaUuid: (via as any).uuid ?? null, at: (via as any).at ?? null, currentLayer, nextLayer });
                            currentLayer = nextLayer;
                        }
                    }
                    if (!segmentsAreFree(segmentsFinal, routerParams.clearance, findBlockingObstacleLocal, currentTraceLayer, selectedLayerId, pcb, placedSegmentsRef)) {
                        console.warn("Routing placement blocked due to collision with existing geometry (after pad snap).);");
                        try { workerRequestIdRef.current += 1; } catch (err) {}
                        setPreviewTracks([]);
                        return;
                    }
                    // Add segments via context helper
                    for (const s of segmentsFinal) {
                        console.log('[routing] committing segment (finalize)', { layer: s.layer, start: s.start, end: s.end });
                        addTrack?.({ kind: "segment", data: s } as any);
                    }
                    try { setCurrentTraceLayer?.(currentLayer); } catch (err) { /* ignore if absent */ }

                    // If the finalize target was a via, keep routing active and
                    // continue from the via center (do not stop). If it was a
                    // pad, stop routing — enforce this explicitly so pad
                    // finalization always terminates routing.
                    const finalizedPad = (finalize as any).padHit || (finalize as any).pad;
                    const finalizedVia = (finalize as any).via;
                    if (finalizedPad) {
                        // record placed segments
                        placedSegmentsRef.current.push(...segmentsFinal.map(s => ({ uuid: s.uuid, start: { x: s.start[0], y: s.start[1] }, end: { x: s.end[0], y: s.end[1] }, width: s.width, layer: s.layer })));
                        // finalize: stop routing (pad case)
                        console.debug('[routing] finalizing: stopping routing (pad finalize enforced)');
                        stopRouting();
                        return;
                    }
                    if (finalizedVia) {
                        // continue routing from via
                        console.debug('[routing] connected to via — continuing routing from via');
                        const last = finalPoint;
                        setRoutingStart({ x: last.x, y: last.y });
                        setRoutingActive(true);
                        routingActiveRef.current = true;
                        // record placed segments
                        placedSegmentsRef.current.push(...segmentsFinal.map(s => ({ uuid: s.uuid, start: { x: s.start[0], y: s.start[1] }, end: { x: s.end[0], y: s.end[1] }, width: s.width, layer: s.layer })));
                        // request an updated preview using the new start
                        if (workerRef.current) {
                            const res = buildWorkerObstacles(currentLayer, pcb, placedSegmentsRef) as any;
                            const obstacles = res.obstacles;
                            const padZones = res.padZones;
                            workerRequestIdRef.current += 1;
                            workerRef.current.postMessage({ type: 'route', id: workerRequestIdRef.current, start: { x: last.x, y: last.y }, goal: worldPos, params: routerParams, obstacles, padZones });
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
                if (!segmentsAreFree(segments, routerParams.clearance, findBlockingObstacleLocal, currentTraceLayer, selectedLayerId, pcb, placedSegmentsRef)) {
                    console.warn("Routing placement blocked due to collision with existing geometry.");
                    // keep routing active so user can try a different endpoint
                    try { workerRequestIdRef.current += 1; } catch (err) {}
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
                    const via = findViaAtPoint(endPt, pcb);
                    if (via) {
                        const nextLayer = currentLayer === "F.Cu" ? "B.Cu" : "F.Cu";
                        console.log('[routing] via encountered (commit branch)', { viaUuid: (via as any).uuid ?? null, at: (via as any).at ?? null, currentLayer, nextLayer });
                        currentLayer = nextLayer;
                    }
                }
                try { setCurrentTraceLayer?.(currentLayer); } catch (err) { /* ignore if absent */ }
                // Continue routing from the last placed point (continuous routing)
                const last = previewTracks[previewTracks.length - 1];
                // If the last placed endpoint lies on a pad, stop routing
                // and require the user to click to start a new session.
                // Only stop routing if the last endpoint actually finalizes
                // to a pad for the current routing layer.
                const padFinalizeCheck = tryFinalizeAtCursor(last, previewTracks.length > 1 ? previewTracks[previewTracks.length - 2] : undefined, pcb, padHoverApi, viaHoverApi, currentLayer as any);
                if (padFinalizeCheck && padFinalizeCheck.connected && ((padFinalizeCheck as any).padHit || (padFinalizeCheck as any).pad)) {
                    placedSegmentsRef.current = [];
                    routingActiveRef.current = false;
                    setRoutingStart(null);
                    setRoutingActive(false);
                    setPreviewTracks([]);
                    return;
                }
                setRoutingStart({ x: last.x, y: last.y });
                // keep routingActive true so next click continues
                setRoutingActive(true);
                routingActiveRef.current = true;

                // Record placed segments locally so subsequent worker calls
                // include them immediately as obstacles (no need to wait for
                // `pcb` state to propagate).
                placedSegmentsRef.current.push(...segments.map(s => ({ uuid: s.uuid, start: { x: s.start[0], y: s.start[1] }, end: { x: s.end[0], y: s.end[1] }, width: s.width, layer: s.layer })));

                // Immediately request an updated preview from the worker using
                // the newly placed endpoint as start and the current mouse
                // position as goal. Include PCB tracks and locally placed
                // segments as obstacles so the worker has an up-to-date
                // collision set.
                    if (workerRef.current) {
                        const workerLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                        const res = buildWorkerObstacles(workerLayer, pcb, placedSegmentsRef) as any;
                        const obstacles = res.obstacles;
                        const padZones = res.padZones;
                        workerRequestIdRef.current += 1;
                        workerRef.current.postMessage({ type: 'route', id: workerRequestIdRef.current, start: { x: last.x, y: last.y }, goal: worldPos, params: routerParams, obstacles, padZones });
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
                        segments.push({ start: [a.x, a.y], end: [b.x, b.y], width: routerParams.trackWidth, layer: currentLayer, net: 0, uuid: makeUuid('seg') });
                        const via = findViaAtPoint({ x: b.x, y: b.y } as Pt, pcb);
                        if (via) {
                            const nextLayer = currentLayer === 'F.Cu' ? 'B.Cu' : 'F.Cu';
                            console.log('[routing] via encountered (minimal candidate build)', { viaUuid: (via as any).uuid ?? null, at: (via as any).at ?? null, currentLayer, nextLayer });
                            currentLayer = nextLayer;
                        }
                    }
                    // Prevent committing segments that collide with existing
                    // tracks or segments placed this session.
                    if (!segmentsAreFree(segments, routerParams.clearance, findBlockingObstacleLocal, currentTraceLayer, selectedLayerId, pcb, placedSegmentsRef)) {
                        console.warn("Routing placement blocked due to collision with existing geometry.");
                        try { workerRequestIdRef.current += 1; } catch (err) {}
                        setPreviewTracks([]);
                        return;
                    }
                    // Before continuing, check if the last endpoint is a pad —
                    // if so, finalize to pad and stop continuous routing.
                    const last = candidate[candidate.length - 1];
                    const prev = candidate.length > 1 ? candidate[candidate.length - 2] : null;
                    const candidateLayer = (currentTraceLayer as string) || (selectedLayerId as string) || 'F.Cu';
                    const finalizeCandidate = tryFinalizeAtCursor(last, prev ?? undefined, pcb, padHoverApi, viaHoverApi, candidateLayer as any);
                    if (finalizeCandidate.connected) {
                        console.debug('[routing] finalize detected (minimal candidate branch)', { finalizeCandidate });
                        const padNet = finalizeCandidate.net ?? null;
                        let snapped = resolveCanonicalCenter(finalizeCandidate) ?? (finalizeCandidate.point as Pt);
                        // Prefer canonical pad center if the finalize target is a pad
                        // (or if a pad exists under the click/finalize point). Also
                        // propagate the pad metadata so downstream logic stops routing.
                            try {
                                try {
                                    const center = resolveCanonicalCenter(finalizeCandidate);
                                    if (center) snapped = center;
                                    else {
                                        const clickFinalize = tryFinalizeAtCursor(last, prev ?? undefined, pcb, padHoverApi, viaHoverApi, candidateLayer as any);
                                        const clickCenter = resolveCanonicalCenter(clickFinalize);
                                        if (clickCenter) {
                                            snapped = clickCenter;
                                            (finalizeCandidate as any).padHit = (clickFinalize as any).padHit ?? (clickFinalize as any).pad ?? (finalizeCandidate as any).padHit;
                                        }
                                    }
                                } catch (err) {
                                    // ignore and use finalizeCandidate.point
                                }
                            } catch (err) {
                                // ignore and use finalizeCandidate.point
                            }
                        candidate[candidate.length - 1] = snapped;
                        const segmentsFinal: any[] = [];
                        let currentLayer = (currentTraceLayer as string) || (selectedLayerId as string) || 'F.Cu';
                        for (let i = 0; i < candidate.length - 1; i++) {
                            const a = candidate[i];
                            const b = candidate[i + 1];
                            segmentsFinal.push({ start: [a.x, a.y], end: [b.x, b.y], width: routerParams.trackWidth, layer: currentLayer, net: padNet ?? 0, uuid: makeUuid('seg') });
                            const via = findViaAtPoint({ x: b.x, y: b.y } as Pt, pcb);
                            if (via) {
                                const nextLayer = currentLayer === 'F.Cu' ? 'B.Cu' : 'F.Cu';
                                console.log('[routing] via encountered (minimal finalize branch)', { viaUuid: (via as any).uuid ?? null, at: (via as any).at ?? null, currentLayer, nextLayer });
                                currentLayer = nextLayer;
                            }
                        }
                        if (!segmentsAreFree(segmentsFinal, routerParams.clearance, findBlockingObstacleLocal, currentTraceLayer, selectedLayerId, pcb, placedSegmentsRef)) {
                            console.warn('Routing placement blocked due to collision with existing geometry.');
                            try { workerRequestIdRef.current += 1; } catch (err) {}
                            setPreviewTracks([]);
                            return;
                        }
                        for (const s of segmentsFinal) {
                            console.log('[routing] committing segment (minimal finalize)', { layer: s.layer, start: s.start, end: s.end });
                            addTrack?.({ kind: 'segment', data: s } as any);
                        }
                        try { setCurrentTraceLayer?.(currentLayer); } catch (err) {}
                        placedSegmentsRef.current.push(...segmentsFinal.map(s => ({ uuid: s.uuid, start: { x: s.start[0], y: s.start[1] }, end: { x: s.end[0], y: s.end[1] }, width: s.width, layer: s.layer })));
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
                                const res = buildWorkerObstacles(currentLayer, pcb, placedSegmentsRef) as any;
                                const obstacles = res.obstacles;
                                const padZones = res.padZones;
                                workerRequestIdRef.current += 1;
                                workerRef.current.postMessage({ type: 'route', id: workerRequestIdRef.current, start: { x: snappedPt.x, y: snappedPt.y }, goal: worldPos, params: routerParams, obstacles, padZones });
                            }
                            setPreviewTracks([]);
                            return;
                        }

                        console.debug('[routing] finalizing: stopping routing (minimal candidate branch)');
                        stopRouting();
                        return;
                    }

                    // otherwise commit and continue routing
                    for (const s of segments) addTrack?.({ kind: 'segment', data: s } as any);
                    // record placed segments so worker avoids them right away
                    placedSegmentsRef.current.push(...segments.map(s => ({ uuid: s.uuid, start: { x: s.start[0], y: s.start[1] }, end: { x: s.end[0], y: s.end[1] }, width: s.width, layer: s.layer })));
                    // If the last endpoint lies on a pad, stop routing and
                    // require an explicit click to start a new session.
                    const padFinalizeCheck = tryFinalizeAtCursor(last, prev ?? undefined, pcb, padHoverApi, viaHoverApi, candidateLayer as any);
                    if (padFinalizeCheck && padFinalizeCheck.connected && ((padFinalizeCheck as any).padHit || (padFinalizeCheck as any).pad)) {
                        stopRouting();
                        return;
                    }
                    setRoutingStart({ x: last.x, y: last.y });
                    // trigger worker to update preview for continued routing
                    if (workerRef.current) {
                        const workerLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                        const res = buildWorkerObstacles(workerLayer, pcb, placedSegmentsRef) as any;
                        const obstacles = res.obstacles;
                        const padZones = res.padZones;
                        workerRequestIdRef.current += 1;
                        workerRef.current.postMessage({ type: 'route', id: workerRequestIdRef.current, start: { x: last.x, y: last.y }, goal: worldPos, params: routerParams, obstacles, padZones });
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
            const snap = findNearestEndpoint(worldPos, pcb, placedSegmentsRef);
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
                // mark preview compatibility with pads for the current routing layer
                try {
                    const workerLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                    const last = localCandidate.length ? localCandidate[localCandidate.length - 1] : null;
                    // Check finalize at both the preview endpoint and the actual
                    // mouse cursor. If either would finalize (connected), snap
                    // the preview to the finalize point so the preview shows
                    // the wire as connectable while the pointer is inside the
                    // pad area.
                    let finalizedPoint: Pt | null = null;
                    let incompatible = false;
                    // Determine a consistent "previous" point for finalize
                    // checks: when we have a preview, use its penultimate
                    // vertex (matches the click/finalize logic). Otherwise
                    // fall back to the routing start.
                    const prevPreview = (localCandidate.length > 1) ? localCandidate[localCandidate.length - 2] : routingStart ?? undefined;
                    let finalizeLast: any = undefined;
                    if (last) {
                        finalizeLast = tryFinalizeAtCursor(last, prevPreview ?? undefined, pcb, padHoverApi, viaHoverApi, workerLayer as any);
                        if (finalizeLast && finalizeLast.connected) finalizedPoint = resolveCanonicalCenter(finalizeLast) ?? (finalizeLast.point as Pt);
                        if (finalizeLast && finalizeLast.incompatible && !finalizeLast.connected) incompatible = true;
                    }
                    // prefer cursor-based finalize when connected (user expectation)
                    let finalizeCursor: any = undefined;
                    finalizeCursor = tryFinalizeAtCursor(worldPos, prevPreview ?? undefined, pcb, padHoverApi, viaHoverApi, workerLayer as any);
                    if (finalizeCursor && finalizeCursor.connected) {
                        finalizedPoint = resolveCanonicalCenter(finalizeCursor) ?? (finalizeCursor.point as Pt);
                        incompatible = false;
                    } else if (finalizeCursor && finalizeCursor.incompatible && !finalizeCursor.connected) {
                        // only mark incompatible if neither last nor cursor connected
                        incompatible = incompatible || true;
                    }

                    // If we determined a finalized point, snap the preview's
                    // last vertex to that point so it visually shows a
                    // connectable preview. Also prefer the finalized point
                    // as the worker goal so the worker computes a path that
                    // actually reaches the pad centre instead of the raw
                    // cursor position.
                    if (finalizedPoint && localCandidate.length) {
                        // Prefer pad center when available so preview snaps
                        // consistently to the true pad centre while hovering
                        // inside the pad area.
                        try {
                            // Prefer pad info reported by finalize checks (cursor or
                            // preview finalize). Check both the newer `padHit`
                            // metadata and the legacy `pad` shape for compatibility.
                            // This guarantees the pad accepts the current routing
                            // layer. Fall back to re-checking the cursor position
                            // with `tryFinalizeAtCursor`.
                            let padInfo: any = null;
                            if (finalizeCursor && finalizeCursor.connected) {
                                padInfo = (finalizeCursor as any).padHit ?? (finalizeCursor as any).pad ?? null;
                            } else if (typeof finalizeLast !== 'undefined' && finalizeLast && finalizeLast.connected) {
                                padInfo = (finalizeLast as any).padHit ?? (finalizeLast as any).pad ?? null;
                            } else {
                                const recheck = tryFinalizeAtCursor(worldPos, prevPreview ?? undefined, pcb, padHoverApi, viaHoverApi, workerLayer as any);
                                if (recheck && recheck.connected) padInfo = (recheck as any).padHit ?? (recheck as any).pad ?? null;
                            }
                            if (padInfo) {
                                const center = resolveCanonicalCenter(padInfo);
                                if (center) localCandidate[localCandidate.length - 1] = center;
                                else localCandidate[localCandidate.length - 1] = finalizedPoint;
                            } else {
                                localCandidate[localCandidate.length - 1] = finalizedPoint;
                            }
                        } catch (err) {
                            localCandidate[localCandidate.length - 1] = finalizedPoint;
                        }
                    }
                    setPreviewTracks(localCandidate);
                    try { setPreviewIncompatibleWithPad?.(!!incompatible); } catch (e) {}
                } catch (err) {
                    try { setPreviewIncompatibleWithPad?.(false); } catch (e) {}
                    setPreviewTracks(localCandidate);
                }
            } catch (err) {
                // fall back silently if anything goes wrong
            }
            // Build simple linear obstacles from existing PCB tracks and any
            // segments placed this session so the worker can avoid routing
            // through them. Only send obstacles for the active routing layer
            // so the worker allows crossings on other copper layers.
                    const workerLayer = (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
                    const res = buildWorkerObstacles(workerLayer, pcb, placedSegmentsRef) as any;
                    const obstacles = res.obstacles;
                    const padZones = res.padZones;

                    // Prefer sending the canonical pad centre as the worker goal
                    // when we detect a finalize target at the cursor. Re-run a
                    // quick finalize check using the routing start as the
                    // 'from' point so that the worker receives a precise pad
                    // centre as the goal. Fall back to the raw cursor world
                    // position when no finalize target is detected.
                    let workerGoal = worldPos;
                    try {
                        const recheck = tryFinalizeAtCursor(worldPos, routingStart ?? undefined, pcb, padHoverApi, viaHoverApi, workerLayer as any);
                        if (recheck && recheck.connected) {
                            const center = resolveCanonicalCenter(recheck) ?? (recheck.point as Pt);
                            if (center) workerGoal = center;
                        }
                    } catch (err) {
                        // ignore and use worldPos
                    }

                    if (workerRef.current) {
                        workerRequestIdRef.current += 1;
                        workerRef.current.postMessage({
                            type: "route",
                            id: workerRequestIdRef.current,
                            start: routingStart,
                            goal: workerGoal,
                            params: routerParams,
                            obstacles,
                            padZones,
                        });
                    }
        }
    };

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleCanvasContextMenu,
    };
};