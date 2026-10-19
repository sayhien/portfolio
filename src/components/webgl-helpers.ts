// Small WebGL and animation helpers shared by the particle scenes
// (earth.ts for the case study backgrounds, bee-garden.ts for the footer).
import { isPaused } from './motion';

export function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader failed');
  return shader;
}

export function buildProgram(gl: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Could not create program');
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Link failed');
  return program;
}

export function uploadAttribute(gl: WebGLRenderingContext, program: WebGLProgram, name: string, data: Float32Array, size: number) {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) return; // unused by this shader
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

/**
 * Call onFrame with the seconds since the last frame, but only while the host
 * is on screen, the page is not paused, and the scene has not stopped.
 * Returns a function that stops the loop for good.
 */
export function animateWhileVisible(host: HTMLElement, onFrame: (dt: number) => void): () => void {
  let last = 0, visible = false, frame = 0, stopped = false;
  const loop = (now: number) => {
    frame = 0;
    if (!visible || isPaused() || stopped) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    onFrame(dt);
    frame = requestAnimationFrame(loop);
  };
  const sync = () => {
    if (visible && !isPaused() && !stopped && !frame) { last = 0; frame = requestAnimationFrame(loop); }
  };
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { rootMargin: '100px' }).observe(host);
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  return () => { stopped = true; };
}
