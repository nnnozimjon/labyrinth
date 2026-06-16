import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PhysicsBoard } from "../board/PhysicsBoard";
import type { PhysicsBall } from "../ball/PhysicsBall";
import { prepareGltfMaterials } from "../../physics/collider-utils";
import type { HoleLossTriggers, HolePosition } from "./holes-types";

const loader = new GLTFLoader();

const DEBUG_HOLE_TRIGGERS = true;

export const HOLE_DETECTION_RADIUS = 0.3;
const TRIGGER_HEIGHT = 0.01;

/** Level 3 hole trigger positions — update when layout is finalized. */
const DEFAULT_HOLE_POSITIONS: HolePosition[] = [
  { x: 2.37, z: 3.95 },
  { x: -2.2, z: 3.96 },
  { x: -2.2, z: 0.08 },
  { x: 2.37, z: -3.7 },
];

export type PhysicsHolesLevel3Options = {
  holePositions?: HolePosition[];
};

const HOLE_Y = -0.1;
const HOLES_MODEL_Y_OFFSET = 0;

const HOLE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xff1100,
  emissive: 0xff0000,
  emissiveIntensity: 1.5,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const DEBUG_TRIGGER_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
  wireframe: true,
});

type HoleTrigger = {
  debugMesh: THREE.Mesh;
  centerWorld: THREE.Vector3;
};

export class PhysicsHolesLevel3 implements HoleLossTriggers {
  private readonly boardVisual: THREE.Object3D;
  private readonly meshes: THREE.Mesh[];
  private readonly triggers: HoleTrigger[];

  private time = 0;
  private triggered = false;
  private active = false;
  private onLossCallback: (() => void) | null = null;

  private constructor(
    boardVisual: THREE.Object3D,
    meshes: THREE.Mesh[],
    triggers: HoleTrigger[]
  ) {
    this.boardVisual = boardVisual;
    this.meshes = meshes;
    this.triggers = triggers;
  }

  private createTriggerMesh(x: number, z: number): HoleTrigger {
    const debugMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(
        HOLE_DETECTION_RADIUS,
        HOLE_DETECTION_RADIUS,
        TRIGGER_HEIGHT,
        48
      ),
      DEBUG_TRIGGER_MATERIAL.clone()
    );

    debugMesh.position.set(x, HOLE_Y, z);
    debugMesh.visible = DEBUG_HOLE_TRIGGERS;
    debugMesh.name = `debug-hole-trigger-level3-${this.triggers.length}`;

    this.boardVisual.add(debugMesh);

    return {
      debugMesh,
      centerWorld: new THREE.Vector3(),
    };
  }

  static async create(
    board: PhysicsBoard,
    modelUrl: string,
    options: PhysicsHolesLevel3Options = {}
  ): Promise<PhysicsHolesLevel3> {
    const holePositions = options.holePositions ?? DEFAULT_HOLE_POSITIONS;
    const gltf = await loader.loadAsync(modelUrl);
    const model = gltf.scene.clone();

    prepareGltfMaterials(model);

    if (board.scale !== 1) {
      model.scale.multiplyScalar(board.scale);
    }

    model.position.sub(board.centerOffset);
    model.position.y += HOLES_MODEL_Y_OFFSET;
    model.updateMatrixWorld(true);
    board.visual.add(model);

    const meshes: THREE.Mesh[] = [];

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.material = HOLE_MATERIAL.clone();
      meshes.push(child);
    });

    const triggers: HoleTrigger[] = [];
    const instance = new PhysicsHolesLevel3(board.visual, meshes, triggers);

    for (const hole of holePositions) {
      triggers.push(instance.createTriggerMesh(hole.x, hole.z));
    }

    return instance;
  }

  get isActive(): boolean {
    return this.active;
  }

  getTriggerCount(): number {
    return this.triggers.length;
  }

  getPositions(): HolePosition[] {
    return this.triggers.map((trigger) => ({
      x: trigger.debugMesh.position.x,
      z: trigger.debugMesh.position.z,
    }));
  }

  addTrigger(x = 0, z = 0): number {
    const trigger = this.createTriggerMesh(x, z);
    this.triggers.push(trigger);
    trigger.debugMesh.visible = this.active && DEBUG_HOLE_TRIGGERS;
    return this.triggers.length - 1;
  }

  setTriggerPosition(index: number, x: number, z: number): void {
    const trigger = this.triggers[index];
    if (!trigger) return;
    trigger.debugMesh.position.set(x, HOLE_Y, z);
  }

  removeTrigger(index: number): void {
    const trigger = this.triggers[index];
    if (!trigger) return;

    this.boardVisual.remove(trigger.debugMesh);
    trigger.debugMesh.geometry.dispose();
    (trigger.debugMesh.material as THREE.Material).dispose();
    this.triggers.splice(index, 1);
  }

  getDebugHelpers(): THREE.Object3D[] {
    return this.triggers.map((trigger) => trigger.debugMesh);
  }

  onLoss(callback: () => void) {
    this.onLossCallback = callback;
  }

  reset() {
    this.triggered = false;

    for (const trigger of this.triggers) {
      const mat = trigger.debugMesh.material as THREE.MeshBasicMaterial;
      mat.color.set(0x00ff00);
      mat.opacity = 0.35;
    }
  }

  setActive(active: boolean) {
    this.active = active;
    for (const mesh of this.meshes) {
      mesh.visible = active;
    }
    for (const trigger of this.triggers) {
      trigger.debugMesh.visible = active && DEBUG_HOLE_TRIGGERS;
    }
    if (!active) {
      this.triggered = false;
    }
  }

  update(delta: number, ball: PhysicsBall) {
    this.time += delta;

    const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);

    for (const mesh of this.meshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1 + pulse * 2;
      mat.opacity = 0.6 + pulse * 0.3;
    }

    if (!this.active || this.triggered) return;

    const ballPosition = ball.body.translation();

    for (let i = 0; i < this.triggers.length; i++) {
      const trigger = this.triggers[i];

      trigger.debugMesh.updateWorldMatrix(true, false);
      trigger.debugMesh.getWorldPosition(trigger.centerWorld);

      const dx = ballPosition.x - trigger.centerWorld.x;
      const dz = ballPosition.z - trigger.centerWorld.z;

      const distanceXZ = Math.sqrt(dx * dx + dz * dz);
      const isTouchingVisibleCylinder = distanceXZ <= HOLE_DETECTION_RADIUS;

      if (isTouchingVisibleCylinder) {
        this.triggered = true;

        const mat = trigger.debugMesh.material as THREE.MeshBasicMaterial;
        mat.color.set(0xffff00);
        mat.opacity = 0.8;

        console.log("[PhysicsHolesLevel3] LOSS TRIGGERED BY VISIBLE CYLINDER", {
          triggerIndex: i,
          ballPosition,
          triggerCenter: trigger.centerWorld,
          distanceXZ,
          detectionRadius: HOLE_DETECTION_RADIUS,
        });

        this.onLossCallback?.();
        break;
      }
    }
  }
}
