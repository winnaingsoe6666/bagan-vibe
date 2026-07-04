import * as THREE from 'three/webgpu';
import { Time } from './Utils/Time';
import { Renderer } from './Core/Renderer';
import { isWebGPUSupported } from './Core/WebGPUCheck';
import { View } from './Core/View';
import { World } from './World/World';
import { Character } from './Player/Character';
import { PostProcessing } from './Core/PostProcessing';

export class Game {
  private static instance: Game;

  canvas!: HTMLCanvasElement;
  renderer!: Renderer;
  view!: View;
  time!: Time;
  scene!: THREE.Scene;
  world!: World;
  character!: Character;
  postProcessing!: PostProcessing;
  private playerPosition: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  static getInstance(): Game {
    if (!Game.instance) {
      Game.instance = new Game();
    }
    return Game.instance;
  }

  async init(): Promise<void> {
    // Canvas
    this.canvas = document.createElement('canvas');
    document.body.appendChild(this.canvas);

    // Detect WebGPU support
    let useWebGPU = await isWebGPUSupported();
    console.log(`Renderer: ${useWebGPU ? 'WebGPU' : 'WebGL'}`);

    // Core — try WebGPU first, fall back to WebGL if anything fails
    try {
      this.renderer = new Renderer(this.canvas, useWebGPU);
      await this.renderer.init();
    } catch (err) {
      console.warn('Renderer init failed, falling back to WebGL:', err);
      useWebGPU = false;
      this.renderer = new Renderer(this.canvas, false);
      await this.renderer.init();
    }

    this.view = new View();
    this.time = new Time();

    // Scene with Ghibli sky gradient — Myanmar summer afternoon
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    // Linear fog for predictable, controllable Ghibli distance fade
    // Near/far tuned for the playable area (~200 units across)
    this.scene.fog = new THREE.Fog(0xd0e8f5, 40, 180);

    // --- Lighting: Ghibli warm sunlight setup ---

    // Main sun light: warm golden afternoon sun, strong but soft
    // Positioned low-ish (late afternoon angle) from the right-front
    const sunLight = new THREE.DirectionalLight(0xfff0d0, 2.2);
    sunLight.position.set(35, 40, 25);
    sunLight.castShadow = true;
    // 4096 shadow map for crisp shadows on vegetation and pagodas
    sunLight.shadow.mapSize.set(4096, 4096);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 120;
    // Tight frustum around playable area for maximum shadow resolution
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    // Careful bias to avoid shadow acne without peter-panning
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.03;
    this.scene.add(sunLight);

    // Hemisphere light: Ghibli sky/ground color bleeding
    // Sky: warm azure (Myanmar sky) -> Ground: sunlit grass green
    const hemiLight = new THREE.HemisphereLight(0x98d1f0, 0x6ab04c, 0.6);
    this.scene.add(hemiLight);

    // Ambient light: warm fill to lift shadows without flattening
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.25);
    this.scene.add(ambientLight);

    // Rim/edge light from opposite side for depth and separation
    // Subtle warm backlight catches the edges of pagodas and trees
    const rimLight = new THREE.DirectionalLight(0xffe8c0, 0.4);
    rimLight.position.set(-25, 20, -15);
    this.scene.add(rimLight);

    // Ground bounce: subtle warm light from below simulates light
    // reflected off sunlit earth/stone — lifts under-chin shadows
    const groundBounce = new THREE.PointLight(0xffe0a0, 0.3, 60);
    groundBounce.position.set(0, -2, 0);
    this.scene.add(groundBounce);

    // Warm point light near the house (lantern feel)
    const warmLight = new THREE.PointLight(0xffaa44, 0.6, 15);
    warmLight.position.set(5, 3, 4);
    this.scene.add(warmLight);

    // World (creates wind, terrain, tree, architecture, sky)
    this.world = new World(this.scene, useWebGPU);

    // Character (depends on world being created first for terrain)
    this.character = new Character(this.scene, this.time, useWebGPU);

    // Post-processing (EffectComposer: bloom, AA, vignette, grain, color grading)
    this.postProcessing = new PostProcessing(
      this.renderer.instance,
      this.scene,
      this.view.instance
    );

    // Animation loop
    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  private animate(): void {
    try {
      this.time.update();

      if (this.character) {
        this.character.update(this.time.getDelta());
        this.playerPosition.copy(this.character.getPosition());
      }

      if (this.world) {
        this.world.update(this.time.getElapsed(), this.time.getDelta());
      }

      this.view.update(this.playerPosition, this.time.getElapsed());
      this.postProcessing.update(this.time.getElapsed());
      this.postProcessing.render();
    } catch (err) {
      console.error('Animate loop error:', err);
    }
  }
}
