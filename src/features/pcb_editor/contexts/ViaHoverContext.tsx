import React, { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

type ViaHover = { uuid: string; point: { x: number; y: number } } | null;

type ViaHoverContextValue = {
  hovered: ViaHover;
  setHovered: (v: ViaHover) => void;
};

const ViaHoverContext = createContext<ViaHoverContextValue | null>(null);

export function ViaHoverProvider({ children }: PropsWithChildren) {
  const [hovered, setHovered] = useState<ViaHover>(null);
  const value = useMemo(() => ({ hovered, setHovered }), [hovered]);
  return <ViaHoverContext.Provider value={value}>{children}</ViaHoverContext.Provider>;
}

export function useViaHover() {
  const ctx = useContext(ViaHoverContext);
  if (!ctx) throw new Error("useViaHover must be used within <ViaHoverProvider>");
  return ctx;
}

export default ViaHoverProvider;
