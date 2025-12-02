import { createContext, useContext, useState, useEffect, useRef } from "react";

export type selectsymbol = {
      id: string;
      symbolId: string;
      position: string;
      pins: [];
      symbolData: any;
}

export type pendingSymbolItem = any;

type SymbolContextType = {
    // Ref for live pin positions during drag
    livePinPositionsRef: React.MutableRefObject<{ [symbolId: string]: { [pinId: string]: { x: number; y: number } } }>;
  // Symbol currently loaded from KiCad JSON
  symbolData: any;
  setSymbolData: (data: any) => void;

  // When user selects a symbol but not placed yet
  pendingSymbol: any;
  setPendingSymbol: (data: any) => void;

  // Currently selected component in the canvas
  selectedSymbol: any;
  setSelectedSymbol: (data: any) => void;

  // All symbols placed on the canvas
  placedSymbols: any[];
  setPlacedSymbols: (data: any[]) => void;
  addPlacedSymbol: (item: any) => void;
  updatePlacedSymbol: (id: string, patch: any) => void;
  removePlacedSymbol: (id: string) => void;

  // Symbol being previewed (hover, sidebar preview, etc.)
  previewSymbol: any;
  setPreviewSymbol: (data: any) => void;
};

export const SymbolContext = createContext<SymbolContextType | null>(null);

export const SymbolProvider = ({ children }: any) => {
    // Ref to store live pin positions for all symbols
    const livePinPositionsRef = useRef<{ [symbolId: string]: { [pinId: string]: { x: number; y: number } } }>({});
  const providerId = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 9);
  const [symbolData, setSymbolData] = useState<any>(null);
  const [pendingSymbol, setPendingSymbol] = useState<any>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<any>(null);

  // symbols placed on the canvas (multiple)
  const [placedSymbols, setPlacedSymbols] = useState<any[]>([]);

  // ⭐ used for preview panel before placement
  const [previewSymbol, setPreviewSymbol] = useState<any>(null);

  useEffect(() => {
    console.log("[SymbolProvider] mounted id=", providerId);
  }, []);

  useEffect(() => {
    console.log("[SymbolProvider] pendingSymbol ->", pendingSymbol);
    console.log("[SymbolProvider] symbolData ->", symbolData);
    console.log("[SymbolProvider] selectedSymbol ->", selectedSymbol);
    console.log("[SymbolProvider] placedSymbols -> length", placedSymbols.length);
  }, [pendingSymbol, symbolData, selectedSymbol, placedSymbols]);


  return (
    <SymbolContext.Provider
      value={{
        symbolData,
        setSymbolData,

        pendingSymbol,
        setPendingSymbol,

        selectedSymbol,
        setSelectedSymbol,

        placedSymbols,
        setPlacedSymbols: (s: any[]) => setPlacedSymbols(s),
        addPlacedSymbol: (item: any) => setPlacedSymbols((prev) => [...prev, item]),
        updatePlacedSymbol: (id: string, patch: any) =>
          setPlacedSymbols((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
        removePlacedSymbol: (id: string) => setPlacedSymbols((prev) => prev.filter((p) => p.id !== id)),

        previewSymbol,
        setPreviewSymbol,
        livePinPositionsRef,
      }}
    >
      {children}
    </SymbolContext.Provider>
  );
};

export const useSymbol = () => {
  const context = useContext(SymbolContext);

  if (!context) {
    throw new Error("useSymbol must be used within a SymbolProvider");
  }
  
  return context;
};
