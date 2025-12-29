import { Line, Circle } from "react-konva";
import { FOOTPRINT_PREVIEW_DEBUG as DEFAULT_DEBUG, FOOTPRINT_PREVIEW_FLIP_ARC_POINTS as DEFAULT_FLIP } from "@/features/footprint_manager/constants";
import { FOOTPRINT_GRAPHIC_MIN_HIT_PX } from "./constants";

type Props = { g: any };

function layerColorFor(layer?: string) {
  if (!layer) return "#ffffff";
  const l = layer.toLowerCase();
  if (l.includes("silk")) return "#ffffff";
  if (l.includes("fab")) return "#e6f7ff";
  if (l.includes("crty") || l.includes("crtyd") || l.includes("courtyard")) return "#9ec5ff";
  if (l.includes("cu")) return "#f0c090";
  return "#ffffff";
}

function circumcenter(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) return null;
  const ax2ay2 = ax * ax + ay * ay;
  const bx2by2 = bx * bx + by * by;
  const cx2cy2 = cx * cx + cy * cy;
  const ux = (ax2ay2 * (by - cy) + bx2by2 * (cy - ay) + cx2cy2 * (ay - by)) / d;
  const uy = (ax2ay2 * (cx - bx) + bx2by2 * (ax - cx) + cx2cy2 * (bx - ax)) / d;
  return { x: ux, y: uy };
}

// normalize to [0, 2π)
function mod2pi(a: number) {
  const twoPi = Math.PI * 2;
  let v = a % twoPi;
  if (v < 0) v += twoPi;
  return v;
}

