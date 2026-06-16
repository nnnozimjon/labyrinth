import * as THREE from "three";
import { easeOutCubic } from "./puzzle-animation";

const LEVEL_MATERIAL_PATTERN = /^level-([1-3])$/;

function parseLevelMaterialName(name: string): number | null {
  const match = LEVEL_MATERIAL_PATTERN.exec(name);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

export class LevelCalendarDisplay {
  private readonly levelMaterials = new Map<number, THREE.MeshStandardMaterial>();
  private currentLevel = 1;

  private constructor(levelMaterials: Map<number, THREE.MeshStandardMaterial>) {
    this.levelMaterials = levelMaterials;
  }

  static attach(root: THREE.Object3D): LevelCalendarDisplay | null {
    const levelMaterials = new Map<number, THREE.MeshStandardMaterial>();

    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;

        const level = parseLevelMaterialName(material.name);
        if (level === null) continue;

        material.transparent = true;
        material.depthWrite = false;
        levelMaterials.set(level, material);
      }
    });

    if (levelMaterials.size === 0) {
      console.warn("LevelCalendarDisplay: no level-1/2/3 materials found on calendar model");
      return null;
    }

    return new LevelCalendarDisplay(levelMaterials);
  }

  setLevel(level: number) {
    this.currentLevel = level;

    for (const [materialLevel, material] of this.levelMaterials) {
      const visible = materialLevel === level;
      material.opacity = visible ? 1 : 0;
      material.visible = visible;
    }
  }

  /** Crossfade from one level image to the next (t in 0–1, eased internally). */
  setTransition(fromLevel: number, toLevel: number, t: number) {
    const blend = easeOutCubic(Math.min(Math.max(t, 0), 1));

    for (const [materialLevel, material] of this.levelMaterials) {
      let opacity = 0;

      if (materialLevel === fromLevel) {
        opacity = 1 - blend;
      } else if (materialLevel === toLevel) {
        opacity = blend;
      }

      material.opacity = opacity;
      material.visible = opacity > 0.01;
    }
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }
}
