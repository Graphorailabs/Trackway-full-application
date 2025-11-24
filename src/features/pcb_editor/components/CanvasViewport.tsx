import { SheetLayer } from "@/features/pcb_editor/components/layers/SheetLayer";
import { CameraViewport } from "@/features/pcb_editor/components/canvas/CameraViewport";
import { CanvasSurface } from "@/features/pcb_editor/components/canvas/CanvasSurface";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import ShapesCanvas from "@/features/pcb_editor/components/layers/ShapesCanvas";
import FootprintCanvas from "@/features/pcb_editor/components/layers/FootprintCanvas";
import RoutingCanvas from "@/features/pcb_editor/components/layers/RoutingCanvas";

export function CanvasViewport() {
  const { page, sheetMetadata } = usePcb();
  return (
    <CameraViewport>
      <CanvasSurface>
        <SheetLayer page={page} metadata={sheetMetadata} variant="anchored" />
      </CanvasSurface>
      {/* Render footprint canvas first so shape canvas is on top and
          receives pointer/contextmenu events by default. This restores
          selection/drag and right-click menus for shapes (will iterate
          later if we need footprints to capture events above shapes). */}
      <FootprintCanvas />
      <RoutingCanvas />
      <ShapesCanvas />
    </CameraViewport>
  );
}

export default CanvasViewport;
