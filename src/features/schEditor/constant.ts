// Lightweight local types to avoid depending on `trackway-parser-wasm`
// for type-only information during development. These mirror the
// minimal shape used by this file; if the real package is installed
// its richer types may be used instead.
export type CanonicalLayer = string;
export type LayerType = "signal" | "user" | string;
export type PcbLayer = {
  ordinal: number;
  canonical_name: CanonicalLayer;
  layer_type: LayerType;
  user_name: string;
  description?: string;
  defaultVisible?: boolean;
};

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

export type EditorLayer = PcbLayer & {
  description: string;
  defaultVisible: boolean;
};

type LayerDefinition = {
  ordinal: number;
  canonical_name: CanonicalLayer;
  layer_type: LayerType;
  user_name: string;
  description: string;
  defaultVisible?: boolean;
};

const createLayer = (definition: LayerDefinition): EditorLayer => ({
  ...definition,
  defaultVisible: Boolean(definition.defaultVisible),
});

const COPPER_STACK: EditorLayer[] = [
  createLayer({
    ordinal: 0,
    canonical_name: "F.Cu",
    layer_type: "signal",
    user_name: "Front Copper",
    description: "Front copper layer",
    defaultVisible: true,
  }),
  ...Array.from({ length: 30 }, (_, index) =>
    createLayer({
      ordinal: index + 1,
      canonical_name: (`In${index + 1}.Cu` as CanonicalLayer),
      layer_type: "signal",
      user_name: `Inner Copper ${index + 1}`,
      description: `Inner copper layer ${index + 1}`,
      defaultVisible: false,
    }),
  ),
  createLayer({
    ordinal: 31,
    canonical_name: "B.Cu",
    layer_type: "signal",
    user_name: "Back Copper",
    description: "Back copper layer",
    defaultVisible: true,
  }),
];

const TECH_LAYERS: EditorLayer[] = [
  createLayer({
    ordinal: 32,
    canonical_name: "B.Adhes",
    layer_type: "user",
    user_name: "Back Adhesive",
    description: "Back adhesive layer",
  }),
  createLayer({
    ordinal: 33,
    canonical_name: "F.Adhes",
    layer_type: "user",
    user_name: "Front Adhesive",
    description: "Front adhesive layer",
  }),
  createLayer({
    ordinal: 34,
    canonical_name: "B.Paste",
    layer_type: "user",
    user_name: "Back Paste",
    description: "Back solder paste layer",
  }),
  createLayer({
    ordinal: 35,
    canonical_name: "F.Paste",
    layer_type: "user",
    user_name: "Front Paste",
    description: "Front solder paste layer",
  }),
  createLayer({
    ordinal: 36,
    canonical_name: "B.SilkS",
    layer_type: "user",
    user_name: "Back Silkscreen",
    description: "Back silk screen layer",
    defaultVisible: true,
  }),
  createLayer({
    ordinal: 37,
    canonical_name: "F.SilkS",
    layer_type: "user",
    user_name: "Front Silkscreen",
    description: "Front silk screen layer",
    defaultVisible: true,
  }),
  createLayer({
    ordinal: 38,
    canonical_name: "B.Mask",
    layer_type: "user",
    user_name: "Back Solder Mask",
    description: "Back solder mask layer",
  }),
  createLayer({
    ordinal: 39,
    canonical_name: "F.Mask",
    layer_type: "user",
    user_name: "Front Solder Mask",
    description: "Front solder mask layer",
  }),
  createLayer({
    ordinal: 40,
    canonical_name: "Dwgs.User",
    layer_type: "user",
    user_name: "User Drawings",
    description: "User drawing layer",
  }),
  createLayer({
    ordinal: 41,
    canonical_name: "Cmts.User",
    layer_type: "user",
    user_name: "User Comments",
    description: "User comment layer",
  }),
  createLayer({
    ordinal: 42,
    canonical_name: "Eco1.User",
    layer_type: "user",
    user_name: "ECO1",
    description: "User engineering change order layer 1",
  }),
  createLayer({
    ordinal: 43,
    canonical_name: "Eco2.User",
    layer_type: "user",
    user_name: "ECO2",
    description: "User engineering change order layer 2",
  }),
  createLayer({
    ordinal: 44,
    canonical_name: "Edge.Cuts",
    layer_type: "user",
    user_name: "Edge Cuts",
    description: "Board outline layer",
    defaultVisible: true,
  }),
  createLayer({
    ordinal: 45,
    canonical_name: "F.CrtYd",
    layer_type: "user",
    user_name: "Front Courtyard",
    description: "Footprint front courtyard layer",
  }),
  createLayer({
    ordinal: 46,
    canonical_name: "B.CrtYd",
    layer_type: "user",
    user_name: "Back Courtyard",
    description: "Footprint back courtyard layer",
  }),
  createLayer({
    ordinal: 47,
    canonical_name: "F.Fab",
    layer_type: "user",
    user_name: "Front Fabrication",
    description: "Footprint front fabrication layer",
  }),
  createLayer({
    ordinal: 48,
    canonical_name: "B.Fab",
    layer_type: "user",
    user_name: "Back Fabrication",
    description: "Footprint back fabrication layer",
  }),
  ...Array.from({ length: 9 }, (_, index) =>
    createLayer({
      ordinal: 49 + index,
      canonical_name: (`User.${index + 1}` as CanonicalLayer),
      layer_type: "user",
      user_name: `User Layer ${index + 1}`,
      description: `User definable layer ${index + 1}`,
    }),
  ),
];

