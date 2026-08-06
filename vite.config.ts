import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";


// https://vite.dev/config/
export default defineConfig({
   base: "/",
  plugins: [wasm(), topLevelAwait(), react(),  tailwindcss(), tsconfigPaths({
    projects:["tsconfig.app.json"]
  })],
  preview: {
    host: true,
    port:4175,
    allowedHosts: [
      'web.graphoraailabs.com'
    ]
  },
  // Improve chunking to avoid very large bundles
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 700, // kB - raise/lower as needed
    rollupOptions: {
      output: {
        // Split vendor code and large libraries into separate chunks
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Keep react/react-dom in the main vendor chunk to avoid circular
            // initialization issues between separate vendor chunks (TDZ errors).
            if (id.includes('konva') || id.includes('react-konva')) return 'konva-vendor';
            if (id.includes('trackway_parser_wasm') || id.endsWith('.wasm')) return 'wasm';
            return 'vendor';
          }
        }
      }
    }
  }
});
