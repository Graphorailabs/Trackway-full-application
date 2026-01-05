import { useState, useEffect } from "react";
import { X } from "lucide-react";

import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import { gerberExportZipFromPcbValue } from "trackway-parser-wasm";
import type { Pcb } from "trackway-parser-wasm";
import GerberExportErrorModal from "./GerberExportErrorModal";

type GerberExportModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called with `true` when validation should run before export, `false` to skip validation */
  onExport?: (runValidation: boolean) => Promise<void> | void;
};

export function GerberExportModal({ open, onClose, onExport }: GerberExportModalProps) {
  const { pcb } = usePcb();
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setLastAction(null);
      setExportError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleExport = async (validate: boolean) => {
    setBusy(true);
    setLastAction(validate ? "validating" : "exporting");
    setExportError(null);
    let failed = false;

    try {
      if (!validate) {
        // Export without validation: call wasm export function directly
        // The editor stores most angles in radians while the WASM exporter
        // expects degrees. Walk the PCB snapshot deeply and convert any
        // numeric angle-like fields that look like radians (|v| <= 2PI)
        // into degrees. This covers arrays like [x,y,angle], objects with
        // `at.angle`, and nested `angle`/`rotation`/`rot` fields.
        const sanitizeAngle = (a: number) => (Math.abs(a) <= Math.PI * 2 + 1e-6 ? (a * 180) / Math.PI : a);

        const isPlainObject = (v: any) => v && typeof v === "object" && !Array.isArray(v);

        const deepSanitize = (v: any): any => {
          if (v == null) return v;
          if (typeof v === "number") return v; // leave raw numbers alone unless keyed as angle
          if (Array.isArray(v)) {
            // detect Xyr tuple [x,y,angle]
            if (v.length === 3 && typeof v[0] === "number" && typeof v[1] === "number" && typeof v[2] === "number") {
              const copy = [...v];
              copy[2] = sanitizeAngle(copy[2]);
              return copy;
            }
            return v.map((item) => deepSanitize(item));
          }
          if (isPlainObject(v)) {
            const out: any = {};
            for (const k of Object.keys(v)) {
              const val = (v as any)[k];
              if (k === "at") {
                // `at` may be tuple [x,y,angle] or object {x,y,angle}
                if (Array.isArray(val) && val.length >= 3 && typeof val[2] === "number") {
                  out[k] = [val[0], val[1], sanitizeAngle(val[2])];
                  continue;
                }
                if (isPlainObject(val) && typeof val.angle === "number") {
                  out[k] = { ...deepSanitize(val), angle: sanitizeAngle(val.angle) };
                  continue;
                }
              }
              if ((k === "angle" || k === "rotation" || k === "rot") && typeof val === "number") {
                out[k] = sanitizeAngle(val);
                continue;
              }
              out[k] = deepSanitize(val);
            }
            return out;
          }
          return v;
        };

        // Some editor flip logic permanently mirrors footprint geometry for bottom-side
        // placement (layer starts with 'B.'). If the exporter also applies a mirror
        // this can lead to double-mirrored graphics that appear offset from pads.
        // As a pragmatic fix, unmirror graphics coordinates for bottom-side footprints
        // here so the exporter sees a consistent canonical orientation.
        const unmirrorBottomSideGraphics = (pcbObj: any) => {
          if (!pcbObj || !Array.isArray(pcbObj.footprints)) return;
          for (const fp of pcbObj.footprints) {
            const layer: string = (fp && fp.layer) || "";
            if (!layer.toUpperCase().startsWith("B.")) continue;

            const unmirrorPoint = (pt: any) => {
              if (!pt || !Array.isArray(pt) || typeof pt[0] !== 'number') return pt;
              return [-pt[0], pt[1]];
            };

            const processGraphic = (g: any) => {
              if (!g || !g.data) return;
              const d = g.data;
              if (Array.isArray(d.start)) d.start = unmirrorPoint(d.start);
              if (Array.isArray(d.end)) d.end = unmirrorPoint(d.end);
              if (Array.isArray(d.center)) d.center = unmirrorPoint(d.center);
              if (d.at && typeof d.at === 'object') {
                if (typeof d.at.x === 'number') d.at.x = -d.at.x;
                if (typeof d.at.y === 'number') d.at.y = d.at.y;
                if (typeof d.at.angle === 'number') d.at.angle = d.at.angle; // angle handled elsewhere
              }
              if (d.pts && d.pts.xy && Array.isArray(d.pts.xy)) {
                d.pts.xy = d.pts.xy.map((pt: any) => (Array.isArray(pt) && typeof pt[0] === 'number' ? [-pt[0], pt[1]] : pt));
              }
              // some old shapes embed coords directly on the graphic object
              if (Array.isArray(g.start)) g.start = unmirrorPoint(g.start);
              if (Array.isArray(g.end)) g.end = unmirrorPoint(g.end);
              if (Array.isArray(g.center)) g.center = unmirrorPoint(g.center);
            };

            if (Array.isArray(fp.graphics)) {
              for (const g of fp.graphics) processGraphic(g);
            }

            // also handle properties/text positions on bottom side
            if (Array.isArray(fp.properties)) {
              for (const prop of fp.properties) {
                if (prop && prop.at && typeof prop.at.x === 'number') prop.at.x = -prop.at.x;
              }
            }
          }
        };

        // Ensure pads and vias have normalized drill fields the exporter expects.
        // The wasm exporter expects pad.drill.diameter and via.data.drill (or .size/diameter).
        const normalizeDrills = (pcbObj: any) => {
          if (!pcbObj) return;
          // footprints -> pads
          const fps = Array.isArray(pcbObj.footprints) ? pcbObj.footprints : [];
          for (const fp of fps) {
            if (!fp || !Array.isArray(fp.pads)) continue;
            for (const p of fp.pads) {
              try {
                const padType = (p && p.pad_type) || null;
                const hasDrill = p && (p.drill || p.data?.drill || p.data?.diameter || p.data?.size);
                if (!hasDrill && padType && String(padType).toLowerCase() === "smd") {
                  // SMD pads typically have no drill — skip
                  continue;
                }
                // If drill is a number, convert to object { diameter }
                if (p && typeof p.drill === 'number') {
                  p.drill = { diameter: Number(p.drill) };
                }
                // If drill missing but data.drill or data.size present, adopt it
                if (p && !p.drill) {
                  const raw = p.data?.drill ?? p.data?.diameter ?? p.data?.size ?? null;
                  if (typeof raw === 'number') p.drill = { diameter: Number(raw) };
                }
                // If still missing and size present, infer a reasonable drill diameter
                if (p && !p.drill && Array.isArray(p.size) && p.size.length >= 1) {
                  const inferred = Math.min(Number(p.size[0]) || 0, Number(p.size[1]) || Number(p.size[0]) || 0) * 0.5;
                  if (inferred > 0) p.drill = { diameter: inferred };
                }
                // Ensure final shape has numeric diameter
                if (p && p.drill && typeof p.drill.diameter === 'string') p.drill.diameter = Number(p.drill.diameter);
              } catch (e) {
                // ignore per-pad failures
              }
            }
          }

          // tracks -> vias
          if (Array.isArray(pcbObj.tracks)) {
            for (const t of pcbObj.tracks) {
              try {
                if (!t || t.kind !== 'via' || !t.data) continue;
                const d = t.data;
                if (typeof d.drill === 'number') continue;
                if (typeof d.size === 'number') d.drill = d.size;
                else if (typeof d.diameter === 'number') d.drill = d.diameter;
                else if (Array.isArray(d.at) && d.at.length === 2 && typeof d.size !== 'number') {
                  // no drill info — fallback to a small default (0.4mm)
                  d.drill = d.drill ?? 0.4;
                }
              } catch (e) {}
            }
          }
        };

            const pcbValue = ((): Pcb => {
          try {
            const cloned = JSON.parse(JSON.stringify(pcb));
            const sanitized = deepSanitize(cloned);
                // apply bottom-side unmirror correction before exporting
                try {
                  unmirrorBottomSideGraphics(sanitized);
                } catch (e) {}
                try {
                  normalizeDrills(sanitized);
                } catch (e) {}

                // Debug: log some sample footprint angles to help diagnose remaining issues
            try {
              const samples = (sanitized.footprints ?? []).slice(0, 6).map((f: any) => ({ uuid: f.uuid, at: f.at }));
              // eslint-disable-next-line no-console
              console.log("[gerber-export] sample sanitized footprint at values", samples);
            } catch (e) {}
            return sanitized as Pcb;
          } catch (e) {
            return pcb as Pcb;
          }
        })();
        // Debug: summarize pad/via drill data present in the PCB value
        try {
          const fpList = (pcbValue?.footprints ?? []) as any[];
          const padDrillCount = fpList.reduce((acc, fp) => acc + ((fp.pads ?? []).filter((p: any) => !!p.drill || (p.pad_type && String(p.pad_type).toLowerCase() !== "smd")).length), 0);
          const padTotal = fpList.reduce((acc, fp) => acc + ((fp.pads ?? []).length), 0);
          const vias = (pcbValue?.tracks ?? []).filter((t: any) => t.kind === "via").map((t: any) => t.data);
          const viaDrillCount = vias.filter((v: any) => v && (v.drill || v.diameter || v.size)).length;
          // eslint-disable-next-line no-console
          console.log("[gerber-export] pad drills", { padTotal, padDrillCount, viaCount: vias.length, viaDrillCount });

          // Also print a small sample of footprints with first pad/graphic coords
          try {
            const sample = fpList.slice(0, 6).map((f) => {
              const firstPad = (f.pads ?? [])[0] ?? null;
              const firstG = (f.graphics ?? [])[0] ?? null;
              const padAt = firstPad ? (Array.isArray(firstPad.at) ? { x: firstPad.at[0], y: firstPad.at[1] } : firstPad.at ?? { x: firstPad.x, y: firstPad.y }) : null;
              const gPos = firstG ? (Array.isArray(firstG.start) ? { start: firstG.start, end: firstG.end, center: firstG.center, layer: firstG.layer, uuid: firstG.uuid, data: firstG.data } : firstG.data ?? firstG) : null;

              // compute global positions applying footprint transform (support array or object `at`)
              const atObj = (() => {
                const at = f.at ?? { x: 0, y: 0, angle: 0 };
                if (Array.isArray(at)) return { x: Number(at[0]) || 0, y: Number(at[1]) || 0, angle: Number(at[2]) || 0 };
                return { x: Number(at.x) || 0, y: Number(at.y) || 0, angle: Number(at.angle) || 0 };
              })();

              const applyTransform = (pt: any) => {
                if (!pt || typeof pt[0] !== "number" || typeof pt[1] !== "number") return null;
                const gx = Number(pt[0]);
                const gy = Number(pt[1]);
                const c = Math.cos(atObj.angle);
                const s = Math.sin(atObj.angle);
                return { x: atObj.x + (gx * c - gy * s), y: atObj.y + (gx * s + gy * c) };
              };

              const padGlobal = padAt ? applyTransform([padAt.x, padAt.y]) : null;
              let graphicGlobal: any = null;
              if (gPos) {
                if (gPos.start && Array.isArray(gPos.start)) graphicGlobal = { start: applyTransform(gPos.start), end: Array.isArray(gPos.end) ? applyTransform(gPos.end) : null, center: Array.isArray(gPos.center) ? applyTransform(gPos.center) : null };
                else if (gPos.data && gPos.data.start && Array.isArray(gPos.data.start)) graphicGlobal = { start: applyTransform(gPos.data.start), end: Array.isArray(gPos.data.end) ? applyTransform(gPos.data.end) : null, center: Array.isArray(gPos.data.center) ? applyTransform(gPos.data.center) : null };
              }

              return { uuid: f.uuid, at: f.at, padAt, padGlobal, padDrill: firstPad?.drill ?? null, graphicSample: gPos, graphicGlobal };
            });
            // eslint-disable-next-line no-console
            console.log("[gerber-export] footprint geometry sample", sample);
          } catch (e) {}
        } catch (e) {
          // ignore
        }

        // Expose the sanitized PCB snapshot on `window` for easier debugging
        try {
          (window as any).__gerber_pcb_snapshot = pcbValue;
        } catch (e) {}

        const raw = gerberExportZipFromPcbValue(pcbValue, null);

        // Ensure we have a plain Uint8Array (backed by ArrayBuffer) so Blob accepts it.
        const zipBytes = raw instanceof Uint8Array ? raw : Uint8Array.from(raw as unknown as Iterable<number>);

        // Normalize to a plain ArrayBuffer-backed Uint8Array so Blob accepts it
        const normalized = new Uint8Array(zipBytes);
        const blob = new Blob([normalized], { type: "application/zip" });
        // Also offer the sanitized PCB snapshot as a downloadable JSON file
        try {
          const snapJson = JSON.stringify(pcbValue, null, 2);
          const snapBlob = new Blob([snapJson], { type: "application/json" });
          const snapUrl = URL.createObjectURL(snapBlob);
          const snapLink = document.createElement("a");
          snapLink.href = snapUrl;
          snapLink.download = "pcb-snapshot.json";
          document.body.appendChild(snapLink);
          snapLink.click();
          snapLink.remove();
          URL.revokeObjectURL(snapUrl);
        } catch (e) {
          // ignore snapshot download failures (browsers may block multiple downloads)
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pcb-gerber.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        if (onExport) await onExport(false);
      } else {
        if (onExport) {
          await onExport(validate);
        } else {
          // default behavior for validate+export: run no-op log
          // eslint-disable-next-line no-console
          console.log("Validate and export requested", { pcb });
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    } catch (e) {
      failed = true;
      // Prefer .message when available, fall back to string
      const msg = (e && (e as any).message) || String(e);
      // eslint-disable-next-line no-console
      console.error("[gerber-export] export error", e);
      setExportError(msg);
    } finally {
      setBusy(false);
      setLastAction(null);
      if (!failed) {
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gerber-export-title"
      onClick={onClose}
    >
      <div
        className="w-[min(92vw,560px)] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Export</p>
            <h2 id="gerber-export-title" className="mt-1 text-lg font-semibold text-white">
              Export PCB to Gerber
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:text-white"
            aria-label="Close export modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6">
          <p className="text-sm text-white/80 mb-3">
            Export the currently open PCB to the Gerber format.
          </p>

          <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs text-white/60">PCB snapshot</p>
            <pre className="mt-2 max-h-28 w-full overflow-auto text-xs text-white/70">
              {JSON.stringify(
                {
                  version: pcb?.version ?? null,
                  footprints: pcb?.footprints?.length ?? 0,
                  tracks: pcb?.tracks?.length ?? 0,
                },
                null,
                2,
              )}
            </pre>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleExport(false)}
              disabled={busy}
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-60"
            >
              {busy && lastAction === "exporting" ? "Exporting..." : "Export to gerber zip"}
            </button>
          </div>
        </div>
      </div>
      <GerberExportErrorModal open={Boolean(exportError)} error={exportError} onClose={() => setExportError(null)} />
    </div>
  );
}

export default GerberExportModal;
