// The farewell astronaut above the footer, told by scrolling:
//   1. A close look into the clear helmet dome, the face inside.
//   2. The gold sun visor slides down and reflects the garden below.
//   3. The camera pulls back to show the whole astronaut, who waves goodbye
//      as space pulls him away.
//   4. A swoosh dives down into Earth, landing on the footer garden.
// Shaders are in astronaut-scene.ts. Reduced motion shows one still frame of
// the wave, with no scroll story.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible, buildProgram, uploadAttribute } from './webgl-helpers';
import { FRAGMENT, VERTEX_MAIN } from './case-sky-scenes';
import { ASTRONAUT_VERTEX } from './astronaut-scene';
import { add, ease, length, lookAt, mix, norm, perspective, scale, sub, viewTangent } from './camera-math';
import type { Vec3 } from './camera-math';

const PARTICLES = 260000;
const PHONE_SCALE = 0.55;
const MAX_DPR = 1.5;
const BASE_FOV = 42;
const HELMET: Vec3 = [0, 62, 0];
const DOME_R = 31;
const EARTH_C: Vec3 = [0, -3200, -1500];
const EARTH_R = 2600;
const STILL_PROGRESS = 0.56;

// Scroll progress milestones
const VISOR_FROM = 0.12, VISOR_TO = 0.3;
const ZOOM_FROM = 0.34, ZOOM_TO = 0.66;
const WAVE_FROM = 0.42;
const SWOOSH_FROM = 0.68, SWOOSH_TO = 1;
const FADE_FROM = 0.93;

type Camera = { eye: Vec3; target: Vec3; roll: number; fov: number; dist: number };
type Story = { camera: Camera; visor: number; wave: number; offset: Vec3; pull: number; swoosh: number; gain: number };

const swooshAt = (p: number) => Math.min(1, Math.max(0, (p - SWOOSH_FROM) / (SWOOSH_TO - SWOOSH_FROM)));
const logMix = (a: number, b: number, k: number) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * k);

/** How far the camera stands so the dome nearly fills the screen's width. */
function closeDistance(aspect: number) {
  return (DOME_R * (aspect < 1 ? 0.95 : 1.15)) / (viewTangent(aspect, BASE_FOV) * aspect) + DOME_R * 0.5;
}

/** How far the camera stands so the whole astronaut fits, a little small. */
function farDistance(aspect: number) {
  return 150 / viewTangent(aspect, BASE_FOV);
}

/** Space pulls the astronaut gently backwards and up once he starts waving. */
function driftAt(p: number): Vec3 {
  const k = ease((p - WAVE_FROM) / (SWOOSH_FROM + 0.12 - WAVE_FROM));
  return [0, k * 40, -k * 420];
}

function cameraAt(p: number, aspect: number): Camera {
  const near = closeDistance(aspect), far = farDistance(aspect);
  const zoom = ease((p - ZOOM_FROM) / (ZOOM_TO - ZOOM_FROM));
  const dist = logMix(near, far, zoom);
  const target = mix(HELMET, [0, -10, 0], zoom);
  const eye: Vec3 = add(target, [0, zoom * 20, dist]);
  const s = swooshAt(p);
  if (s <= 0) return { eye, target, roll: 0, fov: BASE_FOV, dist };
  // Dive towards Earth, evenly in log space, turning to face it.
  const start = add([0, -10, 0], [0, 20, far]);
  const away = norm(sub(start, EARTH_C)), from = length(sub(start, EARTH_C));
  const k = ease(s), pull = Math.sin(Math.PI * s);
  const height = logMix(from, EARTH_R * 1.03, k);
  const diveEye = add(EARTH_C, scale(away, height));
  return {
    eye: diveEye,
    target: mix([0, -10, 0], EARTH_C, ease(s * 1.6)),
    roll: s * 0.9 + pull * 0.15,
    fov: BASE_FOV + pull * 18,
    dist: height - EARTH_R + 40,
  };
}

function storyAt(p: number, aspect: number): Story {
  const swoosh = swooshAt(p);
  return {
    camera: cameraAt(p, aspect),
    visor: ease((p - VISOR_FROM) / (VISOR_TO - VISOR_FROM)),
    wave: ease((p - WAVE_FROM) / 0.06),
    offset: driftAt(p),
    pull: Math.sin(Math.PI * swoosh),
    swoosh,
    // Up close each dot covers more of the screen, so the astronaut needs more light to read.
    gain: 1 + 2 * (1 - ease((p - ZOOM_FROM) / (ZOOM_TO - ZOOM_FROM))),
  };
}