export default function FootprintGraphicArc({ g }: Props) {
  const startRaw = g.start ?? g.data?.start ?? [0, 0];
  const midRaw = g.mid ?? g.data?.mid ?? null;
  const endRaw = g.end ?? g.data?.end ?? [0, 0];

  let sx = Number(Array.isArray(startRaw) ? startRaw[0] : startRaw.x) || 0;
  let sy = Number(Array.isArray(startRaw) ? startRaw[1] : startRaw.y) || 0;
  let ex = Number(Array.isArray(endRaw) ? endRaw[0] : endRaw.x) || 0;
  let ey = Number(Array.isArray(endRaw) ? endRaw[1] : endRaw.y) || 0;

  let mx = null as number | null;
  let my = null as number | null;
  if (midRaw) {
    mx = Number(Array.isArray(midRaw) ? midRaw[0] : midRaw.x) || 0;
    my = Number(Array.isArray(midRaw) ? midRaw[1] : midRaw.y) || 0;
  }

  const strokeWidth = Number(g.data?.stroke?.width ?? g.width ?? 0.12) || 0.12;
  const layer = g.data?.layer ?? g.layer;
  const stroke = layerColorFor(layer);

  const dbg = (typeof window !== "undefined" ? (window as any).FOOTPRINT_PREVIEW_DEBUG ?? DEFAULT_DEBUG : DEFAULT_DEBUG) as boolean;
  const forceVisibleArc = (typeof window !== "undefined" ? (window as any).FOOTPRINT_PREVIEW_FORCE_VISIBLE_ARC ?? false : false) as boolean;
  const effectiveStroke = dbg ? "#ff00ff" : forceVisibleArc ? "#00ffff" : stroke;
  const effectiveStrokeWidth = Math.max(strokeWidth * 4, 1);
  const hitStrokeWidth = Math.max(effectiveStrokeWidth, FOOTPRINT_GRAPHIC_MIN_HIT_PX);

  // Compute center using circumcenter if we have a mid point
  let cx: number | null = null;
  let cy: number | null = null;
  let midUsedAsCenter = false;
  if (mx !== null && my !== null) {
    const cc = circumcenter(sx, sy, mx, my, ex, ey);
      if (cc) {
      cx = cc.x;
      cy = cc.y;
      midUsedAsCenter = false;
    } else {
      // fallback: mid used as explicit center
      cx = mx;
      cy = my;
      midUsedAsCenter = true;
      const flipArc = (typeof window !== "undefined" ? (window as any).FOOTPRINT_PREVIEW_FLIP_ARC_POINTS ?? DEFAULT_FLIP : DEFAULT_FLIP) as boolean;
        if (flipArc) {
        const _sx = sx, _sy = sy;
        sx = ex; sy = ey;
        ex = _sx; ey = _sy;
        
      } else {
        
      }
    }
  }

  // radius
  let r: number | null = null;
  if (cx !== null && cy !== null) {
    r = Math.hypot(sx - cx, sy - cy) || 0;
  }

  if (dbg) {
    if (cx === null || cy === null) {
      console.warn("FootprintGraphicArc: could not compute circumcenter for arc", { sx, sy, mx, my, ex, ey, g });
    }
  }

  // fallback to straight line if no center
  if (cx === null || cy === null) {
    return (
      <>
        {!dbg && (
          <Line
            points={[sx, sy, ex, ey]}
            stroke="#000"
            opacity={0.28}
            strokeWidth={effectiveStrokeWidth + 1}
            strokeScaleEnabled={false}
            listening={false}
          />
        )}
        <Line
          points={[sx, sy, ex, ey]}
          stroke={effectiveStroke}
          strokeWidth={effectiveStrokeWidth}
          strokeScaleEnabled={false}
          hitStrokeWidth={hitStrokeWidth}
        />
      </>
    );
  }

  // compute angles relative to center (world coordinates)
  const a1 = Math.atan2(sy - cy, sx - cx); // start angle
  const am = (mx !== null && my !== null) ? Math.atan2(my - cy, mx - cx) : null; // mid angle (may be null if midUsedAsCenter)
  const a2 = Math.atan2(ey - cy, ex - cx); // end angle

  // robust selection of signed sweep (delta)
  // ccwTotal = (a2 - a1) mod 2π in [0,2π)
  const ccwTotal = mod2pi(a2 - a1);
  // if we have a mid point that lies on the arc (not used as center), check whether
  // the mid angle falls in the CCW interval from a1 to a2.
  let delta = ccwTotal; // default: positive ccw sweep
  if (!midUsedAsCenter && am !== null) {
    const ccwToMid = mod2pi(am - a1);
    if (ccwToMid <= ccwTotal + 1e-12) {
      // mid is between a1..a2 in CCW direction -> keep positive delta
      delta = ccwTotal;
    } else {
      // mid is NOT between a1..a2 CCW -> choose the other sweep (CW)
      // the signed sweep that goes the other way is ccwTotal - 2π (negative)
      delta = ccwTotal - Math.PI * 2;
    }
  } else if (midUsedAsCenter) {
    // mid represents center, we keep the sweep that goes from start to end
    // choose the shorter arc by default:
    if (ccwTotal > Math.PI) delta = ccwTotal - Math.PI * 2; // negative shorter way
    else delta = ccwTotal;
  }

  // generate polyline points along the signed sweep delta (a1 -> a1 + delta)
  // guard extremely small delta (degenerate)
  const absDelta = Math.abs(delta);
  if (absDelta < 1e-12) {
    // degenerate: draw straight line
    return (
      <>
        {!dbg && (
          <Line
            points={[sx, sy, ex, ey]}
            stroke="#000"
            opacity={0.28}
            strokeWidth={effectiveStrokeWidth + 1}
            strokeScaleEnabled={false}
            listening={false}
          />
        )}
        <Line
          points={[sx, sy, ex, ey]}
          stroke={effectiveStroke}
          strokeWidth={effectiveStrokeWidth}
          strokeScaleEnabled={false}
          hitStrokeWidth={hitStrokeWidth}
        />
      </>
    );
  }

  const segs = Math.max(6, Math.ceil(absDelta / (Math.PI / 24)));
  const segsDebug = dbg ? Math.max(segs, 64) : segs;
  const pts: number[] = [];
  for (let i = 0; i <= segsDebug; i++) {
    const t = i / segsDebug;
    const ang = a1 + delta * t;
    const x = cx + Math.cos(ang) * (r ?? 0);
    const y = cy + Math.sin(ang) * (r ?? 0);
    pts.push(x, y);
  }

  const strokeScaleEnabled = false;

  return (
    <>
      {!dbg && (
        <Line
          points={pts}
          stroke="#000"
          opacity={0.28}
          strokeWidth={effectiveStrokeWidth + 1.5}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}

      {dbg && (
        <>
          <Circle
            x={cx}
            y={cy}
            radius={r ?? 0}
            stroke="#ff00ff"
            strokeWidth={Math.max(effectiveStrokeWidth, 1)}
            dash={[6, 4]}
            strokeScaleEnabled={false}
            listening={false}
          />
          <Circle x={cx} y={cy} radius={Math.max(0.5, effectiveStrokeWidth / 2)} fill="#ff00ff" listening={false} />
          <Circle x={sx} y={sy} radius={0.5} fill="#00ffff" listening={false} />
          <Circle x={ex} y={ey} radius={0.5} fill="#00ffff" listening={false} />
          {mx !== null && my !== null ? <Circle x={mx} y={my} radius={0.5} fill="#ffff00" listening={false} /> : null}
        </>
      )}

      <Line
        points={pts}
        stroke={effectiveStroke}
        strokeWidth={effectiveStrokeWidth}
        strokeScaleEnabled={strokeScaleEnabled}
        hitStrokeWidth={hitStrokeWidth}
      />
    </>
  );
}
