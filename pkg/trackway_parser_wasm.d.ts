/* tslint:disable */
/* eslint-disable */
/**
 * Return the generated TypeScript definitions for the exposed KiCad data models.
 */
export function exportTypes(): string;
/**
 * Return a reasonable default DRC config as a JS value.
 */
export function drcCreateDefaultConfig(): any;
/**
 * Run DRC on a PCB S-expression and return issues as an array of `DRCIssue`.
 *
 * If `config` is omitted or `null`, a default config is used.
 */
export function drcRunFromPcbSexpr(input: string, config?: any | null): any;
/**
 * Run DRC from a JS `Pcb` value and return issues as `DRCIssue[]`.
 */
export function drcRunFromPcbValue(value: any, config?: any | null): any;
/**
 * Export Gerber + Excellon drills as a single ZIP file.
 *
 * Returns the ZIP bytes as `Uint8Array` (browser-friendly, no filesystem access).
 *
 * If `options` is omitted or `null`, defaults are used.
 */
export function gerberExportZipFromPcbSexpr(input: string, options?: any | null): Uint8Array;
/**
 * Export Gerber + Excellon drills from a JS `Pcb` value as a ZIP (`Uint8Array`).
 */
export function gerberExportZipFromPcbValue(value: any, options?: any | null): Uint8Array;
/**
 * Convert a schematic S-expression string to JSON.
 */
export function schematicSexprToJson(input: string, pretty: boolean): string;
/**
 * Convert a schematic JSON string to KiCad S-expression text.
 */
export function schematicJsonToSexpr(input: string, pretty: boolean): string;
/**
 * Convert a schematic JSON string into a JavaScript object shaped like `KicadSch`.
 */
export function schematicJsonToValue(input: string): any;
/**
 * Convert a schematic S-expression into a JavaScript object shaped like `KicadSch`.
 */
export function schematicSexprToValue(input: string): any;
/**
 * Run ERC on a schematic S-expression and return the `ErcReport` as a JS object.
 */
export function ercRunFromSexpr(input: string): any;
/**
 * Run ERC from a JS `KicadSch` value and return `ErcReport` as JS object.
 */
export function ercRunFromValue(value: any): any;
/**
 * Build minimal SchematicModel from a S-expression and return as JS object.
 */
export function ercBuildModelFromSexpr(input: string): any;
/**
 * Convert an `ErcReport` Rust JSON string to a JS object.
 */
export function ercReportJsonToValue(input: string): any;
/**
 * Convert an `ErcReport` JS object to a JSON string.
 */
export function ercReportValueToJson(value: any, pretty: boolean): string;
/**
 * Convert an `ErcReport` Rust JSON string to pretty/raw JSON string (identity helper).
 */
export function ercReportJsonToJson(input: string, pretty: boolean): string;
/**
 * Render a schematic JavaScript object (matching `KicadSch`) to JSON text.
 */
export function schematicValueToJson(value: any, pretty: boolean): string;
/**
 * Render a schematic JavaScript object (matching `KicadSch`) to KiCad S-expression text.
 */
export function schematicValueToSexpr(value: any, pretty: boolean): string;
/**
 * Return a new minimal schematic as a JavaScript object.
 */
export function createMinimalSchematic(): any;
/**
 * Return a new minimal schematic as JSON text.
 */
export function createMinimalSchematicJson(pretty: boolean): string;
/**
 * Convert a symbol library S-expression string to JSON.
 */
export function symbolLibSexprToJson(input: string, pretty: boolean): string;
/**
 * Convert a symbol library JSON string to KiCad S-expression text.
 */
export function symbolLibJsonToSexpr(input: string, pretty: boolean): string;
/**
 * Convert a symbol library JSON string into a JavaScript object.
 */
export function symbolLibJsonToValue(input: string): any;
/**
 * Convert a symbol library S-expression into a JavaScript object.
 */
export function symbolLibSexprToValue(input: string): any;
/**
 * Render a symbol library JavaScript object to JSON text.
 */
export function symbolLibValueToJson(value: any, pretty: boolean): string;
/**
 * Render a symbol library JavaScript object to KiCad S-expression text.
 */
export function symbolLibValueToSexpr(value: any, pretty: boolean): string;
/**
 * Return a new minimal symbol library as a JavaScript object.
 */
export function createMinimalSymbolLib(): any;
/**
 * Return a new minimal symbol library as JSON text.
 */
export function createMinimalSymbolLibJson(pretty: boolean): string;
/**
 * Convert a footprint library S-expression string to JSON.
 */
export function footprintLibSexprToJson(input: string, pretty: boolean): string;
/**
 * Convert a footprint library JSON string to KiCad S-expression text.
 */
export function footprintLibJsonToSexpr(input: string, pretty: boolean): string;
/**
 * Convert a footprint library JSON string into a JavaScript object shaped like `FootprintLibrary`.
 */
export function footprintLibJsonToValue(input: string): any;
/**
 * Convert a footprint library S-expression into a JavaScript object shaped like `FootprintLibrary`.
 */
export function footprintLibSexprToValue(input: string): any;
/**
 * Render a footprint library JavaScript object to JSON text.
 */
export function footprintLibValueToJson(value: any, pretty: boolean): string;
/**
 * Render a footprint library JavaScript object to KiCad S-expression text.
 */
export function footprintLibValueToSexpr(value: any, pretty: boolean): string;
/**
 * Return a new minimal footprint library as a JavaScript object.
 */
export function createMinimalFootprintLib(): any;
/**
 * Return a new minimal footprint library as JSON text.
 */
export function createMinimalFootprintLibJson(pretty: boolean): string;
/**
 * Convert a PCB S-expression string to JSON.
 */
export function pcbSexprToJson(input: string, pretty: boolean): string;
/**
 * Convert a PCB JSON string to KiCad S-expression text.
 */
export function pcbJsonToSexpr(input: string, pretty: boolean): string;
/**
 * Convert a PCB JSON string into a JavaScript object shaped like `Pcb`.
 */
export function pcbJsonToValue(input: string): any;
/**
 * Convert a PCB S-expression into a JavaScript object shaped like `Pcb`.
 */
export function pcbSexprToValue(input: string): any;
/**
 * Render a PCB JavaScript object (matching `Pcb`) to JSON text.
 */
export function pcbValueToJson(value: any, pretty: boolean): string;
/**
 * Render a PCB JavaScript object (matching `Pcb`) to KiCad S-expression text.
 */
export function pcbValueToSexpr(value: any, pretty: boolean): string;
/**
 * Return a new minimal PCB as a JavaScript object.
 */
export function createMinimalPcb(): any;
/**
 * Return a new minimal PCB as JSON text.
 */
export function createMinimalPcbJson(pretty: boolean): string;
export interface KicadSch {
    version: number;
    generator: string;
    generator_version?: string;
    uuid: Uuid;
    paper?: Paper;
    title_block?: TitleBlock;
    lib_symbols?: LibSymbols;
    sheet?: Sheet[];
    junction?: Junction[];
    no_connect?: NoConnect[];
    bus_entry?: BusEntry[];
    wire?: Wire[];
    bus?: Bus[];
    polyline?: Polyline[];
    text?: GraphText[];
    label?: LocalLabel[];
    global_label?: GlobalLabel[];
    symbol?: SchematicSymbol[];
    path?: RootPath;
}

/**
 * Represents a KiCad symbol library file (.kicad_sym)
 * (kicad_symbol_lib (version YYYYMMDD) (generator \"name\") SYMBOL_DEFINITION... )
 */
export interface KicadSymbolLib {
    /**
     * version as a YYYYMMDD integer (e.g. 20250114)
     */
    version: number;
    /**
     * generator string (e.g. \"kicad_symbol_editor\" or your generator name)
     */
    generator: string;
    /**
     * the symbols defined in this library (0..n)
     */
    symbol?: Symbol[];
}

/**
 * Root of a KiCad PCB file. Currently models the header, page, layers, and general
 * sections per the KiCad board file format
 * <https://dev-docs.kicad.org/en/file-formats/sexpr-pcb/index.html>.
 */
export interface Pcb {
    version: number;
    generator: string;
    generator_version?: string;
    page: Paper;
    layers: Layers;
    setup: Setup;
    properties?: Property[];
    nets?: Net[];
    graphics?: PcbGraphicItem[];
    images?: Image[];
    footprints?: Footprint[];
    tracks?: Track[];
    zones?: Zone[];
    groups?: Group[];
    general?: General;
}

/**
 * Represents a single KiCad footprint library file (`.kicad_mod`).
 * Encapsulates the optional header metadata along with the parsed footprint body.
 */
export interface FootprintLibrary {
    version?: number;
    generator?: string;
    generator_version?: string;
    footprint: Footprint;
    extra?: string[];
}

export interface SchematicModel {
    nets: NetInfo[];
}

export interface ErcReport {
    issues: ErcIssue[];
}

/**
 * Configuration for the DRC engine.
 *
 * This is passed to individual check functions and to [`crate::board::drc::run_all_drc`].
 */
export interface DrcConfig {
    /**
     * Baseline constraints.
     */
    clearances: ClearanceConfig;
    /**
     * Optional zone rule configuration.
     */
    zone_rules: ZoneRules | null;
    /**
     * Known net classes by ordinal.
     */
    net_classes: NetClass[];
    /**
     * Optional advanced clearance rules.
     */
    advanced_clearance: AdvancedClearance | null;
}

/**
 * A single DRC issue.
 *
 * Consumers can use:
 * - [`DRCIssue::code`] for stable classification,
 * - [`DRCIssue::message`] for human-readable output,
 * - [`DRCIssue::objects`] and [`DRCIssue::point`] to attach issues to geometry.
 */
export interface DRCIssue {
    /**
     * Unique identifier for this issue instance.
     */
    id: Uuid;
    /**
     * Machine-readable issue code.
     */
    code: DRCCode;
    /**
     * Severity level.
     */
    severity: DRCSeverity;
    /**
     * Human-readable message describing the issue.
     */
    message: string;
    /**
     * Board objects implicated in this issue.
     */
    objects: BoardObjectRef[];
    /**
     * Optional layer context.
     */
    layer: CanonicalLayer | null;
    /**
     * Representative point for UI highlighting and debugging.
     */
    point: Xy;
    /**
     * Measured value (in millimeters) when applicable.
     */
    measured: number | null;
    /**
     * Required value (in millimeters) when applicable.
     */
    required: number | null;
}

/**
 * Configuration for converting a `Pcb` into Gerber (RS-274X) layers.
 */
export interface GerberExportOptions {
    units: Units;
    coordinate_format: CoordinateFormat;
    /**
     * Which layers to generate and in what order.
     */
    layers: GerberLayerSpec[];
    /**
     * If true, include common X2 file attributes (TF.*) where possible.
     */
    include_x2_attributes: boolean;
}

/**
 * Controls how Gerber is rendered to RS-274X text.
 */
export interface GerberWriteOptions {
    units: Units;
    coordinate_format: CoordinateFormat;
    /**
     * If true, write a leading comment header with basic metadata.
     */
    include_header_comment: boolean;
    /**
     * Optional Gerber SR (step-and-repeat) panelization applied while writing.
     *
     * If set, the writer will wrap the first drawing command in `%SR...*%` and
     * clear it (`%SR*%`) before EOF.
     */
    step_repeat: StepRepeat | null;
}

/**
 * File naming strategy for Gerber exports.
 */
export interface GerberNamingScheme {
    /**
     * If set, use this as a prefix for all files.
     */
    prefix: string | null;
    /**
     * How to name the per-layer \"base\" portion of the filename.
     */
    style: GerberLayerNamingStyle;
}

