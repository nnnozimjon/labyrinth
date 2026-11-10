import * as THREE from "three";

export const MAX_TILT = THREE.MathUtils.degToRad(8);
export const TILT_SMOOTHING = 6;

/** Uniform scale for the board model and its physics collider. */
export const BOARD_SCALE = 10;

/** Scale for the large static environment ground. */
export const GROUND_SCALE = 10;

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

export const GRAVITY_Y = -24.81;

/**
 * Physics always advances in steps of exactly this size, whatever the display refresh rate.
 * Stepping Rapier with the raw frame time let a single slow frame carry the ball straight
 * through the paper-thin board or the hollow wall meshes.
 */
export const PHYSICS_TIMESTEP = 1 / 120;

/**
 * Longest frame time fed to the simulation and animations. Longer frames (GC pause, shader
 * compile, slow device) briefly slow the game down instead of teleporting the ball.
 */
export const MAX_FRAME_DELTA = 0.1;

/** Ball collider radius; the ball model is scaled to exactly this size. */
export const BALL_RADIUS = 0.3;
export const BALL_RESTITUTION = 0.6;

/**
 * Invisible solid rim around the play area, in board-local units relative to the surface.
 * Its inner faces sit flush behind the visible (hollow) walls. It reaches far above the
 * 0.4-high walls so a hard flick cannot launch the ball out, and dips below the floor so a
 * ball dropping into a hole next to a wall cannot slip out sideways underneath it.
 */
export const BOARD_CONTAINMENT = {
  thickness: 0.6,
  top: 2.5,
  bottom: -0.45,
} as const;

/** Dropping through the floor within this distance of the gate opening's centre wins. */
export const GOAL_TRIGGER_RADIUS = 1.5;

/** Dropping through the floor within this distance of a loss hole's centre loses. */
export const HOLE_TRIGGER_RADIUS = 0.5;

/** When true, renders wireframe debug visuals for all physics colliders. */
export const SHOW_COLLIDERS = false;

/** When true, shows helpers for scene lights (position and direction). */
export const SHOW_LIGHT_HELPERS = false;

/** When true, shows registered debug helper meshes (hole triggers, etc.). */
export const SHOW_DEBUG_HELPERS = false;

/** When true, enables OrbitControls camera orbit / pan / zoom. */
export const ENABLE_ORBIT_CONTROLS = false;

/** When true, logs the scene hierarchy to the console on startup. */
export const DEBUG_LOG_SCENE_HIERARCHY = false;

/** When true, logs camera transform changes and enables debug keyboard shortcuts. */
export const DEBUG_CAMERA_TRANSFORM = false;

/** When true, shows a lil-gui panel to tweak board wall subsurface scattering. */
export const DEBUG_SSS_UI = false;

/** When true, shows a lil-gui panel to position and tune the downward bulb light. */
export const DEBUG_BULB_LIGHT = false;

/** When true, shows a lil-gui panel to position level 3 hole triggers. */
export const DEBUG_HOLES_LEVEL3_UI = false;

/** When true, shows a lil-gui panel to position the level 3 ball spawn. */
export const DEBUG_BALL_SPAWN_LEVEL3_UI = false;

/** Start on this level (1–3). Set to 1 for normal play. */
export const DEBUG_START_LEVEL: number = 1;

/** How many units above the final position the puzzles start for the intro animation. */
export const PUZZLE_INTRO_START_Y = -30;

/** Duration in seconds for the puzzle drop-in / exit animation. */
export const PUZZLE_INTRO_DURATION = 2;

/** Duration in seconds for the level-2 board-ground fade-in. */
export const BOARD_FADE_DURATION = 2;

/** Pause after the win modal closes before the level swap animation begins. */
export const LEVEL_TRANSITION_DELAY = 1;

/** Manual placement for each puzzle obstacle (board-local coordinates). */
export const PUZZLE_PLACEMENTS = [
  {
    position: { x: 0, z: 0, y: 0 },
  },
];

export const TOTAL_LEVELS = 3;
