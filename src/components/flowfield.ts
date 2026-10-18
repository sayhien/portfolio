// Particle engine for the case study backgrounds. Scenes live in
// flowfield-scenes.ts; this file handles the camera, glow drawing, labels,
// assembling on first view, pausing and reduced motion.
// Drawing is batched by colour and depth so thousands of dots stay smooth.
import { isPaused, prefersReducedMotion } from './motion';
import { COLOURS, SCENES } from './flowfield-scenes';
import type { FlowMode, Label, Scene, Seed } from './flowfield-scenes';

export type { FlowMode };
export type Footage = 'river' | 'grass' | 'forest';

const KINDS = Object.keys(COLOURS);
const DEPTH = [
  { alpha: 1, size: 7 },
  { alpha: 0.75, size: 5.5 },
  { alpha: 0.45, size: 4.2 },
];
// Glow dots come in a few fixed sizes, drawn once and stamped without scaling,
// which keeps thousands of glowing dots cheap even on slower phones.
const SIZES = [2.5, 3.5, 4.5, 6, 8, 10];
const WORLD_HEIGHT = 340;
const FOCAL = 900;
const INTRO_SECONDS = 3.5;
const MAX_DPR = 1.5;

function sizeStep(size: number): number {
  let step = 0;
  while (step < SIZES.length - 1 && size > (SIZES[step] + SIZES[step + 1]) / 2) step++;
  return step;
}