export interface DrillExportOptions {
    units: DrillUnits;
    format: DrillFormat;
    /**
     * If true, include micro/blind vias as drill hits too (v1: still a single file).
     */
    include_non_through_vias: boolean;
    /**
     * If true, also include circular internal Edge.Cuts holes as NPTH drill hits.
     *
     * This is a heuristic meant to cover boards that represent mounting holes as
     * internal Edge.Cuts circles rather than NPTH pads.
     */
    include_edge_cuts_circular_holes_as_npth: boolean;
    /**
     * If true, also include slotted internal Edge.Cuts cutouts (capsule/oval) as NPTH
     * Excellon slots (G85).
     *
     * This is a heuristic and intentionally conservative to avoid misclassifying
     * arbitrary cutouts as drill slots.
     */
    include_edge_cuts_slots_as_npth: boolean;
}

export interface GerberZipOptions {
    base_name?: string;
    gerber_options?: GerberExportOptions;
    gerber_write_options?: GerberWriteOptions;
    gerber_naming?: GerberNamingScheme;
    drill_options?: DrillExportOptions;
    include_drills?: boolean;
}

export interface GerberZipOptions {
    base_name?: string;
    gerber_options?: GerberExportOptions;
    gerber_write_options?: GerberWriteOptions;
    gerber_naming?: GerberNamingScheme;
    drill_options?: DrillExportOptions;
    include_drills?: boolean;
}

/**
 * `(polyline ...)`
 */
export interface Polyline {
    /**
     * Coordinate point list: `(pts (xy ...) (xy ...) ...)`
     */
    pts: Pts;
    /**
     * How the line is drawn.
     */
    stroke: Stroke;
    uuid: Uuid;
}

export interface UnknownTrack {
    sexpr: string;
}

/**
 * Simple coordinate pair used by setup origin tokens.
 */
export interface Coordinate {
    x: number;
    y: number;
}

export interface FootprintPad {
    number: string;
    pad_type: PadType;
    shape: PadShape;
    at: GraphicAt;
    locked?: boolean;
    size: Xy;
    drill?: PadDrill;
    layers: string[];
    properties?: PadProperty[];
    remove_unused_layers?: boolean;
    keep_end_layers?: boolean;
    roundrect_rratio?: number;
    chamfer_ratio?: number;
    chamfer?: PadChamferCorner[];
    net?: PadNet;
    tstamp?: string;
    pinfunction?: string;
    pintype?: string;
    die_length?: number;
    solder_mask_margin?: number;
    solder_paste_margin?: number;
    solder_paste_margin_ratio?: number;
    clearance?: number;
    zone_connect?: FootprintZoneConnect;
    thermal_width?: number;
    thermal_gap?: number;
    custom_options?: CustomPadOptions;
    custom_primitives?: CustomPadPrimitives;
    uuid?: Uuid;
    extra?: string[];
}

export interface GraphicArc {
    start: Xy;
    mid: Xy;
    end: Xy;
    layer: CanonicalLayer;
    width: number;
    uuid: Uuid;
    locked?: boolean;
    tstamp?: string;
    extra?: string[];
}

/**
 * (bus_entry (at x y) (size dx dy) (stroke ...) (uuid \"...\"))
 */
export interface BusEntry {
    /**
     * POSITION_IDENTIFIER — XY only (no rotation)
     */
    at: Xy;
    /**
     * (size X Y) — vector from `at` to the end of the entry
     */
    size: Xy;
    /**
     * STROKE_DEFINITION — required
     */
    stroke: Stroke;
    /**
     * UNIQUE_IDENTIFIER — required
     */
    uuid: Uuid;
}

export interface GraphicCircle {
    center: Xy;
    end: Xy;
    layer: CanonicalLayer;
    width: number;
    fill?: boolean;
    uuid: Uuid;
    locked?: boolean;
    tstamp?: string;
    extra?: string[];
}

/**
 * Supports both `(comment \"text\")` and `(comment <idx> \"text\")`.
 */
export type TbComment = string | [number, string];

export interface TitleBlock {
    /**
     * (title \"...\")
     */
    title?: string | null;
    /**
     * (date \"...\")
     */
    date?: string | null;
    /**
     * (rev \"...\")
     */
    rev?: string | null;
    /**
     * (company \"...\")
     */
    company?: string | null;
    /**
     * (comment \"text\") OR (comment <idx> \"text\")
     */
    comment?: TbComment[];
}

/**
 * Represents a KiCad symbol library file (.kicad_sym)
 * (kicad_symbol_lib (version YYYYMMDD) (generator \"name\") SYMBOL_DEFINITION... )
 */
export interface KicadSymbolLib {
    /**
     * version as a YYYYMMDD integer (e.g. 20250114)
     */
    version: number;
    /**
     * generator string (e.g. \"kicad_symbol_editor\" or your generator name)
     */
    generator: string;
    /**
     * the symbols defined in this library (0..n)
     */
    symbol?: Symbol[];
}

export type PaperSize = PaperNamedSize | [number, number];

export type PaperNamedSize = string;

/**
 * (paper PAPER_SIZE | WIDTH HEIGHT [portrait])
 */
export interface Paper {
    size: PaperSize;
    portrait?: boolean;
}

/**
 * (junction (at x y) (diameter D)? (color R G B A)? (uuid \"...\"))
 */
export interface Junction {
    /**
     * POSITION_IDENTIFIER — KiCad uses XY only (no rotation)
     */
    at: Xy;
    /**
     * (diameter DIAMETER) — optional; 0 means “use default from settings”
     */
    diameter?: number | null;
    /**
     * (color R G B A) — optional; all zeros = use default color
     */
    color?: Rgba | null;
    /**
     * UNIQUE_IDENTIFIER — required
     */
    uuid: Uuid;
}

export interface GraphText {
    "": string;
    at: Xyr;
    effects: TextEffects;
    uuid: Uuid;
}

export type VersionIn = number | string | string;

export interface Pts {
    /**
     * one or more `(xy X Y)` entries
     */
    xy?: Xy[];
}

/**
 * Shared shape vocabulary for labels and sheet pins.
 */
export type LabelPinShape = "input" | "output" | "bidirectional" | "tri_state" | "passive";

/**
 * Valid fill types per KiCad spec.
 */
export type FillType = "none" | "outline" | "background";

/**
 * (fill (type none|outline|background))
 */
export interface Fill {
    /**
     * (type none|outline|background)
     */
    type: FillType;
}

/**
 * (color R G B A)
 */
export type Rgba = [number, number, number, number];

/**
 * Valid stroke styles per KiCad spec.
 */
export type StrokeType = "dash" | "dash_dot" | "dash_dot_dot" | "dot" | "default" | "solid";

/**
 * (stroke (width WIDTH) (type TYPE) (color R G B A)?)
 */
export interface Stroke {
    /**
     * (width WIDTH)
     */
    width: number;
    /**
     * (type TYPE) — dash | dash_dot | dash_dot_dot | dot | default | solid
     */
    type: StrokeType;
    /**
     * (color R G B A) — 0..255 each (optional in KiCad)
     */
    color?: Rgba;
}

/**
 * Presence-only flag → renders as a bare symbol head (e.g., `(bold)`, `(italic)`, `(hide)`)
 */
export type Flag = null;

/**
 * (justify [left|right] [top|bottom] [mirror])
 * Model as presence flags; default (when absent) is centered & not mirrored.
 */
export interface Justify {
    left?: boolean;
    right?: boolean;
    top?: boolean;
    bottom?: boolean;
    mirror?: boolean;
}

/**
 * Required font size: (size HEIGHT WIDTH)
 */
export type FontSize = [number, number];

/**
 * Optional font face: (face \"NAME\")
 */
export type FontFace = string;

/**
 * (font (face NAME)? (size H W) (thickness T)? [bold] [italic] (line_spacing R)?)
 */
export interface Font {
    /**
     * (face FACE_NAME) — TTF family name or \"KiCad Font\" (v7+). Optional.
     */
    face?: FontFace;
    /**
     * (size HEIGHT WIDTH) — required
     */
    size: FontSize;
    /**
     * (thickness THICKNESS) — optional line thickness
     */
    thickness?: number;
    /**
     * [bold] — presence flag
     */
    bold?: boolean;
    italic?: boolean;
    /**
     * (line_spacing RATIO) — optional; not yet supported by KiCad but in grammar
     */
    line_spacing?: number;
}

/**
 * (effects (font ...) (justify ...) [hide])
 */
export interface TextEffects {
    font?: Font;
    justify?: Justify;
    hide?: boolean;
}

/**
 * Simple wrapper to match `(uuid <string>)`
 */
export type Uuid = string;

export type Xyr = [number, number, number];

/**
 * Tuple structs match KiCad’s positional lists nicely.
 * (size w h)  (at x y r)
 */
export type Xy = [number, number];

/**
 * Excellon coordinate format settings.
 */
export interface DrillFormat {
    zero_suppression: ZeroSuppression;
    integer_digits: number;
    decimal_digits: number;
}

export type ZeroSuppression = "Leading" | "Trailing" | "None";

export type DrillUnits = "Inch" | "Millimeter";

/**
 * How to derive the layer base filename.
 */
export type GerberLayerNamingStyle = "LayerName" | "KiCad";

/**
 * File naming strategy for Gerber exports.
 */
export interface GerberNamingScheme {
    /**
     * If set, use this as a prefix for all files.
     */
    prefix: string | null;
    /**
     * How to name the per-layer \"base\" portion of the filename.
     */
    style: GerberLayerNamingStyle;
}

/**
 * Controls how Gerber is rendered to RS-274X text.
 */
export interface GerberWriteOptions {
    units: Units;
    coordinate_format: CoordinateFormat;
    /**
     * If true, write a leading comment header with basic metadata.
     */
    include_header_comment: boolean;
    /**
     * Optional Gerber SR (step-and-repeat) panelization applied while writing.
     *
     * If set, the writer will wrap the first drawing command in `%SR...*%` and
     * clear it (`%SR*%`) before EOF.
     */
    step_repeat: StepRepeat | null;
}

/**
 * KiCad PCB `setup` section capturing manufacturing and plotting settings.
 */
export interface Setup {
    stackup?: Stackup;
    pad_to_mask_clearance: number;
    solder_mask_min_width?: number;
    pad_to_paste_clearance?: number;
    pad_to_paste_clearance_ratio?: number;
    aux_axis_origin?: Coordinate;
    grid_origin?: Coordinate;
    pcbplotparams: PcbPlotParams;
    extra?: string[];
}

/**
 * Representation of the `(pcbplotparams ...)` block within a setup section.
 */
export interface PcbPlotParams {
    layerselection: string;
    disableapertmacros: boolean;
    usegerberextensions: boolean;
    usegerberattributes: boolean;
    usegerberadvancedattributes: boolean;
    creategerberjobfile: boolean;
    svguseinch: boolean;
    svgprecision: number;
    excludeedgelayer: boolean;
    plotframeref: boolean;
    viasonmask: boolean;
    mode: PlotMode;
    useauxorigin: boolean;
    hpglpennumber: number;
    hpglpenspeed: number;
    hpglpendiameter: number;
    dxfpolygonmode: boolean;
    dxfimperialunits: boolean;
    dxfusepcbnewfont: boolean;
    psnegative: boolean;
    psa4output: boolean;
    plotreference: boolean;
    plotvalue: boolean;
    plotinvisibletext: boolean;
    sketchpadsonfab: boolean;
    subtractmaskfromsilk: boolean;
    outputformat: PlotOutputFormat;
    mirror: boolean;
    drillshape: PlotDrillShape;
    scaleselection: number;
    outputdirectory: string;
    extra?: string[];
}

