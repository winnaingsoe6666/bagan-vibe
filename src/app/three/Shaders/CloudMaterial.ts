import * as THREE from 'three/webgpu';
import {
  color, positionLocal, positionWorld, vec3,
  Fn, float, mix, time, dot, normalize, cameraPosition,
  normalWorld, pow, abs, smoothstep, max, mul, add
} from 'three/tsl';

/**
 * Volumetric cloud material with soft edges and subtle animation.
 *
 * Features:
 * - Noise-based edge softness for fluffy appearance
 * - Height-based color (warm sunlit top, cool shadow bottom)
 * - Subtle breathing/pulsing animation
 * - Subsurface scattering approximation (light wrapping)
 * - Transparent with proper depth handling
 */
export function createCloudMaterial(): THREE.MeshStandardNodeMaterial {
  const material = new THREE.MeshStandardNodeMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  // Cloud color palette
  const cloudWhite = color(0xffffff);
  const cloudShadow = color(0xb8d4e8);
  const cloudHighlight = color(0xfff8e8);
  const cloudWarmTop = color(0xffecd2);
  const cloudCoolBottom = color(0xd4e8f0);

  // === Noise-like pattern for edge softness ===
  // Creates organic, fluffy edges using layered sine waves
  const noiseEdge = Fn(() => {
    const pos = positionLocal;

    // Layer 1: large-scale noise
    const n1 = pos.x.mul(2.0).sin().add(pos.z.mul(1.5).cos()).mul(0.5);

    // Layer 2: medium-scale noise
    const n2 = pos.x.mul(4.0).add(pos.y.mul(3.0)).sin()
      .add(pos.z.mul(3.5).add(pos.x.mul(2.0)).cos()).mul(0.25);

    // Layer 3: small-scale detail
    const n3 = pos.x.mul(8.0).add(pos.y.mul(6.0)).sin()
      .add(pos.z.mul(7.0)).cos().mul(0.125);

    // Combine noise layers
    const combinedNoise = n1.add(n2).add(n3);

    // Distance from center for overall cloud shape
    const distFromCenter = pos.length();

    // Edge falloff: combine noise with radial distance
    // The noise creates irregular, fluffy edges
    const edgeBase = float(1.0).sub(distFromCenter.smoothstep(0.45, 0.95));
    const noisyEdge = edgeBase.add(combinedNoise.mul(0.15)).clamp(0.0, 1.0);

    return noisyEdge;
  });

  // === Height-based color (warm sunlit top, cool shadow bottom) ===
  const heightColor = Fn(() => {
    const height = positionLocal.y.add(0.5).clamp(0.0, 1.0);

    // Warm top (sunlit), cool bottom (shadow)
    const topColor = mix(cloudShadow, cloudWarmTop, height);
    const bottomColor = mix(cloudCoolBottom, cloudShadow, float(1.0).sub(height));

    // Blend based on height: more top color as we go up
    return mix(bottomColor, topColor, height);
  });

  // === Subsurface scattering approximation (light wrapping) ===
  // Light wraps around the cloud edges, creating that soft, luminous Ghibli look
  const subsurfaceScatter = Fn(() => {
    const lightDir = normalize(vec3(0.3, 1.0, 0.2));
    const viewDir = cameraPosition.sub(positionWorld).normalize();

    // N dot L for diffuse
    const nDotL = normalWorld.dot(lightDir).clamp(0.0, 1.0);

    // Wrap lighting: shift the N dot L to simulate light wrapping
    // This creates the soft, luminous edge effect
    const wrapped = nDotL.add(0.4).clamp(0.0, 1.0);

    // Back-light contribution: light coming through the cloud
    const backLight = float(1.0).sub(normalWorld.dot(viewDir).clamp(0.0, 1.0));
    const scatter = backLight.pow(2.0).mul(0.3);

    return wrapped.add(scatter).clamp(0.0, 1.0);
  });

  // === Breathing/pulsing animation ===
  const breathe = Fn(() => {
    // Slow, gentle pulsing
    const pulse = time.mul(0.4).sin().mul(0.04).add(1.0);
    return pulse;
  });

  // === Compose final material ===
  // Color: height-based with subsurface scattering influence
  const finalColor = Fn(() => {
    const hColor = heightColor();
    const scatter = subsurfaceScatter();

    // Mix height color with scatter for luminous edges
    const litColor = mix(hColor, cloudHighlight, scatter.mul(0.25));

    return litColor;
  });

  material.colorNode = finalColor();

  // Opacity: noise-based edge with breathing animation
  material.opacityNode = noiseEdge().mul(breathe()).mul(0.92);

  // Matte finish for soft cloud look
  material.roughnessNode = float(1.0);
  material.metalnessNode = float(0.0);

  // Emissive: subtle sunlit glow from subsurface scattering
  material.emissiveNode = cloudHighlight.mul(subsurfaceScatter().mul(0.15));

  return material;
}
