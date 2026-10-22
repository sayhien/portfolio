// Renderer and film cameras for the space bands (shaders in space-band-scenes.ts).
// Each band is a short film: its clock only runs while the band is well in
// view, so nobody misses the story, and it can be replayed. Every camera is a
// list of shots; each shot is a rig (a camera that may itself move), and the
// film glides from one shot to the next with eased, film-like moves.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible, buildProgram, uploadAttribute } from './webgl-helpers';
import { FRAGMENT, VERTEX_MAIN } from './case-sky-scenes';
import { BAND_SHADERS } from './space-band-scenes';
import type { BandName } from './space-band-scenes';
import { add, cameraAxes, lookAt, mix, norm, perspective, scale, sub } from './camera-math';
import type { Vec3 } from './camera-math';

export type { BandName };
type View = { eye: Vec3; target: Vec3; roll: number; fov: number };
type Rig = (t: number) => View;
type Shot = { t: number; rig: Rig };
type Extra = (gl: WebGLRenderingContext, program: WebGLProgram) => (t: number) => void;
type BandDef = { count: number; shots: Shot[]; still: number; far: number; fog: number; extra?: Extra; shake?: (t: number) => number };

const MAX_DPR = 1.5;
const PHONE_SCALE = 0.55;
const START_RATIO = 0.35; // how much of the band must be on screen for its clock to run

const view = (eye: Vec3, target: Vec3, roll = 0, fov = 46): View => ({ eye, target, roll, fov });
const fixed = (eye: Vec3, target: Vec3, roll = 0, fov = 46): Rig => () => view(eye, target, roll, fov);
const smooth = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };

/** The camera at time t: between two shots it glides with an ease in and out. */
function shotAt(shots: Shot[], t: number): View {
  let index = 0;
  while (index < shots.length - 1 && t >= shots[index + 1].t) index++;
  const from = shots[index], to = shots[index + 1];
  const a = from.rig(t);
  if (!to) return a;
  const b = to.rig(t), k = smooth((t - from.t) / (to.t - from.t));
  return { eye: mix(a.eye, b.eye, k), target: mix(a.target, b.target, k), roll: a.roll + (b.roll - a.roll) * k, fov: a.fov + (b.fov - a.fov) * k };
}

/** A slow drift around the target after the story ends, so the scene never freezes. */
function settle(rig: Rig, after: number): Rig {
  return (t) => {
    const base = rig(t), ang = Math.sin(Math.max(0, t - after) * 0.06) * 0.35;
    const off = sub(base.eye, base.target);
    const turned: Vec3 = [off[0] * Math.cos(ang) - off[2] * Math.sin(ang), off[1], off[0] * Math.sin(ang) + off[2] * Math.cos(ang)];
    return { ...base, eye: add(base.target, turned) };
  };
}

// ---------------------------------------------------------------- Checkpoint rings: the craft's course
// Must match pathAt() in the RINGS shader.
const pathAt = (u: number): Vec3 => [-1000 + 2000 * u, Math.sin(u * Math.PI * 2) * 140 + Math.sin(u * 17) * 12, -Math.sin(u * Math.PI * 1.3) * 380 + 120];
/** How far along the course the craft is: half eased, half steady, so it never rushes. */
const craftU = (t: number) => { const x = Math.min(1, Math.max(0, (t - 1) / 12.5)); return 0.02 + 0.96 * (0.5 * smooth(x) + 0.5 * x); };
const chase = (lag: number, lead: number, lift: number, wide = 0): Rig => (t) => {
  const u = craftU(t), behind = pathAt(Math.max(0, u - lag)), ahead = pathAt(Math.min(1.1, u + lead));
  const side = norm([ahead[2] - behind[2], 0, behind[0] - ahead[0]]);
  return view(add(add(behind, [0, lift, 0]), scale(side, wide)), ahead, Math.sin(u * 9) * 0.12, 58);
};

