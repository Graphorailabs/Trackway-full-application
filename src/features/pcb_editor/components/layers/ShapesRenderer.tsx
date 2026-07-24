/**
 * ShapesRenderer
 *
 * Small rendering helpers that convert canonical `PcbGraphicItem` objects
 * to Konva drawables. The goal is to keep the rendering code isolated so the
 * larger `ShapesLayer` component can focus on wiring and interaction logic.
 *
 * Notes for contributors:
 * - When adding a new shape kind extend the `switch (item.kind)` below and
 *   follow the existing pattern: read `item.data`, pick `data.color` or a
 *   sensible default, and return a Konva node with `key={data.uuid}`.
 * - The renderer expects stroke color to be stored on `data.color` and stroke
 *   width on `data.width` (older shapes may store `width` directly on data).
 */
import { Rect, Circle, Text, Line, Arc } from "react-konva";
import type { PcbGraphicItem, Xy } from "trackway-parser-wasm";
import type { Tool } from "@/features/pcb_editor/contexts/ToolContext";
import { getArcParams } from "@/features/pcb_editor/utils/shapeUtils";
import { DEFAULT_SHAPE_STROKE, DEFAULT_SHAPE_WIDTH } from "@/features/pcb_editor/constants";

// Aliases used in this file
const DEFAULT_STROKE = DEFAULT_SHAPE_STROKE;
const DEFAULT_WIDTH = DEFAULT_SHAPE_WIDTH;

/**
 * Render a stored PCB graphic item as a Konva node.
 *
 * @param item - canonical `PcbGraphicItem` from the PCB model
 * @returns a Konva JSX element or `null` when the item cannot be rendered
 */
