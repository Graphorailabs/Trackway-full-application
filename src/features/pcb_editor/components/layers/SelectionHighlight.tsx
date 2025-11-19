// lightweight selection highlight renderer (no direct React import required)
import { Rect, Circle, Line, Arc } from "react-konva";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import { useSelection } from "@/features/pcb_editor/contexts/SelectionContext";
import { useLayers } from "@/features/pcb_editor/contexts/LayerContext";
import { DEFAULT_SHAPE_WIDTH } from "@/features/pcb_editor/constants";

export function SelectionHighlight() {
	const { pcb } = usePcb();
	const { selectedUuid } = useSelection();
	const { visibility } = useLayers();
	if (!selectedUuid) return null;
	const item = pcb.graphics?.find((g) => {
		const d = g.data as unknown as { uuid?: string };
		return d.uuid === selectedUuid;
	});
	if (!item) return null;
	const data = item.data as unknown as Record<string, unknown>;
	const highlight = "rgba(255,200,0,0.9)";
	// ensure we only highlight visible layers
	const layer = data?.layer as string | undefined;
	if (layer && !visibility[layer]) return null;

	switch (item.kind) {
		case "rect": {
			const start = data.start as unknown as number[];
			const end = data.end as unknown as number[];
			const [x1, y1] = start;
			const [x2, y2] = end;
			const w = typeof data.width === "number" ? (data.width as number) : DEFAULT_SHAPE_WIDTH;
			return <Rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} stroke={highlight} strokeWidth={Math.max(0.2, w + 0.2)} listening={false} />;
		}
		case "circle": {
			const center = data.center as unknown as number[];
			const end = data.end as unknown as number[];
			const [cx, cy] = center;
			const [ex, ey] = end;
			const r = Math.hypot(ex - cx, ey - cy);
			const w = typeof data.width === "number" ? (data.width as number) : DEFAULT_SHAPE_WIDTH;
			return <Circle x={cx} y={cy} radius={r} stroke={highlight} strokeWidth={Math.max(0.2, w + 0.2)} listening={false} />;
		}
		case "line": {
			const start = data.start as unknown as number[];
			const end = data.end as unknown as number[];
			const w = typeof data.width === "number" ? (data.width as number) : DEFAULT_SHAPE_WIDTH;
			return <Line points={[start[0], start[1], end[0], end[1]]} stroke={highlight} strokeWidth={Math.max(0.2, w + 0.2)} listening={false} />;
		}
		case "polygon": {
			const pts = (data.pts as unknown as { xy?: number[][] })?.xy ?? [];
			const points = pts.flatMap((p) => [p[0], p[1]]);
			const w = typeof data.width === "number" ? (data.width as number) : DEFAULT_SHAPE_WIDTH;
			return <Line points={points} stroke={highlight} strokeWidth={Math.max(0.2, w + 0.2)} closed listening={false} />;
		}
		case "arc": {
			const start = data.start as unknown as number[];
			const mid = data.mid as unknown as number[];
			const end = data.end as unknown as number[];
			const angleOf = (p: number[]) => Math.atan2(p[1] - mid[1], p[0] - mid[0]);
			const startAng = angleOf(start);
			const endAng = angleOf(end);
			let sweep = endAng - startAng;
			if (sweep < 0) sweep += Math.PI * 2;
			const startDeg = (startAng * 180) / Math.PI;
			const sweepDeg = (sweep * 180) / Math.PI;
			const r = Math.hypot(start[0] - mid[0], start[1] - mid[1]);
			const w = typeof data.width === "number" ? (data.width as number) : DEFAULT_SHAPE_WIDTH;
			const innerR = Math.max(0, r - w / 2);
			const outerR = r + w / 2;
			return <Arc x={mid[0]} y={mid[1]} innerRadius={innerR} outerRadius={outerR} angle={sweepDeg} rotation={startDeg} stroke={highlight} strokeWidth={Math.max(0.2, w + 0.2)} listening={false} />;
		}
		case "text": {
			const at = data.at as unknown as { x?: number; y?: number };
			const x = at?.x ?? 0;
			const y = at?.y ?? 0;
			return <Rect x={x - 2} y={y - 12} width={40} height={20} stroke={highlight} strokeWidth={1} listening={false} />;
		}
		default:
			return null;
	}
}

export default SelectionHighlight;
