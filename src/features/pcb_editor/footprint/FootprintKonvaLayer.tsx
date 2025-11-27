
import  { useMemo } from "react";
import {  Group, Rect, Circle, Line, Text } from "react-konva";

import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import FootprintKonvaRenderer from "@/features/pcb_editor/footprint/FootprintKonvaRenderer";
import { useLayers } from "@/features/pcb_editor/contexts/LayerContext";

// Render footprints using the shared `FootprintKonvaRenderer` so previews
// and placed footprints use the exact same rendering code.
export default function FootprintKonvaLayer() {
  const { pcb, flashHighlightUuid } = usePcb();
  const { visibility } = useLayers();

  const footprints = pcb.footprints ?? [];

  const isVisibleByLayer = (item: any) => {
    if (!item) return true;

    const normalize = (raw: any): string | null => {
      if (!raw && raw !== 0) return null;
      if (typeof raw === "string") return raw.trim();
      // some models may carry objects like { canonical_name: "F.Cu" }
      if (typeof raw === "object" && raw.canonical_name && typeof raw.canonical_name === "string") return raw.canonical_name.trim();
      return String(raw).trim();
    };

    // explicit array of layers (e.g. pad.layers)
    const layersArr = (item.layers ?? item.data?.layers) as any[] | undefined;
    if (Array.isArray(layersArr) && layersArr.length > 0) {
      // pad should be visible if any of its layers is visible in the editor
      return layersArr.some((l) => {
        const key = normalize(l);
        if (!key) return true; // defensively render if layer unknown
        if (visibility[key] !== undefined) return !!visibility[key];
        // fallback: case-insensitive match
        const found = Object.keys(visibility).find((k) => k.toLowerCase() === key.toLowerCase());
        return found ? !!visibility[found] : true;
      });
    }

    const layer = normalize(item.layer ?? item.data?.layer);
    if (!layer) return true;
    if (visibility[layer] !== undefined) return !!visibility[layer];
    const found = Object.keys(visibility).find((k) => k.toLowerCase() === layer.toLowerCase());
    return found ? !!visibility[found] : true;
  };

  const hasVisibleItems = (fp: any) => {
    const pads = (fp.pads ?? []) as Array<any>;
    const graphics = (fp.graphics ?? []) as Array<any>;
    const texts = ((fp as any).texts ?? []) as Array<any>;
    return pads.some(isVisibleByLayer) || graphics.some(isVisibleByLayer) || texts.some(isVisibleByLayer);
  };

  const groups = useMemo(() => {
    return footprints.filter(hasVisibleItems).map((fp) => {
      const at = (fp.at ?? { x: 0, y: 0, angle: 0 }) as { x?: number; y?: number; angle?: number };
      const x = at.x ?? 0;
      const y = at.y ?? 0;
      const angle = at.angle ?? 0;
      return { uuid: fp.uuid, x, y, angle, model: fp };
    });
  }, [footprints, visibility]);

  return (
    <>
      {groups.map((g) => (
        <Group key={g.uuid} id={g.uuid} x={g.x} y={g.y} rotation={(g.angle ?? 0) * (180 / Math.PI)}>
          <FootprintKonvaRenderer model={g.model as any} highlight={flashHighlightUuid === g.uuid} />
        </Group>
      ))}
    </>
  );
}
