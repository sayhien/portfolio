// Renderer and cameras for the space bands (shaders in space-band-scenes.ts).
// Each band is one quiet shot: the camera turns slowly around the scene while
// the story plays. When the story ends it holds for a few seconds, fades out
// and builds again from the start, like the hero skies that loop at the top of
// each case study. The clock only runs while the band is well in view.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible, buildProgram, uploadAttribute } from './webgl-helpers';
import { FRAGMENT, VERTEX_MAIN } from './case-sky-scenes';
import { BAND_SHADERS } from './space-band-scenes';
import type { BandName } from './space-band-scenes';
import { lookAt, perspective } from './camera-math';
import type { Vec3 } from './camera-math';

export type { BandName };
type Shot = { eye: Vec3; target: Vec3; fov: number };
type Extra = (gl: WebGLRenderingContext, program: WebGLProgram) => (t: number) => void;
type BandDef = { count: number; story: number; still: number; far: number; fog: number; camera: (clock: number) => Shot };

const MAX_DPR = 1.5;
const PHONE_SCALE = 0.55;
const START_RATIO = 0.35; // how much of the band must be on screen for its clock to run
const HOLD_S = 4; // the finished scene rests this long (in real seconds) before building again
const STORY_SPEED = 1.25; // every story plays a quarter faster than its timeline
const FADE_S = 0.8;

const smooth = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };

/** A camera circling its target slowly, or swaying gently when `sway` limits the turn. */
function turning(target: Vec3, radius: number, height: number, speed: number, fov = 46, sway = 0, start = 0) {
  return (clock: number): Shot => {
    const angle = sway ? start + Math.sin(clock * speed) * sway : start + clock * speed;
    return { eye: [target[0] + Math.sin(angle) * radius, target[1] + height, target[2] + Math.cos(angle) * radius], target, fov };
  };
}

// ---------------------------------------------------------------- Checkpoint rings: the craft's course
/** How far along the course the craft is: mostly a steady glide, gently eased at the ends. Feeds uCraftU in the shader. */
const craftU = (t: number) => { const x = Math.min(1, Math.max(0, (t - 0.5) / 7.5)); return 0.02 + 0.96 * (0.25 * smooth(x) + 0.75 * x); };

const ringsExtra: Extra = (gl, program) => {
  const loc = gl.getUniformLocation(program, 'uCraftU');
  return (t) => gl.uniform1f(loc, craftU(t));
};

// ---------------------------------------------------------------- The bands

const BANDS: Record<BandName, BandDef> = {
  // story is in band seconds: the delivery timeline ends near 8.6 and runs at DELIVERY_SPEED inside the shader
  delivery: { count: 140000, story: 7.9, still: 3.1, far: 14000, fog: 9000, camera: turning([0, 270, -400], 1280, -30, 0.1, 46, 0.12) },
  station: { count: 130000, story: 14.5, still: 15, far: 16000, fog: 12000, camera: turning([0, -20, 0], 820, 250, 0.035, 46, 0, -0.7) },
  meteors: { count: 120000, story: 11.5, still: 7.8, far: 12000, fog: 12000, camera: turning([-150, 0, -300], 1350, 180, 0.05, 48, 0.3) },
  rings: { count: 110000, story: 9, still: 5.2, far: 9000, fog: 5000, camera: turning([0, 0, 0], 1350, 420, 0.03, 46, 0, 0.2) },
  crystals: { count: 150000, story: 17.5, still: 6.2, far: 9000, fog: 4000, camera: turning([90, 45, 0], 400, 140, 0.05, 48, 0.4, 0.95) },
};
const EXTRAS: Partial<Record<BandName, Extra>> = { rings: ringsExtra };

function setupProgram(gl: WebGLRenderingContext, name: BandName, count: number) {
  const program = buildProgram(gl, BAND_SHADERS[name] + VERTEX_MAIN, FRAGMENT);
  gl.useProgram(program);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  uploadAttribute(gl, program, 'aSeed', seeds, 4);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // additive light
  return program;
}

/** Start a band on its canvas. Returns false if this browser cannot draw it. */
export function startSpaceBand(host: HTMLElement, canvas: HTMLCanvasElement, name: BandName): boolean {
  const band = BANDS[name];
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!band || !gl) return false;
  const count = Math.round(band.count * (window.matchMedia('(max-width: 760px)').matches ? PHONE_SCALE : 1));
  let program: WebGLProgram;
  try {
    program = setupProgram(gl, name, count);
  } catch (error) {
    console.warn(`Space band "${name}" could not start`, error);
    return false;
  }
  const names = ['uProj', 'uView', 'uEye', 'uT', 'uDpr', 'uP', 'uAspect', 'uSizeRef', 'uFog', 'uNear', 'uGather', 'uLensR'] as const;
  const loc = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)])) as Record<(typeof names)[number], WebGLUniformLocation | null>;
  const setExtra = EXTRAS[name]?.(gl, program);

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const resize = () => {
    canvas.width = Math.round(host.clientWidth * dpr);
    canvas.height = Math.round(host.clientHeight * dpr);
  };
  resize();

  const draw = (t: number, clock: number) => {
    const shot = band.camera(clock), aspect = canvas.width / Math.max(1, canvas.height);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(loc.uProj, false, perspective(aspect, { fov: shot.fov, far: band.far }));
    gl.uniformMatrix4fv(loc.uView, false, lookAt(shot.eye, shot.target));
    gl.uniform3fv(loc.uEye, shot.eye);
    gl.uniform1f(loc.uT, t);
    gl.uniform1f(loc.uDpr, dpr);
    gl.uniform1f(loc.uP, 0);
    gl.uniform1f(loc.uAspect, aspect);
    gl.uniform1f(loc.uSizeRef, 900);
    gl.uniform1f(loc.uFog, band.fog);
    gl.uniform1f(loc.uNear, 10);
    gl.uniform1f(loc.uGather, 0);
    gl.uniform1f(loc.uLensR, 0);
    setExtra?.(t);
    gl.drawArrays(gl.POINTS, 0, count);
  };

  if (prefersReducedMotion()) {
    draw(band.still, 0);
    new ResizeObserver(() => { resize(); draw(band.still, 0); }).observe(host);
    return true;
  }

  new ResizeObserver(resize).observe(host);
  // The story clock runs only while enough of the band is on screen; the camera clock never resets.
  const period = band.story + HOLD_S * STORY_SPEED;
  let time = 0, clock = 0, watching = false;
  new IntersectionObserver(([entry]) => { watching = entry.intersectionRatio >= START_RATIO; }, { threshold: [0, START_RATIO, 0.6] }).observe(host);
  const stop = animateWhileVisible(host, (dt) => {
    if (watching) { time = (time + dt * STORY_SPEED) % period; clock += dt; }
    // fade in as the scene starts building, and out just before it starts again
    canvas.style.opacity = String(Math.min(1, time / (FADE_S * STORY_SPEED), (period - time) / (FADE_S * STORY_SPEED)));
    draw(time, clock);
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    console.warn(`Space band "${name}" lost its graphics context and stopped`);
  });
  return true;
}
