import { createContext, useContext, useMemo, useEffect, useRef, useState } from "react";
import { useSymbol } from "./SymbolContext";
import { useProject } from "@/hooks/useProject";
import type { ErcIssue, KicadSch } from "trackway-parser-wasm";
import { useRouting } from "./WireContext";

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

type KicadSchContextType = {
  kicad: KicadSch;
  runErc: () => ErcIssue[];
};

const KicadSchContext = createContext<KicadSchContextType | null>(null);

/* ========================= PROVIDER ========================= */

export const KicadSchProvider = ({ children }: any) => {
  const [wires, setWires] = useState<any[]>([]);
  const {previewTracks:[], setPreviewTracks} = useRouting();
  const { placedSymbols, setPlacedSymbols } = useSymbol();
  const { currentProject, updateCurrentProjectFiles } = useProject();

  /* ---------- refs for latest state ---------- */

  const placedSymbolsRef = useRef<any[]>(placedSymbols || []);
  const wiresRef = useRef<any[]>(wires || []);
  useEffect(() => { placedSymbolsRef.current = placedSymbols || []; }, [placedSymbols]);
  useEffect(() => { wiresRef.current = wires || []; }, [wires]);

  /* ---------- rehydration guard ---------- */

  const isRehydratedRef = useRef(false);
  const rehydratedProjectIds = useRef<Record<string, boolean>>({});

  /* ---------- publish wires ---------- */

  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("set-wires", { detail: wires || [] }));
    } catch {}
  }, [wires]);

  /* ========================= AUTOSAVE ========================= */

  const saveTimerRef = useRef<number | null>(null);

  const doSaveTrackway = async () => {
    if (!currentProject?.id) return;
    if (!isRehydratedRef.current) return;

    const payload = {
      placedSymbols: placedSymbolsRef.current || [],
      wires: wiresRef.current || [],
    };

    const fileName = `${currentProject.id}.trackway.json`;
    const files: Record<string, string> = {
      [fileName]: JSON.stringify(payload, null, 2),
    };

    try {
      await updateCurrentProjectFiles(files);
    } catch (e) {
      console.warn("[KicadSchProvider] failed to save", e);
    }
  };

  const scheduleSave = () => {
    if (!isRehydratedRef.current) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    saveTimerRef.current = window.setTimeout(() => {
      void doSaveTrackway();
      saveTimerRef.current = null;
    }, 250) as unknown as number;
  };

  /* ========================= REHYDRATE ========================= */

  useEffect(() => {
    const pid = currentProject?.id;
    if (!pid) return;
    if (rehydratedProjectIds.current[pid]) return;

    const files = currentProject.files ?? {};
    const companionPath = Object.keys(files).find(p =>
      p.toLowerCase().endsWith(".trackway.json")
    );

    if (!companionPath) {
      rehydratedProjectIds.current[pid] = true;
      isRehydratedRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(files[companionPath]);
      if (Array.isArray(parsed.placedSymbols)) setPlacedSymbols(parsed.placedSymbols);
      if (Array.isArray(parsed.wires)) setWires(parsed.wires);
    } catch (e) {
      console.warn("Rehydrate failed", e);
    }

    rehydratedProjectIds.current[pid] = true;
    isRehydratedRef.current = true;
  }, [currentProject?.id, setPlacedSymbols]);

  /* ========================= WIRE EVENTS ========================= */

  useEffect(() => {
    const onSetWires = (ev: Event) => {
      const list = (ev as CustomEvent).detail;
      if (Array.isArray(list)) {
        setWires(list);
        scheduleSave();
      }
    };

    const onWireCommit = (ev: Event) => {
      const wire = (ev as CustomEvent).detail?.wire ?? (ev as CustomEvent).detail;
      if (!wire) return;

      setWires(prev => {
        const arr = [...prev];
        const i = arr.findIndex(w => (w.id ?? w.uuid) === (wire.id ?? wire.uuid));
        if (i >= 0) arr[i] = wire;
        else arr.push(wire);
        return arr;
      });
      scheduleSave();
    };

    const onWireRemoved = (ev: Event) => {
      const wid = (ev as CustomEvent).detail?.wireId;
      if (!wid) return;
      setWires(prev => prev.filter(w => (w.id ?? w.uuid) !== wid));
      scheduleSave();
    };

    window.addEventListener("set-wires", onSetWires as EventListener);
    window.addEventListener("wire-added", onWireCommit as EventListener);
    window.addEventListener("wire-committed", onWireCommit as EventListener);
    window.addEventListener("wire-removed", onWireRemoved as EventListener);

    return () => {
      window.removeEventListener("set-wires", onSetWires as EventListener);
      window.removeEventListener("wire-added", onWireCommit as EventListener);
      window.removeEventListener("wire-committed", onWireCommit as EventListener);
      window.removeEventListener("wire-removed", onWireRemoved as EventListener);
    };
  }, []);

  /* ========================= SYMBOL AUTOSAVE ========================= */

  useEffect(() => {
    if (!isRehydratedRef.current) return;
    if (!currentProject?.id) return;
    scheduleSave();
  }, [placedSymbols]);

  /* ========================= KICAD SCHEMA ========================= */

  const stableUuidRef = useRef<string>(
    crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  );

  const kicad = useMemo<KicadSch>(() => {
    const symbols = placedSymbols.map((p: any) => ({
      lib_id: p.symbolId ?? p.id,
      at: [p.position?.x ?? 0, p.position?.y ?? 0, 0],
      uuid: p.id,
      pins: (p.pins || []).map((pp: any, i: number) => ({
        number: String(i + 1),
        uuid: pp.id,
      })),
    }));

    const kicadWires = wires.map((w: any) => ({
      pts: { xy: w.points.map((p: any) => [p.x, p.y]) },
      stroke: { width: 1, type: "solid" as any },
      uuid: w.id,
    }));

    return {
      version: 20220414,
      generator: "trackway-web",
      uuid: stableUuidRef.current,
      symbol: symbols as any,
      wire: kicadWires,
    } as KicadSch;
  }, [placedSymbols, wires]);

  /* ========================= ERC ========================= */

  const runErc = (): ErcIssue[] => {
    return [];
  };

  return (
    <KicadSchContext.Provider value={{ kicad, runErc }}>
      {children}
    </KicadSchContext.Provider>
  );
};

/* ========================= HOOKS ========================= */

export const useKicadSch = () => {
  const ctx = useContext(KicadSchContext);
  if (!ctx) throw new Error("useKicadSch must be used within provider");
  return ctx;
};

export const useKicadSchSafe = () => useContext(KicadSchContext);
export default KicadSchContext;
