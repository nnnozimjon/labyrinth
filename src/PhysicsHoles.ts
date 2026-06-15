import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PhysicsBoard } from "./PhysicsBoard";
import type { PhysicsBall } from "./PhysicsBall";
import { prepareGltfMaterials } from "./physicsUtils";

const loader = new GLTFLoader();

const DEBUG_HOLE_TRIGGERS = true;

const DETECTION_RADIUS = 0.3;
const TRIGGER_HEIGHT = 0.01;

type HolePosition = {
  x: number;
  z: number;
};

const HOLE_POSITIONS: HolePosition[] = [
  { x: -2.21, z: 2.42 },
  { x: 2.08, z: -0.14 },
  { x: -2.21, z: -0.15 },
  { x: -2.21, z: -2.49 },
  { x: 2.08, z: -2.49 },
];

const HOLE_Y = -0.1;
const HOLES_MODEL_Y_OFFSET = 0  ;

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

export class PhysicsHoles {
  private readonly meshes: THREE.Mesh[];
  private readonly triggers: HoleTrigger[];

  private time = 0;
  private triggered = false;
  private onLossCallback: (() => void) | null = null;

  private constructor(meshes: THREE.Mesh[], triggers: HoleTrigger[]) {
    this.meshes = meshes;
    this.triggers = triggers;
  }

  static async create(
    board: PhysicsBoard,
    modelUrl: string
  ): Promise<PhysicsHoles> {
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

    for (const hole of HOLE_POSITIONS) {
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
      debugMesh.name = "debug-hole-trigger";

      board.visual.add(debugMesh);

      triggers.push({
        debugMesh,
        centerWorld: new THREE.Vector3(),
      });
    }

    return new PhysicsHoles(meshes, triggers);
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

  update(delta: number, ball: PhysicsBall) {
    this.time += delta;

    const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);

    for (const mesh of this.meshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1 + pulse * 2;
      mat.opacity = 0.6 + pulse * 0.3;
    }

    if (this.triggered) return;

    const ballPosition = ball.body.translation();

    for (let i = 0; i < this.triggers.length; i++) {
      const trigger = this.triggers[i];

      trigger.debugMesh.updateWorldMatrix(true, false);
      trigger.debugMesh.getWorldPosition(trigger.centerWorld);

      const dx = ballPosition.x - trigger.centerWorld.x;
      const dz = ballPosition.z - trigger.centerWorld.z;

      const distanceXZ = Math.sqrt(dx * dx + dz * dz);

      /**
       * Exact visual cylinder radius.
       * No BALL_RADIUS added, because that makes trigger fire too early.
       */
      const isTouchingVisibleCylinder = distanceXZ <= DETECTION_RADIUS;

      if (isTouchingVisibleCylinder) {
        this.triggered = true;

        const mat = trigger.debugMesh.material as THREE.MeshBasicMaterial;
        mat.color.set(0xffff00);
        mat.opacity = 0.8;

        console.log("[PhysicsHoles] LOSS TRIGGERED BY VISIBLE CYLINDER", {
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