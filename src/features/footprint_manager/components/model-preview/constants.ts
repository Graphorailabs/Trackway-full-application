import { DEFAULT_MATERIAL_COLOR, DEFAULT_MATERIAL_PROPS } from "@/utils/threeModelUtils";

export const SUPPORTED_FORMATS = ["glb", "obj", "stl", "ply"] as const;

export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

export { DEFAULT_MATERIAL_PROPS, DEFAULT_MATERIAL_COLOR };
