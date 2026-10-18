// The three particle scenes that tell the ESG story across the case study.
//   converge: data from each department streams into one river (the problem the product solves)
//   braid:    Environment, Social and Governance twist into one shared template (the build)
//   cycle:    Measure, Report, Improve circulate in a loop, sparks rising (the learning loop)
// Each scene describes where a particle sits at time t; the engine in
// flowfield.ts handles camera, drawing and lifecycle.

export type FlowMode = 'converge' | 'braid' | 'cycle';
export type Rgb = [number, number, number];
export type Vec3 = [number, number, number];

export const COLOURS: Record<string, Rgb> = {
  env: [110, 231, 183], // Environment: mint
  soc: [125, 180, 255], // Social: blue
  gov: [190, 170, 255], // Governance: lavender
  light: [236, 239, 243],
  dust: [130, 140, 156],
};

export type Seed = { u: number; v: number; w: number; i: number; kind: string };
export type Label = { text: string; at: Vec3; colour: string; strong?: boolean };

export type Scene = {
  count: (narrow: boolean) => number;
  kind: (seed: Omit<Seed, 'kind'>) => string;
  // Writes x, y, z and a 0 to 1 fade into out (no new arrays per dot per frame)
  pos: (seed: Seed, t: number, half: number, out: number[]) => void;
  labels: (t: number, half: number, narrow: boolean) => Label[];
  camera: {
    yaw: number; pitch: number; sway: number; introYaw: number; introPitch: number;
    centreX: number; centreY: number; narrowCentreX?: number; narrowCentreY?: number; zoom: number; narrowZoom?: number;
  };
};

const MID = 170;
const TAU = Math.PI * 2;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (k: number) => k * k * (3 - 2 * k);

