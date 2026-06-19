import * as THREE from "three";
import { gltfLoader } from "../../utils/gltf-loader";
import type { PhysicsBoard } from "../board/PhysicsBoard";
import type { PhysicsBall } from "../ball/PhysicsBall";
import { prepareGltfMaterials } from "../../physics/collider-utils";
import type { HoleLossTriggers, HolePosition } from "./holes-types";

const DEBUG_HOLE_TRIGGERS = false;

const DETECTION_RADIUS = 0.3;
const TRIGGER_HEIGHT = 0.01;

const DEFAULT_HOLE_POSITIONS: HolePosition[] = [
  { x: -2.21, z: 2.42 },
  { x: 2.08, z: -0.14 },
  { x: -2.21, z: -0.15 },
  { x: -2.21, z: -2.49 },
  { x: 2.08, z: -2.49 },
];

export type PhysicsHolesLevel2Options = {
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
  wireframe: false,
});

type HoleTrigger = {
  debugMesh: THREE.Mesh;
  centerWorld: THREE.Vector3;
};

export class PhysicsHolesLevel2 implements HoleLossTriggers {
  private readonly meshes: THREE.Mesh[];
  private readonly triggers: HoleTrigger[];

  private time = 0;
  private triggered = false;
  private active = false;
  private onLossCallback: (() => void) | null = null;

  private constructor(meshes: THREE.Mesh[], triggers: HoleTrigger[]) {
    this.meshes = meshes;
    this.triggers = triggers;
  }

  static async create(
    board: PhysicsBoard,
    modelUrl: string,
    options: PhysicsHolesLevel2Options = {}
  ): Promise<PhysicsHolesLevel2> {
    const holePositions = options.holePositions ?? DEFAULT_HOLE_POSITIONS;
    const gltf = await gltfLoader.loadAsync(modelUrl);
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

    for (const hole of holePositions) {
      const debugMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          DETECTION_RADIUS,
          DETECTION_RADIUS,
          TRIGGER_HEIGHT,
          48
        ),
        DEBUG_TRIGGER_MATERIAL.clone()
      );

      debugMesh.position.set(hole.x, HOLE_Y, hole.z);
      debugMesh.visible = DEBUG_HOLE_TRIGGERS;
      debugMesh.name = "debug-hole-trigger-level2";

      board.visual.add(debugMesh);

      triggers.push({
        debugMesh,
        centerWorld: new THREE.Vector3(),
      });
    }

    return new PhysicsHolesLevel2(meshes, triggers);
  }

  get isActive(): boolean {
    return this.active;
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
      const isTouchingVisibleCylinder = distanceXZ <= DETECTION_RADIUS;

      if (isTouchingVisibleCylinder) {
        this.triggered = true;

        const mat = trigger.debugMesh.material as THREE.MeshBasicMaterial;
        mat.color.set(0xffff00);
        mat.opacity = 0.8;

        console.log("[PhysicsHolesLevel2] LOSS TRIGGERED BY VISIBLE CYLINDER", {
          triggerIndex: i,
          ballPosition,
          triggerCenter: trigger.centerWorld,
          distanceXZ,
          detectionRadius: DETECTION_RADIUS,
        });

        this.onLossCallback?.();
        break;
      }
    }
  }
}
