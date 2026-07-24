import React, { createContext, useContext, useMemo } from "react";
import type { FootprintManagers, FootprintManager, LocalPackageManager, Local3DModelManager as Local3DModelManagerContract } from "./types";
import { CloudFootprintManager } from "./services/CloudFootprintManager";
import { LocalFootprintManager } from "./services/LocalFootprintManager";
import { Local3DModelManager } from "./services/Local3DModelManager";
import { Cloud3DModelManager } from "./services/Cloud3DModelManager";
import { Combined3DModelManager } from "./services/Combined3DModelManager";

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
    models: new Combined3DModelManager(new Local3DModelManager(), new Cloud3DModelManager()) as Local3DModelManagerContract,
  }), []);

  return <FootprintManagerContext.Provider value={{ managers }}>{children}</FootprintManagerContext.Provider>;
}

export default FootprintManagerProvider;
