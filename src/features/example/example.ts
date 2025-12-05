// When developing locally, import from the generated pkg directory.
// After publishing, change the specifier to "trackway-parser-wasm".
import {
  schematicSexprToJson,
  schematicJsonToSexpr,
  schematicJsonToValue,
  schematicSexprToValue,
  schematicValueToJson,
  schematicValueToSexpr,
  createMinimalSchematic,
  createMinimalSchematicJson,
  symbolLibSexprToJson,
  symbolLibJsonToSexpr,
  symbolLibJsonToValue,
  symbolLibSexprToValue,
  symbolLibValueToJson,
  symbolLibValueToSexpr,
  createMinimalSymbolLib,
  createMinimalSymbolLibJson,
  footprintLibJsonToSexpr,
  footprintLibJsonToValue,
  footprintLibSexprToJson,
  footprintLibSexprToValue,
  footprintLibValueToJson,
  footprintLibValueToSexpr,
  createMinimalFootprintLib,
  createMinimalFootprintLibJson,
  pcbSexprToJson,
  pcbJsonToSexpr,
  pcbJsonToValue,
  pcbSexprToValue,
  pcbValueToJson,
  pcbValueToSexpr,
  createMinimalPcb,
  createMinimalPcbJson,
  exportTypes,
  type KicadSch,
  type KicadSymbolLib,
  type FootprintLibrary,
  type Pcb,
  // ERC
  ercRunFromSexpr,
  ercRunFromValue,
  ercBuildModelFromSexpr,
  ercReportValueToJson,
  ercReportJsonToValue,
  ercReportJsonToJson,
  type SchematicModel,
  type ErcReport,
} from "trackway-parser-wasm";

