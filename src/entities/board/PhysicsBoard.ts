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
} from "../../physics/collider-utils";
import {
  applyModelTexture,
  pickModelTextureOptions,
  type ModelTextureOptions,
} from "../../utils/texture-utils";

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

/** Visual + physics anchor used by the board and shared attachments (walls, gate). */
export type BoardAnchor = {
  readonly visual: THREE.Object3D;
  readonly body: RAPIER.RigidBody;
  readonly centerOffset: THREE.Vector3;
  readonly scale: number;
};

export class PhysicsBoard implements BoardAnchor {
  readonly visual: THREE.Group;
  readonly body: RAPIER.RigidBody;
  readonly bounds: ObjectBounds;
  readonly surfaceY: number;
  readonly scale: number;
  readonly centerOffset: THREE.Vector3;
  private readonly colliders: RAPIER.Collider[];

  private constructor(
    visual: THREE.Group,
    body: RAPIER.RigidBody,
    bounds: ObjectBounds,
    surfaceY: number,
    scale: number,
    centerOffset: THREE.Vector3,
    colliders: RAPIER.Collider[]
  ) {
    this.visual = visual;
    this.body = body;
    this.bounds = bounds;
    this.surfaceY = surfaceY;
    this.scale = scale;
    this.centerOffset = centerOffset;
    this.colliders = colliders;
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

    const colliders: RAPIER.Collider[] = [];
    if (useBoxCollider) {
      colliders.push(
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(
            bounds.size.x / 2,
            bounds.size.y / 2,
            bounds.size.z / 2
          ),
          body
        )
      );
    } else {
      const { vertices, indices } = extractLocalTrimesh(model);
      colliders.push(
        world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices), body)
      );
    }

    return new PhysicsBoard(visual, body, bounds, surfaceY, scale, centerOffset, colliders);
  }

  /**
   * Empty kinematic anchor aligned with a board — for walls, gate, and other
   * shared content that must stay visible across level switches.
   */
  static createSharedAnchor(
    RAPIER: RapierModule,
    world: RAPIER.World,
    parent: THREE.Object3D,
    reference: PhysicsBoard
  ): BoardAnchor & { setRotation(quaternion: THREE.Quaternion): void } {
    const visual = new THREE.Group();
    visual.name = "board-shared";
    visual.position.copy(reference.visual.position);
    parent.add(visual);

    const translation = reference.body.translation();
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      translation.x,
      translation.y,
      translation.z
    );
    const body = world.createRigidBody(bodyDesc);

    return {
      visual,
      body,
      centerOffset: reference.centerOffset,
      scale: reference.scale,
      setRotation(quaternion: THREE.Quaternion) {
        visual.quaternion.copy(quaternion);
        body.setNextKinematicRotation({
          x: quaternion.x,
          y: quaternion.y,
          z: quaternion.z,
          w: quaternion.w,
        });
      },
    };
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
    this.visual.visible = visible;
  }

  setEnabled(enabled: boolean) {
    this.setVisible(enabled);
    this.setCollidersEnabled(enabled);
  }

  setOpacity(opacity: number) {
    this.visual.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const material of materials) {
        material.transparent = opacity < 1;
        material.opacity = opacity;
        material.needsUpdate = true;
      }
    });
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
