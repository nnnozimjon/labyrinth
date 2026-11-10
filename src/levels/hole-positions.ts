import type { HolePosition } from "../entities/holes";

/**
 * Loss-hole trigger centres per level, in board-local X/Z. They must match the openings cut
 * into that level's board model; level 1 has none.
 */
export const LEVEL_HOLE_POSITIONS: Readonly<Record<number, readonly HolePosition[]>> = {
  2: [
    { x: -2.21, z: 2.42 },
    { x: 2.08, z: -0.14 },
    { x: -2.21, z: -0.15 },
    { x: -2.21, z: -2.49 },
    { x: 2.08, z: -2.49 },
  ],
  3: [
    { x: 2.37, z: 3.95 },
    { x: -2.2, z: 3.96 },
    { x: -2.2, z: 0.08 },
    { x: 2.37, z: -3.7 },
  ],
};
