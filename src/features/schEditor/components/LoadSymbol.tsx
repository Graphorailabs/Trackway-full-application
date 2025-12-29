import { useEffect, useState } from "react"

// import {  extractSymbolNames } from "./extractSymbolLib"; // commented out — unused
import { SiCircuitverse } from "react-icons/si";

import { SymbolPreview } from "./SymbolPreview"
// import { useSymbol } from "../context/SymbolContext";
// import { useTool } from "../context/ToolContext";
import { symbolLibSexprToJson } from "trackway-parser-wasm";
import { api } from "@/api/api";
import FootprintPreview from "./SymbolFootprintPreview";

interface SymbolLibrary {
  id: string;
  name: string;
  content?: string;
}


export const LoadSymbol = () => {
     const [isOpen, setIsOpen] = useState(false);
     const [symbolLib, setSymbolLib] = useState<SymbolLibrary[]>([]);
     const [error, setError] = useState("");
     const [symbolNames, setSymbolNames] = useState<any[]>([]);
    const [selectedLibId, setSelectedLibId] = useState<string | null>(null);
    const [getContentById, setGetContentById] = useState<Record<any, any> | string>("");
    const [symbolFootprints, setSymbolFootprints] = useState<any[]>([]);
    const [selectedFootprintId, setSelectedFootprintId] = useState<string | null>(null);
    const [footprintContent, setFootprintContent] = useState<string | null>(null);
    
  // const { setSelectedSymbol, setSymbolData, setPendingSymbol } = useSymbol();

  //  const {setTool, setSelectedSymbolId} = useTool();

    useEffect(() => {
      let isMounted = true;

           const fetchSymbolLib = async () => {
                try{
                    const res = await api.get("/getSymbolList");
                    const data = res.data.data;
                    if(!data){
                      console.log('loading symbol list...')
                    }
                    if(isMounted){
                       const sorted = Array.isArray(data)
                         ? data.slice().sort((a: any, b: any) =>
                             (a.name || "").toString().localeCompare((b.name || "").toString(), undefined, { sensitivity: "base" })
                           )
                         : [];
                       setSymbolLib(sorted);
                    }

                }catch(error : any){
                    setError(error.response?.data?.error || "Failed to fetch symbol library list");
                }
           }
           fetchSymbolLib();
      return () => {
         isMounted = false;
      }
    }, [])

    // whenever library selection changes, refresh footprints list
    useEffect(() => {
      fetchSymbolFootprints(selectedLibId);
    }, [selectedLibId]);

   
  const [symbolData, setSymbolData] = useState<any[]>([]);
  

  // const loadSymbolNamesFromContent = (content: string) => {
  //   let names = extractSymbolNames(content);
  //   names = names.filter((n: string) => !n.includes("_"));
  //   setSymbolNames(names);
  // };



  const handleContent = (symbolId: string) => {
    const selected = symbolData.find((s) => s.id === symbolId);
    if (selected) {
      setGetContentById(selected);
    } else {
      console.warn('Symbol not found in parsed data', symbolId);
    }
  };

    // fetch footprints mapped to the selected library file (symbol file id)
    const fetchSymbolFootprints = async (symId: string | null) => {
      if (!symId) return setSymbolFootprints([]);
      try {
        const res = await api.get(`/footprints/${symId}`);
        const data = res.data?.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          const sorted = data.slice().sort((a: any, b: any) => (a.name || '').toString().localeCompare((b.name || '').toString(), undefined, { sensitivity: 'base' }));
          setSymbolFootprints(sorted);
          return;
        }

        // fallback: fetch all footprints across categories and show them
        const catsRes = await api.get(`/footprints/categories`);
        const categories = catsRes.data?.data ?? [];
        const all: any[] = [];
        for (const c of categories) {
          try {
            const list = await api.get(`/footprints/categories/${c.slug}`);
            const fps = list.data?.footprints ?? list.data?.data ?? [];
            if (Array.isArray(fps)) {
              all.push(...fps.map((f: any) => ({ ...f, category: c })));
            }
          } catch (e) {
            // ignore per-category errors
          }
        }
        const sortedAll = all.slice().sort((a: any, b: any) => (a.name || '').toString().localeCompare((b.name || '').toString(), undefined, { sensitivity: 'base' }));
        setSymbolFootprints(sortedAll);
      } catch (err) {
        console.error("fetch symbol footprints", err);
        setSymbolFootprints([]);
      }
    };

  const onLibraryClick = async (lib: SymbolLibrary) => {
    setSelectedLibId(lib.id);
    setSymbolNames([]);
    setSymbolData([]);
    setGetContentById("");

    try {
      const res = await api.get(`/getSymbol/${lib.id}`, { responseType: 'text' as const });
      const content = res.data as string;
      // parse and store symbol json data
      const convertedJson = symbolLibSexprToJson(content, true);
      const parsedJson = JSON.parse(convertedJson);
      let symbolArr = parsedJson.symbol.map((sym: any) => ({
        id: sym.id,
        properties: Object.fromEntries(sym.property.map((p: any) => [p.key, p.value])),
        unit: sym.unit,
      }));
      symbolArr = symbolArr.sort((a: any, b: any) => a.id.toString().localeCompare(b.id.toString(), undefined, { sensitivity: 'base' }));
      setSymbolData(symbolArr);
      // set names (alphabetical)
      const names = symbolArr.map((s: any) => s.id).filter((n: string) => !n.includes("_")).sort((a: string, b: string) => a.toString().localeCompare(b.toString(), undefined, { sensitivity: 'base' }));
      setSymbolNames(names);
    } catch (err: any) {
      console.error('fetch symbol content', err);
      setError(err?.response?.data?.error || 'Failed to fetch symbol content');
    }
  };

  // fetch footprint content when selectedFootprintId changes
  useEffect(() => {
    let cancelled = false;
    const fetchContent = async (id: string) => {
      try {
        setFootprintContent(null);
        const res = await api.get(`/footprints/${id}/content`);
        if (cancelled) return;
        setFootprintContent(res.data?.content ?? null);
      } catch (err) {
        console.error('fetchFootprintContent', err);
        if (!cancelled) setFootprintContent(null);
      }
    };

    if (selectedFootprintId) {
      fetchContent(selectedFootprintId);
    } else {
      setFootprintContent(null);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedFootprintId]);

    return (
        <>
          <button
              onClick={() => setIsOpen(true)}
              className="bg-white text-black font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-gray-300 transition"
            >
            <SiCircuitverse />
           
          </button>
        
       {isOpen && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-[#0E0E0E] w-[90%] h-[85vh] rounded-xl shadow-2xl flex flex-col border border-gray-700">

          {/* Top */}
          <div className="flex items-center justify-between border-b border-gray-700 p-3">
            {error && (
                    <p className="flex justify-start text-red-500 text-sm mt-2 text-center p-2">{error}</p>
                    )}
            <button
              onClick={() => setIsOpen(false)}
              className="justify-end text-gray-300 hover:text-white p-2"
            >
              ✕ Close
            </button>
          </div>

      {/* Main 3-Panel Layout */}
      <div className="flex flex-1 bg-black divide-x divide-gray-700 min-h-0">

        {/* ✅ Left Panel — Scrollable */}
        <aside className="w-56 min-w-[14rem] bg-[#111] text-gray-200 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <h2 className="text-xs font-semibold px-4 py-2 border-b border-gray-700">
            Libraries
          </h2>

          <ul className="text-xs">
            {symbolLib.map((s: any) => (
              <li key={s.id}
                onClick={() => onLibraryClick(s)}
                className={`cursor-pointer px-4 py-2 transition-colors ${
                  selectedLibId === s.id ? "bg-[#333]" : "hover:bg-[#222]"
                }`}
              >
                {s.name}
              </li>
            ))}
          </ul>
        </aside>

        {/* ✅ Middle Panel — Scrollable */}
        <aside className="w-56 min-w-[14rem] bg-[#181818] text-gray-200 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          
          <h2 className="text-xs font-semibold px-4 py-2 border-b border-gray-700">
            Symbols
          </h2>

          <div className="text-xs px-2 py-2">
            {/* VS Code-like folder tree: each symbol is a folder; footprints are children */}
            <ul>
              {symbolNames.map((name: string) => {
                const matches = symbolFootprints.filter((fp) => {
                  const base = (fp.name || "").split('.').slice(0, -1).join('.') || fp.name || "";
                  return base.trim().toLowerCase() === name.trim().toLowerCase();
                });
                // const isExpanded = !!expandedSymbols[name];

                const getFootprintProp = () => {
                  const sym = symbolData.find((s) => s.id === name);
                  if (!sym) return "";
                  // properties may contain a Footprint key (case-sensitive) or 'footprint'
                  // return sym.properties?.Footprint || sym.properties?.footprint || "";
                 const raw = sym.properties?.Footprint || sym.properties?.footprint || "";
                 if (!raw) return "";
                  const parts = raw.split(":");
                  const  nameOnly = parts.length > 1 ? parts[1].trim() : raw.trim();
                  return nameOnly;
                };
                const footprintProp = getFootprintProp();

                return (
                  <li key={name} className="mb-1">
                    <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#222]">
                      <div className="flex items-center gap-1">
                        <div
                          className="cursor-pointer truncate"
                          onClick={() => {
                            // select symbol (load into preview)
                            handleContent(name);

                            // try to select a matching footprint:
                            (async () => {
                              // prefer local matches (footprints mapped to the symbol library)
                              if (matches.length > 0) {
                                setSelectedFootprintId(matches[0].id);
                                return;
                              }

                              // fallback: try to find a footprint by the footprintProp across categories
                              // if no footprintProp is declared, clear any previously selected footprint
                              if (!footprintProp) {
                                setSelectedFootprintId(null);
                                return;
                              }

                              try {
                                const catsRes = await api.get(`/footprints/categories`);
                                const categories = catsRes.data?.data ?? [];
                                let foundAny: any = null;
                                for (const c of categories) {
                                  try {
                                    const list = await api.get(`/footprints/categories/${c.slug}`);
                                    const fps = list.data?.footprints ?? list.data?.data ?? [];
                                    const found = fps.find((f: any) => {
                                      const base = (f.name || "").split('.').slice(0, -1).join('.') || f.name || "";
                                      return base.trim().toLowerCase() === (footprintProp || "").trim().toLowerCase();
                                    });
                                    if (found) {
                                      foundAny = found;
                                      setSelectedFootprintId(found.id);
                                      return;
                                    }
                                  } catch (e) {
                                    // ignore errors per-category
                                  }
                                }
                                // if we didn't find a matching footprint, ensure previous selection is cleared
                                if (!foundAny) setSelectedFootprintId(null);
                              } catch (e) {
                                // ignore
                              }
                            })();
                          }}
                          title={name}
                        >
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-gray-400">{matches.length > 0 ? `${matches.length} footprint(s)${matches.some(m => m.has3dModel) ? ' · 3D' : ''}` : ''}</div>
                          {footprintProp ? (
                            <div className="text-xs text-gray-500 mt-0.5">Footprint <span className="text-gray-300">{footprintProp}</span></div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Expanded content removed per UI simplification */}
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* ✅ Right Panel — Preview (No Scroll Here) */}
        <div className="flex-1 bg-[#0f0f0f] text-gray-200 flex flex-col p-4 min-h-0">
          <h2 className="text-xs font-semibold mb-3 border-b border-gray-700 pb-2">
            Preview
          </h2>
          <div className="flex flex-1 bg-[#131313] rounded overflow-hidden p-3 min-h-0">
            <div className="flex flex-1 gap-4 min-h-0">
              {/* Symbol pane */}
              <div style={{ flex: '0 0 55%', maxWidth: '55%', boxSizing: 'border-box' }} className="bg-[#131313] rounded overflow-hidden p-3 flex flex-col min-h-0">
                <div className="text-xs font-medium text-gray-200 mb-2">Symbol</div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <div className="w-full h-full">
                    <SymbolPreview data={getContentById} visible={isOpen} />
                  </div>
                </div>
              </div>

              {/* Footprint pane */}
              <div style={{ flex: '0 0 45%', maxWidth: '45%', boxSizing: 'border-box', overflow: 'hidden' }} className="bg-[#071331] border border-gray-700 rounded p-3 text-sm text-gray-200 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Footprint</div>
                  <div className="text-xs text-gray-400">{selectedFootprintId ? `id: ${selectedFootprintId}` : ''}</div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {selectedFootprintId && !footprintContent && (
                    <div className="text-xs text-gray-400">Loading footprint...</div>
                  )}

                  {footprintContent ? (
                    <div className="w-full h-full">
                      <FootprintPreview content={footprintContent} />
                    </div>
                  ) : (
                    !selectedFootprintId && (
                      <div className="text-xs text-gray-500">Select a footprint to preview its content.</div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>



          <div className="mt-4 flex justify-end gap-2">
            <button 
             onClick={() => setIsOpen(false) }
            className="mt-4 bg-gray-600 rounded px-8 cursor-pointer text-white transition hover:bg-gray-">
              Cancel
            </button>

            <button
              onClick={() => {
                  if (!getContentById || typeof getContentById !== "object") {
                      // No symbol selected — keep modal open and inform user
                      console.warn("No symbol selected — please choose a symbol before pressing OK");
                      return;
                  }

                  // ✔ send full symbol object as pending (do not mark it as placed)
                  // setPendingSymbol(getContentById.unit);
                  // console.log('pendingsymbolfromok', getContentById);
                  // // Do not set `selectedSymbol` here — that's reserved for placed components
                  // setSymbolData(getContentById);
                  // setSelectedSymbolId(getContentById.id);
                  // console.log("✔ OK selected symbol id:", getContentById.id);

                  // // small delay to ensure pendingSymbol state is applied before switching tool
                  // setTimeout(() => setTool("symbol"), 10);

                  setIsOpen(false);
                }}
              className="mt-4 bg-blue-600 text-white px-8 rounded hover:bg-blue-700"
            >
              OK
            </button>


          </div>
        </div>
      </div>
    </div>
  </div>
)}


        </>
    )
}



// function extractPinsFromSymbol(unit: any) {
//   if (!unit?.pins) return [];
//   return unit.pins.map((p: any) => ({
//     id: p.number[""] ,
//     x: p.at[0],
//     y: p.at[1],
//     connected: false
//   }));
// }
