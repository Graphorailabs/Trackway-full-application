import type { Footprint, FootprintModel } from "trackway-parser-wasm";
import type { FootprintModelFormat } from "../modelFormats";
import { normalizeModelLibraryPath, type ResolvableFootprintModel } from "../hooks/useFootprintModelAsset";

export type RenderableModel = ResolvableFootprintModel & {
	entry: FootprintModel;
};

export function selectRenderableModel(fp?: Footprint | null): RenderableModel | null {
	const entries = Array.isArray(fp?.models) ? (fp?.models as FootprintModel[]) : [];
	for (const entry of entries) {
		const path = normalizePath(entry.path);
		if (!path) continue;
		const format = inferFormat(path);
		return { entry, path, format, normalizedPath: normalizeModelLibraryPath(path) } satisfies RenderableModel;
	}
	return null;
}

export function inferFormat(path: string): FootprintModelFormat | null {
	const lower = path.toLowerCase();
	if (lower.endsWith(".glb")) return "glb";
	if (lower.endsWith(".obj")) return "obj";
	if (lower.endsWith(".stl")) return "stl";
	if (lower.endsWith(".ply")) return "ply";
	return null;
}

export function normalizePath(path?: string | null) {
	if (!path) return null;
	const trimmed = path.trim();
	if (!trimmed) return null;
	return trimmed.replace(/\\/g, "/");
}

export function toNumber(value: unknown, fallback = 0) {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

export function toRadians(value: unknown) {
	const num = Number(value) || 0;
	return Math.abs(num) > Math.PI * 2 ? (num * Math.PI) / 180 : num;
}

export function sanitizeScale(value: unknown) {
	const num = Number(value);
	if (!Number.isFinite(num) || num === 0) return 1;
	return num;
}
