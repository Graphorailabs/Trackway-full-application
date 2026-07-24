import React, { useEffect, useRef, useState } from "react";
import type { FootprintMetadata } from "../types";
import { useFootprintManagers } from "../FootprintManagerContext";
import { footprintLibSexprToValue, footprintLibJsonToValue } from "trackway-parser-wasm";
import { Stage, Layer, Group, Rect, Line } from "react-konva";
import { FOOTPRINT_PREVIEW_DEBUG, FOOTPRINT_PREVIEW_MAX_STAGE_DIM } from "@/features/footprint_manager/constants";
import FootprintKonvaRenderer from "@/features/pcb_editor/footprint/FootprintKonvaRenderer";

type Props = { meta: FootprintMetadata | null };

function computeConservativeBBox(model: any) {
  const xs: number[] = [];
  const ys: number[] = [];
  const push = (x: number, y: number) => {
    xs.push(Number(x) || 0);
    ys.push(Number(y) || 0);
  };

  try {
    (model.pads ?? []).forEach((p: any) => {
      const at = p.at ?? { x: 0, y: 0 };
      const size = p.size ?? [1, 1];
      const w = Number(Array.isArray(size) ? size[0] : size.width ?? size[0]) || 1;
      const h = Number(Array.isArray(size) ? size[1] : size.height ?? size[1] ?? w) || w;
      const x = Number(at.x ?? at[0]) || 0;
      const y = Number(at.y ?? at[1]) || 0;
      push(x - w / 2, y - h / 2);
      push(x + w / 2, y + h / 2);
    });

    (model.graphics ?? []).forEach((g: any) => {
      const kind = (g.kind ?? g.data?.kind ?? "").toLowerCase();
      if (kind === "line" || kind === "rect") {
        const s = g.start ?? g.data?.start ?? [0, 0];
        const e = g.end ?? g.data?.end ?? [0, 0];
        const sx = Number(s.x ?? s[0]) || 0;
        const sy = Number(s.y ?? s[1]) || 0;
        const ex = Number(e.x ?? e[0]) || 0;
        const ey = Number(e.y ?? e[1]) || 0;
        push(sx, sy);
        push(ex, ey);
      } else if (kind === "circle") {
        const c = g.center ?? g.data?.center ?? [0, 0];
        const e = g.end ?? g.data?.end ?? c;
        const cx = Number(c[0] ?? c.x) || 0;
        const cy = Number(c[1] ?? c.y) || 0;
        const ex = Number(e[0] ?? e.x) || cx;
        const ey = Number(e[1] ?? e.y) || cy;
        const r = Math.hypot(ex - cx, ey - cy) || 0;
        push(cx - r, cy - r);
        push(cx + r, cy + r);
      } else if (kind === "arc") {
        const s = g.start ?? g.data?.start;
        const e = g.end ?? g.data?.end;
        const m = g.mid ?? g.data?.mid;
        if (s && e) {
          const sx = Number(Array.isArray(s) ? s[0] : s.x) || 0;
          const sy = Number(Array.isArray(s) ? s[1] : s.y) || 0;
          const ex = Number(Array.isArray(e) ? e[0] : e.x) || 0;
          const ey = Number(Array.isArray(e) ? e[1] : e.y) || 0;
          push(sx, sy);
          push(ex, ey);
          if (m) {
            const mx = Number(Array.isArray(m) ? m[0] : m.x) || 0;
            const my = Number(Array.isArray(m) ? m[1] : m.y) || 0;
            push(mx, my);
          }
        }
      }
    });

    (model.texts ?? []).forEach((t: any) => {
      const at = t.at ?? { x: 0, y: 0 };
      const x = Number(at.x ?? at[0]) || 0;
      const y = Number(at.y ?? at[1]) || 0;
      push(x, y);
    });
  } catch (e) {
    // ignore and fall back to default bbox
  }

  if (!xs.length) return { minX: -5, minY: -5, maxX: 5, maxY: 5 };
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

function FootprintPreviewInner({ meta }: Props) {
  const managers = useFootprintManagers();
  const [fpJson, setFpJson] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Always fit the footprint to the preview area for a consistent display.
  const fitToView = true;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 400, height: 220 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0];
      if (!r) return;
      setSize({ width: Math.max(20, Math.floor(r.contentRect.width)), height: Math.max(20, Math.floor(r.contentRect.height)) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!meta) {
      setFpJson(null);
      setError(null);
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const pkg = meta.source === "cloud" ? await managers.cloud.getPackage(meta.id) : await (managers.local as any).getPackage(meta.id);
        if (!pkg || !pkg.data) throw new Error("No package data");

        let ab: ArrayBuffer | null = null;
        if (pkg.data instanceof ArrayBuffer) ab = pkg.data;
        else if (typeof pkg.data === "string" && pkg.data.length) {
          const res = await fetch(pkg.data);
          ab = await res.arrayBuffer();
        }
        if (!ab) throw new Error("Unsupported package data");

        const txt = new TextDecoder().decode(ab);
        try {
          const lib = footprintLibSexprToValue(txt as string);
          const fp = (lib as any).footprint ?? lib;
          if (mounted) {
            setFpJson(fp);
          }
        } catch (e) {
          const lib = footprintLibJsonToValue(txt as string);
          const fp = (lib as any).footprint ?? lib;
          if (mounted) {
            setFpJson(fp);
          }
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [meta, managers]);

  // Debug: log parsed footprint model when available
  useEffect(() => {
    // debug logging removed: parsed footprint model was previously logged here
  }, [fpJson]);

  if (!meta) return <div className="p-6 text-sm text-slate-400">No footprint selected</div>;

  const model = fpJson as any;
  const bbox = fpJson ? computeConservativeBBox(model) : { minX: -5, minY: -5, maxX: 5, maxY: 5 };
  const bboxW = Math.max(0.1, bbox.maxX - bbox.minX);
  const bboxH = Math.max(0.1, bbox.maxY - bbox.minY);
  const pad = Math.max(bboxW, bboxH) * 0.08 + 2; // mm padding

  const TARGET_PX_PER_MM = 18;
  const desiredW = Math.ceil((bboxW + pad) * TARGET_PX_PER_MM);
  const desiredH = Math.ceil((bboxH + pad) * TARGET_PX_PER_MM);
  const MAX_STAGE_DIM = FOOTPRINT_PREVIEW_MAX_STAGE_DIM;

  const availW = Math.max(20, size.width);
  const availH = Math.max(20, size.height);

  const stageW = fitToView ? availW : Math.max(20, Math.min(desiredW, MAX_STAGE_DIM));
  const stageH = fitToView ? availH : Math.max(20, Math.min(desiredH, MAX_STAGE_DIM));
  const pxPerMm = Math.max(0.02, Math.min(200, Math.min(stageW / (bboxW + pad), stageH / (bboxH + pad))));

  // Prefer an explicit origin defined in the model (model.origin or model.at).
  // If no explicit origin is provided, center the view on the geometric bbox center.
  const origin = (model?.origin ?? model?.at) as any | undefined;
  const bboxCenterX = (bbox.minX + bbox.maxX) / 2;
  const bboxCenterY = (bbox.minY + bbox.maxY) / 2;
  const hasOrigin = origin !== undefined && origin !== null && (origin.x !== undefined || origin[0] !== undefined);
  const centerX = hasOrigin ? Number(origin.x ?? origin[0]) || 0 : bboxCenterX;
  const centerY = hasOrigin ? Number(origin.y ?? origin[1]) || 0 : bboxCenterY;

  return (
    <div className="p-4 flex flex-col gap-4">
      <div ref={containerRef} className="relative w-full h-48 bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-3 text-sm text-slate-400">Loading preview…</div>
        ) : error ? (
          <div className="p-3 text-sm text-rose-400">{error}</div>
        ) : (
          <div className="absolute inset-0">
            <div className="absolute inset-0 flex items-center justify-center">
              <Stage width={stageW} height={stageH}>
                <Layer>
                  <Group x={stageW / 2} y={stageH / 2} scaleX={pxPerMm} scaleY={pxPerMm}>
                    <Group x={-centerX} y={-centerY}>
                      {fpJson ? <FootprintKonvaRenderer model={model} respectLayerVisibility={false} /> : null}
                    </Group>
                  </Group>
                </Layer>

                {FOOTPRINT_PREVIEW_DEBUG ? (
                  <Layer>
                    <Group x={stageW / 2} y={stageH / 2} scaleX={pxPerMm} scaleY={pxPerMm}>
                      <Rect x={bbox.minX - centerX} y={bbox.minY - centerY} width={Math.max(0.1, bboxW)} height={Math.max(0.1, bboxH)} stroke="#ff3b30" strokeWidth={1 / pxPerMm} dash={[4 / pxPerMm, 4 / pxPerMm]} listening={false} />
                      <Line points={[centerX - 8 / pxPerMm, centerY, centerX + 8 / pxPerMm, centerY]} stroke="#22c55e" strokeWidth={1 / pxPerMm} listening={false} />
                      <Line points={[centerX, centerY - 8 / pxPerMm, centerX, centerY + 8 / pxPerMm]} stroke="#22c55e" strokeWidth={1 / pxPerMm} listening={false} />
                    </Group>
                  </Layer>
                ) : null}
              </Stage>
            </div>

            {/* Always fit mode — controls removed */}

            {FOOTPRINT_PREVIEW_DEBUG ? (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full rounded-lg border border-blue-600/40" />
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{meta.name}</div>
          <div className="text-xs text-slate-400 mt-1">{meta.description}</div>
        </div>
        <div className="text-xs text-slate-500 text-right">
          <div>{meta.source ?? "unknown"}</div>
          <div className="mt-2">{meta.category ?? "uncategorized"}</div>
        </div>
      </div>
    </div>
  );
}

type EBState = { hasError: boolean; message?: string };

class PreviewErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): EBState {
    return { hasError: true, message: error?.message ?? String(error) };
  }

  componentDidCatch(error: any, info: any) {
    // Log to console for developer diagnostics
    console.error("PreviewErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-sm text-rose-400">
          <div>Preview failed to render.</div>
          <div className="mt-2 text-xs text-slate-300">{this.state.message}</div>
          <div className="mt-3 text-xs text-slate-400">Try reloading the modal or restarting the dev server.</div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default function FootprintPreview(props: Props) {
  return (
    <PreviewErrorBoundary>
      <FootprintPreviewInner {...props} />
    </PreviewErrorBoundary>
  );
}
