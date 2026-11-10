import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";

/**
 * The tilting board's own coordinate frame: X/Z across the board, Y measured up from its
 * surface. A position expressed here does not change when the board tilts, so "is the ball
 * over a hole" and "has it dropped below the floor" are exact at any tilt angle.
 */
export class BoardFrame {
  /** Height of the board surface in the body's local space. */
  readonly surfaceY: number;
  private readonly inverseRotation = new THREE.Quaternion();

  /** Create while the board is at rest; `surfaceWorldY` is the surface height at rest. */
  constructor(
    private readonly body: RAPIER.RigidBody,
    surfaceWorldY = 0
  ) {
    this.surfaceY = surfaceWorldY - body.translation().y;
  }

  toLocal(point: THREE.Vector3Like, out: THREE.Vector3): THREE.Vector3 {
    const t = this.body.translation();
    const r = this.body.rotation();
    this.inverseRotation.set(-r.x, -r.y, -r.z, r.w);
    out.set(point.x - t.x, point.y - t.y, point.z - t.z).applyQuaternion(this.inverseRotation);
    out.y -= this.surfaceY;
    return out;
  }
}
