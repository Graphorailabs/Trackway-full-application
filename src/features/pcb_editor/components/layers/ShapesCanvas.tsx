/**
 * ShapesCanvas
 *
 * Central assembly component for PCB shape rendering and interaction.
 *
 * Overview
 * - This module owns the top-level canvas area used by PCB editing tools.
 * - It assembles small, focused subcomponents (e.g. `CanvasStage`,
 *   `SelectionHighlight`, `SelectionContextMenu`, `TextOverlay`) and uses
 *   pure helper functions in `ShapesCanvasService` to keep logic testable
 *   and maintainable.
 *
 * Responsibilities
 * - Wire viewport transforms (provided by `useCameraViewport`) into the
 *   Konva `Stage` transform so stage coordinates map to PCB world coords.
 * - Convert pointer events into the drawing lifecycle exposed by
 *   `useShapeContext()` (startDrawing, updateDrawing, finishDrawing,
 *   advanceArcToSweep, addPolygonPoint, resetDrawing).
 * - Render persisted graphics (via `ShapesRenderer.renderShape`) and
 *   drawing previews (`renderPreviewShape`) that exactly match persisted
 *   render rules (important for arcs, text overlays and stroke widths).
 * - Handle selection interactions (select, drag/move, context menu) using
 *   `useSelection()` rather than packing selection into `ToolContext`.
 *
 * Key integration points
 * - Providers required: `useCameraViewport`, `useShapeContext`,
 *   `useToolContext`, `usePcb`, `useLayers`, `useSelection`.
 * - Persisted shape types are canonicalized against
 *   `pkg/trackway_parser_wasm.d.ts` (e.g. `GraphicArc` is persisted as
 *   `{ start, mid, end, layer, width, uuid }`). Renderer computes angles
 *   at render-time from this canonical representation.
 *
 * Extending the canvas
 * - Add a new tool: implement drawing lifecycle in `ShapeContext`, add
 *   render support in `ShapesRenderer.tsx`, and add any preview helpers
 *   here in `ShapesCanvas` (prefer small helper functions in
 *   `ShapesCanvasService.ts`).
 * - Keep interaction handlers small: move pure logic into
 *   `ShapesCanvasService` and keep `ShapesCanvas` focused on assembling
 *   subcomponents and passing handlers/props.
 */
import { Layer, Text, Arc } from "react-konva";
import { useCameraViewport } from "@/features/pcb_editor/components/canvas/CameraViewport";
import { useMeasurementSafe } from "@/features/pcb_editor/contexts/MeasurementContext";
import { useShapeContext } from "../../contexts/ShapeContext";
import { useToolContext } from "../../contexts/ToolContext";
import { usePcb } from "../../contexts/PcbContext";
import { useLayers } from "../../contexts/LayerContext";
// footprint preview hook not needed here now
import type { Xy } from "trackway-parser-wasm";
import { renderShape, renderPreviewShape } from "./ShapesRenderer";

