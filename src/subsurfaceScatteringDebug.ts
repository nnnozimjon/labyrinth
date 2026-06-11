import * as THREE from "three";
import GUI from "lil-gui";
import {
  shininessFromRoughness,
  type SubsurfaceScatteringOptions,
} from "./subsurfaceScattering";

type SssUniforms = {
  diffuse: { value: THREE.Color };
  shininess: { value: number };
  thicknessColor: { value: THREE.Color };
  thicknessAttenuation: { value: number };
  thicknessScale: { value: number };
  thicknessDistortion: { value: number };
  thicknessPower: { value: number };
  thicknessAmbient: { value: number };
};

export type SubsurfaceScatteringDebugOptions = {
  root: THREE.Object3D;
  enabled: boolean;
  color?: THREE.ColorRepresentation;
  roughness?: number;
  subsurfaceScattering: SubsurfaceScatteringOptions;
};

type DebugParams = {
  color: string;
  roughness: number;
  thicknessColor: string;
  thicknessAttenuation: number;
  thicknessScale: number;
  thicknessDistortion: number;
  thicknessPower: number;
  thicknessAmbient: number;
};

function isSubsurfaceShaderMaterial(
  material: THREE.Material
): material is THREE.ShaderMaterial {
  return (
    material instanceof THREE.ShaderMaterial &&
    material.uniforms.thicknessColor !== undefined
  );
}

function collectSubsurfaceMaterials(root: THREE.Object3D): THREE.ShaderMaterial[] {
  const materials: THREE.ShaderMaterial[] = [];
  const seen = new Set<THREE.ShaderMaterial>();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const meshMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of meshMaterials) {
      if (isSubsurfaceShaderMaterial(material) && !seen.has(material)) {
        seen.add(material);
        materials.push(material);
      }
    }
  });

  return materials;
}

function roughnessFromShininess(shininess: number): number {
  const clamped = THREE.MathUtils.clamp(shininess, 1, 100);
  return (100 - clamped) / 99;
}

function colorToHex(color: THREE.ColorRepresentation): string {
  return `#${new THREE.Color(color).getHexString()}`;
}

function formatOverrideSnippet(params: DebugParams): string {
  const thicknessColor = `0x${new THREE.Color(params.thicknessColor).getHexString()}`;
  const color = `0x${new THREE.Color(params.color).getHexString()}`;

  return `"wall-around": {
  color: ${color},
  roughness: ${params.roughness},
  metalness: 0,
  side: THREE.DoubleSide,
  subsurfaceScattering: {
    thicknessColor: ${thicknessColor},
    thicknessAttenuation: ${params.thicknessAttenuation},
    thicknessScale: ${params.thicknessScale},
    thicknessDistortion: ${params.thicknessDistortion},
    thicknessPower: ${params.thicknessPower},
    thicknessAmbient: ${params.thicknessAmbient},
  },
},`;
}

function formatJsonSnippet(params: DebugParams): string {
  return JSON.stringify(
    {
      color: new THREE.Color(params.color).getHex(),
      roughness: params.roughness,
      subsurfaceScattering: {
        thicknessColor: new THREE.Color(params.thicknessColor).getHex(),
        thicknessAttenuation: params.thicknessAttenuation,
        thicknessScale: params.thicknessScale,
        thicknessDistortion: params.thicknessDistortion,
        thicknessPower: params.thicknessPower,
        thicknessAmbient: params.thicknessAmbient,
      },
    },
    null,
    2
  );
}

