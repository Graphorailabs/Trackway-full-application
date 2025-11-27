import React, { createContext, useContext, useState } from "react";
import type { Point } from "../hooks/makeOrthogonalPath";

/* eslint-disable react-refresh/only-export-components -- context exports hooks/helpers */
export type Pin = {
  id: string;
  x: number;
  y: number; 
  connected?: boolean;
};

export type ComponentItem = {
  id: string;
  name?: string;
  position: Point; 
  pins: Pin[];
  symbolData?: any;
};

type ComponentContextValue = {
  components: ComponentItem[];
  addComponent: (c: ComponentItem) => void;
  updateComponent: (id: string, updates: Partial<ComponentItem>) => void;
};

const ComponentContext = createContext<ComponentContextValue | null>(null);

export function ComponentProvider({ children }: { children: React.ReactNode }) {
  const [components, setComponents] = useState<ComponentItem[]>([]);
   
  const addComponent = (c: ComponentItem) =>
    setComponents(prev => [...prev, c]);

  
 const updateComponent = (
  id: string,
  updates: Partial<ComponentItem>
) =>
  setComponents(prev =>
    prev.map(c =>
      c.id === id
        ? {
            ...c,
            ...updates,
            // ✅ ensure position update is always applied properly
            position: updates.position
              ? { ...c.position, ...updates.position }
              : c.position,

            // ✅ only replace pins if explicitly provided
            pins: Array.isArray(updates.pins)
              ? updates.pins
              : c.pins,
          }
        : c
    )
  );



  

  return (
    <ComponentContext.Provider
      value={{ components, addComponent, updateComponent }}
    >
      {children}
    </ComponentContext.Provider>
  );
}

export function useComponents() {
  const ctx = useContext(ComponentContext);
  if (!ctx) throw new Error("useComponents must be inside <ComponentProvider>");
  return ctx;
}
