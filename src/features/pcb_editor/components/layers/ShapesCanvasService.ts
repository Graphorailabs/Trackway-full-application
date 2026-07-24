/**
 * ShapesCanvasService
 *
 * Pure helper functions used by `ShapesCanvas.tsx`. Keeping these helpers
 * isolated makes unit testing easier and keeps the assembly component
 * (`ShapesCanvas`) focused on wiring and rendering.
 *
 * Each exported function is small, well-typed, and documented for callers.
 */
import type { Xy } from "trackway-parser-wasm";

/**
 * Update graphic `data` by `kind` applying a translation delta (dx, dy).
 *
 * This function mutates a shallow copy of `data` and returns the new
 * object. It understands the canonical persisted shapes used in the
 * application (rect, circle, line, polygon, arc, text).
 *
 * Example:
 * const moved = updateGraphicDataByKind('rect', rectData, 10, 0);
 */
export function updateGraphicDataByKind(kind: string, data: Record<string, unknown>, dx: number, dy: number) {
  const d: Record<string, unknown> = { ...data };
  switch (kind) {
    case "rect":
      {
        const start = d.start as unknown as number[];
        const end = d.end as unknown as number[];
        d.start = [start[0] + dx, start[1] + dy];
        d.end = [end[0] + dx, end[1] + dy];
      }
      break;
    case "circle":
      {
        const center = d.center as unknown as number[];
        const end = d.end as unknown as number[];
        d.center = [center[0] + dx, center[1] + dy];
        d.end = [end[0] + dx, end[1] + dy];
      }
      break;
    case "line":
      {
        const start = d.start as unknown as number[];
        const end = d.end as unknown as number[];
        d.start = [start[0] + dx, start[1] + dy];
        d.end = [end[0] + dx, end[1] + dy];
      }
      break;
    case "polygon":
      {
        const pts = (d.pts as unknown as { xy?: number[][] })?.xy ?? [];
        d.pts = { xy: pts.map((p) => [p[0] + dx, p[1] + dy]) };
      }
      break;
    case "arc":
      // Canonical arc persisted as { start, mid, end }
      {
        const start = d.start as unknown as number[];
        const mid = d.mid as unknown as number[];
        const end = d.end as unknown as number[];
        d.start = [start[0] + dx, start[1] + dy];
        d.mid = [mid[0] + dx, mid[1] + dy];
        d.end = [end[0] + dx, end[1] + dy];
      }
      break;
    case "text":
      {
        const at = d.at as unknown as { x: number; y: number };
        d.at = { x: at.x + dx, y: at.y + dy };
      }
      break;
    default:
      break;
  }
  return d;
}

/**
 * Compute Konva `Arc` props for the arc preview given the canonical
 * saved center and current pointer position.
 *
 * Returns an object suitable for passing to a Konva `<Arc {...props} />`.
 */
export function computeArcPreviewProps(
  center: Xy,
  arcStartPoint: Xy,
  currentPoint: Xy,
  arcRadius: number,
  toolStrokeWidth: number,
  fill: string,
) {
  const angleOf = (p: Xy) => Math.atan2(p[1] - center[1], p[0] - center[0]);
  const endAng = angleOf(currentPoint);
  const startAng = angleOf(arcStartPoint);
  let sweep = endAng - startAng;
  if (sweep < 0) sweep += Math.PI * 2;
  const startDeg = (startAng * 180) / Math.PI;
  const sweepDeg = (sweep * 180) / Math.PI;
  const innerR = Math.max(0, arcRadius - toolStrokeWidth / 2);
  const outerR = arcRadius + toolStrokeWidth / 2;
  return {
    x: center[0],
    y: center[1],
    innerRadius: innerR,
    outerRadius: outerR,
    angle: sweepDeg,
    rotation: startDeg,
    fill,
  } as const;
}

/**
 * Convert a world-space `textPos` into screen coordinates (DOM overlay).
 */
export function computeInputScreenPos(textPos: Xy | null, camera: { x: number; y: number }, zoom: number, viewportCenter: { x: number; y: number }) {
  if (!textPos) return { x: 0, y: 0 };
  return {
    x: (textPos[0] - camera.x) * zoom + viewportCenter.x,
    y: (textPos[1] - camera.y) * zoom + viewportCenter.y,
  };
}

/**
 * Detect whether a polygon should be considered "closing" by measuring
 * proximity between pointer and the first polygon point.
 */
export function isClosingPolygon(firstPoint: Xy | undefined, worldPos: Xy, zoom: number) {
  if (!firstPoint) return false;
  const dist = Math.sqrt(Math.pow(firstPoint[0] - worldPos[0], 2) + Math.pow(firstPoint[1] - worldPos[1], 2));
  return dist < 5 / zoom;
}
