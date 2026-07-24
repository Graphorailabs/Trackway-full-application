/* eslint-disable react-refresh/only-export-components -- Shared module exposes context hook and camera component */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PropsWithChildren,
} from "react";

import GridCanvas from "./GridCanvas";
import { useGrid } from "../../context/GridContext";
import { useZoom } from "../../context/ZoomContext";
import TopCanvasToolbar from "../toolbar/TopCanvasToolbar";
import LeftCanvasToolbar from "../toolbar/LeftCanvasToolbar";



// grid extent previously used for CSS background; no longer needed

type CameraViewportContextValue = {
  camera: { x: number; y: number };
  zoom: number;
  viewportCenter: { x: number; y: number };
  screenToWorld: (point: { x: number; y: number }) => { x: number; y: number };
};

const CameraViewportContext = createContext<CameraViewportContextValue | null>(null);

export function useCameraViewport(): CameraViewportContextValue {
  const ctx = useContext(CameraViewportContext);
  if (!ctx) {
    throw new Error("useCameraViewport must be used within <CameraViewport>");
  }
  return ctx;
}

export function CameraViewport({ children }: PropsWithChildren) {
  const { styles } = useGrid();
  const { zoom, camera, zoomByFactor, updateFocusPoint } = useZoom();
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

  // worldTransform and CSS background-style calculations are no longer
  // necessary because the grid is drawn into a world-space canvas.

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
      // Use multiplicative zoom around the cursor so the world point under
      // the pointer remains stationary in screen space. Map wheel delta to
      // a smooth factor; magnitude is normalized to [0,1].
      const direction = event.deltaY < 0 ? 1 : -1; // negative deltaY -> zoom in
      const magnitude = Math.min(Math.abs(event.deltaY) / 100, 1);
      // base factor per full magnitude step (20% per full step)
      const base = 1.2;
      const factor = Math.pow(base, direction * magnitude);
      zoomByFactor(factor, { world, screenOffset });
    },
    [screenToWorld, viewportCenter, zoomByFactor],
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

  const contextValue = useMemo<CameraViewportContextValue>(
    () => ({
      camera,
      zoom,
      viewportCenter,
      screenToWorld,
    }),
    [camera, zoom, viewportCenter, screenToWorld],
  );

  return (
    <CameraViewportContext.Provider value={contextValue}>
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
          <div className="absolute inset-0" style={{ overflow: "hidden" }}>
            <GridCanvas width={viewportSize.width} height={viewportSize.height} viewportCenter={viewportCenter} />
          </div>
        </div>
        <div className="relative flex h-full w-full" aria-live="polite">
          {/* Screen-anchored canvas toolbars (overlay) rendered in their own absolute
              containers so they don't participate in canvas layout or get covered
              by the GridCanvas. A 5px gap is kept from the edges. */}
          <div style={{ position: 'absolute', left: 5, top: 5, right: 5, pointerEvents: 'auto', zIndex: 60 }}>
            <TopCanvasToolbar />
          </div>

          <div style={{ position: 'absolute', left: 5, top: 5, bottom: 5, width: 64, pointerEvents: 'auto', zIndex: 60 }}>
            <LeftCanvasToolbar />
          </div>

          {/* main canvas area (children) remains underneath the overlays */}
          {children}
        </div>
      </main>
    </CameraViewportContext.Provider>
  );
}

export default CameraViewport;
