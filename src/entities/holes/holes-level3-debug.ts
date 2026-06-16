import GUI from "lil-gui";
import type { PhysicsHolesLevel3 } from "./PhysicsHoleLevel3";
import type { HolePosition } from "./holes-types";

const DECIMALS = 2;

function round(value: number): number {
  const factor = 10 ** DECIMALS;
  return Math.round(value * factor) / factor;
}

export function formatHolePositionsCode(positions: HolePosition[]): string {
  if (positions.length === 0) {
    return "const DEFAULT_HOLE_POSITIONS: HolePosition[] = [];";
  }

  const lines = positions.map(
    (hole) => `  { x: ${round(hole.x)}, z: ${round(hole.z)} },`
  );

  return `const DEFAULT_HOLE_POSITIONS: HolePosition[] = [\n${lines.join("\n")}\n];`;
}

export function logHolePositions(positions: HolePosition[]): void {
  console.log("=== Level 3 Hole Positions ===");
  for (let i = 0; i < positions.length; i++) {
    const hole = positions[i];
    console.log(`Hole ${i}: x=${round(hole.x)}, z=${round(hole.z)}`);
  }
  console.log("Copy-paste code:");
  console.log(formatHolePositionsCode(positions));
}

export type HolesLevel3DebugOptions = {
  holes: PhysicsHolesLevel3;
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
  const holeParams: HoleParam[] = holes.getPositions().map((p) => ({ x: p.x, z: p.z }));
  const holeFolders: GUI[] = [];

  const gui = new GUI({ title: "Level 3 Holes" });
  gui.domElement.style.zIndex = "1000";

  const holesFolder = gui.addFolder("Hole triggers");
  holesFolder.open();

  const syncParamsFromHoles = () => {
    const positions = holes.getPositions();
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
      logHolePositions(holes.getPositions());
    },
    async copyPositions() {
      const code = formatHolePositionsCode(holes.getPositions());
      try {
        await navigator.clipboard.writeText(code);
        console.log("[Level 3 holes] DEFAULT_HOLE_POSITIONS copied to clipboard.");
      } catch {
        console.log("[Level 3 holes] Clipboard unavailable. Copy-paste code:");
        console.log(code);
      }
    },
    seedFromLevel2() {
      const level2Positions: HolePosition[] = [
        { x: -2.21, z: 2.42 },
        { x: 2.08, z: -0.14 },
        { x: -2.21, z: -0.15 },
        { x: -2.21, z: -2.49 },
        { x: 2.08, z: -2.49 },
      ];
      while (holes.getTriggerCount() > 0) {
        holes.removeTrigger(holes.getTriggerCount() - 1);
      }
      for (const pos of level2Positions) {
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
  gui.add(actions, "copyPositions").name("Copy DEFAULT_HOLE_POSITIONS");

  if (holeParams.length === 0) {
    actions.addHole();
  } else {
    rebuildHoleFolders();
  }

  console.log("[Level 3 holes] Debug panel ready — tweak x/z, then copy DEFAULT_HOLE_POSITIONS.");

  return {
    gui,
    destroy() {
      gui.destroy();
    },
  };
}
