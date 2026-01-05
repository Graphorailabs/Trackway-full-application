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
import { KicadSchProvider } from "./context/KicadSchContext"

export const SchematicLayout = () => {
  return (
 
     <ZoomProvider>
       <PcbProvider>
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