import * as THREE from 'three/webgpu';
import { WebGLRenderer } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  VignetteShader,
  FilmGrainShader,
  ColorGradingShader,
} from '../Shaders/PostProcessShaders';

// Three.js types mark EffectComposer as WebGLRenderer-only, but WebGPURenderer
// implements the same runtime interface. Cast once here for clarity.
type AnyRenderer = THREE.WebGPURenderer | WebGLRenderer;

/**
 * Production post-processing pipeline using EffectComposer.
 *
 * Pass chain:
 *  1. RenderPass       — base scene render
 *  2. UnrealBloomPass  — bloom/glow for golden petals & emissive materials
 *  3. SMAAPass         — anti-aliasing
 *  4. ShaderPass       — vignette (darkened edges)
 *  5. ShaderPass       — film grain (subtle analog noise)
 *  6. ShaderPass       — color grading (warm Ghibli palette)
 *  7. OutputPass       — final tone-mapped output
 */
export class PostProcessing {
  private renderer: AnyRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;

  // References kept for uniform updates
  private filmGrainPass: ShaderPass;

  constructor(
    renderer: AnyRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Configure renderer tone mapping (ACES Filmic for cinematic warmth)
    // Exposure 1.15: slightly overexposed for that soft Ghibli afternoon glow
    // Matches Renderer.ts setting — keep in sync
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Build the composer using the renderer's render target
    const size = new THREE.Vector2();
    renderer.getSize(size);

    // EffectComposer typings require WebGLRenderer, but WebGPURenderer
    // exposes the same runtime API (getSize, getPixelRatio, render, setSize).
    this.composer = new EffectComposer(renderer as unknown as WebGLRenderer);

    // 1. RenderPass — renders the scene
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // 2. UnrealBloomPass — subtle bloom for golden petals / emissive materials
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      0.4,   // strength (subtle, not overpowering)
      0.4,   // radius
      0.85   // threshold (only bright things bloom)
    );
    this.composer.addPass(bloomPass);

    // 3. SMAAPass — screen-space anti-aliasing
    const smaaPass = new SMAAPass(size.x, size.y);
    this.composer.addPass(smaaPass);

    // 4. Vignette — soft edge darkening for cinematic framing
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms.offset.value = 0.4;
    vignettePass.uniforms.darkness.value = 1.2;
    this.composer.addPass(vignettePass);

    // 5. Film grain — very subtle analog noise texture
    const filmGrainPass = new ShaderPass(FilmGrainShader);
    filmGrainPass.uniforms.intensity.value = 0.03;
    filmGrainPass.uniforms.speed.value = 8.0;
    this.filmGrainPass = filmGrainPass;
    this.composer.addPass(filmGrainPass);

    // 6. Color grading — warm Ghibli palette
    const colorGradingPass = new ShaderPass(ColorGradingShader);
    colorGradingPass.uniforms.warmShift.value = 0.06;
    colorGradingPass.uniforms.coolShift.value = 0.04;
    colorGradingPass.uniforms.saturation.value = 1.08;
    colorGradingPass.uniforms.contrast.value = 1.02;
    this.composer.addPass(colorGradingPass);

    // 7. OutputPass — final output with tone mapping applied
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  /**
   * Render the full post-processed frame via the EffectComposer.
   */
  render(): void {
    this.composer.render();
  }

  /**
   * Per-frame update. Drives time-based uniforms (film grain animation).
   */
  update(elapsed: number): void {
    this.filmGrainPass.uniforms.time.value = elapsed;
  }

  /**
   * Handle renderer resize — must be called when the viewport changes.
   */
  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }
}
