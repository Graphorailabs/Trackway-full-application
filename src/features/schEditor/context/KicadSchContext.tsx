
// import { createContext, useContext, useMemo, useEffect, useRef, useState } from "react";
// import { useSymbol } from "./SymbolContext";
// import { useProject } from "@/hooks/useProject";
// import type { ErcIssue, KicadSch } from "trackway-parser-wasm";
// import { useRouting } from "./WireContext";

/* ========================= TYPES ========================= */

// export type Uuid = string;
// export type Paper = any;
// export type TitleBlock = any;
// export type Polyline = any;
// export type GraphText = any;
// export type LocalLabel = any;
// export type GlobalLabel = any;
// export type RootPath = any;

export type SchematicSymbol = {
  id: string;
  symbolId?: string;
  position?: { x: number; y: number };
  pins?: Array<{ id: string; x?: number; y?: number; net?: string }>;
  raw?: any;
};

// export type LibSymbols = any;
// export type Junction = any;
// export type NoConnect = any;
// export type BusEntry = any;
// export type Bus = any;

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ErcIssue, KicadSch } from "trackway-parser-wasm";
import { useProject } from "@/hooks/useProject";
import { DISABLE_AUTOSAVE } from "../constants";
import { useSymbol } from "./SymbolContext";
import { useRouting } from "./WireContext";


type KicadSchContextType = {
  kicad: KicadSch;
  runErc: () => ErcIssue[];
};

const KicadSchContext = createContext<KicadSchContextType | null>(null);

const LOCAL_AUTOSAVE_KEY = "trackway.editor.autosave";
const PROJECT_COMPANION_FILE = "editor.trackway.json";

const snapToGrid = (pt: { x: number; y: number }) => ({ x: Math.round(pt.x), y: Math.round(pt.y) });

const minimalManhattanPath = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const A = snapToGrid(a);
  const B = snapToGrid(b);
  if (A.x === B.x || A.y === B.y) return [A, B];
  return [A, { x: B.x, y: A.y }, B];
};

const normalizeConsecutivePoints = (pts: any[] | undefined) => {
  if (!Array.isArray(pts)) return [];
  const out: any[] = [];
  for (const p of pts) {
    if (!p) continue;
    const last = out[out.length - 1];
    if (last && Math.abs((last.x ?? 0) - (p.x ?? 0)) < 1e-6 && Math.abs((last.y ?? 0) - (p.y ?? 0)) < 1e-6) continue;
    out.push(p);
  }
  return out;
};

