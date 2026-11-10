import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";
import { models } from "../assets/models";
import { textures } from "../assets/textures";
import { createPhysicsWorld } from "../physics/physics-world";
import { addBoardContainment } from "../physics/board-containment";
import { BoardFrame } from "../physics/board-frame";
import { GroundContactTracker } from "../physics/ground-contact-tracker";
import type { PlanarPoint } from "../physics/ball-drop-monitor";
import { LevelManager } from "../levels/LevelManager";
import { registerLevelContent } from "../levels/level-config";
import type { LevelContent } from "../levels/level-types";
import { LEVEL_HOLE_POSITIONS } from "../levels/hole-positions";
import { getBallStartPosition } from "../levels/ball-spawn";
import { LevelCalendarDisplay } from "../levels/LevelCalendarDisplay";
import { PhysicsBall } from "../entities/ball";
import {
  FAN_OBJECT_NAME,
  Level3GiftBox,
  PhysicsBoard,
  PhysicsGate,
  PhysicsPuzzle,
  PhysicsStairs,
  PhysicsStaticEnvironment,
  PhysicsWalls,
  PuzzleFanRotation,
  type SharedBoardAnchor,
  type StaticEnvironmentOptions,
} from "../entities/board";
import { GateHole, LossHoles } from "../entities/holes";
import { clearGltfCache, loadGltf } from "../utils/gltf-loader";
import { clearTextureCache, loadTexture } from "../utils/texture-utils";
import {
  CUP_PLATE_MATERIAL_OVERRIDES,
  LAMP_MATERIAL_OVERRIDES,
  LEVEL_CALENDAR_MATERIAL_COLORS,
  SAND_WATCH_MATERIAL_OVERRIDES,
} from "../utils/material-utils";
import {
  addPuzzleAreaPointLight,
  aimLampAt,
  enableShadowsOnObject,
  setupBlenderStyleLighting,
  setupBulbLight,
  type BulbLights,
  type SceneLights,
} from "../utils/scene-lighting";
import { isMobileDevice } from "../utils/device";
import {
  BOARD_SCALE,
  GROUND_SCALE,
  PUZZLE_PLACEMENTS,
  TOTAL_LEVELS,
} from "../utils/constants";

type LevelAssets = {
  readonly board: string;
  readonly puzzle: string;
  /** Glow model for the loss holes; a level without one has no holes. */
  readonly holesVfx?: string;
  /** Board-local position of the collectible gift, if the level has one. */
  readonly giftPosition?: THREE.Vector3Like;
};

const LEVEL_ASSETS: Readonly<Record<number, LevelAssets>> = {
  1: { board: models.boardLevel1, puzzle: models.puzzleLevel1 },
  2: {
    board: models.boardLevel2,
    puzzle: models.puzzleLevel2,
    holesVfx: models.vfxHolesLevel2,
  },
  3: {
    board: models.boardLevel3,
    puzzle: models.puzzleLevel3,
    holesVfx: models.vfxHolesLevel3,
    giftPosition: { x: 2, y: 0.335, z: 0.3 },
  },
};

/** Everything the game builds once at startup: scene content, physics and level data. */
export type GameWorld = {
  readonly physicsWorld: RAPIER.World;
  /** Collision events (for the hit sound) of the last physics step. */
  readonly eventQueue: RAPIER.EventQueue;
  readonly levelManager: LevelManager;
  readonly levels: ReadonlyMap<number, LevelContent>;
  /** Content of one level; throws for an unknown id. */
  getLevel(id: number): LevelContent;
  /** Board-aligned anchor of the walls, gate and containment, shared by every level. */
  readonly sharedBoard: SharedBoardAnchor;
  /** Measures positions relative to the tilting board surface. */
  readonly boardFrame: BoardFrame;
  /** Half the play area's width (x) and depth (z), in board-local units. */
  readonly boardHalfExtents: PlanarPoint;
  readonly gateHole: GateHole;
  readonly ball: PhysicsBall;
  /** Whether the ball touches the table or stairs under the board. */
  readonly groundContacts: GroundContactTracker;
  /** Level number shown on the desk calendar; null if the model lacks it. */
  readonly calendar: LevelCalendarDisplay | null;
  readonly lights: { readonly scene: SceneLights; readonly bulb: BulbLights };
};

export type LoadingStage = "download" | "build";

export type BuildGameWorldOptions = {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  readonly startLevel: number;
  /** Loading progress in [0, 1] and what is happening. */
  readonly onProgress?: (fraction: number, stage: LoadingStage) => void;
};

/** Share of the progress bar given to downloads; the rest is building the scene. */
const DOWNLOAD_SHARE = 0.9;

