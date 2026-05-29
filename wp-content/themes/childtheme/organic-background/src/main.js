import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import './styles.css';
import fragmentShader from './shaders/fragment.glsl?raw';
import vertexShader from './shaders/vertex.glsl?raw';

const canvas = document.querySelector('[data-organic-canvas]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const config = {
  blobColor: '#1ee6f2',
  highlightColor: '#e8ffff',
  glowIntensity: 0.94,
  noiseStrength: 0.38,
  animationSpeed: 0.78,
  blobScale: 0.74,
  bloomIntensity: 0.88,
};

const rendererOptions = {
  canvas,
  antialias: false,
  alpha: false,
  depth: false,
  stencil: false,
  powerPreference: 'high-performance',
};

let renderer;

try {
  renderer = new THREE.WebGLRenderer(rendererOptions);
} catch (error) {
  mountFallback();
}

if (renderer) {
  renderer.setClearColor(0x050505, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const startTime = performance.now();
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPixelRatio: { value: 1 },
    uMouse: { value: pointer },
    uBlobColor: { value: new THREE.Color(config.blobColor) },
    uHighlightColor: { value: new THREE.Color(config.highlightColor) },
    uGlowIntensity: { value: config.glowIntensity },
    uNoiseStrength: { value: config.noiseStrength },
    uAnimationSpeed: { value: config.animationSpeed },
    uBlobScale: { value: config.blobScale },
    uBloomIntensity: { value: config.bloomIntensity },
    uMarchSteps: { value: 64 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    config.bloomIntensity,
    0.82,
    0.18,
  );
  composer.addPass(bloomPass);

  const atmospherePass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: uniforms.uResolution.value },
      uRgbShift: { value: 0.0019 },
      uVignette: { value: 0.72 },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uRgbShift;
      uniform float uVignette;

      varying vec2 vUv;

      void main() {
        vec2 center = vUv - 0.5;
        float depth = dot(center, center);
        vec2 shift = normalize(center + 0.0001) * depth * uRgbShift;

        vec3 color;
        color.r = texture2D(tDiffuse, vUv + shift).r;
        color.g = texture2D(tDiffuse, vUv).g;
        color.b = texture2D(tDiffuse, vUv - shift).b;

        float vignette = smoothstep(0.92, 0.20, length(center * vec2(1.04, 0.92)));
        color *= mix(1.0 - uVignette * 0.32, 1.0, vignette);
        color += vec3(0.0, 0.006, 0.012) * (1.0 - vignette);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  composer.addPass(atmospherePass);
  composer.addPass(new OutputPass());

  const setDpr = () => {
    const width = window.innerWidth || 1;
    const deviceRatio = window.devicePixelRatio || 1;
    const cap = width < 720 ? 1.25 : width < 1180 ? 1.5 : 1.75;
    return Math.min(deviceRatio, cap);
  };

  const resize = () => {
    const width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    const pixelRatio = setDpr();
    const mobileScale = width < 720 ? 0.67 : width < 1024 ? 0.86 : 1.0;

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);

    uniforms.uResolution.value.set(width, height);
    uniforms.uPixelRatio.value = pixelRatio;
    uniforms.uBlobScale.value = config.blobScale * mobileScale;
    uniforms.uMarchSteps.value = width < 720 ? 50 : 64;
    bloomPass.resolution.set(width, height);
  };

  const updatePointer = (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (0.5 - event.clientY / window.innerHeight) * 2;
    pointerTarget.set(x, y);
  };

  const resetPointer = () => {
    pointerTarget.set(0, 0);
  };

  let raf = 0;

  const render = () => {
    raf = 0;

    pointer.lerp(pointerTarget, 0.045);
    uniforms.uTime.value = reducedMotion.matches ? 8.0 : (performance.now() - startTime) * 0.001;
    composer.render();

    if (!reducedMotion.matches && !document.hidden) {
      raf = window.requestAnimationFrame(render);
    }
  };

  const start = () => {
    if (!raf) {
      raf = window.requestAnimationFrame(render);
    }
  };

  const stop = () => {
    if (!raf) return;
    window.cancelAnimationFrame(raf);
    raf = 0;
  };

  const handleVisibility = () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  };

  const syncReducedMotion = () => {
    if (reducedMotion.matches) {
      stop();
      render();
    } else {
      start();
    }
  };

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', updatePointer, { passive: true });
  window.addEventListener('pointerleave', resetPointer, { passive: true });
  document.addEventListener('visibilitychange', handleVisibility);

  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', syncReducedMotion);
  } else {
    reducedMotion.addListener(syncReducedMotion);
  }

  const controls = {
    config,
    uniforms,
    bloomPass,
    set(nextConfig = {}) {
      Object.assign(config, nextConfig);

      if (nextConfig.blobColor) {
        uniforms.uBlobColor.value.set(nextConfig.blobColor);
      }

      if (nextConfig.highlightColor) {
        uniforms.uHighlightColor.value.set(nextConfig.highlightColor);
      }

      uniforms.uGlowIntensity.value = config.glowIntensity;
      uniforms.uNoiseStrength.value = config.noiseStrength;
      uniforms.uAnimationSpeed.value = config.animationSpeed;
      uniforms.uBloomIntensity.value = config.bloomIntensity;
      bloomPass.strength = config.bloomIntensity;
      resize();
    },
  };

  window.organicBackground = controls;
  globalThis.organicBackground = controls;
  document.documentElement.dataset.organicReady = 'true';

  resize();
  syncReducedMotion();
}

function mountFallback() {
  canvas?.classList.add('is-fallback');
  const fallback = document.createElement('div');
  fallback.className = 'organic-fallback';
  fallback.setAttribute('aria-hidden', 'true');
  document.body.append(fallback);
}
