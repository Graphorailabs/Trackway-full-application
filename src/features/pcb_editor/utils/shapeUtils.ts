/**
 * Utility helpers used by the PCB editor shape rendering and preview code.
 *
 * These helpers are intentionally small and pure so other modules (renderer,
 * layer, and tests) can import just the math/formatting logic without
 * depending on the rendering implementation.
 */
import type { Tool } from "@/features/pcb_editor/contexts/ToolContext";
import type { Xy } from "trackway-parser-wasm";


/**
 * getDimensionsText
 *
 * Return a short, human-friendly measurement string for the preview label
 * that appears while drawing shapes. The format is deliberately compact and
 * suitable for small tooltips rendered inside the Konva canvas.
 *
 * Examples:
 * - rect: "W: 12.34 H: 5.67"
 * - circle: "R: 7.89"
 * - line: "L: 14.32"
 *
 * @param tool - the active drawing tool ("rect", "circle", "line", etc.)
 * @param start - world coordinates [x, y] where the drag started
 * @param end - world coordinates [x, y] for the current pointer position
 * @returns formatted dimension string (empty string if not applicable)
 */
export function getDimensionsText(tool: Tool, start: Xy, end: Xy): string {
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


/**
 * getArcParams
 *
 * Given three points on a plane (start, mid, end) compute parameters for the
 * circle that passes through them: center (cx, cy), radius r, start/end
 * angles (degrees), a signed sweep angle, and a sweepFlag used by the renderer
 * to decide direction.
 *
 * Notes:
 * - If the three points are collinear the function returns NaN for the center
 *   and radius and zeroed angles.
 * - Angles are returned in degrees to match Konva/renderer expectations.
 *
 * @param start - first control point [x, y]
 * @param mid - middle control point [x, y]
 * @param end - final control point [x, y]
 * @returns an object { cx, cy, r, startAngle, endAngle, sweep, sweepFlag }
 */
export function getArcParams(start: Xy, mid: Xy, end: Xy) {
	const [x1, y1] = start;
	const [x2, y2] = mid;
	const [x3, y3] = end;

	const a = x1 * (y2 - y3) - y1 * (x2 - y3) + x2 * y3 - x3 * y2;
	const b = (x1 * x1 + y1 * y1) * (y3 - y2) + (x2 * x2 + y2 * y2) * (y1 - y3) + (x3 * x3 + y3 * y3) * (y2 - y1);
	const c = (x1 * x1 + y1 * y1) * (x2 - x3) + (x2 * x2 + y2 * y2) * (x3 - x1) + (x3 * x3 + y3 * y3) * (x1 - x2);

	if (Math.abs(a) < 1e-6) {
		return { cx: NaN, cy: NaN, r: NaN, startAngle: 0, endAngle: 0, sweep: 0, sweepFlag: 0 };
	}

	const cx = -b / (2 * a);
	const cy = -c / (2 * a);
	const r = Math.sqrt((start[0] - cx) ** 2 + (start[1] - cy) ** 2);

	const angle = (pt: Xy) => (Math.atan2(pt[1] - cy, pt[0] - cx) * 180) / Math.PI;
	const startAngle = angle(start);
	const endAngle = angle(end);

	let sweep = endAngle - startAngle;
	if (sweep < 0) sweep += 360;

	const sweepFlag = a > 0 ? 0 : 1;

	return { cx, cy, r, startAngle, endAngle, sweep, sweepFlag };
}
