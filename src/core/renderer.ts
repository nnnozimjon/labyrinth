import * as THREE from "three";
import { configureRenderer } from "../utils/scene-lighting";

export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  configureRenderer(renderer);
  document.body.appendChild(renderer.domElement);
  return renderer;
}
