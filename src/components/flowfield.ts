// Particle flow field used as an animated background.
// Three modes tell one story across the case study:
//   scatter: dots drift in every direction (scattered effort)
//   flow:    dots line up into streams moving one way (shared direction)
//   loop:    dots circulate in a closed ring (nothing wasted)
// Dots assemble when the field first scrolls into view, then keep moving.
// Drawing is batched by colour so thousands of dots stay smooth.
import { isPaused, prefersReducedMotion } from './motion';

export type FlowMode = 'scatter' | 'flow' | 'loop';

type Rgb = [number, number, number];
const COLOURS: Record<string, Rgb> = {
  dust: [120, 130, 146],
  grey: [84, 94, 108],
  bright: [236, 239, 243], // bright highlight dots
  g0: [40, 150, 128],
  g1: [72, 196, 156],
  g2: [110, 231, 183],
  g3: [170, 244, 214],
  teal: [125, 180, 255],
};
const KINDS = Object.keys(COLOURS);
const DEPTH = [
  { alpha: 1, size: 2.2 },
  { alpha: 0.7, size: 1.7 },
  { alpha: 0.4, size: 1.3 },
];

type Params = { u: number; v: number; w: number; i: number };
type Shape = {
  kind: (p: Params) => string;
  pos: (p: Params, t: number, halfWidth: number) => [number, number, number];
  pitch: number;
  yaw: number;
  spin: number;
  centreX: number; // horizontal centre as a share of the canvas width
  narrowCentreY?: number; // vertical centre on small screens, so the shape can sit below text
};

const WORLD_HEIGHT = 340;

const SHAPES: Record<FlowMode, Shape> = {
  scatter: {
    kind: ({ u }) => (u < 0.1 ? 'bright' : u < 0.3 ? 'g2' : u < 0.65 ? 'dust' : 'grey'),
    pos: ({ u, v, w, i }, t, half) => {
      // Spread wide, slowly orbiting, each dot wobbling on its own
      const x = (u * 2 - 1) * half + Math.sin(t * 0.25 + i) * 30;
      const y = 20 + ((v * 300 + t * 6 * (w - 0.5)) % 300 + 300) % 300;
      const z = (w - 0.5) * 300 + Math.cos(t * 0.3 + i * 0.7) * 30;
      return [x, y, z];
    },
    pitch: 0.12, yaw: 0, spin: 0, centreX: 0.5,
  },
  flow: {
    kind: ({ v }) => ['g0', 'g1', 'teal', 'g2', 'g3', 'teal'][Math.floor(v * 6)],
    pos: ({ u, v, w }, t, half) => {
      const lane = Math.floor(v * 6);
      const length = half * 2 + 200;
      const x = ((u * length + t * (55 + lane * 6)) % length) - length / 2;
      const y = 60 + lane * 40 + Math.sin(x * 0.01 + t * 0.8 + lane) * 16 + (w - 0.5) * 10;
      const z = (w - 0.5) * 60 + Math.cos(x * 0.008 + lane) * 24;
      return [x, y, z];
    },
    pitch: 0.18, yaw: 0, spin: 0, centreX: 0.5,
  },
  loop: {
    kind: ({ u, v }) => (v < 0.14 ? 'bright' : ['g0', 'g1', 'g2', 'g3', 'teal'][Math.floor(u * 5)]),
    pos: ({ u, v, w }, t) => {
      const a = u * Math.PI * 2 + t * 0.4;
      const ringRadius = 150;
      const b = v * Math.PI * 2;
      const tube = 16 + w * 16;
      return [Math.cos(a) * (ringRadius + Math.cos(b) * tube), 170 + Math.sin(b) * tube, Math.sin(a) * (ringRadius + Math.cos(b) * tube)];
    },
    pitch: 0.6, yaw: 0, spin: 0.03, centreX: 0.68, narrowCentreY: 0.72,
  },
};

