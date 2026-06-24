import * as THREE from "three";
import { gltfLoader } from "../../utils/gltf-loader";
import type { BoardAnchor } from "../board/PhysicsBoard";
import type { PhysicsBall } from "../ball/PhysicsBall";
import { prepareGltfMaterials } from "../../physics/collider-utils";

// Short delay: ball must be in the hole zone for this many seconds before win fires.
// Must be shorter than the time to fall 2+ units (~0.43 s at g=24.81).
const WIN_DELAY = 0.35;
const DETECTION_RADIUS = 1.5;
// Ball must have dipped below normal rolling height (~0.3) to confirm it entered the hole.
const HOLE_ENTRY_OFFSET = 0.15;

export class PhysicsGateHole {
  private readonly meshes: THREE.Mesh[] = [];
  private time = 0;
  private overTimer = 0;
  private engaged = false;
  private triggered = false;
  private active = true;
  private onWinCallback: (() => void) | null = null;

  private constructor(meshes: THREE.Mesh[]) {
    this.meshes = meshes;
  }

  static async create(board: BoardAnchor, modelUrl: string): Promise<PhysicsGateHole> {
    const gltf = await gltfLoader.loadAsync(modelUrl);
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
    this.engaged = false;
    this.triggered = false;
  }

  /** Enables win detection only; visuals always stay visible. */
  setDetectionEnabled(enabled: boolean) {
    this.active = enabled;
    if (!enabled) {
      this.overTimer = 0;
    }
  }

  /** @deprecated Use setDetectionEnabled — meshes are always shown. */
  setActive(active: boolean) {
    this.setDetectionEnabled(active);
  }

  update(delta: number, ball: PhysicsBall, isTouchingWorldGround: boolean) {
    this.time += delta;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
    for (const mesh of this.meshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1 + pulse * 2;
      mat.opacity = 0.6 + pulse * 0.3;
    }

    if (!this.active || this.triggered || this.meshes.length === 0) return;

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
    // No lower-bound Y clamp: once ball starts falling into the hole it stays detected
    // even as it drops far below — the XZ check is the meaningful gatekeeper.
    const isNear =
      Math.sqrt(dx * dx + dz * dz) < DETECTION_RADIUS &&
      t.y < holeCenter.y + HOLE_ENTRY_OFFSET;

    if (isNear) {
      this.engaged = true;
    }

    // Win only after the ball entered the gate and reached the world ground (same as loss holes).
    if (this.engaged && isTouchingWorldGround) {
      this.overTimer += delta;
      if (this.overTimer >= WIN_DELAY) {
        this.triggered = true;
        this.onWinCallback?.();
      }
    } else if (!isNear && !isTouchingWorldGround) {
      this.engaged = false;
      this.overTimer = 0;
    }
  }
}
