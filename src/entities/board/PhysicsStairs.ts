import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { PhysicsBoard } from "./PhysicsBoard";
import {
  PhysicsStaticEnvironment,
  type StaticEnvironmentOptions,
} from "./PhysicsStaticEnvironment";

export type PhysicsStairsOptions = StaticEnvironmentOptions;

type RapierModule = typeof RAPIER;

export class PhysicsStairs {
  readonly environment: PhysicsStaticEnvironment;

  private constructor(environment: PhysicsStaticEnvironment) {
    this.environment = environment;
  }

  static async create(
    RAPIER: RapierModule,
    world: RAPIER.World,
    staticWorldGroup: THREE.Object3D,
    board: PhysicsBoard,
    modelUrl: string,
    options: PhysicsStairsOptions = {}
  ): Promise<PhysicsStairs> {
    const environment = await PhysicsStaticEnvironment.create(
      RAPIER,
      world,
      staticWorldGroup,
      modelUrl,
      {
        colliderMode: "trimesh",
        alignWithBoard: true,
        ...options,
      },
      board
    );
    return new PhysicsStairs(environment);
  }
}
