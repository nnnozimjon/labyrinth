import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import RAPIER from "@dimforge/rapier3d-compat";
import ballModelUrl from "./ball.glb?url";
import boardModelUrl from "./board-ground-level-2.glb?url";
import wallsModelUrl from "./board-walls.glb?url";
import gateModelUrl from "./board-gate.glb?url";
import puzzleModelUrl from "./puzzle-2.glb?url";
import stairsModelUrl from "./board-stairs.glb?url";
import groundModelUrl from "./ground.glb?url";
import bookModelUrl from "./book.glb?url";
import ticketModelUrl from "./ticket.glb?url";
import lampModelUrl from "./lamp.glb?url";
import cupPlateModelUrl from "./cup-plate.glb?url";
import levelCalendarModelUrl from "./level-calendar.glb?url";
import boxModelUrl from "./box.glb?url";
import sandWatchModelUrl from "./sand-watch.glb?url";
import dicesModelUrl from "./dices.glb?url";
import vfxHolesModelUrl from './level2-holes-vfx.glb?url';
import { PhysicsBall } from "./PhysicsBall";
import { PhysicsBoard } from "./PhysicsBoard";
import { PhysicsGate } from "./PhysicsGate";
import { PhysicsHoles } from "./PhysicsHoles";
import { PhysicsPuzzle } from "./PhysicsPuzzle";
import { FAN_OBJECT_NAME, PuzzleFanRotation } from "./PuzzleFanRotation";
import { PhysicsStaticEnvironment } from "./PhysicsStaticEnvironment";
import { PhysicsStairs } from "./PhysicsStairs";
import { PhysicsWalls } from "./PhysicsWalls";
import { PhysicsDebugRenderer } from "./PhysicsDebug";
import { LightDebugRenderer } from "./LightDebugRenderer";
import { logSceneHierarchy } from "./physicsUtils";
import {
  SAND_WATCH_MATERIAL_OVERRIDES,
  CUP_PLATE_MATERIAL_OVERRIDES,
  BOARD_WALL_MATERIAL_OVERRIDES,
  LAMP_MATERIAL_OVERRIDES,
  LEVEL_CALENDAR_MATERIAL_COLORS,
  FORMULA55_YELLOW,
} from "./materialUtils";
import { createSubsurfaceScatteringDebugUI } from "./subsurfaceScatteringDebug";
import {
  configureRenderer,
  setupBlenderStyleLighting,
  setupBulbLight,
  aimLampAt,
  addPuzzleAreaPointLight,
  enableShadowsOnObject,
} from "./sceneLighting";
import { VirtualJoystick } from "./joystick";
import { createCameraDebugMonitor } from "./cameraDebug";
import { createBulbLightDebugUI } from "./bulbLightDebug";

