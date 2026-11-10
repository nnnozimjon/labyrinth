import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CameraState, CameraTransition } from "../core/camera-transition";
import { BallDropMonitor, type DropOutcome } from "../physics/ball-drop-monitor";
import { getBallStartPosition } from "../levels/ball-spawn";
import { clearSavedLevel, saveLevel } from "../levels/level-progress";
import type { LevelContent } from "../levels/level-types";
import {
  animatePuzzleOffset,
  animatePuzzleRise,
  animatePuzzleSink,
  easeInCubic,
  easeOutCubic,
  ensurePuzzleFinalY,
  hidePuzzlesAfterSink,
  preparePuzzleDropAnimation,
} from "../levels/puzzle-animation";
import {
  BOARD_FADE_DURATION,
  ENABLE_ORBIT_CONTROLS,
  LEVEL_TRANSITION_DELAY,
  PUZZLE_INTRO_DURATION,
  PUZZLE_INTRO_START_Y,
  TOTAL_LEVELS,
} from "../utils/constants";
import type { GameWorld } from "./game-world";

/** Pause between the ball dropping into a loss hole and the fail effect. */
const LOSS_EFFECT_DELAY = 1;

type GiftState = { readonly mode: "gift"; returning: boolean };
type LostState = { readonly mode: "lost"; elapsed: number; effectStarted: boolean };
type TransitionState = {
  readonly mode: "transition";
  /** Pause after the win overlay, old level sinking away, new level rising in. */
  phase: "waiting" | "level_out" | "level_in";
  elapsed: number;
  readonly from: number;
  readonly to: number;
};

type SessionState =
  /** Waiting for the start button; physics is paused. */
  | { readonly mode: "start" }
  | { readonly mode: "playing" }
  /** Camera close-up of the collected gift. */
  | GiftState
  /** Ball fell into a hole; it respawns after the fail effect. */
  | LostState
  /** Ball dropped through the gate; a win overlay is open. */
  | { readonly mode: "won" }
  | TransitionState;

export type GameSessionDeps = {
  readonly world: GameWorld;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  /** Camera flight to the gift close-up and back. */
  readonly giftCamera: CameraTransition;
  readonly defaultCameraState: CameraState;
  readonly giftCameraState: CameraState;
  readonly sound: { playLoss(): void };
  readonly ui: {
    showWin(level: number): void;
    showFinalWin(): void;
    showGift(): void;
    /** Resolves once the fail animation has finished. */
    playFailEffect(): Promise<void>;
  };
};

/**
 * The round's state machine: start screen, playing, won, lost, gift close-up and level swaps.
 *
 * A single explicit state replaces the many independent flags the game loop used to juggle,
 * so impossible combinations (frozen but not lost, a win during a level swap) cannot happen.
 */
export class GameSession {
  private state: SessionState = { mode: "start" };
  /** Seconds into the level-1 puzzle intro, or null when it is not running. */
  private introElapsed: number | null = null;
  private readonly dropMonitor: BallDropMonitor;
  private readonly ballLocal = new THREE.Vector3();

  constructor(private readonly deps: GameSessionDeps) {
    this.dropMonitor = new BallDropMonitor(deps.world.boardHalfExtents);
    deps.world.ball.freeze();

    // Level 1 opens with its puzzle rising into place; keep it out of sight until then.
    if (this.currentLevel === 1) {
      preparePuzzleDropAnimation(this.level(1).puzzle.visuals, PUZZLE_INTRO_START_Y);
    }
  }

  get currentLevel(): number {
    return this.deps.world.levelManager.getCurrentLevel();
  }

  /** Physics runs from the moment the player presses start. */
  get isSimulating(): boolean {
    return this.state.mode !== "start";
  }

  /** The ball is live: it can score, fall into holes, pick up the gift and make sounds. */
  get isBallInPlay(): boolean {
    return this.state.mode === "playing";
  }

  /** Tilt input is ignored and the board eases back to level. */
  get isInputLocked(): boolean {
    return this.state.mode !== "playing" || this.introElapsed !== null;
  }

  /** Level whose moving parts (fans, gift) animate: the incoming one during a level swap. */
  get animatedLevel(): number {
    const state = this.state;
    return state.mode === "transition" && state.phase === "level_in"
      ? state.to
      : this.currentLevel;
  }

  /** Start button: put the ball in play on the current level. */
  start() {
    if (this.state.mode !== "start") return;

    const level = this.currentLevel;
    this.respawnBall(level);
    saveLevel(level);
    if (level === 1) this.introElapsed = 0;
    this.state = { mode: "playing" };
  }

  /** Rules checked after every physics step: has the ball left play, and how? */
  afterPhysicsStep(step: number) {
    if (this.state.mode !== "playing") return;
    const { ball, boardFrame, gateHole, groundContacts, physicsWorld } = this.deps.world;

    if (!ball.hasValidState()) {
      // A NaN position would otherwise make the ball vanish for good.
      console.warn("Ball physics state became invalid; respawning it.");
      this.respawnBall(this.currentLevel);
      return;
    }

    groundContacts.update(physicsWorld, ball.collider);
    const holes = this.level(this.currentLevel).holes;
    const outcome = this.dropMonitor.update(
      step,
      boardFrame.toLocal(ball.body.translation(), this.ballLocal),
      groundContacts.isTouchingGround,
      { goal: gateHole.center, holes: holes?.isActive ? holes.positions : [] }
    );
    if (outcome) this.handleDrop(outcome);
  }

  /** Per-frame timers: the level-1 intro, the loss sequence and level swaps. */
  update(delta: number) {
    this.updateIntro(delta);

    const state = this.state;
    if (state.mode === "lost") {
      this.updateLoss(state, delta);
    } else if (state.mode === "transition") {
      this.updateTransition(state, delta);
    }
  }