export async function buildGameWorld(options: BuildGameWorldOptions): Promise<GameWorld> {
  const { scene, renderer, startLevel } = options;
  const onProgress = options.onProgress ?? (() => {});

  // Physics init and every download run in parallel; everything below then reads from cache.
  const [{ RAPIER, world }] = await Promise.all([
    createPhysicsWorld(),
    preloadAssets((fraction) => onProgress(fraction * DOWNLOAD_SHARE, "download")),
  ]);
  onProgress(DOWNLOAD_SHARE, "build");

  const eventQueue = new RAPIER.EventQueue(true);
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  const lights = {
    scene: setupBlenderStyleLighting(scene),
    bulb: setupBulbLight(scene),
  };
  const boardFocus = new THREE.Vector3(0, 0.5, 0);
  aimLampAt(lights.scene, new THREE.Vector3(0, 0, 0), boardFocus);

  const staticWorldGroup = new THREE.Group();
  const tiltingBoardGroup = new THREE.Group();
  scene.add(staticWorldGroup, tiltingBoardGroup);

  const levelManager = new LevelManager(world);
  const levelGroups = new Map<number, THREE.Group>();
  for (let id = 1; id <= TOTAL_LEVELS; id++) {
    levelGroups.set(id, levelManager.createLevel(id, tiltingBoardGroup).group);
  }

  const ground = await PhysicsStaticEnvironment.create(
    RAPIER,
    world,
    staticWorldGroup,
    models.ground,
    {
      scale: GROUND_SCALE * 2,
      position: { x: -24, y: -0.35, z: -6 },
      textureUrl: textures.fabric,
      maxAnisotropy,
      repeat: { x: 8, y: 6 },
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0,
    }
  );

  const boards = new Map<number, PhysicsBoard>();
  for (const [id, group] of levelGroups) {
    const board = await PhysicsBoard.create(RAPIER, world, group, levelAssets(id).board, {
      scale: BOARD_SCALE,
      textureUrl: textures.ground2,
      maxAnisotropy,
      repeat: { x: 2.5, y: 2 },
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1,
    });
    // Levels after the start level fade in when they are reached.
    if (id > startLevel) board.setOpacity(0);
    boards.set(id, board);
  }
  const firstBoard = getOrThrow(boards, 1, "board");

  const sharedBoard = PhysicsBoard.createSharedAnchor(
    RAPIER,
    world,
    tiltingBoardGroup,
    firstBoard
  );

  const stairs = await PhysicsStairs.create(
    RAPIER,
    world,
    staticWorldGroup,
    firstBoard,
    models.stairs,
    { scale: BOARD_SCALE, position: { y: -0.2 } }
  );

  // --- Desk props (decorative, no colliders) ------------------------------------------------

  const addProp = (modelUrl: string, propOptions: StaticEnvironmentOptions) =>
    PhysicsStaticEnvironment.create(
      RAPIER,
      world,
      staticWorldGroup,
      modelUrl,
      { scale: BOARD_SCALE, alignWithBoard: true, enableColliders: false, ...propOptions },
      firstBoard
    );

  const mobile = isMobileDevice();
  const propTexture = {
    maxAnisotropy,
    repeat: { x: 1, y: 1 },
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.1,
  };
  const clampTexture = {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  };

  await addProp(models.book, {
    position: mobile ? { x: -3, z: -2, y: -0.6 } : { x: 1, z: 0.3, y: -0.6 },
    textureUrl: textures.bookCover,
    textureRotation: THREE.MathUtils.degToRad(90),
    ...propTexture,
  });

  await addProp(models.ticket, {
    position: mobile ? { x: 2, z: -1, y: -0.6 } : { x: -0.5, z: 0.5, y: -0.6 },
    textureUrl: textures.tickets,
    ...propTexture,
    ...clampTexture,
  });

  const lamp = await addProp(models.lamp, {
    position: { x: 0, z: 0, y: -0.7 },
    materialOverrides: LAMP_MATERIAL_OVERRIDES,
  });
  aimLampAt(lights.scene, lamp.visual.getWorldPosition(new THREE.Vector3()), boardFocus);

  await addProp(models.dices, {
    position: { x: 0, z: 1, y: -0.58 },
    materialTextures: {
      "black-dice": textures.blackDice,
      "yellow-dice": textures.yellowDice,
      "yellow-dice.001": textures.yellowDice,
    },
    ...propTexture,
    ...clampTexture,
  });

  const calendarProp = await addProp(models.levelCalendar, {
    position: { x: 0, z: 1, y: -0.6 },
    materialTextures: {
      "level-1": textures.level1,
      "level-2": textures.level2,
      "level-3": textures.level3,
    },
    textureUrlOverrides: {
      [textures.level2]: { flipY: false },
    },
    materialColors: LEVEL_CALENDAR_MATERIAL_COLORS,
    flipY: true,
    flipX: true,
    ...propTexture,
    ...clampTexture,
  });
  const calendar = LevelCalendarDisplay.attach(calendarProp.visual);
  calendar?.setLevel(startLevel);

  await addProp(models.box, {
    position: { x: 0, z: 1, y: -0.6 },
    textureUrl: textures.boxCover,
    ...propTexture,
    ...clampTexture,
  });

  await addProp(models.cupPlate, {
    position: { x: 8, z: -2, y: -0.6 },
    rotation: { y: THREE.MathUtils.degToRad(-35) },
    materialOverrides: CUP_PLATE_MATERIAL_OVERRIDES,
  });

  await addProp(models.sandWatch, {
    position: { x: -0.5, z: 1.3, y: -0.6 },
    materialOverrides: SAND_WATCH_MATERIAL_OVERRIDES,
  });

  // --- Shared board parts ---------------------------------------------------------------------

  await PhysicsWalls.create(RAPIER, world, sharedBoard, models.walls, {
    scale: BOARD_SCALE,
    textureUrl: textures.fabric2,
  });
  await PhysicsGate.create(RAPIER, world, sharedBoard, models.gate, { scale: BOARD_SCALE });

  // The visible walls are hollow shells; this solid rim is what really keeps the ball in.
  const boardFrame = new BoardFrame(sharedBoard.body);
  const boardHalfExtents = {
    x: firstBoard.bounds.size.x / 2,
    z: firstBoard.bounds.size.z / 2,
  };
  addBoardContainment(RAPIER, world, sharedBoard.body, boardHalfExtents, boardFrame.surfaceY);

  const gateHole = await GateHole.create(sharedBoard, models.vfxGateHole);

  // --- Levels ---------------------------------------------------------------------------------

  const levels = new Map<number, LevelContent>();
  for (const [id, board] of boards) {
    const assets = levelAssets(id);

    const puzzle = await PhysicsPuzzle.create(RAPIER, world, board, assets.puzzle, {
      scale: BOARD_SCALE,
      placements: PUZZLE_PLACEMENTS,
      textureUrl: textures.fabric2,
      excludeColliderObjectNames: [FAN_OBJECT_NAME],
    });

    const fans = puzzle.visuals
      .map((visual) =>
        PuzzleFanRotation.attach(visual, {
          RAPIER,
          world,
          boardBody: board.body,
          boardVisual: board.visual,
        })
      )
      .filter((fan): fan is PuzzleFanRotation => fan !== null);

    const holes = assets.holesVfx
      ? await LossHoles.create(
          board,
          assets.holesVfx,
          LEVEL_HOLE_POSITIONS[id] ?? [],
          `level-${id}`
        )
      : null;

    const giftBox = assets.giftPosition
      ? await Level3GiftBox.create(board, models.giftBox, {
          position: new THREE.Vector3().copy(assets.giftPosition),
        })
      : null;

    const content: LevelContent = { board, puzzle, fans, holes, giftBox };
    registerLevelContent(levelManager, id, content);
    levels.set(id, content);
  }
  levelManager.setCurrentLevel(startLevel);

  addPuzzleAreaPointLight(firstBoard.visual, PUZZLE_PLACEMENTS);
  enableShadowsOnObject(staticWorldGroup);

  const ball = await PhysicsBall.create(RAPIER, world, scene, models.ball, {
    spawn: getBallStartPosition(startLevel),
  });

  // Whatever the ball can land on after falling through the floor.
  const groundContacts = new GroundContactTracker([
    ...ground.getColliders(),
    ...stairs.environment.getColliders(),
  ]);

  // Every model is cloned into the scene by now; let the cached originals be collected.
  clearGltfCache();
  clearTextureCache();
  onProgress(1, "build");

  return {
    physicsWorld: world,
    eventQueue,
    levelManager,
    levels,
    getLevel: (id) => getOrThrow(levels, id, "level"),
    sharedBoard,
    boardFrame,
    boardHalfExtents,
    gateHole,
    ball,
    groundContacts,
    calendar,
    lights,
  };
}

/** Starts every model and texture download at once; reports the share finished. */
async function preloadAssets(onProgress: (fraction: number) => void): Promise<void> {
  const loads: Promise<unknown>[] = [
    ...Object.values(models).map((url) => loadGltf(url)),
    ...Object.values(textures).map((url) => loadTexture(url)),
  ];

  let finished = 0;
  onProgress(0);
  await Promise.all(
    loads.map((load) => load.then(() => onProgress(++finished / loads.length)))
  );
}

function levelAssets(id: number): LevelAssets {
  const assets = LEVEL_ASSETS[id];
  if (!assets) throw new Error(`No assets configured for level ${id}`);
  return assets;
}

function getOrThrow<K, V>(map: ReadonlyMap<K, V>, key: K, what: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Unknown ${what}: ${String(key)}`);
  return value;
}
