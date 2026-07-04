import * as THREE from 'three/webgpu';
import { GhibliMaterial } from '../Shaders/GhibliMaterial';

export class Architecture {
  scene: THREE.Scene;
  private group: THREE.Group;

  constructor(scene: THREE.Scene, useWebGPU: boolean = true) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.createHouse(useWebGPU);
    this.createTemples(useWebGPU);
    this.scene.add(this.group);
  }

  private createHouse(useWebGPU: boolean): void {
    const houseGroup = new THREE.Group();

    const mat = (opts: {
      color: number;
      shadowColor?: number;
      highlightColor?: number;
      emissiveStrength?: number;
      rimStrength?: number;
      roughness?: number;
      metalness?: number;
      emissive?: number;
      emissiveIntensity?: number;
    }) => {
      if (useWebGPU) {
        return new GhibliMaterial({
          color: opts.color,
          shadowColor: opts.shadowColor,
          highlightColor: opts.highlightColor,
          emissiveStrength: opts.emissiveStrength,
          rimStrength: opts.rimStrength,
        });
      }
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(opts.color),
        roughness: opts.roughness ?? 1.0,
        metalness: opts.metalness ?? 0.0,
        ...(opts.emissive !== undefined ? {
          emissive: new THREE.Color(opts.emissive),
          emissiveIntensity: opts.emissiveIntensity ?? 0.1,
        } : {}),
      });
    };

    // --- Materials ---
    const woodMat = mat({ color: 0x8b5e3c });

    const woodDarkMat = mat({ color: 0x6b4226, shadowColor: 0x4a2e14 });

    const wallMat = mat({ color: 0xf5e6c8 });

    const roofMat = mat({ color: 0x5a3520, shadowColor: 0x3a1510 });

    const roofTileMat = mat({ color: 0x6b4030 });

    const thatchMat = mat({ color: 0x9a7a50 });

    // --- Main house body ---
    const bodyGeom = new THREE.BoxGeometry(5, 3, 4);
    const body = new THREE.Mesh(bodyGeom, wallMat);
    body.position.set(5, 1.5, 2);
    body.castShadow = true;
    body.receiveShadow = true;
    houseGroup.add(body);

    // Wall detail panels (inset sections)
    const panelMat = mat({ color: 0xe8d4b0 });

    // Front wall panels
    for (let i = -1; i <= 1; i++) {
      const panelGeom = new THREE.BoxGeometry(1.2, 2.4, 0.05);
      const panel = new THREE.Mesh(panelGeom, panelMat);
      panel.position.set(5 + i * 1.5, 1.5, 4.03);
      houseGroup.add(panel);
    }

    // --- Curved traditional Asian roof ---
    const roofProfile = new THREE.Shape();
    // Create a curved roof profile with slight upturn at eaves
    roofProfile.moveTo(-3.5, 0);
    roofProfile.quadraticCurveTo(-3.2, 0.8, -2.0, 1.6);
    roofProfile.quadraticCurveTo(-1.0, 2.2, 0, 2.6);
    roofProfile.quadraticCurveTo(1.0, 2.2, 2.0, 1.6);
    roofProfile.quadraticCurveTo(3.2, 0.8, 3.5, 0);
    roofProfile.lineTo(-3.5, 0);

    const roofGeom = new THREE.ExtrudeGeometry(roofProfile, {
      depth: 5.5,
      bevelEnabled: false,
    });

    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.set(5, 3, -0.75);
    roof.castShadow = true;
    houseGroup.add(roof);

    // Roof ridge beam
    const ridgeGeom = new THREE.CylinderGeometry(0.08, 0.08, 5.5, 6);
    const ridge = new THREE.Mesh(ridgeGeom, woodDarkMat);
    ridge.rotation.x = Math.PI / 2;
    ridge.position.set(5, 5.6, 2);
    houseGroup.add(ridge);

    // Roof tile rows
    for (let row = 0; row < 4; row++) {
      const rowY = 3.3 + row * 0.55;
      const rowWidth = 3.2 - row * 0.3;
      const tileGeom = new THREE.BoxGeometry(rowWidth * 2, 0.08, 0.4);
      const tileRow = new THREE.Mesh(tileGeom, roofTileMat);
      tileRow.position.set(5, rowY, 2);
      tileRow.castShadow = true;
      houseGroup.add(tileRow);
    }

    // Eave decorations - curved end pieces
    for (const side of [-1, 1]) {
      const eaveGeom = new THREE.CylinderGeometry(0.06, 0.12, 0.8, 6);
      const eave = new THREE.Mesh(eaveGeom, woodDarkMat);
      eave.position.set(5, 3.2, 2 + side * 2.6);
      eave.rotation.x = side * 0.5;
      houseGroup.add(eave);
    }

    // --- Wooden support pillars with base and cap ---
    const pillarPositions = [
      [2.8, 2 + 1.6], [2.8, 2 - 1.6],
      [7.2, 2 + 1.6], [7.2, 2 - 1.6],
      [5, 2 + 1.6], [5, 2 - 1.6],
    ];

    for (const [px, pz] of pillarPositions) {
      // Main pillar
      const pillarGeom = new THREE.CylinderGeometry(0.12, 0.14, 3.2, 8);
      const pillar = new THREE.Mesh(pillarGeom, woodMat);
      pillar.position.set(px, 1.6, pz);
      pillar.castShadow = true;
      houseGroup.add(pillar);

      // Pillar base stone
      const baseGeom = new THREE.CylinderGeometry(0.2, 0.22, 0.2, 8);
      const base = new THREE.Mesh(baseGeom, mat({ color: 0x999988 }));
      base.position.set(px, 0.1, pz);
      houseGroup.add(base);

      // Pillar cap
      const capGeom = new THREE.CylinderGeometry(0.16, 0.12, 0.15, 8);
      const cap = new THREE.Mesh(capGeom, woodDarkMat);
      cap.position.set(px, 3.2, pz);
      houseGroup.add(cap);
    }

    // --- Cross beams between pillars ---
    const beamPositions = [
      { start: [2.8, 2.8, 0.4], end: [7.2, 2.8, 0.4] },
      { start: [2.8, 2.8, 3.6], end: [7.2, 2.8, 3.6] },
    ];

    for (const beam of beamPositions) {
      const dx = beam.end[0] - beam.start[0];
      const dy = beam.end[1] - beam.start[1];
      const dz = beam.end[2] - beam.start[2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const beamGeom = new THREE.BoxGeometry(len, 0.12, 0.12);
      const beamMesh = new THREE.Mesh(beamGeom, woodDarkMat);
      beamMesh.position.set(
        (beam.start[0] + beam.end[0]) / 2,
        (beam.start[1] + beam.end[1]) / 2,
        (beam.start[2] + beam.end[2]) / 2
      );
      beamMesh.castShadow = true;
      houseGroup.add(beamMesh);
    }

    // --- Windows with warm glow and shutters ---
    const windowMat = mat({ color: 0x87ceeb, emissive: 0xffd700, emissiveIntensity: 0.4 });

    const frameMat = mat({ color: 0x5c3317 });

    const shutterMat = mat({ color: 0x7a5030 });

    const windowPositions = [
      { x: 5, y: 2.2, z: 4.02, ry: 0 },
      { x: 5, y: 2.2, z: -0.02, ry: Math.PI },
      { x: 2.52, y: 2.2, z: 2, ry: Math.PI / 2 },
      { x: 7.48, y: 2.2, z: 2, ry: -Math.PI / 2 },
    ];

    for (const wp of windowPositions) {
      // Window pane
      const windowGeom = new THREE.PlaneGeometry(0.9, 0.9);
      const window = new THREE.Mesh(windowGeom, windowMat);
      window.position.set(wp.x, wp.y, wp.z);
      window.rotation.y = wp.ry;
      houseGroup.add(window);

      // Cross frame
      const frameV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), frameMat);
      frameV.position.set(wp.x, wp.y, wp.z + Math.cos(wp.ry) * 0.01);
      frameV.rotation.y = wp.ry;
      houseGroup.add(frameV);

      const frameH = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), frameMat);
      frameH.position.set(wp.x, wp.y, wp.z + Math.cos(wp.ry) * 0.01);
      frameH.rotation.y = wp.ry;
      houseGroup.add(frameH);

      // Shutters (open, angled outward)
      for (const side of [-1, 1]) {
        const shutterGeom = new THREE.BoxGeometry(0.5, 0.9, 0.04);
        const shutter = new THREE.Mesh(shutterGeom, shutterMat);
        const offset = side * 0.55;
        shutter.position.set(
          wp.x + Math.sin(wp.ry) * offset,
          wp.y,
          wp.z + Math.cos(wp.ry) * offset
        );
        shutter.rotation.y = wp.ry + side * 0.3;
        houseGroup.add(shutter);
      }
    }

    // --- Door ---
    const doorMat = mat({ color: 0x5c3317 });
    const doorGeom = new THREE.BoxGeometry(1.1, 2.1, 0.08);
    const door = new THREE.Mesh(doorGeom, doorMat);
    door.position.set(7, 1.05, 4.02);
    houseGroup.add(door);

    // Door frame
    const doorFrameGeom = new THREE.BoxGeometry(1.3, 2.3, 0.06);
    const doorFrame = new THREE.Mesh(doorFrameGeom, woodDarkMat);
    doorFrame.position.set(7, 1.15, 4.04);
    houseGroup.add(doorFrame);

    // Door handle
    const handleGeom = new THREE.SphereGeometry(0.06, 8, 6);
    const handleMat = mat({ color: 0x888888 });
    const handle = new THREE.Mesh(handleGeom, handleMat);
    handle.position.set(7.35, 1.1, 4.1);
    houseGroup.add(handle);

    // --- Porch platform with railing ---
    const porchGeom = new THREE.BoxGeometry(6.5, 0.25, 2.5);
    const porch = new THREE.Mesh(porchGeom, woodMat);
    porch.position.set(5, 0.12, 4.25);
    porch.receiveShadow = true;
    houseGroup.add(porch);

    // Porch steps
    for (let step = 0; step < 3; step++) {
      const stepGeom = new THREE.BoxGeometry(2.5 - step * 0.1, 0.15, 0.4);
      const stepMesh = new THREE.Mesh(stepGeom, woodMat);
      stepMesh.position.set(5, -0.1 - step * 0.15, 5.5 + step * 0.4);
      stepMesh.receiveShadow = true;
      houseGroup.add(stepMesh);
    }

    // Porch railing posts
    const railingMat = mat({ color: 0x7a5030 });

    for (let i = -2; i <= 2; i++) {
      // Front railing
      const postGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
      const post = new THREE.Mesh(postGeom, railingMat);
      post.position.set(5 + i * 1.2, 0.65, 5.4);
      houseGroup.add(post);
    }

    // Railing top rail
    const railGeom = new THREE.BoxGeometry(5, 0.06, 0.06);
    const rail = new THREE.Mesh(railGeom, railingMat);
    rail.position.set(5, 1.05, 5.4);
    houseGroup.add(rail);

    // Railing bottom rail
    const railBottomGeom = new THREE.BoxGeometry(5, 0.06, 0.06);
    const railBottom = new THREE.Mesh(railBottomGeom, railingMat);
    railBottom.position.set(5, 0.35, 5.4);
    houseGroup.add(railBottom);

    // --- Fence around property ---
    const fenceMat = mat({ color: 0x8b6a4a });

    // Front fence
    for (let i = -3; i <= 3; i++) {
      const fencePostGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6);
      const fencePost = new THREE.Mesh(fencePostGeom, fenceMat);
      fencePost.position.set(5 + i * 1.0, 0.5, 7.0);
      houseGroup.add(fencePost);
    }

    // Fence rails
    for (const railY of [0.35, 0.75]) {
      const fRailGeom = new THREE.BoxGeometry(7.2, 0.04, 0.04);
      const fRail = new THREE.Mesh(fRailGeom, fenceMat);
      fRail.position.set(5, railY, 7.0);
      houseGroup.add(fRail);
    }

    // Side fences
    for (const side of [-1, 1]) {
      for (let i = 0; i <= 4; i++) {
        const fencePostGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6);
        const fencePost = new THREE.Mesh(fencePostGeom, fenceMat);
        fencePost.position.set(5 + side * 3.6, 0.5, 3.5 + i * 0.8);
        houseGroup.add(fencePost);
      }
    }

    // --- Lanterns ---
    const lanternMat = mat({ color: 0xffaa44, emissive: 0xff8800, emissiveStrength: 0.3 });

    const lanternFrameMat = mat({ color: 0x5c3317 });

    for (const xOff of [-2, 0, 2]) {
      // Lantern body
      const lanternGeom = new THREE.SphereGeometry(0.15, 8, 6);
      const lantern = new THREE.Mesh(lanternGeom, lanternMat);
      lantern.position.set(5 + xOff, 2.5, 4.5);
      houseGroup.add(lantern);

      // Lantern hook
      const hookGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4);
      const hook = new THREE.Mesh(hookGeom, lanternFrameMat);
      hook.position.set(5 + xOff, 2.7, 4.5);
      houseGroup.add(hook);
    }

    this.group.add(houseGroup);
  }

  private createTemples(useWebGPU: boolean): void {
    const mat = (opts: {
      color: number;
      shadowColor?: number;
      highlightColor?: number;
      emissiveStrength?: number;
      rimStrength?: number;
      roughness?: number;
      metalness?: number;
      emissive?: number;
      emissiveIntensity?: number;
    }) => {
      if (useWebGPU) {
        return new GhibliMaterial({
          color: opts.color,
          shadowColor: opts.shadowColor,
          highlightColor: opts.highlightColor,
          emissiveStrength: opts.emissiveStrength,
          rimStrength: opts.rimStrength,
        });
      }
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(opts.color),
        roughness: opts.roughness ?? 1.0,
        metalness: opts.metalness ?? 0.0,
        ...(opts.emissive !== undefined ? {
          emissive: new THREE.Color(opts.emissive),
          emissiveIntensity: opts.emissiveIntensity ?? 0.1,
        } : {}),
      });
    };

    const templeMat = mat({ color: 0xc4a265, shadowColor: 0x8a6a3a });

    const templeDarkMat = mat({ color: 0xa0804a });

    const templeLightMat = mat({ color: 0xd4b878 });

    const goldMat = mat({ color: 0xd4a520, emissiveStrength: 0.2, rimStrength: 0.5 });

    // Temple configs: { x, z, scale, height, variant }
    const templeConfigs = [
      { x: 30, z: -40, scale: 1.0, height: 16, variant: 'large' as const },
      { x: -25, z: -50, scale: 0.85, height: 14, variant: 'medium' as const },
      { x: 45, z: -55, scale: 0.65, height: 11, variant: 'small' as const },
      { x: -40, z: -45, scale: 0.75, height: 12, variant: 'medium' as const },
      { x: 15, z: -60, scale: 0.55, height: 9, variant: 'small' as const },
      { x: -10, z: -65, scale: 0.45, height: 8, variant: 'small' as const },
      { x: 55, z: -48, scale: 0.5, height: 10, variant: 'small' as const },
      { x: -50, z: -58, scale: 0.4, height: 7, variant: 'small' as const },
      { x: 20, z: -70, scale: 0.35, height: 6, variant: 'small' as const },
      { x: -35, z: -65, scale: 0.3, height: 5, variant: 'small' as const },
      { x: 40, z: -65, scale: 0.6, height: 10, variant: 'medium' as const },
      { x: -15, z: -55, scale: 0.7, height: 11, variant: 'medium' as const },
    ];

    for (const cfg of templeConfigs) {
      const temple = this.createSingleTemple(
        cfg.height,
        cfg.variant,
        templeMat,
        templeDarkMat,
        templeLightMat,
        goldMat
      );
      temple.position.set(cfg.x, 0, cfg.z);
      temple.scale.setScalar(cfg.scale);
      this.group.add(temple);
    }
  }

  private createSingleTemple(
    height: number,
    variant: 'small' | 'medium' | 'large',
    mainMat: THREE.Material,
    darkMat: THREE.Material,
    lightMat: THREE.Material,
    goldMat: THREE.Material
  ): THREE.Group {
    const temple = new THREE.Group();

    // ============================================================
    // SQUARE BASE - stepped terraces (3 tiers for large, 2 for others)
    // ============================================================
    const tierCount = variant === 'large' ? 4 : variant === 'medium' ? 3 : 2;
    const baseWidth = variant === 'large' ? 6 : variant === 'medium' ? 5 : 4;

    for (let i = 0; i < tierCount; i++) {
      const t = i / tierCount;
      const tierW = baseWidth * (1 - t * 0.6);
      const tierH = height * 0.08;
      const tierY = i * tierH + tierH / 2;

      const tierGeom = new THREE.BoxGeometry(tierW, tierH, tierW);
      const mat = i % 2 === 0 ? mainMat : darkMat;
      const tier = new THREE.Mesh(tierGeom, mat);
      tier.position.y = tierY;
      tier.castShadow = true;
      tier.receiveShadow = true;
      temple.add(tier);

      // Corner stupas on base tiers
      if (i < tierCount - 1 && variant !== 'small') {
        for (let c = 0; c < 4; c++) {
          const angle = (c / 4) * Math.PI * 2 + Math.PI / 4;
          const cornerGeom = new THREE.CylinderGeometry(0.12, 0.18, tierH * 1.5, 6);
          const corner = new THREE.Mesh(cornerGeom, lightMat);
          corner.position.set(
            Math.cos(angle) * tierW * 0.4,
            tierY + tierH * 0.5,
            Math.sin(angle) * tierW * 0.4
          );
          temple.add(corner);
        }
      }
    }

    // ============================================================
    // BELL-SHAPED BODY - using LatheGeometry for authentic stupa profile
    // ============================================================
    const bodyBaseY = tierCount * height * 0.08;
    const bodyHeight = height * 0.4;

    // Bagan stupa bell profile
    const bellProfile: THREE.Vector2[] = [];
    const bellSegments = 30;

    for (let i = 0; i <= bellSegments; i++) {
      const t = i / bellSegments;
      const y = t * bodyHeight;

      let r: number;
      if (t < 0.05) {
        // Base flare
        r = 1.8 + (0.05 - t) * 8;
      } else if (t < 0.15) {
        // Base curve
        const bt = (t - 0.05) / 0.1;
        r = 1.8 - bt * 0.3;
      } else if (t < 0.5) {
        // Main bell bulge
        const bt = (t - 0.15) / 0.35;
        r = 1.5 + Math.sin(bt * Math.PI) * 0.5;
      } else if (t < 0.8) {
        // Upper taper
        const bt = (t - 0.5) / 0.3;
        r = 1.5 * (1 - bt * 0.6);
      } else {
        // Neck taper
        const bt = (t - 0.8) / 0.2;
        r = 0.6 * (1 - bt * 0.5);
      }

      bellProfile.push(new THREE.Vector2(r, y));
    }

    const bellGeom = new THREE.LatheGeometry(bellProfile, 24);
    const bell = new THREE.Mesh(bellGeom, mainMat);
    bell.position.y = bodyBaseY;
    bell.castShadow = true;
    bell.receiveShadow = true;
    temple.add(bell);

    // Horizontal ring decorations on the bell
    const ringCount = variant === 'large' ? 5 : 3;
    for (let i = 0; i < ringCount; i++) {
      const ringT = 0.2 + (i / ringCount) * 0.5;
      const ringY = bodyBaseY + ringT * bodyHeight;
      const ringR = 1.5 + Math.sin(ringT * Math.PI) * 0.5 + 0.05;
      const ringGeom = new THREE.TorusGeometry(ringR, 0.04, 8, 24);
      const ring = new THREE.Mesh(ringGeom, darkMat);
      ring.position.y = ringY;
      ring.rotation.x = Math.PI / 2;
      temple.add(ring);
    }

    // ============================================================
    // TAPERING SPIRE - multiple stacked rings and cone
    // ============================================================
    const spireBaseY = bodyBaseY + bodyHeight;
    const spireHeight = height * 0.35;

    // Spire base platform
    const spireBaseGeom = new THREE.CylinderGeometry(0.8, 1.0, 0.3, 12);
    const spireBase = new THREE.Mesh(spireBaseGeom, darkMat);
    spireBase.position.y = spireBaseY;
    temple.add(spireBase);

    // Stacked diminishing rings
    const ringSteps = variant === 'large' ? 8 : variant === 'medium' ? 6 : 4;
    for (let i = 0; i < ringSteps; i++) {
      const t = i / ringSteps;
      const ringR = 0.8 * (1 - t * 0.7);
      const ringH = spireHeight * 0.06;
      const ringGeom = new THREE.CylinderGeometry(ringR * 0.9, ringR, ringH, 12);
      const ringMat = i % 2 === 0 ? lightMat : mainMat;
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.y = spireBaseY + 0.3 + i * ringH;
      ring.castShadow = true;
      temple.add(ring);
    }

    // Main spire cone
    const spireConeGeom = new THREE.ConeGeometry(0.4, spireHeight * 0.5, 12);
    const spireCone = new THREE.Mesh(spireConeGeom, mainMat);
    spireCone.position.y = spireBaseY + 0.3 + ringSteps * (spireHeight * 0.06);
    spireCone.castShadow = true;
    temple.add(spireCone);

    // ============================================================
    // ORNAMENTAL TOP - golden finial
    // ============================================================
    const finialY = spireBaseY + spireHeight;

    // Lotus base
    const lotusGeom = new THREE.CylinderGeometry(0.15, 0.25, 0.2, 8);
    const lotus = new THREE.Mesh(lotusGeom, goldMat);
    lotus.position.y = finialY;
    temple.add(lotus);

    // Main ornament
    const ornGeom = new THREE.SphereGeometry(0.2, 12, 10);
    const orn = new THREE.Mesh(ornGeom, goldMat);
    orn.position.y = finialY + 0.3;
    temple.add(orn);

    // Spire tip
    const tipGeom = new THREE.ConeGeometry(0.08, 0.5, 8);
    const tip = new THREE.Mesh(tipGeom, goldMat);
    tip.position.y = finialY + 0.7;
    temple.add(tip);

    // Small umbrella (hti) at very top
    const htiGeom = new THREE.ConeGeometry(0.15, 0.15, 8);
    const hti = new THREE.Mesh(htiGeom, goldMat);
    hti.position.y = finialY + 1.0;
    temple.add(hti);

    return temple;
  }
}