export type PlotDrillShape = string;

export type PlotOutputFormat = string;

export type PlotMode = string;

export interface Image {
    at: ImageAt;
    scale?: number;
    layer?: string;
    uuid: Uuid;
    data: string;
    extra?: string[];
}

export interface ImageAt {
    x: number;
    y: number;
    angle?: number;
}

/**
 * KiCad PCB `general` section. Currently only models the thickness token and
 * preserves any additional, as-yet unsupported forms.
 */
export interface General {
    thickness?: number;
    extra?: string[];
}

export type FootprintZoneConnect = "none" | "thermal_relief" | "solid";

export type PadChamferCorner = string;

export type PadShape = string;

export type PadType = string;

/**
 * Configuration for the DRC engine.
 *
 * This is passed to individual check functions and to [`crate::board::drc::run_all_drc`].
 */
export interface DrcConfig {
    /**
     * Baseline constraints.
     */
    clearances: ClearanceConfig;
    /**
     * Optional zone rule configuration.
     */
    zone_rules: ZoneRules | null;
    /**
     * Known net classes by ordinal.
     */
    net_classes: NetClass[];
    /**
     * Optional advanced clearance rules.
     */
    advanced_clearance: AdvancedClearance | null;
}

/**
 * Additional clearance-related rules.
 *
 * These fields exist to model KiCad rule concepts and may be enforced by future checks.
 */
export interface AdvancedClearance {
    diff_pair_gap: number;
    diff_pair_tolerance: number;
    high_voltage_clearance: number;
    creepage_distance: number;
}

/**
 * Per-netclass DRC overrides.
 *
 * Values override the corresponding fields in [`ClearanceConfig`] when present.
 */
export interface NetClass {
    /**
     * KiCad net class ordinal.
     */
    ordinal: number;
    /**
     * Override copper clearance.
     */
    clearance_override: number | null;
    /**
     * Override minimum track width.
     */
    track_width_override: number | null;
    /**
     * Override via diameter.
     */
    via_diameter_override: number | null;
    /**
     * Override via drill.
     */
    via_drill_override: number | null;
}

/**
 * Rules related to copper zones (pours).
 *
 * Some fields are currently informational and may be enforced by future checks.
 */
export interface ZoneRules {
    /**
     * Optional zone clearance override.
     */
    zone_clearance: number | null;
    /**
     * Minimum copper island area to keep (reserved for future checks).
     */
    min_island_area: number;
    /**
     * Thermal relief gap.
     */
    thermal_relief_gap: number;
    /**
     * Thermal spoke width.
     */
    thermal_spoke_width: number;
    /**
     * Thermal spoke count.
     */
    thermal_spoke_count: number;
}

/**
 * Baseline clearance and minimum-geometry constraints.
 *
 * All numeric values are expressed in millimeters.
 */
export interface ClearanceConfig {
    /**
     * Minimum copper-to-copper clearance.
     */
    cu2cu: number;
    /**
     * Minimum copper-to-board-edge clearance.
     */
    cu2board_edge: number;
    /**
     * Minimum copper-to-hole clearance.
     */
    cu2hole: number;
    /**
     * Minimum track width.
     */
    min_track_width: number;
    /**
     * Minimum via outer diameter.
     */
    min_via_diameter: number;
    /**
     * Minimum pad-to-pad clearance (reserved for future checks).
     */
    min_pad2pad: number;
    /**
     * Minimum pad-to-hole clearance (reserved for future checks).
     */
    min_pad2hole: number;
    /**
     * Minimum annular ring width.
     */
    min_annular_ring: number;
    /**
     * Minimum via drill diameter.
     */
    min_via_drill: number;
    /**
     * Optional copper-to-via clearance override.
     */
    cu2via: number | null;
}

export interface ZoneFill {
    filled?: boolean;
    mode?: ZoneFillMode;
    thermal_gap?: number;
    thermal_bridge_width?: number;
    smoothing?: ZoneFillSmoothing;
    radius?: number;
    island_removal_mode?: ZoneIslandRemovalMode;
    island_area_min?: number;
    hatch_thickness?: number;
    hatch_gap?: number;
    hatch_orientation?: number;
    hatch_smoothing_level?: ZoneFillHatchSmoothingLevel;
    hatch_smoothing_value?: number;
    hatch_border_algorithm?: ZoneHatchBorderAlgorithm;
    hatch_min_hole_area?: number;
    extra?: string[];
}

export type ZoneHatchBorderAlgorithm = "zone_minimum_thickness" | "hatch_thickness";

export type ZoneFillHatchSmoothingLevel = "none" | "fillet" | "arc_minimum" | "arc_maximum";

export type ZoneIslandRemovalMode = "always_remove" | "never_remove" | "minimum_area";

export type ZoneFillSmoothing = "chamfer" | "fillet";

export type ZoneFillMode = "solid" | "hatched";

export type PageLabel = string;

export interface RootPath {
    "": string;
    page?: PageLabel;
}

/**
 * (label \"TEXT\" (at x y r)? (effects ...)? (uuid ...)?)
 */
export interface LocalLabel {
    "": string;
    at: Xyr;
    effects: TextEffects;
    uuid: Uuid;
}

export interface PadNet {
    number: number;
    name: string;
}

/**
 * Classified representation of a board outline.
 *
 * `outer` is the main board boundary and `holes` are interior cutouts.
 */
export interface BoardOutline {
    /**
     * The outer board boundary.
     */
    outer: OutlineLoop;
    /**
     * Interior cutouts/holes.
     */
    holes: OutlineLoop[];
}

/**
 * A closed outline loop, expressed as a sequence of segments.
 */
export interface OutlineLoop {
    /**
     * Segments that form a closed loop in order.
     */
    segments: OutlineSegment[];
}

/**
 * A single primitive used to represent the board outline.
 *
 * Edge.Cuts graphics are normalized into these primitives so that geometric operations (loop
 * building, intersection tests) can be implemented consistently.
 */
export type OutlineSegment = { Line: { start: Xy; end: Xy } } | { Arc: { start: Xy; mid: Xy; end: Xy } };

export interface GraphicAt {
    x: number;
    y: number;
    angle?: number;
}

/**
 * Stage 2 output: compiler-trusted, validated, and normalized (mm) construction.
 */
export interface NormalizedConstruction {
    meta: ConstructionMeta;
    intent: FootprintIntent;
    package: PackageSpec;
    pin_count: number;
    pin_numbering: PinNumberingScheme;
    /**
     * Primary pads associated with `pin_count` / `pin_numbering`.
     */
    pads: NormalizedPadGroup;
    /**
     * Additional pad groups (not included in `pin_count`).
     */
    pad_groups?: NormalizedPadGroup[];
    /**
     * Net-tie pad groups expressed in terms of placed pad keys.
     */
    net_tie_pad_groups?: string[][];
    body_size: Xy;
    /**
     * Offset of the body center relative to the footprint origin.
     *
     * This allows footprints whose mechanical body is not centered on the pad pattern
     * (e.g. THT crystals where the body sits above the pins).
     */
    body_origin_offset: Xy;
    ipc: IpcSpec | null;
    courtyard: CourtyardRule;
    silkscreen: SilkscreenRule;
    solder: SolderRule;
    /**
     * Footprint-level defaults affecting zone connectivity/thermals.
     */
    zone_defaults?: ZoneDefaultsSpec;
    markings: MarkingSpec;
    graphics?: GraphicsIntentSpec;
    zones?: CopperZoneSpec[];
    keepouts?: KeepoutSpec[];
}

export interface NormalizedPadGroup {
    name?: string;
    /**
     * Translation applied after pattern placement (mm).
     */
    offset: Xy;
    /**
     * Rotation applied after pattern placement (deg CCW).
     */
    rotation?: number;
    /**
     * Which side an SMD pad group should be lowered onto.
     */
    layer_side: PadLayerSide;
    /**
     * Optional mirror applied in the group\'s local coordinate system.
     */
    mirror?: MirrorAxis;
    /**
     * Optional mask applied to the pad pattern (e.g. sparse grids).
     */
    mask?: PatternMask;
    /**
     * Uniform per-pad overrides applied to every pad in this group.
     */
    overrides?: PadOverrides;
    /**
     * Optional per-placed-index overrides applied to specific placed pads.
     */
    per_pad_overrides?: PerPadOverride[];
    pad_pattern: PadPatternSpec;
    pad_shape: PadShape;
    pad_size: Xy;
    pad_plating: PadPlating;
    pad_drill: PadDrillSpec | null;
    pad_numbering: PadNumberingRule;
    pad_orientation: PadOrientationRule;
    /**
     * Optional per-pad roles for placed pads.
     */
    pad_roles?: PadRole[];
    special_pads: SpecialPadSpec[];
}

/**
 * (bus (pts ...) (stroke ...) (uuid \"...\"))
 */
export interface Bus {
    pts: Pts;
    stroke: Stroke;
    uuid: Uuid;
}

/**
 * (wire (pts ...) (stroke ...) (uuid \"...\"))
 */
export interface Wire {
    pts: Pts;
    stroke: Stroke;
    uuid: Uuid;
}

export interface TrackSegment {
    start: Xy;
    end: Xy;
    width: number;
    layer: CanonicalLayer;
    locked?: boolean;
    net: number;
    tstamp?: string;
    uuid?: Uuid;
    status?: number;
    extra?: string[];
}

export interface TrackArc {
    start: Xy;
    mid: Xy;
    end: Xy;
    width: number;
    layer: CanonicalLayer;
    locked?: boolean;
    net: number;
    tstamp?: string;
    uuid?: Uuid;
    status?: number;
    extra?: string[];
}

export type PadProperty = string;

export interface FootprintAttributes {
    kind?: FootprintAttrKind;
    board_only?: boolean;
    exclude_from_pos_files?: boolean;
    exclude_from_bom?: boolean;
    allow_missing_courtyard?: boolean;
    dnp?: boolean;
    extra?: string[];
}

export type FootprintAttrKind = string;

export interface Zone {
    net: number;
    net_name?: string;
    layer: CanonicalLayer[];
    uuid?: Uuid;
    name?: string;
    hatch?: ZoneHatch;
    priority?: number;
    connect_pads?: ZoneConnectPads;
    min_thickness: number;
    filled_areas_thickness?: boolean;
    keepout?: ZoneKeepout;
    fill?: ZoneFill;
    polygon: Xy[];
    filled_polygons?: ZoneFilledPolygon[];
    fill_segments?: ZoneFillSegments[];
    extra?: string[];
}

export interface ZoneFillSegments {
    layer: CanonicalLayer[];
    points: Xy[];
    extra?: string[];
}

export interface ZoneFilledPolygon {
    layer: CanonicalLayer[];
    points: Xy[];
    extra?: string[];
}

export interface GraphicRect {
    start: Xy;
    end: Xy;
    layer: CanonicalLayer;
    width: number;
    fill?: boolean;
    uuid: Uuid;
    locked?: boolean;
    tstamp?: string;
    extra?: string[];
}

export interface GraphicPolygon {
    pts: Pts;
    layer: CanonicalLayer;
    width: number;
    fill?: boolean;
    uuid: Uuid;
    locked?: boolean;
    tstamp?: string;
    extra?: string[];
}

export interface GraphicCurve {
    pts: Pts;
    layer: CanonicalLayer;
    width: number;
    uuid: Uuid;
    locked?: boolean;
    tstamp?: string;
    extra?: string[];
}

export interface FootprintProperty {
    name: string;
    value: string;
    at?: GraphicAt;
    layer?: CanonicalLayer;
    unlocked?: boolean;
    hide?: boolean;
    effects?: TextEffects;
    uuid?: Uuid;
}

