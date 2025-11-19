import { Layer, Stage, Rect, Circle, Text, Line, Arc } from "react-konva";
import React from "react";
import { useCameraViewport } from "@/features/pcb_editor/components/canvas/CameraViewport";
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { useShapeContext } from "../../contexts/ShapeContext";
import { useToolContext, type Tool } from "../../contexts/ToolContext";
import { usePcb } from "../../contexts/PcbContext";
import type { KonvaEventObject } from "konva/lib/Node";
import type { PcbGraphicItem, Xy, TextEffects } from "trackway-parser-wasm";

function getDimensionsText(tool: Tool, start: Xy, end: Xy): string {
	const dx = Math.abs(start[0] - end[0]);
	const dy = Math.abs(start[1] - end[1]);

	switch (tool) {
		case "rect":
			return `W: ${dx.toFixed(2)} H: ${dy.toFixed(2)}`;
		case "circle": {
			const radius = Math.sqrt(dx * dx + dy * dy);
			return `R: ${radius.toFixed(2)}`;
		}
		case "line": {
			const length = Math.sqrt(dx * dx + dy * dy);
			return `L: ${length.toFixed(2)}`;
		}
		default:
			return "";
	}
}

function getArcParams(start: Xy, mid: Xy, end: Xy) {
	// Calculate the center and radius of the circle passing through three points
	const [x1, y1] = start;
	const [x2, y2] = mid;
	const [x3, y3] = end;

	const a = x1 * (y2 - y3) - y1 * (x2 - y3) + x2 * y3 - x3 * y2;
	const b = (x1 * x1 + y1 * y1) * (y3 - y2) + (x2 * x2 + y2 * y2) * (y1 - y3) + (x3 * x3 + y3 * y3) * (y2 - y1);
	const c = (x1 * x1 + y1 * y1) * (x2 - x3) + (x2 * x2 + y2 * y2) * (x3 - x1) + (x3 * x3 + y3 * y3) * (x1 - x2);

	if (Math.abs(a) < 1e-6) {
		// Points are collinear, return invalid
		return { cx: NaN, cy: NaN, r: NaN, startAngle: 0, endAngle: 0, sweep: 0, sweepFlag: 0 };
	}

	const cx = -b / (2 * a);
	const cy = -c / (2 * a);
	const r = Math.sqrt((start[0] - cx) ** 2 + (start[1] - cy) ** 2);

	// Calculate start, mid, end angles
	const angle = (pt: Xy) => Math.atan2(pt[1] - cy, pt[0] - cx) * 180 / Math.PI;
	const startAngle = angle(start);
	const endAngle = angle(end);

	// Determine sweep direction
	let sweep = endAngle - startAngle;
	if (sweep < 0) sweep += 360;

	const sweepFlag = a > 0 ? 0 : 1; // 0 for counter-clockwise, 1 for clockwise

	return { cx, cy, r, startAngle, endAngle, sweep, sweepFlag }; 
}

