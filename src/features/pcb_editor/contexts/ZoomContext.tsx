/* eslint-disable react-refresh/only-export-components -- Context module needs to share hooks and types */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

export type ZoomConfig = {
  defaultZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
};

export type ZoomContextValue = {
  zoom: number;
  camera: Point;
  minZoom: number;
  maxZoom: number;
  step: number;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (value: number, target?: ZoomTarget) => void;
  zoomAt: (delta: number, target?: ZoomTarget) => void;
  updateFocusPoint: (world: Point, screenOffset?: Point) => void;
};

export type Point = { x: number; y: number };
export type ZoomTarget = {
  world?: Point;
  screenOffset?: Point;
};

const ZoomContext = createContext<ZoomContextValue | null>(null);

export function useZoom() {
  const ctx = useContext(ZoomContext);
  if (!ctx) throw new Error("useZoom must be used within <ZoomProvider>");
  return ctx;
}

export function ZoomProvider({
  config,
  children,
}: PropsWithChildren<{ config?: ZoomConfig }>) {
  const minZoom = config?.minZoom ?? 0.2;
  const maxZoom = config?.maxZoom ?? 5;
  const step = config?.step ?? 0.1;
  const [zoom, setZoomState] = useState<number>(config?.defaultZoom ?? 1);
  const [camera, setCamera] = useState<Point>({ x: 0, y: 0 });
  const focusPointRef = useRef<{ world: Point; screenOffset: Point }>({
    world: { x: 0, y: 0 },
    screenOffset: { x: 0, y: 0 },
  });

  const clampZoom = useCallback(
    (value: number) => Math.min(maxZoom, Math.max(minZoom, value)),
    [maxZoom, minZoom],
  );

  const updateFocusPoint = useCallback((world: Point, screenOffset?: Point) => {
    focusPointRef.current = {
      world,
      screenOffset: screenOffset ?? focusPointRef.current.screenOffset,
    };
  }, []);

  const setZoom = useCallback(
    (value: number, target?: ZoomTarget) => {
      setZoomState((currentZoom) => {
        const nextZoom = clampZoom(value);
        if (nextZoom === currentZoom) {
          return currentZoom;
        }
        const screenOffset = target?.screenOffset ?? focusPointRef.current.screenOffset;
        const world = target?.world ?? focusPointRef.current.world;
        setCamera({
          x: world.x - screenOffset.x / nextZoom,
          y: world.y - screenOffset.y / nextZoom,
        });
        return nextZoom;
      });
    },
    [clampZoom],
  );

  const zoomAt = useCallback(
    (delta: number, target?: ZoomTarget) => {
      setZoomState((currentZoom) => {
        const nextZoom = clampZoom(currentZoom + delta);
        if (nextZoom === currentZoom) {
          return currentZoom;
        }
        const screenOffset = target?.screenOffset ?? focusPointRef.current.screenOffset;
        const world = target?.world ?? focusPointRef.current.world;
        setCamera({
          x: world.x - screenOffset.x / nextZoom,
          y: world.y - screenOffset.y / nextZoom,
        });
        return nextZoom;
      });
    },
    [clampZoom],
  );

  const zoomIn = useCallback(() => zoomAt(step), [step, zoomAt]);
  const zoomOut = useCallback(() => zoomAt(-step), [step, zoomAt]);

  const value = useMemo<ZoomContextValue>(
    () => ({
      zoom,
      camera,
      minZoom,
      maxZoom,
      step,
      zoomIn,
      zoomOut,
      setZoom,
      zoomAt,
      updateFocusPoint,
    }),
    [zoom, camera, minZoom, maxZoom, step, zoomIn, zoomOut, setZoom, zoomAt, updateFocusPoint],
  );

  return <ZoomContext.Provider value={value}>{children}</ZoomContext.Provider>;
}