export function startFlowField(host: HTMLElement, canvas: HTMLCanvasElement, mode: FlowMode) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const narrow = window.matchMedia('(max-width: 760px)').matches;
  const count = narrow ? 1300 : 3400;
  const shape = SHAPES[mode];
  const centreX = narrow ? 0.5 : shape.centreX;
  const centreY = narrow ? shape.narrowCentreY ?? 0.5 : 0.5;

  const X = new Float32Array(count), Y = new Float32Array(count), Z = new Float32Array(count);
  const delay = new Float32Array(count), ease = new Float32Array(count);
  const kind = new Uint8Array(count);
  const params: Params[] = [];
  for (let i = 0; i < count; i++) {
    const p = { u: Math.random(), v: Math.random(), w: Math.random(), i };
    params.push(p);
    kind[i] = KINDS.indexOf(shape.kind(p));
    X[i] = (Math.random() - 0.5) * 900; Y[i] = Math.random() * 400; Z[i] = (Math.random() - 0.5) * 600;
    delay[i] = Math.random() * 1.6;
    ease[i] = 0.04 + Math.random() * 0.05;
  }
  const buckets = KINDS.length * DEPTH.length;
  const buffers = Array.from({ length: buckets }, () => new Float32Array(count * 2));
  const counts = new Int32Array(buckets);
  const styles = KINDS.flatMap((k) => DEPTH.map(({ alpha }) => {
    const [r, g, b] = COLOURS[k];
    return `rgba(${r},${g},${b},${k === 'dust' ? alpha * 0.7 : alpha})`;
  }));

  let width = 0, height = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = host.clientWidth; height = host.clientHeight;
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  new ResizeObserver(resize).observe(host);

  let pointerX = 0, tilt = 0;
  host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); pointerX = (e.clientX - r.left) / r.width - 0.5; });
  host.addEventListener('pointerleave', () => { pointerX = 0; });

  let time = 0, yaw = shape.yaw;
  const draw = (dt: number, settle = false) => {
    time += dt;
    yaw += dt * shape.spin;
    tilt += (pointerX * 0.25 - tilt) * 0.05;
    const scale = Math.min(height, narrow ? width * 0.95 : height) / WORLD_HEIGHT * (mode === 'loop' ? 0.9 : 1);
    const half = width / 2 / scale;
    const cy = Math.cos(yaw + tilt), sy = Math.sin(yaw + tilt), cp = Math.cos(shape.pitch), sp = Math.sin(shape.pitch);
    const ox = width * centreX, oy = height * centreY, focal = 1000, midY = WORLD_HEIGHT / 2;
    counts.fill(0);
    for (let i = 0; i < count; i++) {
      if (time < delay[i]) continue;
      const [tx, ty, tz] = shape.pos(params[i], time, half);
      if (settle) { X[i] = tx; Y[i] = ty; Z[i] = tz; }
      else { X[i] += (tx - X[i]) * ease[i]; Y[i] += (ty - Y[i]) * ease[i]; Z[i] += (tz - Z[i]) * ease[i]; }
      const rx = X[i] * cy - Z[i] * sy;
      let rz = X[i] * sy + Z[i] * cy;
      const yy = Y[i] - midY;
      const ry = yy * cp - rz * sp;
      rz = yy * sp + rz * cp;
      const persp = focal / (focal + rz);
      const level = rz < -80 ? 0 : rz < 100 ? 1 : 2;
      const b = kind[i] * DEPTH.length + level;
      const c = counts[b]++ * 2;
      buffers[b][c] = ox + rx * persp * scale;
      buffers[b][c + 1] = oy - ry * persp * scale;
    }
    ctx.clearRect(0, 0, width, height);
    for (let b = 0; b < buckets; b++) {
      const n = counts[b];
      if (!n) continue;
      const size = DEPTH[b % DEPTH.length].size * (narrow ? 0.9 : 1);
      ctx.fillStyle = styles[b];
      const buf = buffers[b];
      for (let j = 0; j < n * 2; j += 2) ctx.fillRect(buf[j], buf[j + 1], size, size);
    }
  };

  // Reduced motion: one settled, still frame
  if (prefersReducedMotion()) {
    time = 20;
    draw(0, true);
    return;
  }

  // Run only while on screen and not paused; assemble on first view
  let visible = false, started = false, last = 0;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !started) { started = true; last = performance.now(); requestAnimationFrame(loop); }
  }, { rootMargin: '80px' }).observe(host);
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible && !isPaused()) draw(dt);
    requestAnimationFrame(loop);
  };
}