function renderShape(item: PcbGraphicItem) {
	switch (item.kind) {
		case "rect": {
			const { start, end, width, fill } = item.data as any;
			const stroke = (item.data as any).color ?? "red";
			const [x1, y1] = start;
			const [x2, y2] = end;
			return (
				<Rect
					key={item.data.uuid}
					x={x1}
					y={y1}
					width={x2 - x1}
					height={y2 - y1}
					strokeWidth={width}
					stroke={stroke}
					fill={fill ? "gray" : undefined}
				/>
			);
		}
		case "circle": {
			const { center, end, width, fill } = item.data as any;
			const stroke = (item.data as any).color ?? "red";
			const [cx, cy] = center;
			const [ex, ey] = end;
			const radius = Math.sqrt(Math.pow(ex - cx, 2) + Math.pow(ey - cy, 2));
			return (
				<Circle
					key={item.data.uuid}
					x={cx}
					y={cy}
					radius={radius}
					strokeWidth={width}
					stroke={stroke}
					fill={fill ? "gray" : undefined}
				/>
			);
		}
		case "line": {
			const { start, end, width } = item.data as any;
			const stroke = (item.data as any).color ?? "red";
			return (
				<Line
					key={item.data.uuid}
					points={[start[0], start[1], end[0], end[1]]}
					strokeWidth={width}
					stroke={stroke}
				/>
			);
		}
		case "polygon": {
			const { pts, width, fill } = item.data as any;
			const stroke = (item.data as any).color ?? "red";
			if (!pts.xy) return null;
			const points = pts.xy.flatMap((p: Xy) => [p[0], p[1]]);
			return (
				<Line
					key={item.data.uuid}
					points={points}
					strokeWidth={width}
					stroke={stroke}
					closed
					fill={fill ? "gray" : undefined}
				/>
			);
		}
		case "text": {
			const { text, at, effects } = item.data as any;
			if (!at) return null;
			const fontSize = effects?.font?.size?.[0] ?? 16;
			const isBold = !!effects?.font?.bold;
			const isItalic = !!effects?.font?.italic;
			const fill = (item.data as any).color ?? effects?.font?.color ?? "black";
			return (
				<Text
					key={item.data.uuid}
					x={at.x}
					y={at.y}
					text={text}
					fontSize={fontSize}
					fontStyle={`${isBold ? "bold" : "normal"} ${isItalic ? "italic" : "normal"}`}
					fill={fill}
				/>
			);
		}
		default:
			return null;
	}
}

function renderPreviewShape(
	tool: Tool,
	start: Xy,
	end: Xy,
	polygonPoints: Xy[],
	arcPoints: Xy[],
	stroke: string,
	strokeWidth: number,
) {

	switch (tool) {
		case "rect": {
			const [x1, y1] = start;
			const [x2, y2] = end;
			return (
				<Rect
					x={x1}
					y={y1}
					width={x2 - x1}
					height={y2 - y1}
					stroke={stroke}
					strokeWidth={strokeWidth}
				/>
			);
		}
		case "circle": {
			const [cx, cy] = start;
			const [ex, ey] = end;
			const radius = Math.sqrt(Math.pow(ex - cx, 2) + Math.pow(ey - cy, 2));
			return (
				<Circle
					x={cx}
					y={cy}
					radius={radius}
					stroke={stroke}
					strokeWidth={strokeWidth}
				/>
			);
		}
		case "line": {
			return (
				<Line
					points={[start[0], start[1], end[0], end[1]]}
					stroke={stroke}
					strokeWidth={strokeWidth}
				/>
			);
		}
		case "polygon": {
			if (polygonPoints.length === 0) return null;
			const points = [...polygonPoints, end].flatMap((p: Xy) => [p[0], p[1]]);
			return <Line points={points} stroke={stroke} strokeWidth={strokeWidth} />;
		}
		case "arc": {
			if (arcPoints.length === 0) return null;
			const previewPts = [...arcPoints, end];
			if (previewPts.length === 3) {
				const params = getArcParams(previewPts[0], previewPts[1], previewPts[2]);
				if (!isFinite(params.cx) || !isFinite(params.cy) || !isFinite(params.r) || params.r <= 0) {
					const points = previewPts.flatMap((p: Xy) => [p[0], p[1]]);
					return <Line points={points} stroke={stroke} strokeWidth={strokeWidth} />;
				}
				const innerR = Math.max(0, params.r - strokeWidth / 2);
				const outerR = params.r + strokeWidth / 2;
				const rotation = params.sweepFlag === 1 ? params.endAngle : params.startAngle;
				const angle = params.sweepFlag === 1 ? -params.sweep : params.sweep;
				return (
					<Arc
						x={params.cx}
						y={params.cy}
						innerRadius={innerR}
						outerRadius={outerR}
						angle={angle}
						rotation={rotation}
						fill="transparent"
						stroke={stroke}
						strokeWidth={0.1}
					/>
				);
			}
			const points = previewPts.flatMap((p) => [p[0], p[1]]);
			return <Line points={points} stroke={stroke} strokeWidth={strokeWidth} />;
		}
		default:
			return null;
	}
}

