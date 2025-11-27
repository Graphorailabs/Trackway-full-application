import { Group, Rect, Line, Text } from "react-konva";
// import { useSymbol } from "../context/SymbolContext";

export const SymbolPreviewCanvas = ({symbolData} : any) => {
 // const { symbolData } = useSymbol(); // Read directly from context
  if (!symbolData) return null;

  const SCALE = 5;

  // Extract graphics + pins
  const units = Array.isArray(symbolData) ? symbolData : symbolData.unit ? symbolData.unit : [];

  const graphics: any[] = [];
  const pins: any[] = [];

  units.forEach((u: any) => {
    if (Array.isArray(u.graphics)) graphics.push(...u.graphics);
    if (Array.isArray(u.pin)) pins.push(...u.pin);
  });

  // Compute bounding box for the symbol graphics (used to snap pin inner endpoint)
  const gfxBounds = (() => {
    if (!graphics || graphics.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const addPoint = (x: number, y: number) => {
      const sx = x * SCALE;
      const sy = y * SCALE;
      if (sx < minX) minX = sx;
      if (sy < minY) minY = sy;
      if (sx > maxX) maxX = sx;
      if (sy > maxY) maxY = sy;
    };

    graphics.forEach((g: any) => {
      if (!g || !g.kind) return;
      if (g.kind === 'Rectangle') {
        const { start, end } = g.data;
        addPoint(start[0], start[1]);
        addPoint(end[0], end[1]);
      } else if (g.kind === 'Polyline') {
        const raw = g.data?.pts?.xy || [];
        raw.forEach((pt: any) => addPoint(pt[0], pt[1]));
      }
    });

    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
  })();

  /* NOTE: This preview component is intentionally non-draggable and
     renders its graphics at the local origin. Positioning and dragging
     are handled by the parent (SymbolPlacementTool / placement Group).
  */

  /* ---------------------------------------------------
        GRAPHICS RENDER
  ----------------------------------------------------- */
  const RenderGraphic = ({ g }: any) => {
    if (!g?.kind) return null;

    if (g.kind === "Rectangle") {
      const { start, end, stroke, fill } = g.data;

      return (
        <Rect
          x={start[0] * SCALE}
          y={start[1] * SCALE}
          width={(end[0] - start[0]) * SCALE}
          height={(end[1] - start[1]) * SCALE}
          stroke="black"
          strokeWidth={(stroke?.width || 0.254) * SCALE * 0.3}
          fill={fill?.type === "background" ? "#fff9d9" : ""}
        />
      );
    }

    if (g.kind === "Polyline") {
      const pts = g.data.pts.xy.flat().map((n: number) => n * SCALE);

      return (
        <Line
          points={pts}
          stroke="black"
          strokeWidth={(g.data.stroke?.width || 0.254) * SCALE * 0.45}
        />
      );
    }

    return null;
  };

  /* ---------------------------------------------------
        PIN RENDER
  ----------------------------------------------------- */
  const RenderPin = ({ pin }: any) => {
    const [px_raw, py_raw, rot] = pin.at;
    const px = px_raw * SCALE;
    const py = py_raw * SCALE;

    const PIN_LEN = (pin.length || 1) * SCALE * 1.6;
    const THICK = 0.8;

    // Determine inner attachment point on graphic boundary (ix,iy)
    let ix = px;
    let iy = py;
    if (gfxBounds) {
      if (rot === 0) {
        ix = gfxBounds.maxX;
        iy = py;
      } else if (rot === 180) {
        ix = gfxBounds.minX;
        iy = py;
      } else if (rot === 90) {
        ix = px;
        iy = gfxBounds.maxY;
      } else if (rot === 270) {
        ix = px;
        iy = gfxBounds.minY;
      }
    }

    // Outer end
    let ex = ix;
    let ey = iy;
    if (rot === 0) ex = ix + PIN_LEN;
    else if (rot === 180) ex = ix - PIN_LEN;
    else if (rot === 90) ey = iy + PIN_LEN;
    else if (rot === 270) ey = iy - PIN_LEN;

    const NAME_PAD = 6;
    const NUM_PAD = 8;
    const NUM_INSIDE_X = 6; // small horizontal nudge to move number toward the symbol edge

    let pinNumberX = ex;
    let pinNumberY: number;
    if (rot === 90) {
      pinNumberY = Math.max(iy, ey) + NUM_PAD;
    } else if (rot === 270) {
      pinNumberY = Math.min(iy, ey) - NUM_PAD;
    } else {
      const topY = Math.min(iy, ey);
      pinNumberY = topY - NUM_PAD ;
    }
    // nudge the X position of the pin number slightly toward the symbol
    if (rot === 0) {
      pinNumberX = ex - NUM_INSIDE_X - 10;
    } else if (rot === 180) {
      pinNumberX = ex + NUM_INSIDE_X;
    }

    let pinNameX = ix;
    let pinNameY = iy - 4;
    let nameAlign: 'left' | 'center' | 'right' = 'left';
    if (rot === 0) {
      pinNameX = ix - NAME_PAD - 10; // nudge left for right-facing pins
      nameAlign = 'right';
    } else if (rot === 180) {
      pinNameX = ix + NAME_PAD;
      nameAlign = 'left';
    } else if (rot === 90) {
      pinNameX = ix - 8;
      pinNameY = iy - NAME_PAD - 2;
      nameAlign = 'center';
    } else if (rot === 270) {
      pinNameX = ix - 8;
      pinNameY = iy + NAME_PAD - 2;
      nameAlign = 'center';
    }

    return (
      <>
        <Line points={[ix, iy, ex, ey]} stroke="red" strokeWidth={THICK} />

        <Text
          x={pinNumberX}
          y={pinNumberY}
          text={String(pin.number?.[''] ?? '')}
          fontSize={8}
          fill="red"
          align="center"
        />

        <Text
          x={pinNameX}
          y={pinNameY}
          text={String(pin.name?.[''] ?? '')}
          fontSize={6}
          fill="black"
          align={nameAlign}
        />
      </>
    );
  };

  /* ---------------------------------------------------
        FINAL DRAGGABLE GROUP
  ----------------------------------------------------- */
  return (
    <Group>
      {graphics.map((g, i) => (
        <RenderGraphic key={i} g={g} />
      ))}

      {pins.map((p, i) => (
        <RenderPin key={i} pin={p} />
      ))}
    </Group>
  );
};

