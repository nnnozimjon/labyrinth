import type RAPIER from "@dimforge/rapier3d-compat";
import type { BoardAnchor } from "./PhysicsBoard";
import {
  PhysicsBoardAttachment,
  type PhysicsBoardAttachmentOptions,
} from "./PhysicsBoardAttachment";

export type PhysicsWallsOptions = PhysicsBoardAttachmentOptions;

type RapierModule = typeof RAPIER;

export class PhysicsWalls {
  readonly attachment: PhysicsBoardAttachment;

  private constructor(attachment: PhysicsBoardAttachment) {
    this.attachment = attachment;
  }

  static async create(
    RAPIER: RapierModule,
    world: RAPIER.World,
    board: BoardAnchor,
    modelUrl: string,
    options: PhysicsWallsOptions = {}
  ): Promise<PhysicsWalls> {
    const attachment = await PhysicsBoardAttachment.create(
      RAPIER,
      world,
      board,
      modelUrl,
      { colliderMode: "auto", ...options }
    );
    return new PhysicsWalls(attachment);
  }
}
