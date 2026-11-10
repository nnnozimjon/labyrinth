import * as THREE from "three";
import { loadGltf } from "../../utils/gltf-loader";
import { prepareGltfMaterials } from "../../physics/collider-utils";
import { HOLE_TRIGGER_RADIUS, SHOW_DEBUG_HELPERS } from "../../utils/constants";
import type { PhysicsBoard } from "../board/PhysicsBoard";
import type { HolePosition } from "./holes-types";
import { applyGlowMaterials, pulseGlowMaterials } from "./hole-vfx";

const HELPER_Y = -0.1;
const HELPER_HEIGHT = 0.1;

type Trigger = HolePosition & { readonly helper: THREE.Mesh };

/**
 * The red glowing holes of one level. Dropping through any of them loses the round; that is
 * decided by the BallDropMonitor using `positions`.
 */
export class LossHoles {
  private readonly triggers: Trigger[] = [];
  private active = false;
  private time = 0;

  private constructor(
    private readonly name: string,
    private readonly boardVisual: THREE.Object3D,
    private readonly meshes: THREE.Mesh[],
    private readonly materials: THREE.MeshStandardMaterial[]
  ) {}

  static async create(
    board: PhysicsBoard,
    modelUrl: string,
    positions: readonly HolePosition[],
    name: string
  ): Promise<LossHoles> {
    const gltf = await loadGltf(modelUrl);
    const model = gltf.scene.clone();
    prepareGltfMaterials(model);

    model.scale.multiplyScalar(board.scale);
    model.position.sub(board.centerOffset);
    board.visual.add(model);

    const { meshes, materials } = applyGlowMaterials(model, 0xff1100, 0xff0000);
    const holes = new LossHoles(name, board.visual, meshes, materials);
    for (const position of positions) {
      holes.addTrigger(position.x, position.z);
    }
    holes.setActive(false);
    return holes;
  }

  get isActive(): boolean {
    return this.active;
  }

  /** Trigger centres in board-local X/Z (live: the debug panel can move them). */
  get positions(): readonly HolePosition[] {
    return this.triggers;
  }

  get triggerCount(): number {
    return this.triggers.length;
  }

  setActive(active: boolean) {
    this.active = active;
    for (const mesh of this.meshes) {
      mesh.visible = active;
    }
    for (const trigger of this.triggers) {
      trigger.helper.visible = active && SHOW_DEBUG_HELPERS;
    }
  }

  /** Pulses the glow; call once per frame. */
  update(delta: number) {
    this.time += delta;
    pulseGlowMaterials(this.materials, this.time);
  }

  getDebugHelpers(): THREE.Object3D[] {
    return this.triggers.map((trigger) => trigger.helper);
  }

  // --- Editing API for the hole placement debug panel -------------------------------------

  addTrigger(x = 0, z = 0): number {
    const helper = new THREE.Mesh(
      new THREE.CylinderGeometry(HOLE_TRIGGER_RADIUS, HOLE_TRIGGER_RADIUS, HELPER_HEIGHT, 48),
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        wireframe: true,
      })
    );
    helper.name = `debug-hole-trigger-${this.name}-${this.triggers.length}`;
    helper.position.set(x, HELPER_Y, z);
    helper.visible = this.active && SHOW_DEBUG_HELPERS;
    this.boardVisual.add(helper);

    this.triggers.push({ x, z, helper });
    return this.triggers.length - 1;
  }

  setTriggerPosition(index: number, x: number, z: number) {
    const trigger = this.triggers[index];
    if (!trigger) return;
    this.triggers[index] = { x, z, helper: trigger.helper };
    trigger.helper.position.set(x, HELPER_Y, z);
  }

  removeTrigger(index: number) {
    const [trigger] = this.triggers.splice(index, 1);
    if (!trigger) return;
    this.boardVisual.remove(trigger.helper);
    trigger.helper.geometry.dispose();
    (trigger.helper.material as THREE.Material).dispose();
  }
}
