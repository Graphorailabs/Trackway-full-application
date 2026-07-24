/**
 * ShapesLayer
 *
 * Top-level Konva layer responsible for rendering PCB graphics and handling
 * user interactions (mouse down / move / up) for drawing shapes. This file
 * intentionally keeps rendering minimal and imports render helpers from
 * `ShapesRenderer` so behavior and rendering can evolve independently.
 *
 * Responsibilities:
 * - Convert pointer events into world coordinates and invoke the drawing
 *   lifecycle exposed by `ShapeContext` (startDrawing/updateDrawing/finishDrawing).
 * - Render existing `pcb.graphics` items (filtered by `LayerContext` visibility).
 * - Provide a DOM text overlay for the text tool that converts screen/world
 *   coordinates so text can be typed using a normal HTML input.
 * - Render small preview helpers (dimensions label, preview shapes).
 *
 * Integration points for future contributors:
 * - To add a new tool: implement creation logic in `ShapeContext`, add UI in
 *   the tool modal, and update `ShapesRenderer` with the rendering for the
 *   new `PcbGraphicItem` kind. Keep `ShapesLayer` responsible only for
 *   wiring and coordinate conversion.
 */
import ShapesCanvas from "./ShapesCanvas";

/**
 * ShapesLayer (wrapper)
 *
 * This file is intentionally minimal: it provides the historical named
 * `ShapesLayer` export so other modules in the codebase can continue
 * importing `ShapesLayer` while the heavy interaction and rendering
 * implementation has been extracted into `ShapesCanvas.tsx` and related
 * helpers/components.

 * Responsibilities:
 * - Preserve the public symbol `ShapesLayer` for backwards compatibility.
 * - Delegate all rendering and input handling to `ShapesCanvas`.
 *
 * Where to look next:
 * - `ShapesCanvas.tsx` — assembly of subcomponents and the main interaction
 *   wiring for shape tools (drawing, preview, selection, context menu).
 * - `ShapesCanvasService.ts` — pure helper functions used by `ShapesCanvas`.
 * - `CanvasStage.tsx` — small wrapper around Konva `Stage` to centralize
 *   transform/viewport wiring.
 *
 * Extension notes:
 * - To add a new tool, implement creation lifecycle functions in
 *   `ShapeContext`, add rendering in `ShapesRenderer.tsx`, and adjust
 *   `ShapesCanvas` preview logic as needed. Keep this wrapper unchanged.
 */
export function ShapesLayer() {
  return <ShapesCanvas />;
}

export default ShapesLayer;
