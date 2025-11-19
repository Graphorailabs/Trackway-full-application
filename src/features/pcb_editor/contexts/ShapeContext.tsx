import { createContext, useContext, useState } from "react";
import type { PcbGraphicItem, Xy } from "trackway-parser-wasm";
import { useToolContext } from "./ToolContext";
import { useLayers } from "./LayerContext";
/* eslint-disable react-refresh/only-export-components -- context exports hooks/helpers */

type ShapeContextState = {
	isDrawing: boolean;
	startPoint: Xy | null;
	currentPoint: Xy | null;
	polygonPoints: Xy[];
	// Arc-specific state
	arcPhase: "none" | "circle" | "sweep";
	arcStartPoint: Xy | null; // first point on circumference (start of arc)
	arcRadius: number | null; // radius from center to circumference

		startDrawing: (point: Xy) => void;
	addPolygonPoint: (point: Xy) => void;
	advanceArcToSweep: (point?: Xy) => void;
	updateDrawing: (point: Xy) => void;
		finishDrawing: (finalPoint?: Xy) => PcbGraphicItem | null;
	resetDrawing: () => void;
};

const ShapeContext = createContext<ShapeContextState | null>(null);

export function useShapeContext() {
	const context = useContext(ShapeContext);
	if (!context) {
		throw new Error("useShapeContext must be used within a ShapeProvider");
	}
	return context;
}

export function ShapeProvider({ children }: { children: React.ReactNode }) {
	const { tool, strokeWidth } = useToolContext();
	const { selectedLayerId } = useLayers();
	const [isDrawing, setIsDrawing] = useState(false);
	const [startPoint, setStartPoint] = useState<Xy | null>(null);
	const [currentPoint, setCurrentPoint] = useState<Xy | null>(null);
	const [polygonPoints, setPolygonPoints] = useState<Xy[]>([]);
	// Arc state
	const [arcPhase, setArcPhase] = useState<"none" | "circle" | "sweep">("none");
	const [arcStartPoint, setArcStartPoint] = useState<Xy | null>(null);
	const [arcRadius, setArcRadius] = useState<number | null>(null);

	const resetDrawing = () => {
		setIsDrawing(false);
		setStartPoint(null);
		setCurrentPoint(null);
		setPolygonPoints([]);
		setArcPhase("none");
		setArcStartPoint(null);
		setArcRadius(null);
	};

	const startDrawing = (point: Xy) => {
		if (tool === "select") return;

		if (tool === "polygon") {
			if (!isDrawing) {
				setIsDrawing(true);
				setPolygonPoints([point]);
				setCurrentPoint(point);
			}
		} else if (tool === "arc") {
			// Starting the arc: first phase is drawing the defining circle
			setIsDrawing(true);
			setStartPoint(point);
			setCurrentPoint(point);
			setArcPhase("circle");
			setArcStartPoint(null);
			setArcRadius(null);
		} else {
			setIsDrawing(true);
			setStartPoint(point);
			setCurrentPoint(point);
		}
	};

	const addPolygonPoint = (point: Xy) => {
		if (tool !== "polygon" || !isDrawing) return;
		setPolygonPoints((prev) => [...prev, point]);
	};

	const advanceArcToSweep = (point?: Xy) => {
		if (tool !== "arc" || !isDrawing || arcPhase !== "circle") return;
		// Use provided point or currentPoint to decide the radius and start point
		const refPoint = point ?? currentPoint;
		if (!startPoint || !refPoint) return;
		const dx = refPoint[0] - startPoint[0];
		const dy = refPoint[1] - startPoint[1];
		const radius = Math.sqrt(dx * dx + dy * dy);
		setArcRadius(radius);
		// Snap the recorded start point to the exact circumference using the
		// computed radius. This ensures subsequent angle projections use a
		// canonical point on the circle (fixes small pointer sampling errors).
		const angleOf = (p: Xy) => Math.atan2(p[1] - startPoint[1], p[0] - startPoint[0]);
		const startAngle = angleOf(refPoint);
		setArcStartPoint([startPoint[0] + radius * Math.cos(startAngle), startPoint[1] + radius * Math.sin(startAngle)]);
		setArcPhase("sweep");
		// keep isDrawing true so subsequent movements create the sweep preview
	};

	const updateDrawing = (point: Xy) => {
		if (!isDrawing) return;
		setCurrentPoint(point);
	};

	const finishDrawing = (finalPoint?: Xy): PcbGraphicItem | null => {
		if (tool === "select") return null;

		let newShape: PcbGraphicItem | null = null;
		const common = {
			layer: selectedLayerId,
			width: strokeWidth,
			uuid: crypto.randomUUID(),
		};

		if (tool === "polygon") {
			if (polygonPoints.length < 2) {
				resetDrawing();
				return null;
			}
			newShape = {
				kind: "polygon",
				data: {
					pts: { xy: polygonPoints },
					...common,
				},
			};
		} else if (tool === "arc") {
			// Finalize arc only if we're in the sweep phase
			if (arcPhase !== "sweep" || !startPoint || !arcStartPoint || arcRadius == null) {
				resetDrawing();
				return null;
			}
			// Use explicit finalPoint (from the pointer event) when provided so
			// the persisted end point matches the exact click location the user
			// used to finish the arc. Fall back to `currentPoint` otherwise.
			const final = finalPoint ?? currentPoint;
			if (!final) {
				resetDrawing();
				return null;
			}
			// Compute start/mid/end points on the circumference for the final GraphicArc
			const center = startPoint;
			// compute start angle from center to arcStartPoint
			const angleOf = (p: Xy) => Math.atan2(p[1] - center[1], p[0] - center[0]);
			const startAng = angleOf(arcStartPoint);
			// project the explicit final pointer position onto the circle so the
			// end point is the closest point on the circumference to the click.
			const endAng = angleOf(final);
			// normalize sweep
			let sweep = endAng - startAng;
			if (sweep < 0) sweep += Math.PI * 2;
			// compute point on circumference closest to final click
			const makePoint = (ang: number) => [center[0] + arcRadius * Math.cos(ang), center[1] + arcRadius * Math.sin(ang)] as Xy;
			const startPt = [arcStartPoint[0], arcStartPoint[1]] as Xy;
			const endPt = makePoint(endAng);
			// Persist canonical GraphicArc: start (on circumference), mid (center), end (on circumference)
			newShape = {
				kind: "arc",
				data: {
					start: startPt,
					mid: center,
					end: endPt,
					...common,
				},
			};
			resetDrawing();
			return newShape;
		} else {
			if (!isDrawing || !startPoint || !currentPoint) {
				return null;
			}
			switch (tool) {
				case "rect":
					newShape = {
						kind: "rect",
						data: {
							start: [startPoint[0], startPoint[1]],
							end: [currentPoint[0], currentPoint[1]],
							...common,
						},
					};
					break;
				case "circle":
					newShape = {
						kind: "circle",
						data: {
							center: [startPoint[0], startPoint[1]],
							end: [currentPoint[0], currentPoint[1]],
							...common,
						},
					};
					break;
				case "line":
					newShape = {
						kind: "line",
						data: {
							start: [startPoint[0], startPoint[1]],
							end: [currentPoint[0], currentPoint[1]],
							...common,
						},
					};
					break;
			}
		}

		resetDrawing();

		return newShape;
	};

	return (
		<ShapeContext.Provider
			value={{
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
			}}
		>
			{children}
		</ShapeContext.Provider>
	);
}
