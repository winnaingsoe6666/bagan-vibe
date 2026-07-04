import * as THREE from 'three/webgpu';
import { createPetalMaterial } from '../Shaders/PetalMaterial';
import { createFallbackPetalMaterial } from '../Shaders/FallbackMaterials';

export class Tree {
  scene: THREE.Scene;
  private treeGroup: THREE.Group;
  private petalSystem!: THREE.Points;
  private petalPositions!: Float32Array;
  private petalVelocities!: Float32Array;
  private petalCount: number = 600;

  constructor(scene: THREE.Scene, useWebGPU: boolean = true) {
    this.scene = scene;
    this.treeGroup = new THREE.Group();
    this.createTree(useWebGPU);
    this.createPetals(useWebGPU);
    this.scene.add(this.treeGroup);
  }

  private createTree(useWebGPU: boolean): void {
    const StdMat = useWebGPU ? THREE.MeshStandardNodeMaterial : THREE.MeshStandardMaterial;

    // ============================================================
    // MAIN TRUNK - thick, ancient, multi-segment for organic feel
    // ============================================================
    const trunkGroup = new THREE.Group();

    const trunkMat = new StdMat({
      color: new THREE.Color(0x5c3a1e),
      roughness: 1.0,
      metalness: 0.0,
    });

    // Core trunk segments stacked with slight offsets for gnarled look
    const trunkSegments = [
      { y: 0, h: 4, rBot: 1.4, rTop: 1.1, rotZ: 0.04, rotX: -0.02 },
      { y: 4, h: 3.5, rBot: 1.1, rTop: 0.85, rotZ: -0.03, rotX: 0.05 },
      { y: 7.5, h: 3, rBot: 0.85, rTop: 0.6, rotZ: 0.06, rotX: -0.04 },
      { y: 10.5, h: 2, rBot: 0.6, rTop: 0.35, rotZ: -0.05, rotX: 0.03 },
    ];

    for (const seg of trunkSegments) {
      const geom = new THREE.CylinderGeometry(seg.rTop, seg.rBot, seg.h, 16);
      const mesh = new THREE.Mesh(geom, trunkMat);
      mesh.position.set(-3, seg.y + seg.h / 2, -2);
      mesh.rotation.z = seg.rotZ;
      mesh.rotation.x = seg.rotX;
      mesh.castShadow = true;
      trunkGroup.add(mesh);
    }

    // Bark texture bumps - small cylinders along trunk for rough bark
    const barkMat = new StdMat({
      color: new THREE.Color(0x4a2e14),
      roughness: 1.0,
      metalness: 0.0,
    });

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const heightY = Math.random() * 10;
      const radiusAtY = 1.4 - (heightY / 12) * 0.9;
      const bumpGeom = new THREE.CylinderGeometry(0.08, 0.15, 0.6 + Math.random() * 0.5, 6);
      const bump = new THREE.Mesh(bumpGeom, barkMat);
      bump.position.set(
        -3 + Math.cos(angle) * (radiusAtY + 0.1),
        heightY,
        -2 + Math.sin(angle) * (radiusAtY + 0.1)
      );
      bump.rotation.z = Math.cos(angle) * 1.2;
      bump.rotation.x = Math.sin(angle) * 1.2;
      bump.castShadow = true;
      trunkGroup.add(bump);
    }

    this.treeGroup.add(trunkGroup);

    // ============================================================
    // BRANCHES - curved, organic, with sub-branches
    // ============================================================
    const branchMat = new StdMat({
      color: new THREE.Color(0x6b4226),
      roughness: 1.0,
      metalness: 0.0,
    });

    const branchDarkMat = new StdMat({
      color: new THREE.Color(0x553518),
      roughness: 1.0,
      metalness: 0.0,
    });