  /** "Next level" on the win overlay. */
  advanceToNextLevel() {
    const from = this.currentLevel;
    if (this.state.mode !== "won" || from >= TOTAL_LEVELS) return;
    this.state = { mode: "transition", phase: "waiting", elapsed: 0, from, to: from + 1 };
  }

  /** Play the current level again (after the final win). */
  replayCurrentLevel() {
    if (this.state.mode !== "won") return;
    this.respawnBall(this.currentLevel);
    this.state = { mode: "playing" };
  }

  /** The ball reached the gift: pause and fly the camera in for the reward overlay. */
  collectGift() {
    if (this.state.mode !== "playing") return;
    const { camera, controls, giftCamera, giftCameraState, ui } = this.deps;

    this.state = { mode: "gift", returning: false };
    this.deps.world.ball.freeze();
    controls.enabled = false;
    giftCamera.start(camera, controls, giftCameraState, () => ui.showGift());
  }

  /** Reward overlay closed: fade the gift away, fly back and resume play. */
  dismissGift() {
    const state = this.state;
    if (state.mode !== "gift" || state.returning) return;
    state.returning = true;

    const { camera, controls, giftCamera, defaultCameraState } = this.deps;
    this.level(this.currentLevel).giftBox?.fadeOut();
    giftCamera.start(camera, controls, defaultCameraState, () => {
      controls.enabled = ENABLE_ORBIT_CONTROLS;
      this.deps.world.ball.unfreeze();
      this.state = { mode: "playing" };
    });
  }

  private handleDrop(outcome: DropOutcome) {
    const { ball } = this.deps.world;
    ball.freeze();
    ball.setVisible(false);

    if (outcome === "goal") {
      this.state = { mode: "won" };
      const level = this.currentLevel;
      if (level >= TOTAL_LEVELS) {
        clearSavedLevel();
        this.deps.ui.showFinalWin();
      } else {
        this.deps.ui.showWin(level);
      }
      return;
    }

    if (outcome === "escaped") {
      // Containment should make this impossible; treat it as a loss rather than a lost ball.
      console.warn("Ball left the board outside any hole; counting it as a loss.");
    }
    this.state = { mode: "lost", elapsed: 0, effectStarted: false };
  }

  private updateIntro(delta: number) {
    if (this.introElapsed === null) return;

    this.introElapsed += delta;
    const t = Math.min(this.introElapsed / PUZZLE_INTRO_DURATION, 1);
    const visuals = this.level(1).puzzle.visuals;
    animatePuzzleRise(visuals, t);
    if (t >= 1) {
      animatePuzzleOffset(visuals, 0);
      this.introElapsed = null;
    }
  }

  private updateLoss(state: LostState, delta: number) {
    state.elapsed += delta;
    if (state.effectStarted || state.elapsed < LOSS_EFFECT_DELAY) return;

    state.effectStarted = true;
    this.deps.sound.playLoss();
    const resume = () => {
      if (this.state !== state) return;
      this.respawnBall(this.currentLevel);
      this.state = { mode: "playing" };
    };
    this.deps.ui.playFailEffect().then(resume, resume);
  }

  private updateTransition(state: TransitionState, delta: number) {
    const { levelManager, calendar } = this.deps.world;
    const from = this.level(state.from);
    const to = this.level(state.to);
    state.elapsed += delta;

    switch (state.phase) {
      case "waiting": {
        if (state.elapsed < LEVEL_TRANSITION_DELAY) return;

        ensurePuzzleFinalY(from.puzzle.visuals);
        from.puzzle.setCollidersEnabled(false);
        for (const fan of from.fans) fan.setEnabled(false);
        state.phase = "level_out";
        state.elapsed = 0;
        return;
      }

      case "level_out": {
        const t = Math.min(state.elapsed / PUZZLE_INTRO_DURATION, 1);
        animatePuzzleSink(from.puzzle.visuals, t);
        from.board.setOpacity(1 - easeInCubic(t));
        if (t < 1) return;

        hidePuzzlesAfterSink(from.puzzle, from.puzzle.visuals);
        from.board.setOpacity(0);
        levelManager.setLevelState(state.from, { visuals: false, physics: false });

        preparePuzzleDropAnimation(to.puzzle.visuals, PUZZLE_INTRO_START_Y);
        to.puzzle.setVisible(true);
        to.board.setOpacity(0);
        levelManager.setLevelState(state.to, { visuals: true, physics: false });
        state.phase = "level_in";
        state.elapsed = 0;
        return;
      }

      case "level_in": {
        const puzzleT = Math.min(state.elapsed / PUZZLE_INTRO_DURATION, 1);
        const boardT = Math.min(state.elapsed / BOARD_FADE_DURATION, 1);
        animatePuzzleRise(to.puzzle.visuals, puzzleT);
        to.board.setOpacity(easeOutCubic(boardT));
        calendar?.setTransition(state.from, state.to, boardT);
        if (puzzleT < 1 || boardT < 1) return;

        animatePuzzleOffset(to.puzzle.visuals, 0);
        to.board.setOpacity(1);
        levelManager.setCurrentLevel(state.to);
        calendar?.setLevel(state.to);
        saveLevel(state.to);
        this.respawnBall(state.to);
        this.state = { mode: "playing" };
        return;
      }
    }
  }

  private respawnBall(level: number) {
    this.dropMonitor.reset();
    this.deps.world.groundContacts.reset();
    this.deps.world.ball.respawn(getBallStartPosition(level));
  }

  private level(id: number): LevelContent {
    return this.deps.world.getLevel(id);
  }
}
