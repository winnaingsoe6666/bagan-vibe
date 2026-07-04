import * as THREE from 'three/webgpu';
import { Terrain } from './Terrain';
import { Tree } from './Tree';
import { Architecture } from './Architecture';
import { Sky } from './Sky';
import { Wind } from '../Utils/Wind';

export class World {
  scene: THREE.Scene;
  terrain: Terrain;
  tree: Tree;
  architecture: Architecture;
  sky: Sky;
  wind: Wind;

  constructor(scene: THREE.Scene, useWebGPU: boolean = true) {
    this.scene = scene;

    // Wind system first (grass depends on it)
    this.wind = new Wind(useWebGPU);

    // Order matters: terrain first, then objects on it
    this.terrain = new Terrain(scene, this.wind, useWebGPU);
    this.tree = new Tree(scene, useWebGPU);
    this.architecture = new Architecture(scene, useWebGPU);
    this.sky = new Sky(scene, useWebGPU);
  }

  update(elapsed: number, delta: number): void {
    // Update wind simulation
    this.wind.update(delta);

    // Update world elements
    this.tree.update(elapsed, delta);
    this.sky.update(elapsed);
  }
}