const UNIFORMS = ['uProj', 'uView', 'uEye', 'uT', 'uDpr', 'uP', 'uAspect', 'uSizeRef', 'uFog', 'uNear', 'uGather', 'uLensR',
  'uFace', 'uVisor', 'uWave', 'uPull', 'uSwoosh', 'uOffset', 'uGain', 'uDot'] as const;
type Uniforms = Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

function setupProgram(gl: WebGLRenderingContext, count: number) {
  const program = buildProgram(gl, ASTRONAUT_VERTEX + VERTEX_MAIN, FRAGMENT);
  gl.useProgram(program);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  uploadAttribute(gl, program, 'aSeed', seeds, 4);
  const loc = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)])) as Uniforms;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // additive light
  return loc;
}

/** Upload the face picture. Until it arrives the helmet is simply empty. */
function uploadFace(gl: WebGLRenderingContext, url: string, onReady: () => void) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  for (const [name, value] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) {
    gl.texParameteri(gl.TEXTURE_2D, name, value);
  }
  const image = new Image();
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    onReady();
  };
  image.onerror = () => console.warn('The astronaut face picture could not load');
  image.src = url;
}

/**
 * Start the astronaut on its canvas. `section` is the tall scrolling block; its
 * scroll position drives the story. Returns false if this browser cannot draw it.
 */
export function startAstronaut(section: HTMLElement, canvas: HTMLCanvasElement, faceUrl: string): boolean {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl || gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) return false;
  const count = Math.round(PARTICLES * (window.matchMedia('(max-width: 760px)').matches ? PHONE_SCALE : 1));
  let loc: Uniforms;
  try {
    loc = setupProgram(gl, count);
  } catch (error) {
    console.warn('The farewell astronaut could not start', error);
    return false;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const resize = () => {
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  };
  resize();

  const still = prefersReducedMotion();
  const progress = () => {
    if (still) return STILL_PROGRESS;
    const box = section.getBoundingClientRect(), travel = box.height - window.innerHeight;
    return Math.min(1, Math.max(0, -box.top / Math.max(1, travel)));
  };

  let time = 0;
  const draw = () => {
    const p = progress(), aspect = canvas.width / Math.max(1, canvas.height);
    const story = storyAt(p, aspect), cam = story.camera;
    const near = Math.max(0.5, cam.dist / 120);
    canvas.style.opacity = String(1 - ease((p - FADE_FROM) / (1 - FADE_FROM)));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(loc.uProj, false, perspective(aspect, { fov: cam.fov, near, far: 20000 }));
    gl.uniformMatrix4fv(loc.uView, false, lookAt(cam.eye, cam.target, cam.roll));
    gl.uniform3fv(loc.uEye, cam.eye);
    gl.uniform1f(loc.uT, time);
    gl.uniform1f(loc.uDpr, dpr);
    gl.uniform1f(loc.uP, p);
    gl.uniform1f(loc.uAspect, aspect);
    gl.uniform1f(loc.uSizeRef, 900 * Math.min(1, Math.max(0.03, cam.dist / 1400)) * (1 + story.swoosh * 2));
    gl.uniform1f(loc.uFog, 30000);
    gl.uniform1f(loc.uNear, near);
    gl.uniform1f(loc.uGather, 0);
    gl.uniform1f(loc.uLensR, 0);
    gl.uniform1i(loc.uFace, 0);
    gl.uniform1f(loc.uVisor, story.visor);
    gl.uniform1f(loc.uWave, story.wave);
    gl.uniform1f(loc.uPull, story.pull);
    gl.uniform1f(loc.uSwoosh, story.swoosh);
    gl.uniform3fv(loc.uOffset, story.offset);
    gl.uniform1f(loc.uGain, story.gain);
    gl.uniform1f(loc.uDot, 1 + (story.gain - 1) * 0.6);
    gl.drawArrays(gl.POINTS, 0, count);
  };

  uploadFace(gl, faceUrl, () => { if (still) draw(); });
  if (still) {
    time = 3;
    draw();
    new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
    return true;
  }
  new ResizeObserver(resize).observe(canvas);
  const stop = animateWhileVisible(section, (dt) => { time += dt; draw(); });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    console.warn('The farewell astronaut lost its graphics context and stopped');
  });
  return true;
}
