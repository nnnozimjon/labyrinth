/// <reference types="vite/client" />

/** The game's sounds as `data:` URLs, inlined by the `inline-game-sounds` plugin in vite.config.ts. */
declare module "virtual:game-sounds" {
  export const ballHit: string;
  export const loss: string;
}
