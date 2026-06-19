import RAPIER from "@dimforge/rapier3d-compat";

export async function createPhysicsWorld() {
  await RAPIER.init();

  const gravity = new RAPIER.Vector3(0, -24.81, 0);
  const world = new RAPIER.World(gravity);

  return { RAPIER, world };
}
