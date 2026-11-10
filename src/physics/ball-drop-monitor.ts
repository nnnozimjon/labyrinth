import {
  BALL_RADIUS,
  GOAL_TRIGGER_RADIUS,
  HOLE_TRIGGER_RADIUS,
} from "../utils/constants";

/** How a ball that fell through the floor left play. */
export type DropOutcome = "goal" | "hole" | "escaped";

export type PlanarPoint = { readonly x: number; readonly z: number };

/** Openings in the floor, in board-local X/Z. */
export type DropZones = {
  readonly goal: PlanarPoint;
  /** Loss holes of the current level (empty on levels without holes). */
  readonly holes: readonly PlanarPoint[];
};

/** Ball centre this far below the surface: the ball has fully passed through the floor. */
const BELOW_FLOOR_Y = -BALL_RADIUS;

/** A goal counts once the ball has rested on the table this long. */
const GOAL_GROUND_TIME = 0.35;
/** Fallbacks for a ball that never reaches the table (caught on something under the board). */
const GOAL_TIMEOUT = 2;
const HOLE_TIMEOUT = 1.5;
const ESCAPE_TIMEOUT = 1;

/**
 * Decides what happened when the ball drops below the board.
 *
 * The board is paper-thin, so every way out of play is a fall through the floor plane. The
 * moment the ball's centre passes below it (measured in the tilting board's own frame) the
 * monitor latches which opening it went through: the gate, a loss hole, or neither, meaning
 * it escaped. The outcome is reported once the ball reaches the table, or after a timeout if
 * it never does. Latching at the opening, instead of re-testing every frame, means a ball
 * rolling sideways under the board cannot turn a goal into a loss or get lost unnoticed.
 */
export class BallDropMonitor {
  private latched: DropOutcome | null = null;
  private sinceDrop = 0;
  private onGround = 0;

  constructor(private readonly halfExtents: PlanarPoint) {}

  reset() {
    this.latched = null;
    this.sinceDrop = 0;
    this.onGround = 0;
  }

  /**
   * Call after every physics step while the ball is in play.
   * @param ball ball centre in board-local space (y measured from the surface)
   * @returns the outcome once it is decided, otherwise null
   */
  update(
    step: number,
    ball: { readonly x: number; readonly y: number; readonly z: number },
    touchingGround: boolean,
    zones: DropZones
  ): DropOutcome | null {
    if (ball.y > BELOW_FLOOR_Y) {
      this.reset();
      return null;
    }

    const zone = (this.latched ??= this.classify(ball, zones));
    this.sinceDrop += step;
    if (touchingGround) this.onGround += step;

    switch (zone) {
      case "goal":
        return this.onGround >= GOAL_GROUND_TIME || this.sinceDrop > GOAL_TIMEOUT ? "goal" : null;
      case "hole":
        return this.onGround > 0 || this.sinceDrop > HOLE_TIMEOUT ? "hole" : null;
      case "escaped":
        return this.onGround > 0 || this.sinceDrop > ESCAPE_TIMEOUT ? "escaped" : null;
    }
  }

  private classify(ball: PlanarPoint, zones: DropZones): DropOutcome {
    const insideBoard =
      Math.abs(ball.x) <= this.halfExtents.x && Math.abs(ball.z) <= this.halfExtents.z;
    if (!insideBoard) return "escaped";
    if (distance(ball, zones.goal) < GOAL_TRIGGER_RADIUS) return "goal";
    if (zones.holes.some((hole) => distance(ball, hole) <= HOLE_TRIGGER_RADIUS)) return "hole";
    return "escaped";
  }
}

function distance(a: PlanarPoint, b: PlanarPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
