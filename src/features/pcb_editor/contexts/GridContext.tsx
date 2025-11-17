/* eslint-disable react-refresh/only-export-components -- Context module exposes hooks and configuration helpers */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type PropsWithChildren,
} from "react";

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

export function GridProvider({
  children,
  config,
}: PropsWithChildren<{ config?: GridConfig }>) {
  const [visible, setVisible] = useState(config?.visible ?? true);

  const backgroundColor = config?.backgroundColor ?? defaultBackground;
  const majorLineColor = config?.majorLineColor ?? defaultMajor;
  const minorLineColor = config?.minorLineColor ?? defaultMinor;
  const majorSpacing = config?.majorSpacing ?? 200;
  const minorSpacing = config?.minorSpacing ?? 40;

  const styles = useMemo<CSSProperties>(() => {
    if (!visible) {
      return { backgroundColor };
    }

    return {
      backgroundColor,
      backgroundImage: `
        linear-gradient(0deg, ${minorLineColor} 1px, transparent 1px),
        linear-gradient(90deg, ${minorLineColor} 1px, transparent 1px),
        linear-gradient(0deg, ${majorLineColor} 2px, transparent 2px),
        linear-gradient(90deg, ${majorLineColor} 2px, transparent 2px)
      `,
      backgroundSize: `
        ${minorSpacing}px ${minorSpacing}px,
        ${minorSpacing}px ${minorSpacing}px,
        ${majorSpacing}px ${majorSpacing}px,
        ${majorSpacing}px ${majorSpacing}px
      `,
      backgroundBlendMode: "soft-light",
    };
  }, [backgroundColor, minorLineColor, majorLineColor, minorSpacing, majorSpacing, visible]);

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
