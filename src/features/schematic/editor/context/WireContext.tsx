import { createContext, useContext, useState, useCallback } from "react";
import type { Point } from "../hooks/makeOrthogonalPath";

export type WirePoint = Point & {
  pinId?: string;
  connected?: boolean;
};

export type Wire = {
  id: string;
  points: WirePoint[];
};

type WireContextType = {
  wires: Wire[];
  setWires: React.Dispatch<React.SetStateAction<Wire[]>>;
  updateWirePinPosition: (pinId: string, x: number, y: number) => void;
};

const WireContext = createContext<WireContextType | null>(null);

export function WireProvider({ children }: any) {
  const [wires, setWires] = useState<Wire[]>([]);

  const updateWirePinPosition = useCallback(
    (pinId: string, x: number, y: number) => {
      setWires(prev =>
        prev.map(wire => ({
          ...wire,
          points: wire.points.map(p =>
            p.pinId === pinId ? { ...p, x, y } : p
          )
        }))
      );
    },
    []
  );

  return (
    <WireContext.Provider value={{ wires, setWires, updateWirePinPosition }}>
      {children}
    </WireContext.Provider>
  );
}

export function useWires() {
  const ctx = useContext(WireContext);
  if (!ctx) throw new Error("useWires must be used inside <WireProvider>");
  return ctx;
}

