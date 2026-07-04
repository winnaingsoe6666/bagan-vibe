# Visual Quality Upgrade — Work in Progress

## Status: BLACK SCREEN — needs debugging

## What Was Done

### New Files Created
| File | Purpose |
|---|---|
| `Shaders/GhibliMaterial.ts` | Reusable Ghibli-style material factory with toon shading |
| `Utils/Wind.ts` | GPU-side wind system with dual-layer Perlin noise |
| `Core/Fog.ts` | Radial color fog system with TSL nodes |

### Files Upgraded
- `Shaders/GrassMaterial.ts` — 3-tone gradient, dual-layer wind, quadratic sway
- `Shaders/CloudMaterial.ts` — soft edges, height-based color, pulsing glow
- `Shaders/PetalMaterial.ts` — deep/bright gold gradient with twinkling
- `Shaders/ToonMaterial.ts` — gradient map for stepped cel-shading
- `World/Terrain.ts` — height-based color, 12k grass blades, wind integration
- `World/Tree.ts` — 5 branches, 12 foliage, 8 flowers, 8 roots, 400 petals
- `World/Sky.ts` — 10 clouds, 7-12 puffs each, towering cumulus, vertical bob
- `World/Architecture.ts` — window frames, lanterns, 8 temples, corner details
- `Player/Character.ts` — arms, legs, walk cycle, eye highlights, blush, breathing
- `Game.ts` — stronger lighting, shadow bias, softer fog
- `Core/PostProcessing.ts` — simplified to tone mapping + fill lights (TSL bloom removed due to crash)
- `World/World.ts` — integrated Wind system

### Bruno Simon Techniques Applied
1. Palette-based coloring (height/position driven)
2. Dual-layer wind noise (two scales, two speeds)
3. Stronger directional light with proper shadow bias
4. Hemisphere light for sky/ground color bleed
5. Character with articulated limbs and walk animation

## Known Issues
1. **BLACK SCREEN** — Scene not rendering. Possible causes:
   - WebGPU not supported in the user's browser (Chrome 113+ required)
   - `WebGPURenderer.init()` failing silently
   - Canvas not being appended correctly
   - Some material/shader failing at runtime
2. TSL bloom/vignette pipeline was removed because it likely crashed at runtime
3. `Fog.ts` may not be integrated into the scene (not imported in Game.ts)

## Debugging Steps for Next Session
1. **Check browser console** — Open DevTools (F12) → Console tab → look for red errors
2. **Check if WebGPU is supported** — Visit `chrome://gpu` or check `navigator.gpu` in console
3. **Add fallback to WebGL** — If WebGPU fails, fall back to `THREE.WebGLRenderer`
4. **Simplify further** — Remove all TSL materials, use basic `MeshStandardMaterial` to isolate
5. **Check canvas** — Verify canvas element exists and has dimensions

## Architecture Reference
```
src/app/three/
├── Game.ts            # Core orchestrator
├── Core/
│   ├── Renderer.ts    # WebGPURenderer
│   ├── View.ts        # PerspectiveCamera + resize
│   ├── PostProcessing.ts # Tone mapping + fill lights
│   └── Fog.ts         # TSL radial fog (NOT integrated)
├── Utils/
│   ├── Time.ts        # Animation loop + delta
│   └── Wind.ts        # GPU wind system
├── Shaders/
│   ├── GhibliMaterial.ts  # Material factory
│   ├── GrassMaterial.ts   # Wind-animated grass
│   ├── CloudMaterial.ts   # Soft volumetric clouds
│   ├── PetalMaterial.ts   # Golden particle petals
│   └── ToonMaterial.ts    # Gradient map toon shading
├── World/
│   ├── World.ts       # Initializes all world objects
│   ├── Terrain.ts     # Ground + instanced grass
│   ├── Tree.ts        # Padauk tree + falling petals
│   ├── Sky.ts         # Cumulus cloud clusters
│   └── Architecture.ts # House + Bagan temples
└── Player/
    ├── Character.ts   # articulated character with walk cycle
    └── Input.ts       # Keyboard/mouse input
```

## Key Imports (potential issues)
- `three/webgpu` — WebGPU renderer entry point
- `three/tsl` — TSL node functions (color, float, uniform, Fn, mix, etc.)
- `three/addons/tsl/display/BloomNode.js` — Bloom effect (REMOVED from PostProcessing)
- `@dimforge/rapier3d-compat` — Physics (not currently used)
