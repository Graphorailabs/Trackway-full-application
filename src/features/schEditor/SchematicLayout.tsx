import {CanvasViewport} from "./components/CanvasViewPort"
import { GridProvider } from "./context/GridContext"
import { ToolProvider } from "./context/LeftToolbarContext"
import { SymbolProvider } from "./context/SymbolContext"
import { ZoomProvider } from "./context/ZoomContext"
import { PlacedSymbolProvider } from "./context/PlacedSymbolContext"
import { RoutingProvider } from "./context/WireContext"
import { KicadSchProvider } from "./context/KicadSchContext"
import { PcbProvider, usePcb } from "@/features/pcb_editor/contexts/PcbContext"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
// import { KicadSchProvider } from "./context/KicadSchContext"

function SchematicToolbar() {
  const navigate = useNavigate();
  const { persistPcb } = usePcb();

  const handleOpenPcbEditor = async () => {
    try {
      // Save any pending PCB changes before navigating
      await persistPcb();
      navigate('/pcb-editor');
    } catch (e) {
      console.error('Failed to save PCB before opening editor', e);
      // Still navigate even if save fails
      navigate('/pcb-editor');
    }
  };

  return (
    <div style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
      <button onClick={handleOpenPcbEditor} style={{ padding: '5px 10px' }}>
        Open PCB Editor
      </button>
    </div>
  );
}

export const SchematicLayout = () => {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
     <ZoomProvider>
       <PcbProvider>
         <SchematicToolbar />
         <PcbLogger />
          <GridProvider>
            <SymbolProvider>
              <PlacedSymbolProvider>
                
                <RoutingProvider >
            <KicadSchProvider>
                  <ToolProvider>
                    <CanvasViewport />
                  </ToolProvider>
            </KicadSchProvider>
                </RoutingProvider>

              </PlacedSymbolProvider>
            </SymbolProvider>
          </GridProvider>
       </PcbProvider>
     </ZoomProvider>
    </div>
  )
}

function PcbLogger() {
  try {
    const { pcb, source, isLoading } = usePcb();
    useEffect(() => {
      console.log('[Schematic] PCB context loaded (background):', { source, isLoading, pcb });
    }, [pcb, source, isLoading]);
  } catch (e) {
    // usePcb will throw if not within provider — swallow silently
  }
  return null;
}