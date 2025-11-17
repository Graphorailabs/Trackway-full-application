import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";

import { SheetLayer } from "@/features/pcb_editor/components/layers/SheetLayer";
import { useGrid } from "@/features/pcb_editor/contexts/GridContext";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import { useZoom } from "@/features/pcb_editor/contexts/ZoomContext";

const GRID_EXTENT = 20000;

export function CanvasViewport() {
  const { styles } = useGrid();
  const { zoom, camera, zoomAt, updateFocusPoint, step } = useZoom();
  const { page, sheetMetadata } = usePcb();
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });

  useLayoutEffect(() => {
    if (!surfaceRef.current) return undefined;
    const element = surfaceRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setViewportSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const viewportCenter = useMemo(
    () => ({ x: viewportSize.width / 2, y: viewportSize.height / 2 }),
    [viewportSize],
  );

  const worldTransform = useMemo(
    () => ({
      transform: `translate(${viewportCenter.x}px, ${viewportCenter.y}px) scale(${zoom}) translate(${-camera.x}px, ${-camera.y}px)`,
      transformOrigin: "0 0",
    }),
    [viewportCenter, zoom, camera],
  );

  const gridPatternStyles = useMemo(() => {
    if (!styles.backgroundImage) {
      return { backgroundColor: "transparent" } as CSSProperties;
    }
    return { ...styles, backgroundColor: "transparent" } as CSSProperties;
  }, [styles]);

  const screenToWorld = useCallback(
    (point: { x: number; y: number }) => ({
      x: camera.x + (point.x - viewportCenter.x) / zoom,
      y: camera.y + (point.y - viewportCenter.y) / zoom,
    }),
    [camera, viewportCenter, zoom],
  );

  const handlePointerMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!surfaceRef.current) return;
      const rect = surfaceRef.current.getBoundingClientRect();
      const cursor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const world = screenToWorld(cursor);
      const screenOffset = {
        x: cursor.x - viewportCenter.x,
        y: cursor.y - viewportCenter.y,
      };
      updateFocusPoint(world, screenOffset);
    },
    [screenToWorld, updateFocusPoint, viewportCenter],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      if (!surfaceRef.current) return;
      const rect = surfaceRef.current.getBoundingClientRect();
      const cursor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const screenOffset = {
        x: cursor.x - viewportCenter.x,
        y: cursor.y - viewportCenter.y,
      };
      const world = screenToWorld(cursor);
      const direction = event.deltaY > 0 ? -1 : 1;
      const magnitude = Math.min(Math.abs(event.deltaY) / 100, 1);
      const delta = step * direction * magnitude;
      zoomAt(delta, { world, screenOffset });
    },
    [screenToWorld, viewportCenter, step, zoomAt],
  );

  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) return undefined;
    const listener = (event: WheelEvent) => handleWheel(event);
    element.addEventListener("wheel", listener, { passive: false });
    return () => {
      element.removeEventListener("wheel", listener);
    };
  }, [handleWheel]);

  return (
    <main
      className="relative z-0 flex flex-1 min-w-0 overflow-hidden"
      onMouseMove={handlePointerMove}
      role="presentation"
      ref={surfaceRef}
      style={{
        backgroundColor: styles.backgroundColor,
        overscrollBehavior: "contain",
        touchAction: "none",
      }}
    >
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
        <div className="absolute inset-0" style={worldTransform}>
          <div
            className="absolute"
            style={{
              width: GRID_EXTENT,
              height: GRID_EXTENT,
              left: -GRID_EXTENT / 2,
              top: -GRID_EXTENT / 2,
              ...gridPatternStyles,
            }}
          />
        </div>
      </div>
      <div className="relative flex h-full w-full" aria-live="polite">
        <div className="absolute inset-0" style={worldTransform}>
          <SheetLayer page={page} metadata={sheetMetadata} variant="anchored" />
        </div>
      </div>
    </main>
  );
}

export default CanvasViewport;
