import {CanvasViewport} from "./components/CanvasViewPort"
import { GridProvider } from "./context/GridContext"
import { ToolProvider } from "./context/LeftToolbarContext"
import { SymbolProvider } from "./context/SymbolContext"
import { ZoomProvider } from "./context/ZoomContext"
import { PlacedSymbolProvider } from "./context/PlacedSymbolContext"
import { RoutingProvider } from "./context/WireContext"

export const SchematicLayout = () => {
  return (
 
     <ZoomProvider>
        <GridProvider>
          <SymbolProvider>
            <PlacedSymbolProvider>
              <RoutingProvider >
                <ToolProvider>
                  <CanvasViewport />
                </ToolProvider>
              </RoutingProvider>
            </PlacedSymbolProvider>
          </SymbolProvider>
        </GridProvider>
     </ZoomProvider>
  
  )
}