// ---------------------------------------------------------------- Zodiac: the twelve stars and their figures
type Figure = { points: [number, number][]; lines: [number, number][] };
const FIGURES: Figure[] = [
  { // Leo: the sickle of its mane and the triangle of its body
    points: [[-0.55, 0.55], [-0.45, 0.74], [-0.25, 0.8], [-0.1, 0.62], [-0.2, 0.44], [-0.32, 0.26], [0.2, 0.36], [0.55, 0.42], [0.76, 0.22], [0.5, 0.0], [0.1, 0.04], [0.95, 0.32]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6], [5, 10], [6, 7], [7, 8], [8, 9], [9, 10], [7, 11]],
  },
  { // Scorpius: claws, a bright heart, and a long curled tail
    points: [[-0.8, 0.6], [-0.72, 0.42], [-0.88, 0.28], [-0.5, 0.3], [-0.35, 0.08], [-0.25, -0.18], [-0.08, -0.42], [0.18, -0.56], [0.42, -0.5], [0.57, -0.32], [0.52, -0.12], [0.66, -0.02]],
    lines: [[0, 1], [2, 1], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11]],
  },
  { // Gemini: the twins side by side
    points: [[-0.3, 0.75], [-0.35, 0.4], [-0.4, 0.05], [-0.55, -0.35], [-0.25, -0.4], [0.15, 0.7], [0.12, 0.35], [0.1, 0.0], [-0.05, -0.38], [0.3, -0.4], [-0.62, 0.3], [0.42, 0.32]],
    lines: [[0, 1], [1, 2], [2, 3], [2, 4], [5, 6], [6, 7], [7, 8], [7, 9], [1, 10], [6, 11], [1, 6]],
  },
  { // Sagittarius: the teapot, with its lid, spout and handle
    points: [[-0.6, 0.0], [-0.35, 0.18], [-0.05, 0.2], [0.25, 0.25], [0.2, -0.15], [-0.1, -0.25], [-0.45, -0.2], [-0.02, 0.48], [-0.88, 0.26], [0.52, 0.1], [0.46, -0.25], [-0.25, 0.45]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [1, 7], [7, 2], [0, 8], [3, 9], [9, 10], [10, 4]],
  },
];
const FIGURE_S = 6, MORPH_S = 1.6, DRAW_FROM = 1.3, DRAW_S = 1.4, FADE_S = 0.7, MAX_LINES = 13;
const starDepth = (star: number, figure: number) => (Math.sin(star * 12.9898 + figure * 78.233) * 43758.5453 % 1) * 260;

function starPlaces(t: number): Vec3[] {
  const cycle = t / FIGURE_S, now = Math.floor(cycle) % FIGURES.length, prev = (now + FIGURES.length - 1) % FIGURES.length;
  const k = smooth((t % FIGURE_S) / MORPH_S);
  return FIGURES[now].points.map((point, star) => {
    const before = FIGURES[prev].points[star];
    const a: Vec3 = [before[0] * 430, before[1] * 300, starDepth(star, prev)], b: Vec3 = [point[0] * 430, point[1] * 300, starDepth(star, now)];
    return t < MORPH_S ? b : mix(a, b, k);
  });
}

const zodiacExtra: Extra = (gl, program) => {
  const star = gl.getUniformLocation(program, 'uStar'), segA = gl.getUniformLocation(program, 'uSegA'), segB = gl.getUniformLocation(program, 'uSegB'), show = gl.getUniformLocation(program, 'uSegShow');
  return (t) => {
    const places = starPlaces(t), figure = FIGURES[Math.floor(t / FIGURE_S) % FIGURES.length], local = t % FIGURE_S;
    const drawn = Math.min(1, Math.max(0, (local - DRAW_FROM) / DRAW_S)) * (1 - Math.min(1, Math.max(0, (local - (FIGURE_S - FADE_S)) / FADE_S)));
    const a = new Float32Array(MAX_LINES * 3), b = new Float32Array(MAX_LINES * 3), s = new Float32Array(MAX_LINES);
    figure.lines.forEach(([from, to], line) => {
      a.set(places[from], line * 3);
      b.set(places[to], line * 3);
      s[line] = Math.min(1, Math.max(0, drawn * figure.lines.length - line * 0.6)); // lines draw in one after another
    });
    gl.uniform3fv(star, new Float32Array(places.flat()));
    gl.uniform3fv(segA, a);
    gl.uniform3fv(segB, b);
    gl.uniform1fv(show, s);
  };
};

const ringsExtra: Extra = (gl, program) => {
  const loc = gl.getUniformLocation(program, 'uCraftU');
  return (t) => gl.uniform1f(loc, craftU(t));
};

/** Seconds into each zodiac figure, so the camera swings to a new angle with every morph. */
const zodiacRig: Rig = (t) => {
  const figure = Math.floor(t / FIGURE_S), k = smooth((t % FIGURE_S) / MORPH_S);
  const angle = (figure - 1 + k) * 0.42, dist = 1050 - Math.sin((t % FIGURE_S) / FIGURE_S * Math.PI) * 120;
  return view([Math.sin(angle) * dist, 40 + Math.sin(t * 0.2) * 40, Math.cos(angle) * dist], [0, 0, 60], Math.sin(angle) * 0.08, 46);
};

// ---------------------------------------------------------------- The bands

