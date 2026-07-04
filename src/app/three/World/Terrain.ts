import * as THREE from 'three/webgpu';
import { color, positionWorld, Fn, mix } from 'three/tsl';
import { createGrassMaterial } from '../Shaders/GrassMaterial';
import { createFallbackGrassMaterial } from '../Shaders/FallbackMaterials';
import { Wind } from '../Utils/Wind';

export class Terrain {
  scene: THREE.Scene;
  private ground!: THREE.Mesh;
  private grassMesh!: THREE.InstancedMesh;
  private grassCount: number = 18000;

  constructor(scene: THREE.Scene, wind?: Wind, useWebGPU: boolean = true) {
    this.scene = scene;
    this.createGround(useWebGPU);
    this.createGrass(wind, useWebGPU);
  }

  private createGround(useWebGPU: boolean): void {
    const geometry = new THREE.PlaneGeometry(200, 200, 160, 160);
    geometry.rotateX(-Math.PI / 2);

    // More natural terrain undulation with multiple frequency layers
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Large rolling hills
      const y =
        Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.0 +
        Math.sin(x * 0.02 + z * 0.025) * 1.2 +
        // Medium undulation
        Math.sin(x * 0.08 + 1.5) * Math.cos(z * 0.06 + 0.8) * 0.6 +
        Math.cos(x * 0.03 - z * 0.04) * 0.8 +
        // Fine detail
        Math.sin(x * 0.15) * Math.cos(z * 0.12) * 0.2 +
        Math.sin(x * 0.2 + z * 0.18) * 0.1 +
        // Micro bumps
        Math.sin(x * 0.4 + z * 0.3) * 0.05;

      positions.setY(i, y);
    }
    geometry.computeVertexNormals();

    let groundMaterial: THREE.Material;

    if (useWebGPU) {
      const nodeMat = new THREE.MeshStandardNodeMaterial({
        roughness: 0.95,
        metalness: 0.0,
      });

      const darkGreen = color(0x2d5a1a);
      const midGreen = color(0x3d7a24);
      const lightGreen = color(0x5a9a35);
      const warmGreen = color(0x4a8a28);

      const height1 = positionWorld.y.mul(0.3).add(0.5).clamp(0, 1);
      const height2 = positionWorld.y.mul(0.5).add(0.3).clamp(0, 1);
      const variation = positionWorld.x.mul(0.05).add(positionWorld.z.mul(0.03)).sin().mul(0.1).add(0.9);
      const patch = positionWorld.x.mul(0.02).add(positionWorld.z.mul(0.015)).cos().mul(0.08).add(0.92);

      nodeMat.colorNode = mix(darkGreen, midGreen, height1)
        .mix(lightGreen, height2)
        .mix(warmGreen, variation)
        .mul(patch) as any;

      groundMaterial = nodeMat;
    } else {
      groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d7a24,
        roughness: 0.95,
        metalness: 0.0,
      });
    }

    this.ground = new THREE.Mesh(geometry, groundMaterial);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  private createGrass(wind?: Wind, useWebGPU: boolean = true): void {
    // Two grass blade sizes: tall and short
    const tallBlade = new THREE.PlaneGeometry(0.12, 0.8, 1, 4);
    tallBlade.translate(0, 0.4, 0);

    const shortBlade = new THREE.PlaneGeometry(0.08, 0.5, 1, 4);
    shortBlade.translate(0, 0.25, 0);

    let material: THREE.Material;

    if (useWebGPU) {
      material = createGrassMaterial(wind?.offsetNode(positionWorld));
    } else {
      material = createFallbackGrassMaterial();
    }

    this.grassMesh = new THREE.InstancedMesh(
      tallBlade,
      material,
      this.grassCount
    );
    this.grassMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const radius = 50;

    for (let i = 0; i < this.grassCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Use weighted distribution: more grass near center, less at edges
      const r = Math.pow(Math.random(), 0.6) * radius;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      // Sample terrain height at this position
      const y =
        Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.0 +
        Math.sin(x * 0.02 + z * 0.025) * 1.2 +
        Math.sin(x * 0.08 + 1.5) * Math.cos(z * 0.06 + 0.8) * 0.6 +
        Math.cos(x * 0.03 - z * 0.04) * 0.8 +
        Math.sin(x * 0.15) * Math.cos(z * 0.12) * 0.2;

      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.random() * Math.PI;

      // Size distribution: larger near center, smaller at edges
      const distFactor = 1.0 - (r / radius) * 0.5;
      const baseScale = 0.4 + Math.random() * 1.0;

      dummy.scale.set(
        (0.5 + Math.random() * 0.6) * distFactor,
        (0.5 + Math.random() * 1.5) * distFactor * baseScale,
        (0.5 + Math.random() * 0.5) * distFactor
      );

      dummy.updateMatrix();
      this.grassMesh.setMatrixAt(i, dummy.matrix);
    }

    this.grassMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.grassMesh);
  }
}
