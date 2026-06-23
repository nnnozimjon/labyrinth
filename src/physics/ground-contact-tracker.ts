import type RAPIER from "@dimforge/rapier3d-compat";

/** Tracks whether the ball is currently colliding with the large static world ground. */
export class GroundContactTracker {
  private readonly groundColliderHandles: Set<number>;
  private touching = false;

  constructor(colliders: readonly RAPIER.Collider[]) {
    this.groundColliderHandles = new Set(colliders.map((collider) => collider.handle));
  }

  get isTouchingGround(): boolean {
    return this.touching;
  }

  /** Re-read contacts from the physics world after each step (more reliable than events alone). */
  syncFromWorld(world: RAPIER.World, ballColliderHandle: number) {
    const ballCollider = world.getCollider(ballColliderHandle);
    let touching = false;

    world.contactPairsWith(ballCollider, (otherCollider) => {
      if (this.groundColliderHandles.has(otherCollider.handle)) {
        touching = true;
      }
    });

    this.touching = touching;
  }

  reset() {
    this.touching = false;
  }
}
