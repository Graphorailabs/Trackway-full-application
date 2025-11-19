import type { CanonicalLayer, Layer as PcbLayer, LayerType } from "trackway-parser-wasm";

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
