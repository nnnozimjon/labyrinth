import * as THREE from "three";

type UpdatableHelper = THREE.Object3D & {
  update: () => void;
  dispose: () => void;
};

export class LightDebugRenderer {
  readonly debugGroup = new THREE.Group();
  private readonly helpers: UpdatableHelper[] = [];

  constructor(scene: THREE.Scene) {
    this.debugGroup.name = "lightDebugGroup";
    scene.add(this.debugGroup);
    this.buildHelpers(scene);
  }

  private buildHelpers(scene: THREE.Scene): void {
    scene.traverse((object) => {
      if (object instanceof THREE.DirectionalLight) {
        this.ensureLightTargetInScene(scene, object);
        this.addHelper(
          new THREE.DirectionalLightHelper(object, 1.2, object.color.getHex())
        );
        return;
      }

      if (object instanceof THREE.SpotLight) {
        this.ensureLightTargetInScene(scene, object);
        this.addHelper(new THREE.SpotLightHelper(object));
        return;
      }

      if (object instanceof THREE.PointLight) {
        this.addHelper(
          new THREE.PointLightHelper(object, 0.4, object.color.getHex())
        );
        return;
      }

      if (object instanceof THREE.HemisphereLight) {
        this.addHelper(new THREE.HemisphereLightHelper(object, 1.2));
      }
    });
  }

  private ensureLightTargetInScene(
    scene: THREE.Scene,
    light: THREE.DirectionalLight | THREE.SpotLight
  ): void {
    if (light.target.parent === null) {
      scene.add(light.target);
    }
  }

  private addHelper(helper: UpdatableHelper): void {
    this.debugGroup.add(helper);
    this.helpers.push(helper);
  }

  update(): void {
    for (const helper of this.helpers) {
      helper.update();
    }
  }

  dispose(): void {
    for (const helper of this.helpers) {
      helper.dispose();
      this.debugGroup.remove(helper);
    }
    this.helpers.length = 0;
    this.debugGroup.removeFromParent();
  }
}
