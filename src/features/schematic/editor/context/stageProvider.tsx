import { createContext, useContext, useRef, useState, type PropsWithChildren } from "react";
/* eslint-disable react-refresh/only-export-components -- context exports hooks/helpers */
import type Konva from "konva";

type Vec2 = { x: number; y: number };

type StageState = {
  width: number;
  height: number;
  scale: number;
  position: Vec2;   // pan
};

type StageContextValue = {
  stageRef: React.RefObject<Konva.Stage | null>;
  state: StageState;
  setSize: (w: number, h: number) => void;
  setScale: (scale: number) => void;
  setPosition: (pos: Vec2) => void;
  fitToParent: () => void;

  //tool system
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  activeComponent: ComponentType;
  setActiveComponent: (c : ComponentType) => void;

};

export type Tool = "none" | "wire" | "component" | "symbol";
export type ComponentType = "res" | "cap" | "ind" | "dio" | string | null;

const StageContext = createContext<StageContextValue | null>(null);

export function useStage() {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStage must be used inside <StageProvider>");
  return ctx;
}
export function StageProvider({ children }: PropsWithChildren) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const [state, setState] = useState<StageState>({
    width: 0,
    height: 0,
    scale: 1,
    position: { x: 0, y: 0 },
  });

  const setSize = (width: number, height: number) => {
    setState((s) => ({ ...s, width, height }));
    stageRef.current?.batchDraw(); // ✅ refresh
  };

  const setScale = (scale: number) => {
    setState((s) => ({ ...s, scale }));
    stageRef.current?.batchDraw(); // ✅ refresh
  };

  const setPosition = (position: Vec2) => {
    setState((s) => ({ ...s, position }));
    stageRef.current?.batchDraw(); // ✅ refresh
  };

  const fitToParent = () => {
    setState((s) => ({
      ...s,
      scale: 1,
      position: { x: 0, y: 0 },
    }));
    stageRef.current?.batchDraw();
  };

  const [activeTool, setActiveTool] = useState<Tool>("none");
  const [activeComponent, setActiveComponent] =
   useState<ComponentType>(null);

  return (
    <StageContext.Provider
      value={{
        stageRef,
        state,
        setSize,
        setScale,
        setPosition,
        fitToParent,
        activeTool,
        setActiveTool,
        activeComponent,
        setActiveComponent,
      }}
    >
      {children}
    </StageContext.Provider>
  );
}