export const PCB_EDITOR_LAYERS: EditorLayer[] = [...COPPER_STACK, ...TECH_LAYERS];

// --- PCB-editor specific defaults moved here from top-level `src/constants.ts`
// Visual defaults for shapes (non-text)
export const DEFAULT_SHAPE_STROKE = "#a688f2ff";
export const DEFAULT_SHAPE_WIDTH = 0.9;

// Grid defaults (measurements in millimeters)
export const DEFAULT_GRID_PRECISION_MM = 0.001; // 0.001 mm at 100% zoom
export const GRID_PIXEL_TARGET_MIN = 6;
export const GRID_PIXEL_TARGET_MAX = 40;
export const GRID_MAJOR_FACTOR = 10;

// Feature flags for PCB editor
export const ENABLE_GRID_DEBUG = false;
export const ENABLE_SNAP_TO_VISIBLE_GRID = true;
// Endpoint snapping: when enabled, clicks/preview near an existing track
// endpoint will snap to that endpoint and endpoint-only contacts are
// treated as non-blocking. Tolerance is in millimeters.
export const ENABLE_ENDPOINT_SNAP = true;
export const ENDPOINT_SNAP_TOLERANCE = 0.18;
// Pad connection snap radius (mm). When the cursor is within this distance
// from a pad's copper, the router will snap the endpoint to the pad.
export const PAD_SNAP_RADIUS = 0.2;
// Toggle to enable pad hover highlight in the editor UI
export const ENABLE_PAD_HIGHLIGHT = true;
// Debug toggle: when true, draw a visible marker at each pad's canonical
// center to help debug snapping/finalization behavior in the PCB editor.
export const ENABLE_PAD_CENTER_DEBUG = false;
// Debug toggle: when true, render pad index/number text on each pad for
// visual debugging of pad transforms (flips/rotations).
export const ENABLE_PAD_NUMBER_DEBUG = false;
// Debug toggle: when true, show a `Log PCB` button in the top toolbar which
// will `console.log` the current PCB state for debugging purposes.
export const ENABLE_PCB_DEBUG_LOG_BUTTON = true;

// Schematic editor: pin highlight config
export const PIN_HIGHLIGHT_COLOR = '#f59e0b'; // amber highlight for hovered pins
export const PIN_HIGHLIGHT_STROKE = '#cb0a0aff';
export const PIN_HIGHLIGHT_STROKE_WIDTH = 0.3; // mm
export const PIN_HIGHLIGHT_RADIUS_OFFSET = 0.1; // mm added around the pin circle
// Radius used for pin hit-circles (world units, mm). Keep in sync with renderer.
export const PIN_HIT_RADIUS = 1.8;
// Visual opacity for pin highlight fill (0..1)
export const PIN_HIGHLIGHT_OPACITY = 0.35;
