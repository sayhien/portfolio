// The footer landscape, drawn only with green particles in the style of an
// engraved print: drifting clouds, distant mountains, shaded rolling hills
// with trees, a meadow, butterflies and birds, and a few large open flowers
// in front. A yellow bee flies between those flowers and drinks from their
// centres. Tapping the bee (or the "say hello" button) makes it stop, chirp
// and float up hearts, then carry on. One draw call, about 40,000 points.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible, buildProgram, uploadAttribute } from './webgl-helpers';

const MAX_DPR = 1.5;
const MAX_FLOWERS = 4;
const STILL_TIME = 12; // seconds in, for the reduced motion still picture

const KIND = {
  sky: 13, cloud: 0, mountain: 1, hill: 2, tree: 3, field: 4, grass: 5, wildflower: 6,
  flower: 7, butterfly: 8, bird: 9, bee: 10, nectar: 11, heart: 12,
} as const;

const VERTEX = `
precision highp float;
attribute vec4 aData; // kind, index, sub index, random
attribute vec4 aRnd;
uniform vec2 uRes;
uniform float uT, uDpr, uFlowerN, uCollect, uTapAge, uFacing, uFlap;
uniform vec3 uBee; // x, y, flower it is visiting
uniform vec4 uFlowers[${MAX_FLOWERS}]; // x, head height, radius, petals
varying vec3 vCol;
varying float vA;
const float PI = 3.14159265, TAU = 6.2831853, BEE = 1.5;
const vec3 MINT = vec3(.43,.91,.72), DEEP = vec3(.13,.5,.42), PALE = vec3(.76,.98,.88);
const vec3 GOLD = vec3(.99,.78,.25), INK = vec3(.16,.12,.07);

float h1(float n){ return fract(sin(n*12.9898 + 4.1414)*43758.5453); }
vec2 disc(float a, float b){ return vec2(cos(a*TAU), sin(a*TAU))*sqrt(b); }
vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }
float wind(float x, float t){ return sin(t*.8 + x*.006)*.6 + sin(t*1.9 + x*.02)*.25 + .3*sin(t*.37 + 2.); }

// Ridge line of each layer: 0 far mountains, 1 to 3 hills, 4 the meadow
float ridge(float layer, float x){
  float u = x/max(uRes.x, 1.), H = uRes.y;
  if(layer < .5) return H*(.6 + .07*sin(u*7. + 1.3) + .035*sin(u*17. + .4) + .015*sin(u*41. + 2.));
  if(layer < 1.5) return H*(.44 + .06*sin(u*4.5 + 2.2) + .02*sin(u*13. + 1.));
  if(layer < 2.5) return H*(.34 + .07*sin(u*3.2 - .6) + .02*sin(u*9. + 3.));
  if(layer < 3.5) return H*(.24 + .045*sin(u*2.6 + 1.7) + .015*sin(u*11.));
  return H*.13;
}
// 1 when a nearer layer covers this point
float covered(float layer, vec2 p){
  for(int k = 1; k < 5; k++){ float L = float(k); if(L > layer && p.y < ridge(L, p.x) - 1.) return 1.; }
  return 0.;
}
// Engraved hatching under a ridge: lines follow the ridge, lit on slopes facing the light
vec2 hatch(float layer, float lines, float gap, out float a){
  float x = aRnd.x*uRes.x;
  float k = floor(aRnd.y*lines);
  float y = ridge(layer, x) - k*gap - k*k*.15;
  float slope = (ridge(layer, x + 3.) - ridge(layer, x - 3.))/6.;
  float lit = clamp(.55 - slope*4., 0., 1.);
  float dash = step(.22, h1(floor(x/(5. + k)) + k*13. + layer*7.));
  a = k < .5 ? .95 : (.2 + .65*lit)*pow(1. - k/lines, 1.1)*dash;
  return vec2(x, y + (aRnd.z - .5)*.8);
}
vec2 flowerHead(vec4 f, float t){ float w = wind(f.x, t); return vec2(f.x + w*14., f.y - abs(w)*3.); }
vec2 heart(float a){ float s = sin(a); return vec2(16.*s*s*s, 13.*cos(a) - 5.*cos(2.*a) - 2.*cos(3.*a) - cos(4.*a))/16.; }

vec2 place(out vec3 col, out float a, out float size){
  float kind = aData.x, i = aData.y, r = aData.w;
  float W = uRes.x, H = uRes.y, t = uT;
  float scale = clamp(W/1200., .6, 1.2);
  size = 1.5; a = 1.; col = MINT;

  if(kind > 12.5){ // faint engraved lines across the sky
    float k = floor(aRnd.y*46.);
    float y = H*.5 + k*H*.011;
    float x = aRnd.x*W;
    float dash = step(.35, h1(floor(x/9.) + k*17.));
    col = DEEP*1.3; a = .05 + .1*(k/46.); a *= dash; size = 1.2;
    return vec2(x, y);
  }
  if(kind < .5){ // clouds drifting across the sky, lit from above
    float s = (.95 + .55*h1(i + 2.))*scale;
    float cx = mod(h1(i)*(W + 600.) + t*(6. + i*1.6), W + 600.) - 300.;
    float cy = H*(.72 + .1*h1(i + 7.));
    float b = floor(aRnd.x*6.);
    vec2 bc = vec2((h1(i*7. + b) - .5)*190., abs(h1(i*5. + b) - .5)*44.)*s;
    float rad = (38. + 52.*h1(i*3. + b))*s;
    vec2 q = disc(aRnd.y, aRnd.z);
    vec2 p = vec2(cx, cy) + bc + q*rad*vec2(1., .68);
    p.y = max(p.y, cy - 8.*s);
    float top = clamp((p.y - cy - bc.y)/(rad*.68), -1., 1.);
    float edge = smoothstep(.55, 1., length(q));
    col = mix(DEEP*1.2, PALE, .5 + .5*top);
    a = (.18 + .62*smoothstep(-.5, 1., top))*(.6 + .6*edge); size = 1.7;
    return p;
  }
  if(kind < 1.5){ // far mountains
    vec2 p = hatch(0., 12., 4.5, a);
    col = mix(DEEP, MINT, .5); a *= .85*(1. - covered(0., p)); size = 1.4;
    return p;
  }
  if(kind < 2.5){ // three rolling hills
    float layer = 1. + i;
    vec2 p = hatch(layer, 12., 4.5 + i*.6, a);
    col = mix(DEEP*1.1, MINT, .45 + i*.18); a *= (.85 + i*.1)*(1. - covered(layer, p)); size = 1.5 + i*.1;
    return p;
  }
  if(kind < 3.5){ // clumps of trees along the hill tops
    float layer = 1. + step(.5, h1(i*3.1));
    float x = h1(i*1.7)*W;
    float rad = (5. + 9.*h1(i*2.3))*(layer > 1.5 ? 1.15 : .9)*scale;
    vec2 q = disc(aRnd.x, aRnd.y);
    vec2 p = vec2(x, ridge(layer, x) + rad*.7) + q*rad*vec2(1.1, 1.);
    float light = clamp(.5 + .6*dot(normalize(q + 1e-4), vec2(-.6, .8)), 0., 1.);
    col = mix(DEEP*1.2, MINT, light*.85); a = (.5 + .5*light)*(1. - covered(layer, p)); size = 1.5;
    return p;
  }
  if(kind < 4.5){ // the near field, softly stippled
    vec2 p = vec2(aRnd.x*W, aRnd.y*aRnd.y*ridge(4., 0.));
    col = mix(DEEP, MINT, aRnd.z*.5); a = .18 + .2*aRnd.w; size = 1.4;
    return p;
  }
  if(kind < 5.5){ // grass blades swaying in the wind
    float x = aRnd.x*W;
    float base = aRnd.y*ridge(4., 0.)*1.15;
    float near = 1. - base/(H*.15);
    float h = (8. + near*near*46. + aRnd.z*14.)*scale;
    float u = aData.z/13.;
    float bend = (wind(x, t)*9. + (aRnd.w - .5)*12.)*u*u;
    col = mix(DEEP, MINT, .3 + .6*u); a = (.4 + .5*u)*(.5 + .5*near); size = 1.5;
    return vec2(x + bend, base + u*h);
  }
  if(kind < 6.5){ // small wildflowers dotted over the meadow
    float x = h1(i*1.3)*W;
    float y = h1(i*2.9)*H*.2 + 4.;
    float petal = floor(aRnd.x*6.);
    vec2 p = vec2(x + wind(x, t)*4., y) + (petal < .5 ? vec2(0.) : vec2(cos(petal*1.257), sin(petal*1.257))*2.4*scale);
    col = petal < .5 ? MINT : PALE; a = .75; size = 1.6;
    return p;
  }
  if(kind < 7.5){ // large open flowers facing the viewer
    if(i >= uFlowerN){ a = 0.; return vec2(-100.); }
    vec4 f = uFlowers[int(i)];
    vec2 c = flowerHead(f, t);
    float R = f.z, w = wind(f.x, t);
    float glow = uCollect*step(abs(i - uBee.z), .1);
    if(r < .1){ // stem
      float u = aRnd.x;
      col = DEEP*1.25; a = .85; size = 1.7;
      return vec2(mix(f.x, c.x, u*u) + (aRnd.y - .5)*1.6, mix(-6., c.y - R*.15, u));
    }
    if(r < .2){ // two leaves on the stem
      float side = step(.5, aRnd.y)*2. - 1.;
      float u = .3 + step(.5, aRnd.y)*.22;
      vec2 base = vec2(mix(f.x, c.x, u*u), mix(-6., c.y, u));
      float v = aRnd.x, across = aRnd.z*2. - 1.;
      across = sign(across)*pow(abs(across), .35);
      vec2 dir = normalize(vec2(side, .9 + w*side*.2));
      vec2 p = base + dir*v*R*1.1 + vec2(-dir.y, dir.x)*sin(PI*v)*R*.22*across;
      col = mix(DEEP*1.2, MINT, .2 + .5*v); a = .75; size = 1.6;
      return p;
    }
    float nod = .88 + .08*sin(t*1.3 + i*2.);
    float spin = w*.12;
    if(r < .8){ // petals, drawn by their outlines and centre veins like an engraving
      float petals = f.w;
      float k = floor(aRnd.x*petals);
      float ang = (k + .5)/petals*TAU + spin + .05*sin(t*3. + k + i);
      float v = .28 + .72*sqrt(aRnd.y);
      float halfW = R*.19*pow(sin(PI*(v - .28)/.72), .7);
      float across = aRnd.z*2. - 1.;
      across = aRnd.w < .25 ? 0. : sign(across)*pow(abs(across), .3);
      vec2 p = rot(vec2(v*R, across*halfW), ang);
      col = mix(MINT, PALE, .3 + .7*abs(across))*(1. + glow*.25); a = .9; size = 1.6;
      return c + vec2(p.x, p.y*nod);
    }
    // the open centre: stamens around a soft disc
    vec2 q = disc(aRnd.x, aRnd.y)*R*.27;
    float rim = smoothstep(.6, 1., length(q)/(R*.27));
    col = mix(DEEP*1.5, PALE, .3 + .6*rim)*(1. + glow*.6); a = .95; size = 1.8;
    return c + vec2(q.x, q.y*nod);
  }
  if(kind < 8.5){ // butterflies drifting over the meadow
    vec2 c = vec2(W*(.5 + .42*sin(t*.11 + i*2.4)), H*(.3 + .08*sin(t*.37 + i) + .04*sin(t*1.3 + i)));
    float flap = .2 + .8*abs(sin(t*9. + i*1.7));
    if(r < .12){ col = DEEP*1.4; a = 1.; size = 1.5; return c + vec2(0., (aRnd.x - .5)*7.*scale); }
    float side = step(.5, aRnd.z)*2. - 1.;
    float upper = step(.4, aRnd.w);
    vec2 q = disc(aRnd.x, aRnd.y)*vec2(5., 4.)*(upper > .5 ? 1. : .7)*scale;
    vec2 p = vec2((abs(q.x) + 4.*scale)*side*flap, q.y + (upper > .5 ? 3. : -3.)*scale);
    col = mix(MINT, PALE, aRnd.y); a = .85; size = 1.5;
    return c + p;
  }
  if(kind < 9.5){ // birds gliding far away
    float x = mod(t*(12. + h1(i)*6.) + h1(i + 4.)*(W + 200.), W + 200.) - 100.;
    float y = H*(.66 + .14*h1(i + 3.)) + sin(t*.5 + i)*6.;
    float s = aRnd.x*2. - 1.;
    float flap = 2. + 3.*sin(t*5. + i*1.3);
    col = DEEP*1.4; a = .75; size = 1.4;
    return vec2(x + s*7.*scale, y + abs(s)*flap*scale);
  }
  if(kind < 10.5){ // the bee
    float bob = sin(t*6.)*1.5;
    vec2 c = uBee.xy + vec2(0., bob);
    size = 2.4;
    if(r < .62){ // striped body
      vec2 p = disc(aRnd.x, aRnd.y)*vec2(11., 8.);
      float band = step(.5, fract((p.x + 11.)/6.5));
      col = mix(GOLD, INK, band*step(-7., p.x));
      return c + BEE*vec2(p.x*uFacing, p.y);
    }
    if(r < .74){ // head with an eye
      vec2 q = disc(aRnd.x, aRnd.y)*5.5;
      col = mix(vec3(.2,.17,.12), vec3(1.), step(length(q - vec2(1.8, 1.2)), 1.6));
      return c + BEE*vec2((12. + q.x)*uFacing, q.y + 1.);
    }
    if(r < .78){ // antennae
      float u = aRnd.x, side = step(.5, aRnd.y)*2. - 1.;
      col = vec3(.25,.2,.14); size = 1.6;
      return c + BEE*vec2((14. + u*5. + side*u*2.)*uFacing, 5. + u*7.);
    }
    float side = step(.5, aRnd.z); // wings, flapping
    vec2 p = disc(aRnd.x, aRnd.y)*vec2(6., 9.)*vec2(1., uFlap);
    col = vec3(.88,.95,1.); a = .45;
    return c + BEE*vec2((p.x - 3. + side*6.)*uFacing, p.y + 9.);
  }
  if(kind < 11.5){ // nectar rising from the flower's centre to the bee
    vec2 from = flowerHead(uFlowers[int(uBee.z)], t);
    float u = fract(aRnd.x + t*.7);
    vec2 p = mix(from, uBee.xy, u) + vec2(sin(u*9. + aRnd.y*6.), cos(u*7. + aRnd.z*6.))*4.*(1. - u);
    col = GOLD; a = uCollect*(1. - u)*.9; size = 2.;
    return p;
  }
  // hearts that float up after a tap
  float k = floor(aRnd.x*3.);
  vec2 p = uBee.xy + vec2((k - 1.)*16., 14.) + vec2(sin(uTapAge*4. + k)*6., uTapAge*60.) + heart(aRnd.y*TAU)*(7. + k*2.);
  col = GOLD; a = (uTapAge < 1.4 ? 1. : 0.)*(1. - uTapAge/1.4); size = 2.2;
  return p;
}

void main(){
  vec3 col; float a, size;
  vec2 p = place(col, a, size);
  gl_Position = vec4(p.x/uRes.x*2. - 1., p.y/uRes.y*2. - 1., 0., 1.);
  gl_PointSize = size*uDpr;
  vCol = col; vA = a;
}`;

