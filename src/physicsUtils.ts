import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";

export type BoardColliderMode = "trimesh" | "auto";

export type ObjectBounds = {
  size: THREE.Vector3;
  center: THREE.Vector3;
};

const NEUTRAL_MATERIAL_COLOR = new THREE.Color(0xcccccc);
const DARK_COLOR_LUMINANCE = 0.15;

function fixGltfMaterial(material: THREE.Material) {
  material.vertexColors = false;

  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhysicalMaterial
  ) {
    material.aoMap = null;
    material.lightMap = null;
    material.aoMapIntensity = 0;
    material.lightMapIntensity = 0;
    material.roughness = 0.7;
    material.metalness = 0;

    const hsl = { h: 0, s: 0, l: 0 };
    material.color.getHSL(hsl);
    if (hsl.l < DARK_COLOR_LUMINANCE) {
      material.color.copy(NEUTRAL_MATERIAL_COLOR);
    }
  }

  material.needsUpdate = true;
}

/** Strip baked AO/lightmaps and brighten materials on loaded GLB meshes. */
export function prepareGltfMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    child.castShadow = false;
    child.receiveShadow = false;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach(fixGltfMaterial);

    if (child.geometry.hasAttribute("color")) {
      child.geometry.deleteAttribute("color");
    }
  });
}

export function logSceneHierarchy(root: THREE.Object3D, label = "scene") {
  const lines: string[] = [];

  root.traverse((child) => {
    const name = child.name || child.type;
    lines.push(`${"  ".repeat(getDepth(child, root))}${name} [${child.type}]`);
  });

  console.group(`Scene hierarchy: ${label}`);
  lines.forEach((line) => console.log(line));
  console.groupEnd();
}

function getDepth(child: THREE.Object3D, root: THREE.Object3D): number {
  let depth = 0;
  let current: THREE.Object3D | null = child;
  while (current && current !== root) {
    depth++;
    current = current.parent;
  }
  return Math.max(depth - 1, 0);
}

export function getBounds(object: THREE.Object3D): ObjectBounds {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  return {
    size: box.getSize(new THREE.Vector3()),
    center: box.getCenter(new THREE.Vector3()),
  };
}

export function centerModelAtPivot(model: THREE.Object3D): ObjectBounds {
  const bounds = getBounds(model);
  model.position.sub(bounds.center);
  model.updateMatrixWorld(true);
  return bounds;
}

export function isMostlyFlat(size: THREE.Vector3, threshold: number): boolean {
  const footprint = Math.max(size.x, size.z);
  if (footprint <= 0) return true;
  return size.y / footprint < threshold;
}

export function isSimpleBoxMesh(mesh: THREE.Mesh, flatnessThreshold = 0.15): boolean {
  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  if (!position) return false;

  mesh.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(mesh);
  const size = bounds.getSize(new THREE.Vector3());

  if (!isMostlyFlat(size, flatnessThreshold)) return false;

  const vertexCount = position.count;
  return vertexCount <= 36;
}

export function extractMeshTrimesh(mesh: THREE.Mesh): {
  vertices: Float32Array;
  indices: Uint32Array;
} {
  const vertices: number[] = [];
  const indices: number[] = [];

  mesh.updateMatrixWorld(true);

  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  const worldMatrix = mesh.matrixWorld;

  for (let i = 0; i < position.count; i++) {
    const vertex = new THREE.Vector3()
      .fromBufferAttribute(position, i)
      .applyMatrix4(worldMatrix);
    vertices.push(vertex.x, vertex.y, vertex.z);
  }

  if (geometry.index) {
    for (let i = 0; i < geometry.index.count; i++) {
      indices.push(geometry.index.getX(i));
    }
  } else {
    for (let i = 0; i < position.count; i++) {
      indices.push(i);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: Uint32Array.from(indices),
  };
}

export function extractLocalTrimesh(root: THREE.Object3D): {
  vertices: Float32Array;
  indices: Uint32Array;
} {
  const vertices: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  root.updateMatrixWorld(true);

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const geometry = child.geometry;
    const position = geometry.attributes.position;
    const worldMatrix = child.matrixWorld;

    for (let i = 0; i < position.count; i++) {
      const vertex = new THREE.Vector3()
        .fromBufferAttribute(position, i)
        .applyMatrix4(worldMatrix);
      vertices.push(vertex.x, vertex.y, vertex.z);
    }

    if (geometry.index) {
      for (let i = 0; i < geometry.index.count; i++) {
        indices.push(geometry.index.getX(i) + vertexOffset);
      }
    } else {
      for (let i = 0; i < position.count; i++) {
        indices.push(vertexOffset + i);
      }
    }

    vertexOffset += position.count;
  });

  return {
    vertices: new Float32Array(vertices),
    indices: Uint32Array.from(indices),
  };
}

