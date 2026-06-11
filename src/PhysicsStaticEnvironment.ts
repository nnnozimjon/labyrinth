import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { PhysicsBoard } from "./PhysicsBoard";
import {
  addBoardBodyColliders,
  prepareGltfMaterials,
  restObjectBottomAtY,
  type BoardColliderMode,
} from "./physicsUtils";
import {
  applyMaterialTexturesToModel,
  applyMeshTexturesToModel,
  applyModelTexture,
  pickModelTextureOptions,
  type MaterialTextureMap,
  type MeshTextureMap,
  type ModelTextureOptions,
} from "./textureUtils";
import {
  applyMaterialColorsToModel,
  applyMaterialOverrides,
  type MaterialColorMap,
  type MaterialOverrideMap,
  type MeshColorMap,
} from "./materialUtils";

export type StaticEnvironmentOptions = {
  scale?: number;
  position?: { x?: number; y?: number; z?: number };
  rotation?: { x?: number; y?: number; z?: number };
  /** Rest the model's bottom on this world Y after placement. */
  restOnY?: number;
  colliderMode?: BoardColliderMode;
  flatnessThreshold?: number;
  /** Align using the board's center offset (for board-relative props like stairs). */
  alignWithBoard?: boolean;
  /**
   * Keep the GLB's authored transform (position, rotation, scale).
   * Skips alignWithBoard, position/rotation offsets, restOnY, and board scale default.
   */
  preserveOriginalTransform?: boolean;
  /** Create physics colliders. Defaults to true. */
  enableColliders?: boolean;
  /** Override PBR settings on materials matched by name. */
  materialOverrides?: MaterialOverrideMap;
  /** Per-material texture URLs matched by GLB material name. */
  materialTextures?: MaterialTextureMap;
  /** Per-mesh texture URLs matched by GLB mesh/object name. */
  meshTextures?: MeshTextureMap;
  /** Solid colors by GLB material name (clears texture maps). */
  materialColors?: MaterialColorMap;
  /** Solid colors by GLB mesh/object name (clears texture maps). */
  meshColors?: MeshColorMap;
  /** Fallback solid color when no material/mesh entry matches. */
  defaultMaterialColor?: THREE.ColorRepresentation;
} & Partial<ModelTextureOptions>;

type RapierModule = typeof RAPIER;

const loader = new GLTFLoader();

export class PhysicsStaticEnvironment {
  readonly visual: THREE.Object3D;
  readonly body: RAPIER.RigidBody | null;

  private constructor(visual: THREE.Object3D, body: RAPIER.RigidBody | null) {
    this.visual = visual;
    this.body = body;
  }

  static async create(
    RAPIER: RapierModule,
    world: RAPIER.World,
    staticWorldGroup: THREE.Object3D,
    modelUrl: string,
    options: StaticEnvironmentOptions = {},
    board?: PhysicsBoard
  ): Promise<PhysicsStaticEnvironment> {
    const gltf = await loader.loadAsync(modelUrl);
    const model = gltf.scene;
    prepareGltfMaterials(model);

    if (options.materialOverrides) {
      applyMaterialOverrides(model, options.materialOverrides);
    }

    const textureOptions = pickModelTextureOptions(options);
    if (textureOptions) {
      await applyModelTexture(model, textureOptions);
    }

    if (options.materialTextures) {
      await applyMaterialTexturesToModel(
        model,
        options.materialTextures,
        options
      );
    }

    if (options.meshTextures) {
      await applyMeshTexturesToModel(model, options.meshTextures, options);
    }

    if (
      options.materialColors ||
      options.meshColors ||
      options.defaultMaterialColor !== undefined
    ) {
      applyMaterialColorsToModel(model, {
        materialColors: options.materialColors,
        meshColors: options.meshColors,
        defaultMaterialColor: options.defaultMaterialColor,
      });
    }

    const preserveOriginalTransform = options.preserveOriginalTransform ?? false;
    const scale = preserveOriginalTransform
      ? (options.scale ?? 1)
      : (options.scale ?? board?.scale ?? 1);
    if (scale !== 1) {
      model.scale.multiplyScalar(scale);
    }

    if (!preserveOriginalTransform) {
      if (options.alignWithBoard && board) {
        model.position.sub(board.centerOffset);
      }

      model.position.x += options.position?.x ?? 0;
      model.position.y += options.position?.y ?? 0;
      model.position.z += options.position?.z ?? 0;

      model.rotation.set(
        options.rotation?.x ?? 0,
        options.rotation?.y ?? 0,
        options.rotation?.z ?? 0
      );

      if (options.restOnY !== undefined) {
        restObjectBottomAtY(model, options.restOnY);
      }
    }

    model.updateMatrixWorld(true);

    staticWorldGroup.add(model);

    let body: RAPIER.RigidBody | null = null;
    if (options.enableColliders !== false) {
      body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
      addBoardBodyColliders(RAPIER, world, body, model, {
        colliderMode: options.colliderMode ?? "auto",
        flatnessThreshold: options.flatnessThreshold,
      });
    }

    return new PhysicsStaticEnvironment(model, body);
  }
}
