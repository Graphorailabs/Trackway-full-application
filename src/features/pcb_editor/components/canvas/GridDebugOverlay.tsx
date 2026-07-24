import { useMemo } from "react";
import { useGrid } from "@/features/pcb_editor/contexts/GridContext";
import { useSelection } from "@/features/pcb_editor/contexts/SelectionContext";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import { ENABLE_GRID_DEBUG } from "@/features/pcb_editor/constants";

// Small debug overlay showing world cursor position, snapped grid coord,
// selected item's stored coords, and grid spacing. Toggleable via
// `ENABLE_GRID_DEBUG` in `src/constants.ts`.
export default function GridDebugOverlay() {
  const { minorSpacing, renderMinorPx } = useGrid();
  const { selectedUuid } = useSelection();
  const { pcb } = usePcb();

  const selected = useMemo(() => {
    if (!selectedUuid || !pcb?.graphics) return null;
    return pcb.graphics.find((g: unknown) => {
      try {
        const obj = g as { data?: { uuid?: string } };
        const uuid = obj.data?.uuid;
        return uuid === selectedUuid;
      } catch {
        return false;
      }
    }) as unknown | null;
  }, [selectedUuid, pcb]);

  const extractCoords = (item: unknown) => {
    if (!item) return { x: null, y: null };
    const d = (item as { data?: unknown }).data ?? {};
    // Treat as an indexable record to avoid direct property typing issues
    const dd = d as Record<string, unknown>;
    // Try common fields
    if (Array.isArray(dd["start"])) {
      const arr = dd["start"] as unknown[];
      return { x: Number(arr[0]), y: Number(arr[1]) };
    }
    if (Array.isArray(dd["center"])) {
      const arr = dd["center"] as unknown[];
      return { x: Number(arr[0]), y: Number(arr[1]) };
    }
    
    if (dd["pts"]) {
      const ptsCandidate = dd["pts"] as { xy?: unknown };
      if (Array.isArray(ptsCandidate.xy) && (ptsCandidate.xy as unknown[]).length > 0) {
        const pts = ptsCandidate.xy as unknown[][];
        return { x: Number(pts[0][0]), y: Number(pts[0][1]) };
      }
    }
    if (Array.isArray(dd["mid"])) {
      const arr = dd["mid"] as unknown[];
      return { x: Number(arr[0]), y: Number(arr[1]) };
    }
    if (dd["at"]) {
      const atCandidate = dd["at"] as { x?: unknown; y?: unknown };
      if (typeof atCandidate.x === "number" && typeof atCandidate.y === "number") {
        return { x: atCandidate.x as number, y: atCandidate.y as number };
      }
    }
    return { x: null, y: null };
  };

  const coords = extractCoords(selected);
  const snapToGrid = (v: number | null) => (typeof v === "number" ? Math.round(v / minorSpacing) * minorSpacing : null);

  if (!ENABLE_GRID_DEBUG) return null;

  const selectedData = (selected as { data?: unknown } | null)?.data ?? null;

  return (
    <div
      style={{
        position: "absolute",
        right: 10,
        top: 10,
        padding: 8,
        background: "rgba(0,0,0,0.6)",
        color: "#fff",
        fontSize: 12,
        zIndex: 9999,
        pointerEvents: "none",
        borderRadius: 6,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Grid Debug</div>
      <div>minor mm: {minorSpacing} mm</div>
      <div>render minor px: {renderMinorPx?.toFixed(2) ?? "-"}</div>
      <div style={{ marginTop: 6 }}>selected uuid: {selectedUuid ?? "-"}</div>
      <div>stored coords: {coords.x ?? "-"}, {coords.y ?? "-"}</div>
      <div>snapped coords: {snapToGrid(coords.x) ?? "-"}, {snapToGrid(coords.y) ?? "-"}</div>
      <div style={{ marginTop: 6, opacity: 0.9, fontSize: 11 }}>
        Tip: toggle `ENABLE_GRID_DEBUG` in `src/constants.ts` to hide.
      </div>
      <details style={{ marginTop: 6, maxWidth: 320, color: "#ddd" }}>
        <summary style={{ cursor: "pointer" }}>raw selected data</summary>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>{selected ? JSON.stringify(selectedData, null, 2) : "-"}</pre>
      </details>
    </div>
  );
}