type RapierModule = typeof RAPIER;

export function isDescendantOfNamedObject(
  object: THREE.Object3D,
  root: THREE.Object3D,
  names: string[]
): boolean {
  if (names.length === 0) return false;

  let current: THREE.Object3D | null = object;
  while (current && current !== root) {
    if (
      names.includes(current.name) ||
      (typeof current.userData.name === "string" &&
        names.includes(current.userData.name))
    ) {
      return true;
    }
    current = current.parent;
  }

  return false;
}

export function getObjectTransformWrtParent(
  object: THREE.Object3D,
  parent: THREE.Object3D,
  position = new THREE.Vector3(),
  quaternion = new THREE.Quaternion()
): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  object.updateMatrixWorld(true);
  parent.updateMatrixWorld(true);

  const localMatrix = new THREE.Matrix4()
    .copy(parent.matrixWorld)
    .invert()
    .multiply(object.matrixWorld);

  const scale = new THREE.Vector3();
  localMatrix.decompose(position, quaternion, scale);
  return { position, quaternion };
}

export function syncColliderTransformWrtParent(
  collider: RAPIER.Collider,
  object: THREE.Object3D,
  parent: THREE.Object3D
) {
  const { position, quaternion } = getObjectTransformWrtParent(object, parent);
  collider.setTranslationWrtParent({
    x: position.x,
    y: position.y,
    z: position.z,
  });
  collider.setRotationWrtParent({
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w,
  });
}

export function extractMeshGeometryTrimesh(mesh: THREE.Mesh): {
  vertices: Float32Array;
  indices: Uint32Array;
} {
  const vertices: number[] = [];
  const indices: number[] = [];

  const geometry = mesh.geometry;
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    vertices.push(position.getX(i), position.getY(i), position.getZ(i));
  }

  if (geometry.index) {
    for (let i = 0; i < geometry.index.count; i++) {
      indices.push(geometry.index.getX(i));
    }
  } else {
    for (let i = 0; i < position.count; i++) {
      indices.push(i);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: Uint32Array.from(indices),
  };
}

const MIN_COLLIDER_HALF_EXTENT = 0.01;

/** Mesh-local trimesh with ancestor scale baked in (Rapier colliders cannot scale). */
export function extractScaledMeshGeometryTrimesh(mesh: THREE.Mesh): {
  vertices: Float32Array;
  indices: Uint32Array;
} {
  mesh.updateWorldMatrix(true, false);
  const worldScale = new THREE.Vector3();
  mesh.getWorldScale(worldScale);

  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  const vertices: number[] = [];
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i).multiply(worldScale);
    vertices.push(vertex.x, vertex.y, vertex.z);
  }

  const indices: number[] = [];
  if (geometry.index) {
    for (let i = 0; i < geometry.index.count; i++) {
      indices.push(geometry.index.getX(i));
    }
  } else {
    for (let i = 0; i < position.count; i++) {
      indices.push(i);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: Uint32Array.from(indices),
  };
}

export function addBoardBodyColliders(
  RAPIER: RapierModule,
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  root: THREE.Object3D,
  options: {
    colliderMode?: BoardColliderMode;
    flatnessThreshold?: number;
    excludeObjectNames?: string[];
  } = {}
) {
  const colliderMode = options.colliderMode ?? "auto";
  const flatnessThreshold = options.flatnessThreshold ?? 0.15;
  const excludeObjectNames = options.excludeObjectNames ?? [];

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (isDescendantOfNamedObject(child, root, excludeObjectNames)) return;

    const useBoxCollider =
      colliderMode === "auto" && isSimpleBoxMesh(child, flatnessThreshold);

    if (useBoxCollider) {
      const bounds = getBounds(child);
      const center = bounds.center;

      world.createCollider(
        RAPIER.ColliderDesc.cuboid(
          bounds.size.x / 2,
          bounds.size.y / 2,
          bounds.size.z / 2
        ).setTranslation(center.x, center.y, center.z),
        body
      );
      return;
    }

    const { vertices, indices } = extractMeshTrimesh(child);
    world.createCollider(
      RAPIER.ColliderDesc.trimesh(vertices, indices),
      body
    );
  });
}

