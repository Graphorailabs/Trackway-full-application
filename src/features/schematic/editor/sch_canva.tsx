
import { Layer } from "react-konva";

import StageHost from "./components/StageHost";
import { ComponentProvider } from "./context/ComponentContext";
import { GridProvider } from "./context/GridContext";
import { StageProvider } from "./context/stageProvider";
import { ZoomProvider } from "./context/ZoomContext";
import WireTool from "./layers/WireTool";
import BoardSheet from "./layers/BoardSheet";
import { WireProvider } from "./context/WireContext";
// import DottedGrid from "./layers/DotedGridLayer";
import CrossHairGrid from "./layers/CrossHairGrid";
import ComponentTool from "./components/componentTool";



export function SchematicCanvas() {

    return (
      
    <StageProvider>
  <ZoomProvider config={{ minScale: 0.25, maxScale: 4, scaleStep: 1.05 }}>
    <GridProvider initial={{ step: 40, baseStep: 40, visible: true }}>
      <ComponentProvider>
        <WireProvider>   {/* ✅ Add this wrapper here! */}
          <StageHost
            style={{ width: "100%", height: "100%" }}
            enableWheelZoom
            draggable={false}
          >
             <CrossHairGrid />
             {/* <DottedGrid /> */}
             
            <Layer listening={false}>
              <BoardSheet />
            </Layer>

            {/* ✅ Now both tools can access wires */}
            <ComponentTool />
            <WireTool />
            {/* <GridLayer /> */}
        
            {/* <PinLayer /> */}
          </StageHost>

        </WireProvider>
      </ComponentProvider>
    </GridProvider>
  </ZoomProvider>
</StageProvider>

    
    )
}