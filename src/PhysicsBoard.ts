import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type RAPIER from "@dimforge/rapier3d-compat";
import {
  centerModelAtPivot,
  extractLocalTrimesh,
  getBounds,
  isMostlyFlat,
  prepareGltfMaterials,
  type ObjectBounds,
} from "./physicsUtils";
import {
  applyModelTexture,
  pickModelTextureOptions,
  type ModelTextureOptions,
} from "./textureUtils";

export type PhysicsBoardOptions = {
  /** Uniform scale applied to the model before bounds and colliders are computed. */
  scale?: number;
  /**
   * Use a simple box collider for flat boards without holes (faster).
   * Defaults to false — trimesh is used so cutouts/holes in the mesh work correctly.
   */
  useBoxCollider?: boolean;
  /** Height-to-width ratio below which a box collider is allowed when useBoxCollider is true. */
  flatnessThreshold?: number;
} & Partial<ModelTextureOptions>;

type RapierModule = typeof RAPIER;

const loader = new GLTFLoader();

export class PhysicsBoard {
  readonly visual: THREE.Group;
  readonly body: RAPIER.RigidBody;
  readonly bounds: ObjectBounds;
  readonly surfaceY: number;
  readonly scale: number;
  readonly centerOffset: THREE.Vector3;

  private constructor(
    visual: THREE.Group,
    body: RAPIER.RigidBody,
    bounds: ObjectBounds,
    surfaceY: number,
    scale: number,
    centerOffset: THREE.Vector3
  ) {
    this.visual = visual;
    this.body = body;
    this.bounds = bounds;
    this.surfaceY = surfaceY;
    this.scale = scale;
    this.centerOffset = centerOffset;
  }

  static async create(
    RAPIER: RapierModule,
    world: RAPIER.World,
    tiltingBoardGroup: THREE.Object3D,
    modelUrl: string,
    options: PhysicsBoardOptions = {}
  ): Promise<PhysicsBoard> {
    const gltf = await loader.loadAsync(modelUrl);
    const model = gltf.scene.clone();
    prepareGltfMaterials(model);

    const textureOptions = pickModelTextureOptions(options);
    if (textureOptions) {
      await applyModelTexture(model, textureOptions);
    }

    const scale = options.scale ?? 1;
    if (scale !== 1) {
      model.scale.multiplyScalar(scale);
    }

    const preCenterBounds = getBounds(model);
    const centerOffset = preCenterBounds.center.clone();
    const bounds = centerModelAtPivot(model);
    const flatnessThreshold = options.flatnessThreshold ?? 0.15;
    const useBoxCollider =
      options.useBoxCollider === true &&
      isMostlyFlat(bounds.size, flatnessThreshold);

    const visual = new THREE.Group();
    visual.add(model);

    const bodyY = -bounds.size.y / 2;
    const surfaceY = 0;

    visual.position.set(0, bodyY, 0);
    tiltingBoardGroup.add(visual);

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      0,
      bodyY,
      0
    );
    const body = world.createRigidBody(bodyDesc);

    if (useBoxCollider) {
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(
          bounds.size.x / 2,
          bounds.size.y / 2,
          bounds.size.z / 2
        ),
        body
      );
    } else {
      const { vertices, indices } = extractLocalTrimesh(model);
      world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices), body);
    }

    return new PhysicsBoard(visual, body, bounds, surfaceY, scale, centerOffset);
  }

  setRotation(quaternion: THREE.Quaternion) {
    this.visual.quaternion.copy(quaternion);
    this.body.setNextKinematicRotation({
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w,
    });
  }
}
