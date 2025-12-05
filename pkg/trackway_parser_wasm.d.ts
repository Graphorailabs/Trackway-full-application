/* tslint:disable */
/* eslint-disable */
/**
 * Return the generated TypeScript definitions for the exposed KiCad data models.
 */
export function exportTypes(): string;
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

export type Property = [string, string];

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

/**
 * (label \"TEXT\" (at x y r)? (effects ...)? (uuid ...)?)
 */
export interface LocalLabel {
    "": string;
    at: Xyr;
    effects: TextEffects;
    uuid: Uuid;
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

export interface GraphicCurve {
    pts: Pts;
    layer: CanonicalLayer;
    width: number;
    uuid: Uuid;
    locked?: boolean;
    tstamp?: string;
    extra?: string[];
}

export type Track = { kind: "segment"; data: TrackSegment } | { kind: "via"; data: TrackVia } | { kind: "arc"; data: TrackArc } | { kind: "unknown"; data: UnknownTrack };

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

/**
 * Simple coordinate pair used by setup origin tokens.
 */
export interface Coordinate {
    x: number;
    y: number;
}

export type PadChamferCorner = string;

export type PadShape = string;

export type PadType = string;

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

export interface Zone {
    net: number;
    net_name?: string;
    layer: CanonicalLayer;
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
    layer: CanonicalLayer;
    points: Xy[];
    extra?: string[];
}

export interface ZoneFilledPolygon {
    layer: CanonicalLayer;
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

export type PageLabel = string;

export interface RootPath {
    "": string;
    page?: PageLabel;
}

/**
 * Definition of a single net entry within the `(net ...)` section.
 */
export interface Net {
    ordinal: number;
    name: string;
}

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

export interface PadNet {
    number: number;
    name: string;
}

export interface PadDrill {
    shape?: PadDrillShape;
    diameter: number;
    width?: number;
    offset?: Xy;
}

export type PadDrillShape = string;

export interface ZoneHatch {
    style: ZoneHatchStyle;
    pitch: number;
}

export type ZoneHatchStyle = "none" | "edge" | "full";

export interface GraphicAt {
    x: number;
    y: number;
    angle?: number;
}

/**
 * Reference to an existing UUID stored as a bare string in the PCB file.
 */
export type UuidRef = string;

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

export type PadProperty = string;

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

export interface UnknownTrack {
    sexpr: string;
}

export interface Group {
    name?: string;
    id: UuidRef;
    members?: UuidRef[];
    extra?: string[];
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

export type PaperSize = PaperNamedSize | [number, number];

export type PaperNamedSize = string;

/**
 * (paper PAPER_SIZE | WIDTH HEIGHT [portrait])
 */
export interface Paper {
    size: PaperSize;
    portrait?: boolean;
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

export type FootprintZoneConnect = "none" | "thermal_relief" | "solid";

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

export type FootprintGraphic = { kind: "text"; data: FootprintText } | { kind: "line"; data: FootprintLine } | { kind: "rect"; data: FootprintRect } | { kind: "circle"; data: FootprintCircle } | { kind: "arc"; data: FootprintArc } | { kind: "polygon"; data: FootprintPolygon } | { kind: "curve"; data: FootprintCurve } | { kind: "text_box"; data: FootprintTextBox } | { kind: "dimension"; data: FootprintDimension };

export type PcbGraphicItem = { kind: "text"; data: GraphicText } | { kind: "line"; data: GraphicLine } | { kind: "rect"; data: GraphicRect } | { kind: "circle"; data: GraphicCircle } | { kind: "arc"; data: GraphicArc } | { kind: "polygon"; data: GraphicPolygon } | { kind: "curve"; data: GraphicCurve };