export interface CustomPadPrimitives {
    graphics?: PadPrimitive[];
    width?: number;
    fill?: boolean;
    extra?: string[];
}

export interface CustomPadOptions {
    clearance?: PadCustomClearance;
    anchor?: PadCustomAnchor;
    extra?: string[];
}

export type PadPrimitive = string;

export type PadCustomAnchor = string;

export type PadCustomClearance = string;

export interface FootprintLine {
    start: Xy;
    end: Xy;
    layer: CanonicalLayer;
    width?: number;
    stroke?: Stroke;
    locked?: boolean;
    tstamp?: string;
    uuid?: Uuid;
    extra?: string[];
}

export interface FootprintCurve {
    pts: Pts;
    layer: CanonicalLayer;
    width?: number;
    stroke?: Stroke;
    locked?: boolean;
    tstamp?: string;
    uuid: Uuid;
    extra?: string[];
}

export interface GraphicText {
    text: string;
    at: GraphicAt;
    layer: CanonicalLayer;
    knockout?: boolean;
    locked?: boolean;
    uuid: Uuid;
    effects: TextEffects;
    tstamp?: string;
    extra?: string[];
}

export type PcbGraphicItem = { kind: "text"; data: GraphicText } | { kind: "line"; data: GraphicLine } | { kind: "rect"; data: GraphicRect } | { kind: "circle"; data: GraphicCircle } | { kind: "arc"; data: GraphicArc } | { kind: "polygon"; data: GraphicPolygon } | { kind: "curve"; data: GraphicCurve };

/**
 * Reference to an existing UUID stored as a bare string in the PCB file.
 */
export type UuidRef = string;

export type ProvenanceSource = { Datasheet: { url: string | null } } | "LlmGenerated" | "HumanEdited";

export interface ProvenanceSpec {
    source: ProvenanceSource;
    notes: string[];
}

export type ViaTenting = "none" | "top" | "bottom" | "both";

export interface ThermalViaSpec {
    drill: number;
    pitch: number;
    /**
     * Optional annular ring (per side) in mm.
     *
     * If omitted, defaults to 0.2mm (matches prior implicit `drill + 0.4` behavior).
     */
    annular_ring?: number;
    /**
     * Optional solder-mask tenting behavior.
     *
     * - `None` means the via has mask openings on both sides (current behavior).
     * - `Some(Top)` removes `F.Mask` from the via pad layers (tented on top).
     * - `Some(Bottom)` removes `B.Mask` from the via pad layers (tented on bottom).
     * - `Some(Both)` removes both `F.Mask` and `B.Mask` (tented on both sides).
     */
    tented?: ViaTenting;
}

export type ExposedPadPasteStrategy = "Solid" | { Windowed: { rows: number; cols: number; gap: number } } | { WindowedPads: { rows: number; cols: number; gap: number } } | "None";

export type SpecialPadKind = "ExposedPad" | "ThermalPad" | "Fiducial";

/**
 * Per-pad override that affects a single placed pad.
 */
export interface PerPadOverride {
    /**
     * Placed-index (0-based) this override applies to.
     */
    index: number;
    shape?: PadShape;
    /**
     * Absolute rotation (degrees CCW) to set on the lowered pad.
     */
    rotation?: number;
    size?: Xy;
    drill?: PadDrillSpec;
    number?: string;
    /**
     * Per-pad supplemental overrides (margins, role, etc.).
     */
    overrides?: PadOverrides;
}

export interface SpecialPadSpec {
    kind: SpecialPadKind;
    size: Xy;
    position: Xy;
    /**
     * Per-pad overrides applied to this special pad (and any deterministically
     * derived pads it lowers into, e.g. exposed-pad thermal vias).
     */
    overrides?: PadOverrides;
    vias?: ThermalViaSpec[];
    paste: ExposedPadPasteStrategy | null;
}

export type Pin1MarkerLayer = "fab" | "silk";

export type BodyCorner = "top_left" | "top_right" | "bottom_left" | "bottom_right";

export type Pin1MarkerAnchor = { body_corner: BodyCorner } | { nearest_pad_body_corner: { pad_id: string } } | { nearest_pad_body_corner_by_key: { pad_key: string } };

export type Pin1MarkerKind = "dot" | "bevel" | "triangle" | "none";

export interface Pin1Marker {
    kind: Pin1MarkerKind;
    anchor: Pin1MarkerAnchor;
    offset: Xy;
    diameter: number;
    layer?: Pin1MarkerLayer;
}

export interface MarkingSpec {
    pin1: Pin1Marker;
    reference: boolean;
    value: boolean;
}

/**
 * Solder rules.
 */
export interface SolderRule {
    mask_expansion: number | null;
    paste_expansion: number | null;
    paste_ratio: number | null;
}

export type SilkscreenOutline = "FullBody" | "Pin1Corner" | "Pin1SideGap" | "Chip" | "Soic" | "DiodeSod123" | "None";

export interface SilkscreenRule {
    clearance: number;
    outline: SilkscreenOutline;
}

export type CourtyardReference = "Body" | "Pads" | "BodyAndPads";

export type CourtyardShape = "Rectangular" | "Rounded";

export interface CourtyardRule {
    clearance: number;
    shape: CourtyardShape;
    reference: CourtyardReference;
}

export type IpcDensity = "L" | "N" | "M";

export interface IpcSpec {
    density: IpcDensity;
    toe: number;
    heel: number;
    side: number;
}

export interface ZoneDefaultsSpec {
    zone_connect?: FootprintZoneConnect;
    thermal_width?: number;
    thermal_gap?: number;
}

export interface RuleSpec {
    ipc: IpcSpec | null;
    courtyard: CourtyardRule;
    silkscreen: SilkscreenRule;
    solder: SolderRule;
    /**
     * Footprint-level defaults that affect zone connectivity and thermal geometry.
     *
     * These map to footprint-level KiCad fields: `zone_connect`, `thermal_width`,
     * and `thermal_gap`.
     */
    zone_defaults?: ZoneDefaultsSpec;
}

/**
 * Body specification (non-electrical).
 */
export interface BodySpec {
    size: Xy;
    height: number | null;
    origin_offset: Xy | null;
}

/**
 * Pad patterns: replaces raw geometry.
 */
export type PadPatternSpec = { Linear: { pitch: number; count: number; axis: Axis; modifiers?: PatternModifier[] } } | { Grid: { pitch_x: number; pitch_y: number; rows: number; cols: number; modifiers?: PatternModifier[] } } | { Perimeter: { body_size: Xy; pads_per_side: [number, number, number, number]; pitch: number; modifiers?: PatternModifier[] } } | { Radial: { radius: number; count: number; modifiers?: PatternModifier[] } };

/**
 * Pad patterns: replaces raw geometry.
 */
export type PatternModifier = { SkipIndices: number[] } | { CustomPitch: { index: number; pitch: number } } | "AnchorPad1" | { Translate: { dx: number; dy: number } } | "FlipX" | "FlipY";

export type PadPlating = "Smd" | "Plated" | "NonPlated";

/**
 * Pad orientation authority (required).
 */
export type PadOrientationRule = "AlongPattern" | "Inward" | "Outward" | { Fixed: number };

/**
 * Pad numbering authority (required).
 */
export type PadNumberingRule = "Sequential" | "PerSide" | { Explicit: string[] } | { PrefixedSequential: { prefix: string } };

/**
 * Minimal drill spec for Construction IR (geometry-free but sufficient to
 * deterministically lower TH/NPTH pads into `IrDrill`).
 */
export type PadDrillSpec = { Circular: { diameter: number; offset?: Xy } } | { Slot: { length: number; width: number; offset?: Xy } };

/**
 * Additional pad group spec.
 *
 * This reuses the same `PadConstructionSpec` schema, but is semantically
 * separate from `pins`/`pads` so footprints can carry non-pin pads (mounting
 * pads, shields, etc.).
 */
export interface PadGroupSpec {
    /**
     * Optional group label for traceability.
     */
    name?: string;
    /**
     * Translation applied to the group\'s local pad positions.
     */
    offset?: Xy;
    /**
     * Rotation (degrees, CCW) applied to the group\'s local pad positions and rotations.
     */
    rotation?: number;
    /**
     * Which side an SMD pad group should be lowered onto.
     *
     * Through-hole and NPTH pads ignore this (they are present on both sides).
     */
    layer_side?: PadLayerSide;
    /**
     * Optional mirror applied in the group\'s local coordinate system.
     */
    mirror?: MirrorAxis;
    /**
     * Uniform per-pad overrides applied to every pad in this group.
     */
    overrides?: PadOverrides;
    pads: PadConstructionSpec;
}

export interface PatternIndex {
    row: number;
    col: number;
}

export type PatternMask = { Omit: PatternIndex[] } | { IncludeOnly: PatternIndex[] };

/**
 * Minimal per-pad override layer for manufacturing-significant KiCad pad fields.
 *
 * Scope constraints (intentional):
 * - Allowed only on `SpecialPadSpec` (per-special-pad)
 * - Allowed only on `PadGroupSpec` (uniformly for that group)
 * - Not supported per-pattern-index yet
 */
export interface PadOverrides {
    roundrect_rratio?: number;
    /**
     * Per-pad solder mask expansion/shrink (mm).
     */
    solder_mask_margin?: number;
    /**
     * Per-pad solder paste expansion/shrink (mm).
     */
    solder_paste_margin?: number;
    /**
     * Per-pad solder paste margin ratio.
     *
     * This maps to KiCad pad `(solder_paste_margin_ratio ...)`.
     */
    solder_paste_ratio?: number;
    solder_paste_margin_ratio?: number;
    clearance?: number;
    zone_connect?: FootprintZoneConnect;
    thermal_width?: number;
    thermal_gap?: number;
    properties?: string[];
    /**
     * Optional semantic role override for this pad.
     *
     * When set, lowering may adjust pad layer presence (e.g. paste-only pads)
     * and related semantics.
     */
    role?: PadRole;
}

/**
 * Pad construction (core): describes how to generate pads without embedding geometry.
 */
export interface PadConstructionSpec {
    pattern: PadPatternSpec;
    /**
     * Optional pattern mask.
     *
     * This is primarily intended for depopulated/sparse grids (e.g. BGAs/LGAs)
     * so we can express holes without enumerating explicit pads.
     */
    mask?: PatternMask;
    shape: PadShape;
    /**
     * Nominal copper size.
     */
    size: Xy;
    plating: PadPlating;
    /**
     * Drill specification for through-hole pads. Required when `plating` is
     * `Plated` or `NonPlated`.
     */
    drill?: PadDrillSpec;
    numbering: PadNumberingRule;
    orientation: PadOrientationRule;
    /**
     * Optional per-pad roles for the *placed* pads in this group.
     *
     * If omitted, roles are implied as:
     * - indices `< pins.count`: `Electrical`
     * - indices `>= pins.count`: `Mechanical`
     *
     * If provided, this vector must have length equal to the placed pad count
     * (after applying `mask`, if any). For now, `Electrical` pads are required
     * to occupy the first `pins.count` indices.
     */
    pad_roles?: PadRole[];
    special_pads?: SpecialPadSpec[];
    /**
     * Optional per-pattern-index overrides applied to individual placed pads.
     *
     * Each entry\'s `index` is the placed-index after applying the pattern and mask
     * (0-based). This allows Construction IR to express exceptions for specific pads
     * (shape, rotation, size, drill, etc.) without requiring separate pad groups.
     */
    per_pad_overrides?: PerPadOverride[];
}

export type PinNumberingScheme = "CounterClockwise" | "Clockwise" | "LeftToRight" | { Datasheet: string };

/**
 * Pin specification: logical pins, not pads.
 */
