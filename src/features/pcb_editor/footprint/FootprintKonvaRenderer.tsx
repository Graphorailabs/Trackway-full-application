import { useMemo } from "react";
import { Group, Text } from "react-konva";
import FootprintGraphicLine from "./components/FootprintGraphicLine";
import FootprintGraphicCircle from "./components/FootprintGraphicCircle";
import FootprintGraphicText from "./components/FootprintGraphicText";
import FootprintGraphicArc from "./components/FootprintGraphicArc";
import FootprintGraphicRect from "./components/FootprintGraphicRect";
import FootprintGraphicPolygon from "./components/FootprintGraphicPolygon";
import FootprintPad from "./components/FootprintPad";
import type { Footprint } from "trackway-parser-wasm";
import { useLayers } from "@/features/pcb_editor/contexts/LayerContext";

type Props = {
  model: Footprint;
  scale?: number; // mm -> px scale (Stage scale is applied outside)
  /**
   * When false, the renderer ignores `LayerContext.visibility` and renders all
   * items (used by the footprint-manager preview pane which should always show
   * the full footprint regardless of editor layer visibility).
   */
  respectLayerVisibility?: boolean;
};

export default function FootprintKonvaRenderer({ model, respectLayerVisibility = true }: Props) {
  const { visibility } = useLayers();

  const isVisibleByLayer = (item: any) => {
    if (!respectLayerVisibility) return true;
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

  // compute bounding box of the footprint to allow centering by the caller
  const { groups } = useMemo(() => {
    const pads = (model.pads ?? []) as Array<any>;
    const graphics = (model.graphics ?? []) as Array<any>;
    const texts = ((model as any).texts ?? []) as Array<any>;

    const points: Array<[number, number]> = [];
    pads.forEach((p) => {
      const at = p.at ?? { x: 0, y: 0 };
      const sizeArr = p.size ?? [1, 1];
      const w = sizeArr[0] ?? 1;
      const h = sizeArr[1] ?? w;
      points.push([at.x ?? 0 - w / 2, at.y ?? 0 - h / 2]);
      points.push([at.x ?? 0 + w / 2, at.y ?? 0 + h / 2]);
    });
    graphics.forEach((g) => {
      if (g.kind === "line") {
        const s = g.start ?? (g.data?.start ?? { x: 0, y: 0 });
        const e = g.end ?? (g.data?.end ?? { x: 0, y: 0 });
        points.push([s.x ?? s[0] ?? 0, s.y ?? s[1] ?? 0]);
        points.push([e.x ?? e[0] ?? 0, e.y ?? e[1] ?? 0]);
      } else if (g.kind === "polygon") {
        // Kanwar-style polygons may carry points under g.data.pts.xy
        const rawPts = g.pts ?? g.data?.pts ?? null;
        if (Array.isArray(rawPts)) {
          rawPts.forEach((pt: any) => points.push([pt[0] ?? pt.x ?? 0, pt[1] ?? pt.y ?? 0]));
        } else if (rawPts && Array.isArray(rawPts.xy)) {
          rawPts.xy.forEach((pt: any) => points.push([pt[0] ?? pt.x ?? 0, pt[1] ?? pt.y ?? 0]));
        }
      }
    });
    texts.forEach((t) => {
      const at = t.at ?? { x: 0, y: 0 };
      points.push([at.x ?? 0, at.y ?? 0]);
    });

    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = xs.length ? Math.min(...xs) : -5;
    const maxX = xs.length ? Math.max(...xs) : 5;
    const minY = ys.length ? Math.min(...ys) : -5;
    const maxY = ys.length ? Math.max(...ys) : 5;

    return { groups: { pads, graphics, texts, minX, maxX, minY, maxY } } as any;
  }, [model]);

  const { pads, graphics, texts } = groups as any;

  // Centering is handled by the caller by placing this Group at the desired origin.
  return (
    <>
      <Group>
        {pads.map((p: any, i: number) => {
          if (!isVisibleByLayer(p)) return null;
          return <FootprintPad key={i} p={p} />;
        })}

        {graphics.map((g: any, i: number) => {
          if (!g || !g.kind) return null;
          if (!isVisibleByLayer(g)) return null;
          if (g.kind === "line") {
            return <FootprintGraphicLine key={i} g={g} />;
          }
          if (g.kind === "polygon") {
            return <FootprintGraphicPolygon key={i} g={g} />;
          }
          if (g.kind === "rect") {
            return <FootprintGraphicRect key={i} g={g} />;
          }
          if (g.kind === "circle") {
            return <FootprintGraphicCircle key={i} g={g} />;
          }
          if (g.kind === "arc") {
            // Debug: log arc geometry to confirm arc objects reach the arc renderer
            try {
              // eslint-disable-next-line no-console
              console.log("FootprintKonvaRenderer: arc", g);
            } catch (e) {}
            return <FootprintGraphicArc key={i} g={g} />;
          }
          if (g.kind === "text") {
            return <FootprintGraphicText key={i} g={g.data ?? g} />;
          }
          return null;
        })}

        {texts.map((t: any, i: number) => {
          if (!isVisibleByLayer(t)) return null;
          const at = t.at ?? { x: 0, y: 0 };
          const txt = t.text ?? t.string ?? "";
          const size = (t.size && t.size[0]) ?? 10;
          const x = Number(at.x) || 0;
          const y = Number(at.y) || 0;
          return <Text key={i} x={x} y={y} text={String(txt)} fontSize={size} fill="#fff" />;
        })}
      </Group>
    </>
  );
}
