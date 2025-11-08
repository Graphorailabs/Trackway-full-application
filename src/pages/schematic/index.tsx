import Toolbar from "../../features/schematic/editor/components/ToolBar";
import { ToolProvider } from "../../features/schematic/editor/context/ToolContext";
import { SchematicCanvas } from "../../features/schematic/editor/sch_canva";

export default function SchematicPage() {
  return (
    <div className="h-screen flex flex-col">
      
        <ToolProvider>
      {/* ✅ Top Toolbar Section */}
      <div className="h-[5%] bg-transparent text-white flex items-center px-2">
         <Toolbar />
        
      </div>

      {/* ✅ Main App Layout */}
      <div className="flex-1 flex bg-gray-200">
        
        {/* Left sidebar */}
        <div className="w-[20%] bg-blue-200">
          Left area (Properties / Library)
        </div>

        {/* ✅ Middle Canvas Area */}
        <div className="flex-1 bg-white">
          <SchematicCanvas />
        </div>

        {/* Right sidebar */}
        <div className="w-[20%] bg-green-200">
          Right panel (Inspector / Logs)
        </div>
      </div>

      {/* ✅ Bottom Status Bar */}
      <div className="h-[4%] bg-gray-800 text-white text-sm flex items-center px-3">
        Status Bar
      </div>

      </ToolProvider>
    </div>

    
  );
}
