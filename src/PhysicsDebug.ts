import * as THREE from "three";
import RAPIER, { ShapeType } from "@dimforge/rapier3d-compat";

type RapierCollider = RAPIER.Collider;

export type PhysicsDebugOptions = {
  color?: number;
  wireOpacity?: number;
  lineColor?: number;
};

function createWireMaterial(color: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity,
    depthTest: true,
  });
}

function createTrimeshWireframe(
  vertices: Float32Array,
  indices: Uint32Array,
  color: number
): THREE.LineSegments {
  const positions: number[] = [];

  const pushVertex = (index: number) => {
    const i3 = index * 3;
    positions.push(vertices[i3], vertices[i3 + 1], vertices[i3 + 2]);
  };

  const pushEdge = (a: number, b: number) => {
    pushVertex(a);
    pushVertex(b);
  };

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    pushEdge(a, b);
    pushEdge(b, c);
    pushEdge(c, a);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color })
  );
  lines.frustumCulled = false;
  return lines;
}

function createCapsuleDebug(
  radius: number,
  halfHeight: number,
  material: THREE.MeshBasicMaterial
): THREE.Group {
  const group = new THREE.Group();

  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, halfHeight * 2, 12),
    material
  );

  const topCap = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 12),
    material
  );
  topCap.position.y = halfHeight;

  const bottomCap = topCap.clone();
  bottomCap.position.y = -halfHeight;

  group.add(cylinder, topCap, bottomCap);
  return group;
}

function createDebugMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.MeshBasicMaterial
): THREE.Mesh {
  return new THREE.Mesh(geometry, material);
}

function createDebugObject(
  collider: RapierCollider,
  wireMaterial: THREE.MeshBasicMaterial,
  lineColor: number
): THREE.Object3D {
  const shapeType = collider.shapeType();

  switch (shapeType) {
    case ShapeType.Ball: {
      const radius = collider.radius();
      return createDebugMesh(
        new THREE.SphereGeometry(radius, 16, 16),
        wireMaterial
      );
    }

    case ShapeType.Cuboid:
    case ShapeType.RoundCuboid: {
      const halfExtents = collider.halfExtents();
      return createDebugMesh(
        new THREE.BoxGeometry(
          halfExtents.x * 2,
          halfExtents.y * 2,
          halfExtents.z * 2
        ),
        wireMaterial
      );
    }

    case ShapeType.Capsule: {
      const group = createCapsuleDebug(
        collider.radius(),
        collider.halfHeight(),
        wireMaterial
      );
      return group;
    }

    case ShapeType.Cylinder:
    case ShapeType.RoundCylinder: {
      return createDebugMesh(
        new THREE.CylinderGeometry(
          collider.radius(),
          collider.radius(),
          collider.halfHeight() * 2,
          16
        ),
        wireMaterial
      );
    }

    case ShapeType.Cone:
    case ShapeType.RoundCone: {
      return createDebugMesh(
        new THREE.ConeGeometry(
          collider.radius(),
          collider.halfHeight() * 2,
          16
        ),
        wireMaterial
      );
    }

    case ShapeType.TriMesh:
    case ShapeType.ConvexPolyhedron:
    case ShapeType.RoundConvexPolyhedron: {
      const vertices = collider.vertices();
      const indices = collider.indices();
      if (indices && indices.length >= 3 && vertices.length >= 3) {
        return createTrimeshWireframe(vertices, indices, lineColor);
      }
      break;
    }

    case ShapeType.HeightField: {
      const nrows = collider.heightfieldNRows();
      const ncols = collider.heightfieldNCols();
      const heights = collider.heightfieldHeights();
      const scale = collider.heightfieldScale();

      const positions: number[] = [];
      const pushEdge = (x0: number, z0: number, x1: number, z1: number) => {
        const y0 = heights[z0 * nrows + x0] * scale.y;
        const y1 = heights[z1 * nrows + x1] * scale.y;
        positions.push(
          x0 * scale.x,
          y0,
          z0 * scale.z,
          x1 * scale.x,
          y1,
          z1 * scale.z
        );
      };

      for (let row = 0; row < nrows - 1; row++) {
        for (let col = 0; col < ncols - 1; col++) {
          pushEdge(row, col, row + 1, col);
          pushEdge(row + 1, col, row, col + 1);
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );

      const lines = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({ color: lineColor })
      );
      lines.frustumCulled = false;
      return lines;
    }

    default:
      break;
  }

  // Generic fallback for future or unsupported collider types.
  try {
    const vertices = collider.vertices();
    const indices = collider.indices();
    if (indices && indices.length >= 3 && vertices.length >= 3) {
      return createTrimeshWireframe(vertices, indices, lineColor);
    }
  } catch {
    // Fall through to marker sphere.
  }

  return createDebugMesh(new THREE.SphereGeometry(0.05, 8, 8), wireMaterial);
}

export class PhysicsDebugRenderer {
  private readonly scene: THREE.Scene;
  private readonly world: RAPIER.World;
  private readonly wireMaterial: THREE.MeshBasicMaterial;
  private readonly lineColor: number;
  private readonly objectsByHandle = new Map<number, THREE.Object3D>();

  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    options: PhysicsDebugOptions = {}
  ) {
    this.world = world;
    this.scene = scene;
    this.wireMaterial = createWireMaterial(
      options.color ?? 0x00ffff,
      options.wireOpacity ?? 0.7
    );
    this.lineColor = options.lineColor ?? 0xff00ff;
  }

  update() {
    const activeHandles = new Set<number>();

    this.world.colliders.forEach((collider) => {
      if (!collider.isValid()) return;

      const handle = collider.handle;
      activeHandles.add(handle);

      let debugObject = this.objectsByHandle.get(handle);
      if (!debugObject) {
        debugObject = createDebugObject(
          collider,
          this.wireMaterial,
          this.lineColor
        );
        this.objectsByHandle.set(handle, debugObject);
        this.scene.add(debugObject);
      }

      const translation = collider.translation();
      const rotation = collider.rotation();
      debugObject.position.set(translation.x, translation.y, translation.z);
      debugObject.quaternion.set(
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w
      );
    });

    for (const [handle, debugObject] of this.objectsByHandle) {
      if (activeHandles.has(handle)) continue;
      this.scene.remove(debugObject);
      this.disposeObject(debugObject);
      this.objectsByHandle.delete(handle);
    }
  }

  private disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else if (child.material !== this.wireMaterial) {
          child.material.dispose();
        }
      }
    });
  }
}