import { getDimensionsText } from "@/features/pcb_editor/utils/shapeUtils";
import SelectionHighlight from "./SelectionHighlight";
import SelectionContextMenu from "./SelectionContextMenu";
import TextOverlay from "./TextOverlay";
import CanvasStage from "./CanvasStage";
import GridDebugOverlay from "../canvas/GridDebugOverlay";
// Footprint rendering moved to a dedicated canvas `FootprintCanvas`.
import {
	computeArcPreviewProps,
	computeInputScreenPos,
} from "./ShapesCanvasService";
import useShapesCanvasLogic from "./hooks/useShapesCanvasLogic";
export default function ShapesCanvas() {

    const DEFAULT_STROKE = "#d32f2f";
	const DEFAULT_WIDTH = 0.25;
	const { camera, zoom, viewportCenter } = useCameraViewport();
	const measurement = useMeasurementSafe();
	const {
		isDrawing,
		startPoint,
		currentPoint,
		polygonPoints,
		arcPhase,
		arcStartPoint,
		arcRadius,
	} = useShapeContext();
	const { pcb } = usePcb();
	const { tool, textEffects: defaultTextEffects, strokeWidth: toolStrokeWidth } = useToolContext();
	const { visibility } = useLayers();
	const {
		containerRef,
		size,
		showTextInput,
		textPos,
		textInput,
		setTextInput,
		handleTextInputKeyDown,
		overlayEffects,
		setOverlayEffects,
		overlayColor,
		setOverlayColor,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
	} = useShapesCanvasLogic();
    // Always allow pointer events on the shapes canvas so drawing tools work.
    // Footprint canvas will only accept pointer events during preview.
    const pointerEvents = "auto";
    const zIndex = 20;

	// pointer down/up/move handled by hook

	// Note: text input keydown handler is provided by the hook (`handleTextInputKeyDown`).

	// Mouse handlers are provided by the hook: `handleMouseDown`, `handleMouseMove`, `handleMouseUp`.

	// Mouse up handled by hook.

	// Keyboard and context menu behavior handled inside the hook.

	const inputScreenPos = textPos
		? computeInputScreenPos(textPos, camera, zoom, viewportCenter)
		: { x: 0, y: 0 };

	return (
        <div className="absolute inset-0" style={{ pointerEvents, zIndex }} ref={containerRef}>
            <GridDebugOverlay />
            <TextOverlay
                showTextInput={showTextInput}
                textPos={textPos}
                inputScreenPos={inputScreenPos}
                textInput={textInput}
                setTextInput={setTextInput}
                handleTextInputKeyDown={handleTextInputKeyDown}
                overlayEffects={overlayEffects}
                setOverlayEffects={setOverlayEffects}
                overlayColor={overlayColor}
                setOverlayColor={setOverlayColor}
            />
            <CanvasStage
                width={size.width}
                height={size.height}
                zoom={zoom}
                viewportCenter={viewportCenter}
                camera={camera}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <Layer>
                    {pcb.graphics
                        ?.filter((item) => {
                                const layer = (item.data as unknown as { layer?: string })?.layer as string | undefined;
                                if (!layer) return true;
                                return !!visibility[layer];
                            })
                        .map(renderShape)}
                    <SelectionHighlight />
                    {/* Konva preview of the text currently being edited so the DOM input matches world rendering */}
                    {showTextInput && textPos && (
                        <Text
                            x={textPos[0]}
                            y={textPos[1]}
                            text={textInput || ""}
                            fontSize={(overlayEffects?.font?.size?.[0]) ?? (defaultTextEffects?.font?.size?.[0]) ?? 16}
                            fontStyle={`${(overlayEffects?.font?.bold ?? defaultTextEffects?.font?.bold) ? "bold" : "normal"} ${(overlayEffects?.font?.italic ?? defaultTextEffects?.font?.italic) ? "italic" : "normal"}`}
                            fill={overlayColor}
                            listening={false}
                        />
                    )}
                    {isDrawing && currentPoint && (
                        <>
                            {(tool === "polygon" && polygonPoints && polygonPoints.length > 0)
                                ? renderPreviewShape(
                                    tool,
                                    polygonPoints[0],
                                    currentPoint,
                                    polygonPoints,
                                    [],
                                    DEFAULT_STROKE,
                                    toolStrokeWidth,
                                )
                                : (tool === "arc" && isDrawing)
                                    ? (
                                        arcPhase === "circle" && startPoint
                                            ? renderPreviewShape("circle", startPoint, currentPoint, [], [], DEFAULT_STROKE, toolStrokeWidth)
                                        : (arcPhase === "sweep" && arcStartPoint && arcRadius && startPoint)
                                            ? (() => {
                                                const props = computeArcPreviewProps(startPoint as Xy, arcStartPoint as Xy, currentPoint as Xy, arcRadius as number, Number(toolStrokeWidth), DEFAULT_STROKE);
                                                return <Arc {...props} />;
                                            })()
                                            : null
                                    )
                                : (startPoint && currentPoint)
                                    ? renderPreviewShape(tool, startPoint, currentPoint, [], [], DEFAULT_STROKE, DEFAULT_WIDTH)
                                    : null}

                            {(startPoint && currentPoint)
                                            ? (() => {
                                                let label = "";
                                                if (tool === "arc") {
                                                    if (arcPhase === "circle") {
                                                        const dx = startPoint[0] - currentPoint[0];
                                                        const dy = startPoint[1] - currentPoint[1];
                                                        const mm = Math.sqrt(dx * dx + dy * dy);
                                                        label = `R: ${measurement.formatLength(mm)}`;
                                                    } else if (arcPhase === "sweep") {
                                                        if (typeof arcRadius === "number") {
                                                            label = `R: ${measurement.formatLength(arcRadius)}`;
                                                        } else if (arcStartPoint) {
                                                            const dx = startPoint[0] - arcStartPoint[0];
                                                            const dy = startPoint[1] - arcStartPoint[1];
                                                            const mm = Math.sqrt(dx * dx + dy * dy);
                                                            label = `R: ${measurement.formatLength(mm)}`;
                                                        }
                                                    }
                                                } else {
                                                    // format other tools' dimension values with units
                                                    const dx = Math.abs(startPoint[0] - currentPoint[0]);
                                                    const dy = Math.abs(startPoint[1] - currentPoint[1]);
                                                    switch (tool) {
                                                        case "rect":
                                                            label = `W: ${measurement.formatLength(dx)} H: ${measurement.formatLength(dy)}`;
                                                            break;
                                                        case "circle": {
                                                            const r = Math.sqrt(dx * dx + dy * dy);
                                                            label = `R: ${measurement.formatLength(r)}`;
                                                            break;
                                                        }
                                                        case "line": {
                                                            const len = Math.sqrt(dx * dx + dy * dy);
                                                            label = `L: ${measurement.formatLength(len)}`;
                                                            break;
                                                        }
                                                        default:
                                                            label = getDimensionsText(tool, startPoint, currentPoint);
                                                    }
                                                }
                                                return label ? (
                                                    <Text
                                                        x={currentPoint[0]}
                                                        y={currentPoint[1]}
                                                        offsetX={-10}
                                                        offsetY={-10}
                                                        text={label}
                                                        fontSize={12 / zoom}
                                                        fill="white"
                                                    />
                                                ) : null;
                                            })()
                            : null}
                        </>
                    )}
                </Layer>
                {/* Footprint rendering moved to `FootprintCanvas` (separate Stage). */}
            </CanvasStage>
            <SelectionContextMenu />
        </div>
    );
}