export function ShapesLayer() {
	const { camera, zoom, viewportCenter, screenToWorld } = useCameraViewport();
	const {
		isDrawing,
		startPoint,
		currentPoint,
		polygonPoints,
		startDrawing,
		addPolygonPoint,
		updateDrawing,
		finishDrawing,
		resetDrawing,
	} = useShapeContext();
	const { pcb, addGraphicItem } = usePcb();
	const { tool, textEffects: defaultTextEffects, strokeColor: toolStrokeColor, strokeWidth: toolStrokeWidth } = useToolContext();
	const { selectedLayerId } = (() => {
		try {
			// lazy require to avoid circular import issues
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const layers = require("@/features/pcb_editor/contexts/LayerContext");
			return layers.useLayers();
		} catch (e) {
			return { selectedLayerId: pcb.graphics?.[0]?.data?.layer || "F.Cu" };
		}
	})();
	const [textInput, setTextInput] = useState<string>("");
	const [textPos, setTextPos] = useState<Xy | null>(null);
	const [showTextInput, setShowTextInput] = useState(false);
	const [overlayEffects, setOverlayEffects] = useState<TextEffects | undefined>(defaultTextEffects);
	const [overlayColor, setOverlayColor] = useState<string>(((defaultTextEffects as any)?.font?.color as string) ?? "#000000");

	const containerRef = useRef<HTMLDivElement | null>(null);
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
		if (tool === "select") return;
		const pos = e.target.getStage()?.getPointerPosition();
		if (!pos) return;
		const worldPos = screenToWorld(pos);

		if (tool === "polygon") {
			if (!isDrawing) {
				startDrawing([worldPos.x, worldPos.y]);
			} else {
				// Check if closing the polygon
				const firstPoint = polygonPoints[0];
				const dist = Math.sqrt(
					Math.pow(firstPoint[0] - worldPos.x, 2) +
						Math.pow(firstPoint[1] - worldPos.y, 2),
				);
				if (dist < 5 / zoom) {
					const newShape = finishDrawing();
					if (newShape) {
						addGraphicItem(newShape);
					}
				} else {
					addPolygonPoint([worldPos.x, worldPos.y]);
				}
			}
		// Arc tool removed
		} else if (tool === "text") {
			setTextPos([worldPos.x, worldPos.y]);
			setShowTextInput(true);
		} else {
			startDrawing([worldPos.x, worldPos.y]);
		}
	};

	// Move handleTextInputKeyDown to main scope
	const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && textInput.trim() && textPos) {
			const data: any = {
				text: textInput,
				at: { x: textPos[0], y: textPos[1] },
				layer: selectedLayerId || pcb.graphics?.[0]?.data?.layer || "F.Cu",
				uuid: crypto.randomUUID(),
				effects: overlayEffects || defaultTextEffects || {},
			};
			// store chosen color explicitly on the graphic data for renderer to use
			if (overlayColor) data.color = overlayColor;

			addGraphicItem({ kind: "text", data });

			setTextInput("");
			setTextPos(null);
			setShowTextInput(false);
		}
	};

	const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
		const pos = e.target.getStage()?.getPointerPosition();
		if (!pos) return;
		const worldPos = screenToWorld(pos);
		updateDrawing([worldPos.x, worldPos.y]);
	};

	const handleMouseUp = () => {
		if (tool !== "polygon" && tool !== "arc") {
			const newShape = finishDrawing();
			if (newShape) {
				addGraphicItem(newShape);
			}
		}
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			if (showTextInput) {
				setShowTextInput(false);
				setTextInput("");
				setTextPos(null);
			} else {
				resetDrawing();
			}
		}
	};

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [resetDrawing, showTextInput]);

	// Convert world position to screen coordinates for the DOM input overlay
	const inputScreenPos = textPos
	    ? {
	          x: (textPos[0] - camera.x) * zoom + viewportCenter.x,
	          y: (textPos[1] - camera.y) * zoom + viewportCenter.y,
	      }
	    : { x: 0, y: 0 };

	return (
		<div className="absolute inset-0" ref={containerRef}>
		{showTextInput && textPos && (
			<>
				<input
					type="text"
					autoFocus
					value={textInput}
					onChange={e => setTextInput(e.target.value)}
					onKeyDown={handleTextInputKeyDown}
					style={{
						position: "absolute",
						left: inputScreenPos.x,
						top: inputScreenPos.y,
						zIndex: 100,
						fontSize: "16px",
						padding: "2px 6px",
					}}
					placeholder="Enter text..."
				/>

				{/* small effects palette under the input */}
				<div
					style={{ position: "absolute", left: inputScreenPos.x, top: inputScreenPos.y + 28, zIndex: 101 }}
					className="flex items-center gap-2 rounded bg-slate-700 p-2 text-white"
				>
					<label className="text-xs">Size</label>
					<input
						type="number"
						min={6}
						max={72}
						value={overlayEffects?.font?.size?.[0] ?? 16}
						onChange={(e) => {
						const v = Number(e.target.value) || 16;
						setOverlayEffects((prev) => {
							const prevFont = prev?.font ?? { size: [16, 0] };
							return { ...(prev ?? {}), font: { ...prevFont, size: [v, prevFont.size?.[1] ?? 0] } } as TextEffects;
						});
					}}
						className="w-16 text-sm"
					/>

					<label className="flex items-center gap-1 text-xs">
						<input
							type="checkbox"
							checked={!!overlayEffects?.font?.bold}
							onChange={(e) => setOverlayEffects((prev) => {
								const prevFont = prev?.font ?? { size: [16, 0] };
								return { ...(prev ?? {}), font: { ...prevFont, bold: e.target.checked } } as TextEffects;
							})}
						/>
						<span>Bold</span>
					</label>

					<label className="flex items-center gap-1 text-xs">
						<input
							type="checkbox"
							checked={!!overlayEffects?.font?.italic}
							onChange={(e) => setOverlayEffects((prev) => {
								const prevFont = prev?.font ?? { size: [16, 0] };
								return { ...(prev ?? {}), font: { ...prevFont, italic: e.target.checked } } as TextEffects;
							})}
						/>
						<span>Italic</span>
					</label>

					<label className="flex items-center gap-2 text-sm text-slate-200">
						<span className="text-xs">Color</span>
						<input
							type="color"
							value={overlayColor}
							onChange={(e) => setOverlayColor(e.target.value)}
							className="w-8 h-8 rounded"
						/>
					</label>
				</div>
			</>
		)}
			<Stage
				width={size.width}
				height={size.height}
				scaleX={zoom}
				scaleY={zoom}
				x={viewportCenter.x - camera.x * zoom}
				y={viewportCenter.y - camera.y * zoom}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
			>
				<Layer>
					{pcb.graphics?.map(renderShape)}
					{isDrawing && currentPoint && (
						<>
							{(tool === "polygon" && polygonPoints && polygonPoints.length > 0)
								? renderPreviewShape(
									tool,
									polygonPoints[0],
									currentPoint,
									polygonPoints,
									[],
									toolStrokeColor,
									toolStrokeWidth,
								)
								: (startPoint && currentPoint)
									? renderPreviewShape(tool, startPoint, currentPoint, [], [], toolStrokeColor, toolStrokeWidth)
									: null}

							{(startPoint && currentPoint)
								? <Text
									x={currentPoint[0]}
									y={currentPoint[1]}
									offsetX={-10}
									offsetY={-10}
									text={getDimensionsText(tool, startPoint, currentPoint)}
									fontSize={12 / zoom}
									fill="black"
								  />
								: null}
						</>
					)}
				</Layer>
			</Stage>
		</div>
	);
}
