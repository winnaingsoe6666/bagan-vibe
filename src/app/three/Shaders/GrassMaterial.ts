import * as THREE from 'three/webgpu';
import {
  color, time, positionLocal, positionWorld,
  Fn, float, vec3, mix
} from 'three/tsl';

/**
 * Ghibli grass material with wind displacement.
 *
 * Features:
 * - Height-based wind sway (root stays still, tip sways)
 * - Multi-color gradient (dark base to bright tip)
 * - Subtle world-position color variation
 * - Double-sided rendering for lush look
 */
export function createGrassMaterial(
  windNode?: THREE.Node
): THREE.MeshStandardNodeMaterial {
  const material = new THREE.MeshStandardNodeMaterial({
    side: THREE.DoubleSide
  });

  // Wind parameters
  const windStrength = float(0.35);
  const windFrequency = float(1.8);

  // Custom wind sway function
  const windSway = Fn(() => {
    // Layer 1: Primary wave
    const waveX = positionWorld.x.mul(0.08).add(time.mul(windFrequency));
    const waveZ = positionWorld.z.mul(0.06).add(time.mul(windFrequency).mul(0.7));
    const wave = waveX.sin().add(waveZ.cos()).mul(0.5);

    // Layer 2: Secondary wave (faster, smaller)
    const wave2X = positionWorld.x.mul(0.15).add(time.mul(windFrequency.mul(1.3)));
    const wave2Z = positionWorld.z.mul(0.12).add(time.mul(windFrequency.mul(0.9)));
    const wave2 = wave2X.sin().add(wave2Z.cos()).mul(0.25);

    // Combined wave
    const combinedWave = wave.add(wave2);

    // Height-based displacement: root stays still, tip sways
    const heightFactor = positionLocal.y.mul(positionLocal.y);
    const sway = combinedWave.mul(windStrength).mul(heightFactor);

    // Slight forward/backward sway too
    const forwardSway = wave.mul(0.1).mul(heightFactor);

    return vec3(sway, float(0.0), forwardSway);
  });

  // Apply vertex displacement
  if (windNode) {
    const w = windNode as any;
    material.positionNode = positionLocal.add(vec3(
      w.x,
      float(0),
      w.y
    ));
  } else {
    material.positionNode = positionLocal.add(windSway());
  }

  // Grass colors - three-tone gradient for Ghibli look
  // Enhanced with warmer tones and more natural variation
  const darkGrass = color(0x2d6b1a);
  const midGrass = color(0x478f2d);
  const lightGrass = color(0x7ec850);
  const warmTip = color(0x98d860); // Slightly yellow-green for sun-kissed tips

  // Height-based color mixing
  const heightFactor = positionLocal.y;
  const heightMix1 = heightFactor.mul(1.5).clamp(0, 1);
  const heightMix2 = heightFactor.mul(2.5).sub(0.3).clamp(0, 1);
  const heightMix3 = heightFactor.mul(3.5).sub(0.6).clamp(0, 1); // Extra step for tip warmth

  // Chain color mixing: dark -> mid -> light -> warm tip
  const baseGradient = mix(darkGrass, midGrass, heightMix1)
    .mix(lightGrass, heightMix2)
    .mix(warmTip, heightMix3);

  // World-position variation for natural look
  const variation = positionWorld.x.mul(0.1)
    .add(positionWorld.z.mul(0.07))
    .sin()
    .mul(0.15)
    .add(0.85);

  material.colorNode = baseGradient.mul(variation) as any;

  // Matte Ghibli finish
  material.roughnessNode = float(0.92);
  material.metalnessNode = float(0.0);

  return material;
}
