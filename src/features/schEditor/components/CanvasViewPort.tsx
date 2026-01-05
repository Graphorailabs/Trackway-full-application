import BoardSheet from "./BoardSheet";
import { useKicadSchSafe } from "../context/KicadSchContext";
import CameraViewport from "./canvas/CameraViewPort";
import CanvasSurface from "./canvas/CanvasSurface";
import PlacedSymbolsRenderer from "./PlacedSymbolsRenderer";
import SymbolPlacementTool from "./SymbolPlacementTool";
import RoutingCanvas from "./wireCanvas";

export const CanvasViewport = () => {
  return (
    <CameraViewport>
       <CanvasSurface>
         <BoardSheet titleBlock={useKicadSchSafe()?.kicad?.title_block ?? null} />
      </CanvasSurface>
      <PlacedSymbolsRenderer />
      <SymbolPlacementTool />
      <RoutingCanvas />
    </CameraViewport>
  );
}

