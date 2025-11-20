import React from "react";
import { Line } from "react-konva";
import { FOOTPRINT_PREVIEW_DEBUG as DEFAULT_DEBUG } from "@/features/footprint_manager/constants";

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

export default function FootprintGraphicPolygon({ g }: Props) {
  const rawPts = g.pts ?? g.data?.pts ?? null;

  let ptsArr: any[] = [];
  if (Array.isArray(rawPts)) ptsArr = rawPts;
  else if (rawPts && Array.isArray(rawPts.xy)) ptsArr = rawPts.xy;

  const pts: number[] = [];
  for (const pt of ptsArr) {
    const x = Number(pt[0] ?? pt.x) || 0;
    const y = Number(pt[1] ?? pt.y) || 0;
    pts.push(x, y);
  }

  if (pts.length < 4) return null;

  const layer = g.data?.layer ?? g.layer;
  const strokeW = Number(g.data?.stroke?.width ?? g.width ?? 0.2) || 0.2;
  const strokeColor = layerColorFor(layer);
  const fillFlag = Boolean(g.data?.fill ?? g.fill);

  // debug visual override (defaults from constants, but allow runtime override)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbg = (typeof window !== "undefined" ? (window as any).FOOTPRINT_PREVIEW_DEBUG ?? DEFAULT_DEBUG : DEFAULT_DEBUG) as boolean;
  const effectiveStroke = dbg ? "#ff00ff" : strokeColor;
  const effectiveStrokeWidth = dbg ? Math.max(strokeW * 3, 0.8) : strokeW;

  return <Line points={pts} closed stroke={effectiveStroke} strokeWidth={effectiveStrokeWidth} fill={fillFlag ? strokeColor : undefined} />;
}
