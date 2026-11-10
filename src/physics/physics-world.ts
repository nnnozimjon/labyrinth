import RAPIER from "@dimforge/rapier3d-compat";
import { GRAVITY_Y, PHYSICS_TIMESTEP } from "../utils/constants";

export async function createPhysicsWorld() {
  await RAPIER.init();

  const world = new RAPIER.World(new RAPIER.Vector3(0, GRAVITY_Y, 0));
  // Never changed afterwards: the game loop always advances in fixed steps.
  world.timestep = PHYSICS_TIMESTEP;

  return { RAPIER, world };
}
