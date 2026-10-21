// Renderer and moving cameras for the case study hero skies (shaders in
// case-sky-scenes.ts). Each scene draws only while on screen; reduced motion
// shows one still frame. On wide screens the scene sits to the right of the
// headline; on phones it sits below it.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible, buildProgram, uploadAttribute } from './webgl-helpers';
import { FRAGMENT, SKY_SHADERS, VERTEX_MAIN } from './case-sky-scenes';

export type CaseSkyName = keyof typeof SKY_SHADERS;

type Vec3 = [number, number, number];
type Camera = { eye: Vec3; target: Vec3; shift: [number, number] };

const MAX_DPR = 1.5;
const PHONE_SCALE = 0.55;
const STILL_TIME = 12;

/** A camera that swings back and forth around a target, so the scene always has depth. */
function orbit(t: number, radius: number, height: number, swing: number, speed: number, extra: Vec3 = [0, 0, 0]): Vec3 {
  const ang = Math.sin(t * speed) * swing;
  return [Math.sin(ang) * radius + extra[0], height + extra[1], Math.cos(ang) * radius + extra[2]];
}

const SKIES: Record<CaseSkyName, { count: number; camera: (t: number) => Camera; baseShift?: [number, number] }> = {
  chatbot: { count: 110000, camera: (t) => ({ eye: orbit(t, 1050 - Math.sin(t * 0.21) * 120, 220 + Math.sin(t * 0.17) * 160, 0.9, 0.11), target: [0, 0, 0], shift: [0, 0] }) },
  remit: { count: 140000, camera: (t) => ({ eye: orbit(t, 1180, 420, 0.35, 0.07), target: [0, 120, 0], shift: [0.04, -0.3] }) },
  health: { count: 110000, camera: (t) => ({ eye: orbit(t, 1150 - Math.sin(t * 0.13) * 160, 60 + Math.sin(t * 0.09) * 130, 1.1, 0.06), target: [0, 0, 0], shift: [0, 0] }) },
  library: { count: 120000, camera: (t) => ({ eye: orbit(t, 1250 - Math.sin(t * 0.15) * 150, 320 + Math.sin(t * 0.11) * 160, 0.8, 0.07), target: [0, 0, 0], shift: [0, 0] }) },
  crumb: {
    count: 140000,
    camera: (t) => {
      // the meteor lands 5.2 seconds into each 11 second cycle; the camera eases in, then nudges on impact
      const u = t % 11, e = u - 5.2, shake = e > 0 ? Math.exp(-e * 4) * 6 : 0;
      const push = e > 0 ? Math.exp(-e * 0.6) * 140 : (u / 5.2) * 140;
      return { eye: orbit(t, 1250 - push, 260, 0.5, 0.08, [Math.sin(t * 57) * shake, Math.cos(t * 43) * shake, 0]), target: [-60, 90, 0], shift: [0, 0] };
    },
  },
};

function perspective(shift: [number, number], aspect: number): Float32Array {
  let tanV = Math.tan((42 * Math.PI) / 360);
  if (aspect < 1.6) tanV *= Math.min(2, 1.6 / aspect);
  const f = 1 / tanV, near = 10, far = 9000, nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, -shift[0], -shift[1], (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

function lookAt(eye: Vec3, target: Vec3): Float32Array {
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm = (v: Vec3): Vec3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const z = norm(sub(eye, target)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}

/** Start a sky on a canvas. Returns false if this browser cannot draw it. */
export function startCaseSky(host: HTMLElement, canvas: HTMLCanvasElement, name: CaseSkyName): boolean {
  const sky = SKIES[name];
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!sky || !gl) return false;
  let program: WebGLProgram;
  try {
    program = buildProgram(gl, SKY_SHADERS[name] + VERTEX_MAIN, FRAGMENT);
  } catch (error) {
    console.warn(`Case study sky "${name}" could not start`, error);
    return false;
  }
  gl.useProgram(program);

  const narrowMedia = window.matchMedia('(max-width: 760px)');
  const count = Math.round(sky.count * (narrowMedia.matches ? PHONE_SCALE : 1));
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  uploadAttribute(gl, program, 'aSeed', seeds, 4);

  const names = ['uProj', 'uView', 'uEye', 'uT', 'uDpr', 'uP', 'uAspect', 'uSizeRef', 'uFog', 'uNear', 'uGather', 'uLensR'] as const;
  const loc = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)])) as Record<(typeof names)[number], WebGLUniformLocation | null>;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // additive light

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const resize = () => {
    canvas.width = Math.round(host.clientWidth * dpr);
    canvas.height = Math.round(host.clientHeight * dpr);
  };
  resize();

  const draw = (t: number) => {
    const cam = sky.camera(t), aspect = canvas.width / Math.max(1, canvas.height);
    // leave room for the headline: to the right on wide screens, lower on phones
    const shift: [number, number] = narrowMedia.matches ? [cam.shift[0], cam.shift[1] - 0.5] : [cam.shift[0] + 0.5, cam.shift[1]];
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(loc.uProj, false, perspective(shift, aspect));
    gl.uniformMatrix4fv(loc.uView, false, lookAt(cam.eye, cam.target));
    gl.uniform3fv(loc.uEye, cam.eye);
    gl.uniform1f(loc.uT, t);
    gl.uniform1f(loc.uDpr, dpr);
    gl.uniform1f(loc.uP, 0);
    gl.uniform1f(loc.uAspect, aspect);
    gl.uniform1f(loc.uSizeRef, 900);
    gl.uniform1f(loc.uFog, 3200);
    gl.uniform1f(loc.uNear, 10);
    gl.uniform1f(loc.uGather, 1);
    gl.uniform1f(loc.uLensR, 0);
    gl.drawArrays(gl.POINTS, 0, count);
  };

  if (prefersReducedMotion()) {
    draw(STILL_TIME);
    new ResizeObserver(() => { resize(); draw(STILL_TIME); }).observe(host);
    return true;
  }
  new ResizeObserver(resize).observe(host);
  let time = 0;
  const stop = animateWhileVisible(host, (dt) => { time += dt; draw(time); });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    console.warn(`Case study sky "${name}" lost its graphics context and stopped`);
  });
  return true;
}
