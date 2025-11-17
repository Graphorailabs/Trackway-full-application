import { useEffect, useMemo } from "react";

import type { SheetMetadata } from "@/features/pcb_editor/types";
import { PAPER_PRESETS_MM } from "@/features/pcb_editor/constants";
import type { Paper } from "trackway-parser-wasm";

const MM_TO_PX = 3.5; // visually pleasing scale for the virtual sheet

const SHEET_COLORS = {
  frame: "#d7c2a1",
  accent: "#a57c39",
  textPrimary: "#fdf7dd",
  textSecondary: "#e7d8b5",
  textOutline: "rgba(18, 22, 19, 0.65)",
  glassFill: "transparent",
  glassAccent: "rgba(240, 224, 197, 0.1)",
};

export type SheetLayerProps = {
  paper: Paper;
  metadata: SheetMetadata;
  variant?: "centered" | "anchored";
};

function resolvePaperDimensions(paper: Paper) {
  if (Array.isArray(paper.size)) {
    const [width, height] = paper.size;
    return { width, height };
  }

  if (typeof paper.size === "string") {
    const preset = PAPER_PRESETS_MM[paper.size.toLowerCase()] ?? null;
    if (preset) {
      return paper.portrait ? { width: preset.height, height: preset.width } : preset;
    }
  }

  return { width: 420, height: 297 };
}

export function SheetLayer({ paper, metadata, variant = "centered" }: SheetLayerProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[SheetLayer] paper props", paper);
    }
  }, [paper]);

  const { widthPx, heightPx } = useMemo(() => {
    const { width, height } = resolvePaperDimensions(paper);
    if (process.env.NODE_ENV !== "production") {
      console.log("[SheetLayer] resolved dimensions", { width, height, variant });
    }
    return {
      widthPx: width * MM_TO_PX,
      heightPx: height * MM_TO_PX,
    };
  }, [paper, variant]);

  const padding = 32;
  const innerPadding = padding * 1.6;
  const blockPadding = 12;
  const entryHeight = 20;
  const blockEntries = [
    ["PROJECT", metadata.title ?? "Untitled PCB"],
    ["TITLE", metadata.subtitle ?? "Assembly"],
    ["COMPANY", metadata.company ?? "Trackway"],
    ["DOC ID", metadata.documentId ?? "PCB-0001"],
    ["REVISION", metadata.revision ?? "V1.0"],
    ["DATE", metadata.date ?? "-"],
    ["PAGE", `${metadata.page ?? "1"}/${metadata.totalPages ?? "1"}`],
    ["CHECKED", metadata.checker ?? "Pending"],
  ] as const;
  const titleBlockWidth = Math.min(420, widthPx * 0.32);
  const titleBlockHeight = blockPadding * 2 + entryHeight * blockEntries.length;
  const titleBlockX = widthPx - padding - titleBlockWidth;
  const titleBlockY = heightPx - padding - titleBlockHeight;

  const sheet = (
    <div
      className="shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
      style={{ width: widthPx, height: heightPx }}
    >
      <svg
          aria-label="PCB sheet frame"
          width={widthPx}
          height={heightPx}
          viewBox={`0 0 ${widthPx} ${heightPx}`}
          role="img"
        >
          <rect
            x={0}
            y={0}
            width={widthPx}
            height={heightPx}
            rx={4}
            fill={SHEET_COLORS.glassFill}
            stroke={SHEET_COLORS.frame}
            strokeWidth={6}
          />
          <rect
            x={padding}
            y={padding}
            width={widthPx - padding * 2}
            height={heightPx - padding * 2}
            fill="none"
            stroke={SHEET_COLORS.frame}
            strokeWidth={2}
          />
          <rect
            x={innerPadding}
            y={innerPadding}
            width={widthPx - innerPadding * 2}
            height={heightPx - innerPadding * 2}
            fill="none"
            stroke={SHEET_COLORS.accent}
            strokeWidth={1}
            strokeDasharray="12 12"
            strokeOpacity={0.7}
          />

          {/* Compact title block */}
          <rect
            x={titleBlockX}
            y={titleBlockY}
            width={titleBlockWidth}
            height={titleBlockHeight}
            fill="transparent"
            stroke={SHEET_COLORS.accent}
            strokeWidth={1.5}
          />
          {blockEntries.map((entry, index) => {
            const rowY = titleBlockY + blockPadding + index * entryHeight;
            if (index > 0) {
              return (
                <g key={`${entry[0]}-row`}>
                  <line
                    x1={titleBlockX}
                    y1={rowY}
                    x2={titleBlockX + titleBlockWidth}
                    y2={rowY}
                    stroke={SHEET_COLORS.accent}
                    strokeWidth={index % 2 === 0 ? 1 : 0.6}
                    strokeOpacity={index % 2 === 0 ? 0.9 : 0.6}
                  />
                  <SheetRow
                    label={entry[0]}
                    value={entry[1]}
                    y={rowY + entryHeight * 0.65}
                    x={titleBlockX + blockPadding}
                    width={titleBlockWidth - blockPadding * 2}
                  />
                </g>
              );
            }
            return (
              <SheetRow
                key={`${entry[0]}-row`}
                label={entry[0]}
                value={entry[1]}
                y={rowY + entryHeight * 0.65}
                x={titleBlockX + blockPadding}
                width={titleBlockWidth - blockPadding * 2}
              />
            );
          })}

          {/* Small footer note */}
          <text
            x={padding + 12}
            y={heightPx - padding - 12}
            fill={SHEET_COLORS.textSecondary}
            fontFamily="DM Mono, ui-monospace"
            fontSize={14}
            stroke={SHEET_COLORS.textOutline}
            strokeWidth={0.3}
            paintOrder="stroke"
          >
            Generator: Trackway PCB · Paper {Array.isArray(paper.size) ? `${paper.size[0]}×${paper.size[1]}mm` : paper.size?.toUpperCase?.()}
          </text>
      </svg>
    </div>
  );

  if (variant === "anchored") {
    return (
      <div
        className="pointer-events-none absolute"
        style={{
          width: widthPx,
          height: heightPx,
          left: -widthPx / 2,
          top: -heightPx / 2,
        }}
      >
        {sheet}
      </div>
    );
  }

  return <div className="pointer-events-none flex h-full w-full items-center justify-center">{sheet}</div>;
}

type SheetRowProps = {
  label: string;
  value: string;
  x: number;
  y: number;
  width: number;
};

function SheetRow({ label, value, x, y, width }: SheetRowProps) {
  return (
    <g>
      <text
        x={x}
        y={y}
        fill={SHEET_COLORS.textSecondary}
        fontFamily="DM Mono, ui-monospace"
        fontSize={14}
        stroke={SHEET_COLORS.textOutline}
        strokeWidth={0.3}
        paintOrder="stroke"
      >
        {label}
      </text>
      <text
        x={x + width}
        y={y}
        fill={SHEET_COLORS.textPrimary}
        fontFamily="DM Mono, ui-monospace"
        fontSize={14}
        stroke={SHEET_COLORS.textOutline}
        strokeWidth={0.3}
        paintOrder="stroke"
        textAnchor="end"
      >
        {value}
      </text>
    </g>
  );
}

export default SheetLayer;
