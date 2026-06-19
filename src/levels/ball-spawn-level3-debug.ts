import GUI from "lil-gui";
import type { PhysicsBall } from "../entities/ball/PhysicsBall";
import {
  formatLevel3BallSpawnCode,
  type BallSpawnPosition,
} from "./ball-spawn";

const DECIMALS = 2;

function round(value: number): number {
  const factor = 10 ** DECIMALS;
  return Math.round(value * factor) / factor;
}

export type BallSpawnLevel3DebugOptions = {
  ball: PhysicsBall;
  spawn: BallSpawnPosition;
  enabled: boolean;
};

export function createBallSpawnLevel3DebugUI(options: BallSpawnLevel3DebugOptions) {
  if (!options.enabled) {
    return null;
  }

  const { ball, spawn } = options;

  const applySpawn = () => {
    ball.setStartPosition(spawn);
    ball.reset();
    ball.visual.visible = true;
  };

  const gui = new GUI({ title: "Level 3 Ball Spawn" });
  gui.domElement.style.zIndex = "1000";

  const folder = gui.addFolder("Start position");
  folder.open();

  folder
    .add(spawn, "x", -5, 5, 0.01)
    .name("x")
    .onChange(applySpawn);
  folder
    .add(spawn, "y", -1, 2, 0.01)
    .name("y")
    .onChange(applySpawn);
  folder
    .add(spawn, "z", -5, 5, 0.01)
    .name("z")
    .onChange(applySpawn);

  const actions = {
    applySpawn() {
      applySpawn();
      console.log(
        `[Level 3 ball] Spawn: x=${round(spawn.x)}, y=${round(spawn.y)}, z=${round(spawn.z)}`
      );
    },
    logSpawn() {
      console.log("=== Level 3 Ball Spawn ===");
      console.log(`x=${round(spawn.x)}, y=${round(spawn.y)}, z=${round(spawn.z)}`);
      console.log("Copy-paste code:");
      console.log(formatLevel3BallSpawnCode(spawn));
    },
    async copySpawn() {
      const code = formatLevel3BallSpawnCode(spawn);
      try {
        await navigator.clipboard.writeText(code);
        console.log("[Level 3 ball] Spawn position copied to clipboard.");
      } catch {
        console.log("[Level 3 ball] Clipboard unavailable. Copy-paste code:");
        console.log(code);
      }
    },
  };

  gui.add(actions, "applySpawn").name("Reset ball here");
  gui.add(actions, "logSpawn").name("Log spawn");
  gui.add(actions, "copySpawn").name("Copy LEVEL_BALL_START_POSITIONS[3]");

  console.log("[Level 3 ball] Debug panel ready — tweak x/y/z, then copy spawn constants.");

  return {
    gui,
    destroy() {
      gui.destroy();
    },
  };
}
