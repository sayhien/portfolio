// Moon Dust: the footer meadow drawn from tiny specks of light. The scene is
// first painted on a fine grid (hills, swaying grass, round flowers,
// fireflies), then each grid cell scatters a few specks: bright cells keep
// them all, dark cells none, so the moonlight builds up from density like a
// stipple drawing. The bee and hearts are made of specks too. By day the sun
// shines in a blue sky; by night the moon, stars and fireflies come out. Tapping the bee (or the "say hello" button) makes it chirp,
// fly a loop and float up hearts.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible } from './webgl-helpers';
import { Bee, TAU, type Flower, type Hill, type Land, type Meadow, clamp, flowerOpen, flowerPose, makeFlowers, makeLand, seeded, wind } from './meadow';

const STILL_TIME = 7; // seconds in, for the reduced motion still picture
const RENDERS_PER_SECOND = 30; // specks are placed by hand, so 30 a second keeps phones cool

// Night: graphite sky, mint hills, the moon and fireflies.
const NIGHT = {
  day: false,
  ground: '#0f1216',
  sky: ['#0f1216', '#10161a', '#121b1d', '#142121', '#172826', '#1b302c'],
  hills: [
    { base: '#1d3a33', light: '#3b7563', dark: '#142a25' },
    { base: '#24503f', light: '#4f9c80', dark: '#1a3c30' },
    { base: '#2c6b52', light: '#6ee7b7', dark: '#1f5440' },
  ],
  grass: ['#2a6450', '#3b8468', '#58b892', '#9fe6c8'],
  stem: '#163a30', bud: '#4f9c80', // stems darker than the hill so they read
  petals: [
    ['#ff8a3d', '#fff1d6', '#c95f1f'], ['#ffc94a', '#ff6a2b', '#c9952f'],
    ['#fff1d6', '#ff8a3d', '#c9bda6'], ['#ff6a2b', '#ffd9a0', '#b84a17'],
  ],
  // white stars, matching the page's star sky
  star: '#eceff3', starDim: '#5f646b', moon: '#f6f3ea', moonShade: '#ffd9a0',
  bee: { wing: 'rgba(255, 255, 255, 0.88)', body: '#ffc94a', stripe: '#0b0e11', eye: '#ffffff' },
  heart: '#ff8a3d', fly: '#ffe2b0', flyGlow: '#8a5a3a', trail: '#ffc46b',
  halo: '246, 243, 234', haloSize: 110,
};
type Scene = typeof NIGHT;

// Day: a blue sky, greener hills and a warm shining sun, same flowers and bee.
const DAY: Scene = {
  ...NIGHT,
  day: true,
  sky: ['#1b3a55', '#22496a', '#2b5c7e', '#356f8e', '#43829a', '#5595a3'],
  hills: [
    { base: '#2f6b4e', light: '#5fae86', dark: '#24543d' },
    { base: '#3b845c', light: '#7fd0a3', dark: '#2d6a49' },
    { base: '#4a9c69', light: '#a8f0c6', dark: '#3a7f55' },
  ],
  grass: ['#3f8f5f', '#56ab76', '#79c995', '#b5f0c8'],
  stem: '#1f4d36', bud: '#7fd0a3',
  moon: '#ffe08a', moonShade: '#ffb347',
  halo: '255, 206, 110', haloSize: 170,
};

// Daytime by the visitor's own clock: 7 in the morning to 7 in the evening.
const sceneNow = (): Scene => {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? DAY : NIGHT;
};
let PALETTE: Scene = sceneNow(); // the scene being drawn; checked again every minute

const HILLS: Hill[] = [
  { base: 0.64, bumps: [[0.12, 0.11, 0.12], [0.44, 0.06, 0.1], [0.8, 0.14, 0.15]] },
  { base: 0.77, bumps: [[0.3, 0.14, 0.18], [0.72, 0.08, 0.15], [1.0, 0.06, 0.1]] },
  { base: 0.93, bumps: [[0.14, 0.1, 0.2], [0.64, 0.17, 0.25]] },
];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

const rgbCache = new Map<string, [number, number, number]>();
function rgbOf(hex: string): [number, number, number] {
  let rgb = rgbCache.get(hex);
  if (!rgb) {
    const n = parseInt(hex.slice(1), 16);
    rgb = [n >> 16, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, rgb);
  }
  return rgb;
}

