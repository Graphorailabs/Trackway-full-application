# trackway-parser-wasm

WebAssembly wrapper around the Trackway parser. Exposes schematic, PCB, footprint-library, and symbol-library conversions to JavaScript via `wasm-bindgen` and ships first-class TypeScript definitions.

## Prerequisites

- Rust (latest stable)
- `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- `wasm-pack`: `cargo install wasm-pack`
- (Optional) `wasm-opt` for additional optimisation (part of Binaryen)

## Tests

```powershell
cargo test -p trackway-parser-wasm
```

The tests validate round-trips via JSON/S-expression strings and ensure TypeScript declarations compile.

## Building the npm Package

```powershell
# build for bundler environments (Webpack, Vite, etc.)
wasm-pack build trackway-parser-wasm --target bundler

# alternative targets
wasm-pack build trackway-parser-wasm --target web      # direct <script type="module">
wasm-pack build trackway-parser-wasm --target nodejs   # server-side use
```

The output lives in `trackway-parser-wasm/pkg` and contains the `.wasm`, JS loader, and `.d.ts` file. The TypeScript declarations are also embedded through `wasm_bindgen(typescript_custom_section)` so bundlers pick them up automatically.

## JavaScript Usage

```ts
import init, {
  schematicSexprToJson,
  schematicJsonToSexpr,
  schematicJsonToValue,
  schematicValueToJson,
  createMinimalSchematic,
  symbolLibSexprToJson,
  symbolLibJsonToSexpr,
  createMinimalSymbolLib,
  footprintLibSexprToJson,
  footprintLibJsonToSexpr,
  footprintLibJsonToValue,
  footprintLibValueToJson,
  createMinimalFootprintLib,
  pcbSexprToJson,
  pcbJsonToSexpr,
  pcbJsonToValue,
  pcbValueToJson,
  createMinimalPcb,
  exportTypes,
} from 'trackway-parser-wasm';

await init();

const json = await schematicSexprToJson(s_exprText, true);
const value = await schematicJsonToValue(json); // returns a strongly typed object
const pretty = await schematicValueToJson(value, true);

const footprint = await createMinimalFootprintLib();
const footprintJson = await footprintLibValueToJson(footprint, true);
const footprintRoundTrip = await footprintLibJsonToValue(footprintJson);

const pcb = await createMinimalPcb();
const pcbJson = await pcbValueToJson(pcb, true);
const pcbRoundTrip = await pcbJsonToValue(pcbJson);

// TypeScript definitions are also available at runtime if you need to emit them
console.log(exportTypes());
```

Every helper accepts/returns either strings or plain JS objects matching the `KicadSch`, `Pcb`, `FootprintLibrary`, or `KicadSymbolLib` interfaces.

## Publishing

1. Build the package (`wasm-pack build`).
2. Optionally run `npm publish ./trackway-parser-wasm/pkg`.
3. Consumers can then install via `npm install trackway-parser-wasm` and use the functions listed above.
