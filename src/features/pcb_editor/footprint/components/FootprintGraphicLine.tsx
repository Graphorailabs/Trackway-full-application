// import React from "react";
import { Line } from "react-konva";

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

export default function FootprintGraphicLine({ g }: Props) {
  // support both forms: { start: {x,y} } or { data: { start: [x,y] } }
  const startRaw = g.start ?? g.data?.start ?? [0, 0];
  const endRaw = g.end ?? g.data?.end ?? [0, 0];

  const sx = Number(Array.isArray(startRaw) ? startRaw[0] : startRaw.x) || 0;
  const sy = Number(Array.isArray(startRaw) ? startRaw[1] : startRaw.y) || 0;
  const ex = Number(Array.isArray(endRaw) ? endRaw[0] : endRaw.x) || 0;
  const ey = Number(Array.isArray(endRaw) ? endRaw[1] : endRaw.y) || 0;

  const strokeWidth = Number(g.data?.stroke?.width ?? g.width ?? 0.12) || 0.12;
  const layer = g.data?.layer ?? g.layer;
  const stroke = layerColorFor(layer);

  return <Line points={[sx, sy, ex, ey]} stroke={stroke} strokeWidth={strokeWidth} />;
}
