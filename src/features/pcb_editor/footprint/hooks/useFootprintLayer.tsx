import { useMemo } from "react";
import type { Footprint as ParserFootprint } from "trackway-parser-wasm";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";

// Hook that returns footprints and simple helpers for rendering. The heavy
// transformation to screen coords should be done in the renderer, but this
// hook centralizes selection/filter logic and derived lists.
export function useFootprintLayer() {
  const { pcb } = usePcb();

  const footprints: ParserFootprint[] = pcb.footprints ?? [];

  const byUuid = useMemo(() => {
    const map = new Map<string, ParserFootprint>();
    for (const f of footprints) if (f.uuid) map.set(f.uuid, f);
    return map;
  }, [footprints]);

  return {
    footprints,
    byUuid,
  };
}
