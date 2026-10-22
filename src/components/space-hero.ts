// Home page hero: start beside Saturn, fly through the Cassini gap in its
// rings and get pulled into Earth's clouds as the visitor scrolls. An alien
// saucer floats near Saturn and waves when greeted. The scene draws only while
// the hero is on screen. Reduced motion shows one still frame and no flight.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible, buildProgram, uploadAttribute } from './webgl-helpers';
import { FRAGMENT, VERTEX } from './space-hero-scene';
import { uploadLand } from './earth';
import { add, cameraAxes, ease, length, lookAt, mix, norm, perspective, scale, sub, viewTangent } from './camera-math';
import type { Vec3 } from './camera-math';

const SATURN_RADIUS = 420;
const EARTH_RADIUS = 210;
const RING_TILT_X = 0.16;
const RING_TILT_Z = -0.12;
const START: Vec3 = [1400, 190, 1100];
const GAP_ANGLE = 2.35; // where on the ring the camera threads the Cassini gap
const PARTICLES = 420000;
const EARTH_SHARE = 0.3; // particles that form Earth's surface
const PHONE_SCALE = 0.5;
const MAX_DPR = 1.5;
const STILL_TIME = 40;
const BASE_FOV = 42;

// Scroll progress milestones. The swoosh into Earth is the last half of the
// scroll, and the work section rises over its tail (see index.astro).
export const COPY_FADE_END = 0.112;
const THROUGH_RINGS = 0.256, EARTH_FILLS = 0.443, ENTER_FROM = 0.623, SWOOSH_END = 0.99;

const rotX = ([x, y, z]: Vec3, a: number): Vec3 => [x, Math.cos(a) * y - Math.sin(a) * z, Math.sin(a) * y + Math.cos(a) * z];
const rotZ = ([x, y, z]: Vec3, a: number): Vec3 => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y, z];

// A point in the Cassini gap, and Earth placed straight behind it as seen from the start.
const GAP = rotZ(rotX([Math.cos(GAP_ANGLE) * 1.995 * SATURN_RADIUS, 0, Math.sin(GAP_ANGLE) * 1.995 * SATURN_RADIUS], RING_TILT_X), RING_TILT_Z);
const EARTH = add(GAP, scale(norm(sub(GAP, START)), 3400));
const THROUGH = add(GAP, scale(norm(sub(GAP, START)), 260));

type Camera = { eye: Vec3; target: Vec3; shift: [number, number]; dist: number; roll: number; fov: number };

/** How strongly the swoosh pulls, rising and falling over its stretch of the scroll. */
const swooshAt = (p: number) => Math.min(1, Math.max(0, (p - EARTH_FILLS) / (SWOOSH_END - EARTH_FILLS)));
const pullAt = (p: number) => Math.sin(Math.PI * swooshAt(p));

/** Where the camera is for a scroll progress from 0 (Saturn) to 1 (inside Earth's clouds). */
function cameraAt(p: number, narrow: boolean): Camera {
  if (p < THROUGH_RINGS) {
    const k = ease(p / THROUGH_RINGS);
    const shift: [number, number] = narrow ? [0.2 * (1 - k), -0.35 * (1 - k)] : [0.75 * (1 - k), 0.02 * (1 - k)];
    // A slight bank as we thread the gap, like a ship leaning into a turn.
    const roll = Math.sin(Math.PI * k) * 0.12;
    return { eye: mix(START, THROUGH, k), target: mix([150, 0, 0], EARTH, ease(k * 1.5)), shift, dist: 3000, roll, fov: BASE_FOV };
  }
  // Close in on Earth evenly in log space: first until it fills the view, then into the clouds.
  const dir = norm(sub(THROUGH, EARTH)), d0 = length(sub(THROUGH, EARTH)), lg = Math.log;
  const k1 = ease((p - THROUGH_RINGS) / (EARTH_FILLS - THROUGH_RINGS)), k2 = ease((p - EARTH_FILLS) / (SWOOSH_END - 0.06 - EARTH_FILLS));
  const near = lg(d0) + (lg(EARTH_RADIUS * 2.2) - lg(d0)) * k1;
  const dist = Math.exp(near + (lg(EARTH_RADIUS * 1.03) - lg(EARTH_RADIUS * 2.2)) * k2);
  // During the swoosh the camera corkscrews and the lens widens, for a sense of speed.
  const pull = pullAt(p);
  return { eye: add(EARTH, scale(dir, dist)), target: EARTH, shift: [0, 0], dist, roll: swooshAt(p) * 0.9 + pull * 0.15, fov: BASE_FOV + pull * 18 };
}

