import { useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Text, Group } from "react-konva";

// import { useSymbol } from "../context/SymbolContext";

export const SymbolPreview = ({data} : any) => {
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
//  const { pendingSymbol, setPendingSymbol, addComponent , setSelectedSymbol, selectedSymbol} = useSymbol();
  // const {symbolData} = useSymbol();
  
  // const data = symbolData;
  const SCALE = 6;


  if (!data) return <div>No symbol data found</div>;

  const units = Array.isArray(data) ? data : data.unit ? data.unit : [];

  const graphicsData: any[] = [];
  const pinsData: any[] = [];

  units.forEach((u: any) => {
    if (Array.isArray(u.graphics)) graphicsData.push(...u.graphics);
    if (Array.isArray(u.pin)) pinsData.push(...u.pin);
  });

  // compute bounding box (in pixels after SCALE) so we can center the symbol
  const bbox = (() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const add = (x: number, y: number) => {
      const sx = x * SCALE;
      const sy = y * SCALE;
      if (sx < minX) minX = sx;
      if (sy < minY) minY = sy;
      if (sx > maxX) maxX = sx;
      if (sy > maxY) maxY = sy;
    };

    graphicsData.forEach((g: any) => {
      if (!g || !g.kind) return;
      if (g.kind === 'Rectangle') {
        const { start, end } = g.data;
        add(start[0], start[1]);
        add(end[0], end[1]);
      } else if (g.kind === 'Polyline') {
        const raw = g.data?.pts?.xy || [];
        raw.forEach((pt: any) => add(pt[0], pt[1]));
      }
    });

    // include pins so bbox includes pin lines
    pinsData.forEach((p: any) => {
      const [px, py] = p.at;
      add(px, py);
      // include outer endpoint approx
      const len = (p.length || 1) * SCALE * 1.6;
      const rot = p.at[2];
      if (rot === 0) add(px + len / SCALE, py);
      else if (rot === 180) add(px - len / SCALE, py);
      else if (rot === 90) add(px, py + len / SCALE);
      else if (rot === 270) add(px, py - len / SCALE);
    });

    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
  })();

  // Compute bounding box for the symbol graphics (used to snap pin inner endpoint)
  const gfxBounds = (() => {
    if (!graphicsData || graphicsData.length === 0) return null;
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

    graphicsData.forEach((g: any) => {
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


  
  // -----------------------------
  // GRAPHICS RENDERER
  // -----------------------------
  const RenderGraphics = ({ g }: any) => {
    if (!g || !g.kind) return null;

    // -------- RECTANGLE ----------
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

    // -------- POLYLINE ----------
    if (g.kind === "Polyline") {
      const raw = g.data.pts.xy; // [[x,y],[x,y]...]
      const pts = raw.flat().map((v: number) => v * SCALE);

      return (
        <Line
          points={pts}
          stroke="black"
          strokeWidth={(g.data.stroke?.width || 0.254) * SCALE * 0.45}
          closed={false}
        />
      );
    }

    return null;
  };


  const RenderPin = ({ pin }: any) => {
    const [px_raw, py_raw, rot] = pin.at;
    const px = px_raw * SCALE;
    const py = py_raw * SCALE;

    const PIN_LENGTH_MULTIPLIER = 1.6;
    const PIN_THICKNESS = 0.8;

    const len = (pin.length || 1) * SCALE * PIN_LENGTH_MULTIPLIER;

    // Determine inner attachment point (ix,iy) that should touch the graphic boundary
    let ix = px;
    let iy = py;

    if (gfxBounds) {
      if (rot === 0) {
        // right-facing pin attaches to right edge
        ix = gfxBounds.maxX;
        iy = py;
      } else if (rot === 180) {
        // left-facing pin attaches to left edge
        ix = gfxBounds.minX;
        iy = py;
      } else if (rot === 90) {
        // down-facing -> bottom edge
        ix = px;
        iy = gfxBounds.maxY;
      } else if (rot === 270) {
        // up-facing -> top edge
        ix = px;
        iy = gfxBounds.minY;
      }
    }

    // Outer end of the pin extends from the attachment point
    let ex = ix;
    let ey = iy;
    if (rot === 0) {
      ex = ix + len;
      ey = iy;
    } else if (rot === 180) {
      ex = ix - len;
      ey = iy;
    } else if (rot === 90) {
      ex = ix;
      ey = iy + len;
    } else if (rot === 270) {
      ex = ix;
      ey = iy - len;
    }

    // Text positioning
    const NAME_INSIDE_PAD = 6;
    const NUMBER_OUTSIDE_PAD = 8;

    // const pinNumberX = ex;
    // let pinNumberY: number;
    //  const NAME_PAD = 6;
    // const NUM_PAD = 8;
    const NUM_INSIDE_X = 6; // small horizontal nudge to move number toward the symbol edge

    let pinNumberX = ex;
    let pinNumberY: number;
    // place the pin number outside the symbol for down-facing pins
    if (rot === 90) {
      // down-facing: place number below the outer end
      pinNumberY = Math.max(iy, ey) + NUMBER_OUTSIDE_PAD;
    } else if (rot === 270) {
      // up-facing: place number above the outer end
      pinNumberY = Math.min(iy, ey) - NUMBER_OUTSIDE_PAD;
    } else {
      // left/right: place number above the pin line
      const topY = Math.min(iy, ey);
      pinNumberY = topY - NUMBER_OUTSIDE_PAD;
    }

     if (rot === 0) {
      pinNumberX = ex - NUM_INSIDE_X - 10;
    } else if (rot === 180) {
      pinNumberX = ex + NUM_INSIDE_X;
    }
    let pinNameX = ix;
    let pinNameY = iy;
    let nameAlign: 'left' | 'center' | 'right' = 'left';

    if (rot === 0) {
      // nudge right-facing pin names further left so they don't overlap the pin
      pinNameX = ix - NAME_INSIDE_PAD - 15;
      pinNameY = iy - 4;
      nameAlign = 'right';
    } else if (rot === 180) {
      pinNameX = ix + NAME_INSIDE_PAD;
      pinNameY = iy - 4;
      nameAlign = 'left';
    } else if (rot === 90) {
      pinNameX = ix - 8;
      pinNameY = iy - NAME_INSIDE_PAD - 2;
      nameAlign = 'center';
    } else if (rot === 270) {
      pinNameX = ix - 8;
      pinNameY = iy + NAME_INSIDE_PAD - 2;
      nameAlign = 'center';
    }

    return (
      <>
        {/* Pin line: draws from inner attachment (ix,iy) to outer end (ex,ey) */}
        <Line points={[ix, iy, ex, ey]} stroke="red" strokeWidth={PIN_THICKNESS} />

        {/* Pin number (always above the pin) */}
        <Text
          x={pinNumberX}
          y={pinNumberY}
          text={String(pin.number?.[''] ?? '')}
          fontSize={8}
          fill="red"
          align="center"
        />

        {/* Pin name (kept inside the symbol body) */}
        <Text
          x={pinNameX}
          y={pinNameY}
          text={String(pin.name?.[''] ?? '')}
          fontSize={6}
          fill="green"
          align={nameAlign}
        />
      </>
    );
  };


  const stageWidth = window.innerWidth * 0.7;
  const stageHeight = window.innerHeight * 0.7;

  const handleWheel = (e: any) => {
  e.evt.preventDefault();

  const stage = stageRef.current;
  const pointer = stage.getPointerPosition();

  const oldScale = scale;
  const scaleBy = 1.05;

  const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

  const mousePointTo = {
    x: (pointer.x - stagePos.x) / oldScale,
    y: (pointer.y - stagePos.y) / oldScale,
  };

  setScale(newScale);
  setStagePos({
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  });
};
  return (
    <Stage
     ref={stageRef} 
     listening={false} 
     width={stageWidth} 
     height={stageHeight} 
     draggable scaleX={scale} 
     scaleY={scale} 
     x={stagePos.x} 
     y={stagePos.y}
      className="bg-white" 
       onWheel={handleWheel}
      >
      <Layer>
        <Group x={stageWidth / 2} y={stageHeight / 2} offsetX={bbox ? (bbox.minX + bbox.maxX) / 2 : 0} offsetY={bbox ? (bbox.minY + bbox.maxY) / 2 : 0}>
          {/* GRAPHICS */}
          {graphicsData.map((g, i) => (
            <RenderGraphics key={i} g={g} />
          ))}

          {/* PINS */}
          {pinsData.map((p, i) => (
            <RenderPin key={i} pin={p} />
          ))}
        </Group>
      </Layer>
    </Stage>
  );
};