const ensureWireId = (wire: any) => {
  if (!wire) return wire;
  const curId = wire?.id ?? wire?.uuid;
  const bad = !curId || curId === "undefined" || curId === "null";
  if (bad) {
    const gen = (globalThis as any)?.crypto?.randomUUID?.();
    const fallback = `w-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const nextId = gen || fallback;
    wire.id = nextId;
    wire.uuid = nextId;
  } else {
    if (!wire.id) wire.id = curId;
    if (!wire.uuid) wire.uuid = curId;
  }
  return wire;
};

const recomputeFromAnchors = (anchors: Array<{ x: number; y: number; pinId?: string }>) => {
  if (anchors.length < 2) return anchors.map((a) => ({ x: a.x, y: a.y, pinId: a.pinId }));
  const out: any[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const A = anchors[i];
    const B = anchors[i + 1];
    const segment = minimalManhattanPath({ x: A.x, y: A.y }, { x: B.x, y: B.y });
    for (let si = 0; si < segment.length; si++) {
      const spt = segment[si];
      const last = out[out.length - 1];
      if (last && Math.abs(last.x - spt.x) < 1e-6 && Math.abs(last.y - spt.y) < 1e-6) continue;
      let pinId: string | undefined;
      if (si === 0 && A.pinId) pinId = A.pinId;
      if (si === segment.length - 1 && B.pinId) pinId = B.pinId;
      out.push({ x: spt.x, y: spt.y, pinId });
    }
  }
  return out;
};

const anchorsFromPoints = (points: any[]) => {
  const pts = Array.isArray(points) ? points : [];
  if (pts.length === 0) return [];
  const anchors: Array<{ x: number; y: number; pinId?: string }> = [];
  anchors.push({ x: pts[0].x, y: pts[0].y, pinId: pts[0].pinId });
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    if (p?.pinId) anchors.push({ x: p.x, y: p.y, pinId: p.pinId });
  }
  anchors.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, pinId: pts[pts.length - 1].pinId });
  return anchors;
};

export const KicadSchProvider = ({ children }: any) => {
  const [wires, setWires] = useState<any[]>([]);

  const {previewTracks:[], setPreviewTracks} = useRouting();

  const { placedSymbols, setPlacedSymbols } = useSymbol();
  const { currentProject, updateCurrentProjectFiles } = useProject();

  const placedSymbolsRef = useRef<any[]>(placedSymbols || []);
  const wiresRef = useRef<any[]>(wires || []);
  const skipInitialSaveRef = useRef(false);
  const rehydratedProjectIds = useRef<Record<string, boolean>>({});

  useEffect(() => {
    placedSymbolsRef.current = placedSymbols || [];
  }, [placedSymbols]);

  useEffect(() => {
    wiresRef.current = wires || [];
  }, [wires]);

  // Publish canonical wires whenever they change.
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("set-wires", { detail: wires || [] }));
    } catch {}
  }, [wires]);

  const writeSnapshot = async (payload: any) => {
    if (DISABLE_AUTOSAVE) return;
    if (currentProject && typeof updateCurrentProjectFiles === "function") {
      const files = { ...(currentProject.files || {}) } as any;
      files[PROJECT_COMPANION_FILE] = JSON.stringify(payload, null, 2);
      await updateCurrentProjectFiles(files);
      return;
    }
    try {
      window.localStorage?.setItem(LOCAL_AUTOSAVE_KEY, JSON.stringify(payload));
    } catch {}
  };

  // Rehydrate once per project.
  useEffect(() => {
    if (DISABLE_AUTOSAVE) return;
    const pid = currentProject?.id;
    if (!pid) return;
    if (rehydratedProjectIds.current[pid]) return;

    try {
      const files = currentProject.files ?? {};
      const companionPath =
        Object.keys(files).find((p) => p.toLowerCase() === PROJECT_COMPANION_FILE) ||
        Object.keys(files).find((p) => p.toLowerCase().endsWith(".trackway.json"));
      if (!companionPath) {
        rehydratedProjectIds.current[pid] = true;
        return;
      }
      const raw = files[companionPath];
      if (!raw) {
        rehydratedProjectIds.current[pid] = true;
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.placedSymbols)) setPlacedSymbols(parsed.placedSymbols);
      if (Array.isArray(parsed?.wires)) setWires(parsed.wires);
      skipInitialSaveRef.current = true;
      rehydratedProjectIds.current[pid] = true;
    } catch (e) {
      console.warn("[KicadSchProvider] Failed to rehydrate", e);
      rehydratedProjectIds.current[currentProject?.id ?? ""] = true;
    }
  }, [currentProject?.id, setPlacedSymbols]);

  // Restore from localStorage when no project is loaded.
  useEffect(() => {
    if (DISABLE_AUTOSAVE) return;
    if (currentProject) return;
    try {
      const raw = window.localStorage?.getItem(LOCAL_AUTOSAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.placedSymbols)) setPlacedSymbols(parsed.placedSymbols);
      if (Array.isArray(parsed?.wires)) setWires(parsed.wires);
      skipInitialSaveRef.current = true;
    } catch {}
  }, [currentProject, setPlacedSymbols]);

  // Autosave (debounced).
  useEffect(() => {
    if (DISABLE_AUTOSAVE) return;
    if (skipInitialSaveRef.current) {
      skipInitialSaveRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      const payload = { placedSymbols: placedSymbolsRef.current || [], wires: wiresRef.current || [] };
      void writeSnapshot(payload);
    }, 250);
    return () => window.clearTimeout(t);
  }, [placedSymbols, wires, currentProject?.id, updateCurrentProjectFiles]);

  // Ensure a last-resort snapshot on unload.
  useEffect(() => {
    if (DISABLE_AUTOSAVE) return;
    const onBeforeUnload = () => {
      try {
        const payload = { placedSymbols: placedSymbolsRef.current || [], wires: wiresRef.current || [] };
        window.localStorage?.setItem(LOCAL_AUTOSAVE_KEY, JSON.stringify(payload));
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Keep placed symbol pin `connected` flags in sync with wires.
  useEffect(() => {
    try {
      const connectedPinIds = new Set<string>();
      (wires || []).forEach((w: any) => (w.points || []).forEach((p: any) => p?.pinId && connectedPinIds.add(p.pinId)));

      const base = placedSymbolsRef.current || [];
      let changed = false;
      const next = base.map((s: any) => {
        const pins = Array.isArray(s.pins) ? s.pins : [];
        const nextPins = pins.map((p: any) => {
          const want = connectedPinIds.has(p.id);
          if (!!p.connected !== want) changed = true;
          return { ...p, connected: want };
        });
        return { ...s, pins: nextPins };
      });

      // SymbolContext's `setPlacedSymbols` is typed as (data:any[]) => void.
      if (changed) setPlacedSymbols(next);
    } catch {}
  }, [wires, setPlacedSymbols]);

  // Wire-related and integration events.
  useEffect(() => {
    const onRequestWires = () => {
      try {
        window.dispatchEvent(new CustomEvent("set-wires", { detail: wiresRef.current || [] }));
      } catch {}
    };

    const onSetWires = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail;
      const list = Array.isArray(detail) ? detail : Array.isArray(detail?.wires) ? detail.wires : null;
      if (Array.isArray(list)) setWires(list);
    };

    const onWireCommitted = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const wire = ensureWireId(detail?.wire ?? detail);
      if (!wire) return;

      try {
        wire.points = normalizeConsecutivePoints(Array.isArray(wire.points) ? wire.points : []);
      } catch {
        wire.points = Array.isArray(wire.points) ? wire.points : [];
      }

      setWires((prev) => {
        const arr = Array.isArray(prev) ? prev.slice() : [];
        const id = wire.id ?? wire.uuid;
        const idx = arr.findIndex((w: any) => (w.id ?? w.uuid) === id);
        if (idx >= 0) arr[idx] = wire;
        else arr.push(wire);
        // Publish full snapshot so canvases never lose earlier wires.
        try {
          setTimeout(() => {
            try {
              window.dispatchEvent(new CustomEvent("set-wires", { detail: arr.slice() }));
            } catch {}
          }, 0);
        } catch {}
        return arr;
      });
    };

    const onWireRemoved = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const wireId = detail?.wireId;
      const pinIds: string[] = Array.isArray(detail?.pinIds) ? detail.pinIds : [];
      if (wireId) {
        setWires((prev) => (Array.isArray(prev) ? prev.filter((w: any) => (w.id ?? w.uuid) !== wireId) : prev));
      } else if (pinIds.length) {
        setWires((prev) =>
          Array.isArray(prev)
            ? prev.filter((w: any) => !(w.points || []).some((p: any) => p?.pinId && pinIds.includes(p.pinId)))
            : prev
        );
      }
    };

    const onSaveTrackway = () => {
      const payload = { placedSymbols: placedSymbolsRef.current || [], wires: wiresRef.current || [] };
      void writeSnapshot(payload);
    };

    const onConnectWireToPin = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const pinId: string | undefined = detail?.pinId || undefined;
      const x: number | undefined = typeof detail?.x === "number" ? detail.x : undefined;
      const y: number | undefined = typeof detail?.y === "number" ? detail.y : undefined;
      const wireId: string | undefined = detail?.wireId || undefined;
      const end: "start" | "end" | undefined = detail?.end;
      if (!pinId || typeof x !== "number" || typeof y !== "number") return;

      setWires((prev) => {
        const arr = Array.isArray(prev) ? prev.map((w: any) => ({ ...w, points: (w.points || []).map((p: any) => ({ ...p })) })) : [];
        let idx = -1;
        if (wireId) idx = arr.findIndex((w: any) => (w.id ?? w.uuid) === wireId);
        if (idx < 0) return prev;

        const w = ensureWireId(arr[idx]);
        const pts = Array.isArray(w.points) ? w.points : [];
        if (!pts.length) return prev;

        const attachIdx = end === "start" ? 0 : end === "end" ? pts.length - 1 : pts.length - 1;
        pts[attachIdx] = { ...(pts[attachIdx] || {}), x, y, pinId };
        const anchors = anchorsFromPoints(pts);
        w.points = normalizeConsecutivePoints(recomputeFromAnchors(anchors));
        arr[idx] = w;
        return arr;
      });
    };

    const onPlacedSymbolMoved = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const movedPins: Array<any> = Array.isArray(detail?.pins) ? detail.pins : [];
      if (!movedPins.length) return;

      const movedById: Record<string, { x: number; y: number }> = {};
      const priorById: Record<string, { x: number; y: number } | undefined> = {};

      for (const p of movedPins) {
        if (!p?.id) continue;
        movedById[p.id] = { x: p.x, y: p.y };
        if (typeof p.prevX === "number" && typeof p.prevY === "number") {
          priorById[p.id] = { x: p.prevX, y: p.prevY };
        }
      }

      const ATTACH_TH = 2;

      setWires((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        let anyChanged = false;
        const next = list.map((wire: any) => {
          const pts = Array.isArray(wire.points) ? wire.points.map((p: any) => ({ ...p })) : [];
          let touched = false;

          for (const pt of pts) {
            if (pt?.pinId && movedById[pt.pinId]) {
              const np = movedById[pt.pinId];
              pt.x = np.x;
              pt.y = np.y;
              touched = true;
            }
          }

          if (!touched) {
            for (const id of Object.keys(movedById)) {
              const prior = priorById[id];
              if (!prior) continue;
              for (let pi = 0; pi < pts.length; pi++) {
                const pt = pts[pi];
                if (!pt || pt.pinId) continue;
                const d = Math.hypot((pt.x ?? 0) - prior.x, (pt.y ?? 0) - prior.y);
                if (d <= ATTACH_TH) {
                  const np = movedById[id];
                  pts[pi] = { ...(pts[pi] || {}), x: np.x, y: np.y, pinId: id };
                  touched = true;
                  break;
                }
              }
              if (touched) break;
            }
          }

          if (!touched) return wire;
          anyChanged = true;
          const anchors = anchorsFromPoints(pts);
          const newPts = normalizeConsecutivePoints(recomputeFromAnchors(anchors));
          return { ...wire, points: newPts };
        });

        if (!anyChanged) return prev;
        return next;
      });
    };

    window.addEventListener("request-wires", onRequestWires as EventListener);
    window.addEventListener("set-wires", onSetWires as EventListener);
    window.addEventListener("wire-committed", onWireCommitted as EventListener);
    window.addEventListener("wire-added", onWireCommitted as EventListener);
    window.addEventListener("wire-removed", onWireRemoved as EventListener);
    window.addEventListener("save-trackway", onSaveTrackway as EventListener);
    window.addEventListener("connect-wire-to-pin", onConnectWireToPin as EventListener);
    window.addEventListener("placed-symbol-moved", onPlacedSymbolMoved as EventListener);

    return () => {
      window.removeEventListener("request-wires", onRequestWires as EventListener);
      window.removeEventListener("set-wires", onSetWires as EventListener);
      window.removeEventListener("wire-committed", onWireCommitted as EventListener);
      window.removeEventListener("wire-added", onWireCommitted as EventListener);
      window.removeEventListener("wire-removed", onWireRemoved as EventListener);
      window.removeEventListener("save-trackway", onSaveTrackway as EventListener);
      window.removeEventListener("connect-wire-to-pin", onConnectWireToPin as EventListener);
      window.removeEventListener("placed-symbol-moved", onPlacedSymbolMoved as EventListener);
    };
  }, [currentProject, updateCurrentProjectFiles]);

  const stableUuidRef = useRef<string>((globalThis as any)?.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

  const kicad = useMemo<KicadSch>(() => {
    const symbols: any[] = (placedSymbols || []).map((p: any) => {
      const pos = p.position ?? p.pos ?? { x: p.x ?? 0, y: p.y ?? 0 };
      return {
        lib_id: p.symbolId ?? p.id,
        at: [pos.x ?? 0, pos.y ?? 0, 0],
        uuid: p.id,
        pins: (p.pins || []).map((pp: any, i: number) => ({ number: String(i + 1), uuid: pp.id })),
      };
    });

    const kicadWires: any[] = (wires || []).map((w: any) => ({
      pts: { xy: (w.points || []).map((pt: any) => [pt.x ?? 0, pt.y ?? 0]) },
      stroke: { width: 1, type: "solid" as any },
      uuid: w.id ?? w.uuid,
    }));

    return {
      version: 20220414,
      generator: "trackway-web",
      uuid: stableUuidRef.current,
      symbol: symbols as any,
      wire: kicadWires as any,
    } as KicadSch;
  }, [placedSymbols, wires]);

  const runErc = (): ErcIssue[] => [];

  return <KicadSchContext.Provider value={{ kicad, runErc }}>{children}</KicadSchContext.Provider>;
};

export const useKicadSch = () => {
  const ctx = useContext(KicadSchContext);
  if (!ctx) throw new Error("useKicadSch must be used within <KicadSchProvider>");
  return ctx;
};

export const useKicadSchSafe = () => useContext(KicadSchContext);
export default KicadSchContext;
