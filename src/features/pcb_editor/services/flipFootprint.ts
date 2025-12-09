
const mapLayer = (layer: any) => {
    if (layer === null || typeof layer === "undefined") return layer;
    if (typeof layer === "string") {
        if (layer.startsWith("F.")) return `B.${layer.slice(2)}`;
        if (layer.startsWith("B.")) return `F.${layer.slice(2)}`;
        return layer;
    }
    // object like { canonical_name: 'F.Cu', ... }
    if (typeof layer === "object" && layer.canonical_name && typeof layer.canonical_name === "string") {
        const cn = layer.canonical_name as string;
        const mapped = cn.startsWith("F.") ? `B.${cn.slice(2)}` : cn.startsWith("B.") ? `F.${cn.slice(2)}` : cn;
        return { ...layer, canonical_name: mapped };
    }
    return layer;
};

const mapLayersArray = (layers: any[] | undefined) => {
    if (!Array.isArray(layers)) return layers;
    return layers.map((l) => mapLayer(l));
};

const normalizeAngle = (deg: number) => {
    const next = ((360 - (deg || 0)) % 360 + 360) % 360;
    return next;
};

const clone = (v: any) => JSON.parse(JSON.stringify(v));

const coerceLayerName = (layer: any): string | undefined => {
    const mapped = mapLayer(layer);
    if (typeof mapped === "string") return mapped;
    if (mapped && typeof mapped === "object" && typeof mapped.canonical_name === "string") return mapped.canonical_name as string;
    return undefined;
};