// --- Scene setup ---

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1f1812);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(10, 3.5, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
configureRenderer(renderer);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(7.5, 0.6, -1.5);

// --- Lighting (warm Blender-style desk lamp + shadows) ---

const sceneLights = setupBlenderStyleLighting(scene);
const bulbLights = setupBulbLight(scene);
const boardFocus = new THREE.Vector3(0, 0.5, 0);
aimLampAt(sceneLights, new THREE.Vector3(0, 0, 0), boardFocus);

const MAX_TILT = THREE.MathUtils.degToRad(8);
const TILT_SMOOTHING = 6;

/** Uniform scale for the board model and its physics collider. */
const BOARD_SCALE = 10;

/** Scale for the large static environment ground. */
const GROUND_SCALE = 10;

/** Set to override the auto-calculated collider radius from the GLB bounding sphere. */
const BALL_COLLIDER_RADIUS: number | undefined = 0.5;

/** When true, renders wireframe debug visuals for all physics colliders. */
const SHOW_COLLIDERS = false;

/** When true, shows helpers for scene lights (position and direction). */
const SHOW_LIGHT_HELPERS = false;

/** When true, logs camera transform changes and enables debug keyboard shortcuts. */
const DEBUG_CAMERA_TRANSFORM = false;

/** When true, shows a lil-gui panel to tweak board wall subsurface scattering. */
const DEBUG_SSS_UI = true;

/** When true, shows a lil-gui panel to position and tune the downward bulb light. */
const DEBUG_BULB_LIGHT = true;

/** How many units above the final position the puzzles start for the intro animation. */
const PUZZLE_INTRO_START_Y = -30;

/** Duration in seconds for the puzzle drop-in animation. */
const PUZZLE_INTRO_DURATION = 2;

/** Manual placement for each puzzle obstacle (board-local coordinates). */
const PUZZLE_PLACEMENTS = [
  {
    position: { x: 0, z: 0, y: 0 }, // final resting y position
  },
];

async function main() {
  await RAPIER.init();

  const joystick = new VirtualJoystick();

  const gravity = new RAPIER.Vector3(0, -9.81, 0);
  const world = new RAPIER.World(gravity);

  const staticWorldGroup = new THREE.Group();
  const tiltingBoardGroup = new THREE.Group();
  scene.add(staticWorldGroup);
  scene.add(tiltingBoardGroup);

  await PhysicsStaticEnvironment.create(
    RAPIER,
    world,
    staticWorldGroup,
    groundModelUrl,
    {
      scale: GROUND_SCALE * 2,
      position: { x: -24, y: -0.35, z: -6 },
      textureUrl: "/textures/fabric.png",
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      repeat: { x: 8, y: 6 },
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0,
    }
  );

  const board = await PhysicsBoard.create(
    RAPIER,
    world,
    tiltingBoardGroup,
    boardModelUrl,
    {
      scale: BOARD_SCALE,
      textureUrl: "/textures/ground-2.png",
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      repeat: { x: 2.5, y: 2 },
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1,
    }
  );

  await PhysicsStairs.create(RAPIER, world, staticWorldGroup, board, stairsModelUrl, {
    scale: BOARD_SCALE,
    position: { y: -0.2 },
  });

  await PhysicsStaticEnvironment.create(
    RAPIER,
    world,
    staticWorldGroup,
    bookModelUrl,
    {
      scale: BOARD_SCALE,
      alignWithBoard: true,
      position: { x: 1, z: 0.3, y: -0.6 },
      enableColliders: false,
      textureUrl: "/textures/book-cover.png",
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      repeat: { x: 1, y: 1 },
      textureRotation: THREE.MathUtils.degToRad(90),
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1,
    },
    board
  );

  await PhysicsStaticEnvironment.create(
    RAPIER,
    world,
    staticWorldGroup,
    ticketModelUrl,
    {
      scale: BOARD_SCALE,
      alignWithBoard: true,
      position: { x: -0.5, z: 0.5, y: -0.6 },
      enableColliders: false,
      textureUrl: "/textures/tickets.png",
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      repeat: { x: 1, y: 1 },
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1,
    },
    board
  );

  const lamp = await PhysicsStaticEnvironment.create(
    RAPIER,
    world,
    staticWorldGroup,
    lampModelUrl,
    {
      scale: BOARD_SCALE,
      alignWithBoard: true,
      position: { x: 0, z: 0, y: -0.7 },
      enableColliders: false,
      materialOverrides: LAMP_MATERIAL_OVERRIDES,
    },
    board
  );

  const lampPosition = new THREE.Vector3();
  lamp.visual.getWorldPosition(lampPosition);
  aimLampAt(sceneLights, lampPosition, boardFocus);

  await PhysicsStaticEnvironment.create(
    RAPIER,
    world,
    staticWorldGroup,
    dicesModelUrl,
    {
      scale: BOARD_SCALE,
      alignWithBoard: true,
      position: { x: 0, z: 1, y: -0.58 },
      enableColliders: false,
      materialTextures: {
        "black-dice": "/textures/black-dice.png",
        "yellow-dice": "/textures/yellow-dice.png",
        "yellow-dice.001": "/textures/yellow-dice.png",
      },
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      repeat: { x: 1, y: 1 },
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1,
    },
    board
  );

  await PhysicsStaticEnvironment.create(
    RAPIER,
    world,
    staticWorldGroup,
    levelCalendarModelUrl,
    {
      scale: BOARD_SCALE,
      alignWithBoard: true,
      position: { x: 0, z: 1, y: -0.6 },
      enableColliders: false,
      materialTextures: {
        "level-1": "/textures/level-1.png",
        "level-2": "/textures/level-2.png",
        "level-3": "/textures/level-3.png",
      },
      materialColors: LEVEL_CALENDAR_MATERIAL_COLORS,
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      repeat: { x: 1, y: 1 },
      flipY: true,
      flipX: true,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1,
    },
    board
  );

  await PhysicsStaticEnvironment.create(
    RAPIER,
    world,
    staticWorldGroup,
    boxModelUrl,
    {
      scale: BOARD_SCALE,
      alignWithBoard: true,
      position: { x: 0, z: 1, y: -0.6 },
      enableColliders: false,
      textureUrl: "/textures/box-cover.png",
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      repeat: { x: 1, y: 1 },
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1,
    },
    board
  );

  await PhysicsStaticEnvironment.create(
    RAPIER,
    world,
    staticWorldGroup,
    cupPlateModelUrl,
    {
      scale: BOARD_SCALE,
      alignWithBoard: true,
      position: { x: 8, z: -2, y: -0.6 },
      rotation: { y: THREE.MathUtils.degToRad(-35) },
      enableColliders: false,
      materialOverrides: CUP_PLATE_MATERIAL_OVERRIDES,
    },
    board
  );

  
  // camera.position.set(0.075, 4.137, -8.108);
  // camera.rotation.set(-2.667, -0.009, -3.137);
  // controls.target.set(0.15, 0.44, -0.913);
  // controls.update();

  camera.position.set(0.37, 8.582, -7.819);
  camera.rotation.set(-2.274, 0.021, 3.117);
  controls.target.set(0.15, 0.44, -0.913);
  controls.update();

  await PhysicsStaticEnvironment.create(
    RAPIER,
    world,
    staticWorldGroup,
    sandWatchModelUrl,
    {
      scale: BOARD_SCALE,
      alignWithBoard: true,
      position: { x: -0.5, z: 1.3, y: -0.6 },
      enableColliders: false,
      materialOverrides: SAND_WATCH_MATERIAL_OVERRIDES,
    },
    board
  );
  

  await PhysicsWalls.create(RAPIER, world, board, wallsModelUrl, {
    scale: BOARD_SCALE,
    textureUrl: "/textures/fabric-2.png",
  });

  await PhysicsGate.create(RAPIER, world, board, gateModelUrl, {
    scale: BOARD_SCALE,
  });

  const holes = await PhysicsHoles.create(RAPIER, world, board, vfxHolesModelUrl);

  const puzzle = await PhysicsPuzzle.create(RAPIER, world, board, puzzleModelUrl, {
    scale: BOARD_SCALE,
    placements: PUZZLE_PLACEMENTS,
    textureUrl: "/textures/fabric-2.png",
    excludeColliderObjectNames: [FAN_OBJECT_NAME],
  });

  // --- Puzzle intro drop animation setup ---
  // Save each visual's final Y, then offset them upward to start high
  puzzle.visuals.forEach((v) => {
    v.userData.finalY = v.position.y;
    v.position.y += PUZZLE_INTRO_START_Y;
  });

  let puzzleIntroTime = 0;
  let puzzleIntroActive = true;
  // ---------------------------------------

  const puzzleFans = puzzle.visuals
    .map((visual) =>
      PuzzleFanRotation.attach(visual, {
        RAPIER,
        world,
        boardBody: board.body,
        boardVisual: board.visual,
      })
    )
    .filter((fan): fan is PuzzleFanRotation => fan !== null);

  const wallOverride = BOARD_WALL_MATERIAL_OVERRIDES["wall-around"];
  createSubsurfaceScatteringDebugUI({
    root: board.visual,
    enabled: DEBUG_SSS_UI,
    color: wallOverride?.color ?? FORMULA55_YELLOW,
    roughness: wallOverride?.roughness ?? 0.8,
    subsurfaceScattering: wallOverride?.subsurfaceScattering ?? {},
  });

  createBulbLightDebugUI({
    lights: bulbLights,
    enabled: DEBUG_BULB_LIGHT,
  });

  addPuzzleAreaPointLight(board.visual, PUZZLE_PLACEMENTS);

  const ball = await PhysicsBall.create(RAPIER, world, scene, ballModelUrl, {
    colliderRadius: BALL_COLLIDER_RADIUS,
    startPosition: new THREE.Vector3(0, 0.3, 2.8),
  });

  // enable shadows on static world group and tilting board group
  enableShadowsOnObject(staticWorldGroup);
  // enableShadowsOnObject(tiltingBoardGroup);
  // enableShadowsOnObject(ball.visual);

  const physicsDebug = SHOW_COLLIDERS
    ? new PhysicsDebugRenderer(world, scene)
    : null;

  const lightDebug = SHOW_LIGHT_HELPERS ? new LightDebugRenderer(scene) : null;

  const cameraDebug = DEBUG_CAMERA_TRANSFORM
    ? createCameraDebugMonitor(camera, controls)
    : null;
  cameraDebug?.enable();

  logSceneHierarchy(scene, "root");

  let currentTiltX = 0;
  let currentTiltZ = 0;

  const boardQuaternion = new THREE.Quaternion();
  const boardEuler = new THREE.Euler(0, 0, 0, "XYZ");

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const lerpFactor = 1 - Math.exp(-TILT_SMOOTHING * delta);

    const targetTiltX = -joystick.y * MAX_TILT;
    const targetTiltZ = joystick.x * MAX_TILT;

    currentTiltX = THREE.MathUtils.lerp(currentTiltX, targetTiltX, lerpFactor);
    currentTiltZ = THREE.MathUtils.lerp(currentTiltZ, targetTiltZ, lerpFactor);

    boardEuler.set(currentTiltX, 0, currentTiltZ);
    boardQuaternion.setFromEuler(boardEuler);
    board.setRotation(boardQuaternion);
    puzzleFans.forEach((fan) => fan.update(delta));

    // --- Puzzle intro drop animation ---
    if (puzzleIntroActive) {
      puzzleIntroTime += delta;
      const t = Math.min(puzzleIntroTime / PUZZLE_INTRO_DURATION, 1);
      // Ease out cubic: fast drop, gentle landing
      const eased = 1 - Math.pow(1 - t, 3);
      const offsetY = PUZZLE_INTRO_START_Y * (1 - eased);
      puzzle.visuals.forEach((v) => {
        v.position.y = v.userData.finalY + offsetY;
      });
      if (t >= 1) {
        // Snap exactly to final position and stop animating
        puzzle.visuals.forEach((v) => {
          v.position.y = v.userData.finalY;
        });
        puzzleIntroActive = false;
      }
    }
    // ------------------------------------

    world.timestep = delta;
    world.step();

    physicsDebug?.update();
    lightDebug?.update();
    holes.update(delta);

    const ballCollider = ball.body.collider(0);
    if (holes.isTouching(world, ballCollider)) {
      ball.reset();
    }
    ball.syncFromPhysics();

    controls.update();
    cameraDebug?.update();
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

main().catch((error) => {
  const url =
    error instanceof ErrorEvent && error.target instanceof HTMLImageElement
      ? error.target.src
      : error instanceof Error && error.message.includes("Failed to load texture:")
        ? error.message.replace("Failed to load texture: ", "")
        : undefined;
  console.error(
    url ? `Failed to start game (texture: ${url}):` : "Failed to start game:",
    error
  );
});