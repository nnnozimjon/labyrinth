import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/** Sounds exported by `virtual:game-sounds`, by export name. */
const GAME_SOUNDS = {
  ballHit: "./src/ball-hit.ogg",
  loss: "./src/loss.ogg",
};

/**
 * Serves `virtual:game-sounds`: the game's sounds as `data:` URLs inside the JavaScript.
 *
 * Download managers such as IDM catch requests whose URL ends in an audio extension and pop up
 * a download dialog while the game loads. Importing the files directly (even with `?inline`)
 * still requests a `.ogg` URL in dev, so the plugin reads them itself: no audio file is ever
 * requested, in dev or in a build. The sounds are small (about 25 KB together).
 */
function inlineGameSounds(): Plugin {
  const publicId = "virtual:game-sounds";
  const resolvedId = `\0${publicId}`;
  return {
    name: "inline-game-sounds",
    resolveId: (id) => (id === publicId ? resolvedId : undefined),
    load(id) {
      if (id !== resolvedId) return undefined;
      return Object.entries(GAME_SOUNDS)
        .map(([name, path]) => {
          const file = fileURLToPath(new URL(path, import.meta.url));
          this.addWatchFile(file);
          const base64 = readFileSync(file).toString("base64");
          return `export const ${name} = "data:audio/ogg;base64,${base64}";`;
        })
        .join("\n");
    },
  };
}

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
  plugins: [inlineGameSounds()],
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
