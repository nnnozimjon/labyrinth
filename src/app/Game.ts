import * as THREE from "three";
import { models } from "../assets/models";
import { textures } from "../assets/textures";
import { createScene } from "../core/scene";
import { createCamera } from "../core/camera";
import { createRenderer } from "../core/renderer";
import { createControls } from "../core/controls";
import { setupResize } from "../core/resize";
import { createPhysicsWorld } from "../physics/physics-world";
import { PhysicsDebugRenderer } from "../physics/physics-debug";
import { LightDebugRenderer } from "../physics/light-debug";
import { LevelManager } from "../levels/LevelManager";
import { registerLevelContent } from "../levels/level-config";
import type { LevelContent, LevelTransitionPhase } from "../levels/level-types";
import {
  preparePuzzleDropAnimation,
  ensurePuzzleFinalY,
} from "../levels/puzzle-animation";
import { PhysicsBall } from "../entities/ball";
import {
  PhysicsBoard,
  PhysicsGate,
  PhysicsPuzzle,
  FAN_OBJECT_NAME,
  PuzzleFanRotation,
  PhysicsStaticEnvironment,
  PhysicsStairs,
  PhysicsWalls,
  Level3GiftBox,
} from "../entities/board";
import { PhysicsHolesLevel2, PhysicsHolesLevel3, PhysicsGateHole } from "../entities/holes";
import { createHolesLevel3DebugUI } from "../entities/holes/holes-level3-debug";
import {
  SAND_WATCH_MATERIAL_OVERRIDES,
  CUP_PLATE_MATERIAL_OVERRIDES,
  BOARD_WALL_MATERIAL_OVERRIDES,
  LAMP_MATERIAL_OVERRIDES,
  LEVEL_CALENDAR_MATERIAL_COLORS,
  FORMULA55_YELLOW,
} from "../utils/material-utils";
import { createSubsurfaceScatteringDebugUI } from "../utils/subsurface-scattering-debug";
import {
  setupBlenderStyleLighting,
  setupBulbLight,
  aimLampAt,
  addPuzzleAreaPointLight,
  enableShadowsOnObject,
} from "../utils/scene-lighting";
import { VirtualJoystick } from "../input/joystick";
import { createCameraDebugMonitor } from "../utils/camera-debug";
import { createBulbLightDebugUI } from "../utils/bulb-light-debug";
import { logSceneHierarchy } from "../physics/collider-utils";
import {
  BALL_COLLIDER_RADIUS,
  BOARD_SCALE,
  DEBUG_BULB_LIGHT,
  DEBUG_CAMERA_TRANSFORM,
  DEBUG_HOLES_LEVEL3_UI,
  DEBUG_SSS_UI,
  DEBUG_START_LEVEL,
  GROUND_SCALE,
  PUZZLE_INTRO_START_Y,
  PUZZLE_PLACEMENTS,
  SHOW_COLLIDERS,
  SHOW_LIGHT_HELPERS,
  TOTAL_LEVELS,
} from "../utils/constants";
import { createLossOverlay, createWinOverlay, createGiftOverlay } from "./overlays";
import { CameraTransition } from "../core/camera-transition";
import type { CameraState } from "../core/camera-transition";
import { startGameLoop } from "./game-loop";

export class Game {
  private readonly scene = createScene();
  private readonly camera = createCamera();
  private readonly renderer = createRenderer();
  private readonly controls = createControls(this.camera, this.renderer.domElement);

