import { SymbolProvider } from "@/features/schematic/editor/context/SymbolContext";
import Toolbar from "../../features/schematic/editor/components/ToolBar";
import { ToolProvider } from "../../features/schematic/editor/context/ToolContext";
import { SchematicCanvas } from "../../features/schematic/editor/sch_canva";
import { WireProvider } from "@/features/schematic/editor/context/WireContext";
import RightBar from "@/features/schematic/editor/components/RightBar";
import { KicadSchProvider } from "@/features/schematic/editor/context/KicadSchContext";

export default function SchematicPage() {
  return (
    <div className="h-screen flex flex-col bg-white">
      <SymbolProvider>
        <ToolProvider>

          {/* Top header (clean & compact) */}
          <div className="h-12 flex items-center px-3 border-b">
            <div className="font-medium">Schematic</div>
            {/* Toolbar removed from header so header stays compact */}
          </div>

          {/* Main content: left vertical toolbar, library, center canvas, right inspector */}
          <div className="flex-1 flex min-h-0">
            <WireProvider>
              <KicadSchProvider>
                {/* Left-most vertical toolbar */}
                <aside className="w-14 border-r bg-gray-50 p-2 flex flex-col items-center">
                  {/* Container ensures vertical stacking; adjust spacing as needed */}
                  <div className="flex flex-col items-center space-y-2 w-full">
                    <Toolbar />
                  </div>
                </aside>

                {/* Library / Properties (kept as a panel next to toolbar) */}
                {/* <aside className="w-64 border-r bg-gray-50 p-3 overflow-auto">Left — Library / Properties</aside> */}

                <main className="flex-1 p-3 min-h-0 overflow-auto bg-white">
                  <div className="w-full h-full border rounded-sm bg-white">
                    <SchematicCanvas />
                  </div>
                </main>
                <aside className="w-72 p-0 overflow-auto">
                  <RightBar />
                </aside>
              </KicadSchProvider>
            </WireProvider>
          </div>

          {/* Bottom status bar (small) */}
          <div className="h-8 border-t text-sm flex items-center px-3 bg-gray-100">Status: Ready</div>

        </ToolProvider>
      </SymbolProvider>
    </div>
  );
}