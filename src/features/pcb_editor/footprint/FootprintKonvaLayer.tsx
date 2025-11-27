import  { useMemo } from "react";
import {  Group, Rect, Circle, Line, Text } from "react-konva";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";

// Footprint Konva renderer that returns Konva nodes to be placed inside the
// shared `Stage` used by `ShapesCanvas`.
export default function FootprintKonvaLayer() {
  const { pcb } = usePcb();

  const footprints = pcb.footprints ?? [];

  const groups = useMemo(() => {
    return footprints.map((fp) => {
      const at = (fp.at ?? { x: 0, y: 0, angle: 0 }) as { x?: number; y?: number; angle?: number };
      const x = at.x ?? 0;
      const y = at.y ?? 0;
      const angle = at.angle ?? 0;
      const pads = (fp.pads ?? []) as Array<any>;
      const graphics = (fp.graphics ?? []) as Array<any>;
      const texts = (fp.texts ?? []) as Array<any>;
      return { uuid: fp.uuid, x, y, angle, pads, graphics, texts };
    });
  }, [footprints]);

  return (
    <>
      {groups.map((g) => (
        <Group key={g.uuid} x={g.x} y={g.y} rotation={(g.angle ?? 0) * (180 / Math.PI)}>
          {/* Pads */}
          {g.pads.map((p: any, i: number) => {
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

          {/* Simple graphics: lines */}
          {g.graphics.map((line: any, i: number) => {
            if (!line || !line.kind) return null;
            if (line.kind === "line") {
              const s = line.start ?? { x: 0, y: 0 };
              const e = line.end ?? { x: 0, y: 0 };
              const sx = Number(s.x) || 0;
              const sy = Number(s.y) || 0;
              const ex = Number(e.x) || 0;
              const ey = Number(e.y) || 0;
              return <Line key={i} points={[sx, sy, ex, ey]} stroke="#fff" strokeWidth={(line.width ?? 0.5) as number} />;
            }
            if (line.kind === "polygon" && Array.isArray(line.pts)) {
              const pts: number[] = [];
              for (const pt of line.pts) {
                const x = Number(pt[0] ?? pt.x) || 0;
                const y = Number(pt[1] ?? pt.y) || 0;
                pts.push(x, y);
              }
              if (pts.length >= 4) return <Line key={i} points={pts} closed stroke="#fff" strokeWidth={(line.width ?? 0.2) as number} />;
            }
            if (line.kind === "rect" && line.start && line.end) {
              const sx = Number(line.start.x) || 0;
              const sy = Number(line.start.y) || 0;
              const ex = Number(line.end.x) || 0;
              const ey = Number(line.end.y) || 0;
              const x = Math.min(sx, ex);
              const y = Math.min(sy, ey);
              const w = Math.abs(ex - sx);
              const h = Math.abs(ey - sy);
              return <Rect key={i} x={x} y={y} width={w} height={h} stroke="#fff" strokeWidth={(line.width ?? 0.2) as number} />;
            }
            if (line.kind === "circle" && line.center && line.end) {
              const cx = Number(line.center.x) || 0;
              const cy = Number(line.center.y) || 0;
              const ex = Number(line.end.x) || 0;
              const ey = Number(line.end.y) || 0;
              const r = Math.hypot(ex - cx, ey - cy) || 0;
              return <Circle key={i} x={cx} y={cy} radius={r} stroke="#fff" strokeWidth={(line.width ?? 0.2) as number} />;
            }
            return null;
          })}

          {/* Texts */}
          {g.texts.map((t: any, i: number) => {
            const at = t.at ?? { x: 0, y: 0 };
            const txt = t.text ?? t.string ?? "";
            const size = (t.size && t.size[0]) ?? 10;
            const x = Number(at.x) || 0;
            const y = Number(at.y) || 0;
            return <Text key={i} x={x} y={y} text={String(txt)} fontSize={size} fill="#fff" />;
          })}
        </Group>
      ))}
    </>
  );
}
