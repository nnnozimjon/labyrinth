import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
dracoLoader.preload();

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const cache = new Map<string, Promise<GLTF>>();

/**
 * Loads a glTF file once; later calls for the same URL share the result, so every model can
 * be preloaded in parallel up front. Callers must clone `gltf.scene` before modifying it.
 */
export function loadGltf(url: string): Promise<GLTF> {
  let pending = cache.get(url);
  if (!pending) {
    pending = gltfLoader.loadAsync(url);
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

/** Drops cached glTF results once the scene has been built from them. */
export function clearGltfCache(): void {
  cache.clear();
}

export function disposeGltfLoaderContext(): void {
  dracoLoader.dispose();
}
