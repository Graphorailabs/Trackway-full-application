import { useEffect, useState } from "react";
import { useFootprintManagers } from "@/features/footprint_manager/FootprintManagerContext";
import type {
  Footprint3DModelMetadata,
  Footprint3DModelPackage,
  Local3DModelManager as Local3DModelManagerContract,
} from "@/features/footprint_manager/types";
import { SUPPORTED_MODEL_FORMATS, type FootprintModelFormat } from "../modelFormats";

export type ResolvableFootprintModel = {
  path: string;
  format: FootprintModelFormat | null;
  normalizedPath: string | null;
};

export type FootprintModelAsset = { url: string; format: FootprintModelFormat; sourceName: string | null } | null;

export function useFootprintModelAsset(targetModel: ResolvableFootprintModel | null, libraryLink: string | null): FootprintModelAsset {
  const { models } = useFootprintManagers();
  const [asset, setAsset] = useState<FootprintModelAsset>(null);

  useEffect(() => {
    let cancelled = false;
    let revokeUrl: string | null = null;

    async function resolve() {
      const trimmedLibraryLink = libraryLink?.trim() ?? "";
      if (!targetModel && !trimmedLibraryLink) {
        setAsset(null);
        return;
      }

      const rawPath = targetModel?.path ?? null;
      if (targetModel && rawPath && !requiresLocalResolution(rawPath)) {
        if (!targetModel.format) {
          console.warn("[3DViewer] Footprint model path uses unsupported format", {
            path: rawPath,
            libraryLink: trimmedLibraryLink || null,
          });
          setAsset(null);
          return;
        }
        setAsset({ url: rawPath, format: targetModel.format, sourceName: filenameFromPath(rawPath) });
        return;
      }

      if (!models) {
        setAsset(null);
        return;
      }

      try {
        let dataBuffer: ArrayBuffer | null = null;
        let resolvedFormat: FootprintModelFormat | null = targetModel?.format ?? null;
        let resolvedSourceName: string | null = targetModel?.path ? filenameFromPath(targetModel.path) : null;

        const assignFromPackage = (pkg: Footprint3DModelPackage | null, origin: string) => {
          if (!pkg || !(pkg.data instanceof ArrayBuffer)) return false;
          if (!resolvedFormat) {
            resolvedFormat = normalizeModelFormat(pkg.meta?.format ?? null);
          }
          if (!resolvedFormat) {
            console.warn("[3DViewer] Unsupported 3D model format", {
              origin,
              format: pkg.meta?.format ?? null,
              libraryLink: trimmedLibraryLink || null,
            });
            return false;
          }
          const packageName = pkg.meta?.name ?? null;
          resolvedSourceName = packageName ?? resolvedSourceName ?? (trimmedLibraryLink || null);
          dataBuffer = pkg.data as ArrayBuffer;
          return true;
        };

        if (trimmedLibraryLink) {
          const pkg = await models.findByFootprintName(trimmedLibraryLink);
          assignFromPackage(pkg, "libraryLink");
        }
        if (!dataBuffer && targetModel?.normalizedPath) {
          const meta = await findInstalledModelMeta(models, targetModel.normalizedPath);
          if (meta) {
            resolvedFormat = resolvedFormat ?? normalizeModelFormat(meta.format);
            const pkg = await models.getModel(meta.id);
            assignFromPackage(pkg, "normalizedPath");
          }
        }
        if (!dataBuffer || !resolvedFormat) {
          setAsset(null);
          return;
        }
        const blob = new Blob([dataBuffer], { type: mimeFromFormat(resolvedFormat) });
        const objectUrl = URL.createObjectURL(blob);
        revokeUrl = objectUrl;
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setAsset({ url: objectUrl, format: resolvedFormat, sourceName: resolvedSourceName ?? null });
      } catch (err) {
        if (!cancelled) {
          console.warn("Failed to resolve footprint model", err);
          setAsset(null);
        }
      }
    }

    resolve();

    return () => {
      cancelled = true;
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [targetModel, models, libraryLink]);

  return asset;
}

const installedModelMetaCache = new WeakMap<Local3DModelManagerContract, Footprint3DModelMetadata[]>();
const installedModelMetaPromises = new WeakMap<Local3DModelManagerContract, Promise<Footprint3DModelMetadata[]>>();

async function loadInstalledModelMetadata(models: Local3DModelManagerContract): Promise<Footprint3DModelMetadata[]> {
  if (installedModelMetaCache.has(models)) {
    return installedModelMetaCache.get(models)!;
  }
  if (!installedModelMetaPromises.has(models)) {
    installedModelMetaPromises.set(
      models,
      models
        .listInstalled()
        .then((list) => {
          installedModelMetaCache.set(models, list);
          installedModelMetaPromises.delete(models);
          return list;
        })
        .catch((err) => {
          installedModelMetaPromises.delete(models);
          throw err;
        }),
    );
  }
  return installedModelMetaPromises.get(models)!;
}

async function findInstalledModelMeta(models: Local3DModelManagerContract, normalizedPath: string) {
  const metas = await loadInstalledModelMetadata(models);
  const targetLower = normalizedPath.toLowerCase();
  const targetBase = basenameWithoutExtension(normalizedPath);
  return (
    metas.find((meta) => {
      const metaPath = normalizeModelLibraryPath(meta.name ?? null);
      if (metaPath && metaPath.toLowerCase() === targetLower) return true;
      if (metaPath) {
        const metaBase = basenameWithoutExtension(metaPath);
        if (metaBase === targetBase) return true;
      }
      if (meta.footprintName && meta.footprintName.trim().length) {
        if (meta.footprintName.trim().toLowerCase() === targetBase) return true;
      }
      return false;
    }) ?? null
  );
}

export function requiresLocalResolution(path: string) {
  if (/^https?:\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) return false;
  if (path.startsWith("./") || path.startsWith("../") || path.startsWith("/")) return false;
  if (/\.3dshapes/i.test(path)) return true;
  if (/\${[^}]+}/.test(path)) return true;
  if (/^[a-z]:[\\/]/i.test(path)) return true;
  if (path.startsWith("\\\\")) return true;
  return false;
}

export function normalizeModelLibraryPath(path?: string | null) {
  if (!path) return null;
  let cleaned = path.trim().replace(/^['"]|['"]$/g, "");
  if (!cleaned) return null;
  cleaned = cleaned.replace(/\${[^}]+}/g, "");
  cleaned = cleaned.replace(/^file:/i, "");
  cleaned = cleaned.replace(/^resource:/i, "");
  cleaned = cleaned.replace(/^zip:/i, "");
  cleaned = cleaned.replace(/\\/g, "/");
  cleaned = cleaned.replace(/^\/+/, "");
  const lower = cleaned.toLowerCase();
  const shapesIdx = lower.indexOf(".3dshapes/");
  if (shapesIdx >= 0) {
    const start = cleaned.lastIndexOf("/", shapesIdx);
    cleaned = cleaned.slice(start >= 0 ? start + 1 : 0);
  }
  return cleaned;
}

function basenameWithoutExtension(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const segments = normalized.split("/");
  const last = segments[segments.length - 1] ?? path;
  const dot = last.lastIndexOf(".");
  return (dot >= 0 ? last.slice(0, dot) : last).toLowerCase();
}

function mimeFromFormat(format: FootprintModelFormat) {
  switch (format) {
    case "glb":
      return "model/gltf-binary";
    case "obj":
      return "text/plain";
    case "stl":
      return "model/stl";
    case "ply":
      return "application/octet-stream";
    default:
      return "application/octet-stream";
  }
}

function normalizeModelFormat(value?: string | null): FootprintModelFormat | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  return SUPPORTED_MODEL_FORMATS.includes(lower as FootprintModelFormat) ? (lower as FootprintModelFormat) : null;
}

function filenameFromPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] ?? path;
}
