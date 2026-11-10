import type RAPIER from "@dimforge/rapier3d-compat";

/** Tracks whether the ball is actually touching the static world ground (the table). */
export class GroundContactTracker {
  private readonly groundHandles: Set<number>;
  private readonly candidates: RAPIER.Collider[] = [];
  private touching = false;

  constructor(groundColliders: readonly RAPIER.Collider[]) {
    this.groundHandles = new Set(groundColliders.map((collider) => collider.handle));
  }

  get isTouchingGround(): boolean {
    return this.touching;
  }

  /**
   * Re-reads contacts after a physics step. `contactPairsWith` also lists pairs whose bounding
   * boxes merely overlap, so each candidate is confirmed by its contact manifold.
   */
  update(world: RAPIER.World, ballCollider: RAPIER.Collider) {
    this.candidates.length = 0;
    world.contactPairsWith(ballCollider, (other) => {
      if (this.groundHandles.has(other.handle)) this.candidates.push(other);
    });

    let touching = false;
    for (const ground of this.candidates) {
      world.contactPair(ballCollider, ground, (manifold) => {
        if (manifold.numContacts() > 0) touching = true;
      });
      if (touching) break;
    }

    this.candidates.length = 0;
    this.touching = touching;
  }

  reset() {
    this.touching = false;
  }
}
