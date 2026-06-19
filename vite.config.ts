import { defineConfig } from "vite";

function manualChunk(id: string): string | undefined {
  if (id.includes("node_modules/@dimforge/rapier3d-compat")) {
    return "rapier";
  }
  if (id.includes("node_modules/three")) {
    return "three";
  }
  return undefined;
}

export default defineConfig({
  server: {
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return manualChunk(id);
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
});
