import * as THREE from 'three/webgpu';
import { createCloudMaterial } from '../Shaders/CloudMaterial';
import { createFallbackCloudMaterial } from '../Shaders/FallbackMaterials';

export class Sky {
  scene: THREE.Scene;
  private clouds: THREE.Group[] = [];
  private cloudGroup: THREE.Group;
  private skyDome!: THREE.Mesh;

  constructor(scene: THREE.Scene, useWebGPU: boolean = true) {
    this.scene = scene;
    this.cloudGroup = new THREE.Group();
    this.createSkyDome();
    this.createClouds(useWebGPU);
    this.scene.add(this.cloudGroup);
  }

  private createSkyDome(): void {
    // Large sky sphere with gradient from warm horizon to cool zenith
    const skyGeom = new THREE.SphereGeometry(200, 32, 32);

    // Custom shader for sky gradient
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x4a90d9) },
        midColor: { value: new THREE.Color(0x87ceeb) },
        horizonColor: { value: new THREE.Color(0xffeedd) },
        sunColor: { value: new THREE.Color(0xffeebb) },
        offset: { value: 10 },
        exponent: { value: 0.4 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 sunColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;

        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;

          // Three-band gradient: horizon -> mid -> zenith
          vec3 color;
          if (h < 0.0) {
            color = horizonColor;
          } else if (h < 0.3) {
            float t = h / 0.3;
            color = mix(horizonColor, midColor, t);
          } else {
            float t = (h - 0.3) / 0.7;
            color = mix(midColor, topColor, pow(t, exponent));
          }

          // Subtle warm glow near horizon
          float horizonGlow = pow(1.0 - abs(h), 8.0);
          color = mix(color, sunColor, horizonGlow * 0.3);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    this.skyDome = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(this.skyDome);
  }

  private createClouds(useWebGPU: boolean): void {
    const material: THREE.Material = useWebGPU
      ? createCloudMaterial()
      : createFallbackCloudMaterial();

    // ============================================================
    // MASSIVE CUMULUS CLOUDS - dramatic, Ghibli-style
    // ============================================================
    const cumulusConfigs = [
      // Near dramatic clouds (huge, detailed)
      { x: 25, y: 24, z: -25, sx: 12, sy: 5, sz: 8, puffs: 12 },
      { x: -35, y: 27, z: -30, sx: 14, sy: 6, sz: 9, puffs: 14 },
      { x: 10, y: 30, z: -45, sx: 16, sy: 7, sz: 10, puffs: 15 },
      { x: -15, y: 22, z: -20, sx: 10, sy: 4.5, sz: 7, puffs: 10 },

      // Mid-distance clouds
      { x: 50, y: 22, z: -18, sx: 9, sy: 4, sz: 6, puffs: 9 },
      { x: -55, y: 26, z: -35, sx: 11, sy: 5, sz: 7, puffs: 11 },
      { x: 40, y: 29, z: -50, sx: 13, sy: 5.5, sz: 8, puffs: 12 },
      { x: -20, y: 28, z: -40, sx: 10, sy: 4.5, sz: 6.5, puffs: 10 },
      { x: 60, y: 25, z: -55, sx: 8, sy: 3.5, sz: 5.5, puffs: 8 },

      // Far atmospheric clouds
      { x: -70, y: 24, z: -60, sx: 7, sy: 3, sz: 5, puffs: 7 },
      { x: 70, y: 28, z: -65, sx: 9, sy: 4, sz: 6, puffs: 8 },
      { x: 0, y: 32, z: -70, sx: 11, sy: 4.5, sz: 7, puffs: 9 },
      { x: -45, y: 30, z: -75, sx: 8, sy: 3.5, sz: 5.5, puffs: 7 },
    ];

    for (const cfg of cumulusConfigs) {
      const cloud = this.createCumulusCluster(cfg.sx, cfg.sy, cfg.sz, cfg.puffs, material);
      cloud.position.set(cfg.x, cfg.y, cfg.z);
      this.clouds.push(cloud);
      this.cloudGroup.add(cloud);
    }

    // ============================================================
    // WISPY CIRRUS CLOUDS - high altitude, thin and streaky
    // ============================================================
    const cirrusMat = useWebGPU
      ? createCloudMaterial()
      : createFallbackCloudMaterial();

    for (let i = 0; i < 8; i++) {
      const cirrus = this.createCirrusCloud(material);
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 60;
      cirrus.position.set(
        Math.cos(angle) * dist,
        35 + Math.random() * 15,
        Math.sin(angle) * dist - 30
      );
      cirrus.rotation.y = Math.random() * Math.PI;
      this.clouds.push(cirrus);
      this.cloudGroup.add(cirrus);
    }

    // ============================================================
    // LOW HANGING MIST / FOG BANKS
    // ============================================================
    for (let i = 0; i < 6; i++) {
      const mist = this.createMistCloud(material);
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 40;
      mist.position.set(
        Math.cos(angle) * dist,
        2 + Math.random() * 3,
        Math.sin(angle) * dist - 20
      );
      this.clouds.push(mist);
      this.cloudGroup.add(mist);
    }
  }

  private createCumulusCluster(
    sx: number,
    sy: number,
    sz: number,
    puffCount: number,
    material: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();

    // Main cloud body - slightly flattened sphere
    const mainGeom = new THREE.SphereGeometry(1, 20, 16);
    const main = new THREE.Mesh(mainGeom, material);
    main.scale.set(sx, sy * 0.7, sz);
    group.add(main);

    // Bottom flat base (cumulus clouds have flat bottoms)
    const baseGeom = new THREE.CylinderGeometry(sx * 0.8, sx * 0.9, sy * 0.3, 16);
    const base = new THREE.Mesh(baseGeom, material);
    base.position.y = -sy * 0.3;
    group.add(base);

    // Puffy sub-spheres for realistic cumulus look
    for (let i = 0; i < puffCount; i++) {
      const puffSize = 0.4 + Math.random() * 0.7;
      const puffGeom = new THREE.SphereGeometry(puffSize, 14, 10);
      const puff = new THREE.Mesh(puffGeom, material);

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * sx * 0.65;
      puff.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.3) * sy * 0.4,
        Math.sin(angle) * radius * 0.5
      );
      puff.scale.set(
        0.5 + Math.random() * 0.9,
        0.3 + Math.random() * 0.6,
        0.5 + Math.random() * 0.7
      );
      group.add(puff);
    }

    // Towering top puffs (Ghibli-style dramatic vertical clouds)
    const topCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < topCount; i++) {
      const puffGeom = new THREE.SphereGeometry(
        0.3 + Math.random() * 0.5, 12, 8
      );
      const puff = new THREE.Mesh(puffGeom, material);
      puff.position.set(
        (Math.random() - 0.5) * sx * 0.35,
        sy * 0.3 + Math.random() * sy * 0.5,
        (Math.random() - 0.5) * sz * 0.25
      );
      puff.scale.set(
        0.6 + Math.random() * 0.5,
        0.8 + Math.random() * 0.6,
        0.6 + Math.random() * 0.4
      );
      group.add(puff);
    }

    // Edge wisps - smaller puffs trailing off
    for (let i = 0; i < 4; i++) {
      const puffGeom = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 8, 6);
      const puff = new THREE.Mesh(puffGeom, material);
      const side = Math.random() > 0.5 ? 1 : -1;
      puff.position.set(
        side * (sx * 0.5 + Math.random() * sx * 0.3),
        (Math.random() - 0.4) * sy * 0.3,
        (Math.random() - 0.5) * sz * 0.3
      );
      puff.scale.set(
        0.3 + Math.random() * 0.4,
        0.2 + Math.random() * 0.3,
        0.3 + Math.random() * 0.3
      );
      group.add(puff);
    }

    return group;
  }

  private createCirrusCloud(material: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Thin, stretched wisps
    const wispCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < wispCount; i++) {
      const wispGeom = new THREE.SphereGeometry(1, 8, 6);
      const wisp = new THREE.Mesh(wispGeom, material);

      // Highly stretched horizontally, very thin vertically
      wisp.scale.set(
        3 + Math.random() * 5,
        0.08 + Math.random() * 0.12,
        0.5 + Math.random() * 1.0
      );

      wisp.position.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 3
      );

      wisp.rotation.y = Math.random() * 0.5;
      group.add(wisp);
    }

    return group;
  }

  private createMistCloud(material: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Low, wide, thin mist
    const mistGeom = new THREE.SphereGeometry(1, 12, 8);
    const mist = new THREE.Mesh(mistGeom, material);
    mist.scale.set(8 + Math.random() * 6, 0.5 + Math.random() * 0.5, 5 + Math.random() * 4);
    group.add(mist);

    // Sub wisps
    for (let i = 0; i < 3; i++) {
      const wispGeom = new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 8, 6);
      const wisp = new THREE.Mesh(wispGeom, material);
      wisp.scale.set(
        2 + Math.random() * 3,
        0.2 + Math.random() * 0.3,
        1.5 + Math.random() * 2
      );
      wisp.position.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 4
      );
      group.add(wisp);
    }

    return group;
  }

  update(elapsed: number): void {
    // Slowly drift clouds with varied speeds
    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i];
      const speed = 0.002 + (i % 3) * 0.001;
      cloud.position.x += Math.sin(elapsed * 0.01 + i * 0.7) * speed;
      cloud.position.z += Math.cos(elapsed * 0.008 + i * 0.5) * speed * 0.4;
      cloud.position.y += Math.sin(elapsed * 0.015 + i * 1.1) * 0.0003;
    }
  }
}
