import {
  createContext,
  useContext,
  useState,
  useEffect,
  type PropsWithChildren,
} from "react";

export type Tool = "none" | "wire" | "component" | "symbol";

export type ComponentKey =
  | "resistor"
  | "capacitor"
  | "inductor"
  | "ground"
  | "vcc"
  | string
  | null;

export type SymbolId =
  | "IR4301"
  | "BUF602"
  | "AD630ARZ"
  | "OPA333"
  | string; // fallback for other ids
  
type ToolContextValue = {
  tool: Tool;
  setTool: (t: Tool) => void;

  selectedComponent: ComponentKey;
  setSelectedComponent: (c: ComponentKey) => void;

  selectedSymbolId: SymbolId | null;
  setSelectedSymbolId: (id: SymbolId | null) => void;
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

  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);
  useEffect(() => {
    console.log("[ToolProvider] tool ->", tool, "selectedSymbolId ->", selectedSymbolId);
  }, [tool, selectedSymbolId]);

  return (
    <ToolContext.Provider
      value={{
        tool,
        setTool,
        selectedComponent,
        setSelectedComponent,
        selectedSymbolId,
        setSelectedSymbolId,
      }}
    >
      {children}
    </ToolContext.Provider>
  );
}