export interface PinSpec {
    /**
     * Number of electrical pins.
     *
     * This corresponds to the number of *electrical* pads in the primary pad group.
     * The primary pad pattern may generate additional non-pin pads (mechanical,
     * paste/mask-only, etc.) beyond this count.
     */
    count: number;
    numbering?: PinNumberingScheme;
}

/**
 * Pad semantic role.
 *
 * This is a semantic hint used during lowering to determine how a pad should
 * participate in pin semantics and/or layer presence (e.g. paste-only pads).
 *
 * Notes:
 * - Electrical pins are represented by the first `pins.count` primary pads.
 *   Primary pads beyond that count are considered non-pin pads.
 * - `PadOverrides.role` can be used on special pads and pad-groups to express
 *   manufacturing-intent (e.g. paste-only islands).
 */
export type PadRole = "electrical" | "mechanical" | "paste_only" | "mask_only" | "fiducial";

export type FootprintIntent = "SmdIpc" | "ThtConnector" | "Mechanical" | "TestPoint" | "Fiducial";

export interface PackageSpec {
    /**
     * e.g. \"QFN\", \"SOT\", \"DIP\
     */
    family: string;
    /**
     * e.g. \"EP\", \"Thermal\
     */
    variant: string | null;
}

/**
 * Metadata (important for traceability).
 */
export interface ConstructionMeta {
    /**
     * e.g. \"QFN-32-5x5\
     */
    name: string;
    /**
     * e.g. \"IPC-7351B\
     */
    standard: string | null;
    /**
     * Normalize to `Unit::Mm` internally.
     */
    units: Unit;
}

/**
 * Keepout feature mask.
 *
 * Note: this maps to KiCad zone keepout semantics (tracks/vias/pads/copperpour/footprints).
 */
export interface KeepoutFeatures {
    copper: boolean;
    tracks: boolean;
    vias: boolean;
    pads: boolean;
    footprints: boolean;
}

export interface KeepoutSpec {
    shape: ZoneShapeSpec;
    prohibit: KeepoutFeatures;
    /**
     * Minimum thickness for keepout boundary.
     */
    min_thickness?: number;
}

export interface ThermalReliefSpec {
    spoke_width: number;
    spoke_count: number;
    air_gap: number;
}

/**
 * Optional mirroring applied in the pad group\'s local coordinate system.
 */
export type MirrorAxis = "x" | "y";

/**
 * Which side of the board an SMD pad group lands on.
 */
export type PadLayerSide = "front" | "back";

export type ZoneShapeSpec = "body_outline" | { pad_bounding_box: { pad_ids: string[]; margin: number } } | { pad_bounding_box_by_key: { pad_keys: string[]; margin: number } } | { all_pads_bounding_box: { margin: number } } | { pad_group_bounding_box: { group_name: string; margin: number } } | { rect: { size: Xy; offset: Xy } } | { polygon: { points: Xy[] } };

export type CopperLayerScope = "f_cu" | "b_cu" | { inner: number[] } | "all_copper";

export type ZoneConnectMode = "full" | "thru_hole_only" | "no";

/**
 * Explicit pad-connection semantics for a zone.
 *
 * This maps to KiCad zone `(connect_pads (clearance ...) (mode ...))`.
 */
export interface ZoneConnectPadsSpec {
    connection: ZoneConnectMode;
    /**
     * Optional override for the zone\'s pad clearance.
     * If omitted, `CopperZoneSpec.clearance` is used.
     */
    clearance?: number;
}

export interface CopperZoneSpec {
    layer: CopperLayerScope;
    shape: ZoneShapeSpec;
    /**
     * Clearance relative to pads/tracks.
     */
    clearance: number;
    /**
     * Optional net name tie.
     */
    net?: string;
    /**
     * Optional thermal relief intent.
     */
    thermal?: ThermalReliefSpec;
    /**
     * Optional explicit pad-connection mode for this zone.
     *
     * If omitted, lowering defaults to `full` connectivity with the zone\'s
     * `clearance`.
     */
    connect_pads?: ZoneConnectPadsSpec;
    /**
     * Minimum copper thickness for zone fill.
     */
    min_thickness?: number;
}

/**
 * Explicit non-text graphics primitives for Construction IR.
 *
 * Coordinates are footprint-local (mm after normalization).
 */
export type GraphicPrimitiveSpec = { kind: "line"; start: Xy; end: Xy; layer: CanonicalLayer; stroke_width?: number } | { kind: "arc"; start: Xy; mid: Xy; end: Xy; layer: CanonicalLayer; stroke_width?: number } | { kind: "rect"; start: Xy; end: Xy; layer: CanonicalLayer; stroke_width?: number; fill?: boolean } | { kind: "circle"; center: Xy; radius: number; layer: CanonicalLayer; stroke_width?: number } | { kind: "polygon"; points: Xy[]; layer: CanonicalLayer; stroke_width?: number; fill?: boolean } | { kind: "curve"; points: Xy[]; layer: CanonicalLayer; stroke_width?: number } | { kind: "dimension"; dimension: IrDimension };

export interface GraphicsIntentSpec {
    body_outline?: BodyOutlineIntent;
    assembly_marks?: AssemblyMarkIntent[];
    /**
     * Additional explicit non-text graphics primitives.
     *
     * Purpose: allow Construction IR to express non-rect geometry intent (arcs, circles,
     * polygons, etc.) without embedding a full authoring-IR footprint.
     *
     * Notes:
     * - Text primitives are intentionally excluded here (signature checks allow text to differ).
     * - Lowering will apply deterministic default strokes per layer when `stroke_width` is None.
     */
    primitives?: GraphicPrimitiveSpec[];
    /**
     * Optional exact courtyard outline override.
     *
     * When present (and non-empty), lowering will use this outline verbatim as the
     * footprint courtyard, instead of generating one from `rules.courtyard`.
     *
     * Intended primarily for strict signature tests that must match existing KiCad
     * library courtyard geometries.
     */
    courtyard_override?: GraphicPrimitiveSpec[];
}

/**
 * Assembly guidance marks intended primarily for the fabrication layer.
 *
 * These are semantic intents; lowering derives specific primitives.
 */
export type AssemblyMarkIntent = { kind: "notch"; side: BodySide; width: number; depth: number } | { kind: "chamfer"; corner: BodyCorner; size: number } | { kind: "polarity_bar"; side: BodySide; length: number };

/**
 * Intent for whether to emit a body outline on human-facing layers.
 *
 * This does not encode geometry; lowering chooses an outline style (e.g. rect, chamfered)
 * based on other semantics and rules.
 */
export type BodyOutlineIntent = "none" | "fab" | "silk" | "fab_and_silk";

/**
 * Which side of the body an assembly/outline feature belongs to.
 */
export type BodySide = "top" | "right" | "bottom" | "left";

/**
 * Construction IR: a semantic, LLM-friendly representation used for
 * reasoning and generation. It is intentionally incomplete and
 * distinct from the Geometric/Authoring IR (`IrFootprint`).
 *
 * Important: This layer represents intent and is intentionally
 * one-way. The primary operation is to compile Construction IR into
 * the Geometric IR (`IrFootprint`) for generation. It is not
 * reversible: semantic intent cannot be reliably inferred from a
 * finalized geometric artifact. The `from_ir` helper below is a
 * lossy extractor that attempts to glean semantic hints from an
 * existing `IrFootprint`, but it does not (and must not) guarantee
 * that `compile_to_ir(from_ir(x)) == x`.
 * Construction IR (Authoritative): a semantic, LLM-friendly representation used for
 * reasoning and generation.
 *
 * - Captures intent, rules, and design constraints.
 * - Designed to compile deterministically into geometric IR (`IrFootprint`).
 * - Does not store raw geometry.
 */
export interface ConstructionFootprint {
    meta: ConstructionMeta;
    intent: FootprintIntent;
    package: PackageSpec;
    pins: PinSpec;
    /**
     * Primary pad group (the one associated with `pins`).
     */
    pads: PadConstructionSpec;
    /**
     * Additional pad groups (e.g., mounting pads, shield tabs, mech pads).
     *
     * Notes / current constraints:
     * - These pads are **not** counted in `pins.count`.
     * - To avoid accidental collisions with primary pin pads, additional groups
     *   must use `PadNumberingRule::Explicit`.
     * - For now, additional groups must not define `special_pads` (those remain
     *   exclusive to the primary group).
     */
    pad_groups?: PadGroupSpec[];
    /**
     * Net-tie pad groups.
     *
     * Each inner vector is a group of pad *keys* that should be treated as a
     * net-tie group in the generated KiCad footprint.
     *
     * Notes:
     * - Keys must correspond to placed pads (e.g. \"primary:0\", \"pad_groups[0]:3\").
     * - Keys must resolve to pads with non-empty pad IDs during lowering.
     */
    net_tie_pad_groups?: string[][];
    body: BodySpec;
    rules: RuleSpec;
    markings: MarkingSpec;
    /**
     * Optional, intentful graphics guidance for human-facing footprint layers.
     *
     * This is intentionally a small, closed set of semantic intents (not freeform geometry)
     * so Construction IR remains deterministic and learnable.
     */
    graphics?: GraphicsIntentSpec;
    /**
     * Copper zones (pours) associated with this footprint.
     */
    zones?: CopperZoneSpec[];
    /**
     * Keepout areas associated with this footprint.
     */
    keepouts?: KeepoutSpec[];
    provenance?: ProvenanceSpec;
}

/**
 * A single DRC issue.
 *
 * Consumers can use:
 * - [`DRCIssue::code`] for stable classification,
 * - [`DRCIssue::message`] for human-readable output,
 * - [`DRCIssue::objects`] and [`DRCIssue::point`] to attach issues to geometry.
 */
export interface DRCIssue {
    /**
     * Unique identifier for this issue instance.
     */
    id: Uuid;
    /**
     * Machine-readable issue code.
     */
    code: DRCCode;
    /**
     * Severity level.
     */
    severity: DRCSeverity;
    /**
     * Human-readable message describing the issue.
     */
    message: string;
    /**
     * Board objects implicated in this issue.
     */
    objects: BoardObjectRef[];
    /**
     * Optional layer context.
     */
    layer: CanonicalLayer | null;
    /**
     * Representative point for UI highlighting and debugging.
     */
    point: Xy;
    /**
     * Measured value (in millimeters) when applicable.
     */
    measured: number | null;
    /**
     * Required value (in millimeters) when applicable.
     */
    required: number | null;
}

/**
 * Reference to a PCB object implicated in a DRC issue.
 *
 * `id` is optional because some issue types refer to derived geometry (e.g. an outline segment)
 * rather than a concrete UUID-backed board object.
 */
export interface BoardObjectRef {
    /**
     * UUID of the referenced object when available.
     */
    id: Uuid | null;
    /**
     * Kind of the referenced object.
     */
    kind: BoardObjectKind;
}

/**
 * Severity level for a DRC issue.
 */
export type DRCSeverity = "Error" | "Warning" | "Info";

/**
 * Stable identifier for the type of DRC issue.
 *
 * Codes are intended to be machine-readable and stable across versions.
 * The human-readable [`DRCIssue::message`] can change without breaking consumers.
 */
export type DRCCode = "TrackTooNarrow" | "ViaDrillTooSmall" | "ClearanceViolation" | "CopperTooCloseToEdge" | "AnnularRingTooSmall" | "ViaTooSmall" | "BoardOutlineNotClosed" | "BoardOutlineSelfIntersecting" | "MultipleBoardOutlines" | "InvalidCutoutNesting" | "BoardOutlineMissing" | "IsolatedBoardIsland";

