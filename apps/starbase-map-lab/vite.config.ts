import { defineConfig } from "vite";

export default defineConfig({
  server: { host: "0.0.0.0", port: 5191, strictPort: true },
  preview: { host: "0.0.0.0", port: 5191, strictPort: true },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("maplibre-gl")) return "maplibre";
          if (id.includes("node_modules/three")) return "three";
          return undefined;
        },
      },
    },
  },
});
