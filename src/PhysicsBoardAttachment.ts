import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { PhysicsBoard } from "./PhysicsBoard";
import {
  addBoardBodyColliders,
  prepareGltfMaterials,
  type BoardColliderMode,
} from "./physicsUtils";
import {
  applyModelTexture,
  pickModelTextureOptions,
  type ModelTextureOptions,
} from "./textureUtils";
import {
  applyMaterialOverrides,
  type MaterialOverrideMap,
} from "./materialUtils";

export type PhysicsBoardAttachmentOptions = {
  /** Should match the board scale so the model aligns with the ground. */
  scale?: number;
  /** `trimesh` always uses mesh colliders; `auto` may use boxes for simple meshes. */
  colliderMode?: BoardColliderMode;
  flatnessThreshold?: number;
  materialOverrides?: MaterialOverrideMap;
} & Partial<ModelTextureOptions>;

type RapierModule = typeof RAPIER;

const loader = new GLTFLoader();

export class PhysicsBoardAttachment {
  readonly visual: THREE.Object3D;

  private constructor(visual: THREE.Object3D) {
    this.visual = visual;
  }

  static async create(
    RAPIER: RapierModule,
    world: RAPIER.World,
    board: PhysicsBoard,
    modelUrl: string,
    options: PhysicsBoardAttachmentOptions = {}
  ): Promise<PhysicsBoardAttachment> {
    const gltf = await loader.loadAsync(modelUrl);
    const model = gltf.scene.clone();
    prepareGltfMaterials(model);

    if (options.materialOverrides) {
      applyMaterialOverrides(model, options.materialOverrides);
    }

    const textureOptions = pickModelTextureOptions(options);
    if (textureOptions) {
      await applyModelTexture(model, textureOptions);
    }

    const scale = options.scale ?? board.scale;
    if (scale !== 1) {
      model.scale.multiplyScalar(scale);
    }

    model.position.sub(board.centerOffset);
    model.updateMatrixWorld(true);

    board.visual.add(model);

    addBoardBodyColliders(RAPIER, world, board.body, model, {
      colliderMode: options.colliderMode ?? "auto",
      flatnessThreshold: options.flatnessThreshold,
    });

    return new PhysicsBoardAttachment(model);
  }
}
