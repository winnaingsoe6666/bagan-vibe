import * as THREE from 'three/webgpu';
import { Input } from './Input';
import { Time } from '../Utils/Time';
import { GhibliMaterial } from '../Shaders/GhibliMaterial';

export class Character {
  scene: THREE.Scene;
  private group: THREE.Group;
  private input: Input;
  private body!: THREE.Mesh;
  private head!: THREE.Mesh;
  private leftEye!: THREE.Mesh;
  private rightEye!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  private leftLeg!: THREE.Mesh;
  private rightLeg!: THREE.Mesh;

  // Simple physics
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private position: THREE.Vector3 = new THREE.Vector3(0, 1, 8);
  private onGround: boolean = true;

  // Movement params
  private moveSpeed: number = 8;
  private jumpForce: number = 12;
  private gravity: number = -20;

  // Animation state
  private walkCycle: number = 0;
  private isMoving: boolean = false;

  constructor(scene: THREE.Scene, time: Time, useWebGPU: boolean = true) {
    this.scene = scene;
    this.input = new Input();
    this.group = new THREE.Group();

    this.createCharacterModel(useWebGPU);

    this.group.position.copy(this.position);
    this.scene.add(this.group);
  }

  private createCharacterModel(useWebGPU: boolean): void {
    // Material classes: NodeMaterial in WebGPU, standard Material in WebGL
    const ToonMat = useWebGPU ? THREE.MeshToonNodeMaterial : THREE.MeshToonMaterial;
    const BasicMat = useWebGPU ? THREE.MeshBasicNodeMaterial : THREE.MeshBasicMaterial;

    // --- Cute Ghibli-style character ---

    // Body (blue tunic) - uses GhibliMaterial for cel-shaded look when WebGPU
    const bodyMat = useWebGPU
      ? new GhibliMaterial({ color: 0x4a90d9, shadowColor: 0x2a5090 })
      : new ToonMat({ color: new THREE.Color(0x4a90d9) });
    const bodyGeom = new THREE.CapsuleGeometry(0.35, 0.5, 8, 16);
    this.body = new THREE.Mesh(bodyGeom, bodyMat);
    this.body.position.y = 0.65;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Head - uses GhibliMaterial for cel-shaded look when WebGPU
    const skinMat = useWebGPU
      ? new GhibliMaterial({ color: 0xffdbac, shadowColor: 0xd4a880 })
      : new ToonMat({ color: new THREE.Color(0xffdbac) });
    const headGeom = new THREE.SphereGeometry(0.32, 16, 12);
    this.head = new THREE.Mesh(headGeom, skinMat);
    this.head.position.y = 1.35;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Eyes (big, expressive)
    const eyeMat = new BasicMat({
      color: new THREE.Color(0x2c1810)
    });
    const eyeGeom = new THREE.SphereGeometry(0.055, 8, 6);

    this.leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    this.leftEye.position.set(-0.11, 1.4, 0.28);
    this.group.add(this.leftEye);

    this.rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    this.rightEye.position.set(0.11, 1.4, 0.28);
    this.group.add(this.rightEye);

    // Eye highlights (white dots for life)
    const highlightMat = new BasicMat({
      color: new THREE.Color(0xffffff)
    });
    const highlightGeom = new THREE.SphereGeometry(0.02, 6, 4);

    const leftHighlight = new THREE.Mesh(highlightGeom, highlightMat);
    leftHighlight.position.set(-0.09, 1.42, 0.32);
    this.group.add(leftHighlight);

    const rightHighlight = new THREE.Mesh(highlightGeom, highlightMat);
    rightHighlight.position.set(0.13, 1.42, 0.32);
    this.group.add(rightHighlight);

    // Cheeks (blush)
    const cheekMat = new BasicMat({
      color: new THREE.Color(0xff9999)
    });
    const cheekGeom = new THREE.SphereGeometry(0.04, 6, 4);

    const leftCheek = new THREE.Mesh(cheekGeom, cheekMat);
    leftCheek.position.set(-0.22, 1.32, 0.25);
    leftCheek.scale.set(1, 0.6, 0.5);
    this.group.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeom, cheekMat);
    rightCheek.position.set(0.22, 1.32, 0.25);
    rightCheek.scale.set(1, 0.6, 0.5);
    this.group.add(rightCheek);

    // Straw hat (Ghibli vibe) - uses GhibliMaterial when WebGPU
    const hatMat = useWebGPU
      ? new GhibliMaterial({ color: 0xdaa520 })
      : new ToonMat({ color: new THREE.Color(0xdaa520) });

