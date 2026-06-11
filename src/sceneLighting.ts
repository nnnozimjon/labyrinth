import * as THREE from "three";

export type SceneLights = {
  lampSpot: THREE.SpotLight;
  leftLampSpot: THREE.SpotLight;
  lampFill: THREE.PointLight;
  fillDirectional: THREE.DirectionalLight;
  leftFillDirectional: THREE.DirectionalLight;
};

/** Downward bulb light: SpotLight beam + optional PointLight glow at the same position. */
export type BulbLights = {
  spot: THREE.SpotLight;
  fill: THREE.PointLight;
};

export const BULB_LIGHT_DEFAULTS = {
  position: { x: 0, y: 8, z: 0 },
  target: { x: 0, y: 0, z: 0 },
  spot: {
    color: 0xffc870,
    intensity: 80,
    distance: 30,
    angle: Math.PI / 4,
    penumbra: 0.4,
    decay: 2,
  },
  fill: {
    color: 0xffaa55,
    intensity: 8,
    distance: 12,
    decay: 2,
  },
} as const;

// Fix: factory function instead of mutable shared constant
function boardLightTarget(): THREE.Vector3 {
  return new THREE.Vector3(0, 0.5, 0);
}

// Fix: named constant instead of magic number
const LAMP_BULB_HEIGHT = 4.2;

function createWarmLampSpot(
  scene: THREE.Scene,
  position: THREE.Vector3,
  target: THREE.Vector3 = boardLightTarget()
): THREE.SpotLight {
  const spot = new THREE.SpotLight(0xffc870, 180, 45, 0.52, 0.35, 1.6);
  spot.position.copy(position);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.camera.near = 0.5;
  spot.shadow.camera.far = 50;
  spot.shadow.bias = -0.0003;
  spot.shadow.normalBias = 0.025;
  scene.add(spot);
  scene.add(spot.target);
  spot.target.position.copy(target);
  return spot;
}

export function configureRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

export function setupBulbLight(scene: THREE.Scene): BulbLights {
  // PointLights are omnidirectional in Three.js and cannot be rotated to point down.
  // SpotLight provides the downward bulb beam; a small PointLight adds soft glow at the bulb.
  const { position, target, spot: spotDefaults, fill: fillDefaults } =
    BULB_LIGHT_DEFAULTS;

  const spot = new THREE.SpotLight(
    spotDefaults.color,
    spotDefaults.intensity,
    spotDefaults.distance,
    spotDefaults.angle,
    spotDefaults.penumbra,
    spotDefaults.decay
  );
  spot.position.set(position.x, position.y, position.z);
  spot.castShadow = false;
  scene.add(spot);
  scene.add(spot.target);
  spot.target.position.set(target.x, target.y, target.z);

  const fill = new THREE.PointLight(
    fillDefaults.color,
    fillDefaults.intensity,
    fillDefaults.distance,
    fillDefaults.decay
  );
  fill.position.copy(spot.position);
  scene.add(fill);

  return { spot, fill };
}

export function setupBlenderStyleLighting(scene: THREE.Scene): SceneLights {
  const ambient = new THREE.AmbientLight(0xffe8cc, 0.5);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0xfff0dd, 0x3d2818, 0.4);
  scene.add(hemisphere);

  const fillDirectional = new THREE.DirectionalLight(0xffeedd, 0.1);
  fillDirectional.position.set(4, 10, 6);
  fillDirectional.target.position.set(0, 0.5, 0);
  scene.add(fillDirectional);
  scene.add(fillDirectional.target);

  const leftFillDirectional = new THREE.DirectionalLight(0xfff2cc, 0.1);
  leftFillDirectional.position.set(6, 4, 0);
  leftFillDirectional.target.position.set(0, 1, 1);
  scene.add(leftFillDirectional);
  scene.add(leftFillDirectional.target);

  const lampSpot = createWarmLampSpot(scene, new THREE.Vector3(-2, 6.5, 3));
  const leftLampSpot = createWarmLampSpot(scene, new THREE.Vector3(12, 5.5, 0.5));

  const lampFill = new THREE.PointLight(0xffaa55, 12, 20, 2);
  lampFill.position.copy(lampSpot.position);
  scene.add(lampFill);

  return {
    lampSpot,
    leftLampSpot,
    lampFill,
    fillDirectional,
    leftFillDirectional,
  };
}

export type PuzzlePlacementLike = {
  position: { x: number; z: number };
};

export function addPuzzleAreaPointLight(
  boardVisual: THREE.Object3D,
  placements: PuzzlePlacementLike[],
  options: {
    height?: number;
    intensity?: number;
    color?: number;
    distance?: number;
  } = {}
): THREE.PointLight {
  // Fix: guard against empty placements array
  if (placements.length === 0) {
    const light = new THREE.PointLight(
      options.color ?? 0xffe8cc,
      options.intensity ?? 18,
      options.distance ?? 16,
      2
    );
    light.position.set(0, options.height ?? 3.5, 0);
    boardVisual.add(light);
    return light;
  }

  const centroid = new THREE.Vector3();
  for (const placement of placements) {
    centroid.x += placement.position.x;
    centroid.z += placement.position.z;
  }
  centroid.divideScalar(placements.length);
  centroid.y = options.height ?? 3.5;

  const light = new THREE.PointLight(
    options.color ?? 0xffe8cc,
    options.intensity ?? 18,
    options.distance ?? 16,
    2
  );
  light.position.copy(centroid);
  boardVisual.add(light);
  return light;
}

export function aimLampAt(
  lights: SceneLights,
  lampPosition: THREE.Vector3,
  target: THREE.Vector3
): void {
  lights.lampSpot.position.set(
    lampPosition.x - 0.6,
    lampPosition.y + LAMP_BULB_HEIGHT,
    lampPosition.z + 0.5
  );
  lights.lampFill.position.copy(lights.lampSpot.position);
  lights.lampSpot.target.position.copy(target);
  lights.lampSpot.target.updateMatrixWorld();
}

export function enableShadowsOnObject(
  root: THREE.Object3D,
  options?: { cast?: boolean; receive?: boolean }
): void {
  // Fix: avoid recreating default object on every call
  const cast = options?.cast ?? true;
  const receive = options?.receive ?? true;

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = cast;
    child.receiveShadow = receive;
  });
}