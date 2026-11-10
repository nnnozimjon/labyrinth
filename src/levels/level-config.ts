import type { LevelManager } from "./LevelManager";
import type { LevelContent } from "./level-types";

/**
 * Registers a level's visuals and colliders with the level manager, and shows its holes and
 * gift only while it is the current level.
 */
export function registerLevelContent(
  levelManager: LevelManager,
  id: number,
  content: LevelContent
) {
  const { board, puzzle, fans, holes, giftBox } = content;

  levelManager.registerLevelObject(id, board.visual);
  for (const visual of puzzle.visuals) {
    levelManager.registerLevelObject(id, visual);
  }
  levelManager.registerLevelBody(id, board.body);

  const colliders = [
    ...board.getColliders(),
    ...puzzle.getColliders(),
    ...fans.flatMap((fan) => fan.getColliders()),
  ];
  for (const collider of colliders) {
    levelManager.registerLevelCollider(id, collider);
  }

  for (const helper of holes?.getDebugHelpers() ?? []) {
    levelManager.registerDebugHelper(id, helper);
  }

  if (giftBox) {
    levelManager.registerLevelObject(id, giftBox.visual);
    for (const helper of giftBox.getDebugHelpers()) {
      levelManager.registerDebugHelper(id, helper);
    }
  }

  levelManager.setLevelHooks(id, {
    onActivate: () => {
      holes?.setActive(true);
      giftBox?.setActive(true);
    },
    onDeactivate: () => {
      holes?.setActive(false);
      giftBox?.setActive(false);
    },
  });
}
