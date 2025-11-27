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
import type { SheetMetadata } from "@/features/pcb_editor/types";
import { createBlankPcb, deriveMetadata } from "@/features/pcb_editor/state/pcbDocumentUtils";
import { usePcbSourceManager, type PcbSource } from "@/features/pcb_editor/state/usePcbSourceManager";
import { type Paper, type Pcb, type PcbGraphicItem } from "trackway-parser-wasm";

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
  updatePcb: (updater: (current: Pcb) => Pcb) => void;
  addGraphicItem: (item: PcbGraphicItem) => void;
  // Via helpers: operate on `pcb.tracks` where kind === 'via'
  addVia: (via: import("trackway-parser-wasm").TrackVia) => void;
  updateVia: (uuid: string, updater: (current: import("trackway-parser-wasm").TrackVia) => import("trackway-parser-wasm").TrackVia) => void;
  updateViaPosition: (uuid: string, at: { x: number; y: number }) => void;
  removeVia: (uuid: string) => void;
  // Track helpers: add/update/remove arbitrary track entries (segments, arcs, vias)
  addTrack: (track: import("trackway-parser-wasm").Track) => void;
  updateTrack: (uuid: string, updater: (current: import("trackway-parser-wasm").Track) => import("trackway-parser-wasm").Track) => void;
  removeTrack: (uuid: string) => void;
  // Footprint helpers: operate on the `pcb.footprints` array
  addFootprint: (fp: import("trackway-parser-wasm").Footprint) => void;
  updateFootprint: (uuid: string, updater: (current: import("trackway-parser-wasm").Footprint) => import("trackway-parser-wasm").Footprint) => void;
  removeFootprint: (uuid: string) => void;
  placeFootprint: (fp: import("trackway-parser-wasm").Footprint, at: { x: number; y: number; angle?: number }) => void;
  reloadFromProject: () => void;
  savePcb: () => Promise<{ filePath: string }>;
};

const PcbContext = createContext<PcbContextValue | null>(null);

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

  const applyLoadedPcb = useCallback((next: Pcb) => {
    setPcb(next);
    pcbRef.current = next;
  }, []);

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
    const next = updater(pcbRef.current);
    pcbRef.current = next;
    setPcb(next);
  }, []);

  const addGraphicItem = useCallback(
    (item: PcbGraphicItem) => {
      updatePcb((current) => ({
        ...current,
        graphics: [...(current.graphics ?? []), item],
      }));
    },
    [updatePcb],
  );

  // VIA helpers
  const addVia = useCallback(
    (via: import("trackway-parser-wasm").TrackVia) => {
      updatePcb((current) => ({
        ...current,
        tracks: [...(current.tracks ?? []), { kind: "via" as const, data: via }],
      }));
    },
    [updatePcb],
  );

  const updateVia = useCallback(
    (uuid: string, updater: (current: import("trackway-parser-wasm").TrackVia) => import("trackway-parser-wasm").TrackVia) => {
      updatePcb((current) => ({
        ...current,
        tracks: (current.tracks ?? []).map((t) => (t.kind === "via" && (t.data as any).uuid === uuid ? ({ kind: "via" as const, data: updater(t.data as import("trackway-parser-wasm").TrackVia) }) : t)),
      }));
    },
    [updatePcb],
  );

  const updateViaPosition = useCallback(
    (uuid: string, at: { x: number; y: number }) => {
      updateVia(uuid, (current) => ({ ...current, at: [at.x, at.y] } as import("trackway-parser-wasm").TrackVia));
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
    (track: import("trackway-parser-wasm").Track) => {
      updatePcb((current) => ({
        ...current,
        tracks: [...(current.tracks ?? []), track],
      }));
    },
    [updatePcb],
  );

  const updateTrack = useCallback(
    (uuid: string, updater: (current: import("trackway-parser-wasm").Track) => import("trackway-parser-wasm").Track) => {
      updatePcb((current) => ({
        ...current,
        tracks: (current.tracks ?? []).map((t) => ((t.data as any)?.uuid === uuid ? updater(t as import("trackway-parser-wasm").Track) : t)),
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
    (fp: import("trackway-parser-wasm").Footprint) => {
      updatePcb((current) => ({
        ...current,
        footprints: [...(current.footprints ?? []), fp],
      }));
    },
    [updatePcb],
  );

  const updateFootprint = useCallback(
    (uuid: string, updater: (current: import("trackway-parser-wasm").Footprint) => import("trackway-parser-wasm").Footprint) => {
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
    (fp: import("trackway-parser-wasm").Footprint, at: { x: number; y: number; angle?: number }) => {
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
      } as import("trackway-parser-wasm").Footprint;

      // Debug logging removed: placement details were previously emitted here.

      addFootprint(instance);
    },
    [addFootprint],
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
      updatePcb,
      addGraphicItem,
      addFootprint,
      updateFootprint,
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
      updatePcb,
      addGraphicItem,
      addFootprint,
      updateFootprint,
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
