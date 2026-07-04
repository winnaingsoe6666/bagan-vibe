/**
 * Custom post-processing GLSL shaders for cinematic Ghibli rendering.
 * Vignette, film grain, and color grading shaders.
 */

// --- Vignette Shader ---
// Soft darkening at screen edges for a cinematic, dreamy frame.

export const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 0.4 },   // Intensity of darkening
    darkness: { value: 1.2 }, // How dark the edges become
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Radial distance from center
      vec2 center = vUv - 0.5;
      float dist = length(center);

      // Smooth falloff using smoothstep for soft edges
      float vig = smoothstep(0.6, 0.3, dist * (1.0 + offset));
      vig = mix(1.0 - darkness, 1.0, vig);

      gl_FragColor = vec4(texel.rgb * vig, texel.a);
    }
  `,
};

// --- Film Grain Shader ---
// Subtle time-based noise for analog/filmic texture.
// The noise is generated procedurally using a hash function, animated via a time uniform.

export const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },    // Elapsed time for grain animation
    intensity: { value: 0.03 }, // Grain strength (very subtle)
    speed: { value: 8.0 },   // How fast the grain changes
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    uniform float speed;
    varying vec2 vUv;

    // High-quality pseudo-random hash
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Animated grain noise
      float grain = hash(vUv * 1000.0 + fract(time * speed));
      grain = (grain - 0.5) * intensity;

      // Apply grain to RGB channels equally
      gl_FragColor = vec4(texel.rgb + grain, texel.a);
    }
  `,
};

// --- Color Grading Shader ---
// Warm Ghibli palette: warm highlights, cool shadows, subtle saturation boost.

export const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    warmShift: { value: 0.06 },      // How much to warm highlights
    coolShift: { value: 0.04 },      // How much to cool shadows
    saturation: { value: 1.08 },     // Saturation multiplier (>1 = more vivid)
    contrast: { value: 1.02 },       // Subtle contrast boost
    brightness: { value: 0.0 },      // Overall brightness offset
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float warmShift;
    uniform float coolShift;
    uniform float saturation;
    uniform float contrast;
    uniform float brightness;
    varying vec2 vUv;

    // Luminance helper
    float luminance(vec3 color) {
      return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;

      // 1. Brightness
      color += brightness;

      // 2. Contrast (around mid-gray)
      color = (color - 0.5) * contrast + 0.5;

      // 3. Saturation adjustment
      float lum = luminance(color);
      color = mix(vec3(lum), color, saturation);

      // 4. Split-toning: warm highlights, cool shadows
      float l = luminance(color);
      // Warm highlights (push red/yellow up in bright areas)
      color.r += warmShift * smoothstep(0.4, 0.9, l);
      color.g += warmShift * 0.5 * smoothstep(0.4, 0.9, l);
      // Cool shadows (push blue up in dark areas)
      color.b += coolShift * smoothstep(0.6, 0.1, l);
      // Subtle warm reduction in shadows to keep earthy feel
      color.r -= coolShift * 0.3 * smoothstep(0.6, 0.1, l);

      // Clamp to valid range
      color = clamp(color, 0.0, 1.0);

      gl_FragColor = vec4(color, texel.a);
    }
  `,
};
