import * as THREE from "three";
import { TextureLoader } from "three";

export type MaterialTextureMap = Record<string, string>;
export type MeshTextureMap = Record<string, string>;

export type ModelTextureOptions = {
  textureUrl: string;
  maxAnisotropy?: number;
  /** How many times the texture tiles along U and V. Default: 1×1. */
  repeat?: { x: number; y: number };
  /** Shifts the texture in UV space. */
  offset?: { x: number; y: number };
  /** Rotates the texture in UV space (radians). */
  textureRotation?: number;
  /** Pivot for UV rotation. Default: 0.5, 0.5. */
  textureCenter?: { x: number; y: number };
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
  /** Default false for GLB UVs. */
  flipY?: boolean;
  /** Mirrors the texture horizontally in UV space. */
  flipX?: boolean;
  /** Multiplies with the texture color. */
  color?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
};

const textureLoader = new TextureLoader();

type TextureLoadOptions = Omit<
  ModelTextureOptions,
  "textureUrl" | "color" | "roughness" | "metalness"
>;

export async function loadModelTexture(
  url: string,
  options: TextureLoadOptions = {}
): Promise<THREE.Texture> {
  let texture: THREE.Texture;
  try {
    texture = await textureLoader.loadAsync(url);
  } catch (error) {
    const failedUrl =
      error instanceof Event && error.target instanceof HTMLImageElement
        ? error.target.src
        : url;
    const message = `Failed to load texture: ${failedUrl}`;
    console.error(message, error);
    throw new Error(message, { cause: error });
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = options.flipY ?? false;
  texture.wrapS = options.wrapS ?? THREE.RepeatWrapping;
  texture.wrapT = options.wrapT ?? THREE.RepeatWrapping;

  if (options.repeat) {
    texture.repeat.set(options.repeat.x, options.repeat.y);
  }

  if (options.offset) {
    texture.offset.set(options.offset.x, options.offset.y);
  }

  if (options.flipX) {
    texture.offset.x += texture.repeat.x;
    texture.repeat.x *= -1;
  }

  if (options.textureRotation !== undefined) {
    texture.rotation = options.textureRotation;
  }

  if (options.textureCenter) {
    texture.center.set(options.textureCenter.x, options.textureCenter.y);
  } else if (options.textureRotation !== undefined) {
    texture.center.set(0.5, 0.5);
  }

  if (options.maxAnisotropy !== undefined) {
    texture.anisotropy = options.maxAnisotropy;
  }

  return texture;
}

type MaterialTextureOverrides = Pick<
  ModelTextureOptions,
  "color" | "roughness" | "metalness"
>;

function applyTextureToPbrMaterial(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  texture: THREE.Texture,
  materialOverrides: MaterialTextureOverrides = {}
): void {
  material.map = texture;

  if (materialOverrides.color !== undefined) {
    material.color.set(materialOverrides.color);
  }

  if (materialOverrides.roughness !== undefined) {
    material.roughness = materialOverrides.roughness;
  }

  if (materialOverrides.metalness !== undefined) {
    material.metalness = materialOverrides.metalness;
  }

  material.needsUpdate = true;
}

function pickTextureLoadOptions(
  options: Partial<ModelTextureOptions>
): TextureLoadOptions {
  const {
    textureUrl: _textureUrl,
    color: _color,
    roughness: _roughness,
    metalness: _metalness,
    ...textureOptions
  } = options;
  return textureOptions;
}

async function loadTexturesByUrl(
  urlMap: Record<string, string>,
  loadOptions: TextureLoadOptions
): Promise<Map<string, THREE.Texture>> {
  const uniqueUrls = [...new Set(Object.values(urlMap))];
  const loaded = new Map<string, THREE.Texture>();

  await Promise.all(
    uniqueUrls.map(async (url) => {
      loaded.set(url, await loadModelTexture(url, loadOptions));
    })
  );

  return loaded;
}

export function applyTextureToModel(
  root: THREE.Object3D,
  texture: THREE.Texture,
  materialOverrides: MaterialTextureOverrides = {}
): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of materials) {
      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        applyTextureToPbrMaterial(material, texture, materialOverrides);
      }
    }
  });
}

export async function applyMaterialTexturesToModel(
  root: THREE.Object3D,
  materialTextures: MaterialTextureMap,
  options: Partial<ModelTextureOptions> = {}
): Promise<void> {
  const { color, roughness, metalness } = options;
  const textureByUrl = await loadTexturesByUrl(
    materialTextures,
    pickTextureLoadOptions(options)
  );
  const materialOverrides = { color, roughness, metalness };

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of materials) {
      const textureUrl = materialTextures[material.name];
      if (!textureUrl) continue;

      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        applyTextureToPbrMaterial(
          material,
          textureByUrl.get(textureUrl)!,
          materialOverrides
        );
      }
    }
  });
}

export async function applyMeshTexturesToModel(
  root: THREE.Object3D,
  meshTextures: MeshTextureMap,
  options: Partial<ModelTextureOptions> = {}
): Promise<void> {
  const { color, roughness, metalness } = options;
  const textureByUrl = await loadTexturesByUrl(
    meshTextures,
    pickTextureLoadOptions(options)
  );
  const materialOverrides = { color, roughness, metalness };

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const textureUrl = meshTextures[child.name];
    if (!textureUrl) return;

    const texture = textureByUrl.get(textureUrl)!;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of materials) {
      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        applyTextureToPbrMaterial(material, texture, materialOverrides);
      }
    }
  });
}

export function pickModelTextureOptions(
  options: Partial<ModelTextureOptions>
): ModelTextureOptions | null {
  if (!options.textureUrl) return null;

  return {
    textureUrl: options.textureUrl,
    maxAnisotropy: options.maxAnisotropy,
    repeat: options.repeat,
    offset: options.offset,
    textureRotation: options.textureRotation,
    textureCenter: options.textureCenter,
    wrapS: options.wrapS,
    wrapT: options.wrapT,
    flipY: options.flipY,
    flipX: options.flipX,
    color: options.color,
    roughness: options.roughness,
    metalness: options.metalness,
  };
}

export async function applyModelTexture(
  root: THREE.Object3D,
  options: ModelTextureOptions
): Promise<THREE.Texture> {
  const { textureUrl, color, roughness, metalness, ...textureOptions } =
    options;
  const texture = await loadModelTexture(textureUrl, textureOptions);
  applyTextureToModel(root, texture, { color, roughness, metalness });
  return texture;
}
