import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { loadGltf } from "../../utils/gltf-loader";
import { applyCollisionEvents, prepareGltfMaterials } from "../../physics/collider-utils";
import { BALL_RADIUS, BALL_RESTITUTION } from "../../utils/constants";

export type PhysicsBallOptions = {
  /** Collider radius; the model is scaled to match. Defaults to BALL_RADIUS. */
  radius?: number;
  restitution?: number;
  spawn?: THREE.Vector3Like;
};

type RapierModule = typeof RAPIER;

const ZERO = { x: 0, y: 0, z: 0 };
const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };

/** Scales the model so its widest extent equals `radius`, then centres it on its origin. */
function fitModelToRadius(model: THREE.Object3D, radius: number) {
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const currentRadius = Math.max(size.x, size.y, size.z) / 2;
  if (currentRadius > 0) {
    model.scale.multiplyScalar(radius / currentRadius);
  }
  const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
  model.position.sub(center);
}

export class PhysicsBall {
  readonly visual: THREE.Group;
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly radius: number;
  private readonly spawn = new THREE.Vector3();
  private frozen = false;

  // Poses after the last two physics steps; the visual is drawn between them.
  private readonly previousPosition = new THREE.Vector3();
  private readonly currentPosition = new THREE.Vector3();
  private readonly previousRotation = new THREE.Quaternion();
  private readonly currentRotation = new THREE.Quaternion();

  private constructor(
    visual: THREE.Group,
    body: RAPIER.RigidBody,
    collider: RAPIER.Collider,
    radius: number,
    spawn: THREE.Vector3Like
  ) {
    this.visual = visual;
    this.body = body;
    this.collider = collider;
    this.radius = radius;
    this.spawn.copy(spawn);
  }

  static async create(
    RAPIER: RapierModule,
    world: RAPIER.World,
    scene: THREE.Scene,
    modelUrl: string,
    options: PhysicsBallOptions = {}
  ): Promise<PhysicsBall> {
    const gltf = await loadGltf(modelUrl);
    const model = gltf.scene.clone();
    prepareGltfMaterials(model);

    const radius = options.radius ?? BALL_RADIUS;
    fitModelToRadius(model, radius);

    const visual = new THREE.Group();
    visual.name = "ball";
    visual.add(model);
    scene.add(visual);

    const spawn = options.spawn ?? { x: 0, y: radius, z: 0 };
    // CCD keeps a fast ball from skipping through thin colliders between two steps.
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, spawn.y, spawn.z)
        .setCcdEnabled(true)
    );
    const collider = world.createCollider(
      applyCollisionEvents(
        RAPIER,
        RAPIER.ColliderDesc.ball(radius).setRestitution(
          options.restitution ?? BALL_RESTITUTION
        )
      ),
      body
    );

    const ball = new PhysicsBall(visual, body, collider, radius, spawn);
    ball.snapPose();
    return ball;
  }

  get isFrozen(): boolean {
    return this.frozen;
  }

  /** Puts the ball back in play: at its spawn point (optionally a new one), at rest, visible. */
  respawn(spawn?: THREE.Vector3Like) {
    if (spawn) this.spawn.copy(spawn);
    this.unfreeze();

    this.body.setTranslation(this.spawn, true);
    this.body.setRotation(IDENTITY, true);
    this.body.setLinvel(ZERO, true);
    this.body.setAngvel(ZERO, true);

    this.visual.visible = true;
    this.snapPose();
  }

  /** Pins the ball where it is (kinematic) while overlays, cinematics or transitions run. */
  freeze() {
    if (this.frozen) return;
    this.frozen = true;

    this.body.setLinvel(ZERO, true);
    this.body.setAngvel(ZERO, true);
    this.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    this.body.setNextKinematicTranslation(this.body.translation());
    this.body.setNextKinematicRotation(this.body.rotation());
  }

  unfreeze() {
    if (!this.frozen) return;
    this.frozen = false;

    this.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    this.body.wakeUp();
  }

  setVisible(visible: boolean) {
    this.visual.visible = visible;
  }

  /** False if the simulation produced non-finite values (the ball would vanish for good). */
  hasValidState(): boolean {
    const p = this.body.translation();
    const v = this.body.linvel();
    return Number.isFinite(p.x + p.y + p.z + v.x + v.y + v.z);
  }

  /** Records the rigid-body pose; call after every physics step. */
  capturePose() {
    this.previousPosition.copy(this.currentPosition);
    this.previousRotation.copy(this.currentRotation);
    this.readBodyPose();
  }

  /**
   * Places the visual `alpha` of the way from the previous to the latest physics pose, so
   * motion stays smooth when the display rate is not a multiple of the physics rate.
   */
  syncVisual(alpha = 1) {
    this.visual.position.lerpVectors(this.previousPosition, this.currentPosition, alpha);
    this.visual.quaternion.slerpQuaternions(this.previousRotation, this.currentRotation, alpha);
  }

  /** Jumps the visual to the body without interpolating (after a teleport). */
  private snapPose() {
    this.readBodyPose();
    this.previousPosition.copy(this.currentPosition);
    this.previousRotation.copy(this.currentRotation);
    this.syncVisual();
  }

  private readBodyPose() {
    const p = this.body.translation();
    const q = this.body.rotation();
    this.currentPosition.set(p.x, p.y, p.z);
    this.currentRotation.set(q.x, q.y, q.z, q.w);
  }
}
