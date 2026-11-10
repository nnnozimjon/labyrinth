import GUI from "lil-gui";
import type { LossHoles } from "./LossHoles";
import type { HolePosition } from "./holes-types";
import { LEVEL_HOLE_POSITIONS } from "../../levels/hole-positions";

const DECIMALS = 2;

function round(value: number): number {
  const factor = 10 ** DECIMALS;
  return Math.round(value * factor) / factor;
}

/** Formats positions as the level-3 entry of LEVEL_HOLE_POSITIONS (src/levels/hole-positions.ts). */
export function formatHolePositionsCode(positions: readonly HolePosition[]): string {
  if (positions.length === 0) {
    return "3: [],";
  }

  const lines = positions.map(
    (hole) => `    { x: ${round(hole.x)}, z: ${round(hole.z)} },`
  );

  return `3: [\n${lines.join("\n")}\n  ],`;
}

export function logHolePositions(positions: readonly HolePosition[]): void {
  console.log("=== Level 3 Hole Positions ===");
  for (let i = 0; i < positions.length; i++) {
    const hole = positions[i];
    console.log(`Hole ${i}: x=${round(hole.x)}, z=${round(hole.z)}`);
  }
  console.log("Copy-paste code:");
  console.log(formatHolePositionsCode(positions));
}

export type HolesLevel3DebugOptions = {
  holes: LossHoles;
  enabled: boolean;
};

type HoleParam = {
  x: number;
  z: number;
};

export function createHolesLevel3DebugUI(options: HolesLevel3DebugOptions) {
  if (!options.enabled) {
    return null;
  }

  const { holes } = options;
  const holeParams: HoleParam[] = holes.positions.map((p) => ({ x: p.x, z: p.z }));
  const holeFolders: GUI[] = [];

  const gui = new GUI({ title: "Level 3 Holes" });
  gui.domElement.style.zIndex = "1000";

  const holesFolder = gui.addFolder("Hole triggers");
  holesFolder.open();

  const syncParamsFromHoles = () => {
    const positions = holes.positions;
    holeParams.length = 0;
    for (const pos of positions) {
      holeParams.push({ x: pos.x, z: pos.z });
    }
  };

  const rebuildHoleFolders = () => {
    for (const folder of holeFolders) {
      folder.destroy();
    }
    holeFolders.length = 0;

    for (let i = 0; i < holeParams.length; i++) {
      const index = i;
      const param = holeParams[index];
      const folder = holesFolder.addFolder(`Hole ${index + 1}`);

      folder
        .add(param, "x", -5, 5, 0.01)
        .name("x")
        .onChange(() => {
          holes.setTriggerPosition(index, param.x, param.z);
        });
      folder
        .add(param, "z", -5, 5, 0.01)
        .name("z")
        .onChange(() => {
          holes.setTriggerPosition(index, param.x, param.z);
        });

      folder.open();
      holeFolders.push(folder);
    }

    holesFolder.controllers.forEach((c) => c.updateDisplay());
  };

  const actions = {
    addHole() {
      const index = holes.addTrigger(0, 0);
      holeParams.push({ x: 0, z: 0 });
      rebuildHoleFolders();
      console.log(`[Level 3 holes] Added hole ${index + 1}`);
    },
    removeLastHole() {
      if (holeParams.length === 0) return;
      holes.removeTrigger(holeParams.length - 1);
      holeParams.pop();
      rebuildHoleFolders();
      console.log("[Level 3 holes] Removed last hole");
    },
    logPositions() {
      logHolePositions(holes.positions);
    },
    async copyPositions() {
      const code = formatHolePositionsCode(holes.positions);
      try {
        await navigator.clipboard.writeText(code);
        console.log("[Level 3 holes] LEVEL_HOLE_POSITIONS[3] copied to clipboard.");
      } catch {
        console.log("[Level 3 holes] Clipboard unavailable. Copy-paste code:");
        console.log(code);
      }
    },
    seedFromLevel2() {
      while (holes.triggerCount > 0) {
        holes.removeTrigger(holes.triggerCount - 1);
      }
      for (const pos of LEVEL_HOLE_POSITIONS[2] ?? []) {
        holes.addTrigger(pos.x, pos.z);
      }
      syncParamsFromHoles();
      rebuildHoleFolders();
      console.log("[Level 3 holes] Seeded from level 2 positions — adjust as needed.");
    },
  };

  gui.add(actions, "addHole").name("Add hole");
  gui.add(actions, "removeLastHole").name("Remove last hole");
  gui.add(actions, "seedFromLevel2").name("Seed from level 2");
  gui.add(actions, "logPositions").name("Log positions");
  gui.add(actions, "copyPositions").name("Copy LEVEL_HOLE_POSITIONS[3]");

  if (holeParams.length === 0) {
    actions.addHole();
  } else {
    rebuildHoleFolders();
  }

  console.log("[Level 3 holes] Debug panel ready — tweak x/z, then copy LEVEL_HOLE_POSITIONS[3].");

  return {
    gui,
    destroy() {
      gui.destroy();
    },
  };
}
