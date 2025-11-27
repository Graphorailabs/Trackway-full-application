import  { createContext, useContext, useState, type PropsWithChildren } from "react";
import type { Footprint } from "trackway-parser-wasm";

export type FootprintPreview = {
  active: boolean;
  footprint?: Footprint;
  x?: number;
  y?: number;
  angle?: number;
};

type FootprintContextValue = {
  preview: FootprintPreview;
  setPreview: (p: FootprintPreview) => void;
  clearPreview: () => void;
};

const FootprintContext = createContext<FootprintContextValue | null>(null);

export function useFootprintPreview() {
  const ctx = useContext(FootprintContext);
  if (!ctx) throw new Error("useFootprintPreview must be used within <FootprintPreviewProvider>");
  return ctx;
}

export function FootprintPreviewProvider({ children }: PropsWithChildren) {
  const [preview, setPreviewState] = useState<FootprintPreview>({ active: false });

  const setPreview = (p: FootprintPreview) => setPreviewState(p);
  const clearPreview = () => setPreviewState({ active: false });

  return (
    <FootprintContext.Provider value={{ preview, setPreview, clearPreview }}>{children}</FootprintContext.Provider>
  );
}