let audio: AudioContext | undefined;
/** Two rising sine notes, like a happy little bee. */
function chirp() {
  try {
    audio = audio ?? new AudioContext();
    const now = audio.currentTime;
    for (const [from, to, at] of [[620, 1100, 0], [900, 1350, 0.13]]) {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(from, now + at);
      osc.frequency.exponentialRampToValueAtTime(to, now + at + 0.09);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.16, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.16);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.18);
    }
  } catch (error) {
    console.warn('The bee could not make a sound in this browser', error);
  }
}

// ---------------------------------------------------------------- The coarse grid

type Blade = { x: number; y: number; h: number; worldX: number; flex: number; tone: number; front: boolean };
const UNIT = 2; // the scene was designed in 4 pixel units; the grid is 2 pixels
type Firefly = { x: number; y: number; ph: number; sp: number };
type Grid = {
  P: number; lw: number; lh: number; per: number;
  base: HTMLCanvasElement; grass: HTMLCanvasElement; frame: HTMLCanvasElement;
  blades: Blade[]; flies: Firefly[];
};

function makeGrid(W: number, H: number): Grid {
  const P = 4 / UNIT, lw = Math.ceil(W / P), lh = Math.ceil(H / P);
  const make = () => Object.assign(document.createElement('canvas'), { width: lw, height: lh });
  return { P, lw, lh, per: 3, base: make(), grass: make(), frame: make(), blades: [], flies: [] };
}

/** Sky, stars, moon and hills never move, so they are painted once. */
function paintBackdrop(grid: Grid, land: Land, narrow: boolean) {
  const { P, lw, lh } = grid;
  const ctx = grid.base.getContext('2d')!;
  const image = ctx.createImageData(lw, lh), data = image.data;
  const put = (x: number, y: number, hex: string) => {
    if (x < 0 || y < 0 || x >= lw || y >= lh) return;
    const [r, g, b] = rgbOf(hex), i = (y * lw + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  };
  const rand = seeded(8), sky = PALETTE.sky, horizon = lh * 0.62;
  for (let y = 0; y < lh; y++) {
    const v = clamp(y / horizon, 0, 1) * (sky.length - 1), i = Math.floor(v);
    for (let x = 0; x < lw; x++) put(x, y, v - i > bayer(x, y) ? sky[Math.min(i + 1, sky.length - 1)] : sky[i]);
  }
  if (!PALETTE.day) for (let s = 0; s < lw * 0.18; s++) put(Math.floor(rand() * lw), Math.floor(rand() * horizon * 0.8), rand() < 0.25 ? PALETTE.star : PALETTE.starDim);
  const mx = Math.round(lw * 0.82), my = Math.round(lh * 0.28), mr = Math.round((narrow ? 5 : 6) * (4 / P) * (PALETTE.day ? 1.5 : 1.25));
  for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
    if (Math.hypot(x, y) <= mr - 0.4) put(mx + x, my + y, (x + y) / (mr * 2) + 0.5 > bayer(x, y) + 0.45 ? PALETTE.moonShade : PALETTE.moon);
  }
  land.layers.forEach((layer, li) => paintHill(put, grid, layer.at, PALETTE.hills[li], rand));
  ctx.putImageData(image, 0, 0);
}

function paintHill(put: (x: number, y: number, hex: string) => void, grid: Grid, at: (x: number) => number, colors: Scene['hills'][number], rand: () => number) {
  const { P, lw, lh } = grid;
  for (let x = 0; x < lw; x++) {
    const ridge = Math.round(at(x * P + P / 2) / P);
    const slope = at(x * P + P * 3) - at(x * P - P * 2); // positive faces the moon
    for (let y = Math.max(0, ridge); y < lh; y++) {
      const d = y - ridge;
      let color = colors.base;
      if (d === 0) color = colors.light;
      else if (d < 5 && bayer(x, y) < (slope > 0 ? 0.7 : 0.3) * (1 - d / 5)) color = colors.light;
      else if (d > 6 && bayer(x, y) < 0.18 && slope < 0) color = colors.dark;
      const noise = rand();
      if (noise < 0.05) color = colors.dark;
      else if (noise < 0.08) color = colors.light;
      put(x, y, color);
    }
  }
}

