import * as THREE from 'three/webgpu';
import { color, float, Fn, normalWorld, cameraPosition, positionWorld, mix } from 'three/tsl';

/**
 * Ghibli-style toon material factory.
 * Creates MeshToonNodeMaterial with gradient maps and optional rim lighting.
 *
 * Features:
 * - Multiple gradient map presets (2-step, 3-step, 5-step)
 * - Warm Ghibli color palette built-in
 * - Optional rim light for edge glow (baked into colorNode since MeshToonNodeMaterial has no emissiveNode)
 */

/** Gradient map presets for different cel-shading styles */
export type GradientPreset = 'hard' | 'soft' | 'detailed';

/**
 * Create a toon material with the given base color.
 * Supports optional gradient preset and rim lighting.
 */
export function createToonMaterial(
  baseColor: number,
  emissive: number = 0x000000,
  options: {
    gradient?: GradientPreset;
    rimLight?: boolean;
    rimColor?: number;
    rimStrength?: number;
  } = {}
): THREE.MeshToonNodeMaterial {
  const material = new THREE.MeshToonNodeMaterial();

  // Apply gradient map preset
  const presetMap: Record<GradientPreset, number> = {
    hard: 2,    // 2-step: stark light/shadow boundary
    soft: 3,    // 3-step: classic Ghibli 3-tone
    detailed: 5 // 5-step: subtle gradations
  };
  const steps = presetMap[options.gradient ?? 'soft'];
  material.gradientMap = createGradientMap(steps);

  material.emissive = new THREE.Color(emissive);

  // Optional rim lighting: baked into colorNode since MeshToonNodeMaterial has no emissiveNode
  if (options.rimLight) {
    const rimColor = options.rimColor ?? 0xfff4e0;
    const rimStrength = options.rimStrength ?? 0.5;

    const rimContrib = Fn(() => {
      const viewDir = cameraPosition.sub(positionWorld).normalize();
      const nDotV = normalWorld.dot(viewDir).clamp(0.0, 1.0);
      const fresnel = float(1.0).sub(nDotV).pow(2.5);
      return fresnel.mul(rimStrength);
    });

    const baseCol = color(baseColor);
    const rimNode = baseCol.mul(color(rimColor)).mul(rimContrib());
    material.colorNode = baseCol.add(rimNode);
  } else {
    material.colorNode = color(baseColor);
  }

  return material;
}

/**
 * Create a Ghibli-style toon material with gradient map.
 * Classic 3-tone cel shading with optional shadow tint.
 */
export function createGhibliToonMaterial(
  baseColor: number,
  steps: number = 3
): THREE.MeshToonNodeMaterial {
  const material = new THREE.MeshToonNodeMaterial();
  material.colorNode = color(baseColor);

  // Create a gradient map for stepped toon shading
  const gradientMap = createGradientMap(steps);
  material.gradientMap = gradientMap;

  return material;
}

/**
 * Create a gradient texture for toon shading steps.
 *
 * @param steps Number of discrete shading steps (2, 3, or 5)
 * @param warmBias Optional warm color bias for Ghibli palette
 */
function createGradientMap(
  steps: number,
  warmBias: number = 0.0
): THREE.DataTexture {
  const useRGB = warmBias > 0;
  const channels = useRGB ? 3 : 1;
  const colors = new Uint8Array(steps * channels);

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const brightness = Math.round(t * 255);

    if (useRGB) {
      const idx = i * 3;
      colors[idx] = brightness;
      colors[idx + 1] = brightness;
      colors[idx + 2] = brightness;

      // Warm bias: add slight red/yellow tint to brighter values
      if (t > 0.5) {
        const warm = Math.round(warmBias * 255 * (t - 0.5) * 2);
        colors[idx] = Math.min(255, colors[idx] + warm);
        colors[idx + 1] = Math.min(255, colors[idx + 1] + Math.round(warm * 0.5));
      }
    } else {
      colors[i] = brightness;
    }
  }

  const format = useRGB ? THREE.RGBFormat : THREE.RedFormat;
  const gradientMap = new THREE.DataTexture(colors, steps, 1, format);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;

  return gradientMap;
}
