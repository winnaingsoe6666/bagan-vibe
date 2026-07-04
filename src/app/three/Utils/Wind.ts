import * as THREE from 'three/webgpu';
import { Fn, vec2, float, time, uniform } from 'three/tsl';
import type { ShaderNodeObject } from 'three/tsl';

/**
 * GPU-side wind animation system.
 *
 * Uses dual-layer noise at different scales and speeds to create
 * organic, non-repetitive wind displacement for grass and foliage.
 * Direction-biased so vegetation leans uniformly.
 *
 * In WebGL mode, TSL nodes are unavailable — useWebGPU=false disables
 * the node-based offset and the wind system only tracks local time.
 */
export class Wind {
  /** Base wind direction angle in radians */
  private angle: number;

  /** Direction vector (GPU uniform) */
  directionNode: ShaderNodeObject<THREE.UniformNode<THREE.Vector2>> | undefined;

  /** Wind strength uniform (0-1) */
  strength: ShaderNodeObject<THREE.UniformNode<number>> | undefined;

  /** Local time accumulator */
  private localTime: number = 0;

  /** Time frequency multiplier */
  private timeFrequency: number = 0.4;

  /** Whether TSL nodes are available */
  private useWebGPU: boolean;

  constructor(useWebGPU: boolean = true) {
    this.useWebGPU = useWebGPU;
    this.angle = Math.PI * 0.6;

    if (useWebGPU) {
      // Direction as a 2D vector uniform
      const dirX = Math.sin(this.angle);
      const dirY = Math.cos(this.angle);
      this.directionNode = uniform(new THREE.Vector2(dirX, dirY));

      // Strength uniform (0 = calm, 1 = strong wind)
      this.strength = uniform(0.6);
    }
  }

  /**
   * TSL node that computes wind offset for a world-space position.
   * Returns a vec2 displacement in world XZ.
   * Returns undefined in WebGL mode.
   */
  offsetNode(worldPositionXZ: THREE.Node): THREE.Node | undefined {
    if (!this.useWebGPU || !this.directionNode || !this.strength) {
      return undefined;
    }

    return Fn(() => {
      // Cast to any to access TSL methods
      const wp = worldPositionXZ as any;

      // Layer 1: Fast, fine detail
      const noise1UV = wp.mul(0.2)
        .add(this.directionNode!.mul(this.localTime));
      const noise1 = noise1UV.x.sin().mul(noise1UV.y.cos()).mul(0.5);

      // Layer 2: Slow, broad undulation
      const noise2UV = wp.mul(0.1)
        .add(this.directionNode!.mul(this.localTime * 0.2));
      const noise2 = noise2UV.x.sin().mul(noise2UV.y.cos()).mul(0.5);

      // Combine layers
      const intensity = noise2.add(noise1);

      // Direction-biased displacement modulated by strength
      return this.directionNode!.mul(intensity).mul(this.strength!);
    })();
  }

  /**
   * Update wind simulation. Call each frame with delta time.
   */
  update(delta: number): void {
    const strengthValue = this.strength ? (this.strength.value as number) : 0.6;
    this.localTime += delta * this.timeFrequency * strengthValue;
  }

  /**
   * Set wind direction angle (radians).
   */
  setAngle(angle: number): void {
    this.angle = angle;
    if (this.directionNode) {
      (this.directionNode.value as THREE.Vector2).set(
        Math.sin(angle),
        Math.cos(angle)
      );
    }
  }

  /**
   * Set wind strength (0-1).
   */
  setStrength(value: number): void {
    if (this.strength) {
      this.strength.value = Math.max(0, Math.min(1, value));
    }
  }
}
