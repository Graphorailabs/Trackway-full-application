import { Rect } from "react-konva";
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

export default function FootprintGraphicRect({ g }: Props) {
  const startRaw = g.start ?? g.data?.start ?? [0, 0];
  const endRaw = g.end ?? g.data?.end ?? startRaw;

  const sx = Number(Array.isArray(startRaw) ? startRaw[0] : startRaw.x) || 0;
  const sy = Number(Array.isArray(startRaw) ? startRaw[1] : startRaw.y) || 0;
  const ex = Number(Array.isArray(endRaw) ? endRaw[0] : endRaw.x) || 0;
  const ey = Number(Array.isArray(endRaw) ? endRaw[1] : endRaw.y) || 0;

  const x = Math.min(sx, ex);
  const y = Math.min(sy, ey);
  const w = Math.abs(ex - sx);
  const h = Math.abs(ey - sy);

  const strokeWidth = Number(g.data?.stroke?.width ?? g.width ?? 0.2) || 0.2;
  const hitStrokeWidth = Math.max(strokeWidth, FOOTPRINT_GRAPHIC_MIN_HIT_PX);
  const layer = g.data?.layer ?? g.layer;
  const stroke = layerColorFor(layer);
  const fill = g.data?.fill ? stroke : undefined;

  // place using model coordinates (top-left = minY). Final vertical flip
  // will be handled at the Group level so primitives remain in model space.
  return <Rect x={x} y={y} width={w} height={h} stroke={stroke} strokeWidth={strokeWidth} fill={fill} hitStrokeWidth={hitStrokeWidth} />;
}