const BANDS: Record<BandName, BandDef> = {
  station: {
    count: 140000, still: 15, far: 16000, fog: 12000,
    shots: [
      { t: 0, rig: fixed([-1000, 300, 1500], [0, -80, 0], 0.04, 46) },
      { t: 3, rig: fixed([-430, 150, 660], [20, 0, 0], 0.1, 50) },
      { t: 6, rig: fixed([380, 230, 720], [60, 0, 80], -0.1, 50) },
      { t: 8.6, rig: fixed([560, 60, -660], [60, -60, -60], 0.14, 52) },
      { t: 11, rig: fixed([330, 110, 280], [90, 0, 0], -0.06, 56) },
      { t: 14, rig: settle(fixed([-1150, 520, 1350], [0, -40, 0], 0, 44), 14) },
    ],
  },
  meteors: {
    count: 130000, still: 13.5, far: 12000, fog: 12000,
    shake: (t) => (t > 10.6 && t < 14 ? 3.5 : 0),
    shots: [
      { t: 0, rig: fixed([0, 60, 900], [0, 110, -400], 0, 52) },
      { t: 4, rig: fixed([-130, 40, 760], [-60, 190, -500], 0.05, 54) },
      { t: 8, rig: fixed([150, 30, 700], [40, 250, -600], -0.06, 58) },
      { t: 12, rig: fixed([0, 25, 620], [0, 330, -700], 0.03, 64) },
      { t: 15.5, rig: settle(fixed([0, 70, 980], [0, 130, -500], 0, 52), 15.5) },
    ],
  },
  rings: {
    count: 120000, still: 15, far: 9000, fog: 5000,
    shots: [
      // rings are passed at about 3.7, 5.9, 7.3, 8.6 and 10.9 seconds
      { t: 0, rig: fixed([0, 360, 1700], [0, 0, 0], 0, 50) },
      { t: 2.2, rig: chase(0.07, 0.05, 60) },
      { t: 6.6, rig: chase(0.02, 0.02, 70, 420) },
      { t: 9.2, rig: chase(-0.14, 0, 30) },
      { t: 12.4, rig: settle(fixed([-150, 560, 1900], [0, 0, 0], 0, 48), 12.4) },
    ],
  },
  zodiac: { count: 90000, still: 3.4, far: 9000, fog: 6000, shots: [{ t: 0, rig: zodiacRig }] },
  clouds: {
    count: 130000, still: 11, far: 9000, fog: 4000,
    shake: (t) => (t > 8.5 && t < 9.4 ? 5 * (9.4 - t) : 0),
    shots: [
      { t: 0, rig: fixed([0, 40, 1500], [0, 0, -300], 0.06, 58) },
      { t: 3.5, rig: fixed([140, 120, 900], [0, 0, 0], -0.04, 48) },
      { t: 7.5, rig: fixed([-120, 90, 560], [-230, 150, 0], 0.05, 46) },
      { t: 11, rig: settle(fixed([60, 80, 1000], [0, 0, 0], 0, 46), 11) },
    ],
  },
};
const EXTRAS: Partial<Record<BandName, Extra>> = { zodiac: zodiacExtra, rings: ringsExtra };

/** A gentle handheld wobble, plus any shake the scene asks for. */
function handheld(v: View, t: number, shake: number): View {
  const { right, up } = cameraAxes(v.eye, v.target);
  const sway = 2 + shake, x = Math.sin(t * 0.9) * sway + Math.sin(t * 23) * shake, y = Math.sin(t * 0.7 + 1) * sway + Math.cos(t * 19) * shake;
  return { ...v, eye: add(add(v.eye, scale(right, x)), scale(up, y)) };
}

export type BandControls = { replay: () => void };

/** Start a band on its canvas. Returns null if this browser cannot draw it. */
export function startSpaceBand(host: HTMLElement, canvas: HTMLCanvasElement, name: BandName, onTime: (t: number) => void): BandControls | null {
  const band = BANDS[name];
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!band || !gl) return null;
  let program: WebGLProgram;
  try {
    program = buildProgram(gl, BAND_SHADERS[name] + VERTEX_MAIN, FRAGMENT);
  } catch (error) {
    console.warn(`Space band "${name}" could not start`, error);
    return null;
  }
  gl.useProgram(program);
  const count = Math.round(band.count * (window.matchMedia('(max-width: 760px)').matches ? PHONE_SCALE : 1));
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  uploadAttribute(gl, program, 'aSeed', seeds, 4);
  const names = ['uProj', 'uView', 'uEye', 'uT', 'uDpr', 'uP', 'uAspect', 'uSizeRef', 'uFog', 'uNear', 'uGather', 'uLensR'] as const;
  const loc = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)])) as Record<(typeof names)[number], WebGLUniformLocation | null>;
  const setExtra = EXTRAS[name]?.(gl, program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // additive light

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const resize = () => {
    canvas.width = Math.round(host.clientWidth * dpr);
    canvas.height = Math.round(host.clientHeight * dpr);
  };
  resize();

  const draw = (t: number) => {
    const cam = handheld(shotAt(band.shots, t), t, band.shake?.(t) ?? 0), aspect = canvas.width / Math.max(1, canvas.height);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(loc.uProj, false, perspective(aspect, { fov: cam.fov, far: band.far }));
    gl.uniformMatrix4fv(loc.uView, false, lookAt(cam.eye, cam.target, cam.roll));
    gl.uniform3fv(loc.uEye, cam.eye);
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
    onTime(t);
  };

  if (prefersReducedMotion()) {
    draw(band.still);
    new ResizeObserver(() => { resize(); draw(band.still); }).observe(host);
    return { replay: () => draw(band.still) };
  }

  new ResizeObserver(resize).observe(host);
  // The story clock runs only while enough of the band is on screen.
  let time = 0, watching = false;
  new IntersectionObserver(([entry]) => { watching = entry.intersectionRatio >= START_RATIO; }, { threshold: [0, START_RATIO, 0.6] }).observe(host);
  const stop = animateWhileVisible(host, (dt) => { if (watching) time += dt; draw(time); });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    console.warn(`Space band "${name}" lost its graphics context and stopped`);
  });
  return { replay: () => { time = 0; } };
}
