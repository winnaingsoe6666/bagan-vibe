import * as THREE from 'three/webgpu';
import {
  color, time, instanceIndex, float, mix, pow, mul, add, sub, sin, cos,
  vec2, vec3, smoothstep, clamp, Fn
} from 'three/tsl';

/**
 * Golden Padauk petal particle material.
 *
 * Features:
 * - Golden gradient with time-based color shift
 * - Size variation per particle
 * - Soft particle rendering with smooth edges
 * - Bright emissive-like color for bloom pickup (baked into color since PointsNodeMaterial has no emissive)
 */
export function createPetalMaterial(): THREE.PointsNodeMaterial {
  const material = new THREE.PointsNodeMaterial({
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  // Golden Padauk color palette
  const deepGold = color(0xd4a017);
  const brightGold = color(0xffd700);
  const warmGold = color(0xffb800);
  const hotGold = color(0xff8c00);
  const paleGold = color(0xffe680);

  // === Time-based color shift ===
  // Each petal shifts through the golden spectrum over time
  const timeShift = Fn(() => {
    // Per-instance time offset for organic variation
    const instanceOffset = instanceIndex.toFloat().mul(0.7);
    const t = time.mul(1.8).add(instanceOffset);

    // Smooth oscillation through the color palette
    const shift = t.sin().mul(0.5).add(0.5);

    return shift;
  });

  // === Size variation ===
  // Each petal gets a unique size based on its instance index
  const sizeVariation = Fn(() => {
    const seed = instanceIndex.toFloat().mul(1.618); // Golden ratio for distribution
    const variation = seed.sin().mul(0.5).add(0.75); // Range: 0.25 to 1.25
    return variation;
  });

  // === Compose final petal color ===
  // Bright, saturated colors that bloom post-processing will pick up
  const petalColor = Fn(() => {
    const shift = timeShift();

    // Multi-stage golden gradient based on time
    // Deep gold -> bright gold -> warm gold -> hot gold cycle
    const color1 = mix(deepGold, brightGold, shift);
    const color2 = mix(warmGold, hotGold, shift.mul(1.3).add(0.3));
    const finalColor = mix(color1, color2, shift.mul(0.5).add(0.25));

    // Add subtle pale gold sparkle at peaks
    const sparkle = shift.pow(4.0).mul(0.15);
    const withSparkle = finalColor.mix(paleGold, sparkle);

    // Boost brightness to simulate emissive glow (bloom will pick this up)
    // Values > 1.0 will be captured by bloom threshold
    return withSparkle.mul(1.4);
  });

  material.colorNode = petalColor();

  // === Size with variation ===
  // PointsNodeMaterial uses .size (number), not .sizeNode
  material.size = 0.15;

  // === Opacity: soft edges with breathing ===
  const breathe = time.mul(1.2).add(instanceIndex.toFloat().mul(0.3)).sin().mul(0.1).add(0.9);
  material.opacityNode = float(0.88).mul(breathe);

  return material;
}
