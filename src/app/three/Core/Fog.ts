import * as THREE from 'three/webgpu';
import {
  Fn, float, vec2, mix, screenUV, uniform, positionView, remap
} from 'three/tsl';

/**
 * Radial color fog system using TSL nodes.
 *
 * Features:
 * - Radial color blending (two-color gradient from center outward)
 * - Distance-based fog (near/far range) using actual view-space depth
 * - Warm Ghibli-tinted fog colors matching Myanmar afternoon atmosphere
 * - Dynamic color/density updates via uniforms
 */
export class Fog {
  /** Fog color A (warm center color — golden haze) */
  colorA: ReturnType<typeof uniform>;

  /** Fog color B (cool distant color — soft blue-gray) */
  colorB: ReturnType<typeof uniform>;

  /** Radial center in screen space (0.5, 0.5 = center) */
  radialCenter: ReturnType<typeof uniform>;

  /** Radial blend start radius */
  radialStart: ReturnType<typeof uniform>;

  /** Radial blend end radius */
  radialEnd: ReturnType<typeof uniform>;

  /** Near distance for range fog */
  near: ReturnType<typeof uniform>;

  /** Far distance for range fog */
  far: ReturnType<typeof uniform>;

  /** Fog strength multiplier */
  strength: ReturnType<typeof uniform>;

  /** Combined fog color output node */
  color: THREE.Node;

  /** Fog strength output node */
  strengthNode: THREE.Node;

  constructor(near: number = 30, far: number = 120) {
    // Warm golden center (afternoon haze), cool blue-gray distance (sky bleed)
    this.colorA = uniform(new THREE.Color(0xfff5e6));
    this.colorB = uniform(new THREE.Color(0xc9e8f5));

    // Radial parameters for screen-space color gradient
    this.radialCenter = uniform(new THREE.Vector2(0.5, 0.5));
    this.radialStart = uniform(0.3);
    this.radialEnd = uniform(0.9);

    // Distance fog range — matches Game.ts linear fog near/far
    this.near = uniform(near);
    this.far = uniform(far);
    this.strength = uniform(0.0);

    // Build TSL color node: radial blend in screen space
    // Creates a warm-to-cool gradient from screen center outward
    this.color = Fn(() => {
      const uv = screenUV;
      const distFromCenter = uv.sub(this.radialCenter).length();
      const colorMix = distFromCenter.smoothstep(this.radialStart, this.radialEnd);
      return mix(this.colorA, this.colorB, colorMix);
    })();

    // Build TSL strength node: range-based fog using actual view-space depth
    this.strengthNode = rangeFogFactor(this.near, this.far);
  }

  /**
   * Update fog for the current frame.
   */
  update(_elapsed: number): void {
    // Fog parameters are GPU-side via uniforms, nothing to tick on CPU
  }

  /**
   * Set fog colors.
   */
  setColors(center: THREE.Color, distant: THREE.Color): void {
    (this.colorA.value as THREE.Color).copy(center);
    (this.colorB.value as THREE.Color).copy(distant);
  }

  /**
   * Set fog distance range.
   */
  setRange(near: number, far: number): void {
    this.near.value = near;
    this.far.value = far;
  }
}

/**
 * TSL helper: compute range-based fog factor using actual view-space depth.
 * Uses positionView.z (negative in camera space) to get true distance.
 * Returns 0 at near, 1 at far — linear falloff for predictable Ghibli look.
 */
function rangeFogFactor(
  nearNode: ReturnType<typeof uniform>,
  farNode: ReturnType<typeof uniform>
): THREE.Node {
  return Fn(() => {
    // positionView.z is negative in camera space, negate for positive distance
    const viewDist = positionView.z.negate();
    return remap(viewDist, nearNode, farNode, float(0), float(1)).clamp(0, 1);
  })();
}
