import React from "react";
import { Group, Rect, Circle, Text } from "react-konva";
import { useGrid } from "@/features/pcb_editor/contexts/GridContext";

type PadProps = {
  p: any;
  key?: any;
};

export default function FootprintPad({ p }: PadProps) {
  const { backgroundColor } = useGrid();

  const at = p.at ?? { x: 0, y: 0 };
  const sizeArr = p.size ?? [1, 1];
  const sx = Number(at.x) || 0;
  const sy = Number(at.y) || 0;
  const w = Number(sizeArr[0]) || 1;
  const h = Number(sizeArr[1]) || w;
  const shape = (p.shape ?? "rect") as string;

  // Default pad colors (red)
  let padFill = "#c62828";
  let padStroke = "#6b0f0f";

  // Special case: n/np_thru_hole pads render as light purple.
  // We'll detect this variant and also avoid drawing the inner hole for NP pads.
  let isPurpleType = false;
  try {
    const raw = String(p.pad_type ?? "").toLowerCase();
    const normalized = raw.replace(/[^a-z0-9]/g, "");
    if ((normalized.startsWith("n") || normalized.startsWith("np")) && normalized.includes("thru") && normalized.includes("hole")) {
      padFill = "#b39ddb"; // light purple
      padStroke = "#6f42c1"; // darker purple stroke
      isPurpleType = true;
    }
  } catch (e) {
    // ignore and keep defaults
  }

  const isThroughHole = Boolean(p.drill || (p.pad_type && String(p.pad_type).toLowerCase() !== "smd"));
  // Show a visual hole only for plated thru-holes / regular thru_hole types.
  const showHole = isThroughHole && !isPurpleType;

  if (shape === "circle" || shape === "round") {
    const r = Math.max(w, h) / 2;
    const fontSize = Math.max(6, Math.min(24, Math.floor(Math.min(w, h) * 0.6)));
    return (
      <Group>
        <Circle x={sx} y={sy} radius={r} fill={padFill} stroke={padStroke} strokeWidth={0.2} />
        {showHole ? (
          <Circle
            x={sx}
            y={sy}
            radius={p.drill?.diameter ? Number(p.drill.diameter) / 2 : Math.max(1, r / 2)}
            fill={backgroundColor}
          />
        ) : null}
        {String(p.number ?? p.name ?? "").trim() ? (
          <Text
            x={sx - r}
            y={sy - fontSize / 2}
            width={r * 2}
            align="center"
            verticalAlign="middle"
            text={String(p.number ?? p.name ?? "")}
            fontSize={fontSize}
            fill="#fff"
          />
        ) : null}
      </Group>
    );
  }

  const fontSize = Math.max(6, Math.min(24, Math.floor(Math.min(w, h) * 0.6)));
  return (
    <Group>
      <Rect x={sx - w / 2} y={sy - h / 2} width={w} height={h} fill={padFill} stroke={padStroke} strokeWidth={0.2} />
      {showHole ? (
        <Circle
          x={sx}
          y={sy}
          radius={p.drill?.diameter ? Number(p.drill.diameter) / 2 : Math.max(0.5, Math.min(w, h) / 4)}
          fill={backgroundColor}
        />
      ) : null}
      {String(p.number ?? p.name ?? "").trim() ? (
        <Text
          x={sx - w / 2}
          y={sy - fontSize / 2}
          width={w}
          align="center"
          verticalAlign="middle"
          text={String(p.number ?? p.name ?? "")}
          fontSize={fontSize}
          fill="#fff"
        />
      ) : null}
    </Group>
  );
}
