import * as THREE from 'three/webgpu';
import { WebGLRenderer } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
// OutputPass removed — renderer handles tone mapping and output encoding natively.
import {
  VignetteShader,
  FilmGrainShader,
  ColorGradingShader,
} from '../Shaders/PostProcessShaders';

type AnyRenderer = THREE.WebGPURenderer | WebGLRenderer;

/**
 * Post-processing pipeline.
 *
 * Attempts EffectComposer on both WebGPU and WebGL.
 * WebGPU: Three.js r171+ WebGPURenderer supports EffectComposer via GLSL-to-WGSL compilation.
 * WebGL: EffectComposer with bloom + vignette + grain + color grading.
 * Falls back to direct render if EffectComposer fails to initialize.
 */
export class PostProcessing {
  private renderer: AnyRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private useWebGPU: boolean;

  // EffectComposer (used on both WebGPU and WebGL when available)
  private composer: EffectComposer | null = null;
  private filmGrainPass: ShaderPass | null = null;

  constructor(
    renderer: AnyRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.useWebGPU = (renderer as any).isWebGPURenderer === true;

    // Configure renderer tone mapping
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Attempt EffectComposer on both WebGPU and WebGL
    this.buildComposer();
  }

  private buildComposer(): void {
    try {
      const size = new THREE.Vector2();
      this.renderer.getSize(size);

      this.composer = new EffectComposer(this.renderer as unknown as WebGLRenderer);

      // RenderPass
      this.composer.addPass(new RenderPass(this.scene, this.camera));

      // Bloom — subtle glow for emissive materials
      this.composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(size.x, size.y), 0.4, 0.4, 0.85
      ));

      // Vignette
      const vignettePass = new ShaderPass(VignetteShader);
      vignettePass.uniforms.offset.value = 0.4;
      vignettePass.uniforms.darkness.value = 1.2;
      this.composer.addPass(vignettePass);

      // Film grain
      this.filmGrainPass = new ShaderPass(FilmGrainShader);
      this.filmGrainPass.uniforms.intensity.value = 0.03;
      this.filmGrainPass.uniforms.speed.value = 8.0;
      this.composer.addPass(this.filmGrainPass);

      // Color grading
      const colorGradingPass = new ShaderPass(ColorGradingShader);
      colorGradingPass.uniforms.warmShift.value = 0.06;
      colorGradingPass.uniforms.coolShift.value = 0.04;
      colorGradingPass.uniforms.saturation.value = 1.08;
      colorGradingPass.uniforms.contrast.value = 1.02;
      this.composer.addPass(colorGradingPass);

      // Note: OutputPass removed — renderer handles tone mapping and output encoding
      // on both WebGPU and WebGL. OutputPass would double-apply tone mapping.

      const mode = this.useWebGPU ? 'WebGPU' : 'WebGL';
      console.log(`PostProcessing: ${mode} EffectComposer pipeline ready (bloom + vignette + grain + color grading)`);
    } catch (err) {
      console.warn('PostProcessing: EffectComposer failed, falling back to direct render:', err);
      this.composer = null;
    }
  }

  render(): void {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  update(elapsed: number): void {
    if (this.filmGrainPass) {
      this.filmGrainPass.uniforms.time.value = elapsed;
    }
  }
}
