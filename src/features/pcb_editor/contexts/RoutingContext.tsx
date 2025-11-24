import { createContext, useContext, useState, type PropsWithChildren } from "react";
import type { Pt } from "../components/layers/routing/octilinearRouter";

interface RoutingContextValue {
  previewTracks: Pt[];
  setPreviewTracks: (tracks: Pt[]) => void;
}

const RoutingContext = createContext<RoutingContextValue | null>(null);

export function useRouting() {
  const ctx = useContext(RoutingContext);
  if (!ctx) throw new Error("useRouting must be used within RoutingProvider");
  return ctx;
}

export function RoutingProvider({ children }: PropsWithChildren) {
  const [previewTracks, setPreviewTracks] = useState<Pt[]>([]);

  return (
    <RoutingContext.Provider value={{ previewTracks, setPreviewTracks }}>
      {children}
    </RoutingContext.Provider>
  );
}