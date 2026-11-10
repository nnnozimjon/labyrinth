/**
 * Fixed-timestep accumulator: converts variable frame times into a whole number of equal
 * simulation steps. Leftover time carries over to the next frame.
 *
 * The frame time is clamped to `maxFrameDelta`, so a long frame costs at most a handful of
 * steps and briefly slows the game down, instead of producing one huge step that would tunnel
 * the ball through thin colliders.
 */
export class FixedTimestep {
  private accumulator = 0;

  constructor(
    readonly step: number,
    private readonly maxFrameDelta: number
  ) {}

  /** Runs `tick` zero or more times for the elapsed frame time; returns the step count. */
  advance(frameDelta: number, tick: (step: number) => void): number {
    const delta = Number.isFinite(frameDelta) ? frameDelta : 0;
    this.accumulator += Math.min(Math.max(delta, 0), this.maxFrameDelta);

    let steps = 0;
    while (this.accumulator >= this.step) {
      tick(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    return steps;
  }

  /** Progress toward the next step in [0, 1); used to interpolate what is drawn. */
  get alpha(): number {
    return this.accumulator / this.step;
  }

  reset() {
    this.accumulator = 0;
  }
}
