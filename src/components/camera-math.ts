// Shared camera maths for the particle scenes: small vector helpers, a
// perspective lens that can shift the picture sideways, and a look-at view
// that can roll like a film camera.

export type Vec3 = [number, number, number];

export const ease = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x * x * (3 - 2 * x); };
export const mix = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: Vec3) => scale(a, 1 / (length(a) || 1));
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export type Lens = { shift?: [number, number]; fov?: number; near?: number; far?: number };

/** Half the vertical view as a tangent. Narrow screens see a little wider so scenes stay whole. */
export function viewTangent(aspect: number, fov = 42) {
  const tan = Math.tan((fov * Math.PI) / 360);
  return aspect < 1.6 ? tan * Math.min(2, 1.6 / aspect) : tan;
}

/** A perspective lens. `shift` slides the picture sideways or up without turning the camera. */
export function perspective(aspect: number, { shift = [0, 0], fov = 42, near = 10, far = 9000 }: Lens = {}): Float32Array {
  const f = 1 / viewTangent(aspect, fov), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, -shift[0], -shift[1], (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

/** The camera's right, up and back directions, with an optional roll in radians. */
export function cameraAxes(eye: Vec3, target: Vec3, roll = 0) {
  const back = norm(sub(eye, target));
  const right0 = norm(cross([0, 1, 0], back)), up0 = cross(back, right0);
  const c = Math.cos(roll), s = Math.sin(roll);
  const right = add(scale(right0, c), scale(up0, s)), up = add(scale(up0, c), scale(right0, -s));
  return { right, up, back };
}

export function lookAt(eye: Vec3, target: Vec3, roll = 0): Float32Array {
  const { right: x, up: y, back: z } = cameraAxes(eye, target, roll);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}
