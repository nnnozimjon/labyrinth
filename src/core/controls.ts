import type * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ENABLE_ORBIT_CONTROLS } from "../utils/constants";

export function createControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.enabled = ENABLE_ORBIT_CONTROLS;
  controls.target.set(7.5, 0.6, -1.5);
  return controls;
}
