import { createContext, useContext, useState } from "react";
import type { PcbGraphicItem, Xy } from "trackway-parser-wasm";
import { useToolContext } from "./ToolContext";
import { useLayers } from "./LayerContext";

type ShapeContextState = {
	isDrawing: boolean;
	startPoint: Xy | null;
	currentPoint: Xy | null;
	polygonPoints: Xy[];

	startDrawing: (point: Xy) => void;
	addPolygonPoint: (point: Xy) => void;
	updateDrawing: (point: Xy) => void;
	finishDrawing: () => PcbGraphicItem | null;
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
	const { tool, strokeWidth, strokeColor } = useToolContext();
	const { selectedLayerId } = useLayers();
	const [isDrawing, setIsDrawing] = useState(false);
	const [startPoint, setStartPoint] = useState<Xy | null>(null);
	const [currentPoint, setCurrentPoint] = useState<Xy | null>(null);
	const [polygonPoints, setPolygonPoints] = useState<Xy[]>([]);
	// Arc tool removed

	const resetDrawing = () => {
		setIsDrawing(false);
		setStartPoint(null);
		setCurrentPoint(null);
		setPolygonPoints([]);
		// Arc tool removed
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
			// Arc tool removed
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

	// Arc tool removed

	const updateDrawing = (point: Xy) => {
		if (!isDrawing) return;
		setCurrentPoint(point);
	};

	const finishDrawing = (): PcbGraphicItem | null => {
		if (tool === "select") return null;

		let newShape: PcbGraphicItem | null = null;
		const common = {
			layer: selectedLayerId,
			width: strokeWidth,
			color: strokeColor,
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
			// Arc tool removed
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
				// Arc tool removed
				startDrawing,
				addPolygonPoint,
				// Arc tool removed
				updateDrawing,
				finishDrawing,
				resetDrawing,
			}}
		>
			{children}
		</ShapeContext.Provider>
	);
}
