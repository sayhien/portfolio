// The quiet night sky behind every page: small white stars like the ones in
// the footer meadow, a handful that flash brighter now and then, and the odd
// shooting star. Drawn on a plain 2D canvas, about 30 times a second, only
// while the tab is visible. Reduced motion shows one still sky.
import { prefersReducedMotion } from './motion';

type Star = { x: number; y: number; size: number; alpha: number; speed: number; phase: number; standout: boolean };
type Meteor = { x: number; y: number; dx: number; dy: number; start: number; duration: number };

const STAR_AREA = 3000; // one star per this many square pixels, like the footer sky
const STANDOUT_SHARE = 0.015;
const FRAME_TIME = 1000 / 30;
const METEOR_GAP: [number, number] = [7000, 14000]; // milliseconds between shooting stars

function makeStars(width: number, height: number): Star[] {
  const count = Math.round((width * height) / STAR_AREA);
  return Array.from({ length: count }, () => {
    const bright = Math.random() < 0.25;
    return {
      x: Math.random() * width, y: Math.random() * height,
      size: bright ? 1.6 : 1.1, alpha: bright ? 0.85 : 0.35,
      speed: 0.4 + Math.random() * 1.6, phase: Math.random() * Math.PI * 2,
      standout: Math.random() < STANDOUT_SHARE,
    };
  });
}

function drawStar(ctx: CanvasRenderingContext2D, star: Star, t: number) {
  if (star.standout) {
    // flashes: mostly calm, then a short bright burst with a soft glow
    const flash = Math.pow(0.5 + 0.5 * Math.sin(t * star.speed * 0.6 + star.phase), 6);
    const radius = 1.2 + flash * 2.2;
    ctx.globalAlpha = 0.5 + 0.5 * flash;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(star.x, star.y, radius, 0, Math.PI * 2); ctx.fill();
    if (flash > 0.2) {
      ctx.globalAlpha = flash * 0.5;
      ctx.fillRect(star.x - radius * 3, star.y - 0.5, radius * 6, 1);
      ctx.fillRect(star.x - 0.5, star.y - radius * 3, 1, radius * 6);
    }
    return;
  }
  ctx.globalAlpha = star.alpha * (0.7 + 0.3 * Math.sin(t * star.speed + star.phase));
  ctx.fillStyle = '#eceff3';
  ctx.fillRect(star.x, star.y, star.size, star.size);
}

function drawMeteor(ctx: CanvasRenderingContext2D, meteor: Meteor, now: number): boolean {
  const u = (now - meteor.start) / meteor.duration;
  if (u > 1) return false;
  const headX = meteor.x + meteor.dx * u, headY = meteor.y + meteor.dy * u;
  const tail = Math.min(1, u * 3) * 0.3;
  const gradient = ctx.createLinearGradient(headX, headY, headX - meteor.dx * tail, headY - meteor.dy * tail);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.globalAlpha = Math.sin(Math.PI * u);
  ctx.strokeStyle = gradient; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(headX, headY); ctx.lineTo(headX - meteor.dx * tail, headY - meteor.dy * tail); ctx.stroke();
  return true;
}

export function startStarSky(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  let width = 0, height = 0, stars: Star[] = [], meteor: Meteor | null = null, nextMeteor = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth; height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = makeStars(width, height);
  };
  const render = (now: number) => {
    const t = now / 1000;
    ctx.clearRect(0, 0, width, height);
    stars.forEach((star) => drawStar(ctx, star, t));
    if (meteor && !drawMeteor(ctx, meteor, now)) meteor = null;
    ctx.globalAlpha = 1;
  };
  const launchMeteor = (now: number) => {
    const length = Math.min(width, height) * (0.5 + Math.random() * 0.4);
    meteor = { x: width * (0.3 + Math.random() * 0.7), y: height * Math.random() * 0.45, dx: -length, dy: length * (0.35 + Math.random() * 0.25), start: now, duration: 900 };
    nextMeteor = now + METEOR_GAP[0] + Math.random() * (METEOR_GAP[1] - METEOR_GAP[0]);
  };

  resize();
  if (prefersReducedMotion()) {
    render(0);
    new ResizeObserver(() => { resize(); render(0); }).observe(canvas);
    return true;
  }
  new ResizeObserver(resize).observe(canvas);
  let last = 0;
  nextMeteor = performance.now() + 3000;
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    if (now - last < FRAME_TIME) return;
    last = now;
    if (!meteor && now > nextMeteor) launchMeteor(now);
    render(now);
  };
  requestAnimationFrame(loop);
  return true;
}
