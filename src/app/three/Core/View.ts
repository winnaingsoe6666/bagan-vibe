import * as THREE from 'three/webgpu';

export class View {
  instance: THREE.PerspectiveCamera;
  private aspect: number;

  // Camera follow parameters
  private readonly followOffset = new THREE.Vector3(0, 7, 14);
  private readonly lookAtOffset = new THREE.Vector3(0, 1.5, 0);
  private readonly followSmoothing = 0.04;
  private readonly lookAtSmoothing = 0.06;

  // Subtle idle breathing animation
  private readonly idleAmplitude = 0.15;
  private readonly idleFrequency = 0.4;

  constructor() {
    this.aspect = window.innerWidth / window.innerHeight;
    // 55 FOV: slightly tighter than default for a cinematic Ghibli framing
    // Near 0.5 to avoid z-fighting on close terrain, far 500 for the fog range
    this.instance = new THREE.PerspectiveCamera(55, this.aspect, 0.5, 500);
    this.instance.position.set(0, 5, 15);
    this.instance.lookAt(0, 2, 0);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize(): void {
    this.aspect = window.innerWidth / window.innerHeight;
    this.instance.aspect = this.aspect;
    this.instance.updateProjectionMatrix();
  }

  update(playerPosition: THREE.Vector3, elapsed: number = 0): void {
    // Smooth camera follow with independent position and look-at easing
    const targetPos = new THREE.Vector3(
      playerPosition.x + this.followOffset.x,
      playerPosition.y + this.followOffset.y,
      playerPosition.z + this.followOffset.z
    );
    this.instance.position.lerp(targetPos, this.followSmoothing);

    // Subtle idle breathing: gentle vertical float when stationary
    if (elapsed > 0) {
      const breathe = Math.sin(elapsed * this.idleFrequency) * this.idleAmplitude;
      this.instance.position.y += breathe;
    }

    // Look slightly ahead of and above the player for cinematic framing
    const lookTarget = new THREE.Vector3(
      playerPosition.x + this.lookAtOffset.x,
      playerPosition.y + this.lookAtOffset.y,
      playerPosition.z + this.lookAtOffset.z
    );
    this.instance.lookAt(lookTarget);
  }
}
