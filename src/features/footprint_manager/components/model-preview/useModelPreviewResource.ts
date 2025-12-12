import { useEffect, useMemo, useState } from "react";
import type { Footprint3DModelMetadata } from "../../types";
import { useFootprintManagers } from "../../FootprintManagerContext";
import { SUPPORTED_FORMATS, type SupportedFormat } from "./constants";

export function useModelPreviewResource(meta: Footprint3DModelMetadata | null) {
  const { models } = useFootprintManagers();
  const format = normalizeFormat(meta);
  const supportedFormat = useMemo<SupportedFormat | null>(() => {
    return SUPPORTED_FORMATS.includes(format as SupportedFormat) ? (format as SupportedFormat) : null;
  }, [format]);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let revokeUrl: string | null = null;

    if (!meta) {
      setObjectUrl(null);
      setError(null);
      setInfo(null);
      setLoading(false);
      return () => {};
    }

    if (!models) {
      setError("Local 3D manager unavailable");
      setObjectUrl(null);
      setLoading(false);
      return () => {};
    }

    if (!supportedFormat) {
      const unsupportedMessage = buildUnsupportedMessage(meta, format);
      setObjectUrl(null);
      setInfo(null);
      setError(unsupportedMessage);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    (async () => {
      try {
        const pkg = await models.getModel(meta.id);
        if (!pkg || !pkg.data) throw new Error("Model data missing");
        let buffer: ArrayBuffer | null = null;
        if (pkg.data instanceof ArrayBuffer) {
          buffer = pkg.data;
        } else if (typeof pkg.data === "string" && pkg.data.length) {
          const res = await fetch(pkg.data);
          buffer = await res.arrayBuffer();
        }
        if (!buffer) throw new Error("Unsupported model payload");
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        revokeUrl = url;
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setObjectUrl(url);
        setError(null);
        setInfo(`Previewing .${supportedFormat.toUpperCase()} file`);
      } catch (err: any) {
        if (!cancelled) {
          setObjectUrl(null);
          setError(err?.message ?? "Failed to load model");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [meta, models, supportedFormat, format]);

  const failureMessage = error ?? buildUnsupportedMessage(meta, format);

  return {
    format,
    supportedFormat,
    loading,
    error,
    info,
    objectUrl,
    failureMessage,
  };
}

function normalizeFormat(meta: Footprint3DModelMetadata | null): string {
  if (!meta) return "";
  if (meta.format) return meta.format.toLowerCase().replace(/^\./, "");
  const lowerName = meta.name?.toLowerCase();
  if (lowerName && lowerName.includes(".")) {
    const parts = lowerName.split(".");
    return parts[parts.length - 1];
  }
  return "";
}

function buildUnsupportedMessage(meta: Footprint3DModelMetadata | null, format: string): string {
  const suffix = meta?.format?.toLowerCase() ?? format ?? "unknown";
  if (suffix === "step" || suffix === "stp") {
    return "STEP preview is not supported. Convert to GLB, OBJ, STL, or PLY before importing.";
  }
  if (suffix === "gltf") {
    return "GLTF preview is not supported. Export as GLB instead.";
  }
  return `Preview not available for .${suffix}`;
}
