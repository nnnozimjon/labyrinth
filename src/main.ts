import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import RAPIER from "@dimforge/rapier3d-compat";
import ballModelUrl from "./ball.glb?url";

import boardLevel1ModelUrl from "./board-ground.glb?url";
import puzzleLevel1ModelUrl from "./puzzles.glb?url";
import boardLevel2ModelUrl from "./board-ground-level-2.glb?url";
import puzzleLevel2ModelUrl from "./puzzle-2.glb?url";
import vfxHolesLevel2ModelUrl from "./level2-holes-vfx.glb?url";
import boardLevel3ModelUrl from "./board-ground-3.glb?url";
import puzzleLevel3ModelUrl from "./level3-puzzle.glb?url";
import vfxHolesLevel3ModelUrl from "./vfx-holes-level3.glb?url";
import { PhysicsHoles } from "./PhysicsHoles";


import wallsModelUrl from "./board-walls.glb?url";
import gateModelUrl from "./board-gate.glb?url";
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
import vfxGateHoleModelUrl from './gate-hole-vfx.glb?url';
import { PhysicsBall } from "./PhysicsBall";
import { PhysicsBoard } from "./PhysicsBoard";
import { PhysicsGate } from "./PhysicsGate";
import { PhysicsPuzzle } from "./PhysicsPuzzle";
import { FAN_OBJECT_NAME, PuzzleFanRotation } from "./PuzzleFanRotation";
import { PhysicsStaticEnvironment } from "./PhysicsStaticEnvironment";
import { PhysicsGateHole } from "./PhysicsGateHole";
import { PhysicsStairs } from "./PhysicsStairs";
import { PhysicsWalls } from "./PhysicsWalls";
import { PhysicsDebugRenderer } from "./PhysicsDebug";
import { LightDebugRenderer } from "./LightDebugRenderer";
import { LevelManager } from "./LevelManager";
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

/** Start on this level (1–3). Set to 1 for normal play. */
const DEBUG_START_LEVEL: number = 3;

/** How many units above the final position the puzzles start for the intro animation. */
const PUZZLE_INTRO_START_Y = -30;

/** Duration in seconds for the puzzle drop-in / exit animation. */
const PUZZLE_INTRO_DURATION = 2;

/** Duration in seconds for the level-2 board-ground fade-in. */
const BOARD_FADE_DURATION = 2;

/** Pause after the win modal closes before the level swap animation begins. */
const LEVEL_TRANSITION_DELAY = 1;

/** Manual placement for each puzzle obstacle (board-local coordinates). */
const PUZZLE_PLACEMENTS = [
  {
    position: { x: 0, z: 0, y: 0 },
  },
];

const TOTAL_LEVELS = 3;

type LevelContent = {
  board: PhysicsBoard;
  puzzle: PhysicsPuzzle;
  holes: PhysicsHoles | null;
  fans: PuzzleFanRotation[];
};

type LevelTransitionPhase = "none" | "waiting" | "level_out" | "level_in";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Mirror of ease-out for sinking / exit animations. */
function easeInCubic(t: number): number {
  return t * t * t;
}

function ensurePuzzleFinalY(visuals: THREE.Object3D[]) {
  for (const visual of visuals) {
    if (visual.userData.finalY === undefined) {
      visual.userData.finalY = visual.position.y;
    }
  }
}

function preparePuzzleDropAnimation(visuals: THREE.Object3D[], startOffsetY: number) {
  ensurePuzzleFinalY(visuals);
  for (const visual of visuals) {
    visual.position.y = visual.userData.finalY + startOffsetY;
  }
}

function animatePuzzleOffset(visuals: THREE.Object3D[], offsetY: number) {
  for (const visual of visuals) {
    visual.position.y = visual.userData.finalY + offsetY;
  }
}

/** Rise from below — used on level intro. */
function animatePuzzleRise(visuals: THREE.Object3D[], t: number) {
  animatePuzzleOffset(visuals, PUZZLE_INTRO_START_Y * (1 - easeOutCubic(t)));
}

