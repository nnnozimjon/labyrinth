/** Arms loss when the ball enters a hole, then fires once it hits the world ground. */
export class HoleLossState {
  private engaged = false;
  private activeTriggerIndex: number | null = null;

  reset() {
    this.engaged = false;
    this.activeTriggerIndex = null;
  }

  /**
   * Returns true when loss should trigger.
   * Ball must pass over a hole first, then touch the world ground (even if XZ drifts).
   */
  update(options: {
    isOverHole: boolean;
    triggerIndex: number | null;
    isTouchingWorldGround: boolean;
  }): boolean {
    if (options.isOverHole && options.triggerIndex !== null) {
      this.engaged = true;
      this.activeTriggerIndex = options.triggerIndex;
    }

    if (this.engaged && options.isTouchingWorldGround) {
      return true;
    }

    if (!options.isOverHole && !options.isTouchingWorldGround) {
      this.engaged = false;
      this.activeTriggerIndex = null;
    }

    return false;
  }

  get triggerIndex(): number | null {
    return this.activeTriggerIndex;
  }
}
