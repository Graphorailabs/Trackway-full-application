import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
/* eslint-disable react-refresh/only-export-components -- context exports hooks/helpers */

export type GridState = {
  visible: boolean;
  step: number;          // spacing between dots in world units
  dotRadius: number;     // dot radius in world units
  dotColor: string;      // any CSS color
  dotOpacity: number;    // 0..1
  baseStep?: number;     // base step size for dynamic scaling
};

type Point = { x: number; y: number };

type GridContextValue = GridState & {
  setVisible: (v: boolean) => void;
  toggleVisible: () => void;
  setStep: (s: number) => void;
  setDotRadius: (r: number) => void;
  setDotColor: (c: string) => void;
  setDotOpacity: (o: number) => void;
  
  // Dynamic step calculation based on zoom
  getEffectiveStep: (zoom: number) => number;

  // Snap helpers (world-space)
  snapValue: (v: number) => number;
  snapPoint: (p: Point) => Point;

  // For Konva dragBoundFunc: receives world coords, returns snapped world coords
  snapDrag: (pos: Point) => Point;
};

const GridContext = createContext<GridContextValue | null>(null);

export function useGrid() {
  const ctx = useContext(GridContext);
  if (!ctx) throw new Error("useGrid must be used inside <GridProvider>");
  return ctx;
}

export function GridProvider({
  children,
  initial,
}: PropsWithChildren<{ initial?: Partial<GridState> }>) {
  const [state, setState] = useState<GridState>({
    visible: initial?.visible ?? true,
    step: initial?.step ?? 40,
    dotRadius: initial?.dotRadius ?? 1.2,
    dotColor: initial?.dotColor ?? "#e5e7eb", // gray-200
    dotOpacity: initial?.dotOpacity ?? 1,
    baseStep: initial?.baseStep ?? initial?.step ?? 40,
  });

  const api = useMemo<GridContextValue>(() => {
    // Return fixed step size regardless of zoom level
    // Grid will naturally scale with zoom without changing density
    const getEffectiveStep = (_zoom: number) => {
      return state.step;
    };

    const snapValue = (v: number) => Math.round(v / state.step) * state.step;
    const snapPoint = (p: Point) => ({ x: snapValue(p.x), y: snapValue(p.y) });
    const snapDrag = (pos: Point) => snapPoint(pos); // dragBoundFunc uses world coords

    return {
      ...state,
      setVisible: (v) => setState((s) => ({ ...s, visible: v })),
      toggleVisible: () => setState((s) => ({ ...s, visible: !s.visible })),
      setStep: (step) => setState((s) => ({ ...s, step, baseStep: s.baseStep || step })),
      setDotRadius: (dotRadius) => setState((s) => ({ ...s, dotRadius })),
      setDotColor: (dotColor) => setState((s) => ({ ...s, dotColor })),
      setDotOpacity: (dotOpacity) => setState((s) => ({ ...s, dotOpacity })),
      getEffectiveStep,
      snapValue,
      snapPoint,
      snapDrag,
    };
  }, [state]);

  return <GridContext.Provider value={api}>{children}</GridContext.Provider>;
}
