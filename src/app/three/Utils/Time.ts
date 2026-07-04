export class Time {
  private startTime: number = 0;
  private elapsed: number = 0;
  private delta: number = 0;
  private lastTime: number = 0;
  private callbacks: Array<(delta: number) => void> = [];

  constructor() {
    this.startTime = performance.now() / 1000;
    this.lastTime = this.startTime;
  }

  update(): void {
    const now = performance.now() / 1000;
    this.delta = Math.min(now - this.lastTime, 0.1); // Cap delta to prevent spiral
    this.elapsed = now - this.startTime;
    this.lastTime = now;

    for (const cb of this.callbacks) {
      cb(this.delta);
    }
  }

  onTick(callback: (delta: number) => void): void {
    this.callbacks.push(callback);
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getDelta(): number {
    return this.delta;
  }
}
