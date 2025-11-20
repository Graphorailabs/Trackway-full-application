import React, { createContext, useContext, useMemo } from "react";
import type { FootprintManagers, FootprintManager, LocalPackageManager } from "./types";
import { CloudFootprintManager } from "./services/CloudFootprintManager";
import { LocalFootprintManager } from "./services/LocalFootprintManager";

type ContextValue = {
  managers: FootprintManagers;
};

const FootprintManagerContext = createContext<ContextValue | null>(null);

export function useFootprintManagers() {
  const ctx = useContext(FootprintManagerContext);
  if (!ctx) throw new Error("useFootprintManagers must be used inside FootprintManagerProvider");
  return ctx.managers;
}

export function FootprintManagerProvider({ children }: { children: React.ReactNode }) {
  const managers = useMemo<FootprintManagers>(() => ({
    cloud: new CloudFootprintManager() as FootprintManager,
    local: new LocalFootprintManager() as LocalPackageManager,
  }), []);

  return <FootprintManagerContext.Provider value={{ managers }}>{children}</FootprintManagerContext.Provider>;
}

export default FootprintManagerProvider;
