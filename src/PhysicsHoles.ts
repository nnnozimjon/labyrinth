import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { PhysicsBoard } from "./PhysicsBoard";
import { getBounds, prepareGltfMaterials } from "./physicsUtils";

type RapierModule = typeof RAPIER;

const loader = new GLTFLoader();

const HOLE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xff1100,
  emissive: 0xff0000,
  emissiveIntensity: 1.5,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  side: THREE.DoubleSide,
});

export class PhysicsHoles {
  private readonly sensorColliders: RAPIER.Collider[];
  private readonly meshes: THREE.Mesh[];
  private time = 0;

  private constructor(sensorColliders: RAPIER.Collider[], meshes: THREE.Mesh[]) {
    this.sensorColliders = sensorColliders;
    this.meshes = meshes;
  }

  static async create(
    RAPIER: RapierModule,
    world: RAPIER.World,
    board: PhysicsBoard,
    modelUrl: string
  ): Promise<PhysicsHoles> {
    const gltf = await loader.loadAsync(modelUrl);
    const model = gltf.scene.clone();
    prepareGltfMaterials(model);

    const scale = board.scale;
    if (scale !== 1) {
      model.scale.multiplyScalar(scale);
    }

    model.position.sub(board.centerOffset);
    model.updateMatrixWorld(true);
    board.visual.add(model);

    const meshes: THREE.Mesh[] = [];
    const sensorColliders: RAPIER.Collider[] = [];

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.material = HOLE_MATERIAL.clone();
      meshes.push(child);

      child.updateMatrixWorld(true);
      const bounds = getBounds(child);
      const c = bounds.center;
      const s = bounds.size;

      // Sensor slightly taller than the mesh so the ball triggers before falling through
      const collider = world.createCollider(
        RAPIER.ColliderDesc.cuboid(s.x / 2, Math.max(s.y / 2, 0.3), s.z / 2)
          .setTranslation(c.x, c.y, c.z)
          .setSensor(true),
        board.body
      );
      sensorColliders.push(collider);
    });

    return new PhysicsHoles(sensorColliders, meshes);
  }

  /** Returns true if the ball collider is inside any hole sensor this frame. */
  isTouching(world: RAPIER.World, ballCollider: RAPIER.Collider): boolean {
    for (const sensor of this.sensorColliders) {
      if (world.intersectionPair(sensor, ballCollider)) return true;
    }
    return false;
  }

  /** Animate the pulsing red glow. Call every frame with the frame delta. */
  update(delta: number) {
    this.time += delta;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
    for (const mesh of this.meshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1 + pulse * 2;
      mat.opacity = 0.6 + pulse * 0.3;
    }
  }
}
