// DottedGrid.tsx
import { Layer, Rect } from "react-konva";
import { useMemo } from "react";
import { useStage } from "../context/stageProvider";

export default function DottedGrid() {
  const { state } = useStage();
  const { width, height, scale, position } = state;

  // WORLD SPACING (virtual units)
  const MINOR_WORLD = 10; // 10px grid base
  const MAJOR_EVERY = 10; // 10 minor → 1 major dot

  // Adjust dot visibility based on zoom
  const worldMinor = MINOR_WORLD;
  const screenMinor = worldMinor * scale;
  const screenMajor = screenMinor * MAJOR_EVERY;

  // Dot sizes (scale-aware)
  const minorDotSize = Math.max(0.6 * scale, 0.5);
  const majorDotSize = Math.max(1.2 * scale, 1);

  // Hide minor dots when too tiny
  const showMinor = screenMinor > 3;

  // Large drawing range to fill screen during pan
  const LONG = 10000;

  // Calculate offset for grid wrapping
  const offsetX = ((-position.x) % screenMinor + screenMinor) % screenMinor - LONG;
  const offsetY = ((-position.y) % screenMinor + screenMinor) % screenMinor - LONG;

  // Count number of dots to draw
  const countX = Math.ceil((width + LONG * 2) / screenMinor);
  const countY = Math.ceil((height + LONG * 2) / screenMinor);

  const dots = useMemo(() => {
    const arr: React.ReactElement[] = [];
    let id = 0;

    for (let i = 0; i < countX; i++) {
      for (let j = 0; j < countY; j++) {
        const x = offsetX + i * screenMinor;
        const y = offsetY + j * screenMinor;

        // Major dot every 10 minor
        const isMajor = (i % MAJOR_EVERY === 0) && (j % MAJOR_EVERY === 0);

        if (!isMajor && !showMinor) continue; // hide minor if too zoomed out

        arr.push(
          <Rect
            key={`dot-${id++}`}
            x={x - minorDotSize / 2}
            y={y - minorDotSize / 2}
            width={isMajor ? majorDotSize : minorDotSize}
            height={isMajor ? majorDotSize : minorDotSize}
            fill={isMajor ? "#555555" : "#A9A9A9"} // Light theme colors
            listening={false}
          />
        );
      }
    }

    return arr;
  }, [countX, countY, offsetX, offsetY, screenMinor, majorDotSize, minorDotSize, showMinor]);

  return (
    <Layer listening={false} transformsEnabled="position">
      {dots}
    </Layer>
  );
}
