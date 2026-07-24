import { useMemo } from "react";
import type { Footprint, FootprintModel } from "trackway-parser-wasm";
import { normalizeModelLibraryPath, type ResolvableFootprintModel } from "./useFootprintModelAsset";
import type { FootprintModelFormat } from "../modelFormats";

type RenderableModel = ResolvableFootprintModel & { entry: FootprintModel };

type FootprintModelEntry = RenderableModel & {
  footprint: Footprint;
  index: number;
  bboxCenterX: number;
  bboxCenterY: number;
  isBackSide: boolean;
};

export function useFootprintModels(footprints: Footprint[] | undefined | null) {
  return useMemo<FootprintModelEntry[]>(() => {
    if (!Array.isArray(footprints)) return [];
    const entries: FootprintModelEntry[] = [];
    footprints.forEach((fp, idx) => {
      const model = selectRenderableModel(fp);
      if (!model) return;
      const bbox = computeFootprintCenters(fp);
      entries.push({
        ...model,
        footprint: fp,
        index: idx,
        bboxCenterX: bbox.centerX,
        bboxCenterY: bbox.centerY,
        isBackSide: bbox.isBackSide,
      });
    });
    return entries;
  }, [footprints]);
}

function selectRenderableModel(fp?: Footprint | null): RenderableModel | null {
  const entries = Array.isArray(fp?.models) ? (fp.models as FootprintModel[]) : [];
  for (const entry of entries) {
    const path = normalizePath(entry?.path);
    if (!path) continue;
    const format = inferFormat(path);
    return { entry, path, format, normalizedPath: normalizeModelLibraryPath(path) };
  }
  return null;
}

function computeFootprintCenters(fp: Footprint) {
  const at = (fp?.at as { x?: number; y?: number } | undefined) ?? { x: 0, y: 0 };
  const layer = fp?.layer as string | { canonical_name?: string } | undefined;
  const layerName = typeof layer === "string" ? layer : layer?.canonical_name ?? "";
  const isBackSide = layerName.toUpperCase().startsWith("B.");
  return {
    centerX: Number(at.x) || 0,
    centerY: Number(at.y) || 0,
    isBackSide,
  };
}

function normalizePath(path?: string | null) {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\\/g, "/");
}

function inferFormat(path: string): FootprintModelFormat | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".glb")) return "glb";
  if (lower.endsWith(".obj")) return "obj";
  if (lower.endsWith(".stl")) return "stl";
  if (lower.endsWith(".ply")) return "ply";
  return null;
}
