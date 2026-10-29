// The constellations for the design library's Component Criteria film. One shared
// set of stars makes every figure: a few stars brighten, lines join them, a faint
// animal appears with its name, then the next figure takes over. All coordinates
// are on a 100 by 60 grid. A point in `art` that matches one of the figure's stars
// follows that star, so the animal always passes through its stars.

export type Point = [number, number];
type Stroke = { pts: Point[]; closed?: boolean };
type FigureData = { name: string; animal: string; stars: Point[]; lines: [number, number][]; art: Stroke[] };
export type Figure = FigureData & { ids: number[]; points: Point[] };
export type Star = { x: number; y: number; uses: number; mag: number; phase: number };

const FIGURES_DATA: FigureData[] = [
  { name: 'Leo', animal: 'The lion',
    stars: [[16, 24], [27, 9], [52, 15], [80, 17], [95, 16], [76, 46], [34, 46], [29, 34], [58, 34]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 8], [8, 5], [8, 7], [7, 6], [7, 0]],
    art: [
      { pts: [[16, 24], [19, 17], [27, 9], [39, 10], [52, 15], [66, 15], [80, 17], [83, 24], [81, 32], [79, 46], [73, 46], [72, 37], [60, 34], [44, 34], [38, 38], [37, 46], [31, 46], [29, 34], [22, 29]], closed: true },
      { pts: [[80, 17], [88, 19], [93, 19], [95, 15]] },
      { pts: [[27, 9], [23, 18], [25, 26], [31, 31], [37, 26]] },
    ] },
  { name: 'Cygnus', animal: 'The swan',
    stars: [[8, 30], [30, 30], [52, 30], [90, 30], [48, 5], [48, 55], [52, 18], [52, 42]],
    lines: [[0, 1], [1, 2], [2, 3], [2, 6], [6, 4], [2, 7], [7, 5]],
    art: [
      { pts: [[8, 30], [14, 27], [22, 29], [34, 29], [44, 27], [46, 20], [44, 12], [48, 5], [54, 9], [56, 18], [60, 26], [72, 27], [84, 27], [92, 30], [84, 33], [72, 33], [60, 34], [56, 42], [54, 51], [48, 55], [44, 48], [46, 40], [44, 33], [34, 31], [22, 31], [14, 33]], closed: true },
    ] },
  { name: 'Scorpius', animal: 'The scorpion',
    stars: [[9, 14], [9, 46], [20, 21], [20, 39], [30, 30], [46, 30], [66, 31], [80, 30], [88, 20], [77, 11]],
    lines: [[0, 2], [2, 4], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]],
    art: [
      { pts: [[28, 26], [40, 23], [54, 25], [64, 30], [54, 35], [40, 37], [28, 34]], closed: true },
      { pts: [[64, 30], [74, 33], [82, 30], [88, 21], [86, 13], [79, 9], [76, 13]] },
      { pts: [[28, 27], [20, 21], [12, 19], [8, 12], [15, 13], [13, 19]] },
      { pts: [[28, 33], [20, 39], [12, 41], [8, 48], [15, 47], [13, 41]] },
      { pts: [[38, 36], [35, 44]] }, { pts: [[46, 36], [46, 45]] }, { pts: [[54, 35], [57, 43]] },
    ] },
  { name: 'Ursa Major', animal: 'The great bear',
    stars: [[14, 18], [40, 11], [64, 12], [86, 15], [95, 22], [68, 46], [28, 46], [46, 36]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 7], [7, 5], [7, 6], [6, 0]],
    art: [
      { pts: [[14, 18], [20, 14], [40, 11], [64, 12], [74, 14], [78, 10], [81, 12], [86, 15], [95, 22], [88, 27], [78, 27], [72, 32], [72, 46], [66, 46], [64, 36], [44, 36], [34, 40], [32, 46], [25, 46], [22, 34], [16, 26]], closed: true },
    ] },
  { name: 'Delphinus', animal: 'The dolphin',
    stars: [[10, 44], [22, 34], [50, 8], [64, 20], [80, 30], [92, 24], [94, 38], [36, 42], [48, 30]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6], [1, 8], [8, 7]],
    art: [
      { pts: [[10, 44], [18, 38], [24, 30], [38, 20], [46, 14], [50, 8], [52, 17], [64, 20], [78, 28], [88, 20], [92, 24], [86, 32], [94, 38], [88, 40], [78, 34], [64, 30], [48, 30], [40, 34], [36, 42], [34, 34], [24, 40], [16, 46]], closed: true },
    ] },
  { name: 'Lepus', animal: 'The hare',
    stars: [[18, 34], [30, 22], [54, 20], [56, 2], [66, 4], [76, 22], [60, 48], [28, 50], [36, 42]],
    lines: [[0, 1], [1, 2], [2, 3], [2, 4], [2, 5], [2, 6], [1, 8], [8, 7]],
    art: [
      { pts: [[18, 34], [24, 26], [40, 20], [54, 20], [56, 10], [54, 2], [58, 1], [62, 12], [64, 4], [68, 4], [66, 14], [68, 16], [76, 22], [72, 26], [64, 28], [62, 38], [64, 48], [56, 48], [54, 40], [44, 42], [46, 50], [26, 50], [20, 44]], closed: true },
    ] },
  { name: 'Taurus', animal: 'The bull',
    stars: [[10, 44], [30, 34], [50, 30], [70, 26], [78, 38], [88, 28], [60, 6], [94, 8], [40, 50]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [3, 6], [3, 7], [1, 8]],
    art: [
      { pts: [[10, 44], [14, 36], [30, 34], [50, 30], [64, 28], [70, 26], [80, 28], [88, 28], [90, 34], [84, 40], [78, 38], [68, 38], [62, 44], [56, 52], [50, 52], [48, 42], [40, 50], [38, 52], [32, 52], [26, 44], [16, 48]], closed: true },
      { pts: [[70, 26], [64, 16], [60, 6]] },
      { pts: [[72, 26], [84, 18], [94, 8]] },
    ] },
  { name: 'Aquila', animal: 'The eagle',
    stars: [[50, 8], [50, 28], [50, 52], [30, 24], [8, 16], [70, 24], [92, 16], [22, 40], [78, 40]],
    lines: [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [3, 7], [5, 8]],
    art: [
      { pts: [[50, 8], [54, 10], [54, 18], [66, 18], [80, 14], [92, 16], [86, 26], [88, 34], [78, 40], [68, 38], [60, 42], [56, 50], [50, 52], [44, 50], [40, 42], [32, 38], [22, 40], [14, 34], [10, 26], [8, 16], [20, 14], [34, 18], [46, 18], [46, 10]], closed: true },
    ] },
  { name: 'Canis Major', animal: 'The great dog',
    stars: [[86, 16], [76, 24], [60, 28], [38, 28], [14, 20], [64, 48], [52, 48], [38, 48], [26, 46], [94, 24]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [2, 6], [3, 7], [3, 8], [0, 9]],
    art: [
      { pts: [[86, 16], [94, 24], [86, 28], [74, 32], [64, 48], [58, 48], [52, 48], [52, 38], [44, 36], [38, 48], [32, 48], [26, 46], [30, 34], [22, 30], [14, 20], [26, 24], [38, 28], [60, 28], [72, 22], [80, 16]], closed: true },
    ] },
  { name: 'Pegasus', animal: 'The winged horse',
    stars: [[38, 26], [66, 26], [38, 48], [66, 48], [26, 14], [10, 10], [8, 20], [56, 10], [78, 6], [88, 32]],
    lines: [[0, 1], [1, 3], [3, 2], [2, 0], [0, 4], [4, 5], [5, 6], [1, 7], [7, 8], [8, 1], [1, 9]],
    art: [
      { pts: [[10, 10], [18, 10], [26, 14], [38, 26], [66, 26], [78, 30], [88, 32], [82, 38], [70, 40], [66, 48], [70, 56], [64, 56], [58, 48], [46, 50], [40, 56], [34, 56], [38, 48], [34, 36], [28, 28], [20, 20], [8, 20]], closed: true },
      { pts: [[66, 26], [56, 10], [78, 6], [72, 18]], closed: true },
    ] },
];