function bezier(p0: number[], p1: number[], p2: number[], p3: number[], k: number): [number, number] {
  const m = 1 - k;
  const a = m * m * m, b = 3 * m * m * k, c = 3 * m * k * k, d = k * k * k;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/* ---------- converge: departments flow into one river ---------- */

// Source positions are [share of half width, depth]; depth runs near (negative) to far (positive)
const SOURCES = [
  { text: 'Energy', kind: 'env', at: [0.83, 175] },
  { text: 'Water', kind: 'env', at: [0.48, 195] },
  { text: 'Operations', kind: 'env', at: [0.82, -55] },
  { text: 'HR', kind: 'soc', at: [0.89, 30] },
  { text: 'Supply chain', kind: 'soc', at: [0.53, -85] },
  { text: 'Finance', kind: 'gov', at: [0.6, 80] },
];
const MERGE = [0.26, -25];
const TRUNK = [[0, -80], [-0.18, -175], [-0.31, -235]]; // flows down into the product below

// Each path is sampled into a small table of [x, z, sideways x, sideways z],
// rebuilt only when the canvas width changes.
const SAMPLES = 96;
type PathTable = Float32Array;

function samplePath(p0: number[], p1: number[], p2: number[], p3: number[]): PathTable {
  const table = new Float32Array((SAMPLES + 1) * 4);
  for (let n = 0; n <= SAMPLES; n++) {
    const [x, z] = bezier(p0, p1, p2, p3, n / SAMPLES);
    const [x2, z2] = bezier(p0, p1, p2, p3, Math.min(1, (n + 1) / SAMPLES));
    const [x0, z0] = n === SAMPLES ? bezier(p0, p1, p2, p3, (n - 1) / SAMPLES) : [x, z];
    const dx = n === SAMPLES ? x - x0 : x2 - x, dz = n === SAMPLES ? z - z0 : z2 - z;
    const len = Math.hypot(dx, dz) || 1;
    table.set([x, z, -dz / len, dx / len], n * 4);
  }
  return table;
}

function buildPaths(half: number): { branches: PathTable[]; trunk: PathTable } {
  const m = [MERGE[0] * half, MERGE[1]];
  const branches = SOURCES.map(({ at }) => {
    const src = [at[0] * half, at[1]];
    const dx = m[0] - src[0], dz = m[1] - src[1];
    const len = Math.hypot(dx, dz) || 1;
    const px = -dz / len, pz = dx / len;
    const bend = 110 * Math.sign(src[1] - m[1] || 1);
    const p1 = [src[0] + dx * 0.35 + px * bend, src[1] + dz * 0.35 + pz * bend];
    const p2 = [src[0] + dx * 0.75 - px * bend * 0.3, src[1] + dz * 0.75 - pz * bend * 0.3];
    return samplePath(src, p1, p2, m);
  });
  const [p1, p2, e] = TRUNK.map(([fx, z]) => [fx * half, z]);
  return { branches, trunk: samplePath(m, p1, p2, e) };
}

let pathCache = { half: -1, ...buildPaths(1) };
function paths(half: number) {
  if (Math.abs(pathCache.half - half) > 0.5) pathCache = { half, ...buildPaths(half) };
  return pathCache;
}

// Reads a path table at k (0 to 1) into out[0..3]
function readPath(table: PathTable, k: number, out: number[]) {
  const f = Math.min(SAMPLES - 0.001, Math.max(0, k * SAMPLES));
  const n = Math.floor(f), mix = f - n, a = n * 4, b = a + 4;
  for (let j = 0; j < 4; j++) out[j] = table[a + j] + (table[b + j] - table[a + j]) * mix;
}

const converge: Scene = {
  count: (narrow) => (narrow ? 1000 : 2000),
  kind: ({ i }) => SOURCES[i % SOURCES.length].kind,
  pos: ({ u, w, i }, t, half, out) => {
    const s = (u * 2 + t * 0.085) % 2; // 0 to 1 on a branch, 1 to 2 in the river
    const onBranch = s < 1;
    const { branches, trunk } = paths(half);
    readPath(onBranch ? branches[i % SOURCES.length] : trunk, onBranch ? smooth(s) : s - 1, out);
    const x = out[0], z = out[1], px = out[2], pz = out[3];
    // Scattered at the source, tight in the river
    const spread = onBranch ? lerp(32, 5, smooth(s)) : lerp(7, 30, s - 1);
    const side = (w - 0.5) * 2 * spread;
    const lift = onBranch ? Math.sin(t * 1.4 + i) * 16 * (1 - s) : Math.sin(t * 2 + i) * 3;
    out[0] = x + px * side; out[1] = MID + lift; out[2] = z + pz * side;
    out[3] = Math.min(1, s * 6, (2 - s) * 4);
  },
  labels: (_t, half, narrow) => {
    const list: Label[] = SOURCES.map((src) => ({ text: src.text, at: [src.at[0] * half, MID - 26, src.at[1]] as Vec3, colour: src.kind }));
    list.push({ text: 'One ESG report', at: [MERGE[0] * half + 14, MID - 30, MERGE[1]], colour: 'light', strong: true });
    return narrow ? list.filter((label) => label.strong || ['Energy', 'HR', 'Finance'].includes(label.text)) : list;
  },
  camera: { yaw: -0.12, pitch: 0.85, sway: 0.07, introYaw: 0.45, introPitch: -0.4, centreX: 0.5, centreY: 0.5, narrowCentreY: 0.66, zoom: 1 },
};

/* ---------- braid: three pillars twist into one template ---------- */

const PILLARS = [
  { text: 'Environment', kind: 'env' },
  { text: 'Social', kind: 'soc' },
  { text: 'Governance', kind: 'gov' },
];

function braidPoint(x: number, strand: number, t: number, half: number): [number, number, number] {
  const f = Math.min(1, Math.max(0, (x / half + 1.2) / 2.4)); // 0 at the left, 1 at the right
  const radius = lerp(95, 9, Math.pow(f, 0.75));
  const angle = x * 0.016 - t * 0.9 + (strand * TAU) / 3;
  return [radius * Math.cos(angle), radius * Math.sin(angle), f];
}

const braid: Scene = {
  count: (narrow) => (narrow ? 900 : 1800),
  kind: ({ i }) => PILLARS[i % 3].kind,
  pos: ({ u, w, i }, t, half, out) => {
    const length = half * 2.4;
    const x = ((u * length + t * 70) % length) - length / 2;
    const f = Math.min(1, Math.max(0, (x / half + 1.2) / 2.4));
    const radius = lerp(95, 9, Math.pow(f, 0.75));
    const angle = x * 0.016 - t * 0.9 + ((i % 3) * TAU) / 3;
    const jitter = (w - 0.5) * lerp(26, 5, f);
    out[0] = x;
    out[1] = MID + radius * Math.cos(angle) + jitter;
    out[2] = radius * Math.sin(angle) + jitter * 0.6;
    out[3] = Math.max(0, Math.min(1, (x + length / 2) / (half * 0.25), (length / 2 - x) / (half * 0.2)));
  },
  labels: (t, half, narrow) => {
    const startX = -0.78 * half;
    const list: Label[] = PILLARS.map((pillar, strand) => {
      const [cy, cz] = braidPoint(startX, strand, t, half);
      return { text: pillar.text, at: [startX, MID + cy - 14, cz] as Vec3, colour: pillar.kind };
    });
    if (!narrow) list.push({ text: 'One shared template', at: [0.86 * half, MID - 30, 0], colour: 'light', strong: true });
    return list;
  },
  camera: { yaw: 0.42, pitch: 0.22, sway: 0.1, introYaw: -0.7, introPitch: 0.2, centreX: 0.5, centreY: 0.5, narrowCentreY: 0.72, zoom: 1, narrowZoom: 0.8 },
};

/* ---------- cycle: measure, report, improve ---------- */

const STEPS = ['Measure', 'Report', 'Improve'];
const RING = 175;

function ringPoint(angle: number, tube: number, twist: number): Vec3 {
  const r = RING + Math.cos(twist) * tube;
  return [Math.cos(angle) * r, MID + Math.sin(twist) * tube, Math.sin(angle) * r];
}

const cycle: Scene = {
  count: (narrow) => (narrow ? 900 : 1800),
  kind: ({ u, v }) => (v < 0.16 ? 'light' : ['env', 'env', 'soc', 'gov'][Math.floor(u * 4)]),
  pos: ({ u, v, w, i }, t, _half, out) => {
    if (v < 0.16) {
      // Sparks lift off the ring like seeds rising through the canopy
      const rise = (w + t * 0.07 + i * 0.013) % 1;
      const angle = u * TAU + t * 0.1;
      const r = RING * (1 + rise * 0.35);
      out[0] = Math.cos(angle) * r; out[1] = MID - rise * 260; out[2] = Math.sin(angle) * r;
      out[3] = Math.sin(rise * Math.PI);
      return;
    }
    const angle = u * TAU + t * 0.38;
    const tube = 6 + w * 16, twist = v * TAU * 4;
    const r = RING + Math.cos(twist) * tube;
    out[0] = Math.cos(angle) * r; out[1] = MID + Math.sin(twist) * tube; out[2] = Math.sin(angle) * r;
    out[3] = 1;
  },
  labels: (t) => STEPS.map((text, step) => ({
    text, at: ringPoint(t * 0.38 + (step * TAU) / 3, 0, 0).map((n, axis) => (axis === 1 ? n - 34 : n)) as Vec3,
    colour: 'light', strong: true,
  })),
  camera: { yaw: 0, pitch: 0.95, sway: 0.12, introYaw: 0.9, introPitch: -0.5, centreX: 0.7, centreY: 0.53, narrowCentreX: 0.5, narrowCentreY: 0.7, zoom: 0.8, narrowZoom: 0.62 },
};

export const SCENES: Record<FlowMode, Scene> = { converge, braid, cycle };