function makeSprite(rgb: number[], alpha: number, diameter: number): HTMLCanvasElement {
  const [r, g, b] = rgb;
  const px = Math.max(2, Math.ceil(diameter));
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = px;
  const sctx = sprite.getContext('2d')!;
  const c = px / 2;
  const glow = sctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
  glow.addColorStop(0.22, `rgba(${r},${g},${b},${alpha * 0.85})`);
  glow.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.2})`);
  glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
  sctx.fillStyle = glow;
  sctx.fillRect(0, 0, px, px);
  return sprite;
}

// One sprite per colour, depth and size, indexed the same way as the draw buckets
function makeSprites(dpr: number): HTMLCanvasElement[] {
  return KINDS.flatMap((kind) => DEPTH.flatMap(({ alpha }) =>
    SIZES.map((size) => makeSprite(COLOURS[kind], kind === 'dust' ? alpha * 0.7 : alpha, size * dpr))));
}

type Camera = { cy: number; sy: number; cp: number; sp: number; ox: number; oy: number; scale: number };

function project(cam: Camera, x: number, y: number, z: number): [number, number, number, number] {
  const rx = x * cam.cy - z * cam.sy;
  const rz0 = x * cam.sy + z * cam.cy;
  const yy = y - WORLD_HEIGHT / 2;
  const ry = yy * cam.cp - rz0 * cam.sp;
  const rz = yy * cam.sp + rz0 * cam.cp;
  const persp = FOCAL / Math.max(120, FOCAL + rz);
  return [cam.ox + rx * persp * cam.scale, cam.oy + ry * persp * cam.scale, persp, rz];
}

function drawLabels(ctx: CanvasRenderingContext2D, cam: Camera, labels: Label[], reveal: number, width: number) {
  ctx.textBaseline = 'middle';
  for (const label of labels) {
    const [x, y] = project(cam, ...label.at);
    const [r, g, b] = COLOURS[label.colour];
    ctx.globalAlpha = reveal * (label.strong ? 1 : 0.85);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(x, y, label.strong ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${label.strong ? 600 : 500} ${label.strong ? 12 : 11}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillStyle = label.strong ? '#eceff3' : `rgba(${r},${g},${b},0.95)`;
    // Flip the text to the left of its dot when it would run off the edge
    const text = label.text.toUpperCase();
    const flip = x + 10 + ctx.measureText(text).width > width - 8;
    ctx.textAlign = flip ? 'right' : 'left';
    ctx.fillText(text, flip ? x - 10 : x + 10, y);
  }
  ctx.globalAlpha = 1;
}

function createParticles(scene: Scene, count: number) {
  const seeds: Seed[] = [];
  const kind = new Uint8Array(count);
  const pos = { X: new Float32Array(count), Y: new Float32Array(count), Z: new Float32Array(count) };
  const delay = new Float32Array(count), ease = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const base = { u: Math.random(), v: Math.random(), w: Math.random(), i };
    const seed = { ...base, kind: scene.kind(base) };
    seeds.push(seed);
    kind[i] = KINDS.indexOf(seed.kind);
    pos.X[i] = (Math.random() - 0.5) * 1400; pos.Y[i] = Math.random() * 500 - 80; pos.Z[i] = (Math.random() - 0.5) * 900;
    delay[i] = Math.random() * 1.4;
    ease[i] = 0.035 + Math.random() * 0.05;
  }
  return { seeds, kind, pos, delay, ease };
}

export function startFlowField(host: HTMLElement, canvas: HTMLCanvasElement, mode: FlowMode) {
  const ctx = canvas.getContext('2d');
  const scene = SCENES[mode];
  if (!ctx || !scene) return;
  const narrow = window.matchMedia('(max-width: 760px)').matches;
  const count = scene.count(narrow);
  const { seeds, kind, pos, delay, ease } = createParticles(scene, count);
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const sprites = makeSprites(dpr);
  const buckets = sprites.length;
  const buffers = Array.from({ length: buckets }, () => new Float32Array(count * 2));
  const counts = new Int32Array(buckets);
  const cameraSpec = scene.camera;
  const centreX = narrow ? cameraSpec.narrowCentreX ?? cameraSpec.centreX : cameraSpec.centreX;
  const centreY = narrow ? cameraSpec.narrowCentreY ?? cameraSpec.centreY : cameraSpec.centreY;
  const zoom = narrow ? cameraSpec.narrowZoom ?? cameraSpec.zoom : cameraSpec.zoom;

  let width = 0, height = 0;
  let still = false; // reduced motion: redraw the single frame after any resize
  const resize = () => {
    width = host.clientWidth; height = host.clientHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    if (still) draw(0, true);
  };

  let pointerX = 0, tilt = 0;
  host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); pointerX = (e.clientX - r.left) / r.width - 0.5; });
  host.addEventListener('pointerleave', () => { pointerX = 0; });

  const camera = (time: number): Camera => {
    const intro = 1 - smoothstep(Math.min(1, time / INTRO_SECONDS));
    const yaw = cameraSpec.yaw + Math.sin(time * 0.13) * cameraSpec.sway + tilt + intro * cameraSpec.introYaw;
    const pitch = cameraSpec.pitch + Math.sin(time * 0.1) * 0.04 + intro * cameraSpec.introPitch;
    const fit = narrow ? Math.min(height, width * 1.1) : height;
    return {
      cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch),
      ox: width * centreX, oy: height * centreY, scale: (fit / WORLD_HEIGHT) * zoom,
    };
  };

  const paintDots = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let b = 0; b < buckets; b++) {
      const n = counts[b];
      if (!n) continue;
      const sprite = sprites[b];
      const r = sprite.width / 2;
      const buf = buffers[b];
      for (let j = 0; j < n * 2; j += 2) ctx.drawImage(sprite, (buf[j] - r) | 0, (buf[j + 1] - r) | 0);
    }
  };

  let time = 0;
  let active = count; // lowered automatically on slow devices
  const out = [0, 0, 0, 0];
  const draw = (dt: number, settle = false) => {
    time += dt;
    tilt += (pointerX * 0.3 - tilt) * 0.04;
    const cam = camera(time);
    const half = width / 2 / cam.scale;
    const shrink = narrow ? 0.85 : 1;
    counts.fill(0);
    for (let i = 0; i < active; i++) {
      if (time < delay[i]) continue;
      scene.pos(seeds[i], time, half, out);
      const tx = out[0], ty = out[1], tz = out[2], fade = out[3];
      if (settle) { pos.X[i] = tx; pos.Y[i] = ty; pos.Z[i] = tz; }
      else { pos.X[i] += (tx - pos.X[i]) * ease[i]; pos.Y[i] += (ty - pos.Y[i]) * ease[i]; pos.Z[i] += (tz - pos.Z[i]) * ease[i]; }
      if (fade <= 0.05) continue;
      const rx = pos.X[i] * cam.cy - pos.Z[i] * cam.sy;
      const rz0 = pos.X[i] * cam.sy + pos.Z[i] * cam.cy;
      const yy = pos.Y[i] - WORLD_HEIGHT / 2;
      const rz = yy * cam.sp + rz0 * cam.cp;
      const persp = FOCAL / Math.max(120, FOCAL + rz);
      const sx = cam.ox + rx * persp * cam.scale;
      const sy = cam.oy + (yy * cam.cp - rz0 * cam.sp) * persp * cam.scale;
      if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;
      const level = rz < -90 ? 0 : rz < 110 ? 1 : 2;
      const size = DEPTH[level].size * persp * fade * shrink;
      if (size < 1.6) continue;
      const b = (kind[i] * DEPTH.length + level) * SIZES.length + sizeStep(size);
      const c = counts[b]++ * 2;
      buffers[b][c] = sx * dpr; buffers[b][c + 1] = sy * dpr;
    }
    paintDots();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLabels(ctx, cam, scene.labels(time, half, narrow), Math.min(1, Math.max(0, (time - 1.6) / 1.2)), width);
  };

  resize();
  new ResizeObserver(resize).observe(host);
  // Reduced motion: one settled, still frame
  if (prefersReducedMotion()) {
    still = true;
    time = 12;
    draw(0, true);
    return;
  }

  // Run only while on screen and not paused; assemble on first view
  let visible = false, started = false, last = 0;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !started) { started = true; last = performance.now(); requestAnimationFrame(loop); }
  }, { rootMargin: '80px' }).observe(host);
  // Quality check: if the first frames run slow, draw fewer dots
  let sampled = 0, sampledTime = 0;
  const adapt = (dt: number) => {
    if (sampled < 0 || time < 0.5) return;
    sampled++; sampledTime += dt;
    if (sampled < 60) return;
    if (sampledTime / sampled > 0.024) active = Math.floor(count * 0.5);
    sampled = -1;
  };
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible && !isPaused()) { draw(dt); adapt(dt); }
    requestAnimationFrame(loop);
  };
}

function smoothstep(k: number) {
  return k * k * (3 - 2 * k);
}
