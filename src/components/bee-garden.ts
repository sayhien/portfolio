// A small garden in the footer, drawn only with particles: grass, flowers
// and a bee that flies from flower to flower collecting nectar. Tapping the
// bee (or the "Say hello" button) makes it stop, chirp and float up hearts,
// then carry on. Light by design: a few thousand points, one draw call.
import { prefersReducedMotion } from './motion';
import { animateWhileVisible, buildProgram, uploadAttribute } from './webgl-helpers';

const MAX_DPR = 1.5;
const MAX_FLOWERS = 12;
const BLADE_POINTS = 16;
const KIND = { grass: 0, flower: 1, bee: 2, nectar: 3, heart: 4 } as const;

const VERTEX = `
precision highp float;
attribute vec4 aData; // kind, index, sub index, random
attribute vec4 aRnd;
uniform vec2 uRes;
uniform float uT, uDpr, uFlowerN, uCollect, uTapAge, uFacing, uFlap;
uniform vec3 uBee;
uniform vec4 uFlowers[${MAX_FLOWERS}]; // x, head height, colour, size
varying vec3 vCol;
varying float vA;
const float PI = 3.14159265;
const float BEE = 1.5; // bee drawing scale
const vec3 DEEP = vec3(.10,.42,.34), MINT = vec3(.43,.91,.72), GOLD = vec3(.99,.78,.25);
float sway(float x, float t){ return sin(t*.9 + x*.012)*6. + sin(t*2.1 + x*.05)*2.; }
// Blades lean away when the bee flies low past them
float push(float x, float h){
  float dx = x - uBee.x;
  float near = max(0., 1. - abs(dx)/70.) * step(uBee.y, h + 50.);
  return sign(dx)*near*14.;
}
vec3 petalColour(float c){
  if(c < .5) return vec3(.98,.66,.83);
  if(c < 1.5) return vec3(.78,.71,1.);
  if(c < 2.5) return vec3(.99,.9,.54);
  return vec3(.95,.96,.97);
}
vec2 flowerHead(vec4 f, float t){ return vec2(f.x + sway(f.x, t) + push(f.x, f.y), f.y); }
vec2 heart(float a){ float s = sin(a); return vec2(16.*s*s*s, 13.*cos(a) - 5.*cos(2.*a) - 2.*cos(3.*a) - cos(4.*a))/16.; }

vec2 place(out vec3 col, out float a, out float size){
  float kind = aData.x, i = aData.y, j = aData.z, r = aData.w;
  size = 2.2; a = 1.;
  if(kind < .5){ // grass blade
    float x = aRnd.x*uRes.x;
    float h = (24. + aRnd.y*aRnd.y*70.)*min(1., uRes.y/240.);
    float u = j/${BLADE_POINTS - 1}.;
    float bend = (sway(x, uT) + push(x, h) + (aRnd.z - .5)*18.)*u*u;
    col = mix(DEEP*.8, MINT*.95, u*.75 + aRnd.w*.25);
    a = .45 + .5*u;
    return vec2(x + bend, 6. + u*h);
  }
  if(i >= uFlowerN){ col = vec3(0.); a = 0.; return vec2(-100.); } // unused flower slot
  vec4 f = uFlowers[int(i)];
  vec2 head = flowerHead(f, uT);
  if(kind < 1.5){ // flower: stem, petals and centre
    if(j < 18.){
      float u = j/17.;
      col = DEEP*1.1; a = .7;
      return vec2(f.x + (head.x - f.x)*u*u, 6. + (f.y - 6.)*u);
    }
    float glow = uCollect*step(abs(i - uBee.z), .1);
    float s = f.w;
    if(r < .3){ // centre
      vec2 d = vec2(cos(aRnd.x*6.2831), sin(aRnd.x*6.2831))*sqrt(aRnd.y)*s*.32;
      col = mix(GOLD, vec3(1.,.6,.2), aRnd.z)*(1. + glow*.5); a = 1.;
      return head + d;
    }
    float petals = 5. + floor(aRnd.w*2.);
    float k = floor(aRnd.x*petals);
    float ang = (k + .5)/petals*6.2831 + uT*.05 + i;
    float along = sqrt(aRnd.y);
    float spread = (aRnd.z - .5)*.9*(1. - along*.6);
    vec2 dir = vec2(cos(ang + spread), sin(ang + spread));
    col = mix(petalColour(f.z), vec3(1.), .25*(1. - along))*(1. + glow*.4); a = .9;
    return head + dir*(s*.3 + along*s*.75);
  }
  if(kind < 2.5){ // the bee
    float bob = sin(uT*6.)*1.5;
    vec2 c = uBee.xy + vec2(0., bob);
    size = 2.6;
    if(r < .62){ // striped body
      vec2 q = vec2(cos(aRnd.x*6.2831), sin(aRnd.x*6.2831))*sqrt(aRnd.y);
      vec2 p = q*vec2(11., 8.);
      float band = step(.5, fract((p.x + 11.)/6.5));
      col = mix(GOLD, vec3(.16,.12,.07), band*step(-7., p.x)); a = 1.;
      return c + BEE*(vec2(p.x*uFacing, p.y));
    }
    if(r < .74){ // head with an eye
      vec2 q = vec2(cos(aRnd.x*6.2831), sin(aRnd.x*6.2831))*sqrt(aRnd.y)*5.5;
      float eye = step(length(q - vec2(1.8, 1.2)), 1.6);
      col = mix(vec3(.2,.17,.12), vec3(1.), eye); a = 1.;
      return c + BEE*(vec2((12. + q.x)*uFacing, q.y + 1.));
    }
    if(r < .78){ // antennae
      float u = aRnd.x; float side = step(.5, aRnd.y)*2. - 1.;
      col = vec3(.25,.2,.14); a = 1.; size = 1.6;
      return c + BEE*(vec2((14. + u*5. + side*u*2.)*uFacing, 5. + u*7.));
    }
    // wings, flapping
    float side = step(.5, aRnd.z);
    vec2 q = vec2(cos(aRnd.x*6.2831), sin(aRnd.x*6.2831))*sqrt(aRnd.y);
    vec2 p = q*vec2(6., 9.)*vec2(1., uFlap);
    col = vec3(.88,.95,1.); a = .45;
    return c + BEE*(vec2((p.x - 3. + side*6.)*uFacing, p.y + 9.));
  }
  if(kind < 3.5){ // nectar drifting up from the flower to the bee
    vec2 from = flowerHead(uFlowers[int(uBee.z)], uT);
    float u = fract(aRnd.x + uT*.7);
    vec2 p = mix(from, uBee.xy, u) + vec2(sin(u*9. + aRnd.y*6.), cos(u*7. + aRnd.z*6.))*4.*(1. - u);
    col = GOLD; a = uCollect*(1. - u)*.9; size = 2.;
    return p;
  }
  // hearts that float up after a tap
  float k = floor(aRnd.x*3.);
  vec2 start = uBee.xy + vec2((k - 1.)*16., 14.);
  float age = uTapAge;
  vec2 p = start + vec2(sin(age*4. + k)*6., age*60.) + heart(aRnd.y*6.2831)*(7. + k*2.);
  col = vec3(.98,.55,.72); a = (age < 1.4 ? 1. : 0.)*(1. - age/1.4); size = 2.2;
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

type Flower = { x: number; height: number; colour: number; size: number };

// Particle groups: [kind, how many groups, points per group]
function buildParticles(width: number) {
  const blades = Math.round(Math.min(340, Math.max(110, width / 4)));
  const groups: [number, number, number][] = [
    [KIND.grass, blades, BLADE_POINTS],
    [KIND.flower, MAX_FLOWERS, 170],
    [KIND.bee, 1, 700],
    [KIND.nectar, 1, 60],
    [KIND.heart, 1, 90],
  ];
  const total = groups.reduce((sum, [, n, per]) => sum + n * per, 0);
  const data = new Float32Array(total * 4);
  const rnd = new Float32Array(total * 4);
  let p = 0;
  for (const [kind, count, per] of groups) {
    for (let i = 0; i < count; i++) {
      const blade = [Math.random(), Math.random(), Math.random(), Math.random()];
      for (let j = 0; j < per; j++, p++) {
        data.set([kind, i, j, Math.random()], p * 4);
        // grass keeps one set of randoms per blade so its points line up
        rnd.set(kind === KIND.grass ? blade : [Math.random(), Math.random(), Math.random(), Math.random()], p * 4);
      }
    }
  }
  return { data, rnd, total };
}

function layoutFlowers(width: number, height: number): Flower[] {
  const count = Math.max(4, Math.min(MAX_FLOWERS, Math.round(width / 120)));
  const gap = width / count;
  return Array.from({ length: count }, (_, i) => ({
    x: gap * (i + 0.5) + (Math.random() - 0.5) * gap * 0.5,
    height: (60 + Math.random() * 70) * Math.min(1, height / 240),
    colour: i % 4,
    size: 14 + Math.random() * 6,
  }));
}

const sway = (x: number, t: number) => Math.sin(t * 0.9 + x * 0.012) * 6 + Math.sin(t * 2.1 + x * 0.05) * 2;

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
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // normal blending, so the bee's dark stripes show

  const u = (name: string) => gl.getUniformLocation(program, name);
  const loc = {
    res: u('uRes'), t: u('uT'), dpr: u('uDpr'), flowers: u('uFlowers'), bee: u('uBee'),
    flowerN: u('uFlowerN'), collect: u('uCollect'), tap: u('uTapAge'), facing: u('uFacing'), flap: u('uFlap'),
  };
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  let width = 0, height = 0, total = 0, flowers: Flower[] = [];

  const setup = () => {
    width = host.clientWidth; height = host.clientHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const particles = buildParticles(width);
    total = particles.total;
    uploadAttribute(gl, program, 'aData', particles.data, 4);
    uploadAttribute(gl, program, 'aRnd', particles.rnd, 4);
    flowers = layoutFlowers(width, height);
    const packed = new Float32Array(MAX_FLOWERS * 4);
    flowers.forEach((f, i) => packed.set([f.x, f.height, f.colour, f.size], i * 4));
    gl.uniform4fv(loc.flowers, packed);
    gl.uniform1f(loc.flowerN, flowers.length);
  };
  setup();

  // The bee's simple life: fly to a flower, sip nectar, choose another.
  const bee = { x: width * 0.2, y: height * 0.7, vx: 0, vy: 0, facing: 1, target: 0, mode: 'fly', timer: 0, tapAge: 9, collect: 0 };
  const headOf = (i: number, t: number) => ({ x: flowers[i].x + sway(flowers[i].x, t), y: flowers[i].height + 16 });
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
      bee.x += (head.x - bee.x) * 0.2; bee.y += (head.y - bee.y) * 0.2;
      bee.timer -= dt;
      if (bee.timer <= 0) { bee.mode = 'fly'; pickFlower(); }
    } else {
      const head = headOf(bee.target, t);
      const dx = head.x - bee.x, dy = head.y + 18 - bee.y, dist = Math.hypot(dx, dy) || 1;
      const speed = Math.min(90, 30 + dist * 0.6);
      bee.vx += ((dx / dist) * speed - bee.vx) * 0.05;
      bee.vy += ((dy / dist) * speed - bee.vy) * 0.05 + Math.sin(t * 3.1) * 1.2; // a lazy wobble
      if (dist < 22) { bee.mode = 'sip'; bee.timer = 1.6 + Math.random() * 1.4; }
    }
    if (bee.mode !== 'sip') { bee.x += bee.vx * dt; bee.y += bee.vy * dt; }
    bee.y = Math.max(30, Math.min(height - 24, bee.y));
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

  let time = 0;
  const reduced = prefersReducedMotion();
  const sayHello = () => {
    chirp();
    bee.mode = 'stunned'; bee.timer = 1.3; bee.tapAge = 0;
    if (reduced) { bee.tapAge = 0.4; draw(time); } // a still frame with hearts
  };
  canvas.addEventListener('pointerdown', (event) => {
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left, y = box.bottom - event.clientY;
    if (Math.hypot(x - bee.x, y - bee.y) < 48) sayHello();
  });
  canvas.addEventListener('pointermove', (event) => {
    const box = canvas.getBoundingClientRect();
    const near = Math.hypot(event.clientX - box.left - bee.x, box.bottom - event.clientY - bee.y) < 48;
    canvas.style.cursor = near ? 'pointer' : '';
  });
  helloButton?.addEventListener('click', sayHello);

  new ResizeObserver(() => {
    if (Math.abs(host.clientWidth - width) < 2 && Math.abs(host.clientHeight - height) < 2) return;
    setup();
    bee.x = Math.min(bee.x, width - 20);
    if (bee.target >= flowers.length) pickFlower();
    if (reduced) draw(time);
  }).observe(host);

  if (reduced) {
    // Still picture: the bee resting at a flower
    const head = headOf(bee.target, 0);
    bee.x = head.x; bee.y = head.y; bee.mode = 'sip'; bee.collect = 1;
    draw(0);
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