export function createSubsurfaceScatteringDebugUI(
  options: SubsurfaceScatteringDebugOptions
) {
  if (!options.enabled) {
    return null;
  }

  const materials = collectSubsurfaceMaterials(options.root);
  if (materials.length === 0) {
    console.warn(
      "[SSS debug] No subsurface scattering materials found under root."
    );
    return null;
  }

  const reference = materials[0].uniforms as SssUniforms;
  const sss = options.subsurfaceScattering;

  const params: DebugParams = {
    color: colorToHex(options.color ?? reference.diffuse.value),
    roughness:
      options.roughness ?? roughnessFromShininess(reference.shininess.value),
    thicknessColor: colorToHex(
      sss.thicknessColor ?? reference.thicknessColor.value
    ),
    thicknessAttenuation:
      sss.thicknessAttenuation ?? reference.thicknessAttenuation.value,
    thicknessScale: sss.thicknessScale ?? reference.thicknessScale.value,
    thicknessDistortion:
      sss.thicknessDistortion ?? reference.thicknessDistortion.value,
    thicknessPower: sss.thicknessPower ?? reference.thicknessPower.value,
    thicknessAmbient: sss.thicknessAmbient ?? reference.thicknessAmbient.value,
  };

  const applyParams = () => {
    for (const material of materials) {
      const uniforms = material.uniforms as SssUniforms;
      uniforms.diffuse.value.set(params.color);
      uniforms.shininess.value = shininessFromRoughness(params.roughness);
      uniforms.thicknessColor.value.set(params.thicknessColor);
      uniforms.thicknessAttenuation.value = params.thicknessAttenuation;
      uniforms.thicknessScale.value = params.thicknessScale;
      uniforms.thicknessDistortion.value = params.thicknessDistortion;
      uniforms.thicknessPower.value = params.thicknessPower;
      uniforms.thicknessAmbient.value = params.thicknessAmbient;
    }
  };

  applyParams();

  const gui = new GUI({ title: "Wall SSS Debug" });
  gui.domElement.style.zIndex = "1000";

  const surfaceFolder = gui.addFolder("Surface");
  surfaceFolder.addColor(params, "color").name("color").onChange(applyParams);
  surfaceFolder
    .add(params, "roughness", 0, 1, 0.01)
    .name("roughness")
    .onChange(applyParams);
  surfaceFolder.open();

  const sssFolder = gui.addFolder("Subsurface Scattering");
  sssFolder
    .addColor(params, "thicknessColor")
    .name("thicknessColor")
    .onChange(applyParams);
  sssFolder
    .add(params, "thicknessAttenuation", 0, 20, 0.01)
    .name("thicknessAttenuation")
    .onChange(applyParams);
  sssFolder
    .add(params, "thicknessScale", 0, 50, 0.1)
    .name("thicknessScale")
    .onChange(applyParams);
  sssFolder
    .add(params, "thicknessDistortion", 0, 2, 0.01)
    .name("thicknessDistortion")
    .onChange(applyParams);
  sssFolder
    .add(params, "thicknessPower", 0, 20, 0.1)
    .name("thicknessPower")
    .onChange(applyParams);
  sssFolder
    .add(params, "thicknessAmbient", 0, 2, 0.01)
    .name("thicknessAmbient")
    .onChange(applyParams);
  sssFolder.open();

  const actions = {
    logValues() {
      const snippet = formatOverrideSnippet(params);
      console.log(`[SSS debug] ${materials.length} material(s) updated`);
      console.log("BOARD_WALL_MATERIAL_OVERRIDES snippet:");
      console.log(snippet);
      console.log("JSON:");
      console.log(formatJsonSnippet(params));
    },
    async copySnippet() {
      const snippet = formatOverrideSnippet(params);

      try {
        await navigator.clipboard.writeText(snippet);
        console.log("[SSS debug] Override snippet copied to clipboard.");
      } catch {
        console.log("[SSS debug] Clipboard unavailable. Copy-paste snippet:");
        console.log(snippet);
      }
    },
  };

  gui.add(actions, "logValues").name("Log values");
  gui.add(actions, "copySnippet").name("Copy snippet");

  console.log(
    `[SSS debug] Panel ready for ${materials.length} wall material(s).`
  );

  return {
    gui,
    materials,
    params,
    applyParams,
    destroy() {
      gui.destroy();
    },
  };
}