function main(): void {
  // --- Schematics ----------------------------------------------------------

  // Convert S-expression text straight to formatted JSON.
  const schematicSexpr = `
  (kicad_sch
    (version 20250114)
    (generator "eeschema")
    (uuid "00000000-0000-0000-0000-000000000000")
    (paper "A4")
  )`;

  const schematicJson = schematicSexprToJson(schematicSexpr, true);
  console.log("Pretty schematic JSON:\n", schematicJson);

  // Convert the same S-expression directly into a JS object.
  const schematicFromSexpr: KicadSch = schematicSexprToValue(schematicSexpr);
  console.log("Parsed from S-expression (uuid):", schematicFromSexpr.uuid);

  // Convert the JSON string into a strongly typed object.
  const schematicValue: KicadSch = schematicJsonToValue(schematicJson);
  console.log("Schematic title block:", schematicValue.title_block);

  // Render the JS object back to KiCad S-expression text.
  const schematicRoundTrip = schematicValueToSexpr(schematicValue, true);
  console.log("Pretty schematic S-expression:\n", schematicRoundTrip);

  // Render the JS object back to JSON.
  const schematicJsonFromValue = schematicValueToJson(schematicValue, true);
  console.log("JSON regenerated from value:\n", schematicJsonFromValue);

  // Produce a minimal schematic via helper constructors.
  const minimalSchematicJson = createMinimalSchematicJson(true);
  const minimalSchematicValue: KicadSch = createMinimalSchematic();
  console.log("Minimal schematic version:", minimalSchematicValue.version);

  // Convert the minimal JSON to S-expression using the dedicated helper.
  const minimalSchematicSexpr = schematicJsonToSexpr(minimalSchematicJson, true);
  console.log("Minimal schematic as S-expression:\n", minimalSchematicSexpr);

  // Read back the minimal S-expression into a typed object.
  const minimalFromSexpr: KicadSch = schematicSexprToValue(minimalSchematicSexpr);
  console.log("Minimal schematic generator:", minimalFromSexpr.generator);

  // --- Symbol libraries ----------------------------------------------------

  const symbolLibSexpr = `
  (kicad_symbol_lib
    (version 20250114)
    (generator "eesymbol")
    (symbol (name "Example") (property "Reference" "U"))
  )`;

  const symbolLibJson = symbolLibSexprToJson(symbolLibSexpr, true);
  console.log("Pretty symbol lib JSON:\n", symbolLibJson);

  const symbolLibValueFromSexpr: KicadSymbolLib = symbolLibSexprToValue(symbolLibSexpr);
  console.log("Symbol IDs from S-expression:", symbolLibValueFromSexpr.symbol?.map((s) => s.id));

  const symbolLibValue: KicadSymbolLib = symbolLibJsonToValue(symbolLibJson);
  const firstSymbol = symbolLibValue.symbol?.[0];
  console.log("First symbol ID:", firstSymbol?.id);

  const symbolLibPrettySexpr = symbolLibValueToSexpr(symbolLibValue, true);
  console.log("Pretty symbol lib S-expression:\n", symbolLibPrettySexpr);

  const symbolLibJsonFromValue = symbolLibValueToJson(symbolLibValue, true);
  console.log("Symbol lib JSON regenerated from value:\n", symbolLibJsonFromValue);

  const minimalSymbolLibJson = createMinimalSymbolLibJson(true);
  const minimalSymbolLibValue: KicadSymbolLib = createMinimalSymbolLib();
  console.log("Minimal symbol lib generator:", minimalSymbolLibValue.generator);

  const minimalSymbolLibSexpr = symbolLibJsonToSexpr(minimalSymbolLibJson, true);
  console.log("Minimal symbol lib as S-expression:\n", minimalSymbolLibSexpr);

  const minimalSymbolLibFromSexpr: KicadSymbolLib = symbolLibSexprToValue(minimalSymbolLibSexpr);
  console.log("Minimal symbol count:", minimalSymbolLibFromSexpr.symbol?.length ?? 0);

  // --- Footprint libraries ------------------------------------------------

  const footprintSexpr = `
  (footprint "Demo:Pad"
    (layer F.Cu)
    (fp_text reference "REF**" (at 0 0 0) (layer F.SilkS)
      (effects (font (size 1 1)))
      (uuid "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"))
    (fp_text value "Pad" (at 0 1 0) (layer F.Fab)
      (effects (font (size 1 1)))
      (uuid "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"))
    (pad "1" smd rect (at 0 0 0) (size 1 1)
      (layers F.Cu F.Paste F.Mask)
      (uuid "cccccccc-cccc-cccc-cccc-cccccccccccc")))`;

  const footprintJson = footprintLibSexprToJson(footprintSexpr, true);
  console.log("Footprint library JSON:\n", footprintJson);

  const footprintValueFromSexpr: FootprintLibrary = footprintLibSexprToValue(footprintSexpr);
  console.log("Footprint:", footprintValueFromSexpr);

  const footprintValue: FootprintLibrary = footprintLibJsonToValue(footprintJson);
  const footprintPrettySexpr = footprintLibValueToSexpr(footprintValue, true);
  console.log("Footprint library pretty expression:\n", footprintPrettySexpr);

  const footprintJsonFromValue = footprintLibValueToJson(footprintValue, true);
  console.log("Footprint JSON regenerated:\n", footprintJsonFromValue);

  const minimalFootprintJson = createMinimalFootprintLibJson(true);
  const minimalFootprintValue: FootprintLibrary = createMinimalFootprintLib();
  console.log("Minimal footprint generator:", minimalFootprintValue.footprint.generator);

  const minimalFootprintSexpr = footprintLibJsonToSexpr(minimalFootprintJson, true);
  console.log("Minimal footprint as S-expression:\n", minimalFootprintSexpr);

  const minimalFootprintFromSexpr: FootprintLibrary = footprintLibSexprToValue(minimalFootprintSexpr);
  console.log("Minimal footprint layer:", minimalFootprintFromSexpr.footprint.layer);

  // --- PCBs ---------------------------------------------------------------

  const pcbSexpr = `
  (kicad_pcb
    (version 20250115)
    (generator "pcbnew")
    (general (thickness 1.6))
    (page A4)
    (layers
      (0 F.Cu signal)
      (31 B.Cu signal))
    (setup (pad_to_mask_clearance 0)))`;

  const pcbJson = pcbSexprToJson(pcbSexpr, true);
  console.log("PCB JSON:\n", pcbJson);

  const pcbValueFromSexpr: Pcb = pcbSexprToValue(pcbSexpr);
  console.log("PCB version:", pcbValueFromSexpr.version);

  const pcbValue: Pcb = pcbJsonToValue(pcbJson);
  const pcbPrettySexpr = pcbValueToSexpr(pcbValue, true);
  console.log("PCB pretty S-expression:\n", pcbPrettySexpr);

  const pcbJsonFromValue = pcbValueToJson(pcbValue, true);
  console.log("PCB JSON regenerated:\n", pcbJsonFromValue);

  const minimalPcbJson = createMinimalPcbJson(true);
  const minimalPcbValue: Pcb = createMinimalPcb();
  console.log("Minimal:", minimalPcbValue);

  const minimalPcbSexpr = pcbJsonToSexpr(minimalPcbJson, true);
  console.log("Minimal PCB as S-expression:\n", minimalPcbSexpr);

  const minimalPcbFromSexpr: Pcb = pcbSexprToValue(minimalPcbSexpr);
  console.log("Minimal PCB generator:", minimalPcbFromSexpr.generator);

  // --- TypeScript declarations --------------------------------------------

  // If you need to emit the declarations manually (e.g., to a file), use exportTypes().
  const declarations = exportTypes();
  console.log("Generated TypeScript declarations:\n", declarations);

  // --- ERC examples ------------------------------------------------------
  const ercSexpr = schematicValueToSexpr(minimalSchematicValue, true);
  // Run ERC from S-expression
  const ercReport: ErcReport = ercRunFromSexpr(ercSexpr);
  console.log("ERC report:", ercReport);

  // Build model from sexpr
  const model: SchematicModel = ercBuildModelFromSexpr(ercSexpr);
  console.log("Built SchematicModel:", model);

  // Convert report to JSON
  const reportJson = ercReportValueToJson(ercReport, true);
  console.log("ErcReport JSON:\n", reportJson);

  // Parse JSON back to value
  const parsedReport: ErcReport = ercReportJsonToValue(reportJson);
  console.log("Parsed ErcReport from JSON:", parsedReport);
}

main();