const FRAGMENT = `
precision mediump float;
varying vec3 vCol;
varying float vA;
void main(){
  float r = length(gl_PointCoord - .5);
  if(r > .5) discard;
  float a = vA*smoothstep(.5, .3, r);
  gl_FragColor = vec4(vCol*a, a);
}`;

type Flower = { x: number; height: number; radius: number; petals: number };

// Particle groups, back to front (the sky lines go first), as [kind, groups, points per group].
// Later points draw over earlier ones, which gives the landscape its depth.
function buildParticles(narrow: boolean) {
  const n = (count: number) => Math.round(count * (narrow ? 0.6 : 1));
  const groups: [number, number, number][] = [
    [KIND.sky, 1, n(5000)],
    [KIND.cloud, 4, n(1500)],
    [KIND.mountain, 1, n(7000)],
    [KIND.hill, 3, n(9000)],
    [KIND.tree, 44, 80],
    [KIND.field, 1, n(2500)],
    [KIND.grass, n(420), 14],
    [KIND.wildflower, n(200), 7],
    [KIND.flower, MAX_FLOWERS, 2200],
    [KIND.butterfly, 2, 160],
    [KIND.bird, 5, 24],
    [KIND.bee, 1, 700],
    [KIND.nectar, 1, 80],
    [KIND.heart, 1, 90],
  ];
  const total = groups.reduce((sum, [, count, per]) => sum + count * per, 0);
  const data = new Float32Array(total * 4);
  const rnd = new Float32Array(total * 4);
  let p = 0;
  for (const [kind, count, per] of groups) {
    for (let i = 0; i < count; i++) {
      const shared = [Math.random(), Math.random(), Math.random(), Math.random()];
      for (let j = 0; j < per; j++, p++) {
        data.set([kind, i, j, Math.random()], p * 4);
        // each grass blade keeps one set of randoms so its points line up
        rnd.set(kind === KIND.grass ? shared : [Math.random(), Math.random(), Math.random(), Math.random()], p * 4);
      }
    }
  }
  return { data, rnd, total };
}

