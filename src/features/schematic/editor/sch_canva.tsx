import { Layer } from "react-konva";

import StageHost from "./components/StageHost";
import { ComponentProvider } from "./context/ComponentContext";
import { GridProvider } from "./context/GridContext";
import { StageProvider } from "./context/stageProvider";
import { ZoomProvider } from "./context/ZoomContext";
import WireTool from "./layers/WireTool";
import BoardSheet from "./layers/BoardSheet";
// WireProvider moved to page-level so RightBar can access wires
import CrossHairGrid from "./layers/CrossHairGrid";
// import ComponentTool from "./components/componentTool";
// import { SymbolPreview } from "./components/symbolPreview";
// import { LoadSymbol } from "./components/LoadSymbol";
// import { SymbolPreviewCanvas } from "./components/SymbolPreviewCanvas";
import SymbolPlacementTool from "./components/SymbolPlacementTool";
import KicadSchContext, { KicadSchProvider } from "./context/KicadSchContext";


export function SchematicCanvas() {


  return (
    <StageProvider>
      <ZoomProvider config={{ minScale: 0.25, maxScale: 4, scaleStep: 1.05 }}>
        <GridProvider initial={{ step: 40, baseStep: 40, visible: true }}>
            <KicadSchProvider>
          <ComponentProvider>
                <StageHost
                  style={{ width: "100%", height: "100%" }}
                  enableWheelZoom
                  draggable={false}
                >
                  <CrossHairGrid />

                  <Layer listening={false}>
                    <BoardSheet />
                  </Layer>

                    <SymbolPlacementTool />
                 {/* <SymbolPreviewCanvas /> */}
                  {/* <ComponentTool /> */}
                  <WireTool />
                 
                
                </StageHost>
          </ComponentProvider>
         </KicadSchProvider>
        </GridProvider>
      </ZoomProvider>
    </StageProvider>
  );
}
