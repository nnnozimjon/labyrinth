import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PhysicsBoard } from "./PhysicsBoard";
import { prepareGltfMaterials } from "./physicsUtils";

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
  private readonly meshes: THREE.Mesh[];
  private time = 0;

  private constructor(meshes: THREE.Mesh[]) {
    this.meshes = meshes;
  }

  static async create(
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

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.material = HOLE_MATERIAL.clone();
      meshes.push(child);
    });

    return new PhysicsHoles(meshes);
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