    // Main branches radiating from upper trunk
    const mainBranches = [
      { pos: [-3, 9.5, -2], rot: [0.2, 0.3, -0.7], len: 5, rBot: 0.22, rTop: 0.08 },
      { pos: [-3, 8.5, -2], rot: [-0.3, 0.8, 0.9], len: 4.5, rBot: 0.2, rTop: 0.07 },
      { pos: [-3, 10, -2], rot: [0.1, -0.2, -0.4], len: 4, rBot: 0.18, rTop: 0.06 },
      { pos: [-3, 8, -2], rot: [0.5, -0.5, 1.1], len: 3.5, rBot: 0.2, rTop: 0.07 },
      { pos: [-3, 10.5, -2], rot: [-0.4, 0.1, -0.3], len: 3, rBot: 0.15, rTop: 0.05 },
      { pos: [-3, 7.5, -2], rot: [0.0, 0.7, 1.3], len: 4, rBot: 0.18, rTop: 0.06 },
      { pos: [-3, 9, -2], rot: [-0.2, -0.6, -0.5], len: 3.5, rBot: 0.16, rTop: 0.05 },
    ];

    for (const cfg of mainBranches) {
      const geom = new THREE.CylinderGeometry(cfg.rTop, cfg.rBot, cfg.len, 10);
      const branch = new THREE.Mesh(geom, branchMat);
      branch.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      branch.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      branch.castShadow = true;
      this.treeGroup.add(branch);

      // Sub-branches off each main branch
      const subCount = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < subCount; j++) {
        const subLen = cfg.len * (0.3 + Math.random() * 0.3);
        const subGeom = new THREE.CylinderGeometry(0.02, 0.06, subLen, 6);
        const sub = new THREE.Mesh(subGeom, branchDarkMat);
        // Position along the main branch
        const t = 0.4 + Math.random() * 0.5;
        sub.position.set(
          cfg.pos[0] + Math.sin(cfg.rot[2]) * t * cfg.len * 0.3,
          cfg.pos[1] + t * cfg.len * 0.5,
          cfg.pos[2] + Math.cos(cfg.rot[0]) * t * cfg.len * 0.2
        );
        sub.rotation.set(
          cfg.rot[0] + (Math.random() - 0.5) * 1.2,
          cfg.rot[1] + (Math.random() - 0.5) * 1.5,
          cfg.rot[2] + (Math.random() - 0.5) * 1.0
        );
        sub.castShadow = true;
        this.treeGroup.add(sub);
      }
    }

    // ============================================================
    // FOLIAGE - IcosahedronGeometry clusters for organic look
    // ============================================================
    const foliageDarkMat = new StdMat({
      color: new THREE.Color(0x1e6b14),
      roughness: 0.9,
      metalness: 0.0,
      emissive: new THREE.Color(0x0f3a0a),
      emissiveIntensity: 0.05,
    });

    const foliageMidMat = new StdMat({
      color: new THREE.Color(0x2d7a1e),
      roughness: 0.9,
      metalness: 0.0,
      emissive: new THREE.Color(0x1a4a10),
      emissiveIntensity: 0.05,
    });

    const foliageLightMat = new StdMat({
      color: new THREE.Color(0x3d8a2e),
      roughness: 0.85,
      metalness: 0.0,
      emissive: new THREE.Color(0x2a5a1a),
      emissiveIntensity: 0.08,
    });

    const foliageMats = [foliageDarkMat, foliageMidMat, foliageLightMat];

    // Large foliage clusters - organic icosahedrons
    const foliageClusters: [number, number, number, number, number][] = [
      // [x, y, z, radius, detail]
      [-3, 11.5, -2, 4, 2],
      [-6, 10, -1, 3.2, 2],
      [-0.5, 10.5, -3.5, 2.8, 2],
      [-4.5, 12.5, -3, 3, 2],
      [-1.5, 11, -0.5, 3.5, 2],
      [-5, 10.5, -4, 2.5, 2],
      [-3.5, 10, -5, 2.2, 1],
      [-1, 9.5, -0.5, 2.5, 1],
      [-6.5, 9.5, 0.5, 2, 1],
      [-2, 12, -1.5, 2.8, 2],
      [-4, 13, -2, 2.5, 1],
      [-5.5, 11, -2.5, 2.8, 2],
      [-1.5, 13, -2.5, 2, 1],
      [-3, 14, -2, 2.2, 1],
      [-7, 9, 0, 1.8, 1],
      [0, 9, -2, 1.8, 1],
    ];

    for (let i = 0; i < foliageClusters.length; i++) {
      const [x, y, z, r, detail] = foliageClusters[i];
      const mat = foliageMats[i % foliageMats.length];
      const geom = new THREE.IcosahedronGeometry(r, detail);
      const foliage = new THREE.Mesh(geom, mat);
      foliage.position.set(x, y, z);
      // Slight random rotation for organic asymmetry
      foliage.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      this.treeGroup.add(foliage);
    }

    // Small foliage filler puffs
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 5;
      const x = -3 + Math.cos(angle) * dist;
      const z = -2 + Math.sin(angle) * dist;
      const y = 9 + Math.random() * 5;
      const r = 0.8 + Math.random() * 1.5;
      const mat = foliageMats[Math.floor(Math.random() * foliageMats.length)];
      const geom = new THREE.IcosahedronGeometry(r, 1);
      const puff = new THREE.Mesh(geom, mat);
      puff.position.set(x, y, z);
      puff.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      puff.castShadow = true;
      this.treeGroup.add(puff);
    }

    // ============================================================
    // GOLDEN PADAUK FLOWER CLUSTERS
    // ============================================================
    const flowerMat = new StdMat({
      color: new THREE.Color(0xffb800),
      roughness: 0.5,
      metalness: 0.1,
      emissive: new THREE.Color(0xffa000),
      emissiveIntensity: 0.4,
    });

    const flowerDeepMat = new StdMat({
      color: new THREE.Color(0xff8c00),
      roughness: 0.5,
      metalness: 0.1,
      emissive: new THREE.Color(0xff6600),
      emissiveIntensity: 0.35,
    });

    const flowerPositions: [number, number, number, number][] = [
      [-3, 12.5, -2, 2],
      [-6, 11, -1, 1.6],
      [-0.5, 11.5, -3.5, 1.4],
      [-2, 12.5, -0.5, 1.7],
      [-4.5, 12, -3, 1.5],
      [-3.5, 11, -5, 1.2],
      [-1.5, 12, 0.5, 1.3],
      [-5.5, 11.5, -2.5, 1.4],
      [-4, 13.5, -2, 1.3],
      [-3, 14.5, -2, 1.1],
      [-6.5, 10, 0.5, 1],
      [0, 10, -2, 1],
      [-1.5, 13.5, -2.5, 0.9],
      [-5, 12, -4, 0.8],
    ];

    for (let i = 0; i < flowerPositions.length; i++) {
      const [x, y, z, r] = flowerPositions[i];
      const mat = i % 3 === 0 ? flowerDeepMat : flowerMat;
      const geom = new THREE.IcosahedronGeometry(r, 1);
      const flower = new THREE.Mesh(geom, mat);
      flower.position.set(x, y, z);
      flower.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      flower.castShadow = true;
      this.treeGroup.add(flower);
    }

    // Small flower scatter
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 1.5 + Math.random() * 4.5;
      const x = -3 + Math.cos(angle) * dist;
      const z = -2 + Math.sin(angle) * dist;
      const y = 10 + Math.random() * 4;
      const r = 0.4 + Math.random() * 0.7;
      const geom = new THREE.IcosahedronGeometry(r, 1);
      const flower = new THREE.Mesh(geom, flowerMat);
      flower.position.set(x, y, z);
      flower.castShadow = true;
      this.treeGroup.add(flower);
    }

    // ============================================================
    // ROOT SYSTEM - thick, gnarled, reaching into ground
    // ============================================================
    const rootMat = new StdMat({
      color: new THREE.Color(0x4a2a10),
      roughness: 1.0,
      metalness: 0.0,
    });

    const rootLightMat = new StdMat({
      color: new THREE.Color(0x5c3818),
      roughness: 1.0,
      metalness: 0.0,
    });

    // Primary roots - thick, visible above ground
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
      const length = 2.5 + Math.random() * 2;
      const geom = new THREE.CylinderGeometry(0.08, 0.35, length, 8);
      const root = new THREE.Mesh(geom, rootMat);
      root.position.set(
        -3 + Math.cos(angle) * 1.6,
        0.3,
        -2 + Math.sin(angle) * 1.6
      );
      root.rotation.z = Math.cos(angle) * 1.1;
      root.rotation.x = Math.sin(angle) * 1.1;
      root.castShadow = true;
      this.treeGroup.add(root);

      // Root tips curving down into ground
      const tipGeom = new THREE.CylinderGeometry(0.03, 0.08, 1.2, 6);
      const tip = new THREE.Mesh(tipGeom, rootLightMat);
      tip.position.set(
        -3 + Math.cos(angle) * (1.6 + length * 0.4),
        -0.2,
        -2 + Math.sin(angle) * (1.6 + length * 0.4)
      );
      tip.rotation.z = Math.cos(angle) * 1.3;
      tip.rotation.x = Math.sin(angle) * 1.3;
      tip.castShadow = true;
      this.treeGroup.add(tip);
    }

    // Secondary roots - smaller, more numerous
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const length = 1.5 + Math.random() * 1.5;
      const geom = new THREE.CylinderGeometry(0.04, 0.15, length, 6);
      const root = new THREE.Mesh(geom, rootLightMat);
      root.position.set(
        -3 + Math.cos(angle) * 1.2,
        0.15,
        -2 + Math.sin(angle) * 1.2
      );
      root.rotation.z = Math.cos(angle) * 1.2;
      root.rotation.x = Math.sin(angle) * 1.2;
      root.castShadow = true;
      this.treeGroup.add(root);
    }

    // Buttress roots - flared base
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const geom = new THREE.CylinderGeometry(0.3, 0.8, 2, 8);
      const buttress = new THREE.Mesh(geom, rootMat);
      buttress.position.set(
        -3 + Math.cos(angle) * 0.8,
        1,
        -2 + Math.sin(angle) * 0.8
      );
      buttress.rotation.z = Math.cos(angle) * 0.4;
      buttress.rotation.x = Math.sin(angle) * 0.4;
      buttress.castShadow = true;
      this.treeGroup.add(buttress);
    }
  }

  private createPetals(useWebGPU: boolean): void {
    this.petalPositions = new Float32Array(this.petalCount * 3);
    this.petalVelocities = new Float32Array(this.petalCount * 3);

    for (let i = 0; i < this.petalCount; i++) {
      const i3 = i * 3;
      this.petalPositions[i3] = -3 + (Math.random() - 0.5) * 14;
      this.petalPositions[i3 + 1] = 8 + Math.random() * 7;
      this.petalPositions[i3 + 2] = -2 + (Math.random() - 0.5) * 14;

      this.petalVelocities[i3] = (Math.random() - 0.5) * 0.4;
      this.petalVelocities[i3 + 1] = -0.2 - Math.random() * 0.35;
      this.petalVelocities[i3 + 2] = (Math.random() - 0.5) * 0.4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.petalPositions, 3)
    );

    const material: THREE.Material = useWebGPU
      ? createPetalMaterial()
      : createFallbackPetalMaterial();

    this.petalSystem = new THREE.Points(geometry, material);
    this.scene.add(this.petalSystem);
  }

  update(elapsed: number, delta: number): void {
    for (let i = 0; i < this.petalCount; i++) {
      const i3 = i * 3;

      const windX = Math.sin(elapsed * 0.5 + i * 0.1) * 0.25
        + Math.sin(elapsed * 1.2 + i * 0.05) * 0.1;
      const windZ = Math.cos(elapsed * 0.3 + i * 0.15) * 0.2
        + Math.cos(elapsed * 0.8 + i * 0.08) * 0.08;
      const tumble = Math.sin(elapsed * 2 + i * 0.3) * 0.05;

      this.petalPositions[i3] += (this.petalVelocities[i3] + windX + tumble) * delta;
      this.petalPositions[i3 + 1] += this.petalVelocities[i3 + 1] * delta;
      this.petalPositions[i3 + 2] += (this.petalVelocities[i3 + 2] + windZ) * delta;

      if (this.petalPositions[i3 + 1] < 0) {
        this.petalPositions[i3] = -3 + (Math.random() - 0.5) * 14;
        this.petalPositions[i3 + 1] = 9 + Math.random() * 6;
        this.petalPositions[i3 + 2] = -2 + (Math.random() - 0.5) * 14;
      }
    }

    (
      this.petalSystem.geometry.attributes.position as THREE.BufferAttribute
    ).needsUpdate = true;
  }
}
