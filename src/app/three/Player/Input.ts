export class Input {
  private keys: Map<string, boolean> = new Map();
  private mouseDelta: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.set(e.code, true);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.set(e.code, false);
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouseDelta.x = e.movementX;
    this.mouseDelta.y = e.movementY;
  }

  isKeyPressed(code: string): boolean {
    return this.keys.get(code) === true;
  }

  getMovementDirection(): { x: number; z: number } {
    let x = 0;
    let z = 0;

    if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) z -= 1;
    if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) z += 1;
    if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) x -= 1;
    if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) x += 1;

    // Normalize diagonal movement
    const len = Math.sqrt(x * x + z * z);
    if (len > 0) {
      x /= len;
      z /= len;
    }

    return { x, z };
  }

  consumeMouseDelta(): { x: number; y: number } {
    const delta = { ...this.mouseDelta };
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }
}
