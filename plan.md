# Master Technical Plan: Studio Ghibli x Bagan Three.js Portfolio

## Required Learning Resources
Before executing any tasks in this plan, the developer/agent MUST learn and analyze the following resources:
1. **Bruno Simon's Portfolio**: https://bruno-simon.com/
2. **Bruno Simon's 2025 Folio Repo**: https://github.com/brunosimon/folio-2025
3. **Local Plugins**: Review the `./.claude-plugin` directory.
4. **Local Rules**: Review the `./rules` folder (specifically `webgpu-threejs-tsl.mdc`).
5. **Local Skills**: Review the `./skills` folder for available Three.js and WebGPU TSL skills.

## Project Goal
Create an interactive 3D web experience within your existing Angular application. The scene will feature:
*   **Aesthetic**: Exquisite Studio Ghibli anime style (cel-shaded, vibrant, painterly).
*   **Key Elements**: 
    *   A massive ancient tree with golden-yellow Padauk flowers in the foreground.
    *   Falling golden petals (particle system).
    *   A traditional wooden house with a tiled roof.
    *   Lush, wind-blown grass.
    *   Majestic Bagan temples in the background.
    *   Bright blue sky with massive fluffy cumulus clouds.
    *   Dappled sunlight filtering through leaves.
*   **Interactivity**: A character controller (like Bruno Simon's truck/character) allowing the user to explore this world, discovering your portfolio projects as they navigate.

## Visual Goal
An exquisite Studio Ghibli style anime background illustration. A massive, ancient tree bursting with vibrant golden-yellow Padauk flowers dominates the foreground. Golden petals are gently falling in the wind. A traditional wooden house with a tiled roof sits under the tree. In the lush green grassy distance, the majestic ancient temples of Bagan rise elegantly. The sky is bright blue, filled with massive, fluffy, beautifully rendered cumulus clouds. Dappled sunlight filtering through the leaves, peaceful summer countryside vibe, highly detailed, vivid colors, masterpiece.

## Proposed Architecture (Inspired by Folio-2025)
After studying the architecture of `brunosimon/folio-2025` and the local WebGPU/TSL rules, we will use a highly structured, Object-Oriented approach. Instead of spaghetti code, we will split the logic into specialized modules managed by a central `Experience` (or `Game`) class.

### 1. Core Frameworks & Rules
*   **WebGPU Renderer**: We will strictly use `import * as THREE from 'three/webgpu';` for the underlying renderer.
*   **Three.js Shading Language (TSL)**: We will write all custom materials (Ghibli grass, wind animation, toon shading) using TSL (`import { color, time, Fn } from 'three/tsl'`) as dictated by your `webgpu-threejs-tsl.mdc` rule.
*   **Physics Engine**: `@dimforge/rapier3d-compat` for robust collision detection and character movement.

### 2. Directory Structure
Create this structure inside `src/app/three/`:
```text
three/
├── Game.ts            # Core orchestrator (Singleton pattern)
├── Utils/
│   ├── Time.ts        # requestAnimationFrame loop & delta time
│   ├── Resources.ts   # Pre-loader for GLTFs and textures
├── Core/
│   ├── Renderer.ts    # WebGPURenderer & Post-processing
│   ├── View.ts        # PerspectiveCamera & Window resizing
├── World/
│   ├── World.ts       # Initializes environment components
│   ├── Terrain.ts     # Ground mesh and Grass InstancedMesh
│   ├── Tree.ts        # Massive Padauk tree & falling petals
│   ├── Architecture.ts# House & Bagan Temples
│   ├── Sky.ts         # Cumulus clouds and sky gradient
├── Player/
│   ├── Character.ts   # Rapier rigid body and model controller
│   ├── Input.ts       # Keyboard/Mouse tracking
```

## Task List

### Phase 1: Foundation & WebGPU Setup
- [ ] Review `package.json` and install required dependencies (`three`, `@dimforge/rapier3d-compat`).
- [ ] Create `Game/` directory structure (`Time.ts`, `View.ts`, `Renderer.ts`, etc.).
- [ ] Implement `Game.ts` (Core Orchestrator).
- [ ] Implement `Time.ts` (Animation Loop).
- [ ] Implement `View.ts` (Camera & Resize).
- [ ] Implement `Renderer.ts` (WebGPU setup).
- [ ] Update `three-scene.service.ts` to initialize `Game`.
- [ ] Integrate Rapier physics and set up a basic floor plane.
- [ ] Implement a basic `Player` character controller.

### Phase 2: The Ghibli Shaders (TSL)
- [ ] **Toon Node Material**: Create a reusable TSL material that clamps lighting for the painterly Ghibli look.
- [ ] **Grass System**: Implement instanced grass utilizing TSL for vertex displacement (wind sway).
- [ ] **Leaf & Petal System**: Use TSL to animate the falling golden Padauk petals.

### Phase 3: World Building & Assets
- [ ] Load the massive ancient tree and the traditional wooden house.
- [ ] Set up the background layer with Bagan temples (using optimized models or 2D billboards).
- [ ] Implement the bright blue sky and massive cumulus clouds.

### Phase 4: Lighting & Post-Processing
- [ ] Implement Dappled sunlight via a projected light map.
- [ ] Add TSL post-processing nodes (Bloom for the petals, Color Grading for vivid Studio Ghibli colors).

## Detailed Technical Integration

### A. WebGPU Renderer Setup
```typescript
import * as THREE from 'three/webgpu';

export class Renderer {
    instance: THREE.WebGPURenderer;
    
    constructor(canvas: HTMLCanvasElement) {
        this.instance = new THREE.WebGPURenderer({
            canvas: canvas,
            antialias: true,
            powerPreference: "high-performance"
        });
        
        // Critical for Ghibli lighting
        this.instance.toneMapping = THREE.ACESFilmicToneMapping;
        this.instance.shadowMap.enabled = true;
        this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
    }
}
```

### B. Ghibli Grass Material (TSL)
Instead of a heavy GLSL string, use TSL to displace the vertices of an `InstancedMesh` based on wind.
```typescript
import * as THREE from 'three/webgpu';
import { color, time, positionWorld, vec3, Fn, float } from 'three/tsl';

export function createGrassMaterial() {
    // Custom TSL function for wind sway
    const windSway = Fn(() => {
        // Use world position and time to create a flowing wave
        const wave = positionWorld.x.mul(0.05).add(positionWorld.z.mul(0.05)).add(time).sin();
        
        // Multiply by the Y position so the root stays still, and the tip sways
        return vec3(wave, 0.0, wave).mul(positionLocal.y.mul(0.2));
    });

    const material = new THREE.MeshStandardNodeMaterial({
        side: THREE.DoubleSide
    });
    
    // Apply vertex displacement
    material.positionNode = positionLocal.add(windSway());
    
    // Painterly colors
    material.colorNode = color(0x478f2d); 
    
    return material;
}
```

### C. Asset Creation Workflow (Blender)
To achieve the Ghibli look, **do not rely purely on real-time lights**. 
1. **Modeling**: Model the massive Padauk tree, the wooden house, and the Bagan temples in Blender.
2. **Texturing**: Hand-paint the textures or use solid colors.
3. **Light Baking**: Set up a strong sun (directional light) and blue sky (ambient light) in Blender. Bake the lighting and shadows directly into the textures.
4. **Export**: Export as `.glb` files.
5. **Three.js Usage**: Use `MeshBasicNodeMaterial` in TSL for these assets in Three.js so they retain their painted look without reacting unpredictably to dynamic web lights.

### D. Character & Physics (Rapier)
1. **Initialize Rapier**: Wait for `import('@dimforge/rapier3d-compat').then(RAPIER => RAPIER.init())`.
2. **The World Collider**: Create a trimesh rigid body for the terrain so the character can walk up and down hills.
3. **The Player**: Create a dynamic `Capsule` rigid body. Apply impulses based on `WASD` or Arrow keys.
4. **The Camera**: Update your `View.ts` to smoothly interpolate (Lerp) the camera's position to trail behind the player's rigid body coordinates.

## Verification Plan
*   **Performance Tests**: Ensure the `WebGPURenderer` is initializing correctly without falling back to WebGL unnecessarily. Monitor GPU memory and ensure InstancedMeshes (via TSL) keep draw calls minimal.
*   **Manual Verification**: Verify the character controller feels smooth and responsive. Ensure the visual aesthetic matches the requested Studio Ghibli style.
