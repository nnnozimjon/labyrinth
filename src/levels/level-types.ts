import type * as THREE from "three";
import type { PhysicsBoard } from "../entities/board/PhysicsBoard";
import type { PhysicsPuzzle } from "../entities/board/PhysicsPuzzle";
import type { PuzzleFanRotation } from "../entities/board/PuzzleFanRotation";
import type { Level3GiftBox } from "../entities/board/Level3GiftBox";
import type { LossHoles } from "../entities/holes";

/** Everything that belongs to one level and is swapped out when the level changes. */
export type LevelContent = {
  readonly board: PhysicsBoard;
  readonly puzzle: PhysicsPuzzle;
  readonly fans: readonly PuzzleFanRotation[];
  /** Loss holes, or null on levels without them. */
  readonly holes: LossHoles | null;
  /** Collectible gift, or null on levels without one. */
  readonly giftBox: Level3GiftBox | null;
};

export type PuzzleVisuals = THREE.Object3D[];
