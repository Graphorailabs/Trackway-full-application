/**
 * Collision utilities
 *
 * Pure geometric helpers used by the routing logic to detect line/segment
 * intersections, compute distances and identify blocking obstacles.
 */
import type { Pt } from "../routing/octilinearRouter";
import { ENABLE_ENDPOINT_SNAP, ENDPOINT_SNAP_TOLERANCE, PAD_SNAP_RADIUS } from "@/features/pcb_editor/constants";

/**
 * segsIntersectLocal
 *
 * Return true when segments (a1-a2) and (b1-b2) intersect or touch.
 */
export const segsIntersectLocal = (a1: Pt, a2: Pt, b1: Pt, b2: Pt) => {
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

/**
 * pointSegmentDistLocal
 *
 * Distance from point `px` to the segment defined by `a`-`b`.
 */
export const pointSegmentDistLocal = (px: Pt, a: Pt, b: Pt) => {
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

/**
 * segSegDistLocal
 *
 * Return the minimal distance between two segments (zero if they intersect).
 */
export const segSegDistLocal = (a1: Pt, a2: Pt, b1: Pt, b2: Pt) => {
    if (segsIntersectLocal(a1, a2, b1, b2)) return 0;
    const d1 = pointSegmentDistLocal(a1, b1, b2);
    const d2 = pointSegmentDistLocal(a2, b1, b2);
    const d3 = pointSegmentDistLocal(b1, a1, a2);
    const d4 = pointSegmentDistLocal(b2, a1, a2);
    return Math.min(d1, d2, d3, d4);
};

/**
 * findBlockingObstacleLocal
 *
 * Given a candidate segment (p1-p2) and sizing parameters, return the
 * first obstacle (from PCB or locally placed segments) that would block
 * placing the segment. The function respects layering and treats
 * endpoints near via centers as non-blocking to allow via passage.
 *
 * @returns `{ obstacle, dist, thresh }` or `null`
 */
export const findBlockingObstacleLocal = (
    p1: Pt,
    p2: Pt,
    trackWidth: number,
    clearance: number,
    layer: string | undefined,
    pcb: any,
    placedSegmentsRef: React.MutableRefObject<Array<{ start: Pt; end: Pt; width: number; layer?: string }>>
) => {
    // Build obstacles from PCB tracks (segments). However, if there are
    // via centers at some segment endpoints, those segment endpoints
    // should not block routing through the via — treat them as non-
    // blocking so vias act as gateways between layers.
    const viaCenters: Pt[] = (pcb.tracks || []).filter((t: any) => t.kind === 'via').map((t: any) => {
        const v = t.data as any;
        const at = v.at ?? [0,0];
        return { x: Number(at[0]) || 0, y: Number(at[1]) || 0 } as Pt;
    });
    // Also treat pad geometry as a collision-free zone. Build simple
    // pad shapes (circle or rect) expanded by the same visual highlight
    // margin used in the renderer so collisions inside the pad outline
    // are ignored.
    type PadShape =
        | { kind: 'circle'; cx: number; cy: number; r: number }
        | { kind: 'rect'; minX: number; maxX: number; minY: number; maxY: number };
    const padShapes: PadShape[] = [];
    try {
        const padAcceptsLayer = (pad: any, wantLayer: string | undefined) => {
            if (!wantLayer) return true;
            const want = String(wantLayer || '').trim();
            const raw = pad.layers ?? pad.layer ?? pad.data?.layers ?? pad.data?.layer ?? null;
            if (!raw) return false;
            const entries = Array.isArray(raw) ? raw : [raw];
            for (const e of entries) {
                if (e === null || e === undefined) continue;
                const s = String(e).trim();
                if (!s) continue;
                const esc = s.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\\\*/g, '.*');
                try {
                    const re = new RegExp('^' + esc + '$', 'i');
                    if (re.test(want)) return true;
                } catch (err) {
                    if (s.toLowerCase() === want.toLowerCase()) return true;
                }
                if (s.toLowerCase() === want.toLowerCase()) return true;
            }
            return false;
        };
        for (const fp of (pcb.footprints || [])) {
            const at = fp.at ?? { x: 0, y: 0, angle: 0 };
            const angle = at.angle ?? 0;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const pads = (fp.pads ?? []) as any[];
            for (const p of pads) {
                // Only consider pad shapes that accept the current routing layer
                if (!padAcceptsLayer(p, layer)) continue;
                const pat = p.at ?? { x: 0, y: 0 };
                const localX = Number(pat.x) || 0;
                const localY = Number(pat.y) || 0;
                const gx = at.x + (localX * c - localY * s);
                const gy = at.y + (localX * s + localY * c);
                const sizeArr = p.size ?? [1, 1];
                const w = Number(sizeArr[0]) || 1;
                const h = Number(sizeArr[1]) || w;
                const shape = (p.shape ?? 'rect') as string;
                // Build a collision-free pad zone. Use a margin based on the
                // snap radius plus an extra buffer and include clearance and
                // half the track width so routing that occurs inside this
                // zone is treated as non-blocking. This ensures small pads
                // and wide tracks can attach without false-positive blocks.
                const baseMargin = (typeof PAD_SNAP_RADIUS === 'number' ? PAD_SNAP_RADIUS : 0.2) + 0.5;
                const marginTotal = baseMargin + clearance + (trackWidth / 2 || 0);
                if (shape === 'circle' || shape === 'round') {
                    const r = Math.max(w, h) / 2 + marginTotal;
                    padShapes.push({ kind: 'circle', cx: gx, cy: gy, r });
                } else {
                    // Approximate rectangular pads conservatively as circles
                    // using half-diagonal plus the total margin so rotated
                    // pads are covered reliably.
                    const halfW = w / 2;
                    const halfH = h / 2;
                    const r = Math.hypot(halfW, halfH) + marginTotal;
                    padShapes.push({ kind: 'circle', cx: gx, cy: gy, r });
                }
            }
        }
    } catch (err) {
        // ignore malformed footprints
    }
    const viaTol = ENABLE_ENDPOINT_SNAP ? ENDPOINT_SNAP_TOLERANCE : 1e-6;
    // pad collision-free radius (pad snap radius + small margin)
    const padZoneRadius = (typeof PAD_SNAP_RADIUS === 'number' ? PAD_SNAP_RADIUS : 0.2) + 0.05;
    const isNearVia = (pt: Pt) => viaCenters.some(vc => Math.hypot(vc.x - pt.x, vc.y - pt.y) <= viaTol + 1e-9);

    const pointInRect = (pt: Pt, r: { minX: number; maxX: number; minY: number; maxY: number }) => (
        pt.x >= r.minX - 1e-9 && pt.x <= r.maxX + 1e-9 && pt.y >= r.minY - 1e-9 && pt.y <= r.maxY + 1e-9
    );

    const pointInPadShape = (pt: Pt, shape: PadShape) => {
        if (shape.kind === 'circle') return Math.hypot(pt.x - shape.cx, pt.y - shape.cy) <= shape.r + 1e-9;
        return pointInRect(pt, shape);
    };

    const segIntersectsRect = (a: Pt, b: Pt, rect: { minX: number; maxX: number; minY: number; maxY: number }) => {
        // If either endpoint inside rect => intersects
        if (pointInRect(a, rect) || pointInRect(b, rect)) return true;
        // Check intersection against rectangle edges
        const edges: Array<[Pt, Pt]> = [
            [{ x: rect.minX, y: rect.minY }, { x: rect.maxX, y: rect.minY }],
            [{ x: rect.maxX, y: rect.minY }, { x: rect.maxX, y: rect.maxY }],
            [{ x: rect.maxX, y: rect.maxY }, { x: rect.minX, y: rect.maxY }],
            [{ x: rect.minX, y: rect.maxY }, { x: rect.minX, y: rect.minY }],
        ];
        for (const [e1, e2] of edges) if (segsIntersectLocal(a, b, e1, e2)) return true;
        return false;
    };

    const segmentPassesThroughPad = (shape: PadShape, a: Pt, b: Pt) => {
        if (shape.kind === 'circle') return pointSegmentDistLocal({ x: shape.cx, y: shape.cy }, a, b) <= shape.r + 1e-9;
        return segIntersectsRect(a, b, { minX: shape.minX, maxX: shape.maxX, minY: shape.minY, maxY: shape.maxY });
    };

    const findNearestPadCenter = (pt: Pt) => {
        for (const sh of padShapes) {
            if (sh.kind === 'circle') {
                if (pointInPadShape(pt, sh)) return { x: sh.cx, y: sh.cy } as Pt;
            } else {
                if (pointInPadShape(pt, sh)) return { x: (sh.minX + sh.maxX) / 2, y: (sh.minY + sh.maxY) / 2 } as Pt;
            }
        }
        return null;
    };
    // Build PCB obstacles from segments. Do not wholesale filter-out
    // obstacles whose endpoints sit on pads or vias here — doing so
    // allowed entire segments to disappear as blockers (bug: crossings
    // outside pad areas became permitted). Pad/via exceptions are handled
    // more precisely below where we can determine whether the intersection
    // occurs inside the pad zone or at a shared pad/via center.
    const pcbObstacles = (pcb.tracks || [])
        .filter((t: any) => t.kind === 'segment')
        .map((t: any) => ({ start: { x: t.data.start[0], y: t.data.start[1] }, end: { x: t.data.end[0], y: t.data.end[1] }, width: t.data.width ?? 0.25, layer: (t.data.layer as string) || undefined }));
    const placedFiltered = (placedSegmentsRef.current || []).map(o => ({ start: o.start, end: o.end, width: o.width, layer: o.layer }));

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
        const thresh = (o.width / 2) + clearance + (trackWidth / 2);
        const dist = segSegDistLocal(p1, p2, o.start, o.end);
        // If both the candidate segment and the obstacle pass through the
        // same pad collision-free zone, treat as non-blocking so multiple
        // tracks can attach/intersect within the pad area.
        try {
            let passesSamePad = false;
            for (const sh of padShapes) {
                const candIn = segmentPassesThroughPad(sh, p1, p2);
                const obsIn = segmentPassesThroughPad(sh, o.start, o.end);
                if (candIn && obsIn) {
                    passesSamePad = true;
                    break;
                }
            }
            if (passesSamePad) continue;
        } catch (err) {
            // ignore and continue with normal blocking checks
        }
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
            // Allow both segments to attach to the same pad: if both the
            // candidate segment and the obstacle have endpoints near the
            // same pad center, treat as non-blocking. This enables multiple
            // tracks to connect to the same pad without collision errors.
            try {
                const candPad = findNearestPadCenter(p1) || findNearestPadCenter(p2);
                const obsPad = findNearestPadCenter(o.start) || findNearestPadCenter(o.end);
                if (candPad && obsPad && Math.abs(candPad.x - obsPad.x) <= (viaTol + 1e-9) && Math.abs(candPad.y - obsPad.y) <= (viaTol + 1e-9)) {
                    // Both attach to the same pad center — not a blocker
                    continue;
                }
            } catch (err) {
                // ignore pad-match failures and proceed to treat as blocker
            }
            // Diagnostics: include candidate endpoints, obstacle endpoints,
            // pad-zone radius and nearest pad centers so callers can debug
            // why this segment was considered blocking.
            try {
                const candPad = findNearestPadCenter(p1) || findNearestPadCenter(p2);
                const obsPad = findNearestPadCenter(o.start) || findNearestPadCenter(o.end);
                console.log('[routing] blocking obstacle detected', {
                    obstacle: o,
                    segment: { start: p1, end: p2 },
                    dist,
                    thresh,
                    layer,
                    nearViaStart: isNearVia(o.start),
                    nearViaEnd: isNearVia(o.end),
                    padZoneRadius,
                    candidateNearestPad: candPad,
                    obstacleNearestPad: obsPad,
                    candidatePointInsidePadZone: !!candPad,
                    obstaclePointInsidePadZone: !!obsPad,
                });
            } catch (err) {
                console.log('[routing] blocking obstacle detected (no extra diagnostics)', { obstacle: o, dist, thresh, layer });
            }
            return { obstacle: o, dist, thresh };
        }
    }
    return null;
};

