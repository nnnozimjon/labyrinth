import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";
import {
  addRotatingPartBoardColliders,
  syncRotatingBoardCollider,
  type BoardColliderMode,
  type RotatingBoardCollider,
} from "./physicsUtils";

/** Continuous fan spin speed in radians per second. */
export const FAN_ROTATION_SPEED = 1.2;

export const FAN_OBJECT_NAME = "level2-puzzle-1";

type RapierModule = typeof RAPIER;

type PuzzleFanPhysics = {
  RAPIER: RapierModule;
  world: RAPIER.World;
  boardBody: RAPIER.RigidBody;
  boardVisual: THREE.Object3D;
  colliderMode?: BoardColliderMode;
  flatnessThreshold?: number;
};

export class PuzzleFanRotation {
  private readonly pivot: THREE.Object3D;
  private readonly boardVisual: THREE.Object3D;
  private readonly colliders: RotatingBoardCollider[];

  private constructor(
    pivot: THREE.Object3D,
    boardVisual: THREE.Object3D,
    colliders: RotatingBoardCollider[]
  ) {
    this.pivot = pivot;
    this.boardVisual = boardVisual;
    this.colliders = colliders;
  }

  static attach(
    root: THREE.Object3D,
    physics: PuzzleFanPhysics,
    objectName = FAN_OBJECT_NAME
  ): PuzzleFanRotation | null {
    const mesh = findNamedObject(root, objectName);
    if (!mesh) {
      console.warn(`PuzzleFanRotation: "${objectName}" not found in puzzle model`);
      return null;
    }

    const pivot = reparentAtVisualCenter(mesh);
    const colliders = addRotatingPartBoardColliders(
      physics.RAPIER,
      physics.world,
      physics.boardBody,
      physics.boardVisual,
      pivot,
      {
        colliderMode: physics.colliderMode,
        flatnessThreshold: physics.flatnessThreshold,
      }
    );

    if (colliders.length === 0) {
      console.warn(
        `PuzzleFanRotation: no colliders created for "${objectName}" — ball will pass through the fan`
      );
    }

    return new PuzzleFanRotation(pivot, physics.boardVisual, colliders);
  }

  update(delta: number, speed = FAN_ROTATION_SPEED): void {
    this.pivot.rotateY(speed * delta);

    for (const entry of this.colliders) {
      syncRotatingBoardCollider(entry, this.boardVisual);
    }
  }
}

function findNamedObject(
  root: THREE.Object3D,
  name: string
): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;

  root.traverse((child) => {
    if (found) return;
    if (child.name === name || child.userData.name === name) {
      found = child;
    }
  });

  return found;
}

function reparentAtVisualCenter(mesh: THREE.Object3D): THREE.Object3D {
  const parent = mesh.parent;
  if (!parent) return mesh;

  const pivot = new THREE.Group();
  pivot.name = `${mesh.name}-fan-pivot`;
  pivot.position.copy(mesh.position);
  pivot.quaternion.copy(mesh.quaternion);
  pivot.scale.copy(mesh.scale);

  parent.remove(mesh);

  mesh.position.set(0, 0, 0);
  mesh.quaternion.identity();
  mesh.scale.set(1, 1, 1);

  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  mesh.position.sub(center);

  pivot.add(mesh);
  parent.add(pivot);

  return pivot;
}
