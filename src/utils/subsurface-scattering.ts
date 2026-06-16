import * as THREE from "three";
import { SubsurfaceScatteringShader } from "three/addons/shaders/SubsurfaceScatteringShader.js";

export type SubsurfaceScatteringOptions = {
  thicknessColor?: THREE.ColorRepresentation;
  thicknessDistortion?: number;
  thicknessAmbient?: number;
  thicknessAttenuation?: number;
  thicknessPower?: number;
  thicknessScale?: number;
  thicknessMap?: THREE.Texture | null;
};

export type SubsurfaceSurfaceOptions = {
  color?: THREE.ColorRepresentation;
  side?: THREE.Side;
  opacity?: number;
  roughness?: number;
};

// Fix: use LinearSRGBColorSpace for compatibility with Three.js r152+
// Falls back gracefully if the constant isn't available in older builds
const WHITE_THICKNESS_MAP = (() => {
  const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  texture.colorSpace =
    (THREE as any).LinearSRGBColorSpace ?? (THREE as any).LinearEncoding ?? THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
})();

type SubsurfaceScatteringUniforms = typeof SubsurfaceScatteringShader.uniforms & {
  normalMap?: THREE.IUniform<THREE.Texture | null>;
  normalScale?: THREE.IUniform<THREE.Vector2>;
};

// Fix: power curve gives a more physically accurate roughness → shininess mapping.
// Linear lerp(100, 1, r) collapses too fast; this keeps mid-roughness values usable.
export function shininessFromRoughness(roughness: number): number {
  const clamped = THREE.MathUtils.clamp(roughness, 0, 1);
  return Math.pow(1 - clamped, 2) * 99 + 1;
}

export function createSubsurfaceScatteringMaterial(
  source: THREE.Material,
  surface: SubsurfaceSurfaceOptions = {},
  options: SubsurfaceScatteringOptions = {}
): THREE.ShaderMaterial {
  const sourcePbr =
    source instanceof THREE.MeshStandardMaterial ||
    source instanceof THREE.MeshPhysicalMaterial
      ? source
      : null;

  // Fix: compute defines up front so they're passed into the constructor,
  // not patched on afterward (avoids a missed needsUpdate cycle)
  const defines: Record<string, string> = {};
  if (sourcePbr?.map) defines["USE_MAP"] = "";
  if (sourcePbr?.normalMap) defines["USE_NORMALMAP"] = "";

  const uniforms = THREE.UniformsUtils.clone(
    SubsurfaceScatteringShader.uniforms
  ) as SubsurfaceScatteringUniforms;

  uniforms.diffuse.value = new THREE.Color(
    surface.color ?? sourcePbr?.color ?? 0xffffff
  );

  const opacity = surface.opacity ?? source.opacity ?? 1;
  uniforms.opacity.value = opacity;
  uniforms.shininess.value = shininessFromRoughness(
    surface.roughness ?? sourcePbr?.roughness ?? 0.5
  );
  uniforms.specular.value = new THREE.Color(0x111111);

  uniforms.thicknessColor.value = new THREE.Color(options.thicknessColor ?? 0xffffff);
  uniforms.thicknessDistortion.value = options.thicknessDistortion ?? 0.1;
  uniforms.thicknessAmbient.value = options.thicknessAmbient ?? 0.02;
  uniforms.thicknessAttenuation.value = options.thicknessAttenuation ?? 0.1;
  uniforms.thicknessPower.value = options.thicknessPower ?? 2.0;
  uniforms.thicknessScale.value = options.thicknessScale ?? 10.0;
  uniforms.thicknessMap.value = options.thicknessMap ?? WHITE_THICKNESS_MAP;

  if (sourcePbr?.map) {
    uniforms.map.value = sourcePbr.map;
    uniforms.uvTransform.value.copy(sourcePbr.map.matrix);
  }

  if (sourcePbr?.normalMap && uniforms.normalMap) {
    uniforms.normalMap.value = sourcePbr.normalMap;
    uniforms.normalScale?.value.copy(sourcePbr.normalScale);
  }

  // Fix: also forward emissive so SSS materials on emissive-source meshes don't go dark
  if (sourcePbr?.emissive && (uniforms as any).emissive) {
    (uniforms as any).emissive.value = sourcePbr.emissive.clone();
  }

  const material = new THREE.ShaderMaterial({
    name: source.name,
    uniforms,
    vertexShader: SubsurfaceScatteringShader.vertexShader,
    fragmentShader: SubsurfaceScatteringShader.fragmentShader,
    lights: true,
    transparent: opacity < 1,
    side: surface.side ?? source.side,
    depthWrite: opacity >= 1,
    defines,
  });

  material.needsUpdate = true;
  return material;
}

export function applySubsurfaceScattering(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  options: SubsurfaceScatteringOptions = {}
): THREE.ShaderMaterial {
  return createSubsurfaceScatteringMaterial(
    material,
    {
      color: material.color,
      side: material.side,
      opacity: material.opacity,
      roughness: material.roughness,
    },
    options
  );
}