  start() {
    this.init().catch((error) => {
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
  }

  private async init() {
    const { RAPIER, world } = await createPhysicsWorld();
    const joystick = new VirtualJoystick();

    const sceneLights = setupBlenderStyleLighting(this.scene);
    const bulbLights = setupBulbLight(this.scene);
    const boardFocus = new THREE.Vector3(0, 0.5, 0);
    aimLampAt(sceneLights, new THREE.Vector3(0, 0, 0), boardFocus);

    const staticWorldGroup = new THREE.Group();
    const tiltingBoardGroup = new THREE.Group();
    this.scene.add(staticWorldGroup);
    this.scene.add(tiltingBoardGroup);

    const levelManager = new LevelManager(world);
    levelManager.createLevel(1, tiltingBoardGroup);
    levelManager.createLevel(2, tiltingBoardGroup);
    levelManager.createLevel(3, tiltingBoardGroup);

    await PhysicsStaticEnvironment.create(
      RAPIER,
      world,
      staticWorldGroup,
      models.ground,
      {
        scale: GROUND_SCALE * 2,
        position: { x: -24, y: -0.35, z: -6 },
        textureUrl: textures.fabric,
        maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
        repeat: { x: 8, y: 6 },
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0,
      }
    );

    const boardTextureOptions = {
      textureUrl: textures.ground2,
      maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
      repeat: { x: 2.5, y: 2 },
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1,
    };

    const board = await PhysicsBoard.create(
      RAPIER,
      world,
      levelManager.getLevel(1)!.group,
      models.boardLevel1,
      {
        scale: BOARD_SCALE,
        ...boardTextureOptions,
      }
    );

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
      models.boardLevel2,
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
      models.boardLevel3,
      {
        scale: BOARD_SCALE,
        ...boardTextureOptions,
      }
    );
    boardLevel3.setOpacity(0);

    await PhysicsStairs.create(RAPIER, world, staticWorldGroup, board, models.stairs, {
      scale: BOARD_SCALE,
      position: { y: -0.2 },
    });

    await PhysicsStaticEnvironment.create(
      RAPIER,
      world,
      staticWorldGroup,
      models.book,
      {
        scale: BOARD_SCALE,
        alignWithBoard: true,
        position: { x: 1, z: 0.3, y: -0.6 },
        enableColliders: false,
        textureUrl: textures.bookCover,
        maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
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
      models.ticket,
      {
        scale: BOARD_SCALE,
        alignWithBoard: true,
        position: { x: -0.5, z: 0.5, y: -0.6 },
        enableColliders: false,
        textureUrl: textures.tickets,
        maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
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
      models.lamp,
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
      models.dices,
      {
        scale: BOARD_SCALE,
        alignWithBoard: true,
        position: { x: 0, z: 1, y: -0.58 },
        enableColliders: false,
        materialTextures: {
          "black-dice": textures.blackDice,
          "yellow-dice": textures.yellowDice,
          "yellow-dice.001": textures.yellowDice,
        },
        maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
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
      models.levelCalendar,
      {
        scale: BOARD_SCALE,
        alignWithBoard: true,
        position: { x: 0, z: 1, y: -0.6 },
        enableColliders: false,
        materialTextures: {
          "level-1": textures.level1,
          "level-2": textures.level2,
          "level-3": textures.level3,
        },
        materialColors: LEVEL_CALENDAR_MATERIAL_COLORS,
        maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
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
      models.box,
      {
        scale: BOARD_SCALE,
        alignWithBoard: true,
        position: { x: 0, z: 1, y: -0.6 },
        enableColliders: false,
        textureUrl: textures.boxCover,
        maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
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
      models.cupPlate,
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

    this.camera.position.set(0.37, 8.582, -7.819);
    this.camera.rotation.set(-2.274, 0.021, 3.117);
    this.controls.target.set(0.15, 0.44, -0.913);
    this.controls.update();

    await PhysicsStaticEnvironment.create(
      RAPIER,
      world,
      staticWorldGroup,
      models.sandWatch,
      {
        scale: BOARD_SCALE,
        alignWithBoard: true,
        position: { x: -0.5, z: 1.3, y: -0.6 },
        enableColliders: false,
        materialOverrides: SAND_WATCH_MATERIAL_OVERRIDES,
      },
      board
    );

    await PhysicsWalls.create(RAPIER, world, sharedBoard, models.walls, {
      scale: BOARD_SCALE,
      textureUrl: textures.fabric2,
    });

    await PhysicsGate.create(RAPIER, world, sharedBoard, models.gate, {
      scale: BOARD_SCALE,
    });

    const gateHole = await PhysicsGateHole.create(sharedBoard, models.vfxGateHole);

    const holesLevel2 = await PhysicsHolesLevel2.create(boardLevel2, models.vfxHolesLevel2);
    const holesLevel3 = await PhysicsHolesLevel3.create(boardLevel3, models.vfxHolesLevel3);

    const giftBoxLevel3 = await Level3GiftBox.create(boardLevel3, models.giftBox, {
      position: new THREE.Vector3(0.1, 0.335, 0),
    });
    levelManager.registerLevelObject(3, giftBoxLevel3.visual);
    for (const helper of giftBoxLevel3.getDebugHelpers()) {
      levelManager.registerDebugHelper(3, helper);
    }

    createHolesLevel3DebugUI({
      holes: holesLevel3,
      enabled: DEBUG_HOLES_LEVEL3_UI,
    });

    const puzzleLevel1 = await PhysicsPuzzle.create(
      RAPIER,
      world,
      board,
      models.puzzleLevel1,
      {
        scale: BOARD_SCALE,
        placements: PUZZLE_PLACEMENTS,
        textureUrl: textures.fabric2,
        excludeColliderObjectNames: [FAN_OBJECT_NAME],
      }
    );

    const puzzleLevel2 = await PhysicsPuzzle.create(
      RAPIER,
      world,
      boardLevel2,
      models.puzzleLevel2,
      {
        scale: BOARD_SCALE,
        placements: PUZZLE_PLACEMENTS,
        textureUrl: textures.fabric2,
        excludeColliderObjectNames: [FAN_OBJECT_NAME],
      }
    );

    const puzzleLevel3 = await PhysicsPuzzle.create(
      RAPIER,
      world,
      boardLevel3,
      models.puzzleLevel3,
      {
        scale: BOARD_SCALE,
        placements: PUZZLE_PLACEMENTS,
        textureUrl: textures.fabric2,
        excludeColliderObjectNames: [FAN_OBJECT_NAME],
      }
    );

    preparePuzzleDropAnimation(puzzleLevel1.visuals, PUZZLE_INTRO_START_Y);

    const puzzleIntroActive = { value: DEBUG_START_LEVEL === 1 };
    const puzzleIntroTime = { value: 0 };

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
      [1, { board, puzzle: puzzleLevel1, holes: null, fans: puzzleFansLevel1 }],
      [2, { board: boardLevel2, puzzle: puzzleLevel2, holes: holesLevel2, fans: puzzleFansLevel2 }],
      [3, {
        board: boardLevel3,
        puzzle: puzzleLevel3,
        holes: holesLevel3,
        fans: puzzleFansLevel3,
        giftBox: giftBoxLevel3,
      }],
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
      onActivate: () => {
        holesLevel3.setActive(true);
        giftBoxLevel3.setActive(true);
      },
      onDeactivate: () => {
        holesLevel3.setActive(false);
        giftBoxLevel3.setActive(false);
      },
    });

    levelManager.setCurrentLevel(DEBUG_START_LEVEL);
    if (DEBUG_START_LEVEL !== 1) {
      puzzleIntroActive.value = false;
    }
    if (DEBUG_START_LEVEL === 2) {
      getLevelContent(2).board.setOpacity(1);
    }
    if (DEBUG_START_LEVEL === 3) {
      getLevelContent(3).board.setOpacity(1);
    }

    const transitionPhase = { value: "none" as LevelTransitionPhase };
    const transitionTime = { value: 0 };
    const transitionFromLevel = { value: 1 };
    const transitionToLevel = { value: 2 };
    const pendingNextLevel = { value: null as number | null };

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

    const ball = await PhysicsBall.create(RAPIER, world, this.scene, models.ball, {
      colliderRadius: BALL_COLLIDER_RADIUS,
      startPosition: new THREE.Vector3(0, 0.3, 2.8),
    });

    const ballFrozen = { value: false };
    const lossTimer = { value: 0 };
    const lossPending = { value: false };
    const giftPauseActive = { value: false };

    const defaultCameraState: CameraState = {
      position: this.camera.position.clone(),
      rotation: this.camera.rotation.clone(),
      target: this.controls.target.clone(),
    };

    const giftCameraState: CameraState = {
      position: new THREE.Vector3(0.226, 1.65, -2.43),
      rotation: new THREE.Euler(-2.45, -0.027, -3.119),
      target: new THREE.Vector3(0.278, 0.415, -0.939),
    };

    const giftCameraTransition = new CameraTransition(1.5);
    const giftOverlay = createGiftOverlay();

    giftBoxLevel3.onCollect(() => {
      if (
        giftPauseActive.value ||
        ballFrozen.value ||
        levelManager.getCurrentLevel() !== 3 ||
        transitionPhase.value !== "none"
      ) {
        return;
      }

      giftPauseActive.value = true;
      ball.autoResetEnabled = false;
      ball.freeze();
      this.controls.enabled = false;

      giftCameraTransition.start(
        this.camera,
        this.controls,
        giftCameraState,
        () => {
          giftOverlay.show();
        }
      );
    });

    giftOverlay.onOkay(() => {
      giftOverlay.hide();
      giftBoxLevel3.fadeOut(1.5, () => {
        getLevelContent(3).giftBox = null;
      });

      giftCameraTransition.start(
        this.camera,
        this.controls,
        defaultCameraState,
        () => {
          giftPauseActive.value = false;
          ball.autoResetEnabled = true;
          ball.unfreeze();
          this.controls.enabled = true;
        }
      );
    });

    const lossOverlay = createLossOverlay();
    for (const [levelId, content] of levelContents) {
      content.holes?.onLoss(() => {
        if (lossPending.value || ballFrozen.value || levelManager.getCurrentLevel() !== levelId) return;
        lossPending.value = true;
        lossTimer.value = 0;
        ball.autoResetEnabled = false;
      });
    }
    lossOverlay.onRetry(() => {
      lossOverlay.hide();
      getLevelContent(levelManager.getCurrentLevel()).holes?.reset();
      lossPending.value = false;
      lossTimer.value = 0;
      ball.autoResetEnabled = true;
      ball.reset();
      ball.visual.visible = true;
      ballFrozen.value = false;
    });

    const winOverlay = createWinOverlay();

    const finishLevelTransition = () => {
      levelManager.setCurrentLevel(transitionToLevel.value);
      ball.autoResetEnabled = true;
      ball.reset();
      ball.visual.visible = true;
      ballFrozen.value = false;
      transitionPhase.value = "none";
      gateHole.reset();
    };

    const startLevelTransition = (fromLevel: number, toLevel: number) => {
      transitionFromLevel.value = fromLevel;
      transitionToLevel.value = toLevel;
      transitionPhase.value = "level_out";
      transitionTime.value = 0;
      const from = getLevelContent(fromLevel);
      ensurePuzzleFinalY(from.puzzle.visuals);
      from.puzzle.setCollidersEnabled(false);
      from.fans.forEach((fan) => fan.setEnabled(false));
    };

    gateHole.onWin(() => {
      if (ballFrozen.value || giftPauseActive.value || transitionPhase.value !== "none") return;
      const current = levelManager.getCurrentLevel();
      if (current >= TOTAL_LEVELS) return;
      lossPending.value = false;
      lossTimer.value = 0;
      ballFrozen.value = true;
      ball.visual.visible = false;
      winOverlay.show();
    });

    winOverlay.onNextLevel(() => {
      winOverlay.hide();
      const current = levelManager.getCurrentLevel();
      if (current >= TOTAL_LEVELS) return;
      pendingNextLevel.value = current + 1;
      transitionPhase.value = "waiting";
      transitionTime.value = 0;
    });

    enableShadowsOnObject(staticWorldGroup);

    const physicsDebug = SHOW_COLLIDERS
      ? new PhysicsDebugRenderer(world, this.scene, {
          shouldShowCollider: (collider) =>
            levelManager.isColliderVisibleInDebug(collider),
        })
      : null;

    const lightDebug = SHOW_LIGHT_HELPERS ? new LightDebugRenderer(this.scene) : null;
        
    const cameraDebug = DEBUG_CAMERA_TRANSFORM
      ? createCameraDebugMonitor(this.camera, this.controls)
      : null;
    cameraDebug?.enable();

    logSceneHierarchy(this.scene, "root");

    setupResize(this.camera, this.renderer);

    startGameLoop({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      controls: this.controls,
      world,
      joystick,
      levelManager,
      levelContents,
      getLevelContent,
      sharedBoard,
      gateHole,
      ball,
      physicsDebug,
      lightDebug,
      cameraDebug,
      lossOverlay,
      puzzleLevel1,
      puzzleIntroActive,
      puzzleIntroTime,
      transitionPhase,
      transitionTime,
      transitionFromLevel,
      transitionToLevel,
      pendingNextLevel,
      ballFrozen,
      lossTimer,
      lossPending,
      giftPauseActive,
      giftCameraTransition,
      finishLevelTransition,
      startLevelTransition,
    });
  }
}
