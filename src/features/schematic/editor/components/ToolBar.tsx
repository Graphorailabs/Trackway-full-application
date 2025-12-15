
// import { useState } from "react";
import { useTool } from "../context/ToolContext";
import { LuMousePointer2, LuSpline } from "react-icons/lu";
import { FaSave } from "react-icons/fa";
import { FaArrowRotateLeft, FaArrowRotateRight,  } from "react-icons/fa6";
import { useKicadSchSafe } from "../context/KicadSchContext";
import { useProject } from "@/hooks/useProject";
import * as parser from "trackway-parser-wasm";
import { useCallback, useState, useRef, useEffect } from "react";
// import {
//   TbCircuitResistor,
//   TbCircuitCapacitor,
//   TbCircuitInductor,
//   TbCircuitGround,
// } from "react-icons/tb";

// import { IoIosArrowDown } from "react-icons/io";
import { LoadSymbol } from "./LoadSymbol";
import { useSymbol } from "../context/SymbolContext";
import { useWires } from "../context/WireContext";
// import { useWires } from "../context/WireContext";
import {ErcChecker} from "./ErcChecker";

export default function Toolbar() {
  const { tool, setTool, setSelectedComponent } = useTool();

  // ⭐ SymbolContext → contains selectedSymbol
  const { selectedSymbol, placedSymbols, updatePlacedSymbol, setSelectedSymbol } = useSymbol();
  const { wires, updateWirePinPosition } = useWires();
  // const [dropdownOpen, setDropdownOpen] = useState(false);

  // const handlesymboldata = () => {
  //     console.log('pendingdatatoolbar', pendingSymbol )
  // }
  // const COMPONENTS = [
  //   { key: "resistor", icon: <TbCircuitResistor /> },
  //   { key: "capacitor", icon: <TbCircuitCapacitor /> },
  //   { key: "inductor", icon: <TbCircuitInductor /> },
  //   { key: "ground", icon: <TbCircuitGround /> },
  // ];

  // ⭐ If a symbol is selected → show its ID
  //const currentComponent = selectedSymbol?.id 
// const currentComponent = selectedSymbol?.id;

  const kicadCtx = useKicadSchSafe();
  const { currentProject, updateCurrentProjectFiles } = useProject();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const deriveDefaultSchematicPath = useCallback((projectName?: string | null) => {
    const base = (projectName ?? "schematic").trim() || "schematic";
    const dashed = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const safe = dashed || "schematic";
    return `${safe}.kicad_sch`;
  }, []);

  const saveSchematic = useCallback(async () => {
    setSaveError(null);
    if (!kicadCtx) {
      setSaveError("No schematic context available");
      return;
    }
    if (!currentProject) {
      setSaveError("No project loaded");
      return;
    }

    setIsSaving(true);
    try {
      const { kicad } = kicadCtx;
      const filePath = deriveDefaultSchematicPath(currentProject.name);

      // Sanitize schematic value before serialization to avoid parser errors
      // (some loaded symbols may have pin definitions missing a `number` field).
      const kicadCopy: any = JSON.parse(JSON.stringify(kicad));
      if (Array.isArray(kicadCopy.symbol)) {
        for (const sym of kicadCopy.symbol) {
          try {
            const units = Array.isArray(sym.raw?.symbolData)
              ? sym.raw.symbolData
              : sym.raw?.symbolData?.unit ?? sym.raw?.symbolData;

            if (Array.isArray(units)) {
              units.forEach((u: any) => {
                if (Array.isArray(u?.pin)) {
                  u.pin.forEach((pd: any, idx: number) => {
                    if (pd && (pd.number === undefined || pd.number === null || pd.number === "")) {
                      // default to 1-based index if missing
                      pd.number = String(idx + 1);
                    }
                  });
                }
              });
            }
          } catch (e) {
            // ignore symbol-level sanitization errors and continue
            // we'll surface parser errors below if serialization still fails
            // but log for debugging
            // eslint-disable-next-line no-console
            console.warn("Failed to sanitize symbol for serialization", e, sym?.id);
          }
        }
      }

      let serialized: string;
      try {
        // Diagnostic: log a compact preview of the object being serialized
        // to help identify missing fields the wasm parser reports.
        // eslint-disable-next-line no-console
        console.debug("[ToolBar] schematic payload preview:", JSON.stringify(kicadCopy, (_k, v) => (typeof v === 'function' ? undefined : v), 2).slice(0, 2000));
        serialized = parser.schematicValueToSexpr(kicadCopy as any, true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[ToolBar] serialization failed for payload:", kicadCopy);
        throw e;
      }

      // Also persist an editor-state companion file so we can rehydrate
      // placed symbols and wires when reopening the project. This keeps
      // the KiCad S-expression separate while preserving editor metadata.
      const baseStem = filePath.replace(/\.kicad_sch$/i, "") || filePath;
      const companionPath = `${baseStem}.trackway.json`;

      const updatedFiles = { ...(currentProject.files ?? {}) };
      updatedFiles[filePath] = serialized;
      // Persist the live editor state (placedSymbols + wires) when available
      try {
        if (Array.isArray(placedSymbols) && Array.isArray(wires)) {
          const editorState = { placedSymbols, wires } as any;
          updatedFiles[companionPath] = JSON.stringify(editorState, null, 2);
        }
      } catch (e) {
        // ignore companion persistence failures (still save KiCad file)
      }

      const updatedProject = await updateCurrentProjectFiles(updatedFiles);
      const persisted = updatedProject.files?.[filePath];
      if (persisted !== serialized) throw new Error("Saved content mismatch");
      // success: show transient toast
      setSaveSuccess(true);
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(() => {
        setSaveSuccess(false);
        saveTimeoutRef.current = null;
      }, 2000) as unknown as number;
    } catch (err: any) {
      // Provide a clearer message when the wasm parser reports schema issues
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error("Failed to serialize/save schematic:", err);
      setSaveError(msg.includes("missing field") ? `Serialization failed: ${msg}` : msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [kicadCtx, currentProject, updateCurrentProjectFiles, deriveDefaultSchematicPath]);

  const rotatePoint = (x: number, y: number, degrees: number) => {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: Math.round((x * cos - y * sin) * 1000) / 1000,
      y: Math.round((x * sin + y * cos) * 1000) / 1000,
    };
  };

  const rotateSelectedSymbol = useCallback((degrees: number) => {
    if (!selectedSymbol) return;
    try {
      const pos = selectedSymbol.position ?? { x: 0, y: 0 };
      // Compute new absolute pin positions using rotated offsets, but
      // keep `offsetX/offsetY` unchanged so the renderer can apply a
      // rotation transform at the Group level (avoids double-transform).
      const newPins = (selectedSymbol.pins || []).map((p: any) => {
        const offX = p.offsetX ?? (p.x - (pos.x ?? 0));
        const offY = p.offsetY ?? (p.y - (pos.y ?? 0));
        const rotated = rotatePoint(offX, offY, degrees);
        const newX = (pos.x ?? 0) + rotated.x;
        const newY = (pos.y ?? 0) + rotated.y;
        // DO NOT mutate offsetX/offsetY: keep offsets so the Group rotation
        // visually rotates the symbol+pin markers. Only update absolute
        // coordinates used by wires so endpoints follow the visuals.
        return { ...p, x: newX, y: newY };
      });

      const prevRot = selectedSymbol.rotation ?? 0;
      const newRot = ((prevRot + degrees) % 360 + 360) % 360;

      if (typeof updatePlacedSymbol === "function") {
        updatePlacedSymbol(selectedSymbol.id, { pins: newPins, rotation: newRot });
      }
      if (typeof setSelectedSymbol === "function") {
        setSelectedSymbol({ ...selectedSymbol, pins: newPins, rotation: newRot });
      }

      // Update any wires connected to rotated pins so endpoints follow.
      try {
        if (typeof updateWirePinPosition === "function") {
          newPins.forEach((pin: any) => {
            if (pin && pin.id) updateWirePinPosition(pin.id, pin.x, pin.y);
          });
        }
      } catch (e) {
        // ignore wire update errors
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to rotate symbol", e);
    }
  }, [selectedSymbol, updatePlacedSymbol, setSelectedSymbol, updateWirePinPosition]);

    // COMPONENTS.find((c) => c.key === selectedComponent)?.key ||
    // "resistor";

  return (
    <div className="flex flex-col items-center gap-2 p-1">
      {/* SELECT TOOL */}
      <button
        title="Select"
        className={`w-10 h-10 rounded flex items-center hover:bg-gray-200 justify-center ${
          tool === "none" ? "bg-green-300" : "bg-white"
        }`}
        onClick={() => {
          setTool("none");
          setSelectedComponent(null);
        }}
      >
        <LuMousePointer2 />
      </button>

      {/* WIRE TOOL */}
      <button
        title="Wire"
        className={`w-10 h-10 rounded flex items-center justify-center ${
          tool === "wire" ? "bg-green-300" : "bg-white"
        }`}
        onClick={() => {
          setTool("wire");
          setSelectedComponent(null);
        }}
      >
        <LuSpline />
      </button>

      {/* Load Symbol Button */}
      <div className="w-10 h-10 flex items-center justify-center">
        <LoadSymbol />
      </div>

      {selectedSymbol && (
        <div className="text-xs text-gray-700 truncate w-12 text-center">
          {selectedSymbol.id}
        </div>
      )}

      <div className="w-10 h-10 flex items-center justify-center">
        <ErcChecker />
      </div>
      {/* Save schematic button (left toolbar) */}
      <div className="mt-2">
        {/* Rotate left / right */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <button
            title="Rotate left"
            className="w-10 h-8 rounded flex items-center justify-center bg-white hover:bg-gray-200"
            onClick={() => rotateSelectedSymbol(-90)}
          >
            <FaArrowRotateLeft />
          </button>
          <button
            title="Rotate right"
            className="w-10 h-8 rounded flex items-center justify-center bg-white hover:bg-gray-200"
            onClick={() => rotateSelectedSymbol(90)}
          >
            <FaArrowRotateRight />
          </button>
        </div>
        <button
          title="Save schematic"
          className={`w-10 h-10 rounded flex items-center hover:bg-gray-200 justify-center ${isSaving ? "bg-black" : "bg-white"}`}
          onClick={() => void saveSchematic()}
          disabled={isSaving}
        >
          {isSaving ? "⏳" : <FaSave />}
        </button>
        {saveError && <div className="text-xs text-red-500 mt-1">{saveError}</div>}
        {saveSuccess && <div className="text-xs text-green-600 mt-1">Saved ✓</div>}
      </div>
      
      {/* Erc checker */}

      {/* COMPONENT / SYMBOL SELECT DROPDOWN */}
      {/* <div className="relative">
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded ${
            tool ===  "symbol" ? "bg-red-300" : "bg-gray-100"
          }`}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
      {selectedSymbol ? (
        <div className="flex items-center">
          <span className="ml-1">{selectedSymbol.id}</span>
        </div>
      ) : (
         currentComponent  // built-in resistor/capacitor icons
      )}

          <IoIosArrowDown size={14} />
        </button> */}

        {/* DROPDOWN */}
        {/* {dropdownOpen && (
          <div className="absolute mt-1 left-0 bg-white shadow-lg border rounded z-50"> */}
            {/* Built-in Components */}
            {/* {COMPONENTS.map((comp) => (
              <button
                key={comp.key}
                className="flex gap-2 items-center px-3 py-1 hover:bg-gray-200 w-full text-left"
                onClick={() => {
                  setTool("component");
                  setDropdownOpen(false);
                }}
              >
                {comp.icon}
                {comp.key}
              </button>
            ))} */}

            {/* ⭐ If symbol loaded → show symbol id */}
            {/* {selectedSymbol && selectedSymbolId ? (
              <button
                className="flex gap-2 items-center px-3 py-1 hover:bg-blue-200 w-full text-left"
                onClick={() => {
                  if (!selectedSymbol) return;
                  setSelectedSymbolId(selectedSymbol.id); // string ID
                  setPendingSymbol(selectedSymbol); // full object
                  setTool("symbol");
                  setDropdownOpen(false);
                }}
              >
                📘 Symbol: {selectedSymbol.id}
              </button>

            ): (
                <span>Select Symbol</span>
            )} */}
          {/* </div>
        )} */}

{/*        
      </div> */}

   
    </div>
  );
}
