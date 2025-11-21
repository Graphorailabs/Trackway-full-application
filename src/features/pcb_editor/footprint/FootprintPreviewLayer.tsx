import React from "react";
import { Group } from "react-konva";
import FootprintKonvaRenderer from "@/features/pcb_editor/footprint/FootprintKonvaRenderer";
import { useFootprintPreview } from "@/features/pcb_editor/footprint/FootprintContext";

export default function FootprintPreviewLayer() {
  const { preview } = useFootprintPreview();

  if (!preview?.active || !preview?.footprint) return null;

  const x = preview.x ?? 0;
  const y = preview.y ?? 0;
  const angle = preview.angle ?? 0;

  return (
    <>
      <Group x={x} y={y} rotation={(angle as number) * (180 / Math.PI)} opacity={0.5} listening={false}>
        <Group x={0} y={0}>
          <FootprintKonvaRenderer model={preview.footprint as any} respectLayerVisibility={false} />
        </Group>
      </Group>
    </>
  );
}
