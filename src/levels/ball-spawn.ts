import * as THREE from "three";

export type BallSpawnPosition = {
  x: number;
  y: number;
  z: number;
};

/** World-space Y for the ball center on spawn (above the board surface at y = 0). */
export const BALL_START_Y = 0.3;

/** World-space ball spawn for each level. */
export const LEVEL_BALL_START_POSITIONS: Record<number, BallSpawnPosition> = {
  1: { x: 0, y: BALL_START_Y, z: 3.6 },
  2: { x: 0, y: BALL_START_Y, z: 3.6 },
  3: { x: 0, y: BALL_START_Y, z: 3.6 },
};

export function getBallStartPosition(level: number): THREE.Vector3 {
  const spawn = LEVEL_BALL_START_POSITIONS[level];
  if (!spawn) {
    throw new Error(`Missing ball spawn position for level ${level}`);
  }
  return new THREE.Vector3(spawn.x, spawn.y, spawn.z);
}

export function formatLevel3BallSpawnCode(spawn: BallSpawnPosition): string {
  return `LEVEL_BALL_START_POSITIONS[3] = { x: ${round(spawn.x)}, y: ${round(spawn.y)}, z: ${round(spawn.z)} };`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
