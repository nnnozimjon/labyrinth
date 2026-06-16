import type { LevelManager } from "./LevelManager";
import type { LevelContent } from "./level-types";
import type { HoleLossTriggers } from "../entities/holes";

export function registerLevelContent(
  levelManager: LevelManager,
  id: number,
  content: LevelContent,
  holes: HoleLossTriggers | null
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
