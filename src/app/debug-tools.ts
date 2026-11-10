import type * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PhysicsDebugRenderer } from "../physics/physics-debug";
import { LightDebugRenderer } from "../physics/light-debug";
import { logSceneHierarchy } from "../physics/collider-utils";
import { createCameraDebugMonitor } from "../utils/camera-debug";
import { createBulbLightDebugUI } from "../utils/bulb-light-debug";
import { createSubsurfaceScatteringDebugUI } from "../utils/subsurface-scattering-debug";
import { BOARD_WALL_MATERIAL_OVERRIDES, FORMULA55_YELLOW } from "../utils/material-utils";
import { createHolesLevel3DebugUI } from "../entities/holes/holes-level3-debug";
import { createBallSpawnLevel3DebugUI } from "../levels/ball-spawn-level3-debug";
import { LEVEL_BALL_START_POSITIONS } from "../levels/ball-spawn";
import {
  DEBUG_BALL_SPAWN_LEVEL3_UI,
  DEBUG_BULB_LIGHT,
  DEBUG_CAMERA_TRANSFORM,
  DEBUG_HOLES_LEVEL3_UI,
  DEBUG_LOG_SCENE_HIERARCHY,
  DEBUG_SSS_UI,
  SHOW_COLLIDERS,
  SHOW_LIGHT_HELPERS,
} from "../utils/constants";
import type { GameWorld } from "./game-world";

export type DebugToolsContext = {
  readonly world: GameWorld;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
};

/**
 * Creates the debug panels and overlays switched on in `utils/constants.ts` and returns their
 * per-frame update callbacks. With every flag off (the default) it does nothing, and the
 * production build drops the debug code.
 */
export function setupDebugTools(context: DebugToolsContext): (() => void)[] {
  const { world, scene, camera, controls } = context;
  const updaters: (() => void)[] = [];

  if (DEBUG_HOLES_LEVEL3_UI) {
    const holes = world.getLevel(3).holes;
    if (holes) createHolesLevel3DebugUI({ holes, enabled: true });
  }

  if (DEBUG_SSS_UI) {
    const wall = BOARD_WALL_MATERIAL_OVERRIDES["wall-around"];
    createSubsurfaceScatteringDebugUI({
      root: world.sharedBoard.visual,
      enabled: true,
      color: wall?.color ?? FORMULA55_YELLOW,
      roughness: wall?.roughness ?? 0.8,
      subsurfaceScattering: wall?.subsurfaceScattering ?? {},
    });
  }

  if (DEBUG_BULB_LIGHT) {
    createBulbLightDebugUI({ lights: world.lights.bulb, enabled: true });
  }

  if (DEBUG_BALL_SPAWN_LEVEL3_UI) {
    createBallSpawnLevel3DebugUI({
      ball: world.ball,
      spawn: LEVEL_BALL_START_POSITIONS[3],
      enabled: true,
    });
  }

  if (SHOW_COLLIDERS) {
    const colliders = new PhysicsDebugRenderer(world.physicsWorld, scene, {
      shouldShowCollider: (collider) => world.levelManager.isColliderVisibleInDebug(collider),
    });
    updaters.push(() => colliders.update());
  }

  if (SHOW_LIGHT_HELPERS) {
    const lightHelpers = new LightDebugRenderer(scene);
    updaters.push(() => lightHelpers.update());
  }

  if (DEBUG_CAMERA_TRANSFORM) {
    const cameraMonitor = createCameraDebugMonitor(camera, controls);
    cameraMonitor.enable();
    updaters.push(() => cameraMonitor.update());
  }

  if (DEBUG_LOG_SCENE_HIERARCHY) {
    logSceneHierarchy(scene, "root");
  }

  return updaters;
}
