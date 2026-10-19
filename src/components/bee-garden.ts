// Moon Dust: the footer meadow drawn from tiny specks of light. The scene is
// first painted on a coarse grid (hills, swaying grass, flowers, fireflies, the
// bee), then each grid cell scatters a few specks: bright cells keep them all,
// dark cells none, so the moonlight builds up from density like a
// stipple drawing. Tapping the bee (or the "say hello" button) makes it chirp,
// fly a loop and float up hearts.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible } from './webgl-helpers';
import { Bee, type Flower, type Hill, type Land, type Meadow, clamp, flowerOpen, makeFlowers, makeLand, seeded, wind } from './meadow';

const STILL_TIME = 7; // seconds in, for the reduced motion still picture
const RENDERS_PER_SECOND = 30; // specks are placed by hand, so 30 a second keeps phones cool

// Night Graphite with mint hills, yellow and orange flowers, a black and white bee.
const PALETTE = {
  ground: '#0f1216',
  sky: ['#0f1216', '#10161a', '#121b1d', '#142121', '#172826', '#1b302c'],
  hills: [
    { base: '#1d3a33', light: '#3b7563', dark: '#142a25' },
    { base: '#24503f', light: '#4f9c80', dark: '#1a3c30' },
    { base: '#2c6b52', light: '#6ee7b7', dark: '#1f5440' },
  ],
  grass: ['#2a6450', '#3b8468', '#58b892', '#9fe6c8'],
  stem: '#2a6650', bud: '#4f9c80',
  petals: [
    ['#ff8a3d', '#fff1d6', '#c95f1f'], ['#ffc94a', '#ff6a2b', '#c9952f'],
    ['#fff1d6', '#ff8a3d', '#c9bda6'], ['#ff6a2b', '#ffd9a0', '#b84a17'],
  ],
  star: '#eceff3', starDim: '#3a4c47', moon: '#f6f3ea', moonShade: '#ffd9a0',
  bee: { w: '#ffffff', y: '#ffc94a', k: '#0b0e11', h: '#0b0e11', e: '#ffffff' } as Record<string, string>,
  heart: '#ff8a3d', fly: '#ffe2b0', flyGlow: '#8a5a3a', trail: '#ffc46b',
};

const HILLS: Hill[] = [
  { base: 0.64, bumps: [[0.12, 0.11, 0.12], [0.44, 0.06, 0.1], [0.8, 0.14, 0.15]] },
  { base: 0.77, bumps: [[0.3, 0.14, 0.18], [0.72, 0.08, 0.15], [1.0, 0.06, 0.1]] },
  { base: 0.93, bumps: [[0.14, 0.1, 0.2], [0.64, 0.17, 0.25]] },
];

// Sprites, facing right. w wing, y yellow, k black stripe, h head, e eye.
const BEE_UP = ['..ww.ww..', '..wwwww..', '...www...', '.ykykyhh.', 'kykykyhhe', '.ykykyhh.'];
const BEE_DOWN = ['.........', '.........', '..wwwww..', '.ykwwwyhh', 'kykykyhhe', '.ykykyhh.'];
const HEART = ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'];
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
type Firefly = { x: number; y: number; ph: number; sp: number };
type Grid = {
  P: number; lw: number; lh: number; per: number;
  base: HTMLCanvasElement; grass: HTMLCanvasElement; frame: HTMLCanvasElement;
  blades: Blade[]; flies: Firefly[]; grassStep: number;
};

function makeGrid(W: number, H: number, narrow: boolean): Grid {
  const P = narrow ? 2 : 4, lw = Math.ceil(W / P), lh = Math.ceil(H / P);
  const make = () => Object.assign(document.createElement('canvas'), { width: lw, height: lh });
  return { P, lw, lh, per: P >= 4 ? 4 : 3, base: make(), grass: make(), frame: make(), blades: [], flies: [], grassStep: -1 };
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
  for (let s = 0; s < lw * 0.18; s++) put(Math.floor(rand() * lw), Math.floor(rand() * horizon * 0.8), rand() < 0.25 ? PALETTE.star : PALETTE.starDim);
  const mx = Math.round(lw * 0.82), my = Math.round(lh * 0.28), mr = Math.round((narrow ? 5 : 6) * (4 / P) * 1.25);
  for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
    if (Math.hypot(x, y) <= mr - 0.4) put(mx + x, my + y, (x + y) / (mr * 2) + 0.5 > bayer(x, y) + 0.45 ? PALETTE.moonShade : PALETTE.moon);
  }
  land.layers.forEach((layer, li) => paintHill(put, grid, layer.at, PALETTE.hills[li], rand));
  ctx.putImageData(image, 0, 0);
}

