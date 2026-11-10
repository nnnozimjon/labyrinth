import * as THREE from "three";

/** Glow used for the gate opening (green) and the loss holes (red). */
export function createGlowMaterial(
  color: THREE.ColorRepresentation,
  emissive: THREE.ColorRepresentation
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Gentle breathing pulse shared by all hole markers. */
export function pulseGlowMaterials(
  materials: readonly THREE.MeshStandardMaterial[],
  time: number
) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 5);
  for (const material of materials) {
    material.emissiveIntensity = 1 + pulse * 2;
    material.opacity = 0.6 + pulse * 0.3;
  }
}

/** Gives every mesh under `root` its own glow material. */
export function applyGlowMaterials(
  root: THREE.Object3D,
  color: THREE.ColorRepresentation,
  emissive: THREE.ColorRepresentation
): { meshes: THREE.Mesh[]; materials: THREE.MeshStandardMaterial[] } {
  const meshes: THREE.Mesh[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const material = createGlowMaterial(color, emissive);
    child.material = material;
    meshes.push(child);
    materials.push(material);
  });
  return { meshes, materials };
}
