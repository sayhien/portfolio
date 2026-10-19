// The world behind the footer: rolling hills, wind, flowers and a bee.
// This file only holds shapes and behaviour; bee-garden.ts draws them.

export const TAU = Math.PI * 2;
export const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
export const smooth = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOutBack = (value: number) => {
  const t = clamp(value, 0, 1) - 1;
  return 1 + t * t * (2.2 * t + 1.2);
};

/** Repeatable random numbers, so the meadow looks the same on every visit. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Slow sway, a faster flutter, and a gust that rolls across the meadow. */
export function wind(worldX: number, t: number): number {
  const gustX = ((t * 170) % 2900) - 700;
  const gust = Math.exp(-(((worldX - gustX) / 230) ** 2));
  return Math.sin(t * 1.2 + worldX * 0.0065) * 0.45 + Math.sin(t * 2.4 + worldX * 0.021) * 0.16 + gust * 0.85;
}

// ---------------------------------------------------------------- The land

/** A hill layer: a base line (share of height) with soft bumps [centre, height, width]. */
export type Hill = { base: number; bumps: [number, number, number][] };
export type Layer = { at: (x: number) => number; top: number };
export type Land = { offset: number; layers: Layer[]; front: Layer };

/**
 * Hills live on a wide "virtual" landscape, so a phone shows a crop of the
 * same place rather than squashed hills.
 */
export function makeLand(hills: Hill[], focus: number, W: number, H: number): Land {
  const virtualWidth = Math.max(W, W < 700 ? 860 : 1150);
  const offset = (virtualWidth - W) * focus;
  const step = 2;
  const layers = hills.map((hill) => {
    const count = Math.ceil(W / step) + 4;
    const ys = new Float32Array(count);
    let top = H;
    for (let i = 0; i < count; i++) {
      const vx = (i * step + offset) / virtualWidth;
      let y = hill.base;
      for (const [centre, height, width] of hill.bumps) y -= height * Math.exp(-(((vx - centre) / width) ** 2));
      ys[i] = y * H;
      top = Math.min(top, ys[i]);
    }
    const at = (x: number) => {
      const f = clamp(x, 0, W + 2) / step;
      const i = Math.floor(f);
      return ys[i] + (ys[i + 1] - ys[i]) * (f - i);
    };
    return { at, top };
  });
  return { offset, layers, front: layers[layers.length - 1] };
}

// ---------------------------------------------------------------- Flowers

export type Flower = {
  x: number; y: number; worldX: number; r: number; stem: number; depth: number;
  tone: number; lean: number; flex: number; leaf: number;
  cycler: boolean; period: number; phase: number; delay: number;
  nod: number; open: number; hero: boolean;
};

function makeFlower(land: Land, W: number, H: number, rand: () => number, x: number, depth: number, size: number, narrow: boolean): Flower {
  const ridge = land.front.at(x);
  const r = size * (narrow ? 0.88 : 1);
  return {
    x, y: ridge + 6 + depth * (H - ridge - 8), worldX: x + land.offset, r, depth,
    stem: r * (2.4 + rand() * 1.4) + depth * 14,
    tone: Math.floor(rand() * 8), lean: (rand() - 0.5) * 0.35, flex: 0.45 + rand() * 0.35,
    leaf: rand() < 0.75 ? (rand() < 0.5 ? -1 : 1) : 0,
    cycler: rand() < 0.2, period: 14 + rand() * 9, phase: rand() * TAU,
    delay: 0.25 + (x / W) * 1.9 + rand() * 0.5,
    nod: 0, open: 0, hero: false,
  };
}

/** A few large hero flowers, then smaller ones spread across the meadow. */
export function makeFlowers(land: Land, W: number, H: number, narrow: boolean, rand: () => number): Flower[] {
  const flowers: Flower[] = [];
  const heroes = narrow ? [0.22, 0.7] : [0.16, 0.47, 0.83];
  for (const at of heroes) {
    const hero = makeFlower(land, W, H, rand, W * (at + (rand() - 0.5) * 0.05), 0.8 + rand() * 0.15, (narrow ? 24 : 31) + rand() * 6, narrow);
    hero.hero = true;
    flowers.push(hero);
  }
  const target = Math.round((narrow ? 13 : 26) * 1.25);
  for (let tries = 0; flowers.length < target && tries < 900; tries++) {
    const depth = Math.pow(rand(), 0.8);
    const size = lerp(7, 19, depth) * (0.85 + rand() * 0.3);
    const x = 10 + rand() * (W - 20);
    if (flowers.some((f) => Math.abs(f.x - x) < (f.r + size) * 1.2 && Math.abs(depth - f.depth) < 0.22)) continue;
    flowers.push(makeFlower(land, W, H, rand, x, depth, size, narrow));
  }
  return flowers.sort((a, b) => a.y - b.y);
}

/** Where the flower head is right now, after wind and the weight of a bee. */
export function flowerPose(f: Flower, t: number) {
  const sway = (wind(f.worldX, t) * 0.8 + f.lean) * f.flex;
  const bend = sway * 0.24 * f.stem;
  return { hx: f.x + bend, hy: f.y - f.stem + Math.abs(bend) * 0.22 + f.nod * f.r * 0.45 };
}

/** 0 is a closed bud, 1 is fully open. Flowers bloom in one by one, left to right. */
export function flowerOpen(f: Flower, t: number, life: number): number {
  const bloom = easeOutBack((life - f.delay) / 1.5);
  const rest = f.cycler
    ? lerp(0.12, 1, smooth(0.5 + 0.75 * Math.cos((t * TAU) / f.period + f.phase)))
    : 0.95 + 0.05 * Math.sin(t * 0.8 + f.phase);
  return Math.max(0, bloom) * Math.max(rest, f.nod);
}