// ---------------------------------------------------------------- The saucer

const SAUCER_SCALE = 2.2;
const SAUCER_DEPTH = 700; // in front of Saturn, as seen from the start
const WAVE_S = 2.8;

/** A world point that sits at a spot on screen (from -1 to 1 each way) in the opening shot. */
function anchorFor(aspect: number, narrow: boolean): Vec3 {
  const cam = cameraAt(0, narrow);
  const spot = narrow ? [0.38, -0.66] : [0.2, -0.55];
  const tan = viewTangent(aspect, cam.fov);
  const x = (spot[0] - cam.shift[0]) * SAUCER_DEPTH * aspect * tan, y = (spot[1] - cam.shift[1]) * SAUCER_DEPTH * tan;
  const { right, up, back } = cameraAxes(cam.eye, cam.target, cam.roll);
  return add(add(add(cam.eye, scale(right, x)), scale(up, y)), scale(back, -SAUCER_DEPTH));
}

/** The saucer drifts in a lazy loop and hops when it says hello. */
function saucerAt(anchor: Vec3, t: number, sinceHello: number, narrow: boolean): Vec3 {
  const cam = cameraAt(0, narrow);
  const { right, up, back } = cameraAxes(cam.eye, cam.target);
  const hop = sinceHello < 0.7 ? Math.sin((Math.PI * sinceHello) / 0.7) * 26 : 0;
  const drift = add(add(scale(right, Math.sin(t * 0.21) * 55 + Math.sin(t * 0.47) * 16), scale(up, Math.sin(t * 0.33) * 20 + hop)), scale(back, Math.sin(t * 0.17) * 60));
  return add(anchor, drift);
}

/** How raised the waving arm is, a few seconds after a hello. */
const waveAt = (sinceHello: number) => (sinceHello < 0 ? 0 : ease(sinceHello / 0.25) * (1 - ease((sinceHello - (WAVE_S - 0.5)) / 0.5)));

function multiply(m: Float32Array, v: [number, number, number, number]) {
  return [0, 1, 2, 3].map((row) => m[row] * v[0] + m[4 + row] * v[1] + m[8 + row] * v[2] + m[12 + row] * v[3]);
}

/** Screen position in CSS pixels, or null when the point is behind the camera. */
function toScreen(proj: Float32Array, view: Float32Array, point: Vec3, width: number, height: number) {
  const clip = multiply(proj, multiply(view, [...point, 1] as [number, number, number, number]) as [number, number, number, number]);
  if (clip[3] <= 0) return null;
  return { x: ((clip[0] / clip[3]) * 0.5 + 0.5) * width, y: (0.5 - (clip[1] / clip[3]) * 0.5) * height, w: clip[3] };
}

// ---------------------------------------------------------------- Start

export type SaucerSpot = { x: number; y: number; size: number; visible: boolean };
type Hooks = { onProgress: (p: number) => void; onSaucer: (spot: SaucerSpot) => void };
export type SpaceHero = { greet: () => void };

const UNIFORMS = ['uProj', 'uView', 'uEye', 'uE', 'uT', 'uDpr', 'uSizeRef', 'uFog', 'uNear', 'uEnter', 'uTiltX', 'uTiltZ', 'uScroll', 'uP', 'uAspect', 'uEarthN', 'uLand', 'uPull', 'uSwoosh', 'uSaucer', 'uSaucerScale', 'uWave'] as const;
type Uniforms = Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

function setupProgram(gl: WebGLRenderingContext, count: number) {
  const program = buildProgram(gl, VERTEX, FRAGMENT);
  gl.useProgram(program);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  uploadAttribute(gl, program, 'aSeed', seeds, 4);
  const index = new Float32Array(count);
  for (let i = 0; i < count; i++) index[i] = i;
  uploadAttribute(gl, program, 'aIdx', index, 1);
  uploadLand(gl);
  const loc = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)])) as Uniforms;
  gl.uniform1i(loc.uLand, 0);
  gl.uniform1f(loc.uEarthN, Math.round(count * EARTH_SHARE));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // additive light
  return loc;
}

/**
 * Start the hero on a fixed canvas. `section` is the tall scrolling hero; its
 * scroll position drives the flight. Returns null if this browser cannot draw it.
 */
