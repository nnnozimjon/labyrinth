import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";
import {
  collectCollidersOnBody,
  setRigidBodyPhysicsEnabled,
} from "./physicsUtils";

/** `userData` key used to tag objects with their level number. */
export const LEVEL_USER_DATA_KEY = "level";

export type LevelConfig = {
  id: number;
  group: THREE.Group;
  bodies: RAPIER.RigidBody[];
  colliders: RAPIER.Collider[];
  objects: THREE.Object3D[];
  debugHelpers: THREE.Object3D[];
  onActivate?: () => void;
  onDeactivate?: () => void;
};

export type LevelVisualState = {
  /** Whether the level group and registered objects are shown. */
  visuals: boolean;
  /** Whether rigid bodies and colliders participate in physics. */
  physics: boolean;
};

/** Read level number from `userData.level` or a `level-N` object / group name. */
export function getObjectLevel(object: THREE.Object3D): number | null {
  let current: THREE.Object3D | null = object;

  while (current) {
    const tagged = current.userData[LEVEL_USER_DATA_KEY];
    if (typeof tagged === "number") {
      return tagged;
    }

    const match = /^level-(\d+)$/.exec(current.name);
    if (match) {
      return Number.parseInt(match[1], 10);
    }

    current = current.parent;
  }

  return null;
}

/** Tag an object and its descendants with a level number. */
export function tagObjectLevel(object: THREE.Object3D, level: number): void {
  object.userData[LEVEL_USER_DATA_KEY] = level;
  object.traverse((child) => {
    child.userData[LEVEL_USER_DATA_KEY] = level;
  });
}

/**
 * Central registry for per-level visuals and Rapier physics.
 * Only the current level should be visible and colliding.
 */
export class LevelManager {
  private readonly world: RAPIER.World;
  private readonly levels = new Map<number, LevelConfig>();
  private readonly colliderLevels = new Map<number, number>();
  private currentLevel = 1;

  constructor(world: RAPIER.World) {
    this.world = world;
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  getLevel(levelId: number): LevelConfig | undefined {
    return this.levels.get(levelId);
  }

  /** Create a named `level-N` group under the given parent. */
  createLevel(id: number, parent: THREE.Object3D): LevelConfig {
    const group = new THREE.Group();
    group.name = `level-${id}`;
    tagObjectLevel(group, id);
    parent.add(group);

    const config: LevelConfig = {
      id,
      group,
      bodies: [],
      colliders: [],
      objects: [],
      debugHelpers: [],
    };

    this.levels.set(id, config);
    return config;
  }

  registerLevelObject(levelId: number, object: THREE.Object3D): void {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`LevelManager: unknown level ${levelId}`);
    }

    tagObjectLevel(object, levelId);
    if (!level.objects.includes(object)) {
      level.objects.push(object);
    }
  }

  registerLevelCollider(levelId: number, collider: RAPIER.Collider): void {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`LevelManager: unknown level ${levelId}`);
    }

    if (!level.colliders.includes(collider)) {
      level.colliders.push(collider);
    }

    this.colliderLevels.set(collider.handle, levelId);
  }

  registerLevelBody(levelId: number, body: RAPIER.RigidBody): void {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`LevelManager: unknown level ${levelId}`);
    }

    if (!level.bodies.includes(body)) {
      level.bodies.push(body);
    }

    for (const collider of collectCollidersOnBody(this.world, body)) {
      this.registerLevelCollider(levelId, collider);
    }
  }

  registerDebugHelper(levelId: number, helper: THREE.Object3D): void {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`LevelManager: unknown level ${levelId}`);
    }

    if (!level.debugHelpers.includes(helper)) {
      level.debugHelpers.push(helper);
    }
  }

  setLevelHooks(
    levelId: number,
    hooks: Pick<LevelConfig, "onActivate" | "onDeactivate">
  ): void {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`LevelManager: unknown level ${levelId}`);
    }

    level.onActivate = hooks.onActivate;
    level.onDeactivate = hooks.onDeactivate;
  }

  /** Whether a collider's debug wireframe should be drawn (current visible level only). */
  isColliderVisibleInDebug(collider: RAPIER.Collider): boolean {
    const levelId = this.colliderLevels.get(collider.handle);
    if (levelId === undefined) {
      // Shared colliders (ball, environment, etc.) are always shown.
      return true;
    }

    const level = this.levels.get(levelId);
    return level?.group.visible === true;
  }

  /**
   * Show only the requested level with full physics.
   * Hides and disables every other level.
   */
  setCurrentLevel(levelNumber: number): void {
    if (!this.levels.has(levelNumber)) {
      throw new Error(`LevelManager: unknown level ${levelNumber}`);
    }

    // Deactivate every other level first so a later onDeactivate cannot
    // undo the active level's onActivate hooks (e.g. shared gate-hole win).
    for (const level of this.levels.values()) {
      if (level.id !== levelNumber) {
        level.onDeactivate?.();
      }
    }

    for (const level of this.levels.values()) {
      const isActive = level.id === levelNumber;

      if (isActive) {
        level.onActivate?.();
      }

      this.applyLevelState(level.id, {
        visuals: isActive,
        physics: isActive,
      });
    }

    this.currentLevel = levelNumber;
  }

  /** Fine-grained control used during intro / outro transitions. */
  setLevelState(levelId: number, state: LevelVisualState): void {
    this.applyLevelState(levelId, state);
  }

  applyLevelVisibility(activeLevel: number): void {
    for (const level of this.levels.values()) {
      const isActive = level.id === activeLevel;
      level.group.visible = isActive;

      for (const helper of level.debugHelpers) {
        helper.visible = isActive;
      }
    }
  }

  private applyLevelState(levelId: number, state: LevelVisualState): void {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`LevelManager: unknown level ${levelId}`);
    }

    level.group.visible = state.visuals;

    for (const object of level.objects) {
      object.visible = state.visuals;
    }

    for (const helper of level.debugHelpers) {
      helper.visible = state.visuals;
    }

    for (const body of level.bodies) {
      setRigidBodyPhysicsEnabled(this.world, body, state.physics);
    }

    for (const collider of level.colliders) {
      collider.setEnabled(state.physics);
    }
  }
}
