import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

type PadHover = { fpUuid: string; padIndex: number } | null;

type PadHoverContextValue = {
  hovered: PadHover;
  setHovered: (v: PadHover) => void;
};

const PadHoverContext = createContext<PadHoverContextValue | null>(null);

export function PadHoverProvider({ children }: PropsWithChildren) {
  const [hovered, setHovered] = useState<PadHover>(null);
  const value = useMemo(() => ({ hovered, setHovered }), [hovered]);
  return <PadHoverContext.Provider value={value}>{children}</PadHoverContext.Provider>;
}

export function usePadHover() {
  const ctx = useContext(PadHoverContext);
  if (!ctx) throw new Error("usePadHover must be used within <PadHoverProvider>");
  return ctx;
}

export default PadHoverProvider;
