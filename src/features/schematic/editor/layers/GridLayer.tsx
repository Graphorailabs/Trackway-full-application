import { Layer, Rect } from "react-konva";
import { useMemo } from "react";
import { useGrid } from "../context/GridContext";
import { useStage } from "../context/stageProvider";
import { useDotPattern } from "../hooks/useDotPattern";

export default function GridLayer() {
  const { visible, dotRadius, dotColor, dotOpacity, getEffectiveStep } = useGrid();
  const { state } = useStage(); // { width, height, scale, position:{x,y} }
  
  // Calculate effective step based on current zoom level
  const effectiveStep = getEffectiveStep(state.scale);
  const { image: patternImage, ready: patternReady } = useDotPattern({ step: effectiveStep, dotRadius, dotColor, dotOpacity });

  // Keep offsets in WORLD units so dots stay anchored while panning
  const { offsetX, offsetY, shouldRender } = useMemo(() => {
    const posMod = (v: number, m: number) => ((v % m) + m) % m;

    // Convert screen-space stage translation to world-space shift
    const worldShiftX = -state.position.x / state.scale;
    const worldShiftY = -state.position.y / state.scale;

    const offsetX = posMod(worldShiftX, effectiveStep);
    const offsetY = posMod(worldShiftY, effectiveStep);

    // Always render when visible - let the grid scale naturally with zoom
    const shouldRender = true;

    return { offsetX, offsetY, shouldRender };
  }, [state.position.x, state.position.y, state.scale, effectiveStep]);

  if (!visible || !shouldRender) return null;

  // World-space coverage so the grid stays consistent while zooming/panning
  const worldWidth = state.width / state.scale;
  const worldHeight = state.height / state.scale;
  const worldLeft = -state.position.x / state.scale;
  const worldTop = -state.position.y / state.scale;
  const padding = Math.max(effectiveStep * 2, 100);
  const gridX = worldLeft - padding;
  const gridY = worldTop - padding;
  const gridWidth = worldWidth + padding * 2;
  const gridHeight = worldHeight + padding * 2;

  return (
    <Layer listening={false}>
      <Rect
        key={`grid-${effectiveStep}-${state.scale}-${patternReady ? 1 : 0}`}
        x={gridX}
        y={gridY}
        width={gridWidth}
        height={gridHeight}
        fill={patternReady ? undefined : "white"}
        fillPatternImage={patternReady ? patternImage! : undefined}
        fillPatternRepeat={patternReady ? "repeat" : undefined}
        // Important: DO NOT set fillPatternScaleX/Y here (let it be 1)
        // Our tile draws dot at tile center
        fillPatternOffsetX={offsetX + effectiveStep / 2}
        fillPatternOffsetY={offsetY + effectiveStep / 2}
        perfectDrawEnabled={false}
      />

    
        

        
       
    </Layer>
  );
}
