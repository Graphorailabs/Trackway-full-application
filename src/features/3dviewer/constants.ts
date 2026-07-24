import type { GraphicAt } from "trackway-parser-wasm";

export const FOOTPRINT_ZERO_AT: GraphicAt = { x: 0, y: 0 };
export const FOOTPRINT_BBOX_PADDING = 1;
export const FOOTPRINT_CANVAS_TEXTURE_MAX_PX = 1024;
export const FOOTPRINT_CANVAS_DIMENSION_MIN = 32;
export const FOOTPRINT_CANVAS_DIMENSION_MAX = 2048;
export const FOOTPRINT_CANVAS_PPU_MIN = 16;
export const FOOTPRINT_CANVAS_PPU_MAX = 256;
export const FOOTPRINT_PAD_FILL_COLOR = "#ffd54f";
export const FOOTPRINT_PAD_STROKE_COLOR = "#c29a00";
export const FOOTPRINT_GRAPHIC_STROKE_COLOR = "#ffe9a6";
export const FOOTPRINT_GRAPHIC_FILL_COLOR = "#ffe9a6";
export const FOOTPRINT_SHADOW_COLOR = "rgba(255, 233, 166, 0.7)";
export const FOOTPRINT_SHADOW_MIN_BLUR = 2;
export const FOOTPRINT_SHADOW_GLOW_SCALE = 0.004;
export const FOOTPRINT_LINE_WIDTH_MIN = 1;
export const FOOTPRINT_LINE_WIDTH_SCALE = 0.002;
export const FOOTPRINT_PAD_ROUNDING_RATIO = 0.2;
export const FOOTPRINT_ARC_MIN_SEGMENTS = 8;
export const FOOTPRINT_ARC_MAX_STEP = Math.PI / 24;
export const BOARD_THICKNESS = 1;
export const PAD_SURFACE_EPS = 0.04;
export const FOOTPRINT_MODEL_SURFACE_OFFSET = 0.35;
export const SHOW_MODEL_DEBUG_CUBE = true;
export const SHOW_FOOTPRINT_CENTER_POINT = false;

export const MODEL_ZERO_VECTOR = { x: 0, y: 0, z: 0 } as const;
export const MODEL_UNIT_VECTOR = { x: 1, y: 1, z: 1 } as const;
export const MODEL_SCALE_MULTIPLIER = 2
export const MODEL_EXTRA_X_TILT_DEG = 90;
export const MODEL_EXTRA_X_TILT_RAD = (MODEL_EXTRA_X_TILT_DEG * Math.PI) / 180;
export const MODEL_VERTICAL_OFFSET = 0;
export const MODEL_CONTACT_OFFSET_FRONT = 0.75;
export const MODEL_CONTACT_OFFSET_BACK = -1.5;