function makeBlades(grid: Grid, land: Land): Blade[] {
  const { P, lw, lh } = grid, rand = seeded(15), blades: Blade[] = [];
  for (let x = 0; x < lw; x++) {
    const ridge = Math.round(land.front.at(x * P + P / 2) / P);
    const perColumn = 1 + Math.floor(rand() * 2.2);
    for (let k = 0; k < perColumn; k++) {
      const depth = Math.pow(rand(), 0.8);
      blades.push({
        x, y: ridge + 1 + Math.floor(depth * (lh - ridge - 1)),
        h: Math.round((2 + rand() * 2 + depth * 4) * (4 / P)),
        worldX: x * P + land.offset, flex: 0.6 + rand() * 0.6, tone: Math.floor(rand() * 3), front: depth > 0.6,
      });
    }
  }
  return blades.sort((a, b) => a.y - b.y);
}

/** Grass blades are soft curves, drawn in one stroke per colour. */
function strokeBlades(ctx: CanvasRenderingContext2D, blades: Blade[], t: number) {
  for (let tone = 0; tone < 3; tone++) {
    ctx.beginPath();
    for (const b of blades) {
      if (b.tone !== tone) continue;
      const tipX = b.x + 0.5 + clamp(wind(b.worldX, t) * 0.8 * b.flex, -1.4, 1.6) * b.h * 0.3;
      ctx.moveTo(b.x + 0.5, b.y + 1);
      ctx.quadraticCurveTo(b.x + 0.5, b.y - b.h * 0.55, tipX, b.y - b.h);
    }
    ctx.strokeStyle = PALETTE.grass[tone];
    ctx.stroke();
  }
}

function paintGrassAndFlowers(grid: Grid, flowers: Flower[], time: number) {
  const ctx = grid.grass.getContext('2d')!;
  ctx.clearRect(0, 0, grid.lw, grid.lh);
  ctx.lineCap = 'round'; ctx.lineWidth = 0.9;
  strokeBlades(ctx, grid.blades.filter((b) => !b.front), time);
  flowers.forEach((f) => paintFlower(ctx, grid.P, f, time));
  ctx.lineWidth = 0.9;
  strokeBlades(ctx, grid.blades.filter((b) => b.front), time);
}

