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
import React from "react";
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
  children?: React.ReactNode;
};

export default function CanvasStage({ width, height, zoom, viewportCenter, camera, onMouseDown, onMouseMove, onMouseUp, children }: Props) {
  return (
    <Stage
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
      x={viewportCenter.x - camera.x * zoom}
      y={viewportCenter.y - camera.y * zoom}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {children}
    </Stage>
  );
}
