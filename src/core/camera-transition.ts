import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { easeOutCubic } from "../levels/puzzle-animation";

export type CameraState = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  target: THREE.Vector3;
};

export class CameraTransition {
  private active = false;
  private elapsed = 0;
  private readonly fromPosition = new THREE.Vector3();
  private readonly fromQuaternion = new THREE.Quaternion();
  private readonly fromTarget = new THREE.Vector3();
  private readonly toPosition = new THREE.Vector3();
  private readonly toQuaternion = new THREE.Quaternion();
  private readonly toTarget = new THREE.Vector3();
  private onComplete: (() => void) | null = null;

  constructor(private readonly duration = 1.5) {}

  isActive(): boolean {
    return this.active;
  }

  start(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    to: CameraState,
    onComplete?: () => void
  ) {
    this.fromPosition.copy(camera.position);
    this.fromQuaternion.copy(camera.quaternion);
    this.fromTarget.copy(controls.target);

    this.toPosition.copy(to.position);
    this.toQuaternion.setFromEuler(to.rotation);
    this.toTarget.copy(to.target);

    this.elapsed = 0;
    this.active = true;
    this.onComplete = onComplete ?? null;
  }

  update(delta: number, camera: THREE.PerspectiveCamera, controls: OrbitControls): boolean {
    if (!this.active) return false;

    this.elapsed += delta;
    const t = Math.min(this.elapsed / this.duration, 1);
    const eased = easeOutCubic(t);

    camera.position.lerpVectors(this.fromPosition, this.toPosition, eased);
    camera.quaternion.slerpQuaternions(this.fromQuaternion, this.toQuaternion, eased);
    controls.target.lerpVectors(this.fromTarget, this.toTarget, eased);

    if (t >= 1) {
      camera.position.copy(this.toPosition);
      camera.quaternion.copy(this.toQuaternion);
      controls.target.copy(this.toTarget);
      this.active = false;
      this.onComplete?.();
      this.onComplete = null;
    }

    return true;
  }
}
