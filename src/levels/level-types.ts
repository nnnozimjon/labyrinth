import type * as THREE from "three";
import type { PhysicsBoard } from "../entities/board/PhysicsBoard";
import type { PhysicsPuzzle } from "../entities/board/PhysicsPuzzle";
import type { PuzzleFanRotation } from "../entities/board/PuzzleFanRotation";
import type { Level3GiftBox } from "../entities/board/Level3GiftBox";
import type { BoostPad } from "../entities/boost-pad";
import type { HoleLossTriggers } from "../entities/holes";

export type LevelContent = {
  board: PhysicsBoard;
  puzzle: PhysicsPuzzle;
  holes: HoleLossTriggers | null;
  fans: PuzzleFanRotation[];
  giftBox?: Level3GiftBox | null;
  boostPads: BoostPad[];
};

export type LevelTransitionPhase = "none" | "waiting" | "level_out" | "level_in";

export type PuzzleVisuals = THREE.Object3D[];
