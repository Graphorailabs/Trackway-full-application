import { useMemo } from "react";
import { Group, Rect, Circle, Text } from "react-konva";
import FootprintGraphicLine from "./components/FootprintGraphicLine";
import FootprintGraphicCircle from "./components/FootprintGraphicCircle";
import FootprintGraphicText from "./components/FootprintGraphicText";
import FootprintGraphicArc from "./components/FootprintGraphicArc";
import FootprintGraphicRect from "./components/FootprintGraphicRect";
import FootprintGraphicPolygon from "./components/FootprintGraphicPolygon";
import type { Footprint } from "trackway-parser-wasm";

type Props = {
  model: Footprint;
  scale?: number; // mm -> px scale (Stage scale is applied outside)
};

export default function FootprintKonvaRenderer({ model }: Props) {
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
          const at = p.at ?? { x: 0, y: 0 };
          const sizeArr = p.size ?? [1, 1];
          const sx = Number(at.x) || 0;
          const sy = Number(at.y) || 0;
          const w = Number(sizeArr[0]) || 1;
          const h = Number(sizeArr[1]) || w;
          const shape = (p.shape ?? "rect") as string;
          if (shape === "circle" || shape === "round") {
            const r = Math.max(w, h) / 2;
            return <Circle key={i} x={sx} y={sy} radius={r} fill="#d9d9d9" stroke="#444" strokeWidth={0.2} />;
          }
          return (
            <Rect
              key={i}
              x={sx - w / 2}
              y={sy - h / 2}
              width={w}
              height={h}
              fill="#d9d9d9"
              stroke="#444"
              strokeWidth={0.2}
            />
          );
        })}

        {graphics.map((g: any, i: number) => {
          if (!g || !g.kind) return null;
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
