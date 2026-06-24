import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { LevelManager } from "../levels/LevelManager";
import type { PhysicsBall } from "../entities/ball/PhysicsBall";
import type { BoardAnchor } from "../entities/board/PhysicsBoard";
import type { PhysicsGateHole } from "../entities/holes/PhysicsGateHole";
import type { LevelContent, LevelTransitionPhase } from "../levels/level-types";
import {
  animatePuzzleOffset,
  animatePuzzleRise,
  animatePuzzleSink,
  easeInCubic,
  easeOutCubic,
  hidePuzzlesAfterSink,
  preparePuzzleDropAnimation,
} from "../levels/puzzle-animation";
import {
  BOARD_FADE_DURATION,
  LEVEL_TRANSITION_DELAY,
  MAX_TILT,
  PUZZLE_INTRO_DURATION,
  PUZZLE_INTRO_START_Y,
  TILT_SMOOTHING,
} from "../utils/constants";
import type { VirtualJoystick } from "../input/joystick";
import type { PhysicsDebugRenderer } from "../physics/physics-debug";
import type { LightDebugRenderer } from "../physics/light-debug";
import type { createCameraDebugMonitor } from "../utils/camera-debug";
import type { CameraTransition } from "../core/camera-transition";
import type { LevelCalendarDisplay } from "../levels/LevelCalendarDisplay";
import type { FailEffect } from "../ui/FailEffect";
import type { GameSoundManager } from "../audio";
import type { GroundContactTracker } from "../physics/ground-contact-tracker";

export type SharedBoardAnchor = BoardAnchor & {
  setRotation(quaternion: THREE.Quaternion): void;
};

export type GameLoopContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  world: RAPIER.World;
  collisionEventQueue: RAPIER.EventQueue;
  soundManager: GameSoundManager;
  groundContactTracker: GroundContactTracker;
  joystick: VirtualJoystick;
  levelManager: LevelManager;
  levelContents: Map<number, LevelContent>;
  getLevelContent: (id: number) => LevelContent;
  sharedBoard: SharedBoardAnchor;
  gateHole: PhysicsGateHole;
  ball: PhysicsBall;
  physicsDebug: PhysicsDebugRenderer | null;
  lightDebug: LightDebugRenderer | null;
  cameraDebug: ReturnType<typeof createCameraDebugMonitor> | null;
  failEffect: FailEffect;
  resetAfterLoss: () => void;
  lossEffectPlaying: { value: boolean };
  puzzleLevel1: LevelContent["puzzle"];
  puzzleIntroActive: { value: boolean };
  puzzleIntroTime: { value: number };
  transitionPhase: { value: LevelTransitionPhase };
  transitionTime: { value: number };
  transitionFromLevel: { value: number };
  transitionToLevel: { value: number };
  pendingNextLevel: { value: number | null };
  ballFrozen: { value: boolean };
  lossTimer: { value: number };
  lossPending: { value: boolean };
  giftPauseActive: { value: boolean };
  giftCameraTransition: CameraTransition;
  levelCalendarDisplay: LevelCalendarDisplay | null;
  finishLevelTransition: () => void;
  startLevelTransition: (fromLevel: number, toLevel: number) => void;
  startScreenActive: { value: boolean };
  spawnGuardFrames: { value: number };
};

function isJoystickInputLocked(ctx: GameLoopContext): boolean {
  return (
    ctx.startScreenActive.value ||
    ctx.giftPauseActive.value ||
    ctx.giftCameraTransition.isActive() ||
    ctx.lossPending.value ||
    ctx.lossEffectPlaying.value ||
    ctx.puzzleIntroActive.value ||
    ctx.transitionPhase.value !== "none" ||
    ctx.ballFrozen.value
  );
}