/** Sink downward — reverse of rise; hide visuals once t >= 1. */
function animatePuzzleSink(visuals: THREE.Object3D[], t: number) {
  animatePuzzleOffset(visuals, PUZZLE_INTRO_START_Y * easeInCubic(t));
}

function hidePuzzlesAfterSink(puzzle: PhysicsPuzzle, visuals: THREE.Object3D[]) {
  animatePuzzleOffset(visuals, PUZZLE_INTRO_START_Y);
  puzzle.setVisible(false);
}

function registerLevelContent(
  levelManager: LevelManager,
  id: number,
  content: LevelContent,
  holes: PhysicsHoles | null
) {
  levelManager.registerLevelObject(id, content.board.visual);
  levelManager.registerLevelObject(id, content.puzzle.visuals[0]);
  levelManager.registerLevelBody(id, content.board.body);

  for (const collider of content.board.getColliders()) {
    levelManager.registerLevelCollider(id, collider);
  }
  for (const collider of content.puzzle.getColliders()) {
    levelManager.registerLevelCollider(id, collider);
  }
  for (const fan of content.fans) {
    for (const collider of fan.getColliders()) {
      levelManager.registerLevelCollider(id, collider);
    }
  }
  if (holes) {
    for (const helper of holes.getDebugHelpers()) {
      levelManager.registerDebugHelper(id, helper);
    }
  }
}

function createLossOverlay() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes loss-card-glow {
      0%, 100% { box-shadow: 0 0 30px rgba(255,60,0,0.4), 0 0 60px rgba(255,60,0,0.15); }
      50%       { box-shadow: 0 0 55px rgba(255,60,0,0.7), 0 0 110px rgba(255,60,0,0.35); }
    }
    @keyframes loss-title-glow {
      0%, 100% { text-shadow: 0 0 18px rgba(255,60,0,0.8); }
      50%       { text-shadow: 0 0 36px rgba(255,60,0,1), 0 0 70px rgba(255,60,0,0.5); }
    }
    #loss-retry-btn:hover { background: #cc2200 !important; transform: scale(1.06); }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed", inset: "0",
    background: "rgba(0,0,0,0.78)",
    display: "none", alignItems: "center", justifyContent: "center",
    zIndex: "1000",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: "rgba(22,8,8,0.97)",
    border: "2px solid #ff3c00",
    borderRadius: "20px",
    padding: "52px 72px",
    textAlign: "center",
    animation: "loss-card-glow 2s ease-in-out infinite",
  });

  const title = document.createElement("h1");
  title.textContent = "You kinda lost...";
  Object.assign(title.style, {
    color: "#ff3c00", fontSize: "3rem",
    margin: "0 0 8px", fontFamily: "sans-serif", fontWeight: "bold",
    animation: "loss-title-glow 2s ease-in-out infinite",
  });

  const sub = document.createElement("p");
  sub.textContent = "The ball fell in a hole. Better luck next time!";
  Object.assign(sub.style, {
    color: "rgba(255,60,0,0.65)", fontSize: "1.1rem",
    margin: "0 0 34px", fontFamily: "sans-serif",
  });

  const btn = document.createElement("button");
  btn.id = "loss-retry-btn";
  btn.textContent = "Try Again";
  Object.assign(btn.style, {
    background: "#ff3c00", color: "#160808",
    border: "none", borderRadius: "10px",
    padding: "16px 44px", fontSize: "1.2rem", fontWeight: "bold",
    cursor: "pointer", fontFamily: "sans-serif",
    transition: "background 0.18s, transform 0.18s",
    display: "block", margin: "0 auto",
  });

  card.append(title, sub, btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  return {
    show: () => { overlay.style.display = "flex"; },
    hide: () => { overlay.style.display = "none"; },
    onRetry: (cb: () => void) => { btn.addEventListener("click", cb); },
  };
}

