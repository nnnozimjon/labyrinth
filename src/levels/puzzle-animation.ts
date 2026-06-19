import type { PhysicsPuzzle } from "../entities/board/PhysicsPuzzle";
import { PUZZLE_INTRO_START_Y } from "../utils/constants";
import type { PuzzleVisuals } from "./level-types";

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Mirror of ease-out for sinking / exit animations. */
export function easeInCubic(t: number): number {
  return t * t * t;
}

export function ensurePuzzleFinalY(visuals: PuzzleVisuals) {
  for (const visual of visuals) {
    if (visual.userData.finalY === undefined) {
      visual.userData.finalY = visual.position.y;
    }
  }
}

export function preparePuzzleDropAnimation(visuals: PuzzleVisuals, startOffsetY: number) {
  ensurePuzzleFinalY(visuals);
  for (const visual of visuals) {
    visual.position.y = visual.userData.finalY + startOffsetY;
  }
}

export function animatePuzzleOffset(visuals: PuzzleVisuals, offsetY: number) {
  for (const visual of visuals) {
    visual.position.y = visual.userData.finalY + offsetY;
  }
}

/** Rise from below — used on level intro. */
export function animatePuzzleRise(visuals: PuzzleVisuals, t: number) {
  animatePuzzleOffset(visuals, PUZZLE_INTRO_START_Y * (1 - easeOutCubic(t)));
}

/** Sink downward — reverse of rise; hide visuals once t >= 1. */
export function animatePuzzleSink(visuals: PuzzleVisuals, t: number) {
  animatePuzzleOffset(visuals, PUZZLE_INTRO_START_Y * easeInCubic(t));
}

export function hidePuzzlesAfterSink(puzzle: PhysicsPuzzle, visuals: PuzzleVisuals) {
  animatePuzzleOffset(visuals, PUZZLE_INTRO_START_Y);
  puzzle.setVisible(false);
}
