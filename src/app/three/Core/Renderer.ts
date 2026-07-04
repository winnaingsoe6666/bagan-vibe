import * as THREE from 'three/webgpu';
import { WebGLRenderer } from 'three';

export class Renderer {
  instance: THREE.WebGPURenderer | WebGLRenderer;
  useWebGPU: boolean;
  private _rafId: number = 0;

  constructor(canvas: HTMLCanvasElement, useWebGPU: boolean) {
    this.useWebGPU = useWebGPU;

    if (useWebGPU) {
      this.instance = new THREE.WebGPURenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } else {
      this.instance = new WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
    }

    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ghibli tone mapping: slightly overexposed for that warm, dreamy afternoon glow
    // ACES Filmic with 1.15 gives soft highlight rolloff without crushing shadows
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1.15;

    // Shadow configuration for Ghibli look: soft, defined, no harsh artifacts
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;

    window.addEventListener('resize', this.onResize.bind(this));
  }

  async init(): Promise<void> {
    if (this.useWebGPU) {
      await (this.instance as THREE.WebGPURenderer).init();
    }
  }

  /**
   * Start the render loop.
   * WebGPURenderer has setAnimationLoop natively;
   * for WebGLRenderer we use requestAnimationFrame.
   */
  setAnimationLoop(callback: () => void): void {
    if (this.useWebGPU) {
      (this.instance as THREE.WebGPURenderer).setAnimationLoop(callback);
    } else {
      const loop = (): void => {
        callback();
        this._rafId = requestAnimationFrame(loop);
      };
      this._rafId = requestAnimationFrame(loop);
    }
  }

  onResize(): void {
    this.instance.setSize(window.innerWidth, window.innerHeight);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.instance.render(scene, camera);
  }
}
