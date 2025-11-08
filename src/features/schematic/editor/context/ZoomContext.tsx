import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { useStage } from "./stageProvider";

export type ZoomConfig = {
  minScale?: number;
  maxScale?: number;
  scaleStep?: number; // multiplicative step for wheel zoom, e.g., 1.05
};

type ZoomContextValue = {
  // Source of truth from StageContext
  scale: number;

  // Config
  minScale: number;
  maxScale: number;
  scaleStep: number;

  // Actions
  setScale: (scale: number) => void; // clamped
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;

  // Helpers
  clamp: (s: number) => number;
  worldToScreen: (world: number) => number;
  screenToWorld: (px: number) => number;
};

const ZoomContext = createContext<ZoomContextValue | null>(null);

export function useZoom() {
  const ctx = useContext(ZoomContext);
  if (!ctx) throw new Error("useZoom must be used inside <ZoomProvider>");
  return ctx;
}

// Optional alias for readability in layers/components
export const useCanvasZoom = useZoom;

export function ZoomProvider({ children, config }: PropsWithChildren<{ config?: ZoomConfig }>) {
  const { state, setScale } = useStage();

  const value = useMemo<ZoomContextValue>(() => {
    const minScale = config?.minScale ?? 0.25;
    const maxScale = config?.maxScale ?? 4;
    const scaleStep =  1.25;

    const clamp = (s: number) => Math.max(minScale, Math.min(maxScale, s));

    const zoomApi: ZoomContextValue = {
      scale: state.scale,
      minScale,
      maxScale,
      scaleStep,
      setScale: (s: number) => setScale(clamp(s)),
      zoomIn: () => setScale(clamp(state.scale * scaleStep)),
      zoomOut: () => setScale(clamp(state.scale / scaleStep)),
      reset: () => setScale(1),
      clamp,
      worldToScreen: (world: number) => world * state.scale,
      screenToWorld: (px: number) => px / state.scale,
    };

    return zoomApi;
  }, [state.scale, setScale, config?.minScale, config?.maxScale, config?.scaleStep]);

  return <ZoomContext.Provider value={value}>{children}</ZoomContext.Provider>;
}
