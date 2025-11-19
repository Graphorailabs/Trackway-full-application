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
