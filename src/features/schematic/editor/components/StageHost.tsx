import { type PropsWithChildren, useEffect, useRef } from "react";
import { Stage } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useStage } from "../context/stageProvider";
import { useZoom } from "../context/ZoomContext";

type StageHostProps = PropsWithChildren<{
  className?: string;
  style?: React.CSSProperties; // give it a height!
  draggable?: boolean;         // allow panning by dragging the stage
  enableWheelZoom?: boolean;
}>;

export default function StageHost({
  children,
  className,
  // style,
  draggable = false,
  enableWheelZoom = true,
}: StageHostProps) {
  const { stageRef, state, setSize, setPosition } = useStage();
  const zoom = useZoom();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep Stage sized to its container (responsive)
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(width, height);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [setSize]);

  // Optional: zoom around pointer with wheel (attach to Stage, not div, to avoid passive listeners)
  const handleStageWheel = (e: KonvaEventObject<WheelEvent>) => {
    if (!enableWheelZoom || !stageRef.current) return;
    e.evt.preventDefault();
    const stage = stageRef.current;
    const scaleBy = zoom.scaleStep;
    const oldScale = zoom.scale;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - state.position.x) / oldScale,
      y: (pointer.y - state.position.y) / oldScale,
    };

  const direction = e.evt.deltaY > 0 ? -1 : 1;
  let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
  newScale = zoom.clamp(newScale);
    
    // Only update if scale actually changed (within limits)
    if (newScale === oldScale) return;

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

  zoom.setScale(newScale);
    setPosition(newPos);
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", border: "1px solid #ddd", background: "white",  }}
    >
      {state.width > 0 && state.height > 0 && (
        <Stage
          ref={stageRef}
          width={state.width}
          height={state.height}
          scaleX={state.scale}
          scaleY={state.scale}
          x={state.position.x}
          y={state.position.y}
          draggable={draggable}
          style={{ background: "white" }}
          onWheel={handleStageWheel}
         
        >
          {children /* <Layer> ... </Layer> from anywhere below */}
        </Stage>
      )}
    </div>
  );
}