function createWinOverlay() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes win-card-glow {
      0%, 100% { box-shadow: 0 0 30px rgba(0,255,68,0.4), 0 0 60px rgba(0,255,68,0.15); }
      50%       { box-shadow: 0 0 55px rgba(0,255,68,0.7), 0 0 110px rgba(0,255,68,0.35); }
    }
    @keyframes win-title-glow {
      0%, 100% { text-shadow: 0 0 18px rgba(0,255,68,0.8); }
      50%       { text-shadow: 0 0 36px rgba(0,255,68,1), 0 0 70px rgba(0,255,68,0.5); }
    }
    #win-next-btn:hover { background: #00cc33 !important; transform: scale(1.06); }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed", inset: "0",
    background: "rgba(0,0,0,0.78)",
    display: "none", alignItems: "center", justifyContent: "center",
    zIndex: "1000",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: "rgba(8,22,12,0.97)",
    border: "2px solid #00ff44",
    borderRadius: "20px",
    padding: "52px 72px",
    textAlign: "center",
    animation: "win-card-glow 2s ease-in-out infinite",
  });

  const title = document.createElement("h1");
  title.textContent = "You Win!";
  Object.assign(title.style, {
    color: "#00ff44", fontSize: "3.6rem",
    margin: "0 0 8px", fontFamily: "sans-serif", fontWeight: "bold",
    animation: "win-title-glow 2s ease-in-out infinite",
  });

  const sub = document.createElement("p");
  sub.textContent = "Level Complete";
  Object.assign(sub.style, {
    color: "rgba(0,255,68,0.65)", fontSize: "1.1rem",
    margin: "0 0 34px", fontFamily: "sans-serif",
  });

  const btn = document.createElement("button");
  btn.id = "win-next-btn";
  btn.textContent = "Next Level";
  Object.assign(btn.style, {
    background: "#00ff44", color: "#061008",
    border: "none", borderRadius: "10px",
    padding: "16px 44px", fontSize: "1.2rem", fontWeight: "bold",
    cursor: "pointer", fontFamily: "sans-serif",
    transition: "background 0.18s, transform 0.18s",
    display: "block", margin: "0 auto",
  });

  card.append(title, sub, btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  return {
    show: () => { overlay.style.display = "flex"; },
    hide: () => { overlay.style.display = "none"; },
    onNextLevel: (cb: () => void) => { btn.addEventListener("click", cb); },
  };
}

