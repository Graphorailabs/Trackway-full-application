import React, { createContext, useContext } from 'react';
import { useSymbol } from './SymbolContext';

type PlacedSymbolContextType = {
  placedSymbols: any[];
  setPlacedSymbols: (arr: any[]) => void;
  addPlacedSymbol: (item: any) => void;
  updatePlacedSymbol: (id: string, patch: any) => void;
  removePlacedSymbol: (id: string) => void;
  livePinPositionsRef: React.MutableRefObject<{ [symbolId: string]: { [pinId: string]: { x: number; y: number } } }>;
};



const PlacedSymbolContext = createContext<PlacedSymbolContextType | null>(null);

export const PlacedSymbolProvider = ({ children }: { children: React.ReactNode }) => {
  // This provider proxies the existing SymbolContext placement APIs so
  // consumers can import a clearly-named "placed symbol" context.
  const symbol = useSymbol();

  const value: PlacedSymbolContextType = {
    placedSymbols: symbol.placedSymbols,
    setPlacedSymbols: symbol.setPlacedSymbols,
    addPlacedSymbol: symbol.addPlacedSymbol,
    updatePlacedSymbol: symbol.updatePlacedSymbol,
    removePlacedSymbol: symbol.removePlacedSymbol,
    livePinPositionsRef: symbol.livePinPositionsRef,
  };

  console.log('value',value);

  return <PlacedSymbolContext.Provider value={value}>{children}</PlacedSymbolContext.Provider>;
};


export const usePlacedSymbol = () => {
  const ctx = useContext(PlacedSymbolContext);
  if (!ctx) throw new Error('usePlacedSymbol must be used within <PlacedSymbolProvider>');
  return ctx;
};

export default PlacedSymbolProvider;
