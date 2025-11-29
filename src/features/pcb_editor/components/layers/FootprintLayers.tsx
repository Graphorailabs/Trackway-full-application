import { Layer } from "react-konva";
import FootprintKonvaLayer from "@/features/pcb_editor/footprint/FootprintKonvaLayer";
import FootprintPreviewLayer from "@/features/pcb_editor/footprint/FootprintPreviewLayer";

export default function FootprintLayers() {
  return (
    <>
      <Layer>
        <FootprintKonvaLayer />
      </Layer>
      <Layer listening={false}>
        <FootprintPreviewLayer />
      </Layer>
    </>
  );
}