// ---------------------------------------------------------------- The bee

/** What the bee needs to know about the meadow it lives in. */
export interface Meadow {
  W: number;
  flowers: Flower[];
  time: number;
  life: number;
  emitTrail(x: number, y: number): void;
}

type BeeState = 'fly' | 'sip' | 'loop';

export class Bee {
  x = 0; y = 0; face = 1; wing = 0;
  state: BeeState = 'sip';
  target = 0;
  home: number;
  private timer = 1.5;
  private progress = 0;
  private duration = 1;
  private lift = 30;
  private weave = 0;
  private from: [number, number] = [0, 0];
  private centre: [number, number] = [0, 0];
  private trailClock = 0;

  constructor(private meadow: Meadow) {
    this.home = this.pickHome();
    this.placeAt(this.home);
  }

  /** The hero flower nearest the middle, where the bee rests in the still picture. */
  private pickHome() {
    const { flowers, W } = this.meadow;
    let best = flowers.findIndex((f) => f.hero);
    flowers.forEach((f, i) => {
      if (f.hero && Math.abs(f.x - W / 2) < Math.abs(flowers[best].x - W / 2)) best = i;
    });
    return Math.max(0, best);
  }

  placeAt(index: number) {
    this.target = index; this.state = 'sip'; this.timer = 1.5;
    [this.x, this.y] = this.landingSpot(this.meadow.flowers[index], this.meadow.time);
  }

  private landingSpot(f: Flower, t: number): [number, number] {
    const pose = flowerPose(f, t);
    return [pose.hx + Math.sin(t * 2.1) * 2, pose.hy - f.r * 0.55 - 6 + Math.sin(t * 5.5) * 1.6];
  }

  /** Fly to one of the nearest open flowers, favouring the big ones. */
  private chooseNext() {
    const { flowers, time, life } = this.meadow;
    const options = flowers
      .map((f, i) => ({ i, f, d: Math.hypot(f.x - this.x, f.y - this.y) }))
      .filter(({ i, f }) => i !== this.target && flowerOpen(f, time, life) > 0.7 && f.y - f.stem > 40)
      .sort((a, b) => a.d - b.d)
      .slice(0, 6);
    const pick = options.find(({ f }) => f.hero && Math.random() < 0.4) ?? options[Math.floor(Math.random() * options.length)];
    if (!pick) { this.state = 'sip'; this.timer = 1; return; }
    this.flyTo(pick.i);
  }

  private flyTo(index: number) {
    const [ex, ey] = this.landingSpot(this.meadow.flowers[index], this.meadow.time);
    const distance = Math.hypot(ex - this.x, ey - this.y);
    this.target = index; this.state = 'fly'; this.progress = 0;
    this.from = [this.x, this.y];
    this.duration = clamp(distance / 210, 0.9, 3.4);
    this.lift = 26 + distance * 0.2;
    this.weave = (Math.random() - 0.5) * 50;
  }

  /** A happy loop the loop when someone says hello. */
  hello() {
    this.state = 'loop'; this.progress = 0;
    this.centre = [this.x, this.y - 26];
  }

  update(dt: number) {
    const lastX = this.x;
    this.wing += dt * 55;
    if (this.state === 'fly') this.fly(dt);
    else if (this.state === 'sip') this.sip(dt);
    else this.loop(dt);
    const vx = (this.x - lastX) / Math.max(dt, 0.001);
    if (Math.abs(vx) > 12) this.face = lerp(this.face, Math.sign(vx), Math.min(1, dt * 9));
  }

  private fly(dt: number) {
    const t = this.meadow.time;
    this.progress = Math.min(1, this.progress + dt / this.duration);
    const u = smooth(this.progress), a = 1 - u;
    const [ex, ey] = this.landingSpot(this.meadow.flowers[this.target], t);
    const [sx, sy] = this.from, peak = Math.min(sy, ey) - this.lift;
    this.x = a * a * a * sx + 3 * a * a * u * (sx + (ex - sx) * 0.25 + this.weave)
      + 3 * a * u * u * (sx + (ex - sx) * 0.75 - this.weave) + u * u * u * ex;
    this.y = a * a * a * sy + 3 * a * a * u * peak + 3 * a * u * u * peak + u * u * u * ey
      + Math.sin(t * 7) * 3 * Math.sin(Math.PI * u);
    this.trailClock += dt;
    if (this.trailClock > 0.045) { this.trailClock = 0; this.meadow.emitTrail(this.x - this.face * 8, this.y + 3); }
    if (this.progress >= 1) { this.state = 'sip'; this.timer = 1.8 + Math.random() * 1.8; }
  }

  private sip(dt: number) {
    [this.x, this.y] = this.landingSpot(this.meadow.flowers[this.target], this.meadow.time);
    this.timer -= dt;
    if (Math.random() < dt * 3) this.meadow.emitTrail(this.x + (Math.random() - 0.5) * 10, this.y + 8);
    if (this.timer <= 0) this.chooseNext();
  }

  private loop(dt: number) {
    this.progress = Math.min(1, this.progress + dt / 1.05);
    const angle = smooth(this.progress) * TAU;
    this.x = this.centre[0] + Math.sin(angle) * 26 * this.face;
    this.y = this.centre[1] + Math.cos(angle) * 26;
    if (this.progress >= 1) this.chooseNext();
  }
}
