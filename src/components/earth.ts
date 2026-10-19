// WebGL renderer for the particle earth scenes in earth-scenes.ts.
// A scene draws only while it is on screen and the page is not paused.
// Reduced motion shows one finished still frame. The cursor has no effect.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible, buildProgram, uploadAttribute } from './webgl-helpers';
import { FRAGMENT, SCENES, vertexSource } from './earth-scenes';
import type { Camera, EarthMode } from './earth-scenes';
import { LAND_HEIGHT, LAND_MASK, LAND_WIDTH } from '../data/land-mask';

export type { EarthMode };

const STILL_TIME = 40; // seconds in, once every particle has settled
const MAX_DPR = 1.5;
const SLOW_FRAME = 0.024; // seconds; slower than about 40 frames a second
const SAMPLE_FRAMES = 90;
const NARROW_QUERY = '(max-width: 760px)';
const PHONE_SCALE = 0.55; // fewer particles on small screens

let landPixels: Uint8Array | null = null;
function getLandPixels(): Uint8Array {
  if (landPixels) return landPixels;
  const bits = atob(LAND_MASK);
  landPixels = new Uint8Array(LAND_WIDTH * LAND_HEIGHT);
  for (let i = 0; i < landPixels.length; i++) {
    if (bits.charCodeAt(i >> 3) & (1 << (i & 7))) landPixels[i] = 255;
  }
  return landPixels;
}

// Even dots over a whole sphere
function fibonacciSphere(i: number, n: number): [number, number, number] {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(1 - y * y);
  const a = i * 2.399963229728653;
  return [r * Math.sin(a), y, r * Math.cos(a)];
}

function perspective(cam: Camera, aspect: number): Float32Array {
  let tanV = Math.tan((cam.fov * Math.PI) / 360);
  if (aspect < 1.6) tanV *= Math.min(2, 1.6 / aspect); // keep the scene wide on narrow screens
  const f = 1 / tanV, near = 10, far = 8000, nf = 1 / (near - far);
  const [sx, sy] = cam.shift;
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, -sx, -sy, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

function lookAt(eye: number[], target: number[]): Float32Array {
  const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return v.map((x) => x / l); };
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const z = norm(sub(eye, target)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}

function uploadParticles(gl: WebGLRenderingContext, program: WebGLProgram, count: number, surface: number) {
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  const index = new Float32Array(count);
  for (let i = 0; i < count; i++) index[i] = i;
  const geo = new Float32Array(count * 3);
  for (let i = 0; i < surface; i++) geo.set(fibonacciSphere(i, surface), i * 3);
  uploadAttribute(gl, program, 'aSeed', seeds, 4);
  uploadAttribute(gl, program, 'aIdx', index, 1);
  uploadAttribute(gl, program, 'aGeo', geo, 3);
}

function uploadLand(gl: WebGLRenderingContext) {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, LAND_WIDTH, LAND_HEIGHT, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, getLandPixels());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/** Start a scene on a canvas. Returns false if this browser cannot draw it. */
export function startEarth(host: HTMLElement, canvas: HTMLCanvasElement, mode: EarthMode): boolean {
  const def = SCENES[mode];
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl || gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) return false;

  let program: WebGLProgram;
  try {
    program = buildProgram(gl, vertexSource(mode), FRAGMENT);
  } catch (error) {
    console.warn(`Earth scene "${mode}" could not start`, error);
    return false;
  }
  gl.useProgram(program);

  const narrowMedia = window.matchMedia(NARROW_QUERY);
  const scale = narrowMedia.matches ? PHONE_SCALE : 1;
  const count = Math.round(def.count * scale);
  const surface = Math.round(def.surface * scale);
  uploadParticles(gl, program, count, surface);
  uploadLand(gl);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1i(uniform('uLand'), 0);
  gl.uniform1f(uniform('uSurfN'), surface);
  const loc = { proj: uniform('uProj'), view: uniform('uView'), eye: uniform('uEye'), t: uniform('uT'), dpr: uniform('uDpr') };
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // additive light

  let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const resize = () => {
    canvas.width = Math.round(host.clientWidth * dpr);
    canvas.height = Math.round(host.clientHeight * dpr);
  };
  resize();

  const draw = (t: number) => {
    const cam = def.camera(t, narrowMedia.matches);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(loc.proj, false, perspective(cam, canvas.width / Math.max(1, canvas.height)));
    gl.uniformMatrix4fv(loc.view, false, lookAt(cam.eye, cam.target));
    gl.uniform3fv(loc.eye, cam.eye);
    gl.uniform1f(loc.t, t);
    gl.uniform1f(loc.dpr, dpr);
    gl.drawArrays(gl.POINTS, 0, count);
  };

  if (prefersReducedMotion()) {
    draw(STILL_TIME);
    new ResizeObserver(() => { resize(); draw(STILL_TIME); }).observe(host);
    return true;
  }
  new ResizeObserver(resize).observe(host);

  // Slow devices step down: first a lower resolution, then half the frame rate.
  let quality = 0, sampled = 0, sampleTime = 0, skip = false;
  const adapt = (dt: number) => {
    if (quality >= 2 || dt <= 0) return;
    sampled++; sampleTime += dt;
    if (sampled < SAMPLE_FRAMES) return;
    const slow = sampleTime / sampled > SLOW_FRAME;
    sampled = 0; sampleTime = 0;
    if (!slow) { quality = 2; return; }
    quality++;
    if (quality === 1 && dpr > 1) { dpr = 1; resize(); }
    else { quality = 2; skip = true; }
  };

  let time = 0, odd = false;
  const stop = animateWhileVisible(host, (dt) => {
    time += dt;
    odd = !odd;
    if (!skip || odd) { draw(time); adapt(skip ? dt * 2 : dt); }
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    console.warn(`Earth scene "${mode}" lost its graphics context and stopped`);
  });
  return true;
}
