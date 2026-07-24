export const SUPPORTED_MODEL_FORMATS = ["glb", "obj", "stl", "ply"] as const;
export type FootprintModelFormat = (typeof SUPPORTED_MODEL_FORMATS)[number];