function layoutFlowers(width: number, height: number): Flower[] {
  const count = width < 700 ? 2 : width < 1100 ? 3 : 4;
  const radius = Math.max(30, Math.min(58, width * 0.034));
  return Array.from({ length: count }, (_, i) => ({
    x: width * ((i + 0.5) / count) + (Math.random() - 0.5) * (width / count) * 0.3,
    height: height * (0.2 + Math.random() * 0.16),
    radius: radius * (0.85 + Math.random() * 0.3),
    petals: 8 + Math.floor(Math.random() * 5),
  }));
}

// Must match wind() and flowerHead() in the shader, so the bee lands on the flower.
const wind = (x: number, t: number) => Math.sin(t * 0.8 + x * 0.006) * 0.6 + Math.sin(t * 1.9 + x * 0.02) * 0.25 + 0.3 * Math.sin(t * 0.37 + 2);

// A short, friendly two note chirp made on the fly; no sound files needed.
let audio: AudioContext | null = null;
function chirp() {
  try {
    audio ??= new AudioContext();
    const now = audio.currentTime;
    [[620, 1100, 0], [900, 1350, 0.13]].forEach(([from, to, at]) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(from, now + at);
      osc.frequency.exponentialRampToValueAtTime(to, now + at + 0.09);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.16);
      osc.connect(gain).connect(audio!.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.18);
    });
  } catch (error) {
    console.warn('The bee could not make a sound in this browser', error);
  }
}

