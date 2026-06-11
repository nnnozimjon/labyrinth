import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const EPSILON = 0.001;
const DECIMALS = 3;

function round(value: number): number {
  const factor = 10 ** DECIMALS;
  return Math.round(value * factor) / factor;
}

function roundVec3(v: THREE.Vector3 | THREE.Euler): [number, number, number] {
  return [round(v.x), round(v.y), round(v.z)];
}

function hasChanged(
  current: THREE.Vector3 | THREE.Euler,
  previous: THREE.Vector3 | THREE.Euler
): boolean {
  return (
    Math.abs(current.x - previous.x) > EPSILON ||
    Math.abs(current.y - previous.y) > EPSILON ||
    Math.abs(current.z - previous.z) > EPSILON
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function formatCameraDebugCode(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
): string {
  const pos = roundVec3(camera.position);
  const rot = roundVec3(camera.rotation);
  const target = roundVec3(controls.target);

  return `camera.position.set(${pos[0]}, ${pos[1]}, ${pos[2]});
camera.rotation.set(${rot[0]}, ${rot[1]}, ${rot[2]});
controls.target.set(${target[0]}, ${target[1]}, ${target[2]});
controls.update();`;
}

export function logCameraTransform(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
): void {
  const pos = roundVec3(camera.position);
  const rot = roundVec3(camera.rotation);
  const target = roundVec3(controls.target);

  console.log("=== Camera Transform ===");
  console.log(`Camera Position (x, y, z): ${pos[0]}, ${pos[1]}, ${pos[2]}`);
  console.log(
    `Camera Rotation (Radians) (x, y, z): ${rot[0]}, ${rot[1]}, ${rot[2]}`
  );
  console.log(`OrbitControls target (x, y, z): ${target[0]}, ${target[1]}, ${target[2]}`);
  console.log("Copy-paste code:");
  console.log(formatCameraDebugCode(camera, controls));
}

async function copyCameraDebugCode(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
): Promise<void> {
  const code = formatCameraDebugCode(camera, controls);

  try {
    await navigator.clipboard.writeText(code);
    console.log("Camera setup code copied to clipboard.");
  } catch {
    console.log("Clipboard unavailable. Copy-paste code:");
    console.log(code);
  }
}

export function createCameraDebugMonitor(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
) {
  let enabled = false;
  const lastPosition = new THREE.Vector3();
  const lastRotation = new THREE.Euler();
  const lastTarget = new THREE.Vector3();
  let hasLastValues = false;

  const onKeyDown = (event: KeyboardEvent) => {
    if (!enabled || isEditableTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "c") {
      logCameraTransform(camera, controls);
    } else if (key === "v") {
      void copyCameraDebugCode(camera, controls);
    }
  };

  return {
    update() {
      if (!enabled) {
        return;
      }

      if (
        !hasLastValues ||
        hasChanged(camera.position, lastPosition) ||
        hasChanged(camera.rotation, lastRotation) ||
        hasChanged(controls.target, lastTarget)
      ) {
        logCameraTransform(camera, controls);
        lastPosition.copy(camera.position);
        lastRotation.copy(camera.rotation);
        lastTarget.copy(controls.target);
        hasLastValues = true;
      }
    },

    enable() {
      if (enabled) {
        return;
      }

      enabled = true;
      hasLastValues = false;
      window.addEventListener("keydown", onKeyDown);
      logCameraTransform(camera, controls);
    },

    disable() {
      if (!enabled) {
        return;
      }

      enabled = false;
      hasLastValues = false;
      window.removeEventListener("keydown", onKeyDown);
    },

    log() {
      logCameraTransform(camera, controls);
    },
  };
}