function paintHill(put: (x: number, y: number, hex: string) => void, grid: Grid, at: (x: number) => number, colors: typeof PALETTE.hills[number], rand: () => number) {
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
    const perColumn = 2 + Math.floor(rand() * 2);
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

/** Grass and flowers move in little steps, 8 times a second. */
function paintGrassAndFlowers(grid: Grid, flowers: Flower[], time: number) {
  const t = Math.floor(time * 8) / 8;
  const ctx = grid.grass.getContext('2d')!;
  ctx.clearRect(0, 0, grid.lw, grid.lh);
  const blade = (b: Blade) => {
    const lean = Math.round(clamp(wind(b.worldX, t) * 0.8 * b.flex, -1.4, 1.6));
    for (let j = 0; j < b.h; j++) {
      const u = j / Math.max(1, b.h - 1);
      ctx.fillStyle = j === b.h - 1 ? PALETTE.grass[Math.min(3, b.tone + 1)] : PALETTE.grass[b.tone];
      ctx.fillRect(b.x + Math.round(lean * u * u), b.y - j, 1, 1);
    }
  };
  grid.blades.forEach((b) => { if (!b.front) blade(b); });
  flowers.forEach((f) => paintFlower(ctx, grid.P, f, t));
  grid.blades.forEach((b) => { if (b.front) blade(b); });
}

/** A four petal flower; it grows from bud to half open to full as `open` rises. */
function paintFlower(ctx: CanvasRenderingContext2D, P: number, f: Flower, t: number) {
  const block = Math.max(1, Math.round((f.r > 26 ? 3 : f.r > 13 ? 2 : 1) * (4 / P)));
  const baseX = Math.round(f.x / P), baseY = Math.round(f.y / P), stem = Math.max(3, Math.round((f.stem / P) * 0.75));
  const lean = Math.round(clamp((wind(f.worldX, t) * 0.8 + f.lean) * f.flex * 1.6, -2, 2));
  const headX = baseX + lean, headY = baseY - stem + (f.nod > 0.5 ? 1 : 0);
  ctx.fillStyle = PALETTE.stem;
  for (let j = 0; j < stem; j++) {
    const u = j / stem, x = baseX + Math.round(lean * u * u);
    ctx.fillRect(x, baseY - j, 1, 1);
    if (f.leaf && j === Math.round(stem * 0.4)) ctx.fillRect(x + f.leaf, baseY - j - 1, 1, 1);
  }
  const [petal, centre, shade] = PALETTE.petals[f.tone % PALETTE.petals.length];
  const cell = (cx: number, cy: number, color: string) => {
    const x = headX + cx * block - Math.floor(block / 2), y = headY + cy * block - block;
    ctx.fillStyle = color; ctx.fillRect(x, y, block, block);
    if (block > 1 && color === petal) { ctx.fillStyle = shade; ctx.fillRect(x + block - 1, y + block - 1, 1, 1); }
  };
  if (f.open < 0.3) { cell(0, 0, PALETTE.bud); return; }
  if (f.open < 0.7) { cell(0, 0, petal); cell(0, -1, petal); cell(0, 1, PALETTE.bud); return; }
  cell(0, -1, petal); cell(-1, 0, petal); cell(1, 0, petal); cell(0, 1, petal); cell(0, 0, centre);
  if (block > 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(headX - Math.floor(block / 2), headY - block * 2, 1, 1); }
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

/** Scatter specks by brightness, then lay the bee and hearts on top as whole cells. */
function renderSpecks(ctx: CanvasRenderingContext2D, grid: Grid, specks: Specks, solid: number[]) {
  const source = grid.frame.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, grid.lw, grid.lh).data;
  const { pixels, k } = specks, bw = specks.image.width, bh = specks.image.height;
  pixels.fill(specks.ground);
  for (let c = 0; c < grid.lw * grid.lh; c++) {
    const r = source[c * 4], g = source[c * 4 + 1], b = source[c * 4 + 2];
    const light = clamp((Math.max(r, g, b) / 255 - 0.08) * 1.35, 0, 1);
    if (light <= 0) continue;
    const colour = (255 << 24) | (b << 16) | (g << 8) | r, size = light > 0.82 ? k + 1 : k;
    for (let n = 0; n < grid.per; n++) {
      const i = c * grid.per + n;
      if (light < specks.threshold[i]) continue;
      const x = specks.x[i] | 0, y = specks.y[i] | 0;
      if (x + size > bw || y + size > bh) continue;
      for (let yy = 0; yy < size; yy++) pixels.fill(colour, (y + yy) * bw + x, (y + yy) * bw + x + size);
    }
  }
  const cellSize = grid.P * k;
  for (const c of solid) {
    const colour = (255 << 24) | (source[c * 4 + 2] << 16) | (source[c * 4 + 1] << 8) | source[c * 4];
    const x = (c % grid.lw) * cellSize, y = Math.floor(c / grid.lw) * cellSize;
    for (let yy = 0; yy < cellSize - 1; yy++) pixels.fill(colour, (y + yy) * bw + x, (y + yy) * bw + x + cellSize - 1);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(specks.image, 0, 0);
  // a faint glow so bright things bloom a little
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.08; ctx.imageSmoothingEnabled = true;
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

  constructor(private canvas: HTMLCanvasElement, private ctx: CanvasRenderingContext2D) {
    this.setup();
  }

  /** Build everything for the current size. Returns false if the canvas has no size yet. */
  setup() {
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    if (!W || !H) return false;
    this.W = W; this.H = H; this.narrow = W < 700;
    const k = (window.devicePixelRatio || 1) >= 1.5 ? 2 : 1;
    this.land = makeLand(HILLS, 0.5, W, H);
    this.flowers = makeFlowers(this.land, W, H, this.narrow, seeded(14));
    this.grid = makeGrid(W, H, this.narrow);
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
      this.hearts.push({ x: this.bee.x + (i - 1) * 10, y: this.bee.y - 14, vx: (i - 1) * 14, vy: -42 - i * 6, age: -i * 0.12, life: 1.7 });
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
    const grid = this.grid, step = Math.floor(this.time * 8);
    if (step !== grid.grassStep || prefersReducedMotion()) { grid.grassStep = step; paintGrassAndFlowers(grid, this.flowers, this.time); }
    const frame = grid.frame.getContext('2d', { willReadFrequently: true })!;
    frame.clearRect(0, 0, grid.lw, grid.lh);
    frame.drawImage(grid.base, 0, 0);
    frame.drawImage(grid.grass, 0, 0);
    this.paintFireflies(frame);
    const solid = this.paintBeeAndHearts(frame);
    renderSpecks(this.ctx, grid, this.specks, solid);
  }

  private paintFireflies(frame: CanvasRenderingContext2D) {
    const { P } = this.grid, t = this.time;
    for (const fly of this.grid.flies) {
      const x = Math.round((fly.x + Math.sin(t * fly.sp + fly.ph) * 30) / P), y = Math.round((fly.y + Math.cos(t * fly.sp * 0.8 + fly.ph) * 16) / P);
      const glow = Math.sin(t * 2 + fly.ph * 3);
      if (glow > 0.1) { frame.fillStyle = PALETTE.fly; frame.fillRect(x, y, 1, 1); }
      if (glow > 0.7) { frame.fillStyle = PALETTE.flyGlow; frame.fillRect(x - 1, y, 3, 1); frame.fillRect(x, y - 1, 1, 3); frame.fillStyle = PALETTE.fly; frame.fillRect(x, y, 1, 1); }
    }
    for (const p of this.trail) {
      if (p.age / p.life > 0.7 && Math.floor(t * 10) % 2) continue;
      frame.fillStyle = PALETTE.trail; frame.fillRect(Math.round(p.x / P), Math.round(p.y / P), 1, 1);
    }
  }

  /** Returns the cells the bee and hearts cover, so they are drawn solid. */
  private paintBeeAndHearts(frame: CanvasRenderingContext2D): number[] {
    const { P, lw, lh } = this.grid, t = this.time, solid: number[] = [];
    const unit = Math.max(1, Math.round(4 / P));
    const mark = (x: number, y: number, color: string) => {
      frame.fillStyle = color; frame.fillRect(x, y, unit, unit);
      for (let yy = y; yy < y + unit; yy++) for (let xx = x; xx < x + unit; xx++) if (xx >= 0 && yy >= 0 && xx < lw && yy < lh) solid.push(yy * lw + xx);
    };
    const sprite = Math.floor(t * 14) % 2 ? BEE_UP : BEE_DOWN;
    const bx = Math.round(this.bee.x / P) - 4 * unit, by = Math.round(this.bee.y / P) - 4 * unit, flip = this.bee.face < 0;
    sprite.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.') mark(bx + (flip ? row.length - 1 - x : x) * unit, by + y * unit, PALETTE.bee[ch]);
    }));
    for (const h of this.hearts) {
      if (h.age < 0 || (h.age / h.life > 0.75 && Math.floor(t * 10) % 2)) continue;
      const hx = Math.round(h.x / P) - 2 * unit, hy = Math.round(h.y / P) - 2 * unit;
      HEART.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'x') mark(hx + x * unit, hy + y * unit, PALETTE.heart); }));
    }
    return solid;
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
