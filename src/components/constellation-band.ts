// Draws the constellation film (data and timeline in constellations.ts) in pencil
// dots, the same particle look as the rest of the portfolio. It only moves while
// on screen, and with reduced motion it holds one finished figure.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible } from './webgl-helpers';
import { figures, stars, phaseAt, LOOP_SECONDS, STILL_SECONDS } from './constellations';
import type { Phase, Point } from './constellations';

const MINT = '110,231,183', WHITE = '238,241,244';
const rgba = (rgb: string, alpha: number) => `rgba(${rgb},${alpha})`;
const seeded = (n: number) => { const x = Math.sin(n * 91.7) * 43758.5453; return x - Math.floor(x); };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const STAR_DOTS = 40;

/** Points along a smooth outline through the given points, about `step` grid units apart. */
function outlineDots(strokes: { pts: Point[]; closed?: boolean }[], step: number) {
  const dots: Point[] = [];
  strokes.forEach(({ pts, closed }) => {
    const count = pts.length, at = (i: number) => pts[closed ? (i + count) % count : Math.max(0, Math.min(count - 1, i))];
    for (let i = 0; i < (closed ? count : count - 1); i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      const steps = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let k = 0; k < steps; k++) {
        const u = k / steps, v = 1 - u;
        dots.push([v ** 3 * p1[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u ** 3 * p2[0], v ** 3 * p1[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u ** 3 * p2[1]]);
      }
    }
  });
  return dots;
}

// Pencil dots are placed once, so they stay put from frame to frame
const starDots = stars.map((_, i) => Array.from({ length: STAR_DOTS }, (_, k): [number, number] => {
  const angle = seeded(i * 13 + k) * 6.29, radius = Math.sqrt(seeded(i * 17 + k * 3)) * 1.6;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}));
const artDots = figures.map((figure, f) => outlineDots(figure.art, 0.7).map(([x, y], k) => ({
  x: x + (seeded(f * 99 + k) - 0.5) * 1.3, y: y + (seeded(f * 77 + k * 3) - 0.5) * 1.3, when: seeded(f * 31 + k * 7),
})));

type Frame = { ctx: CanvasRenderingContext2D; width: number; height: number; scale: number; offsetX: number; offsetY: number; sans: string };

function drawFigure(frame: Frame, phase: Phase) {
  const { ctx, scale } = frame;
  const place = (x: number, y: number): Point => [frame.offsetX + x * scale, frame.offsetY + y * scale];
  const unit = Math.max(0.75, Math.min(1.4, frame.width / 760));
  const size = Math.max(0.6, 0.55 * unit);
  const dot = (x: number, y: number, radius: number, alpha: number, rgb: string) => { ctx.fillStyle = rgba(rgb, alpha); ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); };

  // every star in the set; the figure's stars gather more dots and brighten
  stars.forEach((star, i) => {
    const on = phase.figure.ids.includes(i) ? phase.bright : 0;
    const [x, y] = place(star.x, star.y), count = Math.round(6 + (STAR_DOTS - 6) * on), spread = (0.55 + on * 0.6) * unit * 2;
    for (let k = 0; k < count; k++) {
      const [dx, dy] = starDots[i][k];
      dot(x + dx * spread, y + dy * spread, size, (0.4 + 0.5 * on) * (k < 6 ? 1 : on), on > 0.3 && k % 3 === 0 ? MINT : WHITE);
    }
  });
  // the faint animal, dotted in quickly around its stars
  artDots[phase.index].forEach(({ x, y, when }) => {
    if (when > phase.artReach) return;
    const [px, py] = place(x, y);
    dot(px, py, size * 1.15, 0.62 * phase.art, MINT);
  });
  // lines as rows of dots, drawn one after another
  const lineCount = phase.figure.lines.length;
  phase.figure.lines.forEach(([from, to], line) => {
    const show = clamp01(phase.lines * lineCount - line * 0.6);
    const [ax, ay] = place(...phase.figure.points[from]), [bx, by] = place(...phase.figure.points[to]);
    const steps = Math.floor(Math.hypot(bx - ax, by - ay) / (2.6 * unit));
    for (let k = 2; k < steps * show - 1; k++) dot(ax + (bx - ax) * k / steps, ay + (by - ay) * k / steps, size, 0.75 * phase.out, WHITE);
  });
  // the name, rising into place under the figure
  if (phase.name > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(WHITE, phase.name);
    ctx.font = `600 ${Math.round(20 * unit)}px ${frame.sans}`;
    ctx.fillText(`${phase.figure.name}  ·  ${phase.figure.animal}`, frame.width / 2, frame.height - 22 * unit + (1 - phase.name) * 6);
  }
}

/** Start the film on its canvas. Returns false if this browser cannot draw it. */
export function startConstellations(host: HTMLElement, canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const sans = getComputedStyle(document.body).getPropertyValue('--sans') || 'sans-serif';
  const draw = (time: number) => {
    const ratio = Math.min(2, window.devicePixelRatio || 1), width = host.clientWidth, height = host.clientHeight;
    if (canvas.width !== Math.round(width * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    // fit the 100 by 60 grid above the name
    const room = height - 70 * Math.min(1, width / 700), scale = Math.min((width - 40) / 100, (room - 30) / 60);
    drawFigure({ ctx, width, height, scale, offsetX: (width - 100 * scale) / 2, offsetY: Math.max(14, (room - 60 * scale) / 2 + 8), sans }, phaseAt(time));
  };

  if (prefersReducedMotion()) {
    draw(STILL_SECONDS);
    new ResizeObserver(() => draw(STILL_SECONDS)).observe(host);
    return true;
  }
  let time = 0;
  animateWhileVisible(host, (dt) => { time = (time + dt) % LOOP_SECONDS; draw(time); });
  return true;
}