/**
 * A coarse classification of PCB objects referenced by a DRC issue.
 *
 * This is intended for UI/consumers to group issues and attach them to board objects.
 */
export type BoardObjectKind = "Track" | "Via" | "Pad" | "Zone" | "BoardEdge";

export interface DrillExportOptions {
    units: DrillUnits;
    format: DrillFormat;
    /**
     * If true, include micro/blind vias as drill hits too (v1: still a single file).
     */
    include_non_through_vias: boolean;
    /**
     * If true, also include circular internal Edge.Cuts holes as NPTH drill hits.
     *
     * This is a heuristic meant to cover boards that represent mounting holes as
     * internal Edge.Cuts circles rather than NPTH pads.
     */
    include_edge_cuts_circular_holes_as_npth: boolean;
    /**
     * If true, also include slotted internal Edge.Cuts cutouts (capsule/oval) as NPTH
     * Excellon slots (G85).
     *
     * This is a heuristic and intentionally conservative to avoid misclassifying
     * arbitrary cutouts as drill slots.
     */
    include_edge_cuts_slots_as_npth: boolean;
}

/**
 * Output-level polarity intent (helps keep config readable).
 */
export type GerberLayerPolarityPreset = "Dark" | "Clear";

/**
 * High-level layer mapping from `Pcb` content to a Gerber layer.
 */
export type GerberLayerPreset = "CopperTop" | { CopperInner: number } | "CopperBottom" | "SolderMaskTop" | "SolderMaskBottom" | "SilkTop" | "SilkBottom" | "PasteTop" | "PasteBottom" | "EdgeCuts";

/**
 * A requested output layer.
 */
export interface GerberLayerSpec {
    name: string;
    preset: GerberLayerPreset;
    polarity: GerberLayerPolarityPreset;
}

/**
 * Configuration for converting a `Pcb` into Gerber (RS-274X) layers.
 */
export interface GerberExportOptions {
    units: Units;
    coordinate_format: CoordinateFormat;
    /**
     * Which layers to generate and in what order.
     */
    layers: GerberLayerSpec[];
    /**
     * If true, include common X2 file attributes (TF.*) where possible.
     */
    include_x2_attributes: boolean;
}

export interface TrackVia {
    via_type?: ViaType;
    at: Xy;
    size: number;
    drill: number;
    layers: string[];
    locked?: boolean;
    remove_unused_layers?: boolean;
    keep_end_layers?: boolean;
    free?: boolean;
    net: number;
    tstamp?: string;
    uuid?: Uuid;
    status?: number;
    extra?: string[];
}

export type ViaType = string;

/**
 * Definition of a single net entry within the `(net ...)` section.
 */
export interface Net {
    ordinal: number;
    name: string;
}

export interface IrFootprint {
    name?: string;
    description?: string;
    attributes?: FootprintAttributes;
    /**
     * The coordinate origin for the IR footprint. All primitive and pad
     * coordinates in this `IrFootprint` are expressed relative to this
     * `origin` (footprint-local coordinates). When reconstructing a
     * `Footprint` the origin is written back into the `(at x y [angle])`
     * form. Units for coordinates are given by `units`.
     */
    origin: Xy;
    rotation?: number;
    units: Unit;
    uuid?: Uuid;
    layer: CanonicalLayer;
    mirrored?: boolean;
    properties?: FootprintProperty[];
    private_layers?: CanonicalLayer[];
    net_tie_pad_groups?: string[][];
    pads?: IrPad[];
    primitives?: IrPrimitive[];
    zones?: IrZone[];
    courtyard?: IrCourtyard[];
    pad_specs?: PadSpec[];
    /**
     * Optional semantic IR: intent-level annotations useful for LLMs and
     * intent-driven generators. This is intentionally lightweight and
     * may refer to primitives/pads by index or id rather than embedding
     * duplicate geometry.
     */
    semantic_primitives?: SemanticPrimitive[];
    intent?: FootprintIntent;
    pad_pattern?: IrPadPattern;
    solder_mask_margin?: number;
    solder_paste_margin?: number;
    solder_paste_ratio?: number;
    clearance?: number;
    zone_connect?: FootprintZoneConnect;
    thermal_width?: number;
    thermal_gap?: number;
}

export type Axis = "X" | "Y";

export type SemanticPrimitive = { role_assignment: { primitive_index: number; role: PrimitiveRole } } | { pad_intent_assignment: { pad_id: string; intent: PadIntent } } | { courtyard_intent_assignment: { layer: CanonicalLayer; intent: CourtyardIntent } } | { footprint_intent_assignment: { intent: FootprintIntent } } | { note: { text: string } };

export interface SemanticFootprint {
    footprint_type: FootprintIntent;
    package_family?: string;
    pin_count: number;
    pad_pattern: IrPadPattern;
    body?: BodySpec;
    markings?: MarkingSpec[];
    tolerances?: ToleranceSpec;
}

export interface ToleranceSpec {
    courtyard_clearance?: number;
    silkscreen_clearance?: number;
}

export interface MarkingSpec {
    text: string;
    relative_position?: Xy;
}

export interface BodySpec {
    shape?: string;
    size?: Xy;
    origin_offset?: Xy;
}

export type PadSource = "generated" | "explicit";

export interface PadSpec {
    count: number;
    pitch?: number;
    orientation: Axis;
    pad_shape: PadShape;
    pad_size: Xy;
    numbering?: NumberingScheme;
    layers?: CanonicalLayer[];
    properties?: PadProperty[];
    source?: PadSource;
}

export type NumberingScheme = "sequential" | "index_based" | { custom: string };

export type PolygonRole = "solid" | "hole" | "union" | "subtract" | "unknown";

export type PolygonWinding = "clockwise" | "counter_clockwise" | "unknown";

export type CourtyardIntent = "default" | "keepout";

export type PadIntent = "signal" | "test_point" | "fiducial" | "mechanical" | "exposed_pad" | "thermal_pad";

export type PrimitiveRole = "outline" | "courtyard" | "assembly" | "silkscreen" | "fabrication" | "decorative";

export type IrPadPattern = { Linear: { pitch: number; count: number; axis: Axis } } | { Grid: { pitch_x: number; pitch_y: number; rows: number; cols: number } } | { Radial: { radius: number; count: number } } | "Free";

export type FootprintIntent = "SmdIpc" | "ThtConnector" | "TestPoint" | "Fiducial" | "Mechanical" | "Unknown";

export type IrDimensionPrecision = "Digits0" | "Digits1" | "Digits2" | "Digits3" | "Digits4" | "Digits5" | "ScaledHundredths" | "ScaledThousandths" | "ScaledTenThousandths" | "ScaledHundredThousandths";

export type IrDimensionUnitsFormat = "None" | "Bare" | "Parentheses";

export type IrDimensionUnits = "Inches" | "Mils" | "Millimeters" | "Automatic";

export type IrDimensionTextFrame = "none" | "rectangle" | "circle";

export type IrDimensionArrowDirection = "inward" | "outward";

export type IrDimensionTextPositionMode = "inside" | "outside";

export type IrDimensionType = "aligned" | "orthogonal" | "radial" | "leader" | { unknown: string };

export interface IrDimension {
    dimension_type: IrDimensionType;
    layer: CanonicalLayer;
    uuid?: Uuid;
    pts: Xy[];
    height?: number;
    orientation?: number;
    leader_length?: number;
    gr_text_at?: Xy;
    gr_text_angle?: number;
    gr_text_uuid?: Uuid;
    gr_text?: string;
    format_prefix?: string;
    format_suffix?: string;
    format_units_code?: number;
    format_units?: IrDimensionUnits;
    format_units_format?: IrDimensionUnitsFormat;
    format_precision?: IrDimensionPrecision;
    format_override_value?: string;
    format_suppress_zeros?: boolean;
    style_thickness: number;
    style_arrow_length: number;
    style_text_position_mode: IrDimensionTextPositionMode;
    style_arrow_direction?: IrDimensionArrowDirection;
    style_extension_height?: number;
    style_text_frame?: IrDimensionTextFrame;
    style_extension_offset?: number;
    style_keep_text_aligned?: boolean;
    extra?: string[];
}

export interface IrZoneConnectPads {
    connection?: IrZoneConnectPadsConnection;
    clearance: number;
    extra?: string[];
}

export type IrZoneConnectPadsConnection = "thru_hole_only" | "full" | "no";

export interface IrZoneKeepout {
    tracks?: IrZoneKeepoutSetting;
    vias?: IrZoneKeepoutSetting;
    pads?: IrZoneKeepoutSetting;
    copperpour?: IrZoneKeepoutSetting;
    footprints?: IrZoneKeepoutSetting;
    extra?: string[];
}

export type IrZoneKeepoutSetting = "allowed" | "not_allowed";

export interface IrZone {
    net: number;
    net_name?: string;
    layers: CanonicalLayer[];
    uuid?: Uuid;
    name?: string;
    hatch?: ZoneHatch;
    priority?: number;
    min_thickness: number;
    filled_areas_thickness?: boolean;
    fill?: ZoneFill;
    polygon: Xy[];
    filled_polygons?: ZoneFilledPolygon[];
    fill_segments?: ZoneFillSegments[];
    extra?: string[];
    connect_pads?: IrZoneConnectPads;
    keepout?: IrZoneKeepout;
    thermal_gap?: number;
    thermal_width?: number;
}

export interface IrCourtyard {
    layer: CanonicalLayer;
    outline: IrPrimitive[];
}

export interface IrRegion {
    outline: IrPrimitive[];
    layer: CanonicalLayer;
}

export type CoordSpace = "footprint_local" | { pad_local: { pad_id: string } };

export type IrPadPrimitive = { Line: { start: Xy; end: Xy; layer: CanonicalLayer; coord_space: CoordSpace; width?: number; stroke?: Stroke } } | { Rect: { start: Xy; end: Xy; layer: CanonicalLayer; coord_space: CoordSpace; width?: number; stroke?: Stroke; fill?: boolean } } | { Circle: { center: Xy; radius: number; layer: CanonicalLayer; coord_space: CoordSpace; stroke?: Stroke } } | { Arc: { start: Xy; mid: Xy; end: Xy; layer: CanonicalLayer; coord_space: CoordSpace; width?: number; stroke?: Stroke } } | { Polygon: { points: Xy[]; layer: CanonicalLayer; coord_space: CoordSpace; width?: number; stroke?: Stroke; winding?: PolygonWinding; role?: PolygonRole; fill?: boolean } } | { Curve: { points: Xy[]; layer: CanonicalLayer; coord_space: CoordSpace; stroke?: Stroke } } | { Text: { kind: FootprintTextKind; text: string; at: Xy; angle?: number; layer: CanonicalLayer; coord_space: CoordSpace; hide?: boolean; effects?: TextEffects } };

export type IrPrimitive = { Line: { start: Xy; end: Xy; layer: CanonicalLayer; width?: number; stroke?: Stroke } } | { Rect: { start: Xy; end: Xy; layer: CanonicalLayer; width?: number; stroke?: Stroke; fill?: boolean } } | { Circle: { center: Xy; radius: number; layer: CanonicalLayer; stroke?: Stroke } } | { Arc: { start: Xy; mid: Xy; end: Xy; layer: CanonicalLayer; width?: number; stroke?: Stroke } } | { Polygon: { points: Xy[]; layer: CanonicalLayer; width?: number; stroke?: Stroke; winding?: PolygonWinding; role?: PolygonRole; fill?: boolean } } | { Curve: { points: Xy[]; layer: CanonicalLayer; stroke?: Stroke } } | { Text: { kind: FootprintTextKind; text: string; at: Xy; angle?: number; layer: CanonicalLayer; hide?: boolean; effects?: TextEffects } } | { Dimension: { dimension: IrDimension } };

