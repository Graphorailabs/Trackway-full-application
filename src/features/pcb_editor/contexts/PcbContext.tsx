/* eslint-disable react-refresh/only-export-components -- Context module shares hooks and helpers */
/**
 * PCB document context: exposes a single source of truth for the active PCB plus
 * mutation helpers that editing tools can call.
 *
 * All heavy project IO lives in `usePcbSourceManager`, keeping this file focused on
 * wiring renderer consumers to the parsed PCB state.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { useProject } from "@/hooks/useProject";
import flipFootprintService from "@/features/pcb_editor/services/flipFootprint";
import type { SheetMetadata } from "@/features/pcb_editor/types";
import { createBlankPcb, deriveMetadata } from "@/features/pcb_editor/state/pcbDocumentUtils";
import { usePcbSourceManager, type PcbSource } from "@/features/pcb_editor/state/usePcbSourceManager";
import { type CanonicalLayer, type Paper, type Pcb, type PcbGraphicItem, type Footprint, type Track, type TrackVia } from "trackway-parser-wasm";

/**
 * Public API surfaced to any component inside the PCB editor tree.
 */
export type PcbContextValue = {
  pcb: Pcb;
  page: Paper | null;
  sheetMetadata: SheetMetadata;
  source: PcbSource | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveError: string | null;
  lastSavedAt: number | null;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  updatePcb: (updater: (current: Pcb) => Pcb) => void;
  addGraphicItem: (item: PcbGraphicItem) => void;
  // Via helpers: operate on `pcb.tracks` where kind === 'via'
  addVia: (via: TrackVia) => void;
  updateVia: (uuid: string, updater: (current: TrackVia) => TrackVia) => void;
  updateViaPosition: (uuid: string, at: { x: number; y: number }) => void;
  removeVia: (uuid: string) => void;
  // Track helpers: add/update/remove arbitrary track entries (segments, arcs, vias)
  addTrack: (track: Track) => void;
  updateTrack: (uuid: string, updater: (current: Track) => Track) => void;
  removeTrack: (uuid: string) => void;
  // Footprint helpers: operate on the `pcb.footprints` array
  addFootprint: (fp: Footprint) => void;
  updateFootprint: (uuid: string, updater: (current: Footprint) => Footprint) => void;
  removeFootprint: (uuid: string) => void;
  placeFootprint: (fp: Footprint, at: { x: number; y: number; angle?: number }, layerOverride?: CanonicalLayer) => string;
  flipFootprint: (uuid: string) => void;
  highlightFootprint: (uuid: string) => void;
  flashHighlightUuid: string | null;
  reloadFromProject: () => void;
  savePcb: () => Promise<{ filePath: string }>;
};

const PcbContext = createContext<PcbContextValue | null>(null);
const DEFAULT_FRONT_LAYER: CanonicalLayer = "F.Cu";

/**
 * Convenience hook so consumers do not need to import React context internals.
 */
export function usePcb() {
  const ctx = useContext(PcbContext);
  if (!ctx) throw new Error("usePcb must be used within <PcbProvider>");
  return ctx;
}

/**
 * Wraps the PCB editor subtree with document state + persistence wiring.
 */
