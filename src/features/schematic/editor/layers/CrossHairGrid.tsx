// GridLayer.tsx (Optimized & Smooth)
import { Layer, Line } from "react-konva";
import React, { useMemo } from "react";
import { useStage } from "../context/stageProvider";
import { GridContext } from "../context/GlobalGrid";

function CrossHairGrid() {
  const { state } = useStage();
  const { width, height, scale, position } = state;

  // ✅ Reduce scale precision to avoid excessive re-renders
  const zoom = Math.round(scale * 100) / 100;

  const BASE_MINOR = 10;
  const MAJOR_MULTIPLIER = 10;

 let worldMinor = BASE_MINOR; // default for zoom >= 1

    if (zoom < 0.25) {
      worldMinor = BASE_MINOR * 10;  // ultra zoom-out → bigger spacing
    } else if (zoom < 0.5) {
      worldMinor = BASE_MINOR * 5;   // far zoom-out
    } else if (zoom < 0.75) {
      worldMinor = BASE_MINOR * 2;   // mid zoom-out
    } else if (zoom < 1) {
      worldMinor = BASE_MINOR * 1.5; // slightly zoomed-out
    } else if (zoom > 1.5) {
      worldMinor = BASE_MINOR / 2;   // zoomed-in
    } else if (zoom > 2.5) {
      worldMinor = BASE_MINOR / 4;   // extra zoom-in
    }


  const worldMajor = worldMinor * MAJOR_MULTIPLIER;
  const screenMinor = worldMinor * zoom;
  const screenMajor = worldMajor * zoom;

  // ✅ Draw within expanded view, avoids infinite grid causes lag
  const PADDING = 3000;
  const viewW = width + PADDING * 2;
  const viewH = height + PADDING * 2;

  const originX = -position.x - PADDING;
  const originY = -position.y - PADDING;

  return useMemo(() => {
    const minorLines: React.ReactElement[] = [];
    const majorLines: React.ReactElement[] = [];

    // ✅ Only draw minors if visible enough
    if (screenMinor > 4) {
      const cols = Math.ceil(viewW / screenMinor);
      const rows = Math.ceil(viewH / screenMinor);

      for (let i = 0; i <= cols; i++) {
        const x = originX + i * screenMinor;
        minorLines.push(
          <Line
            key={`mnv-${i}`}
            points={[x, originY, x, originY + viewH]}
            stroke="#c0bdc5ff"
            strokeWidth={0.4}
            listening={false}
          />
        );
      }
      for (let j = 0; j <= rows; j++) {
        const y = originY + j * screenMinor;
        minorLines.push(
          <Line
            key={`mnh-${j}`}
            points={[originX, y, originX + viewW, y]}
            stroke="#bfc2c3ff"
            strokeWidth={0.4}
            listening={false}
          />
        );
      }
    }

    // ✅ Draw major lines everywhere
    const majorCols = Math.ceil(viewW / screenMajor);
    const majorRows = Math.ceil(viewH / screenMajor);

    for (let i = 0; i <= majorCols; i++) {
      const x = originX + i * screenMajor;
      majorLines.push(
        <Line
          key={`mjv-${i}`}
          points={[x, originY, x, originY + viewH]}
          stroke="#959595ff"
          strokeWidth={1}
          listening={false}
        />
      );
    }

    for (let j = 0; j <= majorRows; j++) {
      const y = originY + j * screenMajor;
      majorLines.push(
        <Line
          key={`mjh-${j}`}
          points={[originX, y, originX + viewW, y]}
          stroke="#959595ff"
          strokeWidth={1}
          listening={false}
        />
      );
    }

    return (
      <GridContext.Provider value={{gridStep: worldMinor}}>
      <Layer listening={false} t pransformsEnabled="position">
        {minorLines}
        {majorLines}
      </Layer>
      </GridContext.Provider>
    );
  }, [originX, originY, viewW, viewH, screenMinor, screenMajor]);
}

// ✅ Prevent unnecessary React re-renders
export default React.memo(CrossHairGrid);
