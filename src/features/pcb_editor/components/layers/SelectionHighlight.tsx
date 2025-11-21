// lightweight selection highlight renderer (no direct React import required)
import { Rect, Circle, Line, Arc, Group } from "react-konva";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import { useSelection } from "@/features/pcb_editor/contexts/SelectionContext";
import { useLayers } from "@/features/pcb_editor/contexts/LayerContext";
import { DEFAULT_SHAPE_WIDTH } from "@/features/pcb_editor/constants";

export function SelectionHighlight() {
	const { pcb } = usePcb();
	const { selectedUuid } = useSelection();
	const { visibility } = useLayers();
	if (!selectedUuid) return null;
	const highlight = "rgba(255,200,0,0.9)";
	const item = pcb.graphics?.find((g) => {
		const d = g.data as unknown as { uuid?: string };
		return d.uuid === selectedUuid;
	});
	if (!item) {
		// If no graphic matched, maybe a footprint is selected
		const fp = pcb.footprints?.find((f) => (f as unknown as { uuid?: string }).uuid === selectedUuid);
		if (!fp) return null;
		// compute footprint bounds (local coords) similar to renderer
		const pads = (fp.pads ?? []) as Array<any>;
		const graphics = (fp.graphics ?? []) as Array<any>;
		const texts = ((fp as any).texts ?? []) as Array<any>;
		const points: Array<[number, number]> = [];
		pads.forEach((p) => {
			const at = p.at ?? { x: 0, y: 0 };
			const sizeArr = p.size ?? [1, 1];
			const w = sizeArr[0] ?? 1;
			const h = sizeArr[1] ?? w;
			points.push([at.x ?? 0 - w / 2, at.y ?? 0 - h / 2]);
			points.push([at.x ?? 0 + w / 2, at.y ?? 0 + h / 2]);
		});
		graphics.forEach((g) => {
			if (g.kind === "line") {
				const s = g.start ?? (g.data?.start ?? { x: 0, y: 0 });
				const e = g.end ?? (g.data?.end ?? { x: 0, y: 0 });
				points.push([s.x ?? s[0] ?? 0, s.y ?? s[1] ?? 0]);
				points.push([e.x ?? e[0] ?? 0, e.y ?? e[1] ?? 0]);
			} else if (g.kind === "polygon") {
				const rawPts = g.pts ?? g.data?.pts ?? null;
				if (Array.isArray(rawPts)) {
					rawPts.forEach((pt: any) => points.push([pt[0] ?? pt.x ?? 0, pt[1] ?? pt.y ?? 0]));
				} else if (rawPts && Array.isArray(rawPts.xy)) {
					rawPts.xy.forEach((pt: any) => points.push([pt[0] ?? pt.x ?? 0, pt[1] ?? pt.y ?? 0]));
				}
			}
		});
		texts.forEach((t) => {
			const at = t.at ?? { x: 0, y: 0 };
			points.push([at.x ?? 0, at.y ?? 0]);
		});

		const xs = points.map((p) => p[0]);
		const ys = points.map((p) => p[1]);
		const minX = xs.length ? Math.min(...xs) : -5;
		const maxX = xs.length ? Math.max(...xs) : 5;
		const minY = ys.length ? Math.min(...ys) : -5;
		const maxY = ys.length ? Math.max(...ys) : 5;

		const at = fp.at ?? { x: 0, y: 0, angle: 0 } as { x?: number; y?: number; angle?: number };
		const x = at.x ?? 0;
		const y = at.y ?? 0;
		const rotation = (at.angle ?? 0) * (180 / Math.PI);
		return (
			<Group x={x} y={y} rotation={rotation} listening={false}>
				<Rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} stroke={highlight} strokeWidth={Math.max(0.6, DEFAULT_SHAPE_WIDTH + 0.2)} listening={false} />
			</Group>
		);
	}
	const data = item.data as unknown as Record<string, unknown>;
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
			const text = (data.text as unknown as string) ?? "";
			const effects = data.effects as unknown as { font?: { size?: number[]; bold?: boolean; italic?: boolean } } | undefined;
			const fontSize = (effects?.font?.size?.[0]) ?? 16;
			const isBold = !!effects?.font?.bold;
			const isItalic = !!effects?.font?.italic;
			// Measure text width using an offscreen canvas so the selection box matches rendered text
			let measuredWidth = 40;
			try {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.font = `${isBold ? "bold " : ""}${isItalic ? "italic " : ""}${fontSize}px sans-serif`;
					measuredWidth = Math.max(8, ctx.measureText(text || "M").width);
				}
			} catch (e) {
				// ignore measurement failures in non-browser environments
			}
			const pad = Math.max(2, fontSize * 0.2);
			const height = fontSize * 1.2;
			return (
				<Rect
					x={x - pad}
					y={y - pad}
					width={measuredWidth + pad * 2}
					height={height + pad * 2}
					stroke={highlight}
					strokeWidth={Math.max(0.6, DEFAULT_SHAPE_WIDTH + 0.2)}
					listening={false}
				/>
			);
		}
		default:
			return null;
	}
}

export default SelectionHighlight;

