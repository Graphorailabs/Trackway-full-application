import { useMemo, type CSSProperties, type PropsWithChildren } from "react";

import { useCameraViewport } from "@/features/pcb_editor/components/canvas/CameraViewport";

export function CanvasSurface({ children }: PropsWithChildren) {
  const { camera, zoom, viewportCenter } = useCameraViewport();

  const worldTransform = useMemo(
    () =>
      ({
        transform: `translate(${viewportCenter.x}px, ${viewportCenter.y}px) scale(${zoom}) translate(${-camera.x}px, ${-camera.y}px)`,
        transformOrigin: "0 0",
      }) as CSSProperties,
    [viewportCenter, zoom, camera],
  );

  return (
    <div className="absolute inset-0" style={worldTransform}>
      {children}
    </div>
  );
}

export default CanvasSurface;
