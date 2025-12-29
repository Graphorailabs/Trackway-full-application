/**
 * Pad & Via helpers
 *
 * This module contains small, pure helpers used by the canvas and routing
 * logic to detect pads, vias and nearby endpoints. Functions here are
 * intentionally small and rely only on `pcb` model data and simple
 * geometric calculations so they are easy to unit test.
 */
import type { Pt } from "../routing/octilinearRouter";
import { PAD_SNAP_RADIUS } from "@/features/pcb_editor/constants";
import { ENABLE_ENDPOINT_SNAP, ENDPOINT_SNAP_TOLERANCE } from "@/features/pcb_editor/constants";

/**
 * findViaUnderCursor
 *
 * Return the via (and its center point) under the given world coordinate
 * if one exists within the snap radius.
 *
 * @param cursorWorld - world-space point to test
 * @param pcb - PCB model (tracks, footprints, etc.)
 * @returns `{ uuid, point, via }` or `null` when none found
 */
export const findViaUnderCursor = (cursorWorld: Pt, pcb: any) => {
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

/**
 * findNearestEndpoint
 *
 * When endpoint snapping is enabled, search for a nearby endpoint (segment
 * endpoint, via center or pad center) and return it if within tolerance.
 * Used by routing to snap clicks to existing endpoints.
 *
 * @param pt - point to search near
 * @param pcb - PCB model
 * @param placedSegmentsRef - locally placed segments in the current routing session
 * @returns nearest endpoint `Pt` or `null`
 */
export const findNearestEndpoint = (pt: Pt, pcb: any, placedSegmentsRef: React.MutableRefObject<Array<{ uuid?: string; start: Pt; end: Pt; width: number; layer?: string }>>) => {
    if (!ENABLE_ENDPOINT_SNAP) return null;
    const eps = 1e-6;
    const endpoints: Pt[] = [];
    for (const t of (pcb.tracks || []).filter((x: any) => x.kind === 'segment')) {
        const seg = (t as any).data;
        endpoints.push({ x: seg.start[0], y: seg.start[1] });
        endpoints.push({ x: seg.end[0], y: seg.end[1] });
    }
    for (const s of placedSegmentsRef.current) {
        endpoints.push(s.start);
        endpoints.push(s.end);
    }
    // Include via centers as magnet endpoints
    for (const v of (pcb.tracks || []).filter((x: any) => x.kind === 'via')) {
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
    if (bestD <= ENDPOINT_SNAP_TOLERANCE) return best;
    return null;
};

/**
 * findViaAtPoint
 *
 * Return a via that is located at `pt` within a small tolerance. This is a
 * strict center-match helper used by routing finalize/continuation logic.
 */
export const findViaAtPoint = (pt: Pt, pcb: any) => {
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

/**
 * findPadUnderCursor
 *
 * Return a pad (fpUuid + padIndex) whose center is within SNAP_RADIUS of
 * the provided world coordinate. This is a fast bbox-based test and is
 * suitable for pad highlight / magnet behaviors.
 */
export const findPadUnderCursor = (cursorWorld: Pt, pcb: any) => {
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

/**
 * tryFinalizeAtCursor
 *
 * Used by the routing flow to determine whether the current click should
 * finalize a route to a pad or via. Returns an object describing whether
 * a connection was made and the snapped point/net.
 *
 * @param cursorWorld - current world-space click/position
 * @param fromPt - optional originating point used to prefer perimeter snap
 * @param pcb - PCB model
 * @param _padHoverApi - pad hover context (may contain authoritative hovered pad)
 * @param viaHoverApi - via hover context (may contain authoritative hovered via)
 */
export const tryFinalizeAtCursor = (cursorWorld: Pt, fromPt: Pt | undefined, pcb: any, _padHoverApi: any, viaHoverApi: any, currentLayer?: string) => {
    const SNAP_RADIUS = PAD_SNAP_RADIUS;
    // If the via hover provider indicates a hovered via, prefer that
    // as the finalization target — the UI highlight should be
    // authoritative for snapping behavior.
    try {
        const vh = viaHoverApi?.hovered;
        if (vh && vh.uuid) {
            const tv = (pcb.tracks || []).find((t: any) => t.kind === 'via' && ((t.data as any)?.uuid === vh.uuid));
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
    /* helper: determine whether a pad accepts connections on a given layer */
    const padAcceptsLayer = (pad: any, layer: string | undefined) => {
        if (!layer) return true;
        const want = String(layer || '').trim();
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
        for (let i = 0; i < pads.length; i++) {
            const p = pads[i];
            const pat = p.at ?? { x: 0, y: 0 };
            const localX = Number(pat.x) || 0;
            const localY = Number(pat.y) || 0;
            const gx = at.x + (localX * c - localY * s);
            const gy = at.y + (localX * s + localY * c);
            const dx = cursorWorld.x - gx;
            const dy = cursorWorld.y - gy;
            const sizeArr = p.size ?? [1, 1];
            const w = Number(sizeArr[0]) || 1;
            const h = Number(sizeArr[1]) || w;
            // consider pad geometry: allow clicks anywhere within the pad copper
            // area (pad radius/half-size) plus the snap radius
            const radius = Math.max(w, h) / 2 + SNAP_RADIUS;
            const dist = Math.hypot(dx, dy);
            if (dist <= radius) {
                const pad = p;
                const padNet = (pad.net ?? pad.net_name) ?? null;
                const padHit = { fpUuid: fp.uuid, padIndex: i, point: { x: gx, y: gy } };
                if (currentLayer && !padAcceptsLayer(pad, currentLayer)) {
                    return { connected: false, pad, padHit, point: { x: gx, y: gy }, net: padNet, incompatible: true } as any;
                }
                return { connected: true, pad, padHit, point: { x: gx, y: gy }, net: padNet } as any;
            }
        }
    }

    // gather candidate pads from placed footprints for perimeter snapping
    const candidates: Array<{ pad: any; fp: any; index: number }> = [];
    for (const fp of (pcb.footprints || [])) {
        const at = fp.at ?? { x: 0, y: 0, angle: 0 };
        const angle = at.angle ?? 0;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const pads = (fp.pads ?? []) as any[];
        for (let i = 0; i < pads.length; i++) {
            const p = pads[i];
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
            candidates.push({ pad: p, fp, index: i });
        }
    }

    let bestPad: any = null;
    let bestPoint: Pt | null = null;
    let bestDist = Infinity;

    const ptDist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

    for (const { pad, fp, index } of candidates) {
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
        let insidePad = false;
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
                    // cursor is inside the pad area
                    insidePad = true;
                    snap = { x: center.x, y: center.y };
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
                    // mark as inside pad and prefer center as initial snap
                    insidePad = true;
                    snap = { x: center.x, y: center.y };
                }
            }
        }

        if (!snap) continue;
        // If cursor is inside the pad copper, treat as zero-distance so
        // the pad is always considered a candidate regardless of pad size.
        const candidateDist = insidePad ? 0 : ptDist(cursorWorld, snap);
        if (candidateDist <= SNAP_RADIUS && candidateDist < bestDist) {
            bestDist = candidateDist;
            bestPad = { pad, fp, index };
            bestPoint = snap;
        }
    }

    if (!bestPad || !bestPoint) return { connected: false };

    // If the cursor is actually inside the pad copper area, prefer the
    // canonical pad center (virtual magnet point) so clicks inside the
    // pad always snap to the pad center and terminate routing. This
    // avoids returning a perimeter/interior point that would continue
    // routing instead of attaching to the pad center.
    try {
        const pad = bestPad.pad;
        const fp = bestPad.fp;
        const at = fp.at ?? { x: 0, y: 0, angle: 0 };
        const angle = at.angle ?? 0;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const pat = pad.at ?? { x: 0, y: 0 };
        const localX = Number(pat.x) || 0;
        const localY = Number(pat.y) || 0;
        const center: Pt = { x: at.x + (localX * c - localY * s), y: at.y + (localX * s + localY * c) };
        const sizeArr = pad.size ?? [1, 1];
        const w = Number(sizeArr[0]) || 1;
        const h = Number(sizeArr[1]) || w;
        // axis-aligned bbox test in world coords (conservative)
        const insideRect = (cursorWorld.x >= center.x - w / 2 && cursorWorld.x <= center.x + w / 2 && cursorWorld.y >= center.y - h / 2 && cursorWorld.y <= center.y + h / 2);
        // circle-based inside test (covers round pads)
        const insideCircle = Math.hypot(cursorWorld.x - center.x, cursorWorld.y - center.y) <= Math.max(w, h) / 2;
        if (insideRect || insideCircle) {
            bestPoint = center;
        }
    } catch (err) {
        // ignore and return computed bestPoint
    }

    // Determine resulting net
    const pad = bestPad.pad;
    const padNet = (pad.net ?? pad.net_name) ?? null;
    const resultantNet = padNet; // policy: adopt pad net if present

    return { connected: true, pad, padHit: { fpUuid: bestPad.fp.uuid, padIndex: bestPad.index }, point: bestPoint, net: resultantNet } as any;
};

/**
 * findPadCenterUnderCursor
 *
 * Strict test: returns the canonical pad centre when the provided world
 * point lies inside the pad copper area (no additional snap margin).
 * This is useful for reliably snapping routing session starts to pad
 * centres even for very small pads.
 */
export const findPadCenterUnderCursor = (cursorWorld: Pt, pcb: any, currentLayer?: string, marginOverride?: number) => {
    const padAcceptsLayer = (pad: any, layer: string | undefined) => {
        if (!layer) return true;
        const want = String(layer || '').trim();
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
        for (let i = 0; i < pads.length; i++) {
            const p = pads[i];
            if (currentLayer && !padAcceptsLayer(p, currentLayer)) continue;
            const pat = p.at ?? { x: 0, y: 0 };
            const localX = Number(pat.x) || 0;
            const localY = Number(pat.y) || 0;
            const gx = at.x + (localX * c - localY * s);
            const gy = at.y + (localX * s + localY * c);
            const sizeArr = p.size ?? [1, 1];
            const w = Number(sizeArr[0]) || 1;
            const h = Number(sizeArr[1]) || w;
            const shape = (p.shape ?? 'rect') as string;
            // Add a small snap margin so clicks just outside tiny pads still
            // count as inside; this improves robustness for very small pads.
            const defaultMargin = (typeof PAD_SNAP_RADIUS === 'number' ? PAD_SNAP_RADIUS : 0.2);
            const margin = (typeof marginOverride === 'number') ? marginOverride : defaultMargin;
            if (shape === 'circle' || shape === 'round') {
                const r = Math.max(w, h) / 2;
                const d = Math.hypot(cursorWorld.x - gx, cursorWorld.y - gy);
                if (d <= r + margin) {
                    return { fpUuid: fp.uuid, padIndex: i, point: { x: gx, y: gy } };
                }
            } else {
                // axis-aligned bbox test in world coords (conservative)
                const insideRect = (cursorWorld.x >= gx - w / 2 - margin && cursorWorld.x <= gx + w / 2 + margin && cursorWorld.y >= gy - h / 2 - margin && cursorWorld.y <= gy + h / 2 + margin);
                if (insideRect) return { fpUuid: fp.uuid, padIndex: i, point: { x: gx, y: gy } };
            }
        }
    }
    return null;
};