export function PcbProvider({ children }: PropsWithChildren) {
  const {
    currentProject,
    updateCurrentProjectFiles,
    isLoading: isProjectLoading,
    selectionHydrated,
    loadProject,
  } = useProject();

  const [pcb, setPcb] = useState<Pcb>(() => createBlankPcb());
  const pcbRef = useRef<Pcb>(pcb);

  const HISTORY_LIMIT = 50;
  const [past, setPast] = useState<Pcb[]>([]);
  const [future, setFuture] = useState<Pcb[]>([]);
  const pastRef = useRef<Pcb[]>(past);
  const futureRef = useRef<Pcb[]>(future);

  useEffect(() => {
    pastRef.current = past;
  }, [past]);

  useEffect(() => {
    futureRef.current = future;
  }, [future]);

  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
    pastRef.current = [];
    futureRef.current = [];
  }, []);

  const applyPcbState = useCallback((next: Pcb) => {
    setPcb(next);
    pcbRef.current = next;
  }, []);

  const applyLoadedPcb = useCallback(
    (next: Pcb) => {
      clearHistory();
      applyPcbState(next);
    },
    [applyPcbState, clearHistory],
  );

  const getSnapshot = useCallback(() => pcbRef.current ?? createBlankPcb(), []);

  const {
    source,
    isLoading,
    loadError,
    reloadFromProject: reloadFromSource,
    isSaving,
    saveError,
    lastSavedAt,
    savePcb: persistPcb,
  } = usePcbSourceManager({
    currentProject,
    isProjectLoading,
    selectionHydrated,
    loadProject,
    updateCurrentProjectFiles,
    applyLoadedPcb,
    getSnapshot,
  });

  const reloadFromProject = useCallback(() => {
    // TODO: this is a bit of a hack, but it works for now
    // we need to refactor the project context to better support this
     
    reloadFromSource();
  }, [reloadFromSource]);

  const page = useMemo(() => pcb.page ?? null, [pcb.page]);

  const sheetMetadata = useMemo(() => deriveMetadata(pcb), [pcb]);

  const updatePcb = useCallback((updater: (current: Pcb) => Pcb) => {
    const current = pcbRef.current;
    const next = updater(current);
    if (next === current) return;

    // Record history for undo and clear redo branch.
    setPast((prev) => {
      const updated = [...prev, current];
      if (updated.length > HISTORY_LIMIT) {
        updated.splice(0, updated.length - HISTORY_LIMIT);
      }
      pastRef.current = updated;
      return updated;
    });
    setFuture(() => {
      futureRef.current = [];
      return [];
    });

    applyPcbState(next);
  }, [applyPcbState]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    const current = pcbRef.current;
    if (!pastRef.current.length) return;
    const previous = pastRef.current[pastRef.current.length - 1] as Pcb;
    const nextPast = pastRef.current.slice(0, -1);
    const nextFuture = [current, ...futureRef.current];

    pastRef.current = nextPast;
    futureRef.current = nextFuture;

    setPast(nextPast);
    setFuture(nextFuture);
    applyPcbState(previous);
  }, [applyPcbState]);

  const redo = useCallback(() => {
    const current = pcbRef.current;
    if (!futureRef.current.length) return;
    const next = futureRef.current[0] as Pcb;
    const nextFuture = futureRef.current.slice(1);
    const nextPast = [...pastRef.current, current];
    if (nextPast.length > HISTORY_LIMIT) {
      nextPast.splice(0, nextPast.length - HISTORY_LIMIT);
    }

    pastRef.current = nextPast;
    futureRef.current = nextFuture;

    setPast(nextPast);
    setFuture(nextFuture);
    applyPcbState(next);
  }, [applyPcbState]);

  const addGraphicItem = useCallback(
    (item: PcbGraphicItem) => {
      updatePcb((current) => ({
        ...current,
        graphics: [...(current.graphics ?? []), item],
      }));
    },
    [updatePcb],
  );

  const [flashHighlightUuid, setFlashHighlightUuid] = useState<string | null>(null);
  const highlightFootprint = useCallback((uuid: string) => {
    setFlashHighlightUuid(uuid);
    try {
      window.setTimeout(() => setFlashHighlightUuid((cur) => (cur === uuid ? null : cur)), 900);
    } catch (e) {
      // ignore
    }
  }, []);

  // VIA helpers
  const addVia = useCallback(
    (via: TrackVia) => {
      updatePcb((current) => ({
        ...current,
        tracks: [...(current.tracks ?? []), { kind: "via" as const, data: via }],
      }));
    },
    [updatePcb],
  );

  const updateVia = useCallback(
    (uuid: string, updater: (current: TrackVia) => TrackVia) => {
      updatePcb((current) => ({
        ...current,
        tracks: (current.tracks ?? []).map((t) => (t.kind === "via" && (t.data as any).uuid === uuid ? ({ kind: "via" as const, data: updater(t.data as TrackVia) }) : t)),
      }));
    },
    [updatePcb],
  );

  const updateViaPosition = useCallback(
    (uuid: string, at: { x: number; y: number }) => {
      updateVia(uuid, (current) => ({ ...current, at: [at.x, at.y] } as TrackVia));
    },
    [updateVia],
  );

  const removeVia = useCallback(
    (uuid: string) => {
      updatePcb((current) => ({
        ...current,
        tracks: (current.tracks ?? []).filter((t) => !(t.kind === "via" && (t.data as any).uuid === uuid)),
      }));
    },
    [updatePcb],
  );

  // Track helpers (segments, arcs, vias)
  const addTrack = useCallback(
    (track: Track) => {
      updatePcb((current) => ({
        ...current,
        tracks: [...(current.tracks ?? []), track],
      }));
    },
    [updatePcb],
  );

  const updateTrack = useCallback(
    (uuid: string, updater: (current: Track) => Track) => {
      updatePcb((current) => ({
        ...current,
        tracks: (current.tracks ?? []).map((t) => ((t.data as any)?.uuid === uuid ? updater(t as Track) : t)),
      }));
    },
    [updatePcb],
  );

  const removeTrack = useCallback(
    (uuid: string) => {
      updatePcb((current) => ({
        ...current,
        tracks: (current.tracks ?? []).filter((t) => !((t.data as any)?.uuid === uuid)),
      }));
    },
    [updatePcb],
  );

  const addFootprint = useCallback(
    (fp: Footprint) => {
      updatePcb((current) => ({
        ...current,
        footprints: [...(current.footprints ?? []), fp],
      }));
    },
    [updatePcb],
  );

  const updateFootprint = useCallback(
    (uuid: string, updater: (current: Footprint) => Footprint) => {
      updatePcb((current) => ({
        ...current,
        footprints: (current.footprints ?? []).map((f) => (f.uuid === uuid ? updater(f) : f)),
      }));
    },
    [updatePcb],
  );

  const removeFootprint = useCallback(
    (uuid: string) => {
      updatePcb((current) => ({
        ...current,
        footprints: (current.footprints ?? []).filter((f) => f.uuid !== uuid),
      }));
    },
    [updatePcb],
  );

  const placeFootprint = useCallback(
    (fp: Footprint, at: { x: number; y: number; angle?: number }, layerOverride?: CanonicalLayer) => {
      const targetLayer = (layerOverride ?? (fp.layer as CanonicalLayer | undefined) ?? DEFAULT_FRONT_LAYER) as CanonicalLayer;
      // Ensure the placed instance contains the expected arrays and avoid
      // accidental missing properties by normalizing the model. We also
      // shallow-clone nested arrays so later mutations don't affect the
      // original parsed model used for preview.
      const instance = {
        ...fp,
        pads: Array.isArray((fp as any).pads) ? (fp as any).pads.map((p: any) => ({ ...p })) : [],
        graphics: Array.isArray((fp as any).graphics) ? (fp as any).graphics.map((g: any) => ({ ...g })) : [],
        texts: Array.isArray((fp as any).texts) ? (fp as any).texts.map((t: any) => ({ ...t })) : [],
        properties: Array.isArray((fp as any).properties) ? (fp as any).properties.map((p: any) => ({ ...p })) : [],
        at: { x: at.x, y: at.y, angle: at.angle ?? 0 },
        placed: true,
        layer: targetLayer,
        name: (fp as any).name || (fp as any).library_link || (fp as any).properties?.find((p: any) => p.name === 'Reference')?.value || 'REF**',
      } as Footprint;

      // Debug logging removed: placement details were previously emitted here.

      // Ensure instance has a uuid
      if (!instance.uuid) instance.uuid = crypto.randomUUID();
      addFootprint(instance);
      try {
        highlightFootprint(instance.uuid as string);
      } catch (e) {}
      return instance.uuid as string;
    },
    [addFootprint, highlightFootprint],
  );

  // Listen for schematic requests to place footprints (dispatched by the schematic provider)
  useEffect(() => {
    const onSchematicPlace = async (ev: Event) => {
      try {
        const detail: any = (ev as CustomEvent).detail || {};
        const instance: any = detail?.instance;
        if (!instance) return;
        // Use placeFootprint helper to add to PCB state and collect placed items
        const placedItems: Array<{ uuid: string; footprintId?: any; schematicSymbolId?: any }> = [];
        try {
          const uuid = placeFootprint(instance as Footprint, { x: instance.at?.x ?? 0, y: instance.at?.y ?? 0, angle: instance.at?.angle ?? 0 });
          placedItems.push({ uuid, footprintId: detail.footprintId, schematicSymbolId: detail.schematicSymbolId });
          try { console.log('[PcbProvider] placed footprint requested by schematic', { uuid, schematicSymbolId: detail.schematicSymbolId, footprintId: detail.footprintId }); } catch (e) {}
        } catch (e) {
          try { console.warn('[PcbProvider] failed to place footprint from schematic', e); } catch (e) {}
        }

        // Persist PCB after placement and log the list of placed footprints
        try {
          await persistPcb();
          try { console.log('[PcbProvider] saved PCB after schematic footprint placement', { placed: placedItems }); } catch (e) {}
        } catch (e) {
          try { console.warn('[PcbProvider] failed to save PCB after schematic footprint placement', e, { attempted: placedItems }); } catch (e) {}
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('schematic-place-footprint', onSchematicPlace as EventListener);
    return () => window.removeEventListener('schematic-place-footprint', onSchematicPlace as EventListener);
  }, [placeFootprint, persistPcb]);

    // Flip a footprint in-place on the PCB. Uses the shared service to
    // produce a flipped clone then replaces the footprint entry so React
    // consumers re-render consistently.
    const flipFootprint = useCallback(
      (uuid: string) => {
        try {
            try { console.debug('[pcb] flipFootprint called', { uuid }); } catch (e) {}
            try { console.log('[pcb] flipFootprint called', { uuid }); } catch (e) {}
            console.log(pcb)
        } catch (err) {}
        // Reuse updateFootprint so we follow the same update path as rotate
        try {
          updateFootprint(uuid, (f: any) => {
            try {
              const flipped = flipFootprintService(f);
              // Emit compact before/after summary to help runtime diagnosis
              try {
                const sampleOldPad = (f.pads && f.pads[0]) ? f.pads[0] : null;
                const sampleNewPad = (flipped.pads && flipped.pads[0]) ? flipped.pads[0] : null;
                // compact pad/graphics summary
                const summarizeGraphics = (arr: any[] | undefined) => (arr ?? []).map((g) => {
                  try {
                    return {
                      kind: g.kind ?? (g.data && g.data.kind) ?? 'unknown',
                      start: Array.isArray(g.start) ? [g.start[0], g.start[1]] : (g.start ? { x: g.start.x, y: g.start.y } : null),
                      end: Array.isArray(g.end) ? [g.end[0], g.end[1]] : (g.end ? { x: g.end.x, y: g.end.y } : null),
                      center: Array.isArray(g.center) ? [g.center[0], g.center[1]] : (g.center ? { x: g.center.x, y: g.center.y } : null),
                      mid: Array.isArray(g.mid) ? [g.mid[0], g.mid[1]] : (g.mid ? { x: g.mid.x, y: g.mid.y } : null),
                      ptsCount: Array.isArray(g.pts) ? g.pts.length : (g.data && g.data.pts && Array.isArray(g.data.pts.xy) ? g.data.pts.xy.length : 0),
                      x: typeof g.x === 'number' ? g.x : (g.data && typeof g.data.x === 'number' ? g.data.x : null),
                      y: typeof g.y === 'number' ? g.y : (g.data && typeof g.data.y === 'number' ? g.data.y : null),
                      layer: g.layer ?? g.data?.layer ?? null,
                    };
                  } catch (e) { return { kind: 'err' }; }
                });

                console.log('[pcb] flipFootprint before/after summary', {
                  uuid: f.uuid,
                  beforeAt: f.at,
                  afterAt: flipped.at,
                  padBefore: sampleOldPad ? { at: sampleOldPad.at ?? { x: sampleOldPad.x, y: sampleOldPad.y }, layers: sampleOldPad.layers ?? sampleOldPad.data?.layers ?? null } : null,
                  padAfter: sampleNewPad ? { at: sampleNewPad.at ?? { x: sampleNewPad.x, y: sampleNewPad.y }, layers: sampleNewPad.layers ?? sampleNewPad.data?.layers ?? null } : null,
                  graphicsBefore: summarizeGraphics(f.graphics),
                  graphicsAfter: summarizeGraphics(flipped.graphics),
                });
              } catch (e) {}
              const oldAt = f.at ?? { x: 0, y: 0, angle: 0 };
              const newAt = flipped.at ?? {};
              const atObj = {
                x: (oldAt as any).x ?? (Array.isArray(oldAt) ? oldAt[0] ?? 0 : 0),
                y: (oldAt as any).y ?? (Array.isArray(oldAt) ? oldAt[1] ?? 0 : 0),
                angle: (newAt as any).angle ?? (oldAt as any).angle ?? 0,
              };
              return { ...flipped, at: atObj, uuid: f.uuid, placed: f.placed ?? true } as any;
            } catch (err) {
              return f;
            }
          });
        } catch (err) {
          // ignore
        }
        try {
          highlightFootprint(uuid);
        } catch (e) {}
      },
      [updateFootprint],
    );

  const contextValue = useMemo<PcbContextValue>(
    () => ({
      pcb,
      page,
      sheetMetadata,
      source,
      isLoading,
      isSaving,
      error: loadError,
      saveError,
      lastSavedAt,
      canUndo,
      canRedo,
      undo,
      redo,
      updatePcb,
      addGraphicItem,
      addFootprint,
      updateFootprint,
      flipFootprint,
      highlightFootprint,
      flashHighlightUuid,
      removeFootprint,
      placeFootprint,
      addVia,
      updateVia,
      updateViaPosition,
      removeVia,
      addTrack,
      updateTrack,
      removeTrack,
      reloadFromProject: reloadFromProject,
      savePcb: persistPcb,
    }),
    [
      pcb,
      page,
      sheetMetadata,
      source,
      isLoading,
      isSaving,
      loadError,
      saveError,
      lastSavedAt,
      canUndo,
      canRedo,
      undo,
      redo,
      updatePcb,
      addGraphicItem,
      addFootprint,
      updateFootprint,
      flipFootprint,
      highlightFootprint,
      flashHighlightUuid,
      removeFootprint,
      placeFootprint,
      addVia,
      updateVia,
      updateViaPosition,
      removeVia,
      addTrack,
      updateTrack,
      removeTrack,
      reloadFromProject,
      persistPcb,
    ],
  );

  // Keep a ref to the PCB to avoid re-renders on every change
  useEffect(() => {
    pcbRef.current = pcb;
  }, [pcb]);

  return <PcbContext.Provider value={contextValue}>{children}</PcbContext.Provider>;
}
