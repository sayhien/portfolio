// Home page hero: start beside Saturn, fly through the Cassini gap in its
// rings and get pulled into Earth's clouds as the visitor scrolls. The scene
// draws only while the hero is on screen. Reduced motion shows one still frame
// of Saturn and Earth and no flight.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible, buildProgram, uploadAttribute } from './webgl-helpers';
import { FRAGMENT, VERTEX } from './space-hero-scene';
import { uploadLand } from './earth';

type Vec3 = [number, number, number];

const SATURN_RADIUS = 420;
const EARTH_RADIUS = 210;
const RING_TILT_X = 0.16;
const RING_TILT_Z = -0.12;
const START: Vec3 = [1400, 190, 1100];
const GAP_ANGLE = 2.35; // where on the ring the camera threads the Cassini gap
const PARTICLES = 380000;
const EARTH_SHARE = 0.3; // particles that form Earth's surface
const PHONE_SCALE = 0.5;
const MAX_DPR = 1.5;
const STILL_TIME = 40;
// Scroll progress milestones. The swoosh into Earth gets the last 28% of the scroll.
const THROUGH_RINGS = 0.417, EARTH_FILLS = 0.72, SWOOSH_END = 0.995;

const ease = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x * x * (3 - 2 * x); };
const mix = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3) => scale(a, 1 / (length(a) || 1));
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const rotX = ([x, y, z]: Vec3, a: number): Vec3 => [x, Math.cos(a) * y - Math.sin(a) * z, Math.sin(a) * y + Math.cos(a) * z];
const rotZ = ([x, y, z]: Vec3, a: number): Vec3 => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y, z];

// A point in the Cassini gap, and Earth placed straight behind it as seen from the start.
const GAP = rotZ(rotX([Math.cos(GAP_ANGLE) * 1.995 * SATURN_RADIUS, 0, Math.sin(GAP_ANGLE) * 1.995 * SATURN_RADIUS], RING_TILT_X), RING_TILT_Z);
const EARTH = add(GAP, scale(norm(sub(GAP, START)), 3400));
const THROUGH = add(GAP, scale(norm(sub(GAP, START)), 260));

type Camera = { eye: Vec3; target: Vec3; shift: [number, number]; dist: number };

/** Where the camera is for a scroll progress from 0 (Saturn) to 1 (inside Earth's clouds). */
function cameraAt(p: number, narrow: boolean): Camera {
  if (p < THROUGH_RINGS) {
    const k = ease(p / THROUGH_RINGS);
    const shift: [number, number] = narrow ? [0.2 * (1 - k), -0.35 * (1 - k)] : [0.75 * (1 - k), 0.02 * (1 - k)];
    return { eye: mix(START, THROUGH, k), target: mix([150, 0, 0], EARTH, ease(k * 1.5)), shift, dist: 3000 };
  }
  // Close in on Earth evenly in log space: first until it fills the view, then into the clouds.
  const dir = norm(sub(THROUGH, EARTH)), d0 = length(sub(THROUGH, EARTH)), lg = Math.log;
  const k1 = ease((p - THROUGH_RINGS) / (EARTH_FILLS - THROUGH_RINGS)), k2 = ease((p - EARTH_FILLS) / (SWOOSH_END - 0.06 - EARTH_FILLS));
  const near = lg(d0) + (lg(EARTH_RADIUS * 2.2) - lg(d0)) * k1;
  const dist = Math.exp(near + (lg(EARTH_RADIUS * 1.03) - lg(EARTH_RADIUS * 2.2)) * k2);
  return { eye: add(EARTH, scale(dir, dist)), target: EARTH, shift: [0, 0], dist };
}

function perspective(shift: [number, number], aspect: number, near: number, far: number): Float32Array {
  let tanV = Math.tan((42 * Math.PI) / 360);
  if (aspect < 1.6) tanV *= Math.min(2, 1.6 / aspect);
  const f = 1 / tanV, nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, -shift[0], -shift[1], (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

function lookAt(eye: Vec3, target: Vec3): Float32Array {
  const z = norm(sub(eye, target)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}

/**
 * Start the hero on a fixed canvas. `section` is the tall scrolling hero; its
 * scroll position drives the flight. Returns false if this browser cannot draw it.
 */
export function startSpaceHero(section: HTMLElement, canvas: HTMLCanvasElement, onProgress: (p: number) => void): boolean {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl || gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) return false;
  let program: WebGLProgram;
  try {
    program = buildProgram(gl, VERTEX, FRAGMENT);
  } catch (error) {
    console.warn('The space hero could not start', error);
    return false;
  }
  gl.useProgram(program);

  const narrowMedia = window.matchMedia('(max-width: 760px)');
  const count = Math.round(PARTICLES * (narrowMedia.matches ? PHONE_SCALE : 1));
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  uploadAttribute(gl, program, 'aSeed', seeds, 4);
  const index = new Float32Array(count);
  for (let i = 0; i < count; i++) index[i] = i;
  uploadAttribute(gl, program, 'aIdx', index, 1);
  uploadLand(gl);

  const names = ['uProj', 'uView', 'uEye', 'uE', 'uT', 'uDpr', 'uSizeRef', 'uFog', 'uNear', 'uEnter', 'uTiltX', 'uTiltZ', 'uScroll', 'uP', 'uAspect', 'uEarthN', 'uLand'] as const;
  const loc = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<(typeof names)[number], WebGLUniformLocation | null>;
  gl.uniform1i(loc.uLand, 0);
  gl.uniform1f(loc.uEarthN, Math.round(count * EARTH_SHARE));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // additive light

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

  const draw = (t: number) => {
    const p = progress(), cam = cameraAt(p, narrowMedia.matches);
    const aspect = canvas.width / Math.max(1, canvas.height), near = Math.max(0.5, cam.dist / 120);
    onProgress(p);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(loc.uProj, false, perspective(cam.shift, aspect, near, 60000));
    gl.uniformMatrix4fv(loc.uView, false, lookAt(cam.eye, cam.target));
    gl.uniform3fv(loc.uEye, cam.eye);
    gl.uniform3fv(loc.uE, EARTH);
    gl.uniform1f(loc.uT, t);
    gl.uniform1f(loc.uDpr, dpr);
    gl.uniform1f(loc.uSizeRef, 900 * Math.min(1, Math.max(0.12, cam.dist / 1400)));
    gl.uniform1f(loc.uFog, 40000);
    gl.uniform1f(loc.uNear, near);
    gl.uniform1f(loc.uEnter, ease((p - 0.84) / (SWOOSH_END - 0.84)));
    gl.uniform1f(loc.uTiltX, RING_TILT_X);
    gl.uniform1f(loc.uTiltZ, RING_TILT_Z);
    gl.uniform1f(loc.uScroll, window.scrollY / Math.max(1, window.innerHeight));
    gl.uniform1f(loc.uP, p);
    gl.uniform1f(loc.uAspect, aspect);
    gl.drawArrays(gl.POINTS, 0, count);
  };

  if (still) {
    draw(STILL_TIME);
    new ResizeObserver(() => draw(STILL_TIME)).observe(canvas);
    return true;
  }
  let time = 0;
  const stop = animateWhileVisible(section, (dt) => { time += dt; draw(time); });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    console.warn('The space hero lost its graphics context and stopped');
  });
  return true;
}
