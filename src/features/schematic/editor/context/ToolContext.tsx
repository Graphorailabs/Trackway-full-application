import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";

export type Tool = "none" | "wire" | "component";

export type ComponentKey = "resistor" | "capacitor" | "inductor" | "ground" | "vcc" | null;

type ToolContextValue = {
  tool: Tool;
  setTool: (t: Tool) => void;

  selectedComponent: ComponentKey;
  setSelectedComponent: (c: ComponentKey) => void;
};

const ToolContext = createContext<ToolContextValue | null>(null);

export function useTool() {
  const ctx = useContext(ToolContext);
  if (!ctx) throw new Error("useTool must be used inside <ToolProvider>");
  return ctx;
}

export function ToolProvider({ children }: PropsWithChildren) {
  const [tool, setTool] = useState<Tool>("none");
  const [selectedComponent, setSelectedComponent] = useState<ComponentKey>("resistor");

  return (
    <ToolContext.Provider
      value={{ tool, setTool, selectedComponent, setSelectedComponent }}
    >
      {children}
    </ToolContext.Provider>
  );
}
