// Minimal types for schematic Manhattan routing utilities
// This file previously contained a full-blown router with shove/collision helpers
// that are not used in the schematic routing path (the worker uses its
// own internal router). Keep only the small, exported point type used
// across the schematic codebase.

export interface Pt {
  x: number;
  y: number;
}

export type Point = Pt;


