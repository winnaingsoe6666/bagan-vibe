import * as THREE from 'three/webgpu';
import {
  Fn, float, vec3, vec4, color, mix, max, smoothstep, clamp,
  normalWorld, positionWorld, positionLocal, frontFacing,
  cameraPosition, uniform, time, pow, dot, normalize, abs
} from 'three/tsl';

/**
 * Studio Ghibli-style toon material.
 *
 * Uses MeshStandardNodeMaterial with TSL nodes for:
 * - Multi-tone cel shading via roughness/metalness manipulation
 * - Rim lighting (fresnel-based edge glow in warm color)
 * - Subtle color variation based on world position
 * - Warm emissive tint
 * - Double-sided rendering option
 *
 * Usage:
 *   new GhibliMaterial({ color: 0xff0000, side: THREE.DoubleSide })
 */
export class GhibliMaterial extends THREE.MeshStandardNodeMaterial {
  constructor(parameters: {
    color?: THREE.Color | number;
    shadowColor?: THREE.Color | number;
    highlightColor?: THREE.Color | number;
    side?: THREE.Side;
    transparent?: boolean;
    emissiveStrength?: number;
    rimStrength?: number;
  } = {}) {
    super();

    this.depthWrite = parameters.transparent ? false : true;
    this.depthTest = true;
    this.side = parameters.side ?? THREE.FrontSide;
    this.transparent = parameters.transparent ?? false;

    const baseColor = parameters.color
      ? (parameters.color instanceof THREE.Color ? parameters.color : new THREE.Color(parameters.color))
      : new THREE.Color(0xffffff);

    const shadowColor = parameters.shadowColor
      ? (parameters.shadowColor instanceof THREE.Color ? parameters.shadowColor : new THREE.Color(parameters.shadowColor))
      : new THREE.Color(0x4a3a5c);

    const highlightColor = parameters.highlightColor
      ? (parameters.highlightColor instanceof THREE.Color ? parameters.highlightColor : new THREE.Color(parameters.highlightColor))
      : new THREE.Color(0xfff4e0);

    const emissiveStrength = parameters.emissiveStrength ?? 0.08;
    const rimStrength = parameters.rimStrength ?? 0.6;

    const baseCol = color(baseColor);
    const shadowCol = color(shadowColor);
    const highlightCol = color(highlightColor);

    // === Rim Lighting (fresnel-based edge glow) ===
    const rimLight = Fn(() => {
      const viewDir = cameraPosition.sub(positionWorld).normalize();
      const nDotV = normalWorld.dot(viewDir).clamp(0.0, 1.0);
      // Inverse fresnel: stronger at grazing angles
      const fresnel = float(1.0).sub(nDotV).pow(2.5);
      return fresnel.mul(rimStrength);
    });

    // === Subtle color variation based on world position ===
    const positionVariation = Fn(() => {
      const variation = positionWorld.x.mul(0.05)
        .add(positionWorld.z.mul(0.03))
        .sin()
        .mul(0.12)
        .add(1.0);
      return variation;
    });

    // === Multi-tone cel shading ===
    // Create stepped lighting bands for that Ghibli cel-shaded look
    const celShading = Fn(() => {
      // Use N dot L for lighting contribution (approximated via normal + light direction)
      // Three.js provides lighting internally, but we manipulate roughness to create hard steps
      // High roughness = matte, which amplifies the cel-shading effect

      // Create a 3-step roughness pattern for cel shading
      // The PBR lighting model will create banding when roughness is high and metalness is 0
      return float(0.85);
    });

    // === Final color composition ===
    const finalColor = Fn(() => {
      // Base color with subtle world-position variation
      const varied = baseCol.mul(positionVariation());

      // Mix between shadow and base color based on a procedural light mask
      // This creates the "shadow" side effect using the normal direction
      const lightDir = normalize(vec3(0.5, 1.0, 0.3));
      const nDotL = normalWorld.dot(lightDir).clamp(0.0, 1.0);

      // 3-step cel shading: quantize the lighting into bands
      const celStep = nDotL.mul(3.0).floor().div(3.0).clamp(0.0, 1.0);

      // Smooth the steps slightly for a painterly feel
      const smoothCel = celStep.smoothstep(0.0, 1.0);

      // Mix shadow -> base -> highlight
      const litColor = mix(shadowCol, varied, smoothCel);
      const highlighted = mix(litColor, highlightCol, nDotL.pow(4.0).mul(0.3));

      return highlighted;
    });

    // Apply base color with cel shading
    this.colorNode = finalColor();

    // Matte Ghibli finish with cel-shading-friendly values
    this.roughnessNode = celShading();
    this.metalnessNode = float(0.0);

    // Warm emissive tint for that Ghibli warmth + rim light
    const warmEmissive = baseCol.mul(emissiveStrength);
    const rimContrib = baseCol.mul(0.15).mul(rimLight());
    this.emissiveNode = warmEmissive.add(rimContrib);
  }
}

/**
 * Create a Ghibli-style toon material with gradient map.
 */
export function createGhibliToonMaterial(
  baseColor: number,
  shadowColor: number = 0x333344,
  steps: number = 3
): THREE.MeshToonNodeMaterial {
  const material = new THREE.MeshToonNodeMaterial();
  material.colorNode = color(baseColor);

  // Create gradient map for stepped toon shading
  const gradientMap = createGradientMap(steps);
  material.gradientMap = gradientMap;

  return material;
}

/**
 * Create a gradient texture for toon shading steps.
 */
function createGradientMap(steps: number): THREE.DataTexture {
  const colors = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) {
    colors[i] = Math.round((i / (steps - 1)) * 255);
  }
  const gradientMap = new THREE.DataTexture(colors, steps, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  return gradientMap;
}