/**
 * segmentsAreFree
 *
 * Check a set of candidate segments for collisions using the provided
 * `findBlockingObstacleLocal` predicate. Returns `true` when all segments
 * are placeable.
 */
export const segmentsAreFree = (
    segments: Array<{ start: [number, number]; end: [number, number]; width: number; layer?: string }>,
    clearance: number,
    findBlockingObstacleLocal: (p1: Pt, p2: Pt, trackWidth: number, clearance: number, layer: string | undefined, pcb: any, placedSegmentsRef: React.MutableRefObject<Array<{ start: Pt; end: Pt; width: number; layer?: string }>>) => any,
    currentTraceLayer: string | undefined,
    selectedLayerId: string | undefined,
    pcb: any,
    placedSegmentsRef: React.MutableRefObject<Array<{ start: Pt; end: Pt; width: number; layer?: string }>>
) => {
    for (const s of segments) {
        const p1: Pt = { x: s.start[0], y: s.start[1] };
        const p2: Pt = { x: s.end[0], y: s.end[1] };
        const segLayer = (s.layer as string) || (currentTraceLayer as string) || (selectedLayerId as string) || "F.Cu";
        const blocker = findBlockingObstacleLocal(p1, p2, s.width, clearance, segLayer, pcb, placedSegmentsRef);
        if (blocker) {
            console.warn("Routing placement blocked — segment would hit obstacle:", { segment: s, obstacle: blocker.obstacle, dist: blocker.dist, thresh: blocker.thresh, layer: segLayer });
            return false;
        }
    }
    return true;
};