export function startGameLoop(ctx: GameLoopContext) {
  let currentTiltX = 0;
  let currentTiltZ = 0;

  const boardQuaternion = new THREE.Quaternion();
  const boardEuler = new THREE.Euler(0, 0, 0, "XYZ");
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const lerpFactor = 1 - Math.exp(-TILT_SMOOTHING * delta);

    const gameplayInputLocked = isJoystickInputLocked(ctx);
    ctx.joystick.setInputEnabled(!gameplayInputLocked);

    if (!gameplayInputLocked) {
      const targetTiltX = -ctx.joystick.y * MAX_TILT;
      const targetTiltZ = ctx.joystick.x * MAX_TILT;

      currentTiltX = THREE.MathUtils.lerp(currentTiltX, targetTiltX, lerpFactor);
      currentTiltZ = THREE.MathUtils.lerp(currentTiltZ, targetTiltZ, lerpFactor);
    } else {
      currentTiltX = THREE.MathUtils.lerp(currentTiltX, 0, lerpFactor);
      currentTiltZ = THREE.MathUtils.lerp(currentTiltZ, 0, lerpFactor);
    }

    boardEuler.set(currentTiltX, 0, currentTiltZ);
    boardQuaternion.setFromEuler(boardEuler);
    for (const content of ctx.levelContents.values()) {
      content.board.setRotation(boardQuaternion);
    }
    ctx.sharedBoard.setRotation(boardQuaternion);

    const fanLevel =
      ctx.transitionPhase.value === "level_in"
        ? ctx.transitionToLevel.value
        : ctx.levelManager.getCurrentLevel();
    ctx.getLevelContent(fanLevel).fans.forEach((fan) => fan.update(delta));

    const animLevel =
      ctx.transitionPhase.value === "level_in"
        ? ctx.transitionToLevel.value
        : ctx.levelManager.getCurrentLevel();
    const giftBox = ctx.getLevelContent(animLevel).giftBox;
    if (giftBox && !giftBox.isRemoved) {
      giftBox.update(delta, ctx.ball);
    }

    if (ctx.puzzleIntroActive.value && !ctx.startScreenActive.value) {
      ctx.puzzleIntroTime.value += delta;
      const t = Math.min(ctx.puzzleIntroTime.value / PUZZLE_INTRO_DURATION, 1);
      animatePuzzleRise(ctx.puzzleLevel1.visuals, t);
      if (t >= 1) {
        animatePuzzleOffset(ctx.puzzleLevel1.visuals, 0);
        ctx.puzzleIntroActive.value = false;
      }
    }

    if (ctx.transitionPhase.value === "waiting") {
      ctx.transitionTime.value += delta;
      if (ctx.transitionTime.value >= LEVEL_TRANSITION_DELAY && ctx.pendingNextLevel.value !== null) {
        ctx.startLevelTransition(ctx.levelManager.getCurrentLevel(), ctx.pendingNextLevel.value);
        ctx.pendingNextLevel.value = null;
      }
    } else if (ctx.transitionPhase.value === "level_out") {
      const from = ctx.getLevelContent(ctx.transitionFromLevel.value);
      ctx.transitionTime.value += delta;
      const t = Math.min(ctx.transitionTime.value / PUZZLE_INTRO_DURATION, 1);
      animatePuzzleSink(from.puzzle.visuals, t);
      from.board.setOpacity(1 - easeInCubic(t));
      if (t >= 1) {
        hidePuzzlesAfterSink(from.puzzle, from.puzzle.visuals);
        from.board.setOpacity(0);
        ctx.levelManager.setLevelState(ctx.transitionFromLevel.value, { visuals: false, physics: false });
        ctx.transitionPhase.value = "level_in";
        ctx.transitionTime.value = 0;
        const to = ctx.getLevelContent(ctx.transitionToLevel.value);
        preparePuzzleDropAnimation(to.puzzle.visuals, PUZZLE_INTRO_START_Y);
        to.puzzle.setVisible(true);
        to.board.setOpacity(0);
        ctx.levelManager.setLevelState(ctx.transitionToLevel.value, { visuals: true, physics: false });
      }
    } else if (ctx.transitionPhase.value === "level_in") {
      const to = ctx.getLevelContent(ctx.transitionToLevel.value);
      ctx.transitionTime.value += delta;
      const puzzleT = Math.min(ctx.transitionTime.value / PUZZLE_INTRO_DURATION, 1);
      const boardT = Math.min(ctx.transitionTime.value / BOARD_FADE_DURATION, 1);

      animatePuzzleRise(to.puzzle.visuals, puzzleT);
      to.board.setOpacity(easeOutCubic(boardT));

      ctx.levelCalendarDisplay?.setTransition(
        ctx.transitionFromLevel.value,
        ctx.transitionToLevel.value,
        boardT
      );

      if (puzzleT >= 1 && boardT >= 1) {
        animatePuzzleOffset(to.puzzle.visuals, 0);
        to.board.setOpacity(1);
        ctx.finishLevelTransition();
      }
    }

    if (!ctx.startScreenActive.value) {
      ctx.world.timestep = delta;
      ctx.world.step(ctx.collisionEventQueue);
      ctx.groundContactTracker.syncFromWorld(ctx.world, ctx.ball.colliderHandle);
      ctx.collisionEventQueue.drainCollisionEvents((handle1, handle2, started) => {
        if (!started) return;
        if (
          handle1 !== ctx.ball.colliderHandle &&
          handle2 !== ctx.ball.colliderHandle
        ) {
          return;
        }
        if (
          ctx.startScreenActive.value ||
          ctx.ballFrozen.value ||
          ctx.giftPauseActive.value
        ) {
          return;
        }
        ctx.soundManager.playHit();
      });
    }

    ctx.physicsDebug?.update();
    ctx.lightDebug?.update();

    ctx.giftCameraTransition.update(delta, ctx.camera, ctx.controls);

    if (!ctx.startScreenActive.value && !ctx.giftPauseActive.value && !ctx.ballFrozen.value) {
      ctx.gateHole.update(delta, ctx.ball, ctx.groundContactTracker.isTouchingGround);
      const activeHoles = ctx.getLevelContent(ctx.levelManager.getCurrentLevel()).holes;
      if (activeHoles?.isActive && !ctx.gateHole.isNear) {
        activeHoles.update(delta, ctx.ball, ctx.groundContactTracker.isTouchingGround);
      }

    }

    if (ctx.lossPending.value && !ctx.giftPauseActive.value) {
      ctx.lossTimer.value += delta;
      if (ctx.lossTimer.value >= 1 && !ctx.lossEffectPlaying.value) {
        ctx.lossPending.value = false;
        ctx.lossEffectPlaying.value = true;
        ctx.soundManager.playLoss();
        void ctx.failEffect.play().then(() => {
          ctx.resetAfterLoss();
          ctx.lossEffectPlaying.value = false;
        });
      }
    }

    if (!ctx.ballFrozen.value) {
      ctx.ball.syncFromPhysics();
    }

    if (ctx.spawnGuardFrames.value > 0) {
      ctx.ball.ensureSpawnIntegrity(ctx.scene);
      ctx.spawnGuardFrames.value -= 1;
    }

    if (!ctx.giftCameraTransition.isActive()) {
      ctx.controls.update();
    }
    ctx.cameraDebug?.update();
    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  animate();
}
