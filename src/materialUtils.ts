import * as THREE from "three";
import {
  createSubsurfaceScatteringMaterial,
  type SubsurfaceScatteringOptions,
} from "./subsurfaceScattering";

export type MaterialOverride = {
  color?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  transparent?: boolean;
  transmission?: number;
  ior?: number;
  side?: THREE.Side;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  sheen?: number;
  sheenColor?: THREE.ColorRepresentation;
  sheenRoughness?: number;
  thickness?: number;
  attenuationColor?: THREE.ColorRepresentation;
  attenuationDistance?: number;
  subsurfaceScattering?: SubsurfaceScatteringOptions;
  /** Strip texture maps so overrides render as solid colors. */
  clearMaps?: boolean;
};

export type MaterialOverrideMap = Record<string, MaterialOverride>;

// Fix: set lookup is cleaner and easier to extend than a long boolean chain
const PHYSICAL_ONLY_KEYS = new Set<keyof MaterialOverride>([
  "transmission",
  "ior",
  "sheen",
  "sheenColor",
  "sheenRoughness",
  "thickness",
  "attenuationColor",
  "attenuationDistance",
]);

function needsPhysicalMaterial(override: MaterialOverride): boolean {
  return (Object.keys(override) as (keyof MaterialOverride)[]).some((k) =>
    PHYSICAL_ONLY_KEYS.has(k)
  );
}

// Fix: copyStandardToPhysical now includes wireframe, alphaTest, flatShading
function copyStandardToPhysical(
  source: THREE.MeshStandardMaterial,
  target: THREE.MeshPhysicalMaterial
): void {
  target.name = source.name;
  target.color.copy(source.color);
  target.emissive.copy(source.emissive);
  target.emissiveIntensity = source.emissiveIntensity;
  target.map = source.map;
  target.normalMap = source.normalMap;
  target.normalScale.copy(source.normalScale);
  target.roughnessMap = source.roughnessMap;
  target.metalnessMap = source.metalnessMap;
  target.alphaMap = source.alphaMap;
  target.aoMap = source.aoMap;
  target.envMap = source.envMap;
  target.roughness = source.roughness;
  target.metalness = source.metalness;
  target.opacity = source.opacity;
  target.transparent = source.transparent;
  target.side = source.side;
  target.vertexColors = source.vertexColors;
  target.depthWrite = source.depthWrite;
  target.depthTest = source.depthTest;
  target.wireframe = source.wireframe;
  target.alphaTest = source.alphaTest;
  target.flatShading = source.flatShading;
}

function toPbrMaterial(
  material: THREE.Material
): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  if (
    material instanceof THREE.MeshPhysicalMaterial ||
    material instanceof THREE.MeshStandardMaterial
  ) {
    return material.clone();
  }

  const standard = new THREE.MeshStandardMaterial();
  standard.name = material.name;
  standard.opacity = material.opacity;
  standard.transparent = material.transparent;
  standard.side = material.side;
  standard.alphaTest = material.alphaTest;
  return standard;
}

function toPhysicalMaterial(material: THREE.Material): THREE.MeshPhysicalMaterial {
  if (material instanceof THREE.MeshPhysicalMaterial) {
    return material.clone();
  }

  const physical = new THREE.MeshPhysicalMaterial();

  if (material instanceof THREE.MeshStandardMaterial) {
    copyStandardToPhysical(material, physical);
  } else {
    physical.name = material.name;
    physical.opacity = material.opacity;
    physical.transparent = material.transparent;
    physical.side = material.side;
    physical.alphaTest = material.alphaTest;
  }

  return physical;
}

export function clearMaterialMaps(
  mat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial
): void {
  mat.map = null;
  mat.normalMap = null;
  mat.roughnessMap = null;
  mat.metalnessMap = null;
  mat.alphaMap = null;
  mat.aoMap = null;
  mat.lightMap = null;
  mat.emissiveMap = null;
  mat.aoMapIntensity = 0;
  mat.lightMapIntensity = 0;
}

export type MaterialColorMap = Record<string, THREE.ColorRepresentation>;
export type MeshColorMap = Record<string, THREE.ColorRepresentation>;

export type ModelMaterialColorOptions = {
  materialColors?: MaterialColorMap;
  meshColors?: MeshColorMap;
  defaultMaterialColor?: THREE.ColorRepresentation;
};

export function applyMaterialColorsToModel(
  root: THREE.Object3D,
  options: ModelMaterialColorOptions
): void {
  const {
    materialColors = {},
    meshColors = {},
    defaultMaterialColor,
  } = options;

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of materials) {
      const color =
        materialColors[material.name] ??
        meshColors[child.name] ??
        defaultMaterialColor;

      if (color === undefined) continue;

      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        clearMaterialMaps(material);
        material.color.set(color);
        material.needsUpdate = true;
      }
    }
  });
}

