// The rocket film's story and its shaders. The story runs in seconds: five
// small rockets are already climbing when it starts, a large one rushes past
// the camera, its first stage breaks away and tumbles straight down onto the
// lens. Every position is worked out in the vertex shader from random seeds,
// so the browser does almost no work per frame. rocket.ts plays it.
import { add, ease, length, mix, norm, scale, sub } from './camera-math';
import type { Vec3 } from './camera-math';

// Times are story seconds; the film plays them SPEED times faster.
export const SPEED = 1.15;
export const SMALL_START = [-3.2, -2.3, -1.4, -0.6, 0.4];
export const SMALL_SIZE = [0.55, 1.35, 0.8, 1.7, 1.0];
const SMALL_FLIGHT = 8;
const BIG_T0 = 3.2, BIG_DUR = 8, BIG_NEAR = 230, BIG_FAR = 560;
const SEPARATE_AT = 8.8, DROP_S = 2.3;
export const HIT = SEPARATE_AT + DROP_S;
export const END = HIT + 0.05;
export const LOOP = END + 1.6;
/** The moment shown when the visitor prefers reduced motion: the big rocket close by. */
export const STILL_TIME = BIG_T0 + 2.6;

const EARTH_R = 6000;
const EYE: Vec3 = [0, 900, 1650];
const BIG_FROM: Vec3 = [52, 640, 1560];
const BIG_DIR = norm([-0.04, 1, 0.12]);
const STAGE_CENTRE = 130 * 0.27;
const onSphere = (x: number, z: number): Vec3 => [x, Math.sqrt(EARTH_R * EARTH_R - x * x - z * z) - EARTH_R, z];
export const PADS: Vec3[] = [onSphere(-1200, -1500), onSphere(-500, -900), onSphere(150, -2000), onSphere(800, -1100), onSphere(1400, -2200)];
export const TURNS: Vec3[] = ([[-0.6, 0, 0.8], [-0.2, 0, 1], [0.1, 0, 1], [0.5, 0, 0.9], [0.8, 0, 0.6]] as Vec3[]).map(norm);

const between = (value: number, from: number, to: number) => Math.min(1, Math.max(0, (value - from) / (to - from)));

/** How far along its path the big rocket is: it rises into view, then pulls away faster and faster. */
function bigTravel(t: number) {
  const progress = between(t, BIG_T0, BIG_T0 + BIG_DUR), away = Math.max(0, (progress - 0.45) / 0.55);
  return BIG_NEAR * ease(progress / 0.45) + BIG_FAR * away * away;
}
const bigBase = (t: number): Vec3 => add(BIG_FROM, scale(BIG_DIR, bigTravel(t)));

/** Where the broken-away first stage ends up: right on the camera. */
export const hitPoint = (): Vec3 => sub(EYE, scale(BIG_DIR, STAGE_CENTRE));

function dropBase(t: number): Vec3 {
  const since = Math.max(0, t - SEPARATE_AT), progress = Math.min(1, since / DROP_S);
  const coast = add(bigBase(SEPARATE_AT), scale(BIG_DIR, 30 * Math.sin(progress * Math.PI)));
  return mix(coast, hitPoint(), Math.pow(progress, 2.2));
}

export type RocketCamera = { eye: Vec3; target: Vec3; roll: number; fov: number };

/** The camera watches the small rockets, follows the big one, then stays on the falling stage. It shakes when the rocket is close. */
export function cameraAt(t: number): RocketCamera {
  const big = bigBase(t);
  const watchSmall: Vec3 = [0, 520 + 300 * ease(between(t, 0, 3)), -900];
  const follow = ease(between(t, BIG_T0 + 0.2, BIG_T0 + 1.8));
  let target = mix(mix(watchSmall, add(big, scale(BIG_DIR, 40)), follow), big, ease(between(t, BIG_T0 + 2, BIG_T0 + 4.5)));
  const stage = add(dropBase(t), scale(BIG_DIR, STAGE_CENTRE));
  target = mix(target, stage, ease(between(t, SEPARATE_AT, SEPARATE_AT + 0.6)));
  // Shake grows as the rocket passes, jolts at separation and builds as the stage comes down.
  const nearness = Math.max(0, 1 - Math.max(0, length(sub(big, EYE)) - 60) / 260);
  const since = t - SEPARATE_AT, jolt = since > 0 ? Math.exp(-since * 3) : 0;
  const incoming = since > 0 ? Math.pow(Math.min(1, since / DROP_S), 3) : 0;
  const amount = 2.4 * nearness * nearness + 1.6 * jolt + 3.5 * incoming;
  const shake = [Math.sin(t * 47) + Math.sin(t * 71) * 0.5, Math.sin(t * 53 + 1) + Math.sin(t * 83) * 0.5, Math.sin(t * 61 + 2) * 0.6].map((v) => v * amount) as Vec3;
  return { eye: add(EYE, shake), target: add(target, scale(shake, 0.6)), roll: Math.sin(t * 37) * amount * 0.004, fov: 46 };
}

