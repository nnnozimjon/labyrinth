import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type RAPIER from "@dimforge/rapier3d-compat";
import { prepareGltfMaterials } from "./physicsUtils";

export type PhysicsBallOptions = {
  /** Override the auto-calculated sphere collider radius. */
  colliderRadius?: number;
  restitution?: number;
  startPosition?: THREE.Vector3;
};

type RapierModule = typeof RAPIER;

const loader = new GLTFLoader();

function centerModelAndGetRadius(model: THREE.Object3D): number {
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  const centeredBox = new THREE.Box3().setFromObject(model);
  const boundingSphere = new THREE.Sphere();
  centeredBox.getBoundingSphere(boundingSphere);

  return boundingSphere.radius;
}

function scaleModelToRadius(model: THREE.Object3D, currentRadius: number, targetRadius: number) {
  if (currentRadius <= 0) return;
  const scale = targetRadius / currentRadius;
  model.scale.multiplyScalar(scale);
}

export class PhysicsBall {
  readonly visual: THREE.Group;
  readonly body: RAPIER.RigidBody;
  readonly colliderRadius: number;
  private readonly startPosition: THREE.Vector3;

  private constructor(
    visual: THREE.Group,
    body: RAPIER.RigidBody,
    colliderRadius: number,
    startPosition: THREE.Vector3
  ) {
    this.visual = visual;
    this.body = body;
    this.colliderRadius = colliderRadius;
    this.startPosition = startPosition.clone();
  }

  static async create(
    RAPIER: RapierModule,
    world: RAPIER.World,
    scene: THREE.Scene,
    modelUrl: string,
    options: PhysicsBallOptions = {}
  ): Promise<PhysicsBall> {
    const gltf = await loader.loadAsync(modelUrl);
    const model = gltf.scene.clone();
    prepareGltfMaterials(model);

    const measuredRadius = centerModelAndGetRadius(model);
    const colliderRadius = options.colliderRadius ?? measuredRadius;

    if (options.colliderRadius !== undefined) {
      scaleModelToRadius(model, measuredRadius, colliderRadius);
    }

    const visual = new THREE.Group();
    visual.add(model);

    const startPosition = options.startPosition ?? new THREE.Vector3(0, 0, 0);
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(startPosition.x, startPosition.y, startPosition.z);
    const body = world.createRigidBody(bodyDesc);

    world.createCollider(
      RAPIER.ColliderDesc.ball(0.3).setRestitution(options.restitution ?? 0.6),
      body
    );

    visual.position.copy(startPosition);
    scene.add(visual);

    return new PhysicsBall(visual, body, 0.3, startPosition);
  }

  reset() {
    this.body.setTranslation(
      { x: this.startPosition.x, y: this.startPosition.y, z: this.startPosition.z },
      true
    );
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.wakeUp();
  }

  syncFromPhysics(fallThreshold = -5) {
    const position = this.body.translation();

    if (position.y < fallThreshold) {
      this.reset();
      return;
    }

    const rotation = this.body.rotation();
    this.visual.position.set(position.x, position.y, position.z);
    this.visual.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }
}