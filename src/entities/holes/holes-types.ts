import type * as THREE from "three";
import type { PhysicsBall } from "../ball/PhysicsBall";

export type HolePosition = {
  x: number;
  z: number;
};

/** Shared API for per-level loss-hole trigger systems. */
export type HoleLossTriggers = {
  readonly isActive: boolean;
  onLoss(callback: () => void): void;
  reset(): void;
  setActive(active: boolean): void;
  update(delta: number, ball: PhysicsBall): void;
  getDebugHelpers(): THREE.Object3D[];
};
