import { useEffect, useState } from "react"
import { api } from  "@/api/api"
import { extractSymbolByName, extractSymbolNames } from "./extractSymbolLib";
import { SiCircuitverse } from "react-icons/si";
import { symbolLibJsonToValue, symbolLibSexprToJson, symbolLibSexprToValue } from "pkg/trackway_parser_wasm";
import { SymbolPreview } from "./symbolPreview";


interface SymbolLibrary {
  id: string;
  name: string;
  content: string;
}



export const LoadSymbol = () => {
     
     const [isOpen, setIsOpen] = useState(false);
     const [symbolLib, setSymbolLib] = useState<SymbolLibrary[]>([]);
     const [error, setError] = useState("");
     const [symbolNames, setSymbolNames] = useState<any[]>([]);
    const [selectedLibId, setSelectedLibId] = useState<string | null>(null);
    const [getContentById, setGetContentById] = useState<Record<any, any> | string>("");
    
    // const [convertedJson, setConvertedJson] = useState<any[]>([]);

    useEffect(() => {
      let isMounted = true;

           const fetchSymbolLib = async () => {
          try{
              const res = await api.get("/getSymbol");
              const data = res.data.data;
              if(!data){
                console.log('loading symbol just wait')
              }
              if(isMounted){
                 setSymbolLib(data);

                 console.log(data);
              }
  
          }catch(error : any){
              setError(error.response?.data?.error || "Failed to fetch symbol library");
          }
     }
     fetchSymbolLib();
      return () => {
         isMounted = false;
      }
    }, [])

     const loadSymbolNames = (content: string) => {
        const name = extractSymbolNames(content);
        setSymbolNames(name);
     }
 
    //  const handleContent = (name: string , content: string) => {
    //         const symbolBlock = extractSymbolByName(name, content);
    //         console.log("symbolBlock", symbolBlock!);  
    //         setGetContentById(symbolBlock!);
    //  }
     
    //  const handleContent = (id: string, content: string) => {
    //      const getValue = symbolLibValueFromSexpr
    //  }


    const handleContent = (id: string, content: string) => {
          const convertedJson = symbolLibSexprToJson(content, true);         
          const parsedJson = JSON.parse(convertedJson);
          console.log("parsed value",parsedJson);
       
          const symbolData = parsedJson.symbol.map((sym: any) => {
             const units: Record<string, {graphics: any[]; pin: any[]}> = {};
             sym.unit?.forEach((u: any) => {
               if(u && u.id){
                units[u.id] = {
                  graphics: u.graphics || [],
                  pin: u.pin || [],
                }
              }
             });

             return {
                id: sym.id,
                properties: Object.fromEntries(sym.property.map((p: any) => [p.key, p.value])),
                units,
             }
          })

        
          const selectedSymbol = symbolData.find((sym: any) => sym.id === id);

          if (selectedSymbol) {
            console.log("Found symbol:", selectedSymbol.units);
            setGetContentById(selectedSymbol.units);
            
          } else {
            console.warn("Symbol not found:", id);
            // fallback — just show first symbol
            if (symbolData.length > 0) {
              console.log("Using first symbol as fallback");
              setGetContentById(symbolData[0].properties);
            } else {
              setGetContentById("Symbol not found");
            }
          }
        };


         console.log(getContentById);


      // const maindata = symbolLib.find(s => s.id === selectedLibId)
      // console.log("maindata", maindata)
      // const convertedJson = maindata ? symbolLibSexprToJson(maindata.content , true) : null;
      // console.log("convertedJson", convertedJson)

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
        <aside className="w-[20%] bg-[#111] text-gray-200 flex-1 overflow-y-auto
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <h2 className="text-xs font-semibold px-4 py-2 border-b border-gray-700">
            Libraries
          </h2>

          <ul className="text-xs">
            {symbolLib.map((s: any) => (
              <li key={s.id}
                onClick={() => {
                  setSelectedLibId(s.id);
                  loadSymbolNames(s.content);
                }}
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
        <aside className="w-[20%] bg-[#181818] text-gray-200 overflow-y-auto
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          
          <h2 className="text-xs font-semibold px-4 py-2 border-b border-gray-700">
            Symbols
          </h2>

          <ul className="text-xs">
            {symbolNames.map((name: string, i: number) => (
              <li key={i} className="cursor-pointer px-4 py-2 hover:bg-[#222] "
                onClick={() => {
                   const lib = symbolLib.find(s => s.id === selectedLibId)
                   if(!lib) return;
                   handleContent(name, lib.content)
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        </aside>

        {/* ✅ Right Panel — Preview (No Scroll Here) */}
        <div className="w-[60%] bg-[#0f0f0f] text-gray-200 flex flex-col p-4">
          <h2 className="text-xs font-semibold mb-3 border-b border-gray-700 pb-2">
            Symbol Preview
          </h2>

          <div className="flex bg-[#131313] rounded overflow-y-auto h-full p-3">
            <pre className="text-gray-400 text-xs whitespace-pre-wrap break-words">
              {/* {typeof getContentById === "string"
                ? getContentById
                : JSON.stringify(getContentById, null, 2)} */}

                  <SymbolPreview data={getContentById as any} />
            </pre>
          </div>

        </div>
      </div>
    </div>
  </div>
)}


        </>
    )
}