export const ROCKET_VERTEX = `
precision highp float;
attribute vec4 aSeed;
uniform mat4 uProj, uView; uniform vec3 uEye;
uniform float uT, uDpr, uSizeRef;
uniform vec3 uPad[5], uTurn[5]; uniform float uSmallStart[5], uSmallSize[5];
varying vec3 vCol; varying float vA;
const float PI = 3.14159265, TAU = 6.2831853;
const vec3 MINT = vec3(.43,.91,.72), BLUE = vec3(.49,.71,1.), WHITE = vec3(.94,.95,.96), DEEP = vec3(.16,.59,.5), GREY = vec3(.55,.6,.66);
const vec3 YELLOW = vec3(1.,.85,.45), ORANGE = vec3(1.,.5,.2), CREAM = vec3(.96,.94,.88), INK = vec3(.08,.09,.11);
const vec3 SUN = vec3(-.6,.5,.62), EARTH_C = vec3(0.,-6000.,0.);
const float EARTH_R = 6000.;
const float BIG_T0 = ${BIG_T0.toFixed(2)}, BIG_DUR = ${BIG_DUR.toFixed(2)}, SEPARATE_AT = ${SEPARATE_AT.toFixed(2)}, DROP_S = ${DROP_S.toFixed(2)}, SMALL_FLIGHT = ${SMALL_FLIGHT.toFixed(2)};
uniform vec3 uHit;
const vec3 BIG_FROM = vec3(${BIG_FROM.join(',')}), BIG_DIR = vec3(${BIG_DIR.map((v) => v.toFixed(5)).join(',')});
const float BIG_NEAR = ${BIG_NEAR.toFixed(2)}, BIG_FAR = ${BIG_FAR.toFixed(2)}, BIG_H = 130., BIG_R = 7.;
float gSize;
float h1(float n){ return fract(sin(n*12.9898+4.1414)*43758.5453); }
vec4 rnd(vec4 s, float k){ return vec4(h1(s.x*91.7+k), h1(s.y*57.3+k*1.7), h1(s.z*33.1+k*2.3), h1(s.w*77.9+k*3.1)); }
vec3 sph(vec2 r){ float z = r.x*2. - 1.; float a = r.y*TAU; float q = sqrt(max(0., 1. - z*z)); return vec3(q*cos(a), z, q*sin(a)); }
float ease(float v){ float x = clamp(v, 0., 1.); return x*x*(3. - 2.*x); }
void frame(vec3 axis, out vec3 side, out vec3 up){ side = normalize(cross(axis, abs(axis.y) > .9 ? vec3(1.,0.,0.) : vec3(0.,1.,0.))); up = cross(axis, side); }
vec3 rotAbout(vec3 v, vec3 k, float a){ return v*cos(a) + cross(k, v)*sin(a) + k*dot(k, v)*(1. - cos(a)); }

// ---------------------------------------------------------------- the big rocket's path
float bigTravel(float t){ float g = clamp((t - BIG_T0)/BIG_DUR, 0., 1.), away = max(0., (g - .45)/.55); return BIG_NEAR*ease(g/.45) + BIG_FAR*away*away; }
vec3 bigBase(float t){ return BIG_FROM + BIG_DIR*bigTravel(t); }

// ---------------------------------------------------------------- one rocket
// The outline from the engine skirt (0) to the nose (1): a wide first stage, a tapered
// interstage, a slimmer upper stage, then the payload fairing.
float profile(float v){
  if(v < .02) return .92;
  if(v < .55) return 1.;
  if(v < .6) return mix(1., .8, (v - .55)/.05);
  if(v < .83) return .8;
  float k = (v - .83)/.17; return .84*pow(max(0., 1. - pow(k, 1.8)), .6);
}
// A point on a rocket and the stage it belongs to (0 first stage and boosters, 1 upper stage).
vec3 rocketPoint(vec4 r, float H, float R, float boosters, out vec3 n, out vec3 col, out float stage){
  float part = r.x; stage = 0.;
  if(part < .72){ // the body of revolution, with its markings
    float v = r.y, ang = r.z*TAU; vec3 dir = vec3(cos(ang), 0., sin(ang));
    vec3 p = vec3(0., v*H, 0.) + dir*R*profile(v); n = normalize(dir + vec3(0., v > .83 ? .7 : (v > .55 && v < .6 ? .35 : 0.), 0.));
    col = WHITE;
    float quarter = step(.5, fract(ang/TAU*4.));
    if(v > .44 && v < .5) col = mix(WHITE, INK, quarter); // the black and white roll pattern
    if(abs(v - .55) < .006 || abs(v - .83) < .005 || abs(v - .3) < .004) col = GREY*.45; // seams between sections
    if(v > .7 && v < .735) col = MINT; // the mint stripe on the upper stage
    if(v > .06 && v < .54 && abs(sin(ang*2. - .6)) < .05) col = GREY*.8; // raceways down the side
    stage = v > .565 ? 1. : 0.;
    return p;
  }
  if(part < .84){ // fins
    float k = floor(r.w*4.); float ang = k/4.*TAU + .785; vec3 dir = vec3(cos(ang), 0., sin(ang));
    float v = r.y*.14, out_ = r.z*(1. - v/.14)*R*.9;
    n = vec3(cos(ang + 1.57), 0., sin(ang + 1.57)); col = GREY*1.1;
    return vec3(0., (v + .015)*H, 0.) + dir*(R + out_);
  }
  if(part < .84 + .1*boosters){ // two side boosters with pointed noses
    float side = step(.5, r.w)*2. - 1.; float v = r.y, ang = r.z*TAU; vec3 dir = vec3(cos(ang), 0., sin(ang));
    float rad = R*.42*(v < .82 ? 1. : pow(max(0., 1. - pow((v - .82)/.18, 1.6)), .6));
    n = normalize(dir); col = v > .4 && v < .46 ? INK : WHITE;
    return vec3(side*R*1.45, v*H*.5, 0.) + dir*rad;
  }
  // engine bells: one in the middle, four round it, each flaring out
  float k = floor(r.w*5.); vec3 off = k < .5 ? vec3(0.) : vec3(cos(k*1.571), 0., sin(k*1.571))*R*.55;
  float v = r.y, a2 = r.z*TAU; vec3 dir = vec3(cos(a2), 0., sin(a2));
  n = dir; col = GREY*.5;
  return off + vec3(0., -v*H*.06, 0.) + dir*R*(.16 + .14*v*v);
}

// Place a rocket point in the world: base, axis, and an extra tumble for a falling stage.
vec3 place(vec3 local, vec3 base, vec3 axis){
  vec3 side, up; frame(axis, side, up);
  return base + side*local.x + axis*local.y + up*local.z;
}
vec3 shadeRocket(vec3 col, vec3 n, vec3 p, out float a){
  float sun = max(0., dot(n, normalize(SUN)));
  float facing = dot(n, normalize(uEye - p));
  a = (.38 + .3*sun)*mix(.05, 1., smoothstep(-.1, .3, facing));
  return col*(.28 + .85*sun) + BLUE*.15*max(0., -n.y) + WHITE*.25*pow(1. - abs(facing), 3.);
}
// The flame: a bright core with shock diamonds, widening and cooling away from the nozzle.
vec3 plume(vec4 r, vec3 base, vec3 axis, float R, float L, float power, float t, out vec3 col, out float a){
  vec3 side, up; frame(axis, side, up);
  float u = pow(r.y, 1.7), ang = r.z*TAU, core = 1. - smoothstep(0., .6, r.w);
  float spread = R*(.4 + u*2.6)*sqrt(r.w);
  vec3 p = base - axis*(R*.5 + u*L) + (side*cos(ang) + up*sin(ang))*spread;
  float flicker = .78 + .22*sin(t*29. + r.x*50.);
  float diamond = pow(.5 + .5*cos(u*L/(R*1.2)*PI), 10.)*(1. - u)*core;
  col = mix(mix(WHITE, YELLOW, smoothstep(0., .22, u)), ORANGE, smoothstep(.22, .8, u));
  col = mix(col, BLUE, (1. - core)*.3*(1. - u));
  a = power*flicker*(1. - u)*(.3 + .45*core + 1.2*diamond);
  gSize = 1.2 + 1.4*core*(1. - u);
  return p;
}

// ---------------------------------------------------------------- small rockets
vec3 smallPath(int i, float f){
  vec3 pad = i == 0 ? uPad[0] : i == 1 ? uPad[1] : i == 2 ? uPad[2] : i == 3 ? uPad[3] : uPad[4];
  vec3 turn = i == 0 ? uTurn[0] : i == 1 ? uTurn[1] : i == 2 ? uTurn[2] : i == 3 ? uTurn[3] : uTurn[4];
  return pad + normalize(pad - EARTH_C)*2300.*f*f + turn*900.*f*f*f;
}
float smallValue(int i, float a0, float a1, float a2, float a3, float a4){ return i == 0 ? a0 : i == 1 ? a1 : i == 2 ? a2 : i == 3 ? a3 : a4; }

vec3 scene(vec4 s, out vec3 col, out float a){
  vec4 r = rnd(s, 5.), q = rnd(s, 11.);
  float t = uT;
  if(s.x < .03){ col = WHITE; a = .12 + .45*r.w*r.w; return uEye + sph(r.yz)*9000.; } // stars
  if(s.x < .25){ // Earth, crowded on the side facing the camera
    // the dots crowd round the launch area the camera looks at, and thin out towards the horizon
    vec3 toEye = normalize(uEye - EARTH_C), centre = normalize(vec3(0., EARTH_R, -1300.)), side = normalize(cross(centre, vec3(1.,0.,0.))), up2 = cross(side, centre);
    float cr = .42*sqrt(r.y)*(.35 + .65*r.w), ca = r.z*TAU;
    vec3 n = r.x < .12 ? sph(r.yz) : normalize(centre*cos(cr) + (side*cos(ca) + up2*sin(ca))*sin(cr));
    vec3 p = EARTH_C + n*EARTH_R;
    float land = step(.5, .5 + .5*sin(n.x*9. + sin(n.z*7.)*2.)*sin(n.z*8. + n.y*5.));
    float cloud = step(.72, .5 + .5*sin(n.x*23. + n.z*17. + sin(n.y*13.)*3. + t*.05));
    col = mix(mix(BLUE*.35, DEEP*.7, .4), MINT*.85, land); col = mix(col, WHITE, cloud*.7);
    float rim = 1. - abs(dot(n, normalize(uEye - p)));
    col = mix(col, BLUE, pow(rim, 3.)*.8);
    a = 1.6*(.25 + .35*land + .45*cloud + .6*pow(rim, 4.))*step(0., dot(n, toEye) - EARTH_R/length(uEye - EARTH_C) + .02);
    return p;
  }
  if(s.x < .37){ // five small rockets of different sizes, each with a flame and a smoke trail
    int i = int(floor(r.x*5.));
    float f = clamp((t - smallValue(i, uSmallStart[0], uSmallStart[1], uSmallStart[2], uSmallStart[3], uSmallStart[4]))/SMALL_FLIGHT, 0., 1.4);
    float size = smallValue(i, uSmallSize[0], uSmallSize[1], uSmallSize[2], uSmallSize[3], uSmallSize[4]);
    float H = 52.*size, R = 3.6*size;
    vec3 base = smallPath(i, f), axis = normalize(smallPath(i, f + .01) - base + normalize(base - EARTH_C)*.001);
    float lit = step(.001, f);
    if(s.x < .29){ vec3 n; float stage; vec3 local = rocketPoint(vec4(q.x, r.y, r.z, r.w), H, R, 0., n, col, stage);
      vec3 p = place(local, base, axis); vec3 side, up; frame(axis, side, up); n = side*n.x + axis*n.y + up*n.z;
      col = shadeRocket(col, n, p, a); a *= 1.4; return p; }
    if(s.x < .32){ vec3 p = plume(q, base, axis, R, H*1.5, lit, t, col, a); a *= 2.2; gSize *= 1.5; return p; }
    float age = r.y; vec3 at = smallPath(i, max(0., f - age*.45));
    vec3 p = at + sph(q.zw)*R*4.*(.3 + age*1.6)*sqrt(q.y);
    col = mix(CREAM, GREY, age); a = .35*(1. - age)*(1. - age)*lit*step(age*.45, f);
    return p;
  }
  // ---- the big rocket
  float on = step(BIG_T0, t);
  vec3 base = bigBase(t), axis = BIG_DIR;
  float separated = step(SEPARATE_AT, t);
  float since = max(0., t - SEPARATE_AT);
  // Where the first stage is once it has broken away: it slows, drifts back and tumbles.
  vec3 sepBase = bigBase(SEPARATE_AT), sepVel = (bigBase(SEPARATE_AT + .05) - sepBase)/.05;
  float fall = clamp(since/DROP_S, 0., 1.);
  vec3 dropBase = mix(sepBase + axis*30.*sin(fall*PI), uHit, pow(fall, 2.2));
  vec3 tumbleAxis = normalize(cross(axis, vec3(0.,0.,1.)));
  if(s.x < .73){
    vec3 n; float stage; vec3 local = rocketPoint(r, BIG_H, BIG_R, 1., n, col, stage);
    vec3 side, up; frame(axis, side, up);
    vec3 p;
    if(separated > .5 && stage < .5){
      vec3 c = vec3(0., BIG_H*.27, 0.); float ang = since*.55;
      vec3 l = rotAbout(local - c, vec3(1.,0.,0.), ang) + c, ln = rotAbout(n, vec3(1.,0.,0.), ang);
      p = place(l, dropBase, axis); n = side*ln.x + axis*ln.y + up*ln.z;
    } else { p = place(local, base, axis); n = side*n.x + axis*n.y + up*n.z; }
    col = shadeRocket(col, n, p, a); a *= on*1.3; gSize = 2.6;
    return p;
  }
  if(s.x < .93){ // the flames: the first stage's until it separates, then the upper stage's own
    if(separated > .5){
      if(r.x < .35){ vec3 p = plume(q, dropBase, axis, BIG_R, 70., max(0., 1. - since*2.5), t, col, a); gSize *= 1.6; return p; }
      vec3 upperBase = base + axis*BIG_H*.565;
      vec3 p = plume(q, upperBase, axis, BIG_R*.55, 55., ease((since - .6)/.5), t, col, a); gSize *= 1.6; return p;
    }
    vec3 p = plume(r, base, axis, BIG_R, 70., on*ease((t - BIG_T0)/.6), t, col, a); gSize *= 1.8; return p;
  }
  // ---- bits falling off: flakes of ice and insulation peel away and tumble behind
  float born = BIG_T0 + .8 + r.x*(SEPARATE_AT - BIG_T0 - .8);
  if(r.w < .4) born = SEPARATE_AT + r.x*.25; // a burst of pieces as the stages part
  float age = t - born;
  vec3 from = bigBase(born) + axis*(.08 + .5*r.y)*BIG_H;
  vec3 vel = (bigBase(born + .05) - bigBase(born))/.05*.8;
  vec3 out_ = normalize(sph(q.xy) + vec3(0., -.2, 0.));
  vec3 p = from + out_*BIG_R + vel*age + out_*(5. + q.z*18.)*age - axis*6.*age*age;
  float spin = .35 + .65*abs(sin(t*(6. + q.w*14.) + q.x*20.));
  col = q.y < .8 ? mix(WHITE, CREAM, q.z) : ORANGE;
  a = step(0., age)*(1. - smoothstep(1.4, 2.8, age))*spin*(q.y < .8 ? .9 : 1.)*step(r.z, .45);
  gSize = 1.6 + q.z*2.;
  return p;
}

void main(){
  gSize = 1.;
  vec3 col; float a;
  vec3 p = scene(aSeed, col, a);
  vec4 vp = uView*vec4(p, 1.);
  gl_Position = uProj*vp;
  float d = max(-vp.z, 1.);
  gl_PointSize = clamp(1.3*uDpr*(uSizeRef/d)*gSize, 1.1*uDpr, 6.*uDpr);
  vCol = col; vA = min(1., a*min(1., (1.3*uSizeRef/d)/1.1 + .35));
}`;
export const ROCKET_FRAGMENT = `
precision mediump float;
varying vec3 vCol; varying float vA;
void main(){ float r = length(gl_PointCoord - .5); if(r > .5) discard; float a = smoothstep(.5, .15, r)*vA; gl_FragColor = vec4(vCol*a, a); }`;
