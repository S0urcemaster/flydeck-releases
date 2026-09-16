import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Keep the Snake engine as a real deployment asset instead of embedding
    // the small WASM binary as a base64 data URL in the JavaScript bundle.
    assetsInlineLimit: 0,
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:6060",
    },
  },
});
