import { Game } from './app/three/Game';

async function main() {
  const loadingEl = document.getElementById('loading');

  try {
    const game = Game.getInstance();
    await game.init();

    if (loadingEl) {
      loadingEl.classList.add('hidden');
      setTimeout(() => loadingEl.remove(), 500);
    }
  } catch (error) {
    console.error('Failed to initialize Bagan Vibe:', error);
    if (loadingEl) {
      loadingEl.textContent = 'Failed to load. WebGL or WebGPU may not be supported in this browser.';
    }
  }
}

main();
