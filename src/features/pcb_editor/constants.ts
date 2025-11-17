export const PAPER_PRESETS_MM: Record<string, { width: number; height: number }> = {
  a0: { width: 1189, height: 841 },
  a1: { width: 841, height: 594 },
  a2: { width: 594, height: 420 },
  a3: { width: 420, height: 297 },
  a4: { width: 297, height: 210 },
  a5: { width: 210, height: 148 },
};

export const PAPER_SIZE_OPTIONS = [
  { id: "a0", label: "A0 · 1189 × 841 mm" },
  { id: "a1", label: "A1 · 841 × 594 mm" },
  { id: "a2", label: "A2 · 594 × 420 mm" },
  { id: "a3", label: "A3 · 420 × 297 mm" },
  { id: "a4", label: "A4 · 297 × 210 mm" },
  { id: "a5", label: "A5 · 210 × 148 mm" },
];
