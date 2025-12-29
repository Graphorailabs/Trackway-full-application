import BoardSheet from "./BoardSheet";
import CameraViewport from "./canvas/CameraViewPort";
import CanvasSurface from "./canvas/CanvasSurface";
import PlacedSymbolsRenderer from "./PlacedSymbolsRenderer";
import SymbolPlacementTool from "./SymbolPlacementTool";
import RoutingCanvas from "./wireCanvas";

export const CanvasViewport = () => {
  return (
    <CameraViewport>
       <CanvasSurface>
         <BoardSheet />
      </CanvasSurface>
{/*    
         <PlacedSymbolsRenderer />
         <SymbolPlacementTool /> */}
      <PlacedSymbolsRenderer />
      <SymbolPlacementTool />
      <RoutingCanvas />
    </CameraViewport>
  );
}

