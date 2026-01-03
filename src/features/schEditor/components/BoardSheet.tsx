import { useEffect, useMemo } from "react";
import type { TitleBlock } from "trackway-parser-wasm";
import { PAPER_PRESETS_MM } from "@/features/pcb_editor/constants";

export default function BoardSheet({ titleBlock }: { titleBlock?: TitleBlock | null }) {
  // Keep world units canonical: 1 world unit == 1 millimeter.
  const MM_TO_PX = 1;

  const DEFAULT_PAGE = { size: "A4", portrait: false } as const;

  const { widthPx, heightPx, widthMm, heightMm } = useMemo(() => {
    const page = DEFAULT_PAGE;
    let width = 297;
    let height = 210;
    if (typeof page.size === "string") {
      const preset = PAPER_PRESETS_MM[page.size.toLowerCase()];
      if (preset) {
        ({ width, height } = page.portrait ? { width: preset.height, height: preset.width } : preset);
      }
    }
    return { widthMm: width, heightMm: height, widthPx: width * MM_TO_PX, heightPx: height * MM_TO_PX };
  }, []);

  // Center the sheet in world coordinates
  const left = -widthPx / 2;
  const top = -heightPx / 2;

  useEffect(() => {
    const preventContextMenu = (e: any) => e.preventDefault();
    document.addEventListener("contextmenu", preventContextMenu);
    return () => document.removeEventListener("contextmenu", preventContextMenu);
  }, []);

  const borderColor = "#d70000ff";

  const minDim = Math.min(widthPx, heightPx);
  const padding = Math.max(6, Math.round(minDim * 0.03));
  const innerPadding = Math.round(padding * 1.25);
  const fontSize = Math.max(3, Math.round(minDim * 0.03));

  const blockPadding = Math.max(4, Math.round(minDim * 0.01));
  const entryHeight = Math.max(Math.round(fontSize * 1.4), fontSize + 6);
  // Derive title-block entries from the supplied schematic `title_block`.
  const tb = titleBlock ?? {};
  const titleText = tb.title ?? "";
  const company = tb.company ?? "";
  const rev = tb.rev ?? "";
  const date = tb.date ?? "";
  const comments = Array.isArray(tb.comment)
    ? tb.comment.map((c: any) => (typeof c === "string" ? c : Array.isArray(c) ? c[1] : String(c))).filter(Boolean)
    : [];

  const blockEntries = [
    ["TITLE", titleText],
    ["COMPANY", company],
    ["DATE", date],
    ["REV", rev],
    ["COMMENT", comments.join(" — ")],
  ] as const;
  const titleBlockWidth = Math.min(widthPx * 0.32, Math.max(120, widthPx * 0.22));
  const titleBlockHeight = blockPadding * 2 + entryHeight * blockEntries.length;
  const titleBlockX = padding + 10;
  const titleBlockY = heightPx - padding - titleBlockHeight - 10;

  return (
    <div
      style={{
        position: "absolute",
        left: `${left}px`,
        top: `${top}px`,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        pointerEvents: "none",
      }}
    >
      <svg width={widthPx} height={heightPx} viewBox={`0 0 ${widthPx} ${heightPx}`}>
        <rect x={0} y={0} width={widthPx} height={heightPx} fill="none" stroke={borderColor} strokeWidth={2} />
        <rect x={padding} y={padding} width={widthPx - padding * 2} height={heightPx - padding * 2} fill="none" stroke={borderColor} strokeWidth={1.2} />

        <g transform={`translate(${titleBlockX}, ${titleBlockY})`}>
          <rect x={0} y={0} width={titleBlockWidth} height={titleBlockHeight} fill="none" stroke={borderColor} strokeWidth={1.2} />
          {blockEntries.map((entry, index) => {
            const rowY = blockPadding + index * entryHeight;
            // horizontal separators (skip top line)
            if (index > 0) {
              /* eslint-disable react/no-array-index-key */
            }
            return (
              <g key={`${entry[0]}-${index}`}>
                {index > 0 && (
                  <line
                    x1={0}
                    y1={rowY}
                    x2={titleBlockWidth}
                    y2={rowY}
                    stroke={borderColor}
                    strokeWidth={0.9}
                  />
                )}
                {index === 0 ? (
                  <text
                    x={titleBlockWidth / 2}
                    y={rowY + entryHeight * 0.65}
                    fontSize={Math.max(fontSize + 2, 10)}
                    fontWeight="700"
                    fill={borderColor}
                    textAnchor="middle"
                  >
                    {entry[1]}
                  </text>
                ) : (
                  <>
                    <text x={blockPadding} y={rowY + entryHeight * 0.65} fontSize={fontSize} fill={borderColor}>
                      {entry[0].charAt(0) + entry[0].slice(1).toLowerCase()}
                    </text>
                    <text
                      x={titleBlockWidth - blockPadding}
                      y={rowY + entryHeight * 0.65}
                      fontSize={fontSize}
                      fill={borderColor}
                      textAnchor="end"
                    >
                      {entry[1]}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
