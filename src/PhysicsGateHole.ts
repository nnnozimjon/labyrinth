import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PhysicsBoard } from "./PhysicsBoard";
import type { PhysicsBall } from "./PhysicsBall";
import { prepareGltfMaterials } from "./physicsUtils";

const loader = new GLTFLoader();

const WIN_DELAY = 2.0;
const DETECTION_RADIUS = 1.5;
const DETECTION_HEIGHT = 2.0;

export class PhysicsGateHole {
  private readonly meshes: THREE.Mesh[] = [];
  private time = 0;
  private overTimer = 0;
  private triggered = false;
  private onWinCallback: (() => void) | null = null;

  private constructor(meshes: THREE.Mesh[]) {
    this.meshes = meshes;
  }

  static async create(board: PhysicsBoard, modelUrl: string): Promise<PhysicsGateHole> {
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
      child.material = new THREE.MeshStandardMaterial({
        color: 0x00ff44,
        emissive: 0x00ff44,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      meshes.push(child);
    });

    return new PhysicsGateHole(meshes);
  }

  get isNear(): boolean {
    return this.overTimer > 0 || this.triggered;
  }

  onWin(callback: () => void) {
    this.onWinCallback = callback;
  }

  reset() {
    this.overTimer = 0;
    this.triggered = false;
  }

  update(delta: number, ball: PhysicsBall) {
    this.time += delta;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
    for (const mesh of this.meshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1 + pulse * 2;
      mat.opacity = 0.6 + pulse * 0.3;
    }

    if (this.triggered || this.meshes.length === 0) return;

    // World-space center of all gate hole meshes
    const worldBox = new THREE.Box3();
    const tempBox = new THREE.Box3();
    for (const mesh of this.meshes) {
      mesh.updateWorldMatrix(true, false);
      tempBox.setFromObject(mesh);
      worldBox.union(tempBox);
    }
    const holeCenter = new THREE.Vector3();
    worldBox.getCenter(holeCenter);

    const t = ball.body.translation();
    const dx = t.x - holeCenter.x;
    const dz = t.z - holeCenter.z;
    const isNear =
      Math.sqrt(dx * dx + dz * dz) < DETECTION_RADIUS &&
      Math.abs(t.y - holeCenter.y) < DETECTION_HEIGHT;

    if (isNear) {
      this.overTimer += delta;
      if (this.overTimer >= WIN_DELAY) {
        this.triggered = true;
        this.onWinCallback?.();
      }
    } else {
      this.overTimer = 0;
    }
  }
}
