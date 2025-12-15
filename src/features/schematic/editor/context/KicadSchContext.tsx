import { createContext, useContext, useMemo, useEffect, useRef } from "react";
import { useWires } from "./WireContext";
import type { Wire as InternalWire } from "./WireContext";
import type { Wire as KiCadWire } from "trackway-parser-wasm";
import { useSymbol } from "./SymbolContext";
import { useProject } from "@/hooks/useProject";
import type { ErcIssue, PinInstance, LocationInfo } from "trackway-parser-wasm";


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
  wire?: KiCadWire[];
  bus?: Bus[];
  polyline?: Polyline[];
  text?: GraphText[];
  label?: LocalLabel[];
  global_label?: GlobalLabel[];
  symbol?: SchematicSymbol[];
  path?: RootPath;
};

 

type KicadSchContextType = {
  kicad: KicadSch;
  runErc: () => ErcIssue[];
};

const KicadSchContext = createContext<KicadSchContextType | null>(null);

export const KicadSchProvider = ({ children }: any) => {
  const { wires, setWires } = useWires();
  const { placedSymbols, livePinPositionsRef, setPlacedSymbols } = useSymbol();
  const { currentProject } = useProject();

  // When a project is opened, try to rehydrate editor state from a companion
  // `.trackway.json` file that the save routine writes. Run this only once per
  // project id to avoid overwriting live edits when project files change
  // (e.g. when saving updates currentProject.files). We track which project
  // ids we've already rehydrated in `rehydratedProjectIds`.
  const rehydratedProjectIds = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const pid = currentProject?.id;
    if (!pid) return;
    if (rehydratedProjectIds.current[pid]) {
      // already rehydrated this project, skip
      return;
    }

    const files = currentProject.files ?? {};
    const companionPath = Object.keys(files).find((p) => p.toLowerCase().endsWith(".trackway.json"));
    if (!companionPath) return;
    try {
      const raw = files[companionPath];
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const placedCount = Array.isArray(parsed.placedSymbols) ? parsed.placedSymbols.length : 0;
      const wireCount = Array.isArray(parsed.wires) ? parsed.wires.length : 0;
      // apply only when the parsed arrays exist
      if (Array.isArray(parsed.placedSymbols) && typeof setPlacedSymbols === 'function') {
        setPlacedSymbols(parsed.placedSymbols);
      }
      if (Array.isArray(parsed.wires) && typeof setWires === 'function') {
        setWires(parsed.wires);
      }
      rehydratedProjectIds.current[pid] = true;
      console.debug(`[KicadSchProvider] rehydrated editor state from ${companionPath}`, { placedCount, wireCount });
    } catch (e) {
      console.warn("Failed to rehydrate editor state from companion file", e);
    }
    // only run when project id changes
  }, [currentProject?.id, setPlacedSymbols, setWires]);


  const stableUuidRef = useRef<string>(crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

  const kicad = useMemo<KicadSch>(() => {
    // Build KiCad-compatible symbol instances (ensure pin `number` present)
    const symbols: any[] = placedSymbols.map((p: any) => {
      const pos = p.position ?? p.pos ?? { x: p.x ?? 0, y: p.y ?? 0 };
      const libId = p.symbolId ?? p.symbolData?.id ?? p.symbolData?.lib_id ?? String(p.id);

      // flatten unit pin definitions from the original symbol data
      const units = Array.isArray(p.symbolData) ? p.symbolData : p.symbolData?.unit ?? p.symbolData ?? [];
      const flattenedPinDefs: any[] = [];
      if (Array.isArray(units)) {
        units.forEach((u: any) => {
          if (Array.isArray(u.pin)) flattenedPinDefs.push(...u.pin);
        });
      }

      // placed.pins corresponds to the visual placed pins in the same order
      const instancePins = (p.pins || []).map((placedPin: any, idx: number) => {
        const def = flattenedPinDefs[idx] ?? null;
        let numberStr = "";
        try {
          if (def?.number) {
            if (typeof def.number === "string") numberStr = def.number;
            else if (def.number[""]) numberStr = def.number[""];
            else numberStr = String(def.number);
          }
        } catch (e) {
          numberStr = "";
        }
        if (!numberStr) numberStr = String(idx + 1);
        return { number: numberStr, uuid: placedPin.id };
      });

      return {
        lib_id: libId,
        at: [pos.x ?? 0, pos.y ?? 0, 0],
        uuid: p.id,
        pins: instancePins,
      };
    });
  //  console.log("kicad symbols:", symbols);

    // Convert internal wire representation to the KiCad-friendly shape
    const kicadWires = (wires || []).map((w: InternalWire) => {
      const xy: [number, number][] = (w.points || []).map((p) => [p.x ?? 0, p.y ?? 0]);
      return {
        pts: { xy },
        // minimal stroke to satisfy parser expectations
        stroke: { width: 1, type: "solid" as any },
        uuid: w.id,
      };
    });

    return {
      version: 20220414,
      generator: "trackway-web",
      // Use a stable uuid for this provider instance so repeated renders
      // (or useMemo recalculations) don't produce spurious changes.
      uuid: stableUuidRef.current,
      wire: kicadWires,
      symbol: symbols as any,
    } as KicadSch;
  }, [wires, placedSymbols, livePinPositionsRef]);

  const runErc = (): ErcIssue[] => {
    const issues: ErcIssue[] = [];

    console.log("Running ERC...");

    // helper: given a pinId find placed symbol and return friendly info
    const describePin = (pinId: string) => {
      const sym = placedSymbols.find((s: any) => (s.pins || []).some((pp: any) => pp.id === pinId));
      if (!sym) return null;
      const pinIndex = (sym.pins || []).findIndex((pp: any) => pp.id === pinId);
      const units = Array.isArray(sym.symbolData) ? sym.symbolData : sym.symbolData?.unit ?? sym.symbolData;
      const pinDefs: any[] = [];
      if (Array.isArray(units)) {
        units.forEach((u: any) => {
          if (Array.isArray(u?.pin)) u.pin.forEach((pd: any) => pinDefs.push(pd));
        });
      }
      const pinDef = pinDefs[pinIndex] || null;
      // pin name (display) — try multiple shapes
      const pinName = pinDef?.name ? (typeof pinDef.name === "string" ? pinDef.name : pinDef.name[""] ?? "") : "";
      // pin number
      let pinNumber = "";
      try {
        if (pinDef?.number) {
          if (typeof pinDef.number === "string") pinNumber = pinDef.number;
          else if (pinDef.number[""]) pinNumber = pinDef.number[""];
          else pinNumber = String(pinDef.number);
        }
      } catch (e) {
        pinNumber = "";
      }

      // friendly electrical type
      const mapHumanType = (t: any) => {
        if (!t) return "Passive";
        const tt = String(t).toLowerCase();
        if (tt.includes("power")) return "Power input";
        if (tt.includes("input")) return "Input";
        if (tt.includes("output")) return "Output";
        if (tt.includes("bidir") || tt.includes("bidirectional")) return "Bidirectional";
        if (tt.includes("tri")) return "Tristate";
        return "Passive";
      };

      const humanType = mapHumanType(pinDef?.electrical_type ?? pinDef?.electricalType ?? pinDef?.type);

      return {
        symbolName: sym.symbolId ?? sym.id ?? "",
        pinNumber: pinNumber || String(pinIndex + 1),
        pinName: pinName || pinNumber || String(pinIndex + 1),
        humanType,
      };
    };

    // 1) Floating wires: wires that have no connected points (no pinId on any point)
    wires.forEach((w) => {
      const anyConnected = w.points.some((p) => !!p.pinId || p.connected);
      // collect any pin ids present on the wire (for more informative messages)
      const pinIds = Array.from(new Set(w.points.map((p: any) => p.pinId).filter(Boolean)));
      if (!anyConnected) {
        let message = "Floating wire (no connected pins)";
        if (pinIds.length > 0) {
          const parts = pinIds.map((pid) => {
            const d = describePin(pid);
            if (!d) return pid;
            return `${d.symbolName} Pin ${d.pinNumber} [${d.pinName}, ${d.humanType}]`;
          });
          message = `Floating wire (connected to pin(s): ${parts.join("; ")})`;
        }

        const issue: ErcIssue = {
          code: "UNCONNECTED_NET",
          severity: "WARNING",
          message,
          net_id: null,
          net_name: null,
          pins: [] as PinInstance[],
          location_hints: [] as LocationInfo[],
        };
        issues.push(issue);
      }
    });

    // 2) Pins without a connected wire: find placed symbol pins that aren't referenced by any wire
    const allPinIds = new Set<string>();
    placedSymbols.forEach((s: any) => {
      const pins = s.pins ?? [];
      pins.forEach((pin: any) => allPinIds.add(pin.id));
    });

    const connectedPinIds = new Set<string>();
    wires.forEach((w) => w.points.forEach((p) => p.pinId && connectedPinIds.add(p.pinId)));

    
    allPinIds.forEach((pinId) => {
      if (!connectedPinIds.has(pinId)) {
        // find which placed symbol this pin belongs to
        const sym = placedSymbols.find((s: any) => (s.pins || []).some((pp: any) => pp.id === pinId));
        let pinsArr: PinInstance[] = [];
        let locHints: LocationInfo[] = [];
        let message = "Pin not connected";

        if (sym) {
          // determine index of pin within the placed symbol
          const pinIndex = (sym.pins || []).findIndex((pp: any) => pp.id === pinId);

          // extract pin definitions from the symbol unit (if available)
          const units = Array.isArray(sym.symbolData) ? sym.symbolData : sym.symbolData?.unit ?? sym.symbolData;
          const pinDefs: any[] = [];
          if (Array.isArray(units)) {
            units.forEach((u: any) => {
              if (Array.isArray(u?.pin)) {
                u.pin.forEach((pd: any) => pinDefs.push(pd));
              }
            });
          }

          const pinDef = pinDefs[pinIndex] || null;

          // compute pin number text
          let pinNumber = "";
          try {
            if (pinDef?.number) {
              if (typeof pinDef.number === "string") pinNumber = pinDef.number;
              else if (pinDef.number[""]) pinNumber = pinDef.number[""];
              else pinNumber = String(pinDef.number);
            }
          } catch (e) {
            pinNumber = "";
          }

          // map electrical type to parser PinType
          const mapType = (t: any) => {
            if (!t) return "PASSIVE" as any;
            const tt = String(t).toLowerCase();
            if (tt.includes("input") && tt.includes("power")) return "POWER_IN" as any;
            if (tt === "power_in") return "POWER_IN" as any;
            if (tt === "power_out") return "POWER_OUT" as any;
            if (tt === "input") return "INPUT" as any;
            if (tt === "output") return "OUTPUT" as any;
            if (tt === "bidirectional" || tt === "bidir") return "BIDIR" as any;
            if (tt === "tri_state" || tt === "tristate") return "TRISTATE" as any;
            if (tt === "passive") return "PASSIVE" as any;
            return "PASSIVE" as any;
          };

          const pinType = mapType(pinDef?.electrical_type ?? pinDef?.electricalType ?? pinDef?.type);

          // try to get a location for the pin
          let px: number | undefined = undefined;
          let py: number | undefined = undefined;
          const liveForSym = livePinPositionsRef.current?.[sym.id] ?? {};
          if (liveForSym && liveForSym[pinId]) {
            px = liveForSym[pinId].x;
            py = liveForSym[pinId].y;
          } else {
            // fallback to stored pin coordinates
            const placedPin = (sym.pins || []).find((pp: any) => pp.id === pinId);
            if (placedPin) {
              px = placedPin.x ?? (sym.position?.x ?? 0) + (placedPin.offsetX ?? 0);
              py = placedPin.y ?? (sym.position?.y ?? 0) + (placedPin.offsetY ?? 0);
            }
          }

          const pinInstance: PinInstance = {
            id: pinId,
            ref: sym.symbolId ?? sym.id ?? "",
            pin_number: pinNumber || String(pinIndex + 1),
            type: pinType,
            net_id: null,
            has_no_connect_flag: !!pinDef?.no_connect,
            is_power_flag: pinType === "POWER_IN" || pinType === "POWER_OUT",
            // enrich with designer-friendly metadata (not part of strict PinInstance in parser but useful in UI)
            // @ts-ignore - allow extra UI-only fields
            pin_name: (pinDef?.name ? (typeof pinDef.name === "string" ? pinDef.name : pinDef.name[""] ?? "") : "") || pinNumber || String(pinIndex + 1),
            // human readable electrical type (e.g. "Input", "Output", "Passive")
            // @ts-ignore
            human_type: ((): string => {
              const mapHumanType = (t: any) => {
                if (!t) return "Passive";
                const tt = String(t).toLowerCase();
                if (tt.includes("power")) return "Power input";
                if (tt.includes("input")) return "Input";
                if (tt.includes("output")) return "Output";
                if (tt.includes("bidir") || tt.includes("bidirectional")) return "Bidirectional";
                if (tt.includes("tri")) return "Tristate";
                return "Passive";
              };
              return mapHumanType(pinDef?.electrical_type ?? pinDef?.electricalType ?? pinDef?.type);
            })(),
            // raw type string (if available)
            // @ts-ignore
            raw_type: pinDef?.electrical_type ?? pinDef?.electricalType ?? pinDef?.type,
            location: { sheet: null, x: px ?? 0, y: py ?? 0 } as LocationInfo,
          } as PinInstance;

          pinsArr = [pinInstance];
          if (px !== undefined && py !== undefined) locHints = [{ sheet: null, x: px ?? 0, y: py ?? 0 } as LocationInfo];

          // build a more helpful message including pin name and human-friendly type
          const descr = describePin(pinId);
          const pinNameForMsg = descr?.pinName ?? (pinInstance as any).pin_name ?? pinInstance.pin_number;
          const humanTypeForMsg = descr?.humanType ?? (pinInstance as any).human_type ?? "";
          const extraParts = [pinNameForMsg, humanTypeForMsg].filter(Boolean).join(", ");
          message = `Symbol ${descr?.symbolName ?? sym.symbolId ?? sym.id} Pin ${pinInstance.pin_number}${extraParts ? ` [${extraParts}]` : ""}`;
        }

        const issue: ErcIssue = {
          code: "UNCONNECTED_PIN",
          severity: "ERROR",
          message,
          net_id: null,
          net_name: null,
          pins: pinsArr,
          location_hints: locHints,
        };
        issues.push(issue);
      }
    });

    console.log("ERC issues found:", issues);
    return issues;
  };

  // Keep a debug-level summary rather than a full object dump to reduce noise.
  console.debug("[KicadSchProvider] kicad schema summary:", {
    uuid: kicad.uuid,
    symbols: (kicad.symbol ?? []).length,
    wires: (kicad.wire ?? []).length,
  });

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