/** A round five petal flower on a curved stem; petals unfold as `open` rises. */
function paintFlower(ctx: CanvasRenderingContext2D, P: number, f: Flower, t: number) {
  const { hx, hy } = flowerPose(f, t);
  const baseX = f.x / P, baseY = f.y / P, headX = hx / P, headY = hy / P, size = f.r / P;
  ctx.strokeStyle = PALETTE.stem; ctx.lineWidth = Math.max(0.8, size * 0.1);
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX, (baseY + headY) / 2, headX, headY);
  ctx.stroke();
  if (f.leaf) {
    const leafX = baseX + (headX - baseX) * 0.25, leafY = baseY + (headY - baseY) * 0.4;
    ctx.fillStyle = PALETTE.stem; ctx.beginPath();
    ctx.ellipse(leafX + f.leaf * size * 0.3, leafY, size * 0.32, size * 0.12, f.leaf * -0.5, 0, TAU);
    ctx.fill();
  }
  const [petal, centre, shade] = PALETTE.petals[f.tone % PALETTE.petals.length];
  if (f.open < 0.3) {
    ctx.fillStyle = PALETTE.bud; ctx.beginPath();
    ctx.ellipse(headX, headY, size * 0.22, size * 0.32, 0, 0, TAU); ctx.fill();
    return;
  }
  const spin = (headX - baseX) * 0.08 + f.phase, reach = size * (0.25 + 0.5 * f.open);
  for (const [color, scale] of [[shade, 1], [petal, 0.86]] as const) {
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const angle = spin + (i * TAU) / 5;
      ctx.beginPath();
      ctx.ellipse(headX + Math.cos(angle) * reach * 0.55, headY + Math.sin(angle) * reach * 0.55, reach * 0.55 * scale, reach * 0.34 * scale, angle, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = centre; ctx.beginPath();
  ctx.arc(headX, headY, Math.max(0.7, size * 0.2), 0, TAU); ctx.fill();
}

// ---------------------------------------------------------------- Specks

type Specks = {
  k: number; image: ImageData; pixels: Uint32Array; ground: number;
  x: Float32Array; y: Float32Array; threshold: Float32Array;
};

/** Each grid cell gets a few fixed speck spots and a brightness each needs to show. */
function makeSpecks(ctx: CanvasRenderingContext2D, grid: Grid, k: number): Specks {
  const count = grid.lw * grid.lh * grid.per, rand = seeded(99), size = grid.P * k;
  const image = ctx.createImageData(grid.lw * size, grid.lh * size);
  const specks: Specks = {
    k, image, pixels: new Uint32Array(image.data.buffer),
    x: new Float32Array(count), y: new Float32Array(count), threshold: new Float32Array(count), ground: 0,
  };
  for (let c = 0; c < grid.lw * grid.lh; c++) {
    const cx = (c % grid.lw) * size, cy = Math.floor(c / grid.lw) * size;
    for (let n = 0; n < grid.per; n++) {
      const i = c * grid.per + n;
      specks.x[i] = cx + rand() * size; specks.y[i] = cy + rand() * size;
      specks.threshold[i] = (n + rand()) / grid.per;
    }
  }
  const [r, g, b] = rgbOf(PALETTE.ground);
  specks.ground = (255 << 24) | (b << 16) | (g << 8) | r;
  return specks;
}

/** Scatter specks by brightness: bright cells keep every speck, dark ones none. */
function renderSpecks(ctx: CanvasRenderingContext2D, grid: Grid, specks: Specks) {
  const source = grid.frame.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, grid.lw, grid.lh).data;
  const { pixels, k } = specks, bw = specks.image.width, bh = specks.image.height;
  pixels.fill(specks.ground);
  for (let c = 0; c < grid.lw * grid.lh; c++) {
    const r = source[c * 4], g = source[c * 4 + 1], b = source[c * 4 + 2];
    const light = clamp((Math.max(r, g, b) / 255 - 0.08) * 1.35, 0, 1);
    if (light <= 0) continue;
    const colour = (255 << 24) | (b << 16) | (g << 8) | r, size = k;
    for (let n = 0; n < grid.per; n++) {
      const i = c * grid.per + n;
      if (light < specks.threshold[i]) continue;
      const x = specks.x[i] | 0, y = specks.y[i] | 0;
      if (x + size > bw || y + size > bh) continue;
      for (let yy = 0; yy < size; yy++) pixels.fill(colour, (y + yy) * bw + x, (y + yy) * bw + x + size);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(specks.image, 0, 0);
  // a faint glow so bright things bloom a little
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.04; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(grid.frame, 0, 0, bw, bh);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- The garden

type Mote = { x: number; y: number; vx: number; vy: number; age: number; life: number };

class Garden implements Meadow {
  W = 0; H = 0; time = STILL_TIME; life = 0;
  flowers: Flower[] = [];
  private narrow = false;
  private land!: Land;
  private grid!: Grid;
  private specks!: Specks;
  private bee!: Bee;
  private trail: Mote[] = [];
  private hearts: Mote[] = [];
  private sinceRender = Infinity;
  private sinceSceneCheck = 0;

  constructor(private canvas: HTMLCanvasElement, private ctx: CanvasRenderingContext2D) {
    this.setup();
  }

  /** Build everything for the current size. Returns false if the canvas has no size yet. */
  setup() {
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    if (!W || !H) return false;
    this.W = W; this.H = H; this.narrow = W < 700;
    PALETTE = sceneNow();
    const k = (window.devicePixelRatio || 1) >= 1.5 ? 2 : 1;
    this.land = makeLand(HILLS, 0.5, W, H);
    this.flowers = makeFlowers(this.land, W, H, this.narrow, seeded(14));
    this.grid = makeGrid(W, H);
    paintBackdrop(this.grid, this.land, this.narrow);
    this.grid.blades = makeBlades(this.grid, this.land);
    this.grid.flies = Array.from({ length: this.narrow ? 9 : 16 }, (_, i) => ({ x: ((i * 0.618) % 1) * W, y: H * (0.35 + ((i * 0.37) % 0.4)), ph: i * 1.7, sp: 0.3 + ((i * 0.29) % 0.5) }));
    this.canvas.width = this.grid.lw * this.grid.P * k;
    this.canvas.height = this.grid.lh * this.grid.P * k;
    this.specks = makeSpecks(this.ctx, this.grid, k);
    this.bee = new Bee(this);
    this.render();
    return true;
  }

  resizeIfNeeded() {
    if (Math.abs(this.canvas.clientWidth - this.W) > 1 || Math.abs(this.canvas.clientHeight - this.H) > 1) this.setup();
  }

  emitTrail(x: number, y: number) {
    if (this.trail.length > 90) this.trail.shift();
    this.trail.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: 6 + Math.random() * 8, age: 0, life: 1 + Math.random() * 0.6 });
  }

  nearBee(event: PointerEvent) {
    if (!this.bee) return false;
    const box = this.canvas.getBoundingClientRect();
    return Math.hypot(event.clientX - box.left - this.bee.x, event.clientY - box.top - this.bee.y) < 36;
  }

  hello() {
    if (!this.bee) return;
    chirp();
    for (let i = 0; i < 3; i++) {
      this.hearts.push({ x: this.bee.x + (i - 1) * 12, y: this.bee.y - 30, vx: (i - 1) * 14, vy: -42 - i * 6, age: -i * 0.12, life: 1.7 });
    }
    if (prefersReducedMotion()) {
      this.hearts.forEach((h) => { h.age = 0.3; h.y -= 18; });
      this.render();
      this.hearts = [];
      return;
    }
    this.bee.hello();
  }

  step(dt: number) {
    if (!this.bee || prefersReducedMotion()) return;
    this.time += dt; this.life += dt;
    this.updateFlowers(dt);
    this.bee.update(dt);
    for (const list of [this.trail, this.hearts]) {
      for (const p of list) { p.age += dt; if (p.age > 0) { p.x += p.vx * dt; p.y += p.vy * dt; } }
    }
    this.trail = this.trail.filter((p) => p.age < p.life);
    this.hearts = this.hearts.filter((h) => h.age < h.life);
    this.sinceRender += dt;
    this.sinceSceneCheck += dt;
    if (this.sinceSceneCheck > 60) { this.sinceSceneCheck = 0; if (sceneNow() !== PALETTE) this.setup(); }
    if (this.sinceRender >= 1 / RENDERS_PER_SECOND - 0.001) { this.sinceRender = 0; this.render(); }
  }

  private updateFlowers(dt: number) {
    const sipping = this.bee?.state === 'sip' ? this.flowers[this.bee.target] : null;
    for (const f of this.flowers) {
      f.nod += ((f === sipping ? 1 : 0) - f.nod) * Math.min(1, dt * 4);
      f.open = flowerOpen(f, this.time, this.life);
    }
  }

  /** Paint the grid frame, then turn it into specks. The still picture is fixed at STILL_TIME. */
  render() {
    if (!this.W) return;
    if (prefersReducedMotion()) {
      this.time = STILL_TIME; this.life = 99;
      this.updateFlowers(1);
      this.bee.placeAt(this.bee.home);
    }
    const grid = this.grid;
    paintGrassAndFlowers(grid, this.flowers, this.time);
    const frame = grid.frame.getContext('2d', { willReadFrequently: true })!;
    frame.clearRect(0, 0, grid.lw, grid.lh);
    frame.drawImage(grid.base, 0, 0);
    frame.drawImage(grid.grass, 0, 0);
    if (PALETTE.day) this.paintSunRays(frame); else this.paintFireflies(frame);
    // The bee and hearts go on the grid too, so they turn into specks like the rest.
    frame.setTransform(1 / grid.P, 0, 0, 1 / grid.P, 0, 0);
    this.paintBee(frame);
    this.paintHearts(frame);
    frame.setTransform(1, 0, 0, 1, 0, 0);
    renderSpecks(this.ctx, grid, this.specks);
    this.ctx.setTransform(this.specks.k, 0, 0, this.specks.k, 0, 0);
    this.paintMoonHalo();
  }

  /** Slowly turning rays around the sun, drawn on the grid so they become specks. */
  private paintSunRays(frame: CanvasRenderingContext2D) {
    const { lw, lh } = this.grid, x = lw * 0.82, y = lh * 0.28, t = this.time;
    frame.save();
    frame.strokeStyle = PALETTE.moonShade; frame.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const angle = (i * TAU) / 12 + t * 0.08, pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + i * 1.3);
      const inner = 26 + pulse * 3, outer = inner + 8 + pulse * 10;
      frame.globalAlpha = 0.45 + pulse * 0.4; frame.lineWidth = i % 2 ? 1 : 1.8;
      frame.beginPath();
      frame.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
      frame.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
      frame.stroke();
    }
    frame.restore();
  }

  /** A soft halo of moonlight or sunlight, laid over the specks. */
  private paintMoonHalo() {
    const ctx = this.ctx, x = this.grid.lw * 0.82 * this.grid.P, y = this.grid.lh * 0.28 * this.grid.P;
    const { halo: rgb, haloSize: size } = PALETTE;
    const halo = ctx.createRadialGradient(x, y, 4, x, y, size);
    halo.addColorStop(0, `rgba(${rgb}, ${PALETTE.day ? 0.24 : 0.16})`);
    halo.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = halo; ctx.fillRect(x - size, y - size, size * 2, size * 2);
    ctx.globalCompositeOperation = 'source-over';
  }

  /** A round yellow bee with black stripes and fluttering white wings. */
  private paintBee(ctx: CanvasRenderingContext2D) {
    const { x, y, face, wing } = this.bee, colors = PALETTE.bee;
    const flap = prefersReducedMotion() ? 0.4 : Math.sin(wing) * 0.5 + 0.5;
    ctx.save();
    ctx.translate(x, y); ctx.scale(face < 0 ? -1.6 : 1.6, 1.6);
    ctx.fillStyle = colors.wing;
    for (const [dx, tilt] of [[-3, -0.5], [2, -0.2]]) {
      ctx.beginPath();
      ctx.ellipse(dx, -8 - flap * 2, 5, 7.5 - flap * 3, tilt - flap * 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 7, 0, 0, TAU);
    ctx.fillStyle = colors.body; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = colors.stripe;
    for (const sx of [-5, 1]) ctx.fillRect(sx, -8, 2.2, 16);
    ctx.restore();
    ctx.fillStyle = colors.stripe;
    ctx.beginPath(); ctx.moveTo(-10, -1.6); ctx.lineTo(-14, 0); ctx.lineTo(-10, 1.6); ctx.fill();
    ctx.beginPath(); ctx.arc(10.5, -0.5, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = colors.eye;
    ctx.beginPath(); ctx.arc(12, -1.5, 1.3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  private paintHearts(ctx: CanvasRenderingContext2D) {
    for (const h of this.hearts) {
      if (h.age < 0) continue;
      const fade = 1 - clamp((h.age / h.life - 0.6) / 0.4, 0, 1), s = 5 + Math.min(1, h.age * 4) * 2;
      ctx.globalAlpha = fade; ctx.fillStyle = PALETTE.heart;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y + s * 0.9);
      ctx.bezierCurveTo(h.x - s * 1.6, h.y - s * 0.2, h.x - s * 0.6, h.y - s * 1.3, h.x, h.y - s * 0.4);
      ctx.bezierCurveTo(h.x + s * 0.6, h.y - s * 1.3, h.x + s * 1.6, h.y - s * 0.2, h.x, h.y + s * 0.9);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private paintFireflies(frame: CanvasRenderingContext2D) {
    const { P } = this.grid, t = this.time;
    for (const fly of this.grid.flies) {
      const x = Math.round((fly.x + Math.sin(t * fly.sp + fly.ph) * 30) / P), y = Math.round((fly.y + Math.cos(t * fly.sp * 0.8 + fly.ph) * 16) / P);
      const glow = Math.sin(t * 2 + fly.ph * 3);
      if (glow > 0.1) { frame.fillStyle = PALETTE.fly; frame.fillRect(x, y, UNIT, UNIT); }
      if (glow > 0.7) {
        frame.fillStyle = PALETTE.flyGlow;
        frame.fillRect(x - UNIT, y, UNIT * 3, UNIT); frame.fillRect(x, y - UNIT, UNIT, UNIT * 3);
        frame.fillStyle = PALETTE.fly; frame.fillRect(x, y, UNIT, UNIT);
      }
    }
    for (const p of this.trail) {
      if (p.age / p.life > 0.7 && Math.floor(t * 10) % 2) continue;
      frame.fillStyle = PALETTE.trail; frame.fillRect(Math.round(p.x / P), Math.round(p.y / P), 1, 1);
    }
  }

}

/** Start the footer meadow. Returns false if this browser cannot draw it. */
export function startBeeGarden(host: HTMLElement, canvas: HTMLCanvasElement, helloButton: HTMLButtonElement | null): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  let garden: Garden;
  try {
    garden = new Garden(canvas, ctx);
  } catch (error) {
    console.error('The footer meadow could not start', error);
    return false;
  }
  helloButton?.addEventListener('click', () => garden.hello());
  canvas.addEventListener('pointerdown', (event) => { if (garden.nearBee(event)) garden.hello(); });
  canvas.addEventListener('pointermove', (event) => { canvas.style.cursor = garden.nearBee(event) ? 'pointer' : ''; });
  new ResizeObserver(() => garden.resizeIfNeeded()).observe(host);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => garden.render());
  animateWhileVisible(host, (dt) => garden.step(dt));
  return true;
}
