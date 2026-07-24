/*
 * MeasurementContext
 *
 * Provides a small, focused context for formatting and converting
 * linear measurements. The PCB model stores coordinates in millimeters
 * (mm). This context lets UI components display measurements in mm or
 * inches and centralizes formatting rules.
 */
/* eslint-disable react-refresh/only-export-components -- context exports hooks/helpers */
import React, { createContext, useContext, useMemo, useState } from "react";

export type MeasurementUnit = "mm" | "in";

export type MeasurementContextValue = {
  unit: MeasurementUnit;
  setUnit: (u: MeasurementUnit) => void;
  // Convert mm -> configured unit
  toUnit: (mm: number) => number;
  // Format a length (mm) into a human string, e.g. "12.34 mm" or "0.486 in"
  formatLength: (mm: number, opts?: { precision?: number }) => string;
};

const MeasurementContext = createContext<MeasurementContextValue | null>(null);

export function useMeasurement() {
  const ctx = useContext(MeasurementContext);
  if (!ctx) throw new Error("useMeasurement must be used within <MeasurementProvider>");
  return ctx;
}

export function MeasurementProvider({ children }: { children: React.ReactNode }) {
  const [unit, setUnit] = useState<MeasurementUnit>("mm");

  const value = useMemo<MeasurementContextValue>(() => {
    const toUnit = (mm: number) => (unit === "mm" ? mm : mm / 25.4);
    const formatLength = (mm: number, opts?: { precision?: number }) => {
      const precision = opts?.precision ?? (unit === "mm" ? 2 : 3);
      const v = toUnit(mm);
      const suffix = unit === "mm" ? "mm" : "in";
      return `${v.toFixed(precision)} ${suffix}`;
    };
    return { unit, setUnit, toUnit, formatLength };
  }, [unit]);

  return <MeasurementContext.Provider value={value}>{children}</MeasurementContext.Provider>;
}

// convenience: readable default hook that doesn't throw when provider missing
export function useMeasurementSafe() {
  try {
    return useMeasurement();
  } catch {
    // fallback default behavior (mm)
    return {
      unit: "mm" as MeasurementUnit,
      setUnit: () => {},
      toUnit: (mm: number) => mm,
      formatLength: (mm: number, opts?: { precision?: number }) => `${mm.toFixed(opts?.precision ?? 2)} mm`,
    } as MeasurementContextValue;
  }
}

export default MeasurementContext;