    // Hat brim
    const brimGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.04, 18);
    const brim = new THREE.Mesh(brimGeom, hatMat);
    brim.position.y = 1.6;
    brim.castShadow = true;
    this.group.add(brim);

    // Hat top
    const topGeom = new THREE.CylinderGeometry(0.18, 0.28, 0.28, 14);
    const top = new THREE.Mesh(topGeom, hatMat);
    top.position.y = 1.75;
    top.castShadow = true;
    this.group.add(top);

    // Hat ribbon (red)
    const ribbonMat = new ToonMat({
      color: new THREE.Color(0xff4444)
    });
    const ribbonGeom = new THREE.CylinderGeometry(0.29, 0.29, 0.07, 14);
    const ribbon = new THREE.Mesh(ribbonGeom, ribbonMat);
    ribbon.position.y = 1.62;
    this.group.add(ribbon);

    // Arms
    const armGeom = new THREE.CapsuleGeometry(0.08, 0.35, 4, 8);

    this.leftArm = new THREE.Mesh(armGeom, skinMat);
    this.leftArm.position.set(-0.42, 0.7, 0);
    this.leftArm.castShadow = true;
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeom, skinMat);
    this.rightArm.position.set(0.42, 0.7, 0);
    this.rightArm.castShadow = true;
    this.group.add(this.rightArm);

    // Legs
    const legGeom = new THREE.CapsuleGeometry(0.09, 0.3, 4, 8);
    const pantsMat = new ToonMat({
      color: new THREE.Color(0x5c3a1e)
    });

    this.leftLeg = new THREE.Mesh(legGeom, pantsMat);
    this.leftLeg.position.set(-0.14, 0.15, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeom, pantsMat);
    this.rightLeg.position.set(0.14, 0.15, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);
  }

  update(delta: number): void {
    const dir = this.input.getMovementDirection();

    this.isMoving = Math.abs(dir.x) > 0.01 || Math.abs(dir.z) > 0.01;

    // Apply movement
    this.velocity.x = dir.x * this.moveSpeed;
    this.velocity.z = dir.z * this.moveSpeed;

    // Jump
    if (this.input.isKeyPressed('Space') && this.onGround) {
      this.velocity.y = this.jumpForce;
      this.onGround = false;
    }

    // Gravity
    if (!this.onGround) {
      this.velocity.y += this.gravity * delta;
    }

    // Update position
    this.position.x += this.velocity.x * delta;
    this.position.y += this.velocity.y * delta;
    this.position.z += this.velocity.z * delta;

    // Ground collision
    const terrainY = this.getTerrainHeight(this.position.x, this.position.z);
    if (this.position.y <= terrainY + 1.0) {
      this.position.y = terrainY + 1.0;
      this.velocity.y = 0;
      this.onGround = true;
    }

    // Update visual position
    this.group.position.copy(this.position);

    // Rotate character to face movement direction
    if (this.isMoving) {
      const targetAngle = Math.atan2(dir.x, dir.z);
      const currentAngle = this.group.rotation.y;
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * 8 * delta;
    }

    // --- Walking animation ---
    if (this.isMoving) {
      this.walkCycle += delta * 10;

      // Body bob
      this.body.position.y = 0.65 + Math.sin(this.walkCycle) * 0.04;

      // Arm swing
      this.leftArm.rotation.x = Math.sin(this.walkCycle) * 0.5;
      this.rightArm.rotation.x = Math.sin(this.walkCycle + Math.PI) * 0.5;

      // Leg swing
      this.leftLeg.rotation.x = Math.sin(this.walkCycle + Math.PI) * 0.4;
      this.rightLeg.rotation.x = Math.sin(this.walkCycle) * 0.4;

      // Slight body lean
      this.body.rotation.z = Math.sin(this.walkCycle * 0.5) * 0.03;
    } else {
      // Idle animation: gentle breathing
      this.walkCycle = 0;
      const breathe = Math.sin(performance.now() * 0.002) * 0.01;
      this.body.position.y = 0.65 + breathe;
      this.body.rotation.z = 0;

      // Reset limbs to idle
      this.leftArm.rotation.x *= 0.9;
      this.rightArm.rotation.x *= 0.9;
      this.leftLeg.rotation.x *= 0.9;
      this.rightLeg.rotation.x *= 0.9;
    }
  }

  private getTerrainHeight(x: number, z: number): number {
    return Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5
         + Math.sin(x * 0.02 + z * 0.03) * 0.8;
  }

  getPosition(): THREE.Vector3 {
    return this.position;
  }
}
