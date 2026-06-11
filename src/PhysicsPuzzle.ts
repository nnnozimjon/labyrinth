import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { PhysicsBoard } from "./PhysicsBoard";
import {
  addBoardBodyColliders,
  placeOnBoardSurface,
  prepareGltfMaterials,
  type BoardColliderMode,
} from "./physicsUtils";
import {
  applyMaterialOverrides,
  type MaterialOverrideMap,
} from "./materialUtils";
import {
  applyModelTexture,
  pickModelTextureOptions,
  type ModelTextureOptions,
} from "./textureUtils";

export type PuzzlePlacement = {
  position: { x: number; y?: number; z: number };
  rotation?: { x?: number; y?: number; z?: number };
};

export type PhysicsPuzzleOptions = {
  scale?: number;
  placements: PuzzlePlacement[];
  colliderMode?: BoardColliderMode;
  flatnessThreshold?: number;
  /** Skip colliders for meshes under these named objects (e.g. rotating parts). */
  excludeColliderObjectNames?: string[];
  materialOverrides?: MaterialOverrideMap;
} & Partial<ModelTextureOptions>;

type RapierModule = typeof RAPIER;

const loader = new GLTFLoader();

export class PhysicsPuzzle {
  readonly visuals: THREE.Object3D[];

  private constructor(visuals: THREE.Object3D[]) {
    this.visuals = visuals;
  }

  static async create(
    RAPIER: RapierModule,
    world: RAPIER.World,
    board: PhysicsBoard,
    modelUrl: string,
    options: PhysicsPuzzleOptions
  ): Promise<PhysicsPuzzle> {
    const gltf = await loader.loadAsync(modelUrl);
    const scale = options.scale ?? board.scale;
    const visuals: THREE.Object3D[] = [];

    for (const placement of options.placements) {
      const instance = gltf.scene.clone();
      prepareGltfMaterials(instance);

      if (options.materialOverrides) {
        applyMaterialOverrides(instance, options.materialOverrides);
      }

      const textureOptions = pickModelTextureOptions(options);
      if (textureOptions) {
        await applyModelTexture(instance, textureOptions);
      }

      if (scale !== 1) {
        instance.scale.multiplyScalar(scale);
      }

      instance.position.sub(board.centerOffset);
      instance.position.x += placement.position.x;
      instance.position.z += placement.position.z;

      instance.rotation.set(
        placement.rotation?.x ?? 0,
        placement.rotation?.y ?? 0,
        placement.rotation?.z ?? 0
      );

      placeOnBoardSurface(instance, placement.position.y ?? 0);

      board.visual.add(instance);
      visuals.push(instance);

      addBoardBodyColliders(RAPIER, world, board.body, instance, {
        colliderMode: options.colliderMode ?? "auto",
        flatnessThreshold: options.flatnessThreshold,
        excludeObjectNames: options.excludeColliderObjectNames,
      });
    }

    return new PhysicsPuzzle(visuals);
  }
}
