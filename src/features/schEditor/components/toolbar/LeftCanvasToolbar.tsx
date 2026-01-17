// removed unused import FastForward
import { useTool } from "../../context/LeftToolbarContext";
import { ErcChecker } from "../ErcChecker";
import { LoadSymbol } from "../LoadSymbol";
import { FaSave } from "react-icons/fa";
import { useKicadSchSafe } from "../../context/KicadSchContext";
import { useProject } from "@/hooks/useProject";
import * as parser from "trackway-parser-wasm";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSymbol } from "../../context/SymbolContext";
import { useRouting } from "../../context/WireContext";
import { useNavigate } from "react-router-dom";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import { FaExternalLinkAlt } from "react-icons/fa";


export default function LeftCanvasToolbar() {
    const { tool, setTool, setSelectedComponent } = useTool();
    const baseBtn =
         "w-12 h-12 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition";

   const { kicad } = useKicadSchSafe() ?? ({} as any);
   const { currentProject, updateCurrentProjectFiles } = useProject();
   const { placedSymbols } = useSymbol();
  const {previewTracks} = useRouting();
   const navigate = useNavigate();
   const { savePcb: persistPcb } = usePcb();
   const [_v, setIsSaving] = useState(false);
   const [_e, setSaveError] = useState<string | null>(null);
   const [_s, setSaveSuccess] = useState(false);
   const saveTimeoutRef = useRef<number | null>(null);


   // console.log("previewtracks in left toolbar", previewTracks);
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
      if (!kicad) {
         setSaveError("No schematic context available");
         return;
      }
      if (!currentProject) {
         setSaveError("No project loaded");
         return;
      }

      setIsSaving(true);
      try {
         const filePath = deriveDefaultSchematicPath(currentProject.name);

         // deep clone so we can sanitize without mutating provider state
         const kicadCopy: any = JSON.parse(JSON.stringify(kicad));

         // sanitize symbol pin numbers if missing (avoid wasm parser errors)
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
                                 pd.number = String(idx + 1);
                              }
                           });
                        }
                     });
                  }
               } catch (e) {
                  // ignore symbol-level sanitization errors
                  // eslint-disable-next-line no-console
                  console.warn("Failed to sanitize symbol for serialization", e, sym?.id);
               }
            }
         }

         let serialized: string;
         try {
            // eslint-disable-next-line no-console
            console.debug("[LeftCanvasToolbar] schematic payload preview:", JSON.stringify(kicadCopy, (_k, v) => (typeof v === 'function' ? undefined : v), 2).slice(0, 2000));
            serialized = parser.schematicValueToSexpr(kicadCopy as any, true);
         } catch (e) {
            // eslint-disable-next-line no-console
            console.error("[LeftCanvasToolbar] serialization failed for payload:", kicadCopy);
            throw e;
         }

         // Use the canonical per-project companion filename so the Kicad
         // rehydration logic (which looks for any `*.trackway.json`) will
         // reliably find the editor state on load. Use project id for scope.
         const companionPath = `${currentProject.id}.trackway.json`;

         const updatedFiles = { ...(currentProject.files ?? {}) };
         updatedFiles[filePath] = serialized;

         // save placedSymbols and include current preview wire(s) from routing context
         try {
            let wires: any[] = [];
            if (Array.isArray(previewTracks) && previewTracks.length > 0) {
               wires = [{ id: 'preview', points: previewTracks.map((p: any) => ({ x: p.x, y: p.y })) }];
            }
            if (Array.isArray(placedSymbols) || Array.isArray(wires)) {
               const editorState = { placedSymbols: placedSymbols ?? [], wires: wires ?? [] } as any;
               updatedFiles[companionPath] = JSON.stringify(editorState, null, 2);
            }
         } catch (e) {
            // ignore companion persistence failures
         }

         const updatedProject = await updateCurrentProjectFiles(updatedFiles);
         const persisted = updatedProject.files?.[filePath];
         if (persisted !== serialized) throw new Error("Saved content mismatch");

         setSaveSuccess(true);
         if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
         saveTimeoutRef.current = window.setTimeout(() => {
            setSaveSuccess(false);
            saveTimeoutRef.current = null;
         }, 2000) as unknown as number;
      } catch (err: any) {
         const msg = err instanceof Error ? err.message : String(err);
         // eslint-disable-next-line no-console
         console.error("Failed to serialize/save schematic:", err);
         setSaveError(msg.includes("missing field") ? `Serialization failed: ${msg}` : msg);
      } finally {
         setIsSaving(false);
      }
   }, [kicad, currentProject, updateCurrentProjectFiles, deriveDefaultSchematicPath, placedSymbols, previewTracks]);

   const handleSave = () => {
      setTool("save");
      void saveSchematic();
   };
      
   return (
      <aside className="flex flex-col items-center gap-2 p-2 bg-white border-r h-full w-16 shadow-sm">
         <div className="w-full flex justify-center pt-1">
            <div className="w-8 h-0.5 bg-gray-300 rounded" />
         </div>

         <div className="flex flex-col items-center gap-2 mt-2">
            <button
               aria-pressed={tool === "none"}
               title="Select tool"
               className={`${baseBtn} ${tool === "none" ? "bg-indigo-100 ring-1 ring-indigo-300" : "bg-white"}`}
               onClick={() => {
                  setTool("none");
                  setSelectedComponent(null);
               }}
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 3l7.5 13L13 14l8 5-6-11L21 3H3z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </button>

            <button
               aria-pressed={tool === "wire"}
               title="Wire tool"
               className={`${baseBtn} ${tool === "wire" ? "bg-indigo-100 ring-1 ring-indigo-300" : "bg-white"}`}
               onClick={() => {
                  setTool("wire");
                  setSelectedComponent(null);
               }}
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 12h4l4 6 4-10 4 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </button>

{/* symbol loader */}
            <div className="w-12 h-12 flex items-center justify-center">
               <LoadSymbol />
            </div>

{/* erc checker */}

      <div className="w-10 h-10 flex items-center justify-center">
        <ErcChecker/>
      </div>

    {/* saving functionality */}
       <div>
             <button
               onClick={handleSave}
             >
                  <FaSave size={20} color="#4B5563" title="Save Schematic"/>
             </button>
       </div>
      <div>
            <button
               title="Open PCB Editor"
               className={baseBtn}
               onClick={async () => {
                  try {
                     await persistPcb();
                  } catch (e) {
                     console.error('Failed to persist PCB before navigating', e);
                  }
                  navigate('/pcb-editor');
               }}
            >
               <FaExternalLinkAlt size={18} color="#4B5563" />
            </button>
      </div>
         </div>

         <div className="mt-auto mb-3 text-xs text-gray-500">Canvas Tools</div>
      </aside>
   );
}