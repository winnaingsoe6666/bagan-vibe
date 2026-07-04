import * as THREE from 'three/webgpu';

/**
 * WebGL fallback materials.
 *
 * These replace TSL node-based materials when WebGPU is unavailable.
 * They sacrifice custom shader effects (wind, twinkle, soft edges)
 * for broad browser compatibility.
 */

/**
 * Fallback grass material — simple green MeshStandardMaterial.
 * No wind displacement (static grass).
 */
export function createFallbackGrassMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x478f2d,
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
}

/**
 * Fallback cloud material — semi-transparent white MeshStandardMaterial.
 * No soft edge animation.
 */
export function createFallbackCloudMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

/**
 * Fallback petal material — simple golden PointsMaterial.
 * No twinkle animation.
 */
export function createFallbackPetalMaterial(): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    color: 0xffd700,
    size: 0.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
}

/**
 * Fallback toon material — standard MeshToonMaterial with gradient map.
 */
export function createFallbackToonMaterial(
  baseColor: number,
  steps: number = 3
): THREE.MeshToonMaterial {
  const gradientMap = createFallbackGradientMap(steps);
  return new THREE.MeshToonMaterial({
    color: baseColor,
    gradientMap
  });
}

/**
 * Fallback Ghibli material — warm MeshStandardMaterial approximation.
 */
export function createFallbackGhibliMaterial(
  baseColor: number,
  options: {
    side?: THREE.Side;
    transparent?: boolean;
  } = {}
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.85,
    metalness: 0.0,
    side: options.side ?? THREE.FrontSide,
    transparent: options.transparent ?? false
  });
}

/**
 * Create a gradient texture for toon shading steps.
 */
function createFallbackGradientMap(steps: number): THREE.DataTexture {
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
