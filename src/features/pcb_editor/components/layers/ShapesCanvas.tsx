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
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { useShapeContext } from "../../contexts/ShapeContext";
import { useToolContext } from "../../contexts/ToolContext";
import { usePcb } from "../../contexts/PcbContext";
import { useLayers } from "../../contexts/LayerContext";
import { DEFAULT_SHAPE_STROKE, DEFAULT_SHAPE_WIDTH, ENABLE_SNAP_TO_VISIBLE_GRID } from "@/features/pcb_editor/constants";
import { useGrid } from "@/features/pcb_editor/contexts/GridContext";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Xy, TextEffects } from "trackway-parser-wasm";
import { renderShape, renderPreviewShape } from "./ShapesRenderer";
import { useSelection } from "../../contexts/SelectionContext";
import { getDimensionsText } from "@/features/pcb_editor/utils/shapeUtils";
import SelectionHighlight from "./SelectionHighlight";
import SelectionContextMenu from "./SelectionContextMenu";
import TextOverlay from "./TextOverlay";
import CanvasStage from "./CanvasStage";
import GridDebugOverlay from "../canvas/GridDebugOverlay";
import FootprintKonvaLayer from "@/features/pcb_editor/footprint/FootprintKonvaLayer";
import {
	updateGraphicDataByKind,
	computeArcPreviewProps,
	computeInputScreenPos,
} from "./ShapesCanvasService";

