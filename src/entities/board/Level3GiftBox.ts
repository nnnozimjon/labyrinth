import * as THREE from "three";
import { gltfLoader } from "../../utils/gltf-loader";
import type { PhysicsBoard } from "./PhysicsBoard";
import type { PhysicsBall } from "../ball/PhysicsBall";
import {
  centerModelAtPivot,
  prepareGltfMaterials,
} from "../../physics/collider-utils";
import { disposeObject3D } from "../../utils/dispose";
import { easeInCubic } from "../../levels/puzzle-animation";

const DEFAULT_POSITION = new THREE.Vector3(0, 0, 0);
const DETECTION_RADIUS = 0.55;
const TRIGGER_HEIGHT = 0.01;
const DEBUG_GIFT_TRIGGER = false;
const GIFT_FADE_DURATION = 1.5;

/** Gentle idle motion — GLB morph clips deform volume so they are not used. */
const WIGGLE_SPEED_Y = 2.0;
const WIGGLE_SPEED_X = 1.35;
const WIGGLE_SPEED_BOB = 2.5;
const WIGGLE_ROT_Y = 0.1;
const WIGGLE_ROT_X = 0.05;
const WIGGLE_BOB_Y = 0.015;

export type Level3GiftBoxOptions = {
  position?: THREE.Vector3;
};

export class Level3GiftBox {
  readonly visual: THREE.Group;
  private readonly scaleGroup: THREE.Group;
  private readonly wigglePivot: THREE.Group;
  private readonly triggerMesh: THREE.Mesh;
  private readonly triggerCenterWorld = new THREE.Vector3();
  private readonly baseScale: number;
  private wiggleTime = 0;
  private active = false;
  private collected = false;
  private dismissing = false;
  private dismissTime = 0;
  private dismissDuration = GIFT_FADE_DURATION;
  private removed = false;
  private onCollectCallback: (() => void) | null = null;
  private onRemovedCallback: (() => void) | null = null;

  private constructor(
    visual: THREE.Group,
    scaleGroup: THREE.Group,
    wigglePivot: THREE.Group,
    triggerMesh: THREE.Mesh,
    baseScale: number
  ) {
    this.visual = visual;
    this.scaleGroup = scaleGroup;
    this.wigglePivot = wigglePivot;
    this.triggerMesh = triggerMesh;
    this.baseScale = baseScale;
  }

  static async create(
    board: PhysicsBoard,
    modelUrl: string,
    options: Level3GiftBoxOptions = {}
  ): Promise<Level3GiftBox> {
    const gltf = await gltfLoader.loadAsync(modelUrl);
    const model = gltf.scene.clone();
    prepareGltfMaterials(model);

    const giftNode = model.getObjectByName("gift");
    const modelScale = giftNode ? giftNode.scale.x : 1;

    if (giftNode) {
      giftNode.position.set(0, 0, 0);
      giftNode.scale.set(1, 1, 1);
      giftNode.rotation.set(0, 0, 0);
    }

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.morphTargetInfluences) return;
      child.morphTargetInfluences.fill(0);
    });

    centerModelAtPivot(model);

    const container = new THREE.Group();
    container.name = "level3-gift-box";
    container.position.copy(options.position ?? DEFAULT_POSITION);

    const scaleGroup = new THREE.Group();
    scaleGroup.name = "level3-gift-box-scale";
    const baseScale = modelScale * board.scale;
    scaleGroup.scale.setScalar(baseScale);

    const wigglePivot = new THREE.Group();
    wigglePivot.name = "level3-gift-box-wiggle";

    const triggerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(DETECTION_RADIUS, DETECTION_RADIUS, TRIGGER_HEIGHT, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.3,
        wireframe: true,
        depthWrite: false,
      })
    );
    triggerMesh.position.y = 0.15;
    triggerMesh.visible = DEBUG_GIFT_TRIGGER;
    triggerMesh.name = "gift-collect-trigger";

    wigglePivot.add(model);
    wigglePivot.add(triggerMesh);
    scaleGroup.add(wigglePivot);
    container.add(scaleGroup);
    board.visual.add(container);

    const instance = new Level3GiftBox(
      container,
      scaleGroup,
      wigglePivot,
      triggerMesh,
      baseScale
    );
    instance.setActive(false);
    return instance;
  }

  get isCollected(): boolean {
    return this.collected;
  }

  get isRemoved(): boolean {
    return this.removed;
  }

  getDebugHelpers(): THREE.Object3D[] {
    return [this.triggerMesh];
  }

  onCollect(callback: () => void) {
    this.onCollectCallback = callback;
  }

  setCollected(collected: boolean) {
    this.collected = collected;
  }

  /** Smoothly fades out and removes the gift from the scene. */
  fadeOut(duration = GIFT_FADE_DURATION, onRemoved?: () => void) {
    if (this.removed || this.dismissing) return;

    this.dismissing = true;
    this.dismissTime = 0;
    this.dismissDuration = duration;
    this.collected = true;
    this.onRemovedCallback = onRemoved ?? null;
  }

  private setOpacity(opacity: number) {
    this.visual.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        material.transparent = opacity < 1;
        material.opacity = opacity;
        material.needsUpdate = true;
      }
    });
  }

  private removeFromScene() {
    if (this.removed) return;

    this.removed = true;
    this.active = false;
    this.dismissing = false;
    this.visual.visible = false;
    this.visual.parent?.remove(this.visual);
    disposeObject3D(this.visual);
    this.onRemovedCallback?.();
    this.onRemovedCallback = null;
  }

  setActive(active: boolean) {
    if (this.removed) return;

    this.active = active;
    this.visual.visible = active;

    if (active) {
      this.wiggleTime = 0;
      this.wigglePivot.rotation.set(0, 0, 0);
      this.wigglePivot.position.set(0, 0, 0);
    }
  }

  update(delta: number, ball: PhysicsBall) {
    if (this.removed) return;

    if (this.dismissing) {
      this.dismissTime += delta;
      const t = Math.min(this.dismissTime / this.dismissDuration, 1);
      const eased = easeInCubic(t);

      this.setOpacity(1 - eased);
      this.scaleGroup.scale.setScalar(this.baseScale * (1 - eased * 0.2));
      this.wigglePivot.position.y = eased * 0.35;

      if (t >= 1) {
        this.removeFromScene();
      }
      return;
    }

    if (this.active) {
      this.wiggleTime += delta;
      const t = this.wiggleTime;

      this.wigglePivot.rotation.y = Math.sin(t * WIGGLE_SPEED_Y) * WIGGLE_ROT_Y;
      this.wigglePivot.rotation.x = Math.sin(t * WIGGLE_SPEED_X) * WIGGLE_ROT_X;
      this.wigglePivot.position.y = Math.sin(t * WIGGLE_SPEED_BOB) * WIGGLE_BOB_Y;
    }

    if (!this.active || this.collected) return;

    this.triggerMesh.updateWorldMatrix(true, false);
    this.triggerMesh.getWorldPosition(this.triggerCenterWorld);

    const ballPosition = ball.body.translation();
    const dx = ballPosition.x - this.triggerCenterWorld.x;
    const dz = ballPosition.z - this.triggerCenterWorld.z;
    const distanceXZ = Math.sqrt(dx * dx + dz * dz);

    if (distanceXZ <= DETECTION_RADIUS) {
      this.collected = true;
      this.onCollectCallback?.();
    }
  }
}
