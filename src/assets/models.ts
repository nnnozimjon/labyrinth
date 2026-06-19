import boardLevel1ModelUrl from "../board-ground.glb?url";
import puzzleLevel1ModelUrl from "../puzzles.glb?url";
import boardLevel2ModelUrl from "../board-ground-level-2.glb?url";
import puzzleLevel2ModelUrl from "../puzzle-2.glb?url";
import vfxHolesLevel2ModelUrl from "../level2-holes-vfx.glb?url";
import boardLevel3ModelUrl from "../board-ground-3.glb?url";
import puzzleLevel3ModelUrl from "../level3-puzzle.glb?url";
import vfxHolesLevel3ModelUrl from "../vfx-holes-level3.glb?url";
import wallsModelUrl from "../board-walls.glb?url";
import gateModelUrl from "../board-gate.glb?url";
import groundModelUrl from "../ground.glb?url";
import bookModelUrl from "../book.glb?url";
import ticketModelUrl from "../ticket.glb?url";
import boxModelUrl from "../box.glb?url";
import sandWatchModelUrl from "../sand-watch.glb?url";
import dicesModelUrl from "../dices.glb?url";
import vfxGateHoleModelUrl from "../gate-hole-vfx.glb?url";

/** Draco-compressed glTF assets served from `public/`. */
const gltfModels = {
  ball: "/ball.gltf",
  stairs: "/board-stairs.gltf",
  lamp: "/lamp.gltf",
  cupPlate: "/cup-plate.gltf",
  levelCalendar: "/level-calendar.gltf",
  giftBox: "/gift-box.gltf",
} as const;

export const models = {
  ...gltfModels,
  boardLevel1: boardLevel1ModelUrl,
  puzzleLevel1: puzzleLevel1ModelUrl,
  boardLevel2: boardLevel2ModelUrl,
  puzzleLevel2: puzzleLevel2ModelUrl,
  vfxHolesLevel2: vfxHolesLevel2ModelUrl,
  boardLevel3: boardLevel3ModelUrl,
  puzzleLevel3: puzzleLevel3ModelUrl,
  vfxHolesLevel3: vfxHolesLevel3ModelUrl,
  walls: wallsModelUrl,
  gate: gateModelUrl,
  ground: groundModelUrl,
  book: bookModelUrl,
  ticket: ticketModelUrl,
  box: boxModelUrl,
  sandWatch: sandWatchModelUrl,
  dices: dicesModelUrl,
  vfxGateHole: vfxGateHoleModelUrl,
} as const;
