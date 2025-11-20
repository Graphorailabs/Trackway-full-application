import React from "react";
import { Text } from "react-konva";

type Props = { g: any };

function resolveFontSize(g: any) {
  // prefer effects.font.size[0], fallback to g.size or 10
  try {
    const ef = g.data?.effects?.font ?? g.effects?.font;
    if (ef && Array.isArray(ef.size) && ef.size.length > 0) return Number(ef.size[0]) || 10;
  } catch (e) {}
  if (g.size) return Number(Array.isArray(g.size) ? g.size[0] : g.size) || 10;
  return 10;
}

function layerColorFor(layer?: string) {
  if (!layer) return "#ffffff";
  const l = layer.toLowerCase();
  if (l.includes("silk")) return "#ffffff";
  if (l.includes("fab")) return "#e6f7ff";
  return "#ffffff";
}

export default function FootprintGraphicText({ g }: Props) {
  const data = g.data ?? g;
  const at = data.at ?? { x: 0, y: 0, angle: 0 };
  const x = Number(at.x) || 0;
  const y = Number(at.y) || 0;
  const angle = Number(at.angle) || 0;
  const txt = data.text ?? data.string ?? "";
  const size = resolveFontSize(data);
  const fill = layerColorFor(data.layer ?? g.layer);

  // Render text in model coordinates; rotation sign adjusted to match current
  // rendering convention.
  return <Text x={x} y={y} text={String(txt)} fontSize={size} fill={fill} rotation={-angle} />;
}