/** Start the garden. Returns false if this browser cannot draw it. */
export function startBeeGarden(host: HTMLElement, canvas: HTMLCanvasElement, helloButton: HTMLButtonElement | null): boolean {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) return false;
  let program: WebGLProgram;
  try {
    program = buildProgram(gl, VERTEX, FRAGMENT);
  } catch (error) {
    console.warn('Bee garden could not start', error);
    return false;
  }
  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // normal blending, so nearer layers sit on top

  const u = (name: string) => gl.getUniformLocation(program, name);
  const loc = {
    res: u('uRes'), t: u('uT'), dpr: u('uDpr'), flowers: u('uFlowers'), flowerN: u('uFlowerN'), bee: u('uBee'),
    collect: u('uCollect'), tap: u('uTapAge'), facing: u('uFacing'), flap: u('uFlap'),
  };
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  let width = 0, height = 0, total = 0, flowers: Flower[] = [];

  const setup = () => {
    width = host.clientWidth; height = host.clientHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const particles = buildParticles(width < 700);
    total = particles.total;
    uploadAttribute(gl, program, 'aData', particles.data, 4);
    uploadAttribute(gl, program, 'aRnd', particles.rnd, 4);
    flowers = layoutFlowers(width, height);
    const packed = new Float32Array(MAX_FLOWERS * 4);
    flowers.forEach((f, i) => packed.set([f.x, f.height, f.radius, f.petals], i * 4));
    gl.uniform4fv(loc.flowers, packed);
    gl.uniform1f(loc.flowerN, flowers.length);
  };
  setup();

  // The bee's simple life: fly to a flower, drink from its centre, choose another.
  const bee = { x: width * 0.15, y: height * 0.75, vx: 0, vy: 0, facing: 1, target: 0, mode: 'fly', timer: 0, tapAge: 9, collect: 0 };
  const headOf = (i: number, t: number) => {
    const f = flowers[i], w = wind(f.x, t);
    return { x: f.x + w * 14, y: f.height - Math.abs(w) * 3 + 6 };
  };
  const pickFlower = () => {
    let next = Math.floor(Math.random() * flowers.length);
    if (next === bee.target) next = (next + 1) % flowers.length;
    bee.target = next;
  };
  pickFlower();

  const step = (t: number, dt: number) => {
    bee.tapAge += dt;
    if (bee.mode === 'stunned') {
      bee.timer -= dt;
      bee.vx *= 0.85; bee.vy *= 0.85;
      if (bee.timer <= 0) bee.mode = 'fly';
    } else if (bee.mode === 'sip') {
      const head = headOf(bee.target, t);
      bee.x += (head.x - bee.x) * 0.25; bee.y += (head.y - bee.y) * 0.25;
      bee.timer -= dt;
      if (bee.timer <= 0) { bee.mode = 'fly'; pickFlower(); bee.vy = 40; }
    } else {
      const head = headOf(bee.target, t);
      const dx = head.x - bee.x, dy = head.y + 26 - bee.y, dist = Math.hypot(dx, dy) || 1;
      const speed = Math.min(110, 35 + dist * 0.5);
      bee.vx += ((dx / dist) * speed - bee.vx) * 0.05;
      bee.vy += ((dy / dist) * speed - bee.vy) * 0.05 + Math.sin(t * 3.1) * 1.4; // a lazy wobble, arcing above the meadow
      if (dist < 28) { bee.mode = 'sip'; bee.timer = 2 + Math.random() * 1.6; }
    }
    if (bee.mode !== 'sip') { bee.x += bee.vx * dt; bee.y += bee.vy * dt; }
    bee.y = Math.max(30, Math.min(height - 30, bee.y));
    if (Math.abs(bee.vx) > 4) bee.facing += ((bee.vx > 0 ? 1 : -1) - bee.facing) * 0.15;
    bee.collect += ((bee.mode === 'sip' ? 1 : 0) - bee.collect) * 0.08;
  };

  const draw = (t: number) => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(loc.res, width, height);
    gl.uniform1f(loc.t, t);
    gl.uniform1f(loc.dpr, dpr);
    gl.uniform3f(loc.bee, bee.x, bee.y, bee.target);
    gl.uniform1f(loc.collect, bee.collect);
    gl.uniform1f(loc.tap, bee.tapAge);
    gl.uniform1f(loc.facing, bee.facing);
    const flapSpeed = bee.mode === 'stunned' ? 12 : 48;
    gl.uniform1f(loc.flap, 0.35 + 0.65 * Math.abs(Math.sin(t * flapSpeed)));
    gl.drawArrays(gl.POINTS, 0, total);
  };

  const reduced = prefersReducedMotion();
  let time = reduced ? STILL_TIME : 0;
  const restAtFlower = () => {
    const head = headOf(bee.target, time);
    bee.x = head.x; bee.y = head.y; bee.mode = 'sip'; bee.collect = 1;
  };
  const sayHello = () => {
    chirp();
    bee.mode = 'stunned'; bee.timer = 1.3; bee.tapAge = 0;
    if (reduced) { bee.tapAge = 0.4; draw(time); } // a still frame with hearts
  };
  const nearBee = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    return Math.hypot(event.clientX - box.left - bee.x, box.bottom - event.clientY - bee.y) < 48;
  };
  canvas.addEventListener('pointerdown', (event) => { if (nearBee(event)) sayHello(); });
  canvas.addEventListener('pointermove', (event) => { canvas.style.cursor = nearBee(event) ? 'pointer' : ''; });
  helloButton?.addEventListener('click', sayHello);

  new ResizeObserver(() => {
    if (Math.abs(host.clientWidth - width) < 2 && Math.abs(host.clientHeight - height) < 2) return;
    setup();
    if (bee.target >= flowers.length) pickFlower();
    bee.x = Math.min(bee.x, width - 20);
    if (reduced) { restAtFlower(); draw(time); }
  }).observe(host);

  if (reduced) {
    restAtFlower();
    draw(time);
    return true;
  }
  const stop = animateWhileVisible(host, (dt) => {
    time += dt;
    step(time, dt);
    draw(time);
  });
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); stop(); console.warn('Bee garden lost its graphics context and stopped'); });
  return true;
}