export interface IrDrill {
    kind: DrillKind;
    diameter?: number;
    slot?: [number, number];
    offset?: Xy;
    inferred?: boolean;
}

export type DrillKind = "circular" | "slot" | "polygon" | { unknown: string };

export interface IrPad {
    id: string;
    pad_type: PadType;
    shape: PadShape;
    position: Xy;
    locked?: boolean;
    size: Xy;
    drill?: IrDrill;
    rotation?: number;
    layers?: CanonicalLayer[];
    raw_layers?: string[];
    net?: PadNet;
    properties?: PadProperty[];
    tstamp?: string;
    uuid?: Uuid;
    roundrect_rratio?: number;
    chamfer_ratio?: number;
    chamfer?: PadChamferCorner[];
    remove_unused_layers?: boolean;
    keep_end_layers?: boolean;
    die_length?: number;
    solder_mask_margin?: number;
    solder_paste_margin?: number;
    solder_paste_margin_ratio?: number;
    clearance?: number;
    zone_connect?: FootprintZoneConnect;
    thermal_width?: number;
    thermal_gap?: number;
    custom_options?: string[];
    custom_primitives?: IrPadPrimitive[];
    extra?: string[];
}

/**
 * Units for the IR. KiCad uses millimetres internally; keep explicit.
 */
export type Unit = "mm" | "inch";

export interface FootprintModelRotation {
    x: number;
    y: number;
    z: number;
}

export interface FootprintModelScale {
    x: number;
    y: number;
    z: number;
}

export interface FootprintModelTranslation {
    x: number;
    y: number;
    z: number;
}

export interface FootprintModel {
    path: string;
    translation?: FootprintModelTranslation;
    scale?: FootprintModelScale;
    rotation?: FootprintModelRotation;
    extra?: string[];
}

export interface FootprintRect {
    start: Xy;
    end: Xy;
    layer: CanonicalLayer;
    width?: number;
    stroke?: Stroke;
    fill?: boolean;
    locked?: boolean;
    tstamp?: string;
    uuid?: Uuid;
    extra?: string[];
}

export interface ZoneConnectPads {
    connection?: ZoneConnectPadsConnection;
    clearance: number;
    extra?: string[];
}

export type ZoneConnectPadsConnection = "thru_hole_only" | "full" | "no";

export interface SymbolProperty {
    key: string;
    value: string;
    /**
     * optional id: (id N)
     */
    id?: number;
    /**
     * optional position/placement: (at x y r)
     */
    at?: Xyr;
    /**
     * optional text effects: (effects ...)
     */
    effects?: TextEffects;
}

export interface LibSymbols {
    /**
     * Zero or more symbol definitions
     */
    symbol?: Symbol[];
}

/**
 * Name/Number text plus effects: (name \"NAME\" TEXT_EFFECTS)
 */
export interface PinText {
    "": string;
    effects?: TextEffects;
}

/**
 * (pin PIN_ELECTRICAL_TYPE PIN_GRAPHIC_STYLE POSITION_IDENTIFIER
 *      (length LENGTH)?
 *      (name \"NAME\" TEXT_EFFECTS)?
 *      (number \"NUMBER\" TEXT_EFFECTS)?
 * )
 */
export interface Pin {
    /**
     * electrical type: input/output/...
     */
    electrical_type: PinElectricalType;
    /**
     * graphical style: line/inverted/...
     */
    graphic_style: PinGraphicStyle;
    /**
     * position & rotation of the pin connection point
     */
    at: Xyr;
    /**
     * optional length
     */
    length?: number;
    /**
     * optional name shown near pin
     */
    name?: PinText;
    /**
     * optional number
     */
    number?: PinText;
    /**
     * optional unique uuid per-pin (some KiCad usages)
     */
    uuid?: Uuid;
}

/**
 * Pin graphical styles (a subset; extend as needed)
 */
export type PinGraphicStyle = "line" | "inverted" | "clock" | "inverted_clock" | "input_low" | "clock_low" | "output_low" | "edge_clock_high" | "non_logic";

/**
 * Pin electrical types (KiCad list)
 */
export type PinElectricalType = "input" | "output" | "bidirectional" | "tri_state" | "passive" | "free" | "unspecified" | "power_in" | "power_out" | "open_collector" | "open_emitter" | "no_connect";

/**
 * (text \"TEXT\" POSITION_IDENTIFIER (effects TEXT_EFFECTS))
 */
export interface SymbolText {
    /**
     * positional text immediately after head
     */
    "": string;
    at: Xyr;
    effects?: TextEffects;
}

/**
 * (rectangle (start X Y) (end X Y) STROKE_DEF FILL_DEF)
 */
export interface Rectangle {
    start: Xy;
    end: Xy;
    stroke?: Stroke;
    fill?: Fill;
}

/**
 * (polyline COORDINATE_POINT_LIST STROKE_DEF FILL_DEF)
 */
export interface PolylineGraphic {
    pts: Pts;
    stroke?: Stroke;
    fill?: Fill;
}

/**
 * (bezier <4 points> STROKE_DEF FILL_DEF)
 */
export interface Bezier {
    /**
     * list of control points, typically 4 per curve
     */
    pts?: Xy[];
    stroke?: Stroke;
    fill?: Fill;
}

/**
 * (circle (center X Y) (radius R) STROKE_DEF FILL_DEF)
 */
export interface Circle {
    center: Xy;
    radius: number;
    stroke?: Stroke;
    fill?: Fill;
}

/**
 * (arc (start X Y) (mid X Y) (end X Y) STROKE_DEFINITION FILL_DEFINITION)
 */
export interface Arc {
    start: Xy;
    mid: Xy;
    end: Xy;
    stroke?: Stroke;
    fill?: Fill;
}

/**
 * A single graphic primitive used in a symbol drawing.
 */
export type GraphicItem = { kind: "Arc"; data: Arc } | { kind: "Circle"; data: Circle } | { kind: "Bezier"; data: Bezier } | { kind: "Polyline"; data: PolylineGraphic } | { kind: "Rectangle"; data: Rectangle } | { kind: "Text"; data: SymbolText };

/**
 * Unit/body encoded as a nested `(symbol ...)` inside a parent library symbol.
 */
export interface SymbolUnit {
    /**
     * Unit ID (string)
     */
    id: string;
    /**
     * unit-specific name for UI
     */
    unit_name?: string;
    /**
     * The unit has its own graphics/pins etc.
     */
    graphics?: GraphicItem[];
    pin?: Pin[];
}

/**
 * Top-level (symbol ...) token.
 *
 * KiCad allows either a top-level library symbol (LIBRARY_ID) or a unit (UNIT_ID)
 * inside a parent symbol. We model the shared fields here; for units you can set
 * `unit_name` and use `is_unit = true` (or embed in a parent symbol).
 */
export interface Symbol {
    /**
     * Library ID or unit ID string (first quoted string after the symbol head).
     */
    id: string;
    /**
     * Optional extends: `(extends \"LIBRARY_ID\")`
     */
    extends?: string;
    /**
     * Optional global visibility settings; KiCad grammar offers `pin_numbers hide`
     * and `pin_names ... hide`.  The exact representation is flexible; we expose:
     * - `pin_numbers_hidden: Option<bool>` — if Some(true) then pin numbers hidden.
     * - `pin_names_hidden: Option<bool>` — if Some(true) then pin names hidden.
     * - `pin_names_offset: Option<f64>` — optional offset (mm) for pin names.
     */
    pin_numbers_hidden?: boolean;
    pin_names_hidden?: boolean;
    pin_names_offset?: number;
    /**
     * Include in BOM? (yes/no)
     */
    in_bom?: boolean;
    /**
     * Export to PCB? (yes/no)
     */
    on_board?: boolean;
    /**
     * Symbol properties (Reference / Value / Footprint / Datasheet are *expected* for parent symbols).
     */
    property?: SymbolProperty[];
    /**
     * Graphical items (arc/circle/bezier/polyline/rectangle/text/etc.)
     */
    graphic?: GraphicItem[];
    /**
     * Pins (may be empty)
     */
    pin?: Pin[];
    /**
     * Child units embedded in a parent symbol (KiCad encodes these as nested `symbol` tokens)
     */
    unit?: SymbolUnit[];
    /**
     * Optional display name of a unit: `(unit_name \"UNIT_NAME\")`
     */
    unit_name?: string;
}

export type ErcRuleConfig = Record<ErcIssueCode, ErcRuleConfigEntry>;

export interface ErcRuleConfigEntry {
    enabled: boolean;
    severity_override: ErcSeverity | null;
}

export interface ErcReport {
    issues: ErcIssue[];
}

export interface ErcIssue {
    code: ErcIssueCode;
    severity: ErcSeverity;
    message: string;
    net_id: string | null;
    net_name: string | null;
    pins: PinInstance[];
    location_hints: LocationInfo[];
}

export type ErcIssueCode = "UNCONNECTED_PIN" | "UNCONNECTED_NET" | "PIN_TYPE_CONFLICT" | "SHORTED_POWER_OUTPUTS" | "POWER_INPUT_NOT_DRIVEN" | "INPUT_NOT_DRIVEN" | "MULTIPLE_NET_LABELS" | "NC_PIN_CONNECTED" | "GLOBAL_LABEL_UNUSED" | "OTHER";

export type ErcSeverity = "ERROR" | "WARNING" | "INFO";

export interface SchematicModel {
    nets: NetInfo[];
}

export interface NetInfo {
    id: string;
    name: string | null;
    pins: PinInstance[];
    labels: string[];
}

export interface PinInstance {
    id: string;
    ref: string;
    pin_number: string;
    type: PinType;
    net_id: string | null;
    has_no_connect_flag: boolean;
    is_power_flag: boolean;
    location: LocationInfo;
}

export interface LocationInfo {
    sheet: string | null;
    x: number;
    y: number;
}

export type PinType = "INPUT" | "OUTPUT" | "BIDIR" | "PASSIVE" | "TRISTATE" | "POWER_IN" | "POWER_OUT" | "OPEN_COLLECTOR" | "OPEN_DRAIN" | "NC";

/**
 * Inside (instances …): (path \"/<uuid>/…\") and optional (page \"…\")
 */
export interface SheetPath {
    path: string;
    page?: string | null;
}

export interface SheetProject {
    project: string;
    path?: SheetPath[];
}

/**
 * (property \"Name\" \"Value\" (at x y r)? ...)
 * (instances (project \"X\" (path \"/...uuid\") (page \"2\")? )+ )+
 */
export interface SheetInstances {
    project?: SheetProject[];
}

/**
 * (pin \"NAME\" (shape input|output|...) (at x y r)? ...)
 */
export interface SheetPin {
    name: string;
    shape: LabelPinShape;
    at?: Xyr | null;
    uuid?: Uuid | null;
    effects?: TextEffects | null;
}

/**
 * (sheet ...)
 */
export interface Sheet {
    /**
     * (at x y r) — placement of the sheet symbol in parent
     */
    at: Xyr;
    /**
     * (size w h) — size of the sheet rectangle
     */
    size: Xy;
    exclude_from_sim?: boolean | null;
    in_bom?: boolean | null;
    on_board?: boolean | null;
    dnp?: boolean | null;
    fields_autoplaced?: boolean | null;
    /**
     * Unique sheet UUID
     */
    uuid?: Uuid | null;
    /**
     * Required KiCad properties (at least \"Sheet name\" and \"Sheet file\").
     */
    property?: Property[];
    /**
     * Visible pins on the sheet symbol
     */
    pin?: SheetPin[];
    /**
     * Instance bookkeeping for this placement
     */
    instances?: SheetInstances | null;
    stroke?: Stroke | null;
    fill?: Fill | null;
}

