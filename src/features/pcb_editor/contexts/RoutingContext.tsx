import { createContext, useContext, useState, type PropsWithChildren } from "react";
import type { Pt } from "../components/layers/routing/octilinearRouter";

interface RoutingContextValue {
  previewTracks: Pt[];
  setPreviewTracks: (tracks: Pt[]) => void;
  previewIncompatibleWithPad: boolean;
  setPreviewIncompatibleWithPad: (v: boolean) => void;
}

interface RoutingLayerApi {
  currentTraceLayer: string | null;
  setCurrentTraceLayer: (layer: string | null) => void;
  toggleCurrentTraceLayer: () => void;
  resetCurrentTraceLayer: (layer?: string | null) => void;
}

const RoutingContext = createContext<(RoutingContextValue & RoutingLayerApi) | null>(null);

export function useRouting() {
  const ctx = useContext(RoutingContext);
  if (!ctx) throw new Error("useRouting must be used within RoutingProvider");
  return ctx;
}

export function RoutingProvider({ children }: PropsWithChildren) {
  const [previewTracks, setPreviewTracks] = useState<Pt[]>([]);
  const [previewIncompatibleWithPad, setPreviewIncompatibleWithPad] = useState<boolean>(false);
  const [currentTraceLayer, setCurrentTraceLayer] = useState<string | null>(null);

  const toggleCurrentTraceLayer = () => {
    setCurrentTraceLayer((cur) => {
      if (!cur) return cur;
      return cur === "F.Cu" ? "B.Cu" : "F.Cu";
    });
  };

  const resetCurrentTraceLayer = (layer?: string | null) => {
    setCurrentTraceLayer(layer ?? null);
  };

  return (
    <RoutingContext.Provider value={{ previewTracks, setPreviewTracks, previewIncompatibleWithPad, setPreviewIncompatibleWithPad, currentTraceLayer, setCurrentTraceLayer, toggleCurrentTraceLayer, resetCurrentTraceLayer }}>
      {children}
    </RoutingContext.Provider>
  );
}