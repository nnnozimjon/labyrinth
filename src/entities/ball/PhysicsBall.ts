import * as THREE from "three";
import { gltfLoader } from "../../utils/gltf-loader";
import RAPIER from "@dimforge/rapier3d-compat";
import { applyCollisionEvents, prepareGltfMaterials } from "../../physics/collider-utils";

export type PhysicsBallOptions = {
  /** Override the auto-calculated sphere collider radius. */
  colliderRadius?: number;
  restitution?: number;
  startPosition?: THREE.Vector3;
};

type RapierModule = typeof RAPIER;

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
  readonly colliderHandle: number;
  readonly colliderRadius: number;
  private readonly startPosition: THREE.Vector3;

  autoResetEnabled = true;

  private constructor(
    visual: THREE.Group,
    body: RAPIER.RigidBody,
    colliderHandle: number,
    colliderRadius: number,
    startPosition: THREE.Vector3
  ) {
    this.visual = visual;
    this.body = body;
    this.colliderHandle = colliderHandle;
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
    const gltf = await gltfLoader.loadAsync(modelUrl);
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

    const collider = world.createCollider(
      applyCollisionEvents(
        RAPIER,
        RAPIER.ColliderDesc.ball(0.3).setRestitution(options.restitution ?? 0.6)
      ),
      body
    );

    visual.position.copy(startPosition);
    scene.add(visual);

    const ball = new PhysicsBall(visual, body, collider.handle, 0.3, startPosition);
    ball.ensureSpawnIntegrity(scene);
    return ball;
  }

  reset() {
    this.body.setTranslation(
      { x: this.startPosition.x, y: this.startPosition.y, z: this.startPosition.z },
      true
    );
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.wakeUp();

    this.visual.position.copy(this.startPosition);
    this.visual.quaternion.identity();
  }

  /** Ensures the ball is in the scene, visible, and at its spawn position. */
  ensureSpawnIntegrity(scene: THREE.Scene) {
    if (this.visual.parent !== scene) {
      this.visual.parent?.remove(this.visual);
      scene.add(this.visual);
    }

    this.visual.visible = true;

    const position = this.body.translation();
    const drift =
      Math.abs(position.x - this.startPosition.x) +
      Math.abs(position.y - this.startPosition.y) +
      Math.abs(position.z - this.startPosition.z);
    const belowSpawn = position.y < this.startPosition.y - 0.05;

    if (drift > 0.08 || belowSpawn) {
      this.reset();
    }
  }

  setStartPosition(position: THREE.Vector3 | { x: number; y: number; z: number }) {
    this.startPosition.set(position.x, position.y, position.z);
  }

  /** Stops the ball in place — used during gift pickup cinematic. */
  freeze() {
    const position = this.body.translation();
    const rotation = this.body.rotation();

    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    this.body.setNextKinematicTranslation(position);
    this.body.setNextKinematicRotation(rotation);

    this.visual.position.set(position.x, position.y, position.z);
    this.visual.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  unfreeze() {
    this.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    this.body.wakeUp();
  }

  /** Applies an impulse along a normalized direction (optionally with upward lift). */
  applyImpulse(direction: THREE.Vector3, strength: number, lift = 0) {
    const impulse = {
      x: direction.x * strength,
      y: direction.y * strength + lift,
      z: direction.z * strength,
    };

    this.body.applyImpulse(impulse, true);
    this.body.wakeUp();
  }

  syncFromPhysics(fallThreshold = -5) {
    const position = this.body.translation();

    if (position.y < fallThreshold) {
      if (this.autoResetEnabled) this.reset();
      return;
    }

    const rotation = this.body.rotation();
    this.visual.position.set(position.x, position.y, position.z);
    this.visual.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }
}