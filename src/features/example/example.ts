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
  exportTypes,
  type KicadSch,
  type KicadSymbolLib,
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

  // --- TypeScript declarations --------------------------------------------

  // If you need to emit the declarations manually (e.g., to a file), use exportTypes().
  const declarations = exportTypes();
  console.log("Generated TypeScript declarations:\n", declarations);
}

main();
