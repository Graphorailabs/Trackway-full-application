/**
 * Routing service helpers
 *
 * Small helpers used by the routing worker integration. These functions
 * build the lightweight obstacle arrays the worker expects (filtering
 * out segments that end at via centers so vias remain pass-through).
 */
import type { Pt } from "../routing/octilinearRouter";
import type React from 'react';

type Segment = { start: Pt; end: Pt; width: number; layer?: string };
import { ENABLE_ENDPOINT_SNAP, ENDPOINT_SNAP_TOLERANCE, PAD_SNAP_RADIUS } from "@/features/pcb_editor/constants";

/**
 * buildWorkerObstacles
 *
 * Convert PCB tracks and locally-placed segments into the obstacle list
 * sent to the routing worker. If `layer` is provided, only obstacles on
 * that layer are returned.
 */
export const buildWorkerObstacles = (
    layer: string | undefined,
    pcb: any,
    placedSegmentsRef: React.MutableRefObject<Array<Segment>>
): { obstacles: Array<Segment>; padZones: Array<{ cx: number; cy: number; r: number }> } => {
    const viaCenters: Pt[] = (pcb.tracks || []).filter((t: any) => t.kind === 'via').map((t: any) => {
        const v = t.data as any;
        const at = v.at ?? [0, 0];
        return { x: Number(at[0]) || 0, y: Number(at[1]) || 0 } as Pt;
    });
    const viaTol = ENABLE_ENDPOINT_SNAP ? ENDPOINT_SNAP_TOLERANCE : 1e-6;
    const isNearVia = (pt: Pt) => viaCenters.some(vc => Math.hypot(vc.x - pt.x, vc.y - pt.y) <= viaTol + 1e-9);
    const pcbSegs: Array<Segment> = (pcb.tracks || [])
        .filter((t: any) => t.kind === 'segment')
        .map((t: any) => ({ start: { x: Number(t.data.start[0]) || 0, y: Number(t.data.start[1]) || 0 }, end: { x: Number(t.data.end[0]) || 0, y: Number(t.data.end[1]) || 0 }, width: Number(t.data.width) || 0.25, layer: (t.data.layer as string) || undefined }))
        .filter((o: Segment) => !isNearVia(o.start) && !isNearVia(o.end));

    const placedFiltered: Array<Segment> = (placedSegmentsRef.current || []).filter((o: Segment) => !isNearVia(o.start) && !isNearVia(o.end));

    // Build simple pad zones so the worker can allow crossings inside pads.
    // Only include pads that accept the requested routing layer — otherwise
    // the pad should not act as a non-collision zone for wires on other layers.
    const padZones: Array<{ cx: number; cy: number; r: number }> = [];
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
    try {
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
                // Skip pads that do not accept the requested layer — they should
                // not provide a pad-zone for routing on other copper layers.
                if (!padAcceptsLayer(p, layer)) continue;
                const gx = at.x + (localX * c - localY * s);
                const gy = at.y + (localX * s + localY * c);
                const sizeArr = p.size ?? [1, 1];
                const w = Number(sizeArr[0]) || 1;
                const h = Number(sizeArr[1]) || w;
                const shape = (p.shape ?? 'rect') as string;
                const margin = (typeof PAD_SNAP_RADIUS === 'number' ? PAD_SNAP_RADIUS : 0.2) + 0.5;
                if (shape === 'circle' || shape === 'round') {
                    const r = Math.max(w, h) / 2 + margin;
                    padZones.push({ cx: gx, cy: gy, r });
                } else {
                    const halfW = w / 2;
                    const halfH = h / 2;
                    const r = Math.hypot(halfW, halfH) + margin;
                    padZones.push({ cx: gx, cy: gy, r });
                }
            }
        }
    } catch (err) {
        // ignore malformed footprints
    }

    // If caller requested a specific layer, only return obstacles on that layer
    if (layer) {
        const pcbLayer = pcbSegs.filter((o: any) => (o as any).layer === layer);
        const placedLayer = placedFiltered.filter((o: any) => (o as any).layer === layer);
        // eslint-disable-next-line no-console
        console.log('[routing] buildWorkerObstacles()', { layer, pcbCount: pcbLayer.length, placedCount: placedLayer.length });
        return { obstacles: [...pcbLayer, ...placedLayer], padZones };
    }

    // no layer filtering requested: return all obstacles
    return { obstacles: [...pcbSegs, ...placedFiltered], padZones };
};