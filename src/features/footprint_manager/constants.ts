// Feature-specific constants for footprint manager preview debugging
// Toggle this to true to enable bounding-box debug overlays in preview.
// Debug visuals and logs for the footprint preview. Set this to `true` to enable
// debug overlays (bbox, center markers, etc.) by default. You can still
// override this at runtime in the browser console via
// `window.FOOTPRINT_PREVIEW_DEBUG = true` for quick troubleshooting.
export const FOOTPRINT_PREVIEW_DEBUG = false   ;

// Some footprints encode arc geometry with `mid` representing the circle
// center and endpoints ordered opposite to what our renderer expects. This
// flag controls whether we flip start/end when `mid` is present. Defaults to
// `true` to match KiCad-style footprints. Can be overridden at runtime via
// `window.FOOTPRINT_PREVIEW_FLIP_ARC_POINTS = false`.
export const FOOTPRINT_PREVIEW_FLIP_ARC_POINTS = false;

// Maximum stage (canvas) dimension in pixels used by the preview when in
// "Expand" mode. Increase if you need larger uncropped previews, but beware
// very large canvases may consume significant memory.
export const FOOTPRINT_PREVIEW_MAX_STAGE_DIM = 10000;

export const BASE_BACKEND_URL = "https://api.ohmgpt.com/api/v1/footprints";
export const CATEGOTIES_ENDPOINT = "/categories";
export const MODEL3D_ENDPOINT = "/3dmodels";
