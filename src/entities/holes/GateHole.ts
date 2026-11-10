import * as THREE from "three";
import { loadGltf } from "../../utils/gltf-loader";
import { prepareGltfMaterials } from "../../physics/collider-utils";
import type { BoardAnchor } from "../board/PhysicsBoard";
import type { HolePosition } from "./holes-types";
import { applyGlowMaterials, pulseGlowMaterials } from "./hole-vfx";

/**
 * Glowing marker over the gate opening. Dropping through the opening wins the level; that
 * is decided by the BallDropMonitor using `center`.
 */
export class GateHole {
  private time = 0;

  private constructor(
    /** Centre of the opening in board-local X/Z. */
    readonly center: HolePosition,
    private readonly materials: THREE.MeshStandardMaterial[]
  ) {}

  static async create(board: BoardAnchor, modelUrl: string): Promise<GateHole> {
    const gltf = await loadGltf(modelUrl);
    const model = gltf.scene.clone();
    prepareGltfMaterials(model);

    model.scale.multiplyScalar(board.scale);
    model.position.sub(board.centerOffset);
    board.visual.add(model);

    const { materials } = applyGlowMaterials(model, 0x00ff44, 0x00ff44);

    board.visual.updateWorldMatrix(true, false);
    const worldCenter = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    const local = board.visual.worldToLocal(worldCenter);

    return new GateHole({ x: local.x, z: local.z }, materials);
  }

  update(delta: number) {
    this.time += delta;
    pulseGlowMaterials(this.materials, this.time);
  }
}
