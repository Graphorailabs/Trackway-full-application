// removed unused import FastForward
import { useTool } from "../../context/LeftToolbarContext";
import { ErcChecker } from "../ErcChecker";
import { LoadSymbol } from "../LoadSymbol";
import { FaSave } from "react-icons/fa";
import { useKicadSchSafe } from "../../context/KicadSchContext";
import { useProject } from "@/hooks/useProject";
import * as parser from "trackway-parser-wasm";
import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/features/3dviewer/components/Modal";
import { footprintLibSexprToValue, footprintLibJsonToValue } from 'trackway-parser-wasm';
import { api } from '@/api/api';
import { BASE_BACKEND_URL, CATEGOTIES_ENDPOINT } from '@/features/footprint_manager/constants';
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
   const { previewTracks } = useRouting();
   const navigate = useNavigate();
   const { savePcb: persistPcb, pcb, placeFootprint, removeFootprint } = usePcb();
   const [_v, setIsSaving] = useState(false);
   const [_e, setSaveError] = useState<string | null>(null);
   const [_s, setSaveSuccess] = useState(false);
   const saveTimeoutRef = useRef<number | null>(null);
   const [showPcbOverwriteModal, setShowPcbOverwriteModal] = useState(false);
   const [_pending, setPendingOpenPcb] = useState(false);


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
         return updatedProject;
      } catch (err: any) {
         const msg = err instanceof Error ? err.message : String(err);
         // eslint-disable-next-line no-console
         console.error("Failed to serialize/save schematic:", err);
         setSaveError(msg.includes("missing field") ? `Serialization failed: ${msg}` : msg);
         return null;
      } finally {
         setIsSaving(false);
      }
   }, [kicad, currentProject, updateCurrentProjectFiles, deriveDefaultSchematicPath, placedSymbols, previewTracks]);

   const handleSave = () => {
      setTool("save");
      void saveSchematic();
   };

   // Handles the actual open-with-footprints logic
   const handleOpenPcbWithFootprints = useCallback(async () => {
      if (!currentProject) return;
      let updatedProject: any = null;
      try {
         // save schematic to project first and obtain updated project
         updatedProject = await saveSchematic();

         // read saved companion editor state (placedSymbols) from updatedProject if available
         const companionPath = `${currentProject.id}.trackway.json`;
         let savedPlacedSymbols: any[] = [];
         try {
            const raw = updatedProject?.files?.[companionPath] ?? currentProject.files?.[companionPath];
            if (raw) {
               const parsed = JSON.parse(raw);
               if (Array.isArray(parsed?.placedSymbols)) savedPlacedSymbols = parsed.placedSymbols;
            }
         } catch (e) {
            savedPlacedSymbols = [];
         }

         // Clear existing footprints in PCB context via removeFootprint
         try {
            if (pcb && Array.isArray((pcb as any).footprints)) {
               const existing = (pcb as any).footprints.slice();
               for (const f of existing) {
                  try { removeFootprint(f.uuid); } catch (e) {}
               }
            }
         } catch (e) {}

         // For each placed symbol from saved schematic state, resolve and place footprint
         for (const p of (savedPlacedSymbols ?? [])) {
            try {
               const fpRaw = p.symbolProperties?.Footprint ?? p.symbolProperties?.footprint ?? null;
               if (!fpRaw) continue;
               const parts = (typeof fpRaw === 'string' ? fpRaw : '').split(":");
               const categoryHint = parts.length > 1 ? (parts[0] || '').trim() : null;
               const nameOnly = parts.length > 1 ? (parts[1] || '').trim() : (parts[0] || '').trim();
               if (!nameOnly) continue;

               // find footprint metadata (same logic as before)
               let found: any = null;
               const tryMatchInList = (fps: any[]) => {
                  return (fps || []).find((f: any) => {
                     const base = (f.name || '').split('.').slice(0, -1).join('.') || f.name || '';
                     return base.trim().toLowerCase() === (nameOnly || '').toLowerCase();
                  });
               };

               let categories: any[] = [];
               if (categoryHint) {
                  const slugHint = (categoryHint || "").toLowerCase().replace(/\s+/g, "-").replace(/_+/g, "-").replace(/[^a-z0-9-]/g, "");
                  try {
                     const list = await api.get(`${BASE_BACKEND_URL}${CATEGOTIES_ENDPOINT}/${encodeURIComponent(slugHint)}`);
                     const fps = list.data?.footprints ?? list.data?.data ?? [];
                     const match = tryMatchInList(fps);
                     if (match) found = match;
                  } catch (e) {}
                  if (!found) {
                     try {
                        const catsRes = await api.get(`${BASE_BACKEND_URL}${CATEGOTIES_ENDPOINT}`);
                        categories = catsRes.data?.data ?? [];
                        const catMatch = categories.find((c: any) => {
                           const slug = (c.slug || '').toLowerCase();
                           const name = (c.name || '').toLowerCase();
                           return slug === slugHint || slug === (categoryHint || '').toLowerCase() || name === (categoryHint || '').toLowerCase();
                        });
                        if (catMatch) {
                           try {
                              const list = await api.get(`${BASE_BACKEND_URL}${CATEGOTIES_ENDPOINT}/${catMatch.slug}`);
                              const fps = list.data?.footprints ?? list.data?.data ?? [];
                              const match = tryMatchInList(fps);
                              if (match) found = match;
                           } catch (e) {}
                        }
                     } catch (e) {}
                  }
               }

               if (!found) {
                  try {
                     if (!categories.length) {
                        const catsRes = await api.get(`${BASE_BACKEND_URL}${CATEGOTIES_ENDPOINT}`);
                        categories = catsRes.data?.data ?? [];
                     }
                     for (const c of categories) {
                        try {
                           const list = await api.get(`${BASE_BACKEND_URL}${CATEGOTIES_ENDPOINT}/${c.slug}`);
                           const fps = list.data?.footprints ?? list.data?.data ?? [];
                           const match = tryMatchInList(fps);
                           if (match) { found = match; break; }
                        } catch (e) {}
                     }
                  } catch (e) {}
               }

               if (!found || !found.id) continue;

               // fetch content and parse
               try {
                  const contentRes = await api.get(`${BASE_BACKEND_URL}/${found.id}/content`);
                  const txt = contentRes.data?.content ?? contentRes.data;
                  if (!txt) continue;
                  let parsed: any = null;
                  try { parsed = footprintLibSexprToValue(txt as string); } catch (e) { try { parsed = footprintLibJsonToValue(txt as string); } catch (e2) { parsed = null; } }
                  const fpModel = parsed ? (parsed.footprint ?? parsed) : null;
                  if (!fpModel) continue;
                  const instance = { ...fpModel, uuid: crypto.randomUUID(), at: { x: p.position?.x ?? p.x ?? 0, y: p.position?.y ?? p.y ?? 0, angle: 0 } } as any;
                  instance.properties = Array.isArray(instance.properties) ? instance.properties.slice() : [];
                  instance.properties.push({ name: 'schematicSymbolId', value: p.id });
                  try {
                     placeFootprint(instance, { x: instance.at.x, y: instance.at.y, angle: instance.at.angle ?? 0 });
                  } catch (e) {}
               } catch (e) {}
            } catch (e) {}
         }

         // persist PCB
         try { await persistPcb(); } catch (e) {}
      } catch (e) {
         // swallow top-level errors to avoid blocking UI
      } finally {
         setPendingOpenPcb(false);
      }
      // navigate to PCB editor after placement
      navigate('/pcb-editor');
   }, [currentProject, pcb, persistPcb, saveSchematic, navigate, placeFootprint, removeFootprint]);
      
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
                  if (!currentProject) return;
                  // Derive default PCB file path
                  const deriveDefaultPcbPath = (projectName?: string | null) => {
                     const base = projectName?.trim() || "pcb-layout";
                     const dashed = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                     const safe = dashed || "pcb-layout";
                     return `${safe}.kicad_pcb`;
                  };
                  const pcbPath = deriveDefaultPcbPath(currentProject.name);
                  const exists = !!currentProject.files?.[pcbPath];
                  if (exists) {
                     setShowPcbOverwriteModal(true);
                     setPendingOpenPcb(true);
                  } else {
                     // no existing pcb: proceed immediately
                     setPendingOpenPcb(true);
                     setShowPcbOverwriteModal(false);
                     await handleOpenPcbWithFootprints();
                  }
               }}
            >
               <FaExternalLinkAlt size={18} color="#4B5563" />
            </button>
            {showPcbOverwriteModal && (
               <Modal isOpen={showPcbOverwriteModal} onClose={() => { setShowPcbOverwriteModal(false); setPendingOpenPcb(false); }} title="Overwrite Existing PCB?">
                  <div className="text-sm text-gray-200 mb-4">A PCB file already exists for this project. Proceeding will overwrite all PCB data with footprints from the schematic. This cannot be undone.</div>
                  <div className="flex gap-2 justify-end">
                     <button className="px-3 py-1 rounded bg-gray-200 text-gray-800" onClick={() => { setShowPcbOverwriteModal(false); setPendingOpenPcb(false); }}>Cancel</button>
                     <button className="px-3 py-1 rounded bg-red-600 text-white" onClick={async () => { setShowPcbOverwriteModal(false); await handleOpenPcbWithFootprints(); }}>Proceed</button>
                  </div>
               </Modal>
            )}
         </div>
         </div>

         <div className="mt-auto mb-3 text-xs text-gray-500">Canvas Tools</div>
      </aside>
   );
}