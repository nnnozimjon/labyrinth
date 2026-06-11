import type RAPIER from "@dimforge/rapier3d-compat";
import type { PhysicsBoard } from "./PhysicsBoard";
import {
  PhysicsBoardAttachment,
  type PhysicsBoardAttachmentOptions,
} from "./PhysicsBoardAttachment";

export type PhysicsGateOptions = PhysicsBoardAttachmentOptions;

type RapierModule = typeof RAPIER;

export class PhysicsGate {
  readonly attachment: PhysicsBoardAttachment;

  private constructor(attachment: PhysicsBoardAttachment) {
    this.attachment = attachment;
  }

  static async create(
    RAPIER: RapierModule,
    world: RAPIER.World,
    board: PhysicsBoard,
    modelUrl: string,
    options: PhysicsGateOptions = {}
  ): Promise<PhysicsGate> {
    const attachment = await PhysicsBoardAttachment.create(
      RAPIER,
      world,
      board,
      modelUrl,
      { colliderMode: "trimesh", ...options }
    );
    return new PhysicsGate(attachment);
  }
}
