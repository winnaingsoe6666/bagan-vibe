import * as THREE from 'three/webgpu';
import { WebGLRenderer } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  VignetteShader,
  FilmGrainShader,
  ColorGradingShader,
} from '../Shaders/PostProcessShaders';

type AnyRenderer = THREE.WebGPURenderer | WebGLRenderer;

/**
 * Post-processing pipeline.
 *
 * WebGPU: Direct render — tone mapping on renderer, materials do the heavy lifting.
 * WebGL: EffectComposer with bloom + vignette + grain + color grading.
 */
export class PostProcessing {
  private renderer: AnyRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private useWebGPU: boolean;

  // WebGL-only EffectComposer
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

    if (this.useWebGPU) {
      // WebGPU: direct render, tone mapping handled by renderer
      console.log('PostProcessing: WebGPU — direct render with ACES tone mapping');
    } else {
      // WebGL: full EffectComposer pipeline
      this.buildWebGLComposer();
    }
  }

  private buildWebGLComposer(): void {
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

      // Output
      this.composer.addPass(new OutputPass());

      console.log('PostProcessing: WebGL EffectComposer pipeline ready');
    } catch (err) {
      console.warn('PostProcessing: EffectComposer failed, falling back:', err);
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
