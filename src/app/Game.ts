import * as THREE from "three";
import { createScene } from "../core/scene";
import { createCamera } from "../core/camera";
import { createRenderer } from "../core/renderer";
import { createControls } from "../core/controls";
import { setupResize } from "../core/resize";
import { CameraTransition, type CameraState } from "../core/camera-transition";
import { resolveStartLevel } from "../levels/level-progress";
import { VirtualJoystick } from "../input/joystick";
import { GameSoundManager } from "../audio";
import { isMobileDevice } from "../utils/device";
import {
  createGameHud,
  createGiftOverlay,
  createStartOverlay,
  createWinOverlay,
  setSoundEnabled,
} from "../ui/overlays";
import { FailEffect } from "../ui/FailEffect";
import { createLoadingOverlay } from "../ui/LoadingOverlay";
import { createCampaignInfoOverlay } from "../ui/CampaignInfoOverlay";
import { createFinalWinOverlay } from "../ui/FinalWinOverlay";
import { buildGameWorld } from "./game-world";
import { GameSession } from "./game-session";
import { setupDebugTools } from "./debug-tools";
import { startGameLoop } from "./game-loop";

/** Close-up of the level-3 gift while its reward overlay is open. */
const GIFT_CAMERA_STATE: CameraState = {
  position: new THREE.Vector3(1.89, 1.538, -1.673),
  rotation: new THREE.Euler(-2.524, 0.003, 3.139),
  target: new THREE.Vector3(1.885, 0.718, -0.517),
};

/** Seconds the camera takes to fly to the gift and back. */
const GIFT_CAMERA_DURATION = 1.5;

/** Keeps the full progress bar on screen briefly before the loading overlay hides. */
const LOADING_SETTLE_MS = 350;

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
    const startLevel = resolveStartLevel();
    setupResize(this.camera, this.renderer);

    const loading = createLoadingOverlay();
    loading.show();
    loading.setProgress(0);
    loading.setStatus("Загрузка игры...");

    const sound = new GameSoundManager();
    const joystick = new VirtualJoystick();
    joystick.element.style.display = "none";

    const [world] = await Promise.all([
      buildGameWorld({
        scene: this.scene,
        renderer: this.renderer,
        startLevel,
        onProgress: (fraction, stage) => {
          loading.setProgress(Math.round(fraction * 100));
          loading.setStatus(
            stage === "download" ? "Загрузка моделей..." : "Подготовка физики..."
          );
        },
      }),
      // Sound is optional: if it fails to load the game runs silently instead of not at all.
      sound.preload().catch((error: unknown) => {
        console.warn("Sounds failed to load; continuing without sound.", error);
      }),
    ]);

    this.placeCamera();
    const defaultCameraState: CameraState = {
      position: this.camera.position.clone(),
      rotation: this.camera.rotation.clone(),
      target: this.controls.target.clone(),
    };

    loading.setProgress(100);
    loading.setStatus("Почти готово...");
    await new Promise((resolve) => setTimeout(resolve, LOADING_SETTLE_MS));
    loading.hide();

    const debugUpdaters = setupDebugTools({
      world,
      scene: this.scene,
      camera: this.camera,
      controls: this.controls,
    });

    const giftCamera = new CameraTransition(GIFT_CAMERA_DURATION);
    const giftOverlay = createGiftOverlay();
    const failEffect = new FailEffect();
    const winOverlay = createWinOverlay();
    const finalWinOverlay = createFinalWinOverlay();

    const session = new GameSession({
      world,
      camera: this.camera,
      controls: this.controls,
      giftCamera,
      defaultCameraState,
      giftCameraState: GIFT_CAMERA_STATE,
      sound,
      ui: {
        showWin: (level) => winOverlay.show(level),
        showFinalWin: () => finalWinOverlay.show(),
        showGift: () => giftOverlay.show(),
        playFailEffect: () => failEffect.play(),
      },
    });

    for (const level of world.levels.values()) {
      level.giftBox?.onCollect(() => session.collectGift());
    }
    giftOverlay.onOkay(() => {
      giftOverlay.hide();
      session.dismissGift();
    });
    winOverlay.onNextLevel(() => {
      winOverlay.hide();
      session.advanceToNextLevel();
    });
    finalWinOverlay.onAlreadyClient(() => session.replayCurrentLevel());

    this.setupHud(sound);

    const startOverlay = createStartOverlay(startLevel);
    startOverlay.onStart(() => {
      startOverlay.hide();
      joystick.element.style.display = "";
      if (sound.isEnabled()) {
        void sound.unlock();
      }
      session.start();
    });

    startGameLoop({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      controls: this.controls,
      world,
      session,
      joystick,
      sound,
      giftCamera,
      debugUpdaters,
    });
  }

  /** Start view; phones get a higher shot so the whole board fits a portrait screen. */
  private placeCamera() {
    if (isMobileDevice()) {
      this.camera.position.set(-0.205, 11.725, -10.482);
      this.camera.rotation.set(-2.274, -0.024, -3.113);
    } else {
      this.camera.position.set(0.37, 8.582, -7.819);
      this.camera.rotation.set(-2.274, 0.021, 3.117);
    }
    this.controls.target.set(0.15, 0.44, -0.913);
    this.controls.update();
  }

  private setupHud(sound: GameSoundManager) {
    const campaignOverlay = createCampaignInfoOverlay();
    const hud = createGameHud();

    hud.menuButton.addEventListener("click", () => campaignOverlay.show());
    hud.soundButton.addEventListener("click", () => {
      const enabled = !sound.isEnabled();
      sound.setEnabled(enabled);
      setSoundEnabled(hud.soundButton, enabled);
      if (enabled) {
        void sound.unlock();
      }
    });
  }
}
