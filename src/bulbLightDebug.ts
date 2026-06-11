import * as THREE from "three";
import GUI from "lil-gui";
import type { BulbLights } from "./sceneLighting";

const DECIMALS = 3;

function round(value: number): number {
  const factor = 10 ** DECIMALS;
  return Math.round(value * factor) / factor;
}

type DebugParams = {
  positionX: number;
  positionY: number;
  positionZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  spotIntensity: number;
  spotColor: string;
  spotDistance: number;
  spotAngleDeg: number;
  spotPenumbra: number;
  fillIntensity: number;
  fillColor: string;
  fillDistance: number;
};

function colorToHex(color: THREE.ColorRepresentation): string {
  return `#${new THREE.Color(color).getHexString()}`;
}

export function formatBulbLightDebugCode(lights: BulbLights): string {
  const { spot, fill } = lights;
  const pos = spot.position;
  const target = spot.target.position;
  const spotAngleDeg = THREE.MathUtils.radToDeg(spot.angle);

  return `// Bulb light setup
    bulbLights.spot.position.set(${round(pos.x)}, ${round(pos.y)}, ${round(pos.z)});
    bulbLights.spot.target.position.set(${round(target.x)}, ${round(target.y)}, ${round(target.z)});
    bulbLights.spot.intensity = ${round(spot.intensity)};
    bulbLights.spot.color.setHex(0x${spot.color.getHexString()});
    bulbLights.spot.distance = ${round(spot.distance)};
    bulbLights.spot.angle = THREE.MathUtils.degToRad(${round(spotAngleDeg)});
    bulbLights.spot.penumbra = ${round(spot.penumbra)};
    bulbLights.fill.position.copy(bulbLights.spot.position);
    bulbLights.fill.intensity = ${round(fill.intensity)};
    bulbLights.fill.color.setHex(0x${fill.color.getHexString()});
    bulbLights.fill.distance = ${round(fill.distance)};`;
}

export function logBulbLightTransform(lights: BulbLights): void {
  const { spot, fill } = lights;
  const pos = spot.position;
  const target = spot.target.position;

  console.log("=== Bulb Light Transform ===");
  console.log(`Spot Position (x, y, z): ${round(pos.x)}, ${round(pos.y)}, ${round(pos.z)}`);
  console.log(
    `Spot Target (x, y, z): ${round(target.x)}, ${round(target.y)}, ${round(target.z)}`
  );
  console.log(`Spot Intensity: ${round(spot.intensity)}`);
  console.log(`Spot Color: #${spot.color.getHexString()}`);
  console.log(`Spot Distance: ${round(spot.distance)}`);
  console.log(`Spot Angle (deg): ${round(THREE.MathUtils.radToDeg(spot.angle))}`);
  console.log(`Fill Intensity: ${round(fill.intensity)}`);
  console.log("Copy-paste code:");
  console.log(formatBulbLightDebugCode(lights));
}

export type BulbLightDebugOptions = {
  lights: BulbLights;
  enabled: boolean;
};

export function createBulbLightDebugUI(options: BulbLightDebugOptions) {
  if (!options.enabled) {
    return null;
  }

  const { spot, fill } = options.lights;

  const params: DebugParams = {
    positionX: spot.position.x,
    positionY: spot.position.y,
    positionZ: spot.position.z,
    targetX: spot.target.position.x,
    targetY: spot.target.position.y,
    targetZ: spot.target.position.z,
    spotIntensity: spot.intensity,
    spotColor: colorToHex(spot.color),
    spotDistance: spot.distance,
    spotAngleDeg: THREE.MathUtils.radToDeg(spot.angle),
    spotPenumbra: spot.penumbra,
    fillIntensity: fill.intensity,
    fillColor: colorToHex(fill.color),
    fillDistance: fill.distance,
  };

  const applyParams = () => {
    spot.position.set(params.positionX, params.positionY, params.positionZ);
    spot.target.position.set(params.targetX, params.targetY, params.targetZ);
    spot.target.updateMatrixWorld();
    spot.intensity = params.spotIntensity;
    spot.color.set(params.spotColor);
    spot.distance = params.spotDistance;
    spot.angle = THREE.MathUtils.degToRad(params.spotAngleDeg);
    spot.penumbra = params.spotPenumbra;

    fill.position.copy(spot.position);
    fill.intensity = params.fillIntensity;
    fill.color.set(params.fillColor);
    fill.distance = params.fillDistance;
  };

  const gui = new GUI({ title: "Bulb Light" });
  gui.domElement.style.zIndex = "1000";

  const positionFolder = gui.addFolder("Position");
  positionFolder.add(params, "positionX", -30, 30, 0.1).name("x").onChange(applyParams);
  positionFolder.add(params, "positionY", 0, 30, 0.1).name("y").onChange(applyParams);
  positionFolder.add(params, "positionZ", -30, 30, 0.1).name("z").onChange(applyParams);
  positionFolder.open();

  const targetFolder = gui.addFolder("Aim (target)");
  targetFolder
    .add(params, "targetX", -30, 30, 0.1)
    .name("x")
    .onChange(applyParams);
  targetFolder
    .add(params, "targetY", -5, 10, 0.1)
    .name("y")
    .onChange(applyParams);
  targetFolder
    .add(params, "targetZ", -30, 30, 0.1)
    .name("z")
    .onChange(applyParams);
  targetFolder.open();

  const spotFolder = gui.addFolder("Spot beam");
  spotFolder
    .add(params, "spotIntensity", 0, 300, 1)
    .name("intensity")
    .onChange(applyParams);
  spotFolder.addColor(params, "spotColor").name("color").onChange(applyParams);
  spotFolder
    .add(params, "spotDistance", 0, 80, 0.5)
    .name("distance")
    .onChange(applyParams);
  spotFolder
    .add(params, "spotAngleDeg", 1, 90, 0.5)
    .name("angle (deg)")
    .onChange(applyParams);
  spotFolder
    .add(params, "spotPenumbra", 0, 1, 0.01)
    .name("penumbra")
    .onChange(applyParams);
  spotFolder.open();

  const fillFolder = gui.addFolder("Bulb glow (point)");
  fillFolder
    .add(params, "fillIntensity", 0, 50, 0.5)
    .name("intensity")
    .onChange(applyParams);
  fillFolder.addColor(params, "fillColor").name("color").onChange(applyParams);
  fillFolder
    .add(params, "fillDistance", 0, 40, 0.5)
    .name("distance")
    .onChange(applyParams);
  fillFolder.open();

  const actions = {
    logValues() {
      logBulbLightTransform(options.lights);
    },
    async copySnippet() {
      const code = formatBulbLightDebugCode(options.lights);

      try {
        await navigator.clipboard.writeText(code);
        console.log("[Bulb light] Setup code copied to clipboard.");
      } catch {
        console.log("[Bulb light] Clipboard unavailable. Copy-paste code:");
        console.log(code);
      }
    },
    aimStraightDown() {
      params.targetX = params.positionX;
      params.targetY = 0;
      params.targetZ = params.positionZ;
      applyParams();
    },
  };

  gui.add(actions, "aimStraightDown").name("Aim straight down");
  gui.add(actions, "logValues").name("Log values");
  gui.add(actions, "copySnippet").name("Copy snippet");

  console.log("[Bulb light] Debug panel ready.");

  return {
    gui,
    params,
    applyParams,
    destroy() {
      gui.destroy();
    },
  };
}
