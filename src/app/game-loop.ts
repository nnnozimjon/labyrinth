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

export type SharedBoardAnchor = BoardAnchor & {
  setRotation(quaternion: THREE.Quaternion): void;
};

export type GameLoopContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  world: RAPIER.World;
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
  lossOverlay: { show: () => void };
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
  finishLevelTransition: () => void;
  startLevelTransition: (fromLevel: number, toLevel: number) => void;
};

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

    const gameplayInputLocked =
      ctx.giftPauseActive.value ||
      ctx.ballFrozen.value ||
      ctx.giftCameraTransition.isActive();

    if (!gameplayInputLocked) {
      const targetTiltX = -ctx.joystick.y * MAX_TILT;
      const targetTiltZ = ctx.joystick.x * MAX_TILT;

      currentTiltX = THREE.MathUtils.lerp(currentTiltX, targetTiltX, lerpFactor);
      currentTiltZ = THREE.MathUtils.lerp(currentTiltZ, targetTiltZ, lerpFactor);
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

    if (ctx.puzzleIntroActive.value) {
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

      if (puzzleT >= 1 && boardT >= 1) {
        animatePuzzleOffset(to.puzzle.visuals, 0);
        to.board.setOpacity(1);
        ctx.finishLevelTransition();
      }
    }

    ctx.world.timestep = delta;
    ctx.world.step();

    ctx.physicsDebug?.update();
    ctx.lightDebug?.update();

    ctx.giftCameraTransition.update(delta, ctx.camera, ctx.controls);

    if (!ctx.giftPauseActive.value && !ctx.ballFrozen.value) {
      ctx.gateHole.update(delta, ctx.ball);
      const activeHoles = ctx.getLevelContent(ctx.levelManager.getCurrentLevel()).holes;
      if (activeHoles?.isActive && !ctx.gateHole.isNear) {
        activeHoles.update(delta, ctx.ball);
      }
    }

    if (ctx.lossPending.value && !ctx.ballFrozen.value && !ctx.giftPauseActive.value) {
      ctx.lossTimer.value += delta;
      if (ctx.lossTimer.value >= 1) {
        ctx.lossPending.value = false;
        ctx.ballFrozen.value = true;
        ctx.ball.visual.visible = false;
        ctx.lossOverlay.show();
      }
    }

    if (!ctx.ballFrozen.value) {
      ctx.ball.syncFromPhysics();
    }

    if (!ctx.giftCameraTransition.isActive()) {
      ctx.controls.update();
    }
    ctx.cameraDebug?.update();
    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  animate();
}