export function startSpaceHero(section: HTMLElement, canvas: HTMLCanvasElement, hooks: Hooks): SpaceHero | null {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl || gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) return null;
  const narrowMedia = window.matchMedia('(max-width: 760px)');
  const count = Math.round(PARTICLES * (narrowMedia.matches ? PHONE_SCALE : 1));
  let loc: Uniforms;
  try {
    loc = setupProgram(gl, count);
  } catch (error) {
    console.warn('The space hero could not start', error);
    return null;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const resize = () => {
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  const still = prefersReducedMotion();
  const progress = () => {
    if (still) return 0;
    const box = section.getBoundingClientRect(), travel = box.height - window.innerHeight;
    return Math.min(1, Math.max(0, -box.top / Math.max(1, travel)));
  };

  let time = still ? STILL_TIME : 0;
  let helloAt = -100;

  const draw = () => {
    const p = progress(), narrow = narrowMedia.matches, cam = cameraAt(p, narrow);
    const aspect = canvas.width / Math.max(1, canvas.height), near = Math.max(0.5, cam.dist / 120);
    const since = time - helloAt;
    const saucer = saucerAt(anchorFor(aspect, narrow), time, since, narrow);
    const proj = perspective(aspect, { shift: cam.shift, fov: cam.fov, near, far: 60000 });
    const view = lookAt(cam.eye, cam.target, cam.roll);
    hooks.onProgress(p);
    reportSaucer(proj, view, saucer, p);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(loc.uProj, false, proj);
    gl.uniformMatrix4fv(loc.uView, false, view);
    gl.uniform3fv(loc.uEye, cam.eye);
    gl.uniform3fv(loc.uE, EARTH);
    gl.uniform1f(loc.uT, time);
    gl.uniform1f(loc.uDpr, dpr);
    gl.uniform1f(loc.uSizeRef, 900 * Math.min(1, Math.max(0.12, cam.dist / 1400)));
    gl.uniform1f(loc.uFog, 40000);
    gl.uniform1f(loc.uNear, near);
    gl.uniform1f(loc.uEnter, ease((p - ENTER_FROM) / (SWOOSH_END - ENTER_FROM)));
    gl.uniform1f(loc.uTiltX, RING_TILT_X);
    gl.uniform1f(loc.uTiltZ, RING_TILT_Z);
    gl.uniform1f(loc.uScroll, window.scrollY / Math.max(1, window.innerHeight));
    gl.uniform1f(loc.uP, p);
    gl.uniform1f(loc.uAspect, aspect);
    gl.uniform1f(loc.uPull, pullAt(p));
    gl.uniform1f(loc.uSwoosh, swooshAt(p));
    gl.uniform3fv(loc.uSaucer, saucer);
    gl.uniform1f(loc.uSaucerScale, SAUCER_SCALE);
    gl.uniform1f(loc.uWave, still ? (since < WAVE_S ? 1 : 0) : waveAt(since));
    gl.drawArrays(gl.POINTS, 0, count);
  };

  /** Tell the page where the saucer is, so the hello button can sit right on top of it. */
  const reportSaucer = (proj: Float32Array, view: Float32Array, saucer: Vec3, p: number) => {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const centre = toScreen(proj, view, saucer, width, height);
    const edge = toScreen(proj, view, add(saucer, scale(cameraAxes(cameraAt(0, false).eye, saucer).right, 26 * SAUCER_SCALE)), width, height);
    if (!centre || !edge) return hooks.onSaucer({ x: 0, y: 0, size: 0, visible: false });
    const size = Math.max(56, Math.hypot(edge.x - centre.x, edge.y - centre.y) * 1.7);
    const onScreen = centre.x > 0 && centre.x < width && centre.y > 0 && centre.y < height;
    hooks.onSaucer({ x: centre.x, y: centre.y, size, visible: onScreen && p < COPY_FADE_END });
  };

  const greet = () => {
    helloAt = time;
    // A still scene has no clock, so raise the arm now and lower it later.
    if (still) {
      draw();
      window.setTimeout(() => { helloAt = -100; draw(); }, WAVE_S * 1000);
    }
  };

  if (still) {
    draw();
    new ResizeObserver(draw).observe(canvas);
    return { greet };
  }
  const stop = animateWhileVisible(section, (dt) => { time += dt; draw(); });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    console.warn('The space hero lost its graphics context and stopped');
  });
  return { greet };
}