function applyOverrideToMaterial(
  material: THREE.Material,
  override: MaterialOverride
): THREE.Material {
  if (override.subsurfaceScattering) {
    const source = material.clone();

    if (override.clearMaps) {
      if (
        source instanceof THREE.MeshStandardMaterial ||
        source instanceof THREE.MeshPhysicalMaterial
      ) {
        clearMaterialMaps(source);
      }
    }

    return createSubsurfaceScatteringMaterial(
      source,
      {
        color: override.color,
        side: override.side ?? source.side,
        opacity: override.opacity ?? source.opacity,
        roughness:
          override.roughness ??
          (source instanceof THREE.MeshStandardMaterial ||
          source instanceof THREE.MeshPhysicalMaterial
            ? source.roughness
            : 0.5),
      },
      override.subsurfaceScattering
    );
  }

  const mat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial =
    needsPhysicalMaterial(override)
      ? toPhysicalMaterial(material)
      : toPbrMaterial(material);

  if (override.color !== undefined) mat.color.set(override.color);
  if (override.roughness !== undefined) mat.roughness = override.roughness;
  if (override.metalness !== undefined) mat.metalness = override.metalness;
  if (override.opacity !== undefined) mat.opacity = override.opacity;
  if (override.transparent !== undefined) mat.transparent = override.transparent;
  if (override.side !== undefined) mat.side = override.side;
  if (override.emissive !== undefined) mat.emissive.set(override.emissive);
  if (override.emissiveIntensity !== undefined) mat.emissiveIntensity = override.emissiveIntensity;

  if (mat instanceof THREE.MeshPhysicalMaterial) {
    if (override.transmission !== undefined) mat.transmission = override.transmission;
    if (override.ior !== undefined) mat.ior = override.ior;
    if (override.sheen !== undefined) mat.sheen = override.sheen;
    if (override.sheenColor !== undefined) mat.sheenColor.set(override.sheenColor);
    if (override.sheenRoughness !== undefined) mat.sheenRoughness = override.sheenRoughness;
    if (override.thickness !== undefined) mat.thickness = override.thickness;
    if (override.attenuationColor !== undefined) mat.attenuationColor.set(override.attenuationColor);
    if (override.attenuationDistance !== undefined) mat.attenuationDistance = override.attenuationDistance;
  }

  if (override.clearMaps) {
    clearMaterialMaps(mat);
  }

  mat.needsUpdate = true;
  return mat;
}

export type MeshCache = Map<string, THREE.Mesh[]>;

// Fix: optional mesh cache to avoid re-traversing the full tree on repeated calls
export function buildMeshCache(root: THREE.Object3D): MeshCache {
  const cache: MeshCache = new Map();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of materials) {
      if (!cache.has(mat.name)) cache.set(mat.name, []);
      cache.get(mat.name)!.push(child);
    }
  });
  return cache;
}

export function applyMaterialOverrides(
  root: THREE.Object3D,
  overrides: MaterialOverrideMap,
  cache?: MeshCache
): void {
  if (cache) {
    for (const [matName, override] of Object.entries(overrides)) {
      const meshes = cache.get(matName);
      if (!meshes) continue;
      for (const mesh of meshes) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) =>
            m.name === matName ? applyOverrideToMaterial(m, override) : m
          );
        } else {
          mesh.material = applyOverrideToMaterial(mesh.material, override);
        }
      }
    }
    return;
  }

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => {
        const override = overrides[material.name];
        return override ? applyOverrideToMaterial(material, override) : material;
      });
      return;
    }

    const override = overrides[child.material.name];
    if (override) {
      child.material = applyOverrideToMaterial(child.material, override);
    }
  });
}

export const FORMULA55_YELLOW = 0xe7b31f;

export const BOARD_WALL_MATERIAL_OVERRIDES: MaterialOverrideMap = {
  "wall-around": {
    color: 0xe7b31f,
    roughness: 0.8,
    metalness: 0,
    side: THREE.DoubleSide,
    subsurfaceScattering: {
      thicknessColor: 0xff0000,
      thicknessAttenuation: 0.58,
      thicknessScale: 50,
      thicknessDistortion: 1,
      thicknessPower: 8,
      thicknessAmbient: 0.72,
    },
  },
};

export const SAND_WATCH_MATERIAL_OVERRIDES: MaterialOverrideMap = {
  "sandwatch-dark": {
    color: 0x1a1a1a,
    roughness: 0.65,
    metalness: 0.1,
  },
  "sandwathc-yellow": {
    color: 0xffcc00,
    roughness: 0.45,
    metalness: 0.15,
  },
  "sandwatch-glass": {
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.35,
    transmission: 0.92,
    ior: 1.5,
    side: THREE.DoubleSide,
  },
  "sandwatch-sand": {
    color: 0xe8882e,
    roughness: 0.95,
    metalness: 0,
  },
};

// GLB material names: plastic.003 (body), metal.003 (frame), bulb.003 (bulb/glass)
export const LAMP_MATERIAL_OVERRIDES: MaterialOverrideMap = {
  "plastic.003": {
    color: 0xffcc00,
    metalness: 0,
    roughness: 0.35,
    transmission: 0.15,
    thickness: 0.6,
    ior: 1.35,
    clearMaps: true,
  },
  "metal.003": {
    color: 0x1a1a1a,
    metalness: 0,
    roughness: 0.35,
    transmission: 0.15,
    thickness: 0.6,
    ior: 1.35,
    clearMaps: true,
  },
  "bulb.003": {
    color: "#fff6d6",
    metalness: 0,
    roughness: 0.35,
    transmission: 0.9,
    thickness: 0.1,
    ior: 1.35,
    emissive: 0xffcc66,
    emissiveIntensity: 14,
    clearMaps: true,
  },
};

// GLB material names: stiples, level-calendar, level-4 (level-1/2/3 use textures)
export const LEVEL_CALENDAR_MATERIAL_COLORS: MaterialColorMap = {
  stiples: "#2b2b2b",
  "level-calendar": "#f5d76e",
  "level-4": "#c4a882",
};

export const CUP_PLATE_MATERIAL_OVERRIDES: MaterialOverrideMap = {
  cup: {
    color: 0x000000,
    roughness: 0.5,
    metalness: 0,
  },
  plate: {
    color: 0x1a1a1a,
    roughness: 0.55,
    metalness: 0.05,
  },
  spoon: {
    color: 0xe7e7e7,
    roughness: 0.5,
    metalness: 1,
  },
  cuphandle: {
    color: 0xe7e7e7,
    roughness: 0.5,
    metalness: 0.614,
  },
};