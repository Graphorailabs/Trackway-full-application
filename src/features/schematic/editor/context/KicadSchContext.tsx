import { createContext, useContext, useMemo } from "react";
import { useWires } from "./WireContext";
import type { Wire } from "./WireContext";
import { useSymbol } from "./SymbolContext";


// Minimal helper types for parts of the KiCad schema we care about
export type Uuid = string;
export type Paper = any;
export type TitleBlock = any;

export type Polyline = any;
export type GraphText = any;
export type LocalLabel = any;
export type GlobalLabel = any;
export type RootPath = any;

export type SchematicSymbol = {
  id: string;
  symbolId?: string;
  position?: { x: number; y: number };
  pins?: Array<{ id: string; x?: number; y?: number; net?: string }>;
  raw?: any;
};

export type LibSymbols = any;

export type Junction = any;
export type NoConnect = any;
export type BusEntry = any;
export type Bus = any;

export type KicadSch = {
  version: number;
  generator: string;
  generator_version?: string;
  uuid: Uuid;
  paper?: Paper;
  title_block?: TitleBlock;
  lib_symbols?: LibSymbols;
  sheet?: any[];
  junction?: Junction[];
  no_connect?: NoConnect[];
  bus_entry?: BusEntry[];
  wire?: Wire[];
  bus?: Bus[];
  polyline?: Polyline[];
  text?: GraphText[];
  label?: LocalLabel[];
  global_label?: GlobalLabel[];
  symbol?: SchematicSymbol[];
  path?: RootPath;
};

export type ErcIssue = {
  id: string;
  severity: "error" | "warning" | "info";
  message: string;
  refs?: string[]; // related ids (wire id, symbol id, pin id)
};

type KicadSchContextType = {
  kicad: KicadSch;
  runErc: () => ErcIssue[];
};

const KicadSchContext = createContext<KicadSchContextType | null>(null);

export const KicadSchProvider = ({ children }: any) => {
  const { wires } = useWires();
  const { placedSymbols, livePinPositionsRef } = useSymbol();

  const kicad = useMemo<KicadSch>(() => {
    const symbols: SchematicSymbol[] = placedSymbols.map((p: any) => ({
      id: p.id,
      symbolId: p.symbolId ?? p.id,
      position: p.position ?? p.pos ?? { x: p.x ?? 0, y: p.y ?? 0 },
      pins:
        p.pins?.map((pin: any) => ({ id: pin.id, x: pin.x, y: pin.y })) ??
        // fallback to livePinPositionsRef if available
        (livePinPositionsRef.current?.[p.id]
          ? Object.entries(livePinPositionsRef.current[p.id]).map(([pinId, pos]) => ({ id: pinId, x: pos.x, y: pos.y }))
          : []),
      raw: p,
    }));

    return {
      version: 20220414,
      generator: "trackway-web",
      uuid: crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
      wire: wires,
      symbol: symbols,
    } as KicadSch;
  }, [wires, placedSymbols, livePinPositionsRef]);

  const runErc = (): ErcIssue[] => {
    const issues: ErcIssue[] = [];
 console.log("Running ERC...");
    // 1) Floating wires: wires that have no connected points (no pinId on any point)
    wires.forEach((w) => {
      const anyConnected = w.points.some((p) => !!p.pinId || p.connected);
      if (!anyConnected) {
        issues.push({ id: `wire-${w.id}`, severity: "warning", message: "Floating wire (no connected pins)", refs: [w.id] });
      }
    });
    console.log("wires", wires);
    // 2) Pins without a connected wire: find placed symbol pins that aren't referenced by any wire
    const allPinIds = new Set<string>();
    placedSymbols.forEach((s: any) => {
      const pins = s.pins ?? [];
      pins.forEach((pin: any) => allPinIds.add(pin.id));
    });

    console.log("allPinIds", allPinIds);
    const connectedPinIds = new Set<string>();
    wires.forEach((w) => w.points.forEach((p) => p.pinId && connectedPinIds.add(p.pinId)));

    allPinIds.forEach((pinId) => {
      if (!connectedPinIds.has(pinId)) {
        issues.push({ id: `pin-${pinId}`, severity: "info", message: "Pin not connected to any wire", refs: [pinId] });
      }
    });

    console.log("ERC issues found:", issues);
    return issues;
  };

  console.log("[KicadSchProvider] kicad schema:", kicad);

  return (
    <KicadSchContext.Provider value={{ kicad, runErc }}>
      {children}
    </KicadSchContext.Provider>
  );
};

export const useKicadSch = () => {
  const ctx = useContext(KicadSchContext);
  if (!ctx) throw new Error("useKicadSch must be used within <KicadSchProvider>");
  return ctx;
};

// Safe version that returns null when provider is missing (useful for optional consumers)
export const useKicadSchSafe = () => {
  return useContext(KicadSchContext);
};

export default KicadSchContext;
