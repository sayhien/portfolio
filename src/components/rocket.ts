// The rocket film above the footer. It plays by itself and loops, only while
// it is on screen. The story and
// shaders are in rocket-scene.ts. With reduced motion it starts paused on one
// still frame. Returns false when graphics are not available.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible, buildProgram, uploadAttribute } from './webgl-helpers';
import { lookAt, perspective } from './camera-math';
import { cameraAt, END, HIT, hitPoint, LOOP, PADS, PIERCE, ROCKET_FRAGMENT, ROCKET_VERTEX, SMALL_SIZE, SMALL_START, SPEED, STILL_TIME, TURNS } from './rocket-scene';

const PARTICLES = 140000;
const PHONE_PARTICLES = 85000;
const MAX_DPR = 1.5;
const FADE_IN = 0.6;
const SIZE_REFERENCE = 70;

export function startRocket(section: HTMLElement, canvas: HTMLCanvasElement): boolean {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) return false;
  let program: WebGLProgram;
  try {
    program = buildProgram(gl, ROCKET_VERTEX, ROCKET_FRAGMENT);
  } catch (error) {
    console.error('The rocket film could not start', error);
    return false;
  }
  gl.useProgram(program);

  const count = window.matchMedia('(max-width: 760px)').matches ? PHONE_PARTICLES : PARTICLES;
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  uploadAttribute(gl, program, 'aSeed', seeds, 4);

  const names = ['uProj', 'uView', 'uEye', 'uT', 'uDpr', 'uSizeRef', 'uHit', 'uPad', 'uTurn', 'uSmallStart', 'uSmallSize', 'uPierce', 'uPierceT'];
  const uniform = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
  gl.uniform3fv(uniform.uPad, new Float32Array(PADS.flat()));
  gl.uniform3fv(uniform.uTurn, new Float32Array(TURNS.flat()));
  gl.uniform1fv(uniform.uSmallStart, new Float32Array(SMALL_START));
  gl.uniform1fv(uniform.uSmallSize, new Float32Array(SMALL_SIZE));
  gl.uniform3fv(uniform.uPierce, new Float32Array(PIERCE.flatMap((pierce) => pierce.at)));
  gl.uniform1fv(uniform.uPierceT, new Float32Array(PIERCE.map((pierce) => pierce.time)));
  gl.uniform1f(uniform.uSizeRef, SIZE_REFERENCE);
  gl.uniform3fv(uniform.uHit, hitPoint());
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  let time = prefersReducedMotion() ? STILL_TIME : 0;
  const paused = prefersReducedMotion(); // with reduced motion the film stays on one frame
  let needsDraw = true;

  const draw = () => {
    const width = Math.round(canvas.clientWidth * dpr), height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const t = Math.min(time, END), camera = cameraAt(t);
    // Fade in as each loop starts; when the falling stage reaches the camera the film cuts to dark until the next loop.
    canvas.style.opacity = String(time > HIT ? 0 : Math.min(1, time / FADE_IN));
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(uniform.uProj, false, perspective(width / Math.max(1, height), { fov: camera.fov, near: 1, far: 30000 }));
    gl.uniformMatrix4fv(uniform.uView, false, lookAt(camera.eye, camera.target, camera.roll));
    gl.uniform3fv(uniform.uEye, camera.eye);
    gl.uniform1f(uniform.uT, t);
    gl.uniform1f(uniform.uDpr, dpr);
    gl.drawArrays(gl.POINTS, 0, count);
  };

  animateWhileVisible(section, (dt) => {
    if (paused && !needsDraw) return;
    if (!paused) time = (time + dt * SPEED) % LOOP;
    needsDraw = false;
    draw();
  });
  return true;
}