// Flip a footprint instance: swap F<->B layers, mirror local Y positions,
// invert rotations so the footprint remains visually consistent on the
// opposite side. We keep the global `at.x`/`at.y` (placement) unchanged so
// the part stays at the same board XY; angle and local geometry are flipped.
export function flipFootprint(fp: any) {
    if (!fp) return fp;
    const next = clone(fp);

    const flippedLayer = coerceLayerName(next.layer);
    if (flippedLayer) next.layer = flippedLayer;

    // Invert the instance rotation (degrees -> degrees). fp.at.angle may be
    // stored in radians elsewhere in the editor; the rest of code uses radians
    // so we check and preserve numeric type. We assume the angle here is in
    // radians if it's a small value (< 2*PI), otherwise degrees.
    try {
        const a = next.at?.angle ?? 0;
        // detect radians vs degrees heuristically
        if (Math.abs(a) <= Math.PI * 2 + 1e-6) {
            // radians
            const deg = (a * 180) / Math.PI;
            const nd = normalizeAngle(deg);
            next.at = { ...(next.at ?? {}), angle: (nd * Math.PI) / 180 };
        } else {
            const deg = a as number;
            const nd = normalizeAngle(deg);
            next.at = { ...(next.at ?? {}), angle: nd };
        }
    } catch (err) {
        // ignore
    }

    // Flip pads
    if (Array.isArray(next.pads)) {
        next.pads = next.pads.map((pad: any) => {
            const p = clone(pad);
            // remap pad layers if present (SMD pads)
            if (Array.isArray(p.layers)) p.layers = mapLayersArray(p.layers);
            if (Array.isArray(p.data?.layers)) p.data.layers = mapLayersArray(p.data.layers);

            // Normalize `at` to object form and mirror local X (negate X)
            if (Array.isArray(p.at) && typeof p.at[0] !== "undefined") {
                p.at = { x: -(Number(p.at[0]) || 0), y: Number(p.at[1]) || 0 };
            } else if (p.at && typeof p.at === "object") {
                if (typeof p.at.x === "number") p.at.x = -p.at.x;
                if (typeof p.at.y === "number") p.at.y = p.at.y;
            } else {
                // flat x/y fields
                if (typeof p.x === "number" || typeof p.y === "number") {
                    p.at = { x: -(Number(p.x) || 0), y: Number(p.y) || 0 };
                    delete p.x;
                    delete p.y;
                }
            }

            // invert pad rotation if present
            if (typeof p.rotation === "number") p.rotation = normalizeAngle(p.rotation);
            if (typeof p.rot === "number") p.rot = normalizeAngle(p.rot);
            return p;
        });
    }

    // Flip graphics shapes (x,y positions and layer names)
    if (Array.isArray(next.graphics)) {
        next.graphics = next.graphics.map((g: any) => {
            const gg = clone(g);
            // remap layer fields
            if (typeof gg.layer === "string") gg.layer = mapLayer(gg.layer);
            if (gg.layer && typeof gg.layer === "object") gg.layer = mapLayer(gg.layer);
            if (Array.isArray(gg.layers)) gg.layers = mapLayersArray(gg.layers);
            if (Array.isArray(gg.data?.layers)) gg.data.layers = mapLayersArray(gg.data.layers);

            // Normalize and mirror coordinates (mirror local X)
            if (Array.isArray(gg.start) && Array.isArray(gg.end)) {
                // preserve array form expected by renderer
                gg.start = [-(gg.start[0] ?? 0), gg.start[1] ?? 0];
                gg.end = [-(gg.end[0] ?? 0), gg.end[1] ?? 0];
            }
            // also handle nested data.start / data.end which renderer may use
            if (gg.data && Array.isArray(gg.data.start)) {
                gg.data.start = [-(gg.data.start[0] ?? 0), gg.data.start[1] ?? 0];
            } else if (gg.data && gg.data.start && typeof gg.data.start === 'object') {
                if (typeof gg.data.start.x === 'number') gg.data.start.x = -gg.data.start.x;
                if (typeof gg.data.start.y === 'number') gg.data.start.y = gg.data.start.y;
            }
            if (gg.data && Array.isArray(gg.data.end)) {
                gg.data.end = [-(gg.data.end[0] ?? 0), gg.data.end[1] ?? 0];
            } else if (gg.data && gg.data.end && typeof gg.data.end === 'object') {
                if (typeof gg.data.end.x === 'number') gg.data.end.x = -gg.data.end.x;
                if (typeof gg.data.end.y === 'number') gg.data.end.y = gg.data.end.y;
            }
            // polygon pts: support g.pts or g.data.pts.xy
            if (Array.isArray(gg.pts)) {
                // pts may be an array of arrays or array of objects; preserve form
                gg.pts = gg.pts.map((pt: any) => Array.isArray(pt) ? [-(pt[0] ?? 0), pt[1] ?? 0] : { x: -(pt.x ?? 0), y: pt.y ?? 0 });
            }
            if (gg.data && gg.data.pts && Array.isArray(gg.data.pts.xy)) {
                gg.data.pts.xy = gg.data.pts.xy.map((pt: any) => [-(pt[0] ?? 0), pt[1] ?? 0]);
            }
            if (typeof gg.x === "number") gg.x = -gg.x;
            if (typeof gg.y === "number") gg.y = typeof gg.y === "number" ? gg.y : gg.y;
            if (typeof gg.at === "object") {
                if (typeof gg.at.x === "number") gg.at.x = -gg.at.x;
                if (typeof gg.at.y === "number") gg.at.y = gg.at.y;
            }
            // circle center fields
            if (Array.isArray(gg.center)) {
                gg.center = [-(gg.center[0] ?? 0), gg.center[1] ?? 0];
            }
            if (gg.data && Array.isArray(gg.data.center)) {
                gg.data.center = [-(gg.data.center[0] ?? 0), gg.data.center[1] ?? 0];
            }
            // arc mid point
            if (Array.isArray(gg.mid)) {
                gg.mid = [-(gg.mid[0] ?? 0), gg.mid[1] ?? 0];
            }
            if (gg.data && Array.isArray(gg.data.mid)) {
                gg.data.mid = [-(gg.data.mid[0] ?? 0), gg.data.mid[1] ?? 0];
            }
            // text data positions
            // NOTE: handle text-kind graphics specifically to avoid over-generalizing
            // flips for arbitrary coordinate-like fields. Many graphics objects are
            // not text and shouldn't have their arbitrary fields mirrored.
            if (gg.kind === "text") {
                if (gg.data && Array.isArray(gg.data.at)) {
                    gg.data.at = [-(gg.data.at[0] ?? 0), gg.data.at[1] ?? 0];
                } else if (gg.data && gg.data.at && typeof gg.data.at === "object") {
                    if (typeof gg.data.at.x === "number") gg.data.at.x = -gg.data.at.x;
                    if (typeof gg.data.at.y === "number") gg.data.at.y = gg.data.at.y;
                } else if (Array.isArray(gg.at)) {
                    gg.at = [-(gg.at[0] ?? 0), gg.at[1] ?? 0];
                } else if (gg.at && typeof gg.at === "object") {
                    if (typeof gg.at.x === "number") gg.at.x = -gg.at.x;
                    if (typeof gg.at.y === "number") gg.at.y = gg.at.y;
                } else if (typeof gg.x === "number") {
                    gg.x = -gg.x;
                }
                // If rotation/angle is present for the text graphic, invert it.
                if (gg.data && typeof gg.data.angle === "number") gg.data.angle = normalizeAngle(gg.data.angle);
                if (typeof gg.angle === "number") gg.angle = normalizeAngle(gg.angle);
                if (typeof gg.rotation === "number") gg.rotation = normalizeAngle(gg.rotation);
            } else {
                if (gg.data && Array.isArray(gg.data.at)) {
                    gg.data.at = [-(gg.data.at[0] ?? 0), gg.data.at[1] ?? 0];
                }
            }
            if (gg.data && (typeof gg.data.x === "number" || typeof gg.data.y === "number")) {
                gg.data.x = typeof gg.data.x === "number" ? -gg.data.x : gg.data.x;
                gg.data.y = typeof gg.data.y === "number" ? gg.data.y : gg.data.y;
            }
            if (typeof gg.rotation === "number") gg.rotation = normalizeAngle(gg.rotation);
            return gg;
        });
    }

    // Flip text elements
    if (Array.isArray(next.texts)) {
        next.texts = next.texts.map((t: any) => {
            const tt = clone(t);
            if (Array.isArray(tt.at)) tt.at = { x: -(Number(tt.at[0]) || 0), y: Number(tt.at[1]) || 0 };
            if (typeof tt.x === "number" || typeof tt.y === "number") tt.at = { x: -(Number(tt.x) || 0), y: Number(tt.y) || 0 };
            if (typeof tt.at === "object") {
                if (typeof tt.at.x === "number") tt.at.x = -tt.at.x;
                if (typeof tt.at.y === "number") tt.at.y = tt.at.y;
            }
            if (typeof tt.rotation === "number") tt.rotation = normalizeAngle(tt.rotation);
            if (typeof tt.layer === "string") tt.layer = mapLayer(tt.layer);
            if (tt.layer && typeof tt.layer === "object") tt.layer = mapLayer(tt.layer);
            return tt;
        });
    }

    // Properties and other metadata typically don't need changes, UUIDs stay the same.
    return next as any;
}

export default flipFootprint;
