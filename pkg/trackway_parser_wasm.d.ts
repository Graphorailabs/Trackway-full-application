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

export type VersionIn = number | string | string;

export interface Pts {
    /**
     * one or more `(xy X Y)` entries
     */
    xy?: Xy[];
}

export type Property = [string, string];

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
    page: Page;
    layers: Layers;
    setup: Setup;
    general?: General;
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
    mode: number;
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
    outputformat: number;
    mirror: boolean;
    drillshape: number;
    scaleselection: number;
    outputdirectory: string;
    extra?: string[];
}

/**
 * Simple coordinate pair used by setup origin tokens.
 */
export interface Coordinate {
    x: number;
    y: number;
}

export interface Page {
    size: PaperSize;
    portrait?: boolean;
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
 * KiCad PCB `general` section. Currently only models the thickness token and
 * preserves any additional, as-yet unsupported forms.
 */
export interface General {
    thickness?: number;
    extra?: string[];
}

