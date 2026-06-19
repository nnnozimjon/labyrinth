import * as THREE from "three";
import { gltfLoader } from "../../utils/gltf-loader";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { PhysicsBoard } from "./PhysicsBoard";
import {
  addBoardBodyColliders,
  placeOnBoardSurface,
  prepareGltfMaterials,
  type BoardColliderMode,
} from "../../physics/collider-utils";
import {
  applyMaterialOverrides,
  type MaterialOverrideMap,
} from "../../utils/material-utils";
import {
  applyModelTexture,
  pickModelTextureOptions,
  type ModelTextureOptions,
} from "../../utils/texture-utils";

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

export class PhysicsPuzzle {
  readonly visuals: THREE.Object3D[];
  private readonly colliders: RAPIER.Collider[];

  private constructor(visuals: THREE.Object3D[], colliders: RAPIER.Collider[]) {
    this.visuals = visuals;
    this.colliders = colliders;
  }

  static async create(
    RAPIER: RapierModule,
    world: RAPIER.World,
    board: PhysicsBoard,
    modelUrl: string,
    options: PhysicsPuzzleOptions
  ): Promise<PhysicsPuzzle> {
    const gltf = await gltfLoader.loadAsync(modelUrl);
    const scale = options.scale ?? board.scale;
    const visuals: THREE.Object3D[] = [];
    const colliders: RAPIER.Collider[] = [];

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

      colliders.push(
        ...addBoardBodyColliders(RAPIER, world, board.body, instance, {
          colliderMode: options.colliderMode ?? "auto",
          flatnessThreshold: options.flatnessThreshold,
          excludeObjectNames: options.excludeColliderObjectNames,
        })
      );
    }

    return new PhysicsPuzzle(visuals, colliders);
  }

  getColliders(): readonly RAPIER.Collider[] {
    return this.colliders;
  }

  setCollidersEnabled(enabled: boolean) {
    for (const collider of this.colliders) {
      collider.setEnabled(enabled);
    }
  }

  setVisible(visible: boolean) {
    for (const visual of this.visuals) {
      visual.visible = visible;
    }
  }

  setEnabled(enabled: boolean) {
    this.setVisible(enabled);
    this.setCollidersEnabled(enabled);
  }
}
