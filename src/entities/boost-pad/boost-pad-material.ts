import * as THREE from "three";

const padVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const padFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uBoostFlash;
  uniform sampler2D uMap;

  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    float alpha = max(tex.a, smoothstep(0.02, 0.1, luma));

    if (alpha < 0.01) discard;

    float breathe = 0.94 + 0.06 * sin(uTime * 2.2);
    float flowPos = 0.5 + 0.42 * sin(uTime * 1.6);
    float flow = smoothstep(0.18, 0.0, abs(vUv.y - flowPos)) * 0.18;

    float brighten = breathe + flow + uBoostFlash * 0.45;
    vec3 color = tex.rgb * brighten;

    gl_FragColor = vec4(color, alpha * (0.96 + uBoostFlash * 0.15));
  }
`;

export function createBoostPadMaterial(texture: THREE.Texture): THREE.ShaderMaterial {
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBoostFlash: { value: 0 },
      uMap: { value: texture },
    },
    vertexShader: padVertexShader,
    fragmentShader: padFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    toneMapped: false,
  });

  material.polygonOffset = true;
  material.polygonOffsetFactor = -2;
  material.polygonOffsetUnits = -2;

  return material;
}

export function updateBoostPadMaterial(
  material: THREE.ShaderMaterial,
  time: number,
  boostFlash: number
) {
  material.uniforms.uTime.value = time;
  material.uniforms.uBoostFlash.value = boostFlash;
}
