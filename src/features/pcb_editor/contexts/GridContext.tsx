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
import {
  DEFAULT_GRID_PRECISION_MM,
  GRID_PIXEL_TARGET_MIN,
  GRID_PIXEL_TARGET_MAX,
  GRID_MAJOR_FACTOR,
} from "@/features/pcb_editor/constants";

export type GridConfig = {
  backgroundColor?: string;
  majorLineColor?: string;
  minorLineColor?: string;
  // Spacings provided by user are in millimeters (mm)
  majorSpacing?: number;
  minorSpacing?: number;
  visible?: boolean;
};

export type GridContextValue = {
  backgroundColor: string;
  majorLineColor: string;
  minorLineColor: string;
  // Spacings are provided in millimeters (mm)
  majorSpacing: number;
  minorSpacing: number;
  visible: boolean;
  toggleVisibility: () => void;
  styles: CSSProperties;
  // Render-time minor spacing in pixels (includes zoom and display multiplier)
  renderMinorPx: number;
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

// The canonical grid precision is stored in millimeters (mm) and does not
// change with zoom. For rendering we may choose to draw every Nth base
// grid line so the visual spacing stays within a readable pixel range. This
// function returns a multiplier (power-of-10) to scale the base precision
// for display only; snapping and stored geometry continue to use the
// unmodified base precision.
const computeDisplayMultiplier = (zoom: number) => {
  if (zoom <= 0) return 1;
  let mult = 1;
  let px = DEFAULT_GRID_PRECISION_MM * zoom * mult;
  while (px < GRID_PIXEL_TARGET_MIN) {
    mult *= 10;
    px = DEFAULT_GRID_PRECISION_MM * zoom * mult;
    if (mult > 1e6) break;
  }
  while (px > GRID_PIXEL_TARGET_MAX) {
    mult = Math.max(1, Math.floor(mult / 10));
    px = DEFAULT_GRID_PRECISION_MM * zoom * mult;
    if (mult === 1) break;
  }
  return mult;
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
    // Canonical spacings in millimeters (do not change with zoom)
    const minorMm = userMinorSpacing ?? DEFAULT_GRID_PRECISION_MM;
    const majorMm = userMajorSpacing ?? minorMm * GRID_MAJOR_FACTOR;
    return {
      major: majorMm,
      minor: minorMm,
    };
  }, [userMajorSpacing, userMinorSpacing]);
  // spacings in millimeters (mm)
  const majorSpacing = spacing.major;
  const minorSpacing = spacing.minor;

  const styles = useMemo<CSSProperties>(() => {
    if (!visible) {
      return { backgroundColor };
    }

    const lineScale = 1 / zoom;
    const minorLineWidth = 1 * lineScale;
    const majorLineWidth = 2 * lineScale;

    // Decide how many base minor-grid lines to skip when rendering so that a
    // drawn minor cell has a comfortable pixel size.
    const displayMult = computeDisplayMultiplier(zoom);
    const minorPx = Math.max(1, minorSpacing * zoom * displayMult);
    const majorPx = Math.max(1, minorPx * GRID_MAJOR_FACTOR);

    const renderMinorPx = minorPx;

    const computed = {
      backgroundColor,
      backgroundImage: `
        linear-gradient(0deg, ${minorLineColor} ${minorLineWidth}px, transparent ${minorLineWidth}px),
        linear-gradient(90deg, ${minorLineColor} ${minorLineWidth}px, transparent ${minorLineWidth}px),
        linear-gradient(0deg, ${majorLineColor} ${majorLineWidth}px, transparent ${majorLineWidth}px),
        linear-gradient(90deg, ${majorLineColor} ${majorLineWidth}px, transparent ${majorLineWidth}px)
      `,
      backgroundSize: `
        ${minorPx}px ${minorPx}px,
        ${minorPx}px ${minorPx}px,
        ${majorPx}px ${majorPx}px,
        ${majorPx}px ${majorPx}px
      `,
      backgroundBlendMode: "soft-light",
    };

    // attach renderMinorPx for consumer use
    return Object.assign(computed, { __renderMinorPx: renderMinorPx }) as CSSProperties;
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
      // expose the render minor pixels (read from styles.__renderMinorPx)
      renderMinorPx: (styles as unknown as { __renderMinorPx?: number }).__renderMinorPx ?? minorSpacing * zoom,
    }),
    [backgroundColor, majorLineColor, minorLineColor, majorSpacing, minorSpacing, visible, styles, zoom],
  );

  return <GridContext.Provider value={value}>{children}</GridContext.Provider>;
}
