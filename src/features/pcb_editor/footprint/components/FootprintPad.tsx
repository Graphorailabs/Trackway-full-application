import { Group, Rect, Circle, Text } from "react-konva";
import { useGrid } from "@/features/pcb_editor/contexts/GridContext";
import { usePadHover } from "@/features/pcb_editor/contexts/PadHoverContext";
import { ENABLE_PAD_HIGHLIGHT, ENABLE_PAD_CENTER_DEBUG, ENABLE_PAD_NUMBER_DEBUG } from "@/features/pcb_editor/constants";

type PadProps = {
  p: any;
  key?: any;
  fpUuid?: string;
  padIndex?: number;
};

export default function FootprintPad({ p, fpUuid, padIndex }: PadProps) {
  const { backgroundColor } = useGrid();
  const padHover = (() => {
    try {
      return usePadHover();
    } catch (e) {
      return null as any;
    }
  })();
  const hovered = padHover ? padHover.hovered : null;
  const setHovered = padHover ? padHover.setHovered : () => {};

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

  // If the pad explicitly lists layers (or nested data.layers), prefer
  // choosing the color based on whether it sits on the front or back
  // copper. This makes a flip that remaps `F.` <-> `B.` automatically
  // update the visual color without adding synthetic properties.
  try {
    const layerCandidates: any[] = [];
    if (Array.isArray(p.layers)) layerCandidates.push(...p.layers);
    if (Array.isArray(p.data?.layers)) layerCandidates.push(...p.data.layers);
    if (p.layer) layerCandidates.push(p.layer);
    if (p.data && p.data.layer) layerCandidates.push(p.data.layer);
    const normalizeLayer = (l: any) => {
      try {
        if (!l) return null;
        if (typeof l === "string") return String(l);
        if (typeof l === "object") {
          // common shape: { canonical_name: 'F.Cu' }
          if (typeof l.canonical_name === "string") return String(l.canonical_name);
          if (typeof l.canonicalName === "string") return String(l.canonicalName);
          if (typeof l.name === "string") return String(l.name);
        }
      } catch (e) {}
      return null;
    };
    const hasBack = layerCandidates.some((l) => {
      const v = normalizeLayer(l);
      return typeof v === "string" && v.toUpperCase().startsWith("B.");
    });
    const hasFront = layerCandidates.some((l) => {
      const v = normalizeLayer(l);
      return typeof v === "string" && v.toUpperCase().startsWith("F.");
    });
    if (hasBack && !hasFront) {
      // Back copper: blue-ish
      padFill = "#1565c0";
      padStroke = "#0d47a1";
    } else if (hasFront && !hasBack) {
      // Front copper: keep default red
      padFill = "#c62828";
      padStroke = "#6b0f0f";
    }
  } catch (e) {}

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

  const isHovered = ENABLE_PAD_HIGHLIGHT ? Boolean(hovered && hovered.fpUuid === fpUuid && hovered.padIndex === padIndex) : false;

  if (shape === "circle" || shape === "round") {
    const r = Math.max(w, h) / 2;
    let fontSize = Math.max(6, Math.min(24, Math.floor(Math.min(w, h) * 0.6)));
    if (ENABLE_PAD_NUMBER_DEBUG) fontSize = Math.max(10, fontSize);
    // reuse isHovered declared above
    if (ENABLE_PAD_NUMBER_DEBUG) {
      try {
        console.debug('[debug] FootprintPad render (circle)', { fpUuid, padIndex, number: p.number, sx, sy, r, fontSize });
      } catch (e) {}
    }

    return (
      <Group {...(ENABLE_PAD_HIGHLIGHT ? { onMouseEnter: () => setHovered && setHovered({ fpUuid: fpUuid ?? "", padIndex: padIndex ?? 0 }), onMouseLeave: () => setHovered && setHovered(null) } : {})}>
        <Circle x={sx} y={sy} radius={r} fill={padFill} stroke={padStroke} strokeWidth={0.2} />
        {isHovered ? <Circle x={sx} y={sy} radius={r + 0.25} stroke="#ffd54f" strokeWidth={0.35} listening={false} /> : null}
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
        {ENABLE_PAD_CENTER_DEBUG ? <Circle x={sx} y={sy} radius={0.35} fill="#ffeb3b" stroke="#000" strokeWidth={0.1} listening={false} /> : null}
        {ENABLE_PAD_NUMBER_DEBUG ? (
          <Text
            x={sx - r}
            y={sy - fontSize / 2}
            width={r * 2}
            align="center"
            verticalAlign="middle"
            text={String(p.number ?? padIndex ?? p.name ?? "")}
            fontSize={fontSize}
            fill="#000"
            stroke="#ffd54f"
            strokeWidth={0.4}
            listening={false}
          />
        ) : null}
      </Group>
    );
  }

  let fontSize = Math.max(6, Math.min(24, Math.floor(Math.min(w, h) * 0.6)));
  if (ENABLE_PAD_NUMBER_DEBUG) fontSize = Math.max(10, fontSize);
  if (ENABLE_PAD_NUMBER_DEBUG) {
    try {
      console.debug('[debug] FootprintPad render (rect)', { fpUuid, padIndex, number: p.number, sx, sy, w, h, fontSize });
    } catch (e) {}
  }
  return (
    <Group {...(ENABLE_PAD_HIGHLIGHT ? { onMouseEnter: () => setHovered && setHovered({ fpUuid: fpUuid ?? "", padIndex: padIndex ?? 0 }), onMouseLeave: () => setHovered && setHovered(null) } : {})}>
      <Rect x={sx - w / 2} y={sy - h / 2} width={w} height={h} fill={padFill} stroke={padStroke} strokeWidth={0.2} />
      {isHovered ? <Rect x={sx - w / 2 - 0.25} y={sy - h / 2 - 0.25} width={w + 0.5} height={h + 0.5} stroke="#ffd54f" strokeWidth={0.35} listening={false} /> : null}
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
      {ENABLE_PAD_CENTER_DEBUG ? <Circle x={sx} y={sy} radius={0.35} fill="#ffeb3b" stroke="#000" strokeWidth={0.1} listening={false} /> : null}
      {ENABLE_PAD_NUMBER_DEBUG ? (
        <Text
          x={sx - w / 2}
          y={sy - h / 2 - fontSize}
          width={w}
          align="center"
          verticalAlign="middle"
          text={String(p.number ?? padIndex ?? p.name ?? "")}
          fontSize={fontSize}
          fill="#000"
          stroke="#ffd54f"
          strokeWidth={0.4}
          listening={false}
        />
      ) : null}
    </Group>
  );
}
