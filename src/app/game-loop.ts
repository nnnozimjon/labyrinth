import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CameraTransition } from "../core/camera-transition";
import type { VirtualJoystick } from "../input/joystick";
import { FixedTimestep } from "../physics/fixed-timestep";
import {
  MAX_FRAME_DELTA,
  MAX_TILT,
  PHYSICS_TIMESTEP,
  TILT_SMOOTHING,
} from "../utils/constants";
import type { GameSession } from "./game-session";
import type { GameWorld } from "./game-world";

export type GameLoopContext = {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly world: GameWorld;
  readonly session: GameSession;
  readonly joystick: VirtualJoystick;
  readonly sound: { playHit(): void };
  readonly giftCamera: CameraTransition;
  /** Per-frame callbacks of the enabled debug tools. */
  readonly debugUpdaters: readonly (() => void)[];
};

/** Eases the board toward the tilt the joystick asks for. */
class BoardTilt {
  readonly quaternion = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, "XYZ");

  /** `inputX` / `inputY` in [-1, 1]; zero eases the board back to level. */
  update(dt: number, inputX: number, inputY: number) {
    const k = 1 - Math.exp(-TILT_SMOOTHING * dt);
    const x = this.euler.x + (-inputY * MAX_TILT - this.euler.x) * k;
    const z = this.euler.z + (inputX * MAX_TILT - this.euler.z) * k;
    this.euler.set(x, 0, z);
    this.quaternion.setFromEuler(this.euler);
  }
}

/**
 * Runs the game every animation frame.
 *
 * Tilt, fans and the physics simulation advance in fixed PHYSICS_TIMESTEP steps however fast
 * or slow the display is (a single long step used to tunnel the ball through the board); the
 * ball is drawn interpolated between the last two steps so motion stays smooth.
 */
export function startGameLoop(ctx: GameLoopContext) {
  const { world, session, joystick, camera, controls, giftCamera } = ctx;
  const tilt = new BoardTilt();
  const stepper = new FixedTimestep(PHYSICS_TIMESTEP, MAX_FRAME_DELTA);
  const timer = new THREE.Timer();
  // Skip the time spent in a background tab instead of replaying it.
  timer.connect(document);

  const ballHandle = world.ball.collider.handle;
  const onCollision = (handle1: number, handle2: number, started: boolean) => {
    if (!started || !session.isBallInPlay) return;
    if (handle1 === ballHandle || handle2 === ballHandle) ctx.sound.playHit();
  };

  const physicsStep = (dt: number) => {
    const locked = session.isInputLocked;
    tilt.update(dt, locked ? 0 : joystick.x, locked ? 0 : joystick.y);
    for (const level of world.levels.values()) {
      level.board.setRotation(tilt.quaternion);
    }
    world.sharedBoard.setRotation(tilt.quaternion);

    for (const fan of world.getLevel(session.animatedLevel).fans) {
      fan.update(dt);
    }

    if (!session.isSimulating) return;
    world.physicsWorld.step(world.eventQueue);
    world.eventQueue.drainCollisionEvents(onCollision);
    world.ball.capturePose();
    session.afterPhysicsStep(dt);
  };

  const frame = (timestamp: number) => {
    requestAnimationFrame(frame);

    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), MAX_FRAME_DELTA);

    joystick.setInputEnabled(!session.isInputLocked);
    session.update(delta);
    stepper.advance(delta, physicsStep);
    world.ball.syncVisual(stepper.alpha);

    world
      .getLevel(session.animatedLevel)
      .giftBox?.update(delta, session.isBallInPlay ? world.ball.body.translation() : null);
    world.gateHole.update(delta);
    world.getLevel(session.currentLevel).holes?.update(delta);

    giftCamera.update(delta, camera, controls);
    if (!giftCamera.isActive()) {
      controls.update();
    }

    for (const update of ctx.debugUpdaters) update();
    ctx.renderer.render(ctx.scene, camera);
  };

  requestAnimationFrame(frame);
}
