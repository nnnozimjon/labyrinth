import type * as THREE from "three";

/** Keeps the canvas and camera matched to the window, starting with its current size. */
export function setupResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
) {
  const resize = () => {
    const { innerWidth: width, innerHeight: height } = window;
    // A hidden or collapsed window reports 0 × 0; keep the last real size until it is back.
    if (width === 0 || height === 0) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };

  window.addEventListener("resize", resize);
  // The window may have changed size since the renderer was created (e.g. a phone rotated
  // during loading), and no resize event will come for that.
  resize();
}
