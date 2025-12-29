import {
  schematicJsonToSexpr,
  schematicJsonToValue,
  schematicSexprToJson,
  schematicSexprToValue,
  schematicValueToJson,
  schematicValueToSexpr,
  createMinimalSchematic,
  createMinimalSchematicJson,
  symbolLibJsonToSexpr,
  symbolLibJsonToValue,
  symbolLibSexprToJson,
  symbolLibSexprToValue,
  symbolLibValueToJson,
  symbolLibValueToSexpr,
  createMinimalSymbolLib,
  createMinimalSymbolLibJson,
  pcbJsonToSexpr,
  pcbJsonToValue,
  pcbSexprToJson,
  pcbSexprToValue,
  pcbValueToJson,
  pcbValueToSexpr,
  createMinimalPcb,
  createMinimalPcbJson,
  footprintLibJsonToSexpr,
  footprintLibJsonToValue,
  footprintLibSexprToJson,
  footprintLibSexprToValue,
  footprintLibValueToJson,
  footprintLibValueToSexpr,
  createMinimalFootprintLib,
  createMinimalFootprintLibJson,
  exportTypes as exportTsDefinitions,
  type KicadSch,
  type KicadSymbolLib,
  type Pcb,
  type FootprintLibrary,
  // ERC exports
  ercRunFromSexpr,
  ercRunFromValue,
  ercBuildModelFromSexpr,
  ercReportValueToJson,
  ercReportJsonToValue,
  ercReportJsonToJson,
  type SchematicModel,
  type ErcReport,

  // DRC exports
  drcCreateDefaultConfig,
  drcRunFromPcbSexpr,
  drcRunFromPcbValue,
  type DrcConfig,
  type DRCIssue,

  // Gerber exports
  gerberExportZipFromPcbSexpr,
  gerberExportZipFromPcbValue,
  type GerberZipOptions,
} from "trackway-parser-wasm";

type PrettyOptions = { pretty?: boolean };

const asPretty = (options?: PrettyOptions): boolean => Boolean(options?.pretty);

/**
 * Convenience wrapper around the wasm parser exports.
 *
 * Usage:
 * ```ts
 * const parser = await TrackwayParser.create();
 * const schematicJson = parser.schematics.sexprToJson(sexpr, { pretty: true });
 * ```
 */
export class TrackwayParser {
  private constructor() {}

  /**
   * Creates a parser instance. The wasm module produced by `wasm-pack build --target bundler`
   * is self-initialising, so this resolves immediately. Keeping the async API allows callers
   * to adapt easily if they later switch to a target that requires explicit initialisation.
   */
  static async create(): Promise<TrackwayParser> {
    return new TrackwayParser();
  }

  /** Schematic conversion helpers. */
  readonly schematics = {
    sexprToJson(input: string, options?: PrettyOptions): string {
      return schematicSexprToJson(input, asPretty(options));
    },
    jsonToSexpr(input: string, options?: PrettyOptions): string {
      return schematicJsonToSexpr(input, asPretty(options));
    },
    sexprToValue(input: string): KicadSch {
      return schematicSexprToValue(input) as KicadSch;
    },
    jsonToValue(input: string): KicadSch {
      return schematicJsonToValue(input) as KicadSch;
    },
    valueToJson(value: KicadSch, options?: PrettyOptions): string {
      return schematicValueToJson(value, asPretty(options));
    },
    valueToSexpr(value: KicadSch, options?: PrettyOptions): string {
      return schematicValueToSexpr(value, asPretty(options));
    },
    createMinimalValue(): KicadSch {
      return createMinimalSchematic() as KicadSch;
    },
    createMinimalJson(options?: PrettyOptions): string {
      return createMinimalSchematicJson(asPretty(options));
    },
    createMinimalSexpr(options?: PrettyOptions): string {
      const pretty = asPretty(options);
      const json = createMinimalSchematicJson(pretty);
      return schematicJsonToSexpr(json, pretty);
    },
  };

  /** Symbol library conversion helpers. */
  readonly symbolLibraries = {
    sexprToJson(input: string, options?: PrettyOptions): string {
      return symbolLibSexprToJson(input, asPretty(options));
    },
    jsonToSexpr(input: string, options?: PrettyOptions): string {
      return symbolLibJsonToSexpr(input, asPretty(options));
    },
    sexprToValue(input: string): KicadSymbolLib {
      return symbolLibSexprToValue(input) as KicadSymbolLib;
    },
    jsonToValue(input: string): KicadSymbolLib {
      return symbolLibJsonToValue(input) as KicadSymbolLib;
    },
    valueToJson(value: KicadSymbolLib, options?: PrettyOptions): string {
      return symbolLibValueToJson(value, asPretty(options));
    },
    valueToSexpr(value: KicadSymbolLib, options?: PrettyOptions): string {
      return symbolLibValueToSexpr(value, asPretty(options));
    },
    createMinimalValue(): KicadSymbolLib {
      return createMinimalSymbolLib() as KicadSymbolLib;
    },
    createMinimalJson(options?: PrettyOptions): string {
      return createMinimalSymbolLibJson(asPretty(options));
    },
    createMinimalSexpr(options?: PrettyOptions): string {
      const pretty = asPretty(options);
      const json = createMinimalSymbolLibJson(pretty);
      return symbolLibJsonToSexpr(json, pretty);
    },
  };