// ---- one shared set of stars ------------------------------------------------
// A figure's star that lands close to a star already in the set reuses it, so the same stars serve several figures.
const SNAP_DISTANCE = 5.5, SET_SIZE = 72;
const seeded = (n: number) => { const x = Math.sin(n * 91.7) * 43758.5453; return x - Math.floor(x); };

export const stars: Star[] = [];
export const figures: Figure[] = FIGURES_DATA.map((data) => {
  const ids = data.stars.map(([x, y]) => {
    const near = stars.findIndex((star) => Math.hypot(star.x - x, star.y - y) < SNAP_DISTANCE);
    if (near >= 0) { stars[near].uses++; return near; }
    stars.push({ x, y, uses: 1, mag: 0, phase: 0 });
    return stars.length - 1;
  });
  const points = ids.map((id): Point => [stars[id].x, stars[id].y]);
  const art = data.art.map((stroke) => ({
    ...stroke,
    pts: stroke.pts.map(([x, y]): Point => { const star = data.stars.findIndex(([sx, sy]) => sx === x && sy === y); return star >= 0 ? points[star] : [x, y]; }),
  }));
  return { ...data, art, ids, points };
});
// Fill the sky with quiet stars that belong to no figure
for (let i = 0; stars.length < SET_SIZE && i < 800; i++) {
  const x = 3 + seeded(i * 2.3) * 94, y = 2 + seeded(i * 5.1 + 7) * 56;
  if (stars.every((star) => Math.hypot(star.x - x, star.y - y) > 7)) stars.push({ x, y, uses: 0, mag: 0, phase: 0 });
}
stars.forEach((star, i) => { star.mag = 0.5 + seeded(i * 3.3 + 1) * 0.8; star.phase = seeded(i * 7.7) * 6.28; });

// ---- the timeline: brighten, join, dot in the animal, name it, hold, then a quick change ----
const FIGURE_SECONDS = 4.6;
const BRIGHT_S = 0.35, LINES_FROM = 0.3, LINES_S = 1.1, ART_FROM = 0.95, ART_S = 0.7, NAME_FROM = 1.2, OUT_FROM = 4.32, OUT_S = 0.26;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => 1 - (1 - clamp01(v)) ** 3;

export type Phase = { index: number; figure: Figure; local: number; out: number; bright: number; lines: number; art: number; artReach: number; name: number };
export function phaseAt(time: number): Phase {
  const index = Math.floor(time / FIGURE_SECONDS) % figures.length, local = time % FIGURE_SECONDS;
  const out = 1 - clamp01((local - OUT_FROM) / OUT_S);
  return {
    index, figure: figures[index], local, out,
    bright: ease(local / BRIGHT_S) * out,
    lines: clamp01((local - LINES_FROM) / LINES_S),
    art: out,
    artReach: clamp01((local - ART_FROM) / ART_S),
    name: ease((local - NAME_FROM) / 0.4) * out,
  };
}
/** The moment the loop holds with reduced motion: the first figure, drawn and named. */
export const STILL_SECONDS = 3;
export const LOOP_SECONDS = figures.length * FIGURE_SECONDS;
