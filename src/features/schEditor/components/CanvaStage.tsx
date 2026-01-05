/**
 * CanvasStage
 *
 * Small wrapper around Konva `Stage` that centralizes viewport transform
 * wiring and provides a single place to pass pointer event handlers.
 *
 * Rationale:
 * - Keeping transform logic here avoids duplicating `scaleX/scaleY/x/y`
 *   calculations across the codebase and makes it easy to test the
 *   viewport math.
 * - This component is intentionally tiny so it can be reused by other
 *   canvas-like features without bringing heavy logic.
 */
import { Stage } from "react-konva";
import React, { useRef, useEffect } from "react";
import type { KonvaEventObject } from "konva/lib/Node";

type Props = {
  width: number;
  height: number;
  zoom: number;
  viewportCenter: { x: number; y: number };
  camera: { x: number; y: number };
  onMouseDown?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp?: (e: KonvaEventObject<MouseEvent>) => void;
  onContextMenu?: (e: KonvaEventObject<MouseEvent>) => void;
  children?: React.ReactNode;
};

export default function CanvasStage({ width, height, zoom, viewportCenter, camera, onMouseDown, onMouseMove, onMouseUp, onContextMenu, children }: Props) {
  const stageRef = useRef<any>(null);
  useEffect(() => {
    try {
      // expose a small helper so other modules can force a Konva redraw
      // when needed (some environments require an explicit batchDraw).
      (window as any).__trackway_stage = stageRef.current;
      (window as any).__trackway_batch_draw = () => { try { stageRef.current?.batchDraw(); } catch (err) {} };
    } catch (err) {}
    return () => {
      try { delete (window as any).__trackway_batch_draw; delete (window as any).__trackway_stage; } catch (err) {}
    };
  }, []);

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
      x={viewportCenter.x - camera.x * zoom}
      y={viewportCenter.y - camera.y * zoom}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={onContextMenu}
    >
      {children}
    </Stage>
  );
}