export type RotatingBoardCollider = {
  collider: RAPIER.Collider;
  mesh: THREE.Mesh;
  localOffset?: THREE.Vector3;
};

export function syncRotatingBoardCollider(
  entry: RotatingBoardCollider,
  boardVisual: THREE.Object3D
) {
  entry.mesh.updateMatrixWorld(true);
  boardVisual.updateMatrixWorld(true);

  if (entry.localOffset) {
    const objectMatrix = entry.mesh.matrixWorld.clone().multiply(
      new THREE.Matrix4().makeTranslation(entry.localOffset)
    );
    const localMatrix = new THREE.Matrix4()
      .copy(boardVisual.matrixWorld)
      .invert()
      .multiply(objectMatrix);

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    localMatrix.decompose(position, quaternion, scale);

    entry.collider.setTranslationWrtParent({
      x: position.x,
      y: position.y,
      z: position.z,
    });
    entry.collider.setRotationWrtParent({
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w,
    });
    return;
  }

  syncColliderTransformWrtParent(entry.collider, entry.mesh, boardVisual);
}

export function addRotatingPartBoardColliders(
  RAPIER: RapierModule,
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  boardVisual: THREE.Object3D,
  partRoot: THREE.Object3D,
  options: {
    colliderMode?: BoardColliderMode;
    flatnessThreshold?: number;
  } = {}
): RotatingBoardCollider[] {
  const colliderMode = options.colliderMode ?? "auto";
  const flatnessThreshold = options.flatnessThreshold ?? 0.15;
  const colliders: RotatingBoardCollider[] = [];

  partRoot.updateMatrixWorld(true);

  partRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const useBoxCollider =
      colliderMode === "auto" && isSimpleBoxMesh(child, flatnessThreshold);

    if (useBoxCollider) {
      child.updateWorldMatrix(true, false);
      const bounds = new THREE.Box3().setFromObject(child);
      const worldSize = bounds.getSize(new THREE.Vector3());
      const worldCenter = bounds.getCenter(new THREE.Vector3());
      const meshPosition = new THREE.Vector3().setFromMatrixPosition(
        child.matrixWorld
      );
      const meshQuaternion = new THREE.Quaternion().setFromRotationMatrix(
        child.matrixWorld
      );
      const localOffset = worldCenter
        .sub(meshPosition)
        .applyQuaternion(meshQuaternion.invert());

      const collider = world.createCollider(
        RAPIER.ColliderDesc.cuboid(
          Math.max(worldSize.x / 2, MIN_COLLIDER_HALF_EXTENT),
          Math.max(worldSize.y / 2, MIN_COLLIDER_HALF_EXTENT),
          Math.max(worldSize.z / 2, MIN_COLLIDER_HALF_EXTENT)
        ),
        body
      );
      const entry: RotatingBoardCollider = {
        collider,
        mesh: child,
        localOffset,
      };
      syncRotatingBoardCollider(entry, boardVisual);
      colliders.push(entry);
      return;
    }

    const { vertices, indices } = extractScaledMeshGeometryTrimesh(child);
    const collider = world.createCollider(
      RAPIER.ColliderDesc.trimesh(vertices, indices),
      body
    );
    const entry: RotatingBoardCollider = { collider, mesh: child };
    syncRotatingBoardCollider(entry, boardVisual);
    colliders.push(entry);
  });

  if (colliders.length === 0) {
    console.warn(
      `addRotatingPartBoardColliders: no mesh colliders created under "${partRoot.name || partRoot.type}"`
    );
  }

  return colliders;
}

/** Places an object so its bottom rests at the given world Y. */
export function restObjectBottomAtY(object: THREE.Object3D, surfaceY = 0) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  object.position.y += surfaceY - box.min.y;
  object.updateMatrixWorld(true);
}

/** Places an object so its bottom rests on the board surface (world y = 0 at init). */
export function placeOnBoardSurface(object: THREE.Object3D, yOffset = 0) {
  restObjectBottomAtY(object, yOffset);
}
