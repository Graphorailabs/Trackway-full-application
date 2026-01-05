import { FastForward } from "lucide-react";
import { useTool } from "../../context/LeftToolbarContext";
import { ErcChecker } from "../ErcChecker";
import { LoadSymbol } from "../LoadSymbol";
import { FaSave } from "react-icons/fa";


export default function LeftCanvasToolbar() {
   const { tool, setTool, setSelectedComponent } = useTool();
   const baseBtn =
      "w-12 h-12 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition";


   const handleSave = () => {
      setTool("save");
      // Implement save functionality here
      console.log("Save tool selected");
      
   }
      
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
         </div>

         <div className="mt-auto mb-3 text-xs text-gray-500">Canvas Tools</div>
      </aside>
   );
}