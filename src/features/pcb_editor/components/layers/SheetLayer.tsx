import { useEffect, useMemo } from "react";

import type { SheetMetadata } from "@/features/pcb_editor/types";
import { PAPER_PRESETS_MM } from "@/features/pcb_editor/constants";
import type { Paper } from "trackway-parser-wasm";

// Keep world units canonical: 1 world unit == 1 millimeter.
// Previously a visual-only scale was applied (`3.5`) which caused the
// sheet to render at a different apparent size than other world-space
// content. Use 1 so sheet dimensions are provided in world units (mm)
// and will be transformed consistently by the viewport transform.
const MM_TO_PX = 1;

const SHEET_COLORS = {
  frame: "#d7c2a1",
  accent: "#a57c39",
  textPrimary: "#fdf7dd",
  textSecondary: "#e7d8b5",
  textOutline: "rgba(18, 22, 19, 0.65)",
  glassFill: "transparent",
  glassAccent: "rgba(240, 224, 197, 0.1)",
};

const DEFAULT_PAGE: Paper = { size: "A4", portrait: false };

export type SheetLayerProps = {
  page: Paper | null;
  metadata: SheetMetadata;
  variant?: "centered" | "anchored";
};

function resolvePageDimensions(page: Paper) {
  if (Array.isArray(page.size)) {
    const [width, height] = page.size;
    return { width, height };
  }

  if (typeof page.size === "string") {
    const preset = PAPER_PRESETS_MM[page.size.toLowerCase()] ?? null;
    if (preset) {
      return page.portrait ? { width: preset.height, height: preset.width } : preset;
    }
  }

  return { width: 420, height: 297 };
}

export function SheetLayer({ page, metadata, variant = "centered" }: SheetLayerProps) {
  const activePage = page ?? DEFAULT_PAGE;
  useEffect(() => {
    // Debug logging removed: previously emitted paper props in dev builds.
    // Keep effect present only if future side-effects are necessary.
    return () => {};
  }, [page, activePage]);

  const { widthPx, heightPx } = useMemo(() => {
    const { width, height } = resolvePageDimensions(activePage);
    // Debug logging removed: resolved page dimensions are used directly.
    return {
      widthPx: width * MM_TO_PX,
      heightPx: height * MM_TO_PX,
    };
  }, [activePage, variant]);

  const paperLabel = useMemo(() => {
    if (Array.isArray(activePage.size)) {
      return `${activePage.size[0]}×${activePage.size[1]}mm`;
    }
    return typeof activePage.size === "string" ? activePage.size.toUpperCase() : "Custom";
  }, [activePage.size]);

  // Compute layout values relative to the page size so the sheet renders
  // consistently in world units (mm). These values produce a compact,
  // KiCad-like title block while keeping spacing proportional across
  // different paper sizes.
  const minDim = Math.min(widthPx, heightPx);
  const padding = Math.max(6, Math.round(minDim * 0.03));
  const innerPadding = Math.round(padding * 1.25);
  const fontSize = Math.max(3, Math.round(minDim * 0.03)); // mm
  const blockPadding = Math.max(4, Math.round(minDim * 0.01));
  const entryHeight = Math.max(Math.round(fontSize * 1.2), fontSize + 2);
  const resolvedPageLabel = metadata.page && metadata.totalPages
    ? `${metadata.page}/${metadata.totalPages}`
    : metadata.page ?? metadata.totalPages ?? "";
  const blockEntries = [
    ["PROJECT", metadata.title ?? ""],
    ["TITLE", metadata.subtitle ?? ""],
    ["COMPANY", metadata.company ?? ""],
    ["DOC ID", metadata.documentId ?? ""],
    ["REVISION", metadata.revision ?? ""],
    ["DATE", metadata.date ?? ""],
    ["PAGE", resolvedPageLabel],
    ["CHECKED", metadata.checker ?? ""],
  ] as const;
  const titleBlockWidth = Math.min(widthPx * 0.32, Math.max(80, widthPx * 0.22));
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
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={padding}
          y={padding}
          width={widthPx - padding * 2}
          height={heightPx - padding * 2}
          fill="none"
          stroke={SHEET_COLORS.frame}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={innerPadding}
          y={innerPadding}
          width={widthPx - innerPadding * 2}
          height={heightPx - innerPadding * 2}
          fill="none"
          stroke={SHEET_COLORS.accent}
          strokeWidth={1}
          strokeDasharray={`${Math.max(4, Math.round(minDim * 0.03))} ${Math.max(4, Math.round(minDim * 0.03))}`}
          strokeOpacity={0.7}
          vectorEffect="non-scaling-stroke"
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
          vectorEffect="non-scaling-stroke"
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
                  vectorEffect="non-scaling-stroke"
                />
                <SheetRow
                  label={entry[0]}
                  value={entry[1]}
                  y={rowY + entryHeight * 0.65}
                  x={titleBlockX + blockPadding}
                  width={titleBlockWidth - blockPadding * 2}
                  fontSize={fontSize}
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
              fontSize={fontSize}
            />
          );
        })}

        {/* Small footer note */}
        <text
          x={padding + Math.max(6, Math.round(minDim * 0.02))}
          y={heightPx - padding - Math.max(6, Math.round(minDim * 0.02))}
          fill={SHEET_COLORS.textSecondary}
          fontFamily="DM Mono, ui-monospace"
          fontSize={Math.max(3, Math.round(minDim * 0.03))}
          stroke={SHEET_COLORS.textOutline}
          strokeWidth={0.3}
          paintOrder="stroke"
        >
          Generator: Trackway PCB · Paper {paperLabel}
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
  fontSize?: number;
};

function SheetRow({ label, value, x, y, width, fontSize }: SheetRowProps) {
  const size = fontSize ??  Math.max(3, Math.round(Math.min(width, 20) * 0.6));
  return (
    <g>
      <text
        x={x}
        y={y}
        fill={SHEET_COLORS.textSecondary}
        fontFamily="DM Mono, ui-monospace"
        fontSize={size}
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
        fontSize={size}
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