async function main() {
  await RAPIER.init();

  const joystick = new VirtualJoystick();

  const gravity = new RAPIER.Vector3(0, -24.81, 0);
  const world = new RAPIER.World(gravity);

  const staticWorldGroup = new THREE.Group();
  const tiltingBoardGroup = new THREE.Group();
  scene.add(staticWorldGroup);
  scene.add(tiltingBoardGroup);

  const levelManager = new LevelManager(world);
  levelManager.createLevel(1, tiltingBoardGroup);
  levelManager.createLevel(2, tiltingBoardGroup);
  levelManager.createLevel(3, tiltingBoardGroup);

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

  const boardTextureOptions = {
    textureUrl: "/textures/ground-2.png",
    maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    repeat: { x: 2.5, y: 2 },
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.1,
  };

  const board = await PhysicsBoard.create(
    RAPIER,
    world,
    levelManager.getLevel(1)!.group,
    boardLevel1ModelUrl,
    {
      scale: BOARD_SCALE,
      ...boardTextureOptions,
    }
  );

  // Shared anchor for walls, gate, and gate-hole — always visible across levels.
  const sharedBoard = PhysicsBoard.createSharedAnchor(
    RAPIER,
    world,
    tiltingBoardGroup,
    board
  );

  const boardLevel2 = await PhysicsBoard.create(
    RAPIER,
    world,
    levelManager.getLevel(2)!.group,
    boardLevel2ModelUrl,
    {
      scale: BOARD_SCALE,
      ...boardTextureOptions,
    }
  );
  boardLevel2.setOpacity(0);

  const boardLevel3 = await PhysicsBoard.create(
    RAPIER,
    world,
    levelManager.getLevel(3)!.group,
    boardLevel3ModelUrl,
    {
      scale: BOARD_SCALE,
      ...boardTextureOptions,
    }
  );
  boardLevel3.setOpacity(0);

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
  

  await PhysicsWalls.create(RAPIER, world, sharedBoard, wallsModelUrl, {
    scale: BOARD_SCALE,
    textureUrl: "/textures/fabric-2.png",
  });

  await PhysicsGate.create(RAPIER, world, sharedBoard, gateModelUrl, {
    scale: BOARD_SCALE,
  });

  const gateHole = await PhysicsGateHole.create(sharedBoard, vfxGateHoleModelUrl);

  const holesLevel2 = await PhysicsHoles.create(boardLevel2, vfxHolesLevel2ModelUrl);
  const holesLevel3 = await PhysicsHoles.create(boardLevel3, vfxHolesLevel3ModelUrl);

  const puzzleLevel1 = await PhysicsPuzzle.create(
    RAPIER,
    world,
    board,
    puzzleLevel1ModelUrl,
    {
      scale: BOARD_SCALE,
      placements: PUZZLE_PLACEMENTS,
      textureUrl: "/textures/fabric-2.png",
      excludeColliderObjectNames: [FAN_OBJECT_NAME],
    }
  );

  const puzzleLevel2 = await PhysicsPuzzle.create(
    RAPIER,
    world,
    boardLevel2,
    puzzleLevel2ModelUrl,
    {
      scale: BOARD_SCALE,
      placements: PUZZLE_PLACEMENTS,
      textureUrl: "/textures/fabric-2.png",
      excludeColliderObjectNames: [FAN_OBJECT_NAME],
    }
  );

  const puzzleLevel3 = await PhysicsPuzzle.create(
    RAPIER,
    world,
    boardLevel3,
    puzzleLevel3ModelUrl,
    {
      scale: BOARD_SCALE,
      placements: PUZZLE_PLACEMENTS,
      textureUrl: "/textures/fabric-2.png",
      excludeColliderObjectNames: [FAN_OBJECT_NAME],
    }
  );

  preparePuzzleDropAnimation(puzzleLevel1.visuals, PUZZLE_INTRO_START_Y);

  let puzzleIntroTime = 0;
  let puzzleIntroActive = DEBUG_START_LEVEL === 1;

  const puzzleFansLevel1 = puzzleLevel1.visuals
    .map((visual) =>
      PuzzleFanRotation.attach(visual, {
        RAPIER,
        world,
        boardBody: board.body,
        boardVisual: board.visual,
      })
    )
    .filter((fan): fan is PuzzleFanRotation => fan !== null);

  const puzzleFansLevel2 = puzzleLevel2.visuals
    .map((visual) =>
      PuzzleFanRotation.attach(visual, {
        RAPIER,
        world,
        boardBody: boardLevel2.body,
        boardVisual: boardLevel2.visual,
      })
    )
    .filter((fan): fan is PuzzleFanRotation => fan !== null);

  const puzzleFansLevel3 = puzzleLevel3.visuals
    .map((visual) =>
      PuzzleFanRotation.attach(visual, {
        RAPIER,
        world,
        boardBody: boardLevel3.body,
        boardVisual: boardLevel3.visual,
      })
    )
    .filter((fan): fan is PuzzleFanRotation => fan !== null);

  const levelContents = new Map<number, LevelContent>([
    [
      1,
      {
        board,
        puzzle: puzzleLevel1,
        holes: null,
        fans: puzzleFansLevel1,
      },
    ],
    [
      2,
      {
        board: boardLevel2,
        puzzle: puzzleLevel2,
        holes: holesLevel2,
        fans: puzzleFansLevel2,
      },
    ],
    [
      3,
      {
        board: boardLevel3,
        puzzle: puzzleLevel3,
        holes: holesLevel3,
        fans: puzzleFansLevel3,
      },
    ],
  ]);

  const getLevelContent = (id: number): LevelContent => {
    const content = levelContents.get(id);
    if (!content) {
      throw new Error(`Missing level content for level ${id}`);
    }
    return content;
  };

  registerLevelContent(levelManager, 1, getLevelContent(1), null);
  registerLevelContent(levelManager, 2, getLevelContent(2), holesLevel2);
  registerLevelContent(levelManager, 3, getLevelContent(3), holesLevel3);

  levelManager.setLevelHooks(1, {
    onActivate: () => gateHole.setDetectionEnabled(true),
    onDeactivate: () => gateHole.setDetectionEnabled(false),
  });
  levelManager.setLevelHooks(2, {
    onActivate: () => {
      holesLevel2.setActive(true);
      gateHole.setDetectionEnabled(true);
    },
    onDeactivate: () => {
      holesLevel2.setActive(false);
    },
  });
  levelManager.setLevelHooks(3, {
    onActivate: () => holesLevel3.setActive(true),
    onDeactivate: () => holesLevel3.setActive(false),
  });

  levelManager.setCurrentLevel(DEBUG_START_LEVEL);
  if (DEBUG_START_LEVEL !== 1) {
    puzzleIntroActive = false;
  }
  if (DEBUG_START_LEVEL === 2) {
    getLevelContent(2).board.setOpacity(1);
  }
  if (DEBUG_START_LEVEL === 3) {
    getLevelContent(3).board.setOpacity(1);
  }

  let transitionPhase: LevelTransitionPhase = "none";
  let transitionTime = 0;
  let transitionFromLevel = 1;
  let transitionToLevel = 2;
  let pendingNextLevel: number | null = null;

  const wallOverride = BOARD_WALL_MATERIAL_OVERRIDES["wall-around"];
  createSubsurfaceScatteringDebugUI({
    root: sharedBoard.visual,
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

  let ballFrozen = false;
  let lossTimer = 0;
  let lossPending = false;

  const lossOverlay = createLossOverlay();
  for (const [levelId, content] of levelContents) {
    content.holes?.onLoss(() => {
      if (lossPending || ballFrozen || levelManager.getCurrentLevel() !== levelId) return;
      lossPending = true;
      lossTimer = 0;
      ball.autoResetEnabled = false;
    });
  }
  lossOverlay.onRetry(() => {
    lossOverlay.hide();
    getLevelContent(levelManager.getCurrentLevel()).holes?.reset();
    lossPending = false;
    lossTimer = 0;
    ball.autoResetEnabled = true;
    ball.reset();
    ball.visual.visible = true;
    ballFrozen = false;
  });
  
  const winOverlay = createWinOverlay();

  function finishLevelTransition() {
    levelManager.setCurrentLevel(transitionToLevel);
    ball.autoResetEnabled = true;
    ball.reset();
    ball.visual.visible = true;
    ballFrozen = false;
    transitionPhase = "none";
    gateHole.reset();
  }

  function startLevelTransition(fromLevel: number, toLevel: number) {
    transitionFromLevel = fromLevel;
    transitionToLevel = toLevel;
    transitionPhase = "level_out";
    transitionTime = 0;
    const from = getLevelContent(fromLevel);
    ensurePuzzleFinalY(from.puzzle.visuals);
    from.puzzle.setCollidersEnabled(false);
    from.fans.forEach((fan) => fan.setEnabled(false));
  }

  gateHole.onWin(() => {
    if (ballFrozen || transitionPhase !== "none") return;
    const current = levelManager.getCurrentLevel();
    if (current >= TOTAL_LEVELS) return;
    lossPending = false;
    lossTimer = 0;
    ballFrozen = true;
    ball.visual.visible = false;
    winOverlay.show();
  });

  winOverlay.onNextLevel(() => {
    winOverlay.hide();
    const current = levelManager.getCurrentLevel();
    if (current >= TOTAL_LEVELS) return;
    pendingNextLevel = current + 1;
    transitionPhase = "waiting";
    transitionTime = 0;
  });

  // enable shadows on static world group and tilting board group
  enableShadowsOnObject(staticWorldGroup);
  // enableShadowsOnObject(tiltingBoardGroup);
  // enableShadowsOnObject(ball.visual);

  const physicsDebug = SHOW_COLLIDERS
    ? new PhysicsDebugRenderer(world, scene, {
        shouldShowCollider: (collider) =>
          levelManager.isColliderVisibleInDebug(collider),
      })
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
    for (const content of levelContents.values()) {
      content.board.setRotation(boardQuaternion);
    }
    sharedBoard.setRotation(boardQuaternion);

    const fanLevel =
      transitionPhase === "level_in"
        ? transitionToLevel
        : levelManager.getCurrentLevel();
    getLevelContent(fanLevel).fans.forEach((fan) => fan.update(delta));

    if (puzzleIntroActive) {
      puzzleIntroTime += delta;
      const t = Math.min(puzzleIntroTime / PUZZLE_INTRO_DURATION, 1);
      animatePuzzleRise(puzzleLevel1.visuals, t);
      if (t >= 1) {
        animatePuzzleOffset(puzzleLevel1.visuals, 0);
        puzzleIntroActive = false;
      }
    }

    if (transitionPhase === "waiting") {
      transitionTime += delta;
      if (transitionTime >= LEVEL_TRANSITION_DELAY && pendingNextLevel !== null) {
        startLevelTransition(levelManager.getCurrentLevel(), pendingNextLevel);
        pendingNextLevel = null;
      }
    } else if (transitionPhase === "level_out") {
      const from = getLevelContent(transitionFromLevel);
      transitionTime += delta;
      const t = Math.min(transitionTime / PUZZLE_INTRO_DURATION, 1);
      animatePuzzleSink(from.puzzle.visuals, t);
      from.board.setOpacity(1 - easeInCubic(t));
      if (t >= 1) {
        hidePuzzlesAfterSink(from.puzzle, from.puzzle.visuals);
        from.board.setOpacity(0);
        levelManager.setLevelState(transitionFromLevel, { visuals: false, physics: false });
        transitionPhase = "level_in";
        transitionTime = 0;
        const to = getLevelContent(transitionToLevel);
        preparePuzzleDropAnimation(to.puzzle.visuals, PUZZLE_INTRO_START_Y);
        to.puzzle.setVisible(true);
        to.board.setOpacity(0);
        levelManager.setLevelState(transitionToLevel, { visuals: true, physics: false });
      }
    } else if (transitionPhase === "level_in") {
      const to = getLevelContent(transitionToLevel);
      transitionTime += delta;
      const puzzleT = Math.min(transitionTime / PUZZLE_INTRO_DURATION, 1);
      const boardT = Math.min(transitionTime / BOARD_FADE_DURATION, 1);

      animatePuzzleRise(to.puzzle.visuals, puzzleT);
      to.board.setOpacity(easeOutCubic(boardT));

      if (puzzleT >= 1 && boardT >= 1) {
        animatePuzzleOffset(to.puzzle.visuals, 0);
        to.board.setOpacity(1);
        finishLevelTransition();
      }
    }

    world.timestep = delta;
    world.step();

    physicsDebug?.update();
    lightDebug?.update();
    gateHole.update(delta, ball);
    const activeHoles = getLevelContent(levelManager.getCurrentLevel()).holes;
    if (!ballFrozen && activeHoles?.isActive && !gateHole.isNear) {
      activeHoles.update(delta, ball);
    }

    if (lossPending && !ballFrozen) {
      lossTimer += delta;
      if (lossTimer >= 1) {
        lossPending = false;
        ballFrozen = true;
        ball.visual.visible = false;
        lossOverlay.show();
      }
    }

    if (!ballFrozen) {
      ball.syncFromPhysics();
    }

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
