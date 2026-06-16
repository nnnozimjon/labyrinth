import * as THREE from "three";

export type BallSpawnPosition = {
  x: number;
  y: number;
  z: number;
};

/** World-space ball spawn for each level. */
export const LEVEL_BALL_START_POSITIONS: Record<number, BallSpawnPosition> = {
  1: { x: 0, y: 0.3, z: 3.6 },  
  2: { x: 0, y: 0.3, z: 3.6 },
  3: { x: 0, y: 0.3, z: 3.6 },
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
