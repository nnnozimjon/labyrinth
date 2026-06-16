import * as THREE from "three";
import type { PhysicsBall } from "../ball/PhysicsBall";
import { loadModelTexture } from "../../utils/texture-utils";
import { disposeObject3D } from "../../utils/dispose";
import {
  createBoostPadMaterial,
  updateBoostPadMaterial,
} from "./boost-pad-material";

const DEFAULT_IMPULSE_STRENGTH = 5;
const DEFAULT_TRIGGER_RADIUS = 0.5;
/** World-space diameter of the circular pad (matches texture circle). */
const DEFAULT_PAD_DIAMETER = 1.05;
const DEFAULT_COOLDOWN = 0.4;
const TRIGGER_HEIGHT = 0.02;
const DEBUG_BOOST_TRIGGER = false;
const BOOST_FLASH_DECAY = 4.5;

/** Local axis the arrow texture points along once laid flat on the board. */
const ARROW_FORWARD = new THREE.Vector3(0, 0, -1);

export type BoostPadOptions = {
  textureUrl: string;
  position?: THREE.Vector3;
  /** Y-axis rotation in radians — controls impulse direction. */
  rotationY?: number;
  scale?: number;
  impulseStrength?: number;
  triggerRadius?: number;
  cooldown?: number;
  /** Optional upward impulse component (0 = horizontal only). */
  liftStrength?: number;
};

export class BoostPad {
  readonly visual: THREE.Group;

  private readonly material: THREE.ShaderMaterial;
  private readonly directionMarker: THREE.Object3D;
  private readonly triggerMesh: THREE.Mesh;
  private readonly triggerCenterWorld = new THREE.Vector3();
  private readonly impulseDirection = new THREE.Vector3();

  private time = 0;
  private boostFlash = 0;
  private cooldownTimer = 0;
  private ballInside = false;
  private active = false;
  private removed = false;
  private impulseStrength: number;
  private liftStrength: number;
  private triggerRadius: number;
  private cooldown: number;

  private constructor(
    visual: THREE.Group,
    material: THREE.ShaderMaterial,
    directionMarker: THREE.Object3D,
    triggerMesh: THREE.Mesh,
    impulseStrength: number,
    liftStrength: number,
    triggerRadius: number,
    cooldown: number
  ) {
    this.visual = visual;
    this.material = material;
    this.directionMarker = directionMarker;
    this.triggerMesh = triggerMesh;
    this.impulseStrength = impulseStrength;
    this.liftStrength = liftStrength;
    this.triggerRadius = triggerRadius;
    this.cooldown = cooldown;
  }

  static async create(
    parent: THREE.Object3D,
    options: BoostPadOptions
  ): Promise<BoostPad> {
    const texture = await loadModelTexture(options.textureUrl, {
      flipY: true,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    });

    const padScale = options.scale ?? 1;
    const padDiameter = DEFAULT_PAD_DIAMETER * padScale;
    const material = createBoostPadMaterial(texture);

    const padGeometry = new THREE.PlaneGeometry(padDiameter, padDiameter);
    const padMesh = new THREE.Mesh(padGeometry, material);
    padMesh.rotation.x = -Math.PI / 2;
    padMesh.position.y = 0.012;
    padMesh.renderOrder = 5;
    padMesh.userData.boostPad = true;

    const directionMarker = new THREE.Object3D();
    directionMarker.position.y = 0.02;
    directionMarker.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, -1),
      ARROW_FORWARD.clone()
    );

    const triggerRadius = options.triggerRadius ?? DEFAULT_TRIGGER_RADIUS * padScale;
    const triggerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(triggerRadius, triggerRadius, TRIGGER_HEIGHT, 32),
      new THREE.MeshBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.3,
        wireframe: true,
        depthWrite: false,
      })
    );
    triggerMesh.position.y = 0.01;
    triggerMesh.visible = DEBUG_BOOST_TRIGGER;
    triggerMesh.name = "boost-pad-trigger";

    const visual = new THREE.Group();
    visual.name = "boost-pad";
    visual.position.copy(options.position ?? new THREE.Vector3());
    visual.rotation.y = options.rotationY ?? 0;

    visual.add(padMesh);
    visual.add(directionMarker);
    visual.add(triggerMesh);
    parent.add(visual);

    return new BoostPad(
      visual,
      material,
      directionMarker,
      triggerMesh,
      options.impulseStrength ?? DEFAULT_IMPULSE_STRENGTH,
      options.liftStrength ?? 0.35,
      triggerRadius,
      options.cooldown ?? DEFAULT_COOLDOWN
    );
  }

  get isRemoved(): boolean {
    return this.removed;
  }

  getDebugHelpers(): THREE.Object3D[] {
    return [this.triggerMesh];
  }

  setActive(active: boolean) {
    if (this.removed) return;

    this.active = active;
    this.visual.visible = active;

    if (!active) {
      this.ballInside = false;
      this.cooldownTimer = 0;
      this.boostFlash = 0;
    }
  }

  removeFromScene() {
    if (this.removed) return;

    this.removed = true;
    this.active = false;
    this.visual.parent?.remove(this.visual);
    disposeObject3D(this.visual);
    this.material.dispose();
  }

  private getImpulseDirection(out: THREE.Vector3): THREE.Vector3 {
    this.directionMarker.updateWorldMatrix(true, false);
    this.directionMarker.getWorldDirection(out);
    out.y = 0;

    if (out.lengthSq() < 1e-6) {
      out.set(0, 0, -1);
    } else {
      out.normalize();
    }

    return out;
  }

  private isBallInside(ball: PhysicsBall): boolean {
    this.triggerMesh.updateWorldMatrix(true, false);
    this.triggerMesh.getWorldPosition(this.triggerCenterWorld);

    const ballPosition = ball.body.translation();
    const dx = ballPosition.x - this.triggerCenterWorld.x;
    const dz = ballPosition.z - this.triggerCenterWorld.z;
    const distanceXZ = Math.sqrt(dx * dx + dz * dz);
    const yDelta = ballPosition.y - this.triggerCenterWorld.y;

    return (
      distanceXZ <= this.triggerRadius &&
      yDelta >= -ball.colliderRadius &&
      yDelta <= ball.colliderRadius + 0.35
    );
  }

  private triggerBoost(ball: PhysicsBall) {
    this.getImpulseDirection(this.impulseDirection);
    ball.applyImpulse(this.impulseDirection, this.impulseStrength, this.liftStrength);
    this.cooldownTimer = this.cooldown;
    this.boostFlash = 1;
  }

  update(delta: number, ball: PhysicsBall) {
    if (this.removed) return;

    this.time += delta;
    this.boostFlash = Math.max(0, this.boostFlash - delta * BOOST_FLASH_DECAY);
    updateBoostPadMaterial(this.material, this.time, this.boostFlash);

    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - delta);
    }

    if (!this.active || this.cooldownTimer > 0) return;

    const inside = this.isBallInside(ball);

    if (inside && !this.ballInside) {
      this.triggerBoost(ball);
    }

    this.ballInside = inside;
  }
}