export function renderShape(item: PcbGraphicItem) {
	switch (item.kind) {
		case "rect": {
			const data = item.data as unknown as { start: Xy; end: Xy; width?: number; fill?: boolean; uuid?: string };
			const { start, end, width, fill } = data;
			const stroke = DEFAULT_STROKE;
			const w = typeof width === "number" ? width : DEFAULT_WIDTH;
			const [x1, y1] = start;
			const [x2, y2] = end;
			return (
				<Rect
					key={item.data.uuid}
					id={item.data.uuid}
					x={x1}
					y={y1}
					width={x2 - x1}
					height={y2 - y1}
					strokeWidth={w}
					stroke={stroke}
					fill={fill ? "gray" : undefined}
				/>
			);
		}
		case "circle": {
			const data = item.data as unknown as { center: Xy; end: Xy; width?: number; fill?: boolean; uuid?: string };
			const { center, end, width, fill } = data;
				const stroke = DEFAULT_STROKE;
				const w = typeof width === "number" ? width : DEFAULT_WIDTH;
			const [cx, cy] = center;
			const [ex, ey] = end;
			const radius = Math.sqrt(Math.pow(ex - cx, 2) + Math.pow(ey - cy, 2));
			return (
				<Circle
					key={item.data.uuid}
					id={item.data.uuid}
					x={cx}
					y={cy}
					radius={radius}
					strokeWidth={w}
					stroke={stroke}
					fill={fill ? "gray" : undefined}
				/>
			);
		}
		case "line": {
			const data = item.data as unknown as { start: Xy; end: Xy; width?: number; uuid?: string };
			const { start, end, width } = data;
				const stroke = DEFAULT_STROKE;
				const w = typeof width === "number" ? width : DEFAULT_WIDTH;
			return (
				<Line
					key={item.data.uuid}
					id={item.data.uuid}
					points={[start[0], start[1], end[0], end[1]]}
						strokeWidth={w}
						stroke={stroke}
				/>
			);
		}
		case "polygon": {
				const data = item.data as unknown as { pts?: { xy?: Xy[] }; width?: number; fill?: boolean; uuid?: string };
				const { pts, width, fill } = data;
				const stroke = DEFAULT_STROKE;
				const w = typeof width === "number" ? width : DEFAULT_WIDTH;
			const ptsxy = pts?.xy ?? [];
			if (ptsxy.length === 0) return null;
			const points = ptsxy.flatMap((p: Xy) => [p[0], p[1]]);
			return (
				<Line
					key={item.data.uuid}
					id={item.data.uuid}
					points={points}
						strokeWidth={w}
						stroke={stroke}
					closed
					fill={fill ? "gray" : undefined}
				/>
			);
		}
		case "arc": {
			const data = item.data as unknown as { start?: Xy; mid?: Xy; end?: Xy; width?: number; uuid?: string };
				const { start, mid, end, width } = data;
				const stroke = DEFAULT_STROKE;
				const w = typeof width === "number" ? width : DEFAULT_WIDTH;
			if (!start || !mid || !end) return null;

			// KiCad-style canonical storage: `mid` is the circle center, and
			// `start`/`end` are points on the circumference. Detect that case
			// by checking whether distances from `mid` to `start` and `end`
			// are approximately equal. If so, compute angles from the center
			// rather than solving a circle through three points.
			const dist = (a: Xy, b: Xy) => Math.hypot(a[0] - b[0], a[1] - b[1]);
			const rStart = dist(mid as Xy, start as Xy);
			const rEnd = dist(mid as Xy, end as Xy);
			const eps = 1e-3;
			if (isFinite(rStart) && isFinite(rEnd) && Math.abs(rStart - rEnd) < eps && rStart > 0) {
				const cx = mid[0];
				const cy = mid[1];
				const r = (rStart + rEnd) / 2;
				const startAng = (Math.atan2(start[1] - cy, start[0] - cx) * 180) / Math.PI;
				const endAng = (Math.atan2(end[1] - cy, end[0] - cx) * 180) / Math.PI;
				let sweep = endAng - startAng;
				if (sweep < 0) sweep += 360;
				const innerR = Math.max(0, r - w / 2);
				const outerR = r + w / 2;
				return (
					<Arc
						key={item.data.uuid}
						id={item.data.uuid}
						x={cx}
						y={cy}
						innerRadius={innerR}
						outerRadius={outerR}
						angle={sweep}
						rotation={startAng}
						fill={stroke}
					/>
				);
			}

			const params = getArcParams(start as Xy, mid as Xy, end as Xy);
			if (!isFinite(params.cx) || !isFinite(params.cy) || !isFinite(params.r) || params.r <= 0) {
				// fallback: draw polyline through the three points
				const points = ([start as Xy, mid as Xy, end as Xy]).flatMap((p: Xy) => [p[0], p[1]]);
				return <Line key={item.data.uuid} points={points} stroke={stroke} strokeWidth={w} />;
			}
				const innerR = Math.max(0, params.r - w / 2);
				const outerR = params.r + w / 2;
			// Use startAngle and positive sweep to match preview logic.
			const rotation = params.startAngle;
			const angle = params.sweep;
			return (
				<Arc
					key={item.data.uuid}
					id={item.data.uuid}
					x={params.cx}
					y={params.cy}
					innerRadius={innerR}
					outerRadius={outerR}
					angle={angle}
					rotation={rotation}
					fill={stroke}
				/>
			);
		}
		case "text": {
			const data = item.data as unknown as { text?: string; at?: { x: number; y: number }; effects?: { font?: { size?: number[]; bold?: boolean; italic?: boolean; color?: string } }; color?: string; uuid?: string };
			const { text, at, effects } = data;
			if (!at) return null;
			const fontSize = (effects?.font?.size?.[0]) ?? 16;
			const isBold = !!(effects?.font?.bold);
			const isItalic = !!(effects?.font?.italic);
			const fill = data.color ?? effects?.font?.color ?? "black";
			return (
				<Text
					key={item.data.uuid}
					id={item.data.uuid}
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

export function renderPreviewShape(
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
