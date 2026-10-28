// Renderer and moving cameras for the case study hero skies (shaders in
// case-sky-scenes.ts). Each scene draws only while on screen; reduced motion
// shows one still frame. On wide screens the scene sits to the right of the
// headline; on phones it sits below it.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible, buildProgram, uploadAttribute } from './webgl-helpers';
import { FRAGMENT, SKY_SHADERS, VERTEX_MAIN } from './case-sky-scenes';
import { lookAt, perspective } from './camera-math';
import type { Vec3 } from './camera-math';

export type CaseSkyName = keyof typeof SKY_SHADERS;

type Camera = { eye: Vec3; target: Vec3; shift: [number, number] };

const MAX_DPR = 1.5;
const PHONE_SCALE = 0.55;
const STILL_TIME = 12;

/** A camera that swings back and forth around a target, so the scene always has depth. */
function orbit(t: number, radius: number, height: number, swing: number, speed: number, extra: Vec3 = [0, 0, 0]): Vec3 {
  const ang = Math.sin(t * speed) * swing;
  return [Math.sin(ang) * radius + extra[0], height + extra[1], Math.cos(ang) * radius + extra[2]];
}

type SkyDef = {
  count: number;
  camera: (t: number) => Camera;
  baseShift?: [number, number];
  /** 0 skips the opening where every particle gathers in from afar (for scenes that build themselves). */
  gather?: number;
  /** The moment shown as a still picture when motion is reduced. */
  still?: number;
};

const SKIES: Record<CaseSkyName, SkyDef> = {
  cake: {
    count: 140000,
    gather: 0,
    still: 15.6, // the cake is finished and the candle is lit
    camera: (t) => { const a = Math.sin(t * 0.12) * 0.5; return { eye: [Math.sin(a) * 820, 250 + Math.sin(t * 0.09) * 20, Math.cos(a) * 820], target: [0, 30, 0], shift: [0, 0] }; },
  },
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
    gl.uniformMatrix4fv(loc.uProj, false, perspective(aspect, { shift }));
    gl.uniformMatrix4fv(loc.uView, false, lookAt(cam.eye, cam.target));
    gl.uniform3fv(loc.uEye, cam.eye);
    gl.uniform1f(loc.uT, t);
    gl.uniform1f(loc.uDpr, dpr);
    gl.uniform1f(loc.uP, 0);
    gl.uniform1f(loc.uAspect, aspect);
    gl.uniform1f(loc.uSizeRef, 900);
    gl.uniform1f(loc.uFog, 3200);
    gl.uniform1f(loc.uNear, 10);
    gl.uniform1f(loc.uGather, sky.gather ?? 1);
    gl.uniform1f(loc.uLensR, 0);
    gl.drawArrays(gl.POINTS, 0, count);
  };

  if (prefersReducedMotion()) {
    const still = sky.still ?? STILL_TIME;
    draw(still);
    new ResizeObserver(() => { resize(); draw(still); }).observe(host);
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
