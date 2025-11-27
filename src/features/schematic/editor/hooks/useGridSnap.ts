// hooks/useGridSnap.ts
import { useContext, useCallback } from "react";
import { GridContext } from "../context/GlobalGrid";

export function useGridSnap() {
  const { gridStep } = useContext(GridContext);

  const snap = useCallback(
    (x: number, y: number) => {
      const snappedX = Math.round(x / gridStep) * gridStep;
      const snappedY = Math.round(y / gridStep) * gridStep;
      return { x: snappedX, y: snappedY };
    },
    [gridStep]
  );

  return snap;
}
