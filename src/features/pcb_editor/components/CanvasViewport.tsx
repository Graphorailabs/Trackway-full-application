import { SheetLayer } from "@/features/pcb_editor/components/layers/SheetLayer";
import { CameraViewport } from "@/features/pcb_editor/components/canvas/CameraViewport";
import { CanvasSurface } from "@/features/pcb_editor/components/canvas/CanvasSurface";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import ShapesCanvas from "@/features/pcb_editor/components/layers/ShapesCanvas";

export function CanvasViewport() {
  const { page, sheetMetadata } = usePcb();
  return (
    <CameraViewport>
      <CanvasSurface>
        <SheetLayer page={page} metadata={sheetMetadata} variant="anchored" />
      </CanvasSurface>
      <ShapesCanvas />
    </CameraViewport>
  );
}

export default CanvasViewport;
