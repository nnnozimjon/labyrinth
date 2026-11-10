import type RAPIER from "@dimforge/rapier3d-compat";
import { BOARD_CONTAINMENT } from "../utils/constants";

type RapierModule = typeof RAPIER;

/**
 * Adds four solid cuboid walls around the play area to a board body, so they tilt with it.
 *
 * The visible walls are hollow, zero-thickness trimeshes: a fast ball can slip through or over
 * them and end up on the table, where nothing ever resets it. These boxes have real volume.
 * `surfaceY` is the board surface height in the body's local space.
 */
export function addBoardContainment(
  RAPIER: RapierModule,
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  halfExtents: { x: number; z: number },
  surfaceY = 0
): RAPIER.Collider[] {
  const { thickness, top, bottom } = BOARD_CONTAINMENT;
  const halfHeight = (top - bottom) / 2;
  const centerY = surfaceY + (top + bottom) / 2;
  const sideX = halfExtents.x + thickness / 2;
  const endZ = halfExtents.z + thickness / 2;

  // Side walls run the full length including the corners; end walls span between them.
  const boxes: ReadonlyArray<[hx: number, hz: number, x: number, z: number]> = [
    [thickness / 2, halfExtents.z + thickness, sideX, 0],
    [thickness / 2, halfExtents.z + thickness, -sideX, 0],
    [halfExtents.x + thickness, thickness / 2, 0, endZ],
    [halfExtents.x + thickness, thickness / 2, 0, -endZ],
  ];

  return boxes.map(([hx, hz, x, z]) =>
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(hx, halfHeight, hz).setTranslation(x, centerY, z),
      body
    )
  );
}
