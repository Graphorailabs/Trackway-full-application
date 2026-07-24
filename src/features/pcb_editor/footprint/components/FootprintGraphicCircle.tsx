import { Circle } from "react-konva";
import { FOOTPRINT_GRAPHIC_MIN_HIT_PX } from "./constants";

type Props = {
  g: any;
};

function layerColorFor(layer?: string) {
  if (!layer) return "#ffffff";
  const l = layer.toLowerCase();
  if (l.includes("silk")) return "#ffffff";
  if (l.includes("fab")) return "#e6f7ff";
  if (l.includes("crty") || l.includes("crtyd") || l.includes("courtyard")) return "#9ec5ff";
  if (l.includes("cu")) return "#f0c090";
  return "#ffffff";
}

export default function FootprintGraphicCircle({ g }: Props) {
  const centerRaw = g.center ?? g.data?.center ?? [0, 0];
  const endRaw = g.end ?? g.data?.end ?? [centerRaw[0] + 1, centerRaw[1]];

  const cx = Number(Array.isArray(centerRaw) ? centerRaw[0] : centerRaw.x) || 0;
  const cy = Number(Array.isArray(centerRaw) ? centerRaw[1] : centerRaw.y) || 0;
  const ex = Number(Array.isArray(endRaw) ? endRaw[0] : endRaw.x) || 0;
  const ey = Number(Array.isArray(endRaw) ? endRaw[1] : endRaw.y) || 0;

  const r = Math.hypot(ex - cx, ey - cy) || 0;
  const strokeWidth = Number(g.data?.stroke?.width ?? g.width ?? 0.12) || 0.12;
  const hitStrokeWidth = Math.max(strokeWidth, FOOTPRINT_GRAPHIC_MIN_HIT_PX);
  const layer = g.data?.layer ?? g.layer;
  const stroke = layerColorFor(layer);
  const fill = g.data?.fill ? stroke : undefined;

  return <Circle x={cx} y={cy} radius={r} stroke={stroke} strokeWidth={strokeWidth} fill={fill} hitStrokeWidth={hitStrokeWidth} />;
}
