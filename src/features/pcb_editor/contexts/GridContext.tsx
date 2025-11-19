/* eslint-disable react-refresh/only-export-components -- Context module exposes hooks and configuration helpers */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type PropsWithChildren,
} from "react";

import { useZoom } from "@/features/pcb_editor/contexts/ZoomContext";

export type GridConfig = {
  backgroundColor?: string;
  majorLineColor?: string;
  minorLineColor?: string;
  majorSpacing?: number;
  minorSpacing?: number;
  visible?: boolean;
};

export type GridContextValue = {
  backgroundColor: string;
  majorLineColor: string;
  minorLineColor: string;
  majorSpacing: number;
  minorSpacing: number;
  visible: boolean;
  toggleVisibility: () => void;
  styles: CSSProperties;
};

const GridContext = createContext<GridContextValue | null>(null);

export function useGrid() {
  const ctx = useContext(GridContext);
  if (!ctx) throw new Error("useGrid must be used within <GridProvider>");
  return ctx;
}

const defaultBackground = "#0f1d17"; // KiCad-inspired dark canvas
const defaultMinor = "rgba(255, 255, 255, 0.05)";
const defaultMajor = "rgba(255, 255, 255, 0.12)";

const ADAPTIVE_GRID_LEVELS = [
  { minZoom: 0, minor: 120, major: 600 },
  { minZoom: 0.5, minor: 80, major: 400 },
  { minZoom: 0.9, minor: 40, major: 200 },
  { minZoom: 1.5, minor: 20, major: 100 },
  { minZoom: 2.3, minor: 10, major: 50 },
  { minZoom: 3.2, minor: 5, major: 25 },
  { minZoom: 4.2, minor: 2, major: 10 },
] as const;

const resolveAdaptiveSpacing = (zoom: number) => {
  let candidate = ADAPTIVE_GRID_LEVELS[0];
  for (const level of ADAPTIVE_GRID_LEVELS) {
    if (zoom >= level.minZoom) {
      candidate = level;
    } else {
      break;
    }
  }
  return candidate;
};

export function GridProvider({
  children,
  config,
}: PropsWithChildren<{ config?: GridConfig }>) {
  const { zoom } = useZoom();
  const [visible, setVisible] = useState(config?.visible ?? true);

  const backgroundColor = config?.backgroundColor ?? defaultBackground;
  const majorLineColor = config?.majorLineColor ?? defaultMajor;
  const minorLineColor = config?.minorLineColor ?? defaultMinor;
  const userMajorSpacing = config?.majorSpacing;
  const userMinorSpacing = config?.minorSpacing;
  const spacing = useMemo(() => {
    const adaptive = resolveAdaptiveSpacing(zoom);
    return {
      major: userMajorSpacing ?? adaptive.major,
      minor: userMinorSpacing ?? adaptive.minor,
    };
  }, [userMajorSpacing, userMinorSpacing, zoom]);
  const majorSpacing = spacing.major;
  const minorSpacing = spacing.minor;

  const styles = useMemo<CSSProperties>(() => {
    if (!visible) {
      return { backgroundColor };
    }

    const lineScale = 1 / zoom;
    const minorLineWidth = 1 * lineScale;
    const majorLineWidth = 2 * lineScale;

    return {
      backgroundColor,
      backgroundImage: `
        linear-gradient(0deg, ${minorLineColor} ${minorLineWidth}px, transparent ${minorLineWidth}px),
        linear-gradient(90deg, ${minorLineColor} ${minorLineWidth}px, transparent ${minorLineWidth}px),
        linear-gradient(0deg, ${majorLineColor} ${majorLineWidth}px, transparent ${majorLineWidth}px),
        linear-gradient(90deg, ${majorLineColor} ${majorLineWidth}px, transparent ${majorLineWidth}px)
      `,
      backgroundSize: `
        ${minorSpacing}px ${minorSpacing}px,
        ${minorSpacing}px ${minorSpacing}px,
        ${majorSpacing}px ${majorSpacing}px,
        ${majorSpacing}px ${majorSpacing}px
      `,
      backgroundBlendMode: "soft-light",
    };
  }, [backgroundColor, minorLineColor, majorLineColor, minorSpacing, majorSpacing, visible, zoom]);

  const value = useMemo<GridContextValue>(
    () => ({
      backgroundColor,
      majorLineColor,
      minorLineColor,
      majorSpacing,
      minorSpacing,
      visible,
      toggleVisibility: () => setVisible((v) => !v),
      styles,
    }),
    [backgroundColor, majorLineColor, minorLineColor, majorSpacing, minorSpacing, visible, styles],
  );

  return <GridContext.Provider value={value}>{children}</GridContext.Provider>;
}