export interface FootprintTextBox {
    locked?: boolean;
    text: string;
    start?: Xy;
    end?: Xy;
    pts?: Pts;
    angle?: number;
    layer: CanonicalLayer;
    uuid: Uuid;
    effects: TextEffects;
    stroke?: Stroke;
    render_cache?: string;
    extra?: string[];
}

export interface FootprintPolygon {
    pts: Pts;
    layer: CanonicalLayer;
    width?: number;
    stroke?: Stroke;
    fill?: boolean;
    locked?: boolean;
    tstamp?: string;
    uuid: Uuid;
    extra?: string[];
}

export interface FootprintDimension {
    locked?: boolean;
    dimension_type: FootprintDimensionType;
    layer: CanonicalLayer;
    uuid: Uuid;
    pts: Pts;
    height?: number;
    orientation?: number;
    leader_length?: number;
    gr_text?: GraphicText;
    format?: DimensionFormat;
    style: DimensionStyle;
    extra?: string[];
}

export interface DimensionStyle {
    thickness: number;
    arrow_length: number;
    text_position_mode: DimensionTextPositionMode;
    arrow_direction?: DimensionArrowDirection;
    extension_height?: number;
    text_frame?: DimensionTextFrame;
    extension_offset?: number;
    keep_text_aligned?: boolean;
    extra?: string[];
}

export type DimensionTextFrame = "none" | "rectangle" | "circle" | "rounded_rectangle";

export type DimensionArrowDirection = "outward" | "inward";

export type DimensionTextPositionMode = "outside" | "inline" | "manual";

export interface DimensionFormat {
    prefix?: string;
    suffix?: string;
    units: DimensionUnits;
    units_format: DimensionUnitsFormat;
    precision: DimensionPrecision;
    override_value?: string;
    suppress_zeros?: boolean;
    extra?: string[];
}

export type DimensionPrecision = "digits_0" | "digits_1" | "digits_2" | "digits_3" | "digits_4" | "digits_5" | "scaled_hundredths" | "scaled_thousandths" | "scaled_ten_thousandths" | "scaled_hundred_thousandths";

export type DimensionUnitsFormat = "none" | "bare" | "parentheses";

export type DimensionUnits = "inches" | "mils" | "millimeters" | "automatic";

export type FootprintDimensionType = string;

export interface GraphicLine {
    start: Xy;
    end: Xy;
    angle?: number;
    layer: CanonicalLayer;
    width: number;
    uuid: Uuid;
    locked?: boolean;
    tstamp?: string;
    extra?: string[];
}

export interface KicadSch {
    version: number;
    generator: string;
    generator_version?: string;
    uuid: Uuid;
    paper?: Paper;
    title_block?: TitleBlock;
    lib_symbols?: LibSymbols;
    sheet?: Sheet[];
    junction?: Junction[];
    no_connect?: NoConnect[];
    bus_entry?: BusEntry[];
    wire?: Wire[];
    bus?: Bus[];
    polyline?: Polyline[];
    text?: GraphText[];
    label?: LocalLabel[];
    global_label?: GlobalLabel[];
    symbol?: SchematicSymbol[];
    path?: RootPath;
}

/**
 * (no_connect (at x y) (uuid \"...\"))
 */
export interface NoConnect {
    /**
     * POSITION_IDENTIFIER — XY only (no rotation)
     */
    at: Xy;
    /**
     * UNIQUE_IDENTIFIER — required
     */
    uuid: Uuid;
}

export type ShapeWrap = LabelPinShape;

/**
 * (global_label \"TEXT\" (shape SHAPE) [fields_autoplaced] (at x y r) (effects ...) (uuid ...) (property ...)*)
 */
export interface GlobalLabel {
    /**
     * Positional text immediately after head
     */
    "": string;
    /**
     * (shape SHAPE) — required
     */
    shape: ShapeWrap;
    /**
     * [fields_autoplaced] — presence flag (optional)
     */
    fields_autoplaced?: Flag;
    /**
     * (at x y r) — required
     */
    at: Xyr;
    /**
     * (effects ...) — required
     */
    effects: TextEffects;
    /**
     * (uuid \"...\") — required
     */
    uuid: Uuid;
    /**
     * PROPERTIES — zero or more (property \"Name\" \"Value\" (at ...)? (effects ...)? [hide]?)
     */
    property?: Property[];
}

/**
 * SR step-and-repeat block.
 */
export interface StepRepeat {
    x_repeats: number;
    y_repeats: number;
    x_step: number;
    y_step: number;
}

/**
 * Format specification (FS) describing how coordinates are encoded.
 *
 * Example: FSLA X24 Y24 means leading zero suppression, absolute notation,
 * and 2 integer digits + 4 decimal digits.
 */
export interface CoordinateFormat {
    zero_suppression: ZeroSuppression;
    notation: CoordinateNotation;
    integer_digits: number;
    decimal_digits: number;
}

/**
 * Coordinate notation.
 */
export type CoordinateNotation = "Absolute" | "Incremental";

/**
 * How zeros are suppressed in coordinate strings.
 */
export type ZeroSuppression = "Leading" | "Trailing" | "None";

/**
 * RS-274X units.
 */
export type Units = "Inch" | "Millimeter";

/**
 * Description of a single stackup layer entry.
 */
export interface StackupLayer {
    name: StackupLayerName;
    number: number;
    type: string;
    color?: string;
    thickness?: number;
    material?: string;
    epsilon_r?: number;
    loss_tangent?: number;
    extra?: string[];
}

/**
 * Stackup layer identifier.
 */
export type StackupLayerName = string;

/**
 * Possible edge connector configuration values.
 */
export type EdgeConnector = string;

/**
 * KiCad stackup section describing the board fabrication stack.
 */
export interface Stackup {
    layers?: StackupLayer[];
    copper_finish?: string;
    dielectric_constraints?: boolean;
    edge_connector?: EdgeConnector;
    castellated_pads?: boolean;
    edge_plating?: boolean;
    extra?: string[];
}

/**
 * Root of a KiCad PCB file. Currently models the header, page, layers, and general
 * sections per the KiCad board file format
 * <https://dev-docs.kicad.org/en/file-formats/sexpr-pcb/index.html>.
 */
export interface Pcb {
    version: number;
    generator: string;
    generator_version?: string;
    page: Paper;
    layers: Layers;
    setup: Setup;
    properties?: Property[];
    nets?: Net[];
    graphics?: PcbGraphicItem[];
    images?: Image[];
    footprints?: Footprint[];
    tracks?: Track[];
    zones?: Zone[];
    groups?: Group[];
    general?: General;
}

export interface Group {
    name?: string;
    id: UuidRef;
    members?: UuidRef[];
    extra?: string[];
}

export interface FootprintText {
    kind: FootprintTextKind;
    text: string;
    at: GraphicAt;
    layer: CanonicalLayer;
    unlocked?: boolean;
    hide?: boolean;
    effects: TextEffects;
    tstamp?: string;
    uuid?: Uuid;
    extra?: string[];
}

export type FootprintTextKind = string;

/**
 * Represents a single KiCad footprint library file (`.kicad_mod`).
 * Encapsulates the optional header metadata along with the parsed footprint body.
 */
export interface FootprintLibrary {
    version?: number;
    generator?: string;
    generator_version?: string;
    footprint: Footprint;
    extra?: string[];
}

export type FootprintGraphic = { kind: "text"; data: FootprintText } | { kind: "line"; data: FootprintLine } | { kind: "rect"; data: FootprintRect } | { kind: "circle"; data: FootprintCircle } | { kind: "arc"; data: FootprintArc } | { kind: "polygon"; data: FootprintPolygon } | { kind: "curve"; data: FootprintCurve } | { kind: "text_box"; data: FootprintTextBox } | { kind: "dimension"; data: FootprintDimension };

export interface FootprintCircle {
    center: Xy;
    end: Xy;
    layer: CanonicalLayer;
    width?: number;
    stroke?: Stroke;
    fill?: boolean;
    locked?: boolean;
    tstamp?: string;
    uuid?: Uuid;
    extra?: string[];
}

export interface FootprintArc {
    start: Xy;
    mid: Xy;
    end: Xy;
    layer: CanonicalLayer;
    width?: number;
    stroke?: Stroke;
    locked?: boolean;
    tstamp?: string;
    uuid: Uuid;
    extra?: string[];
}

export interface Footprint {
    library_link?: string;
    version?: number;
    generator?: string;
    generator_version?: string;
    locked?: boolean;
    placed?: boolean;
    layer: CanonicalLayer;
    tedit?: string;
    uuid?: Uuid;
    at?: GraphicAt;
    descr?: string;
    tags?: string;
    properties?: FootprintProperty[];
    path?: string;
    autoplace_cost90?: number;
    autoplace_cost180?: number;
    solder_mask_margin?: number;
    solder_paste_margin?: number;
    solder_paste_ratio?: number;
    clearance?: number;
    zone_connect?: FootprintZoneConnect;
    thermal_width?: number;
    thermal_gap?: number;
    attributes?: FootprintAttributes;
    private_layers?: CanonicalLayer[];
    net_tie_pad_groups?: string[][];
    graphics?: FootprintGraphic[];
    pads?: FootprintPad[];
    zones?: Zone[];
    groups?: Group[];
    models?: FootprintModel[];
    extra?: string[];
}

export interface ZoneKeepout {
    tracks?: ZoneKeepoutSetting;
    vias?: ZoneKeepoutSetting;
    pads?: ZoneKeepoutSetting;
    copperpour?: ZoneKeepoutSetting;
    footprints?: ZoneKeepoutSetting;
    extra?: string[];
}

export type ZoneKeepoutSetting = "allowed" | "not_allowed";

export interface SymbolInstancePath {
    path: string;
    reference?: string;
    unit?: number;
}

export interface SymbolInstanceProject {
    project: string;
    path?: SymbolInstancePath[];
}

export interface SymbolInstances {
    project?: SymbolInstanceProject[];
}

/**
 * (pin \"NUMBER\" (uuid <uuid>))
 */
export interface InstancePin {
    number: string;
    uuid?: Uuid;
}

/**
 * Represents a symbol instance on a schematic page:
 * (symbol \"LIBRARY_IDENTIFIER\" (at x y r) (unit N) (in_bom yes|no) (on_board yes|no)
 *  (uuid \"...\") (property ...) (pin \"1\" (uuid ...)) (instances ...))
 */
export interface SchematicSymbol {
    lib_id: string;
    at: Xyr;
    unit?: number;
    in_bom?: boolean;
    on_board?: boolean;
    uuid?: Uuid;
    properties?: SymbolProperty[];
    pins?: InstancePin[];
    instances?: SymbolInstances;
}

export type Property = [string, string];

export type Track = { kind: "segment"; data: TrackSegment } | { kind: "via"; data: TrackVia } | { kind: "arc"; data: TrackArc } | { kind: "unknown"; data: UnknownTrack };

/**
 * Container for all layer definitions defined by the board.
 */
export type Layers = Layer[];

/**
 * Definition of a single PCB layer entry inside the `(layers ...)` section.
 */
export interface Layer {
    ordinal: number;
    canonical_name: CanonicalLayer;
    layer_type: LayerType;
    user_name?: string;
}

export type LayerType = string;

export type CanonicalLayer = string;

export interface PadDrill {
    shape?: PadDrillShape;
    diameter?: number;
    width?: number;
    offset?: Xy;
}

export type PadDrillShape = string;

export interface ZoneHatch {
    style: ZoneHatchStyle;
    pitch: number;
}

export type ZoneHatchStyle = "none" | "edge" | "full";