  /** Footprint library conversion helpers. */
  readonly footprintLibraries = {
    sexprToJson(input: string, options?: PrettyOptions): string {
      return footprintLibSexprToJson(input, asPretty(options));
    },
    jsonToSexpr(input: string, options?: PrettyOptions): string {
      return footprintLibJsonToSexpr(input, asPretty(options));
    },
    sexprToValue(input: string): FootprintLibrary {
      return footprintLibSexprToValue(input) as FootprintLibrary;
    },
    jsonToValue(input: string): FootprintLibrary {
      return footprintLibJsonToValue(input) as FootprintLibrary;
    },
    valueToJson(value: FootprintLibrary, options?: PrettyOptions): string {
      return footprintLibValueToJson(value, asPretty(options));
    },
    valueToSexpr(value: FootprintLibrary, options?: PrettyOptions): string {
      return footprintLibValueToSexpr(value, asPretty(options));
    },
    createMinimalValue(): FootprintLibrary {
      return createMinimalFootprintLib() as FootprintLibrary;
    },
    createMinimalJson(options?: PrettyOptions): string {
      return createMinimalFootprintLibJson(asPretty(options));
    },
    createMinimalSexpr(options?: PrettyOptions): string {
      const pretty = asPretty(options);
      const json = createMinimalFootprintLibJson(pretty);
      return footprintLibJsonToSexpr(json, pretty);
    },
  };

  /** PCB conversion helpers. */
  readonly pcbs = {
    sexprToJson(input: string, options?: PrettyOptions): string {
      return pcbSexprToJson(input, asPretty(options));
    },
    jsonToSexpr(input: string, options?: PrettyOptions): string {
      return pcbJsonToSexpr(input, asPretty(options));
    },
    sexprToValue(input: string): Pcb {
      return pcbSexprToValue(input) as Pcb;
    },
    jsonToValue(input: string): Pcb {
      return pcbJsonToValue(input) as Pcb;
    },
    valueToJson(value: Pcb, options?: PrettyOptions): string {
      return pcbValueToJson(value, asPretty(options));
    },
    valueToSexpr(value: Pcb, options?: PrettyOptions): string {
      return pcbValueToSexpr(value, asPretty(options));
    },
    createMinimalValue(): Pcb {
      return createMinimalPcb() as Pcb;
    },
    createMinimalJson(options?: PrettyOptions): string {
      return createMinimalPcbJson(asPretty(options));
    },
    createMinimalSexpr(options?: PrettyOptions): string {
      const pretty = asPretty(options);
      const json = createMinimalPcbJson(pretty);
      return pcbJsonToSexpr(json, pretty);
    },
  };

  /** Returns the generated TypeScript declarations for all exposed data models. */
  exportTypes(): string {
    return exportTsDefinitions();
  }

  /** ERC helpers (Electrical Rules Check) */
  readonly erc = {
    /** Run ERC from schematic S-expression, returns an ErcReport object */
    runFromSexpr(input: string): ErcReport {
      return ercRunFromSexpr(input) as ErcReport;
    },
    /** Run ERC from a JS KicadSch-shaped value */
    runFromValue(value: KicadSch): ErcReport {
      return ercRunFromValue(value as unknown as any) as ErcReport;
    },
    /** Build the minimal SchematicModel from S-expression */
    buildModelFromSexpr(input: string): SchematicModel {
      return ercBuildModelFromSexpr(input) as SchematicModel;
    },
    /** Serialize an ErcReport JS value to JSON */
    reportValueToJson(value: ErcReport, pretty?: boolean): string {
      return ercReportValueToJson(value as unknown as any, Boolean(pretty));
    },
    /** Parse an ErcReport JSON string into a JS value */
    reportJsonToValue(json: string): ErcReport {
      return ercReportJsonToValue(json) as ErcReport;
    },
    /** Re-format ErcReport JSON string (identity/pretty) */
    reportJsonToJson(json: string, pretty?: boolean): string {
      return ercReportJsonToJson(json, Boolean(pretty));
    },
  };

  /** DRC helpers (Design Rules Check) */
  readonly drc = {
    /** Create a reasonable default DRC config (zones enabled). */
    createDefaultConfig(): DrcConfig {
      return drcCreateDefaultConfig() as DrcConfig;
    },
    /** Run DRC from a PCB S-expression, returns `DRCIssue[]`. */
    runFromPcbSexpr(input: string, config?: DrcConfig | null): DRCIssue[] {
      return drcRunFromPcbSexpr(input, (config ?? null) as unknown as any) as DRCIssue[];
    },
    /** Run DRC from a JS `Pcb` value, returns `DRCIssue[]`. */
    runFromPcbValue(value: Pcb, config?: DrcConfig | null): DRCIssue[] {
      return drcRunFromPcbValue(value as unknown as any, (config ?? null) as unknown as any) as DRCIssue[];
    },
  };

  /** Gerber/Excellon export helpers */
  readonly gerber = {
    /** Export Gerbers (and drills) from a PCB S-expression as a ZIP `Uint8Array`. */
    exportZipFromPcbSexpr(input: string, options?: GerberZipOptions | null): Uint8Array {
      return gerberExportZipFromPcbSexpr(input, (options ?? null) as unknown as any) as unknown as Uint8Array;
    },
    /** Export Gerbers (and drills) from a JS `Pcb` value as a ZIP `Uint8Array`. */
    exportZipFromPcbValue(value: Pcb, options?: GerberZipOptions | null): Uint8Array {
      return gerberExportZipFromPcbValue(value as unknown as any, (options ?? null) as unknown as any) as unknown as Uint8Array;
    },
  };
}