export default function ShapesCanvas() {
	const { camera, zoom, viewportCenter, screenToWorld } = useCameraViewport();
	const measurement = useMeasurementSafe();
	const {
		isDrawing,
		startPoint,
		currentPoint,
		polygonPoints,
		arcPhase,
		arcStartPoint,
		arcRadius,
		startDrawing,
		addPolygonPoint,
		advanceArcToSweep,
		updateDrawing,
		finishDrawing,
		resetDrawing,
	} = useShapeContext();
	const { pcb, addGraphicItem, updatePcb } = usePcb();
	const { minorSpacing, renderMinorPx } = useGrid();
	const { selectedUuid, select, clear, openContextMenu } = useSelection();

	// dragging state for selection tool
	const draggingRef = useRef(false);
	const dragLastPosRef = useRef<[number, number] | null>(null);
	const { tool, textEffects: defaultTextEffects, strokeWidth: toolStrokeWidth } = useToolContext();
	// Local aliases
	const DEFAULT_STROKE = DEFAULT_SHAPE_STROKE;
	const DEFAULT_WIDTH = DEFAULT_SHAPE_WIDTH;
	const { selectedLayerId, visibility } = useLayers();
	const [textInput, setTextInput] = useState<string>("");
	const [textPos, setTextPos] = useState<Xy | null>(null);
	const [showTextInput, setShowTextInput] = useState(false);
	const [overlayEffects, setOverlayEffects] = useState<TextEffects | undefined>(defaultTextEffects);
	const initialColor = (defaultTextEffects && ((defaultTextEffects.font as unknown as { color?: string })?.color)) ?? "#000000";
	const [overlayColor, setOverlayColor] = useState<string>(initialColor);

	const containerRef = useRef<HTMLDivElement | null>(null);
	const cancelledDrawingRef = useRef<boolean>(false);
	const [size, setSize] = useState({ width: 1, height: 1 });

	useLayoutEffect(() => {
		if (!containerRef.current) return;
		const container = containerRef.current;
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			const { width, height } = entry.contentRect;
			setSize({ width, height });
		});
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
		const pos = e.target.getStage()?.getPointerPosition();
		if (!pos) return;
		const worldPos = screenToWorld(pos);
		// compute snapped world position (in mm) based on visible grid if enabled
		const snappedPos = (() => {
			if (!ENABLE_SNAP_TO_VISIBLE_GRID) return { x: worldPos.x, y: worldPos.y };
			const baseMm = minorSpacing;
			const displayPx = renderMinorPx ?? Math.max(1, baseMm * zoom);
			const displayMult = Math.max(1, displayPx / (baseMm * zoom));
			const visibleStep = baseMm * displayMult;
			const snap = (v: number) => Math.round(v / visibleStep) * visibleStep;
			return { x: snap(worldPos.x), y: snap(worldPos.y) };
		})();

		if (tool === "select") {
			const target = e.target as unknown as { id?: () => string; attrs?: { id?: string } };
			const targetId: string | undefined = typeof target?.id === "function" ? target.id() : target?.attrs?.id;
			if (targetId) {
				select(targetId);
				draggingRef.current = true;
				dragLastPosRef.current = [worldPos.x, worldPos.y];
				return;
			}
			clear();
			return;
		}

		if (tool === "polygon") {
			if (!isDrawing) {
				startDrawing([snappedPos.x, snappedPos.y]);
			} else {
				const firstPoint = polygonPoints[0];
				const dist = Math.sqrt(Math.pow(firstPoint[0] - snappedPos.x, 2) + Math.pow(firstPoint[1] - snappedPos.y, 2));
				if (dist < 5 / zoom) {
					const newShape = finishDrawing();
					if (newShape) addGraphicItem(newShape);
				} else {
					addPolygonPoint([snappedPos.x, snappedPos.y]);
				}
			}
		} else if (tool === "arc") {
			if (!isDrawing) {
				startDrawing([snappedPos.x, snappedPos.y]);
				cancelledDrawingRef.current = false;
				return;
			}
			if (isDrawing && arcPhase === "sweep") {
				const newShape = finishDrawing([snappedPos.x, snappedPos.y]);
				if (newShape) addGraphicItem(newShape);
			}
			return;
		} else if (tool === "text") {
			setTextPos([snappedPos.x, snappedPos.y]);
			setShowTextInput(true);
		} else {
			startDrawing([snappedPos.x, snappedPos.y]);
			cancelledDrawingRef.current = false;
		}
	};

	const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && textInput.trim() && textPos) {
			const layer = (selectedLayerId) ?? ((pcb.graphics?.[0]?.data as unknown as { layer?: string })?.layer) ?? "F.Cu";
			const data: Record<string, unknown> = {
				text: textInput,
				at: { x: textPos[0], y: textPos[1] },
				layer,
				uuid: crypto.randomUUID(),
				effects: overlayEffects ?? defaultTextEffects ?? {},
			};
			if (overlayColor) (data as Record<string, unknown>)["color"] = overlayColor;

			addGraphicItem({ kind: "text", data } as unknown as import("trackway-parser-wasm").PcbGraphicItem);

			setTextInput("");
			setTextPos(null);
			setShowTextInput(false);
		}
	};

	const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
		const pos = e.target.getStage()?.getPointerPosition();
		if (!pos) return;
		const worldPos = screenToWorld(pos);
		// update drawing with snapped coordinates for drawing tools; for select
		// use the raw world coordinate for dragging calculations.
		const snappedPos = (() => {
			if (!ENABLE_SNAP_TO_VISIBLE_GRID) return { x: worldPos.x, y: worldPos.y };
			const baseMm = minorSpacing;
			const displayPx = renderMinorPx ?? Math.max(1, baseMm * zoom);
			const displayMult = Math.max(1, displayPx / (baseMm * zoom));
			const visibleStep = baseMm * displayMult;
			const snap = (v: number) => Math.round(v / visibleStep) * visibleStep;
			return { x: snap(worldPos.x), y: snap(worldPos.y) };
		})();
		updateDrawing(tool === "select" ? [worldPos.x, worldPos.y] : [snappedPos.x, snappedPos.y]);

		if (tool === "select" && draggingRef.current && dragLastPosRef.current) {
			const last = dragLastPosRef.current;
			const dx = worldPos.x - last[0];
			const dy = worldPos.y - last[1];
			dragLastPosRef.current = [worldPos.x, worldPos.y];
			if (!selectedUuid) return;
			updatePcb((current) => ({
				...current,
				graphics: ((current.graphics ?? []).map((g) => {
					const uuid = (g.data as unknown as { uuid?: string }).uuid;
					if (uuid !== selectedUuid) return g;
					const d = updateGraphicDataByKind(g.kind, g.data as unknown as Record<string, unknown>, dx, dy);
					return { ...g, data: d as unknown as typeof g.data };
				})) as unknown as typeof current.graphics,
			}));
		}
	};

	const handleMouseUp = () => {
		if (cancelledDrawingRef.current) {
			cancelledDrawingRef.current = false;
			return;
		}

		if (tool === "select" && draggingRef.current) {
			draggingRef.current = false;
			dragLastPosRef.current = null;
			return;
		}
		if (tool === "arc") {
			if (isDrawing && arcPhase === "circle") {
				advanceArcToSweep();
				return;
			}
			return;
		}
		if (tool !== "polygon") {
			const newShape = finishDrawing();
			if (newShape) addGraphicItem(newShape);
		}
	};

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (showTextInput) {
					setShowTextInput(false);
					setTextInput("");
					setTextPos(null);
				} else if (isDrawing) {
					cancelledDrawingRef.current = true;
					resetDrawing();
				} else {
					resetDrawing();
				}
			}
		};
		window.addEventListener("keydown", handler);
		return () => {
			window.removeEventListener("keydown", handler);
		};
	}, [resetDrawing, showTextInput, isDrawing]);

	useEffect(() => {
		const onCtx = (e: MouseEvent) => {
			if (!containerRef.current) return;
			if (!containerRef.current.contains(e.target as Node)) return;
			e.preventDefault();
			if (selectedUuid) {
				const rect = containerRef.current.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;
				openContextMenu({ x, y });
			} else {
				openContextMenu(null);
			}
		};
		window.addEventListener("contextmenu", onCtx);
		return () => window.removeEventListener("contextmenu", onCtx);
	}, [selectedUuid, openContextMenu]);

	const inputScreenPos = textPos
		? computeInputScreenPos(textPos, camera, zoom, viewportCenter)
		: { x: 0, y: 0 };

	return (
		<div className="absolute inset-0" ref={containerRef}>
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
				{/* Footprint layer rendered in Konva so it participates in the same Stage */}
				<Layer>
					<FootprintKonvaLayer />
				</Layer>
			</CanvasStage>
			<SelectionContextMenu />
		</div>
	);
}
