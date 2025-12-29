
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

const flipAnglePreserveUnit = (v: number | undefined | null) => {
    if (v == null) return v;
    // If the value looks like radians (small magnitude), convert to degrees,
    // normalize, then convert back to radians to preserve numeric form.
    if (Math.abs(v) <= Math.PI * 2 + 1e-6) {
        const deg = (v * 180) / Math.PI;
        const nd = normalizeAngle(deg);
        return (nd * Math.PI) / 180;
    }
    const deg = v as number;
    return normalizeAngle(deg);
};

const clone = (v: any) => JSON.parse(JSON.stringify(v));

// Mutate `obj` in-place, mirroring coordinate-like fields only.
// To avoid flipping non-coordinate 2-value arrays (e.g. font sizes),
// we only treat length-2 numeric arrays as points when the parent key
// indicates coordinates (e.g. 'at','start','end','center','mid','pts','xy').
const COORD_KEYS = new Set(["at", "start", "end", "center", "mid", "pts", "xy", "xyr", "pts.xy", "data.at", "data.start", "data.end", "data.center", "data.mid", "data.pts", "position", "pos", "origin"]);
const mirrorCoordsRecursive = (obj: any, parentKey?: string) => {
    if (obj == null) return;
    if (Array.isArray(obj)) {
        // array of two numbers under a coordinate-like parent -> mirror X
        if (obj.length === 2 && typeof obj[0] === 'number' && typeof obj[1] === 'number' && parentKey && COORD_KEYS.has(parentKey)) {
            obj[0] = -obj[0];
            return;
        }
        // recurse into elements, preserving parentKey (useful for pts arrays)
        for (let i = 0; i < obj.length; i++) mirrorCoordsRecursive(obj[i], parentKey);
        return;
    }
    if (typeof obj === 'object') {
        // object with x/y -> mirror regardless of key
        if (typeof obj.x === 'number' && typeof obj.y === 'number') {
            obj.x = -obj.x;
            return;
        }
        // recurse, passing the child key so arrays beneath it know their context
        for (const k of Object.keys(obj)) {
            try { mirrorCoordsRecursive(obj[k], k); } catch (e) {}
        }
    }
};

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
    const before = clone(fp);

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

            // Normalize `at` to object form and mirror local X (negate X).
            // Preserve any angle value if present (array [x,y,angle] or object.at.angle).
            if (Array.isArray(p.at) && typeof p.at[0] !== "undefined") {
                const ax = Number(p.at[0]) || 0;
                const ay = Number(p.at[1]) || 0;
                const aangle = typeof p.at[2] === "number" ? p.at[2] : undefined;
                p.at = aangle !== undefined ? { x: -ax, y: ay, angle: flipAnglePreserveUnit(aangle) } : { x: -ax, y: ay };
            } else if (p.at && typeof p.at === "object") {
                if (typeof p.at.x === "number") p.at.x = -p.at.x;
                if (typeof p.at.y === "number") p.at.y = p.at.y;
                if (typeof p.at.angle === "number") p.at.angle = flipAnglePreserveUnit(p.at.angle as number);
            } else {
                // flat x/y fields
                if (typeof p.x === "number" || typeof p.y === "number") {
                    p.at = { x: -(Number(p.x) || 0), y: Number(p.y) || 0 };
                    delete p.x;
                    delete p.y;
                }
            }

            // Also handle nested locations under p.data.at or p.data.x/p.data.y
            if (p.data) {
                // use recursive mirror helper to handle any nested coordinate forms
                mirrorCoordsRecursive(p.data);
                // ensure arrays like p.data.at remain arrays if they were originally arrays
                if (Array.isArray(p.data.at)) {
                    // already mirrored by helper above
                }
            }

            // invert pad rotation if present, preserving numeric unit (radians vs degrees)
            if (typeof p.rotation === "number") p.rotation = flipAnglePreserveUnit(p.rotation as number);
            if (typeof p.rot === "number") p.rot = flipAnglePreserveUnit(p.rot as number);
            return p;
        });
    }

    // Canonicalize pads: ensure `p.at` is always an object {x,y,angle?}
    if (Array.isArray(next.pads)) {
        next.pads = next.pads.map((p: any) => {
            try {
                // if at is array [x,y,angle]
                if (Array.isArray(p.at)) {
                    const ax = Number(p.at[0]) || 0;
                    const ay = Number(p.at[1]) || 0;
                    const aangle = typeof p.at[2] === 'number' ? p.at[2] : undefined;
                    p.at = aangle !== undefined ? { x: ax, y: ay, angle: aangle } : { x: ax, y: ay };
                }
                // if p.data.at is array
                if (p.data && Array.isArray(p.data.at)) {
                    const ax = Number(p.data.at[0]) || 0;
                    const ay = Number(p.data.at[1]) || 0;
                    const aangle = typeof p.data.at[2] === 'number' ? p.data.at[2] : undefined;
                    p.data.at = aangle !== undefined ? { x: ax, y: ay, angle: aangle } : { x: ax, y: ay };
                }
                // flat x/y fields -> at
                if ((typeof p.x === 'number' || typeof p.y === 'number') && !p.at) {
                    p.at = { x: Number(p.x) || 0, y: Number(p.y) || 0 };
                    delete p.x;
                    delete p.y;
                }
            } catch (e) {}
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

            // Use recursive mirror helper so we catch all nested coordinate forms
            mirrorCoordsRecursive(gg);
            // ensure any explicit rotation/angle fields are still flipped preserving units
            if (gg.data && typeof gg.data.angle === "number") gg.data.angle = flipAnglePreserveUnit(gg.data.angle as number);
            if (typeof gg.angle === "number") gg.angle = flipAnglePreserveUnit(gg.angle as number);
            if (typeof gg.rotation === "number") gg.rotation = flipAnglePreserveUnit(gg.rotation as number);
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
            if (typeof tt.rotation === "number") tt.rotation = flipAnglePreserveUnit(tt.rotation as number);
            if (typeof tt.layer === "string") tt.layer = mapLayer(tt.layer);
            if (tt.layer && typeof tt.layer === "object") tt.layer = mapLayer(tt.layer);
            return tt;
        });
    }

    // Properties and other metadata typically don't need changes, UUIDs stay the same.
    // If debug UUID is set on window, emit a compact before/after diff to console
    try {
        const dbgUuid = typeof globalThis !== 'undefined' ? (globalThis as any).__TRACKWAY_DEBUG_FLIP_UUID : undefined;
        if (dbgUuid && dbgUuid === next.uuid) {
            try {
                const compact = (f: any) => ({
                    uuid: f.uuid,
                    at: f.at,
                    pads: (f.pads || []).map((p: any) => ({ uuid: p.uuid, at: p.at, dataAt: p.data?.at, x: p.x, y: p.y })),
                    graphics: (f.graphics || []).map((g: any) => ({ uuid: g.uuid, kind: g.kind, start: g.start ?? g.data?.start, end: g.end ?? g.data?.end, at: g.at ?? g.data?.at, pts: g.pts ?? g.data?.pts?.xy ?? g.data?.pts }))
                });
                console.log('[flipFootprint] DEBUG before', compact(before));
                console.log('[flipFootprint] DEBUG after', compact(next));
            } catch (e) {
                console.log('[flipFootprint] DEBUG (raw) before', before);
                console.log('[flipFootprint] DEBUG (raw) after', next);
            }
        }
    } catch (e) {}

    return next as any;
}

export default flipFootprint;
