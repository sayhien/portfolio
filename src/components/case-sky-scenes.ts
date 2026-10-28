// Shader code for the case study hero skies. Each scene places tens of
// thousands of glowing particles on the graphics card, the same approach as
// earth-scenes.ts and space-hero-scene.ts. The renderer and the moving
// cameras live in case-sky.ts.
import { SAUCER_GLSL } from './saucer-shader';
import { CAKE_GLSL } from './cake-shader';

export const HEADER = `
precision highp float;
attribute vec4 aSeed;
uniform mat4 uProj, uView;
uniform vec3 uEye;
uniform float uT, uDpr, uP, uAspect, uSizeRef, uFog, uNear, uGather, uLensR;
varying vec3 vCol; varying float vA; varying float vSz;
float gScreen; float gSize;
const float PI = 3.14159265, TAU = 6.2831853;
const vec3 MINT = vec3(.43,.91,.72), BLUE = vec3(.49,.71,1.), WHITE = vec3(.93,.94,.95), DEEP = vec3(.16,.59,.5), GREY = vec3(.6,.65,.72);
const vec3 YELLOW = vec3(1.,.79,.29), ORANGE = vec3(1.,.54,.24), CREAM = vec3(.96,.94,.88);
float h1(float n){ return fract(sin(n*12.9898+4.1414)*43758.5453); }
vec4 rnd(vec4 s, float k){ return vec4(h1(s.x*91.7+k), h1(s.y*57.3+k*1.7), h1(s.z*33.1+k*2.3), h1(s.w*77.9+k*3.1)); }
vec3 sph(vec2 r){ float z=r.x*2.-1.; float a=r.y*TAU; float q=sqrt(max(0.,1.-z*z)); return vec3(q*cos(a), z, q*sin(a)); }
vec3 ball(vec3 r){ return sph(r.xy)*pow(r.z, .3333); }
vec3 rotY(vec3 p,float a){ float c=cos(a), s=sin(a); return vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z); }
vec3 rotX(vec3 p,float a){ float c=cos(a), s=sin(a); return vec3(p.x, c*p.y-s*p.z, s*p.y+c*p.z); }
vec3 rotZ(vec3 p,float a){ float c=cos(a), s=sin(a); return vec3(c*p.x-s*p.y, s*p.x+c*p.y, p.z); }
float ease(float v){ float x=clamp(v,0.,1.); return x*x*(3.-2.*x); }
vec3 dust(vec4 r, float t){
  vec3 p = vec3((r.y-.5)*3200., (r.z-.5)*1800., (r.w-.5)*1800.-300.);
  p.x = mod(p.x + t*3. + 1600., 3200.) - 1600.;
  return p;
}
float hidden(vec3 p, vec3 C, float R){
  vec3 d = p - uEye; float L = length(d); d /= L;
  vec3 oc = uEye - C; float b = dot(oc, d); float c = dot(oc, oc) - R*R*.985;
  float disc = b*b - c;
  if(disc < 0.) return 0.;
  float th = -b - sqrt(disc);
  return (th > 0. && th < L - R*.01) ? 1. : 0.;
}
vec2 project(vec3 p){ vec4 c = uProj*uView*vec4(p, 1.); return c.xy/c.w; }
${SAUCER_GLSL}
`;

export const VERTEX_MAIN = `
void main(){
  gScreen = 0.; gSize = 1.;
  vec3 col; float a;
  vec3 p = scene(aSeed, uT, col, a);
  if(gScreen > .5){ gl_Position = vec4(p.xy, 0., 1.); gl_PointSize = 1.5*uDpr*gSize; vSz = gl_PointSize; vA = a; vCol = col; return; }
  if(uGather > 0.){
    vec3 start = sph(aSeed.zw)*(700. + aSeed.x*700.)*uGather;
    float e = ease((uT - aSeed.w*1.47)/2.13);
    p = mix(start, p, e); a *= mix(.25, 1., e);
  }
  vec4 vp = uView*vec4(p, 1.);
  gl_Position = uProj*vp;
  float d = max(-vp.z, uNear);
  float sz = 1.1*uDpr*(uSizeRef/d)*gSize;
  float minSz = 1.1*uDpr;
  gl_PointSize = clamp(sz, minSz, 4.5*uDpr);
  float fog = clamp(1.35 - d/uFog, .12, 1.);
  vA = min(1., a*1.5)*fog*min(1., sz/minSz);
  vCol = col;
  vSz = gl_PointSize;
}`;

export const FRAGMENT = `
precision mediump float;
varying vec3 vCol; varying float vA; varying float vSz;
void main(){
  float r = length(gl_PointCoord - .5);
  if(r > .5) discard;
  float a = mix(1., smoothstep(.5, .1, r), clamp((vSz - 2.5)/3., 0., 1.))*vA;
  gl_FragColor = vec4(vCol*a, a);
}`;

export const COMMON = `
float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float vnoise(vec3 p){
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  float a=mix(mix(hash3(i), hash3(i+vec3(1,0,0)), f.x), mix(hash3(i+vec3(0,1,0)), hash3(i+vec3(1,1,0)), f.x), f.y);
  float b=mix(mix(hash3(i+vec3(0,0,1)), hash3(i+vec3(1,0,1)), f.x), mix(hash3(i+vec3(0,1,1)), hash3(i+vec3(1,1,1)), f.x), f.y);
  return mix(a, b, f.z);
}
float fbm(vec3 p){ return .55*vnoise(p) + .3*vnoise(p*2.1) + .15*vnoise(p*4.3); }
const vec3 SUNDIR = vec3(-.5,.45,.74);
// A planet that turns about its own axis. kind 0: bands, 1: land and sea, 2: craters.
vec3 world(vec4 r, vec3 C, float R, float spin, float kind, vec3 tone, vec3 tone2, out vec3 col, out float a){
  vec3 n = sph(r.xy); vec3 local = rotY(n, -spin);
  float lit = .18 + .82*max(0., dot(n, normalize(SUNDIR)));
  float m;
  if(kind < .5) m = .5 + .5*sin(local.y*16. + sin(local.y*5.)*1.4);
  else if(kind < 1.5) m = smoothstep(.5, .55, fbm(local*2.4 + 3.));
  else m = 1. - .45*smoothstep(.55, .62, fbm(local*5. + 1.));
  vec3 p = C + n*R;
  col = mix(tone, tone2, m)*(.4 + .85*lit); a = (.3 + .7*lit)*(1. - .95*hidden(p, C, R)); return p;
}
`;

const CHATBOT = HEADER + COMMON + `
const vec3 PA = vec3(-400., 0., 0.), PB = vec3(400., 30., -40.);
const float CYCLE = 6.;
// The rings swell until they touch in the middle, then spring back.
float swell(float u){ float x = u < .5 ? u*2. : (1. - u)*2.; return 1. - (1. - x)*(1. - x); }
vec3 ringAt(vec3 C, float rad, float ang, float tilt){ return C + rotX(vec3(cos(ang)*rad, 0., sin(ang)*rad), tilt); }
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 5.), q = rnd(s, 9.);
  float u = fract(t/CYCLE), k = swell(u), touch = (u - .5)*CYCLE; // seconds since the rings last touched
  if(touch < 0.) touch += CYCLE;
  float b = step(.5, r.w); vec3 C = b < .5 ? PA : PB; float R = b < .5 ? 140. : 110.;
  if(s.x < .12){ col = WHITE; a = .3; return dust(r, t); }
  if(s.x < .36) return world(r, PA, 140., t*.25, 0., DEEP, MINT, col, a);
  if(s.x < .52) return world(r, PB, 110., -t*.3, 0., BLUE*.6, CREAM, col, a);
  if(s.x < .78){
    float outer = mix(R*2.1, 400., k);
    float x = mix(R*1.4, outer, r.y); float ang = r.z*TAU + t*(b < .5 ? .15 : -.2);
    vec3 p = ringAt(C, x, ang, b < .5 ? .35 : -.3);
    col = b < .5 ? mix(MINT, WHITE, .35*q.w) : mix(CREAM, YELLOW, .4*q.w);
    a = .55*(.55 + .45*sin(r.y*38.))*(1. - hidden(p, C, R)); return p;
  }
  if(s.x < .86){ // when they touch, a field escapes a little from each planet and fades
    vec3 p = C + sph(r.xy)*R*(1.06 + min(touch, 2.)*.22 + r.z*.05);
    col = b < .5 ? MINT : YELLOW; a = .4*exp(-touch*1.4)*(1. - .9*hidden(p, C, R)); return p;
  }
  // little worlds born from each planet at every touch, drifting out into orbit and fading after four meetings
  float m = floor(q.x*12.); float group = mod(m, 4.);
  float cycleNow = floor((t - CYCLE*.5)/CYCLE);
  float born = cycleNow - mod(cycleNow - group, 4.);
  float age = t - (born*CYCLE + CYCLE*.5) - .7; // born just after the field escapes
  float grow = ease(age/1.6), fade = 1. - smoothstep(CYCLE*3.2, CYCLE*4., age);
  float orbitR = R*(1.25 + .9*grow + h1(m*3.1 + b)*.9);
  float ang = h1(m*7.3 + b*5.)*TAU + age*(.5 + h1(m)*.4)*(b < .5 ? 1. : -1.);
  vec3 c = C + rotX(vec3(cos(ang)*orbitR, (h1(m*2.2 + b) - .5)*R*.9*grow, sin(ang)*orbitR), b < .5 ? .35 : -.3);
  float rr = (6. + h1(m*5.7 + b)*10.)*grow;
  vec3 n = sph(r.yz); vec3 p = c + n*rr;
  float lit = .3 + .7*max(0., dot(n, normalize(SUNDIR)));
  col = (b < .5 ? mix(MINT, WHITE, h1(m)) : mix(CREAM, YELLOW, h1(m)))*(.5 + .7*lit);
  a = (age < 0. || born < 0.) ? 0. : .9*fade*lit*(1. - .9*hidden(p, C, R)); return p;
}`;

const REMIT = HEADER + COMMON + `
const float GR = 520.;
vec3 placeAt(float k){ float lat = (h1(k*3.7) - .5)*2.2, lon = h1(k*9.1)*TAU; return vec3(cos(lat)*sin(lon), sin(lat), cos(lat)*cos(lon)); }
vec3 spinG(vec3 v, float t){ return rotX(rotY(v, t*.06), .32); }
vec3 route(float k, float v, float t){
  vec3 a = placeAt(k*2.), b = placeAt(k*2. + 1.);
  vec3 d = normalize(mix(a, b, v)); float lift = 1. + sin(PI*v)*(.22 + h1(k*5.)*.25);
  return spinG(d*GR*lift, t);
}
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 7.), q = rnd(s, 3.);
  if(s.x < .1){ col = WHITE; a = .3; return dust(r, t); }
  if(s.x < .62){
    vec3 n = sph(r.xy); vec3 local = rotY(rotX(n, -.32), -t*.06);
    float land = smoothstep(.5, .54, fbm(local*2.2 + 5.));
    float lit = .2 + .8*max(0., dot(n, normalize(SUNDIR)));
    vec3 p = n*GR; col = mix(BLUE*.55, mix(MINT, WHITE, .2), land)*(.4 + .85*lit);
    a = (land > .5 ? 1. : .3)*(.4 + .6*lit)*(1. - .95*hidden(p, vec3(0.), GR)); return p;
  }
  if(s.x < .9){ // money travelling one way, then back the other
    float k = floor(r.x*5.); float u = fract(t*.16 + h1(k*7.)); float v = u < .5 ? u*2. : 2. - u*2.;
    v -= (u < .5 ? 1. : -1.)*r.y*r.y*.22;
    col = k < 2. ? MINT : (k < 4. ? YELLOW : ORANGE); a = .95*(1. - r.y);
    vec3 p = route(k, clamp(v, 0., 1.), t); return p + ball(r.zwx)*(4. - r.y*3.);
  }
  // markers light up only when a stream lands on them, then pulse outward and fade
  float j = floor(r.x*10.); float k = floor(j/2.), end = mod(j, 2.);
  vec3 c = spinG(placeAt(k*2. + end)*GR*1.01, t);
  float su = fract(t*.16 + h1(k*7.)); float e = fract(su - (end > .5 ? .5 : 0.))/.16; // seconds since arrival
  float show = 1. - smoothstep(1.4, 3.2, e);
  vec3 nrm = normalize(c); vec3 tg = normalize(cross(nrm, vec3(0., 1., 0.))), bt = cross(nrm, tg);
  col = k < 2. ? MINT : (k < 4. ? YELLOW : ORANGE); float seen = 1. - hidden(c, vec3(0.), GR);
  if(r.z < .35){ a = show*seen; return c + ball(r.wxy)*7.; }
  float wave = fract(e/1.1); float ang = r.y*TAU;
  a = .7*show*(1. - wave)*seen; return c + (tg*cos(ang) + bt*sin(ang))*(10. + wave*46.);
}`;

const HEALTH = HEADER + COMMON + `
const float MR = 360.;
// The scan sweeps between the upper and lower thirds, so it is always in view.
float sweep(float t){ float u = mod(t*.16, 2.); return ((u < 1. ? u : 2. - u)*2. - 1.)*.62; }
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 11.), q = rnd(s, 13.);
  float sy = sweep(t), ring = sqrt(max(0., 1. - sy*sy));
  if(s.x < .12){ col = WHITE; a = .3; return dust(r, t); }
  if(s.x < .7){
    vec3 p = world(r, vec3(0.), MR, t*.05, 2., CREAM*.55, CREAM, col, a); vec3 n = p/MR;
    float line = 1. - smoothstep(0., .03, abs(n.y - sy));
    col = mix(col, MINT*1.4, line); a = max(a, line*(1. - .8*hidden(p, vec3(0.), MR))); return p;
  }
  vec3 probe = vec3(cos(t*.5)*MR*ring*1.55, sy*MR + 70., sin(t*.5)*MR*ring*1.55);
  if(s.x < .79){ // the scan ring, softly visible even round the far side
    float ang = r.y*TAU; vec3 p = vec3(cos(ang)*MR*ring*1.01, sy*MR, sin(ang)*MR*ring*1.01);
    col = MINT; a = .85*(1. - .75*hidden(p, vec3(0.), MR)); return p + ball(r.zwx)*2.;
  }
  if(s.x < .88){ // the beam fans out from the probe to cover the whole scan line
    float ang = r.z*TAU; vec3 hit = vec3(cos(ang)*MR*ring, sy*MR, sin(ang)*MR*ring); float v = sqrt(r.y);
    vec3 p = mix(probe, hit, v);
    col = MINT; a = .42*(.35 + .65*v)*(1. - .8*hidden(p, vec3(0.), MR)); return p + ball(r.wxy)*2.;
  }
  vec3 sp = saucer(q, t, 0., 0., col, a); return probe + rotY(sp, -t*.5)*2.6;
}`;

const LIBRARY = HEADER + COMMON + `
// A solar system: the sun is the library, the single source of truth, and every
// planet orbits it and draws light from it.
vec3 planetPos(float k, float t){
  float rad = 230. + k*120.; float ang = h1(k*4.1)*TAU + t*(.34 - k*.045);
  return rotZ(rotX(vec3(cos(ang)*rad, 0., sin(ang)*rad), .18), -.08);
}
float planetSize(float k){ return k < .5 ? 18. : k < 1.5 ? 30. : k < 2.5 ? 24. : k < 3.5 ? 44. : 34.; }
vec3 planetTone(float k){ return k < .5 ? ORANGE : k < 1.5 ? BLUE : k < 2.5 ? MINT : k < 3.5 ? CREAM : mix(BLUE, MINT, .5); }
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 2.), q = rnd(s, 19.);
  if(s.x < .12){ col = WHITE; a = .3; return dust(r, t); }
  if(s.x < .32){ // the sun, with a gently boiling surface
    vec3 n = sph(r.xy); float boil = fbm(n*3. + vec3(0., t*.3, 0.));
    col = mix(YELLOW, WHITE, boil*.8); a = .9; return n*(92. + boil*8.);
  }
  if(s.x < .4){ // its glow
    col = YELLOW; a = .1*(1. - r.z); return sph(r.xy)*(96. + r.z*r.z*170.);
  }
  if(s.x < .5){ // orbits
    float k = floor(r.x*5.); float rad = 230. + k*120.; float ang = r.y*TAU;
    col = MINT; a = .16; return rotZ(rotX(vec3(cos(ang)*rad, (r.z - .5)*2., sin(ang)*rad), .18), -.08);
  }
  float k = floor(r.x*5.); vec3 C = planetPos(k, t); float R = planetSize(k);
  if(s.x < .84){ // the planets, lit by the sun
    vec3 n = sph(r.yz); vec3 p = C + n*R;
    float lit = .15 + .85*max(0., dot(n, normalize(-C)));
    float band = .85 + .15*sin(rotY(n, t*.6).y*14.);
    col = planetTone(k)*(.35 + .9*lit)*band; a = (.3 + .7*lit)*(1. - .95*hidden(p, C, R));
    if(k > 2.5 && k < 3.5 && r.w < .3){ float ang = q.x*TAU; float rad = R*mix(1.5, 2.2, q.y); p = C + rotX(vec3(cos(ang)*rad, 0., sin(ang)*rad), .4); col = CREAM; a = .35; }
    return p;
  }
  // streams of light flowing from the sun out to each planet
  float v = fract(t*.35 + r.y + k*.2); vec3 from = normalize(C)*100.;
  vec3 p = mix(from, C - normalize(C)*R*1.1, v);
  col = mix(YELLOW, planetTone(k), v); a = .45*sin(PI*v); return p + ball(r.zwx)*.9;
}`;

const BREADCRUMB = HEADER + COMMON + `
const float PR = 300.;
const vec3 MARK = vec3(-.35, .42, .84);
const float IMPACT = 5.2, CYCLE = 11.;
// Precision: the meteor glides in, leaving a trail, and lands exactly on its mark.
// A small splash and a faint field escape, the planet swells a little, then all settles.
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 23.), q = rnd(s, 29.);
  float u = mod(t, CYCLE), e = u - IMPACT;
  float swellR = 1. + (e > 0. ? .05*sin(min(e, 1.2)/1.2*PI)*exp(-e*.6) : 0.);
  vec3 nrm = normalize(MARK), hitP = nrm*PR;
  vec3 from = vec3(-2600., 1500., 600.);
  vec3 tg = normalize(cross(nrm, vec3(0., 1., 0.))), bt = cross(nrm, tg);
  float flight = clamp(u/IMPACT, 0., 1.); float travel = flight*flight;
  if(s.x < .1){ col = WHITE; a = .3; return dust(r, t); }
  if(s.x < .58){
    vec3 p = world(r, vec3(0.), PR*swellR, t*.04, 1., DEEP*.9, MINT, col, a); vec3 n = p/(PR*swellR);
    float d = acos(clamp(dot(n, nrm), -1., 1.));
    float glow = e > 0. ? exp(-e*1.1)*(1. - smoothstep(.04, .16, d)) : 0.;
    col = mix(col, mix(WHITE, YELLOW, d*6.), glow); a = max(a, glow*(1. - hidden(p, vec3(0.), PR))); return p;
  }
  if(s.x < .64){ // the target locking on
    float rad = mix(110., 26., ease(flight)); float show = e < 0. ? 1. : max(0., 1. - e*4.);
    col = flight > .95 ? YELLOW : MINT; a = .8*show;
    if(r.x < .7){ float an = r.y*TAU; return hitP + nrm*3. + (tg*cos(an) + bt*sin(an))*rad; }
    float k = floor(r.y*4.); float an = k*PI*.5; return hitP + nrm*3. + (tg*cos(an) + bt*sin(an))*(rad + 8. + r.z*24.);
  }
  if(s.x < .7){ // the meteor head
    vec3 head = mix(from, hitP, travel);
    col = mix(WHITE, YELLOW, r.w*.5); a = e < 0. ? 1. : 0.; return head + ball(r.xyz)*9.;
  }
  if(s.x < .84){ // the trail it leaves along its path, lingering and fading after the hit
    float v = r.y*travel; vec3 p = mix(from, hitP, v);
    float behind = travel - v; float life = e > 0. ? max(0., 1. - e/2.5) : 1.;
    col = mix(WHITE, mix(YELLOW, ORANGE, min(1., behind*3.)), min(1., behind*6.));
    a = .7*exp(-behind*3.5)*life*(1. - hidden(p, vec3(0.), PR)); return p + ball(r.zwx)*(2. + behind*26.);
  }
  if(s.x < .92){ // a small splash where it lands: sparks and a ring that spreads a little way
    if(r.x < .55){
      vec3 dir = normalize(nrm*1.5 + (sph(r.yz) - .0)*.8); float te = max(0., e);
      vec3 p = hitP + dir*(60. + r.w*120.)*te - nrm*70.*te*te;
      col = mix(YELLOW, ORANGE, r.w); a = e > 0. ? (1. - smoothstep(.2, 1.2, e)) : 0.; return p;
    }
    float ang = clamp(e*.35, 0., .35); float an = r.y*TAU;
    vec3 dir = normalize(nrm*cos(ang) + (tg*cos(an) + bt*sin(an))*sin(ang));
    col = mix(WHITE, YELLOW, r.z); a = e > 0. ? .8*exp(-e*1.6) : 0.; return dir*PR*1.01;
  }
  // a faint field escaping a little from the whole planet, then fading
  vec3 p = sph(r.xy)*PR*(1.04 + max(0., e)*.18 + r.z*.04);
  col = mix(MINT, WHITE, .4); a = e > 0. ? .35*exp(-e*1.1)*(1. - .9*hidden(p, vec3(0.), PR)) : 0.; return p;
}`;


// Four Leaves: three saucers circle a spot on a small planet and build a strawberry cake
// together. They beam up the tiers, stream cream onto the rims and drop the berries and
// the candle. Then a little alien flies over and lights the candle with a lighter, and
// the saucers wave. The story loops every CAKE_CYCLE seconds of story time.
const CAKE = HEADER + COMMON + CAKE_GLSL + `
const float CAKE_SPEED = 1.375, CAKE_CYCLE = 24.;
const float BEAM_END = 14.6, ALIEN_OUT = 14.6, ALIEN_AT = 15.6, LIGHT_AT = 16., ALIEN_BACK = 16.4, ALIEN_HOME = 17.4;
vec3 crew(float j, float t){ float ang = j/3.*TAU + t*.28; return vec3(cos(ang)*230., 235. + sin(t*1.3 + j*2.)*10., sin(ang)*230.); }
// Where the alien hangs while it lights the wick: its lighter flame sits just above the candle top.
const vec3 ALIEN_LIGHT = vec3(-19., 150., 0.);
vec3 alienPath(float t){
  vec3 home = crew(0., t) - vec3(0., 20., 0.);
  if(t < ALIEN_AT){ float u = ease(win(t, ALIEN_OUT, ALIEN_AT)); return mix(home, ALIEN_LIGHT, u) + vec3(0., sin(u*PI)*45., 0.); }
  if(t < ALIEN_BACK) return ALIEN_LIGHT + vec3(0., sin(t*3.)*1.5, 0.);
  float u = ease(win(t, ALIEN_BACK, ALIEN_HOME)); return mix(ALIEN_LIGHT, home, u) + vec3(0., sin(u*PI)*45., 0.);
}
vec3 scene(vec4 s, float time, out vec3 col, out float a){
  vec4 r = rnd(s, 3.), q = rnd(s, 5.);
  float t = mod(time*CAKE_SPEED, CAKE_CYCLE);
  float show = 1. - win(t, 22.6, 23.6);                       // the finished cake fades before the next build
  if(s.x < .06) return cakeStars(r, t, col, a);
  if(s.x < .52) return cakeGround(r, col, a);
  if(s.x < .86){
    float kind, tier, ord; vec3 target = cakeShape(r, col, kind, tier, ord);
    vec3 src = crew(floor(q.x*3.), t) - vec3(0., 16., 0.);
    vec3 p;
    if(kind < .5){ // each tier is beamed up over 2.4 seconds, bottom first, one tier after another
      float st = 1. + tier*3.1 + ord*2.4; float e = ease(win(t, st, st + .7));
      p = mix(src, target, e) + vec3(0., sin(e*PI)*40., 0.);
      a = step(st, t)*mix(.9, cakeGlow(kind), e); col = mix(MINT, col, e);
    } else if(kind < 3.5){ // cream streams down onto the rims; berries and the candle drop from the saucers
      float st = kind < 1.5 ? 10.6 + ord*1.6 : (kind < 2.5 ? 12.3 + ord*1.4 : 13.8);
      float f = win(t, st, st + (kind < 1.5 ? .5 : .8)), e = kind < 1.5 ? ease(f) : easeIn(f);
      p = mix(src, target, e) + vec3(0., kind < 1.5 ? sin(e*PI)*25. : 0., 0.);
      a = step(st, t)*(kind < 1.5 ? mix(.9, cakeGlow(kind), e) : cakeGlow(kind)); if(kind < 1.5) col = mix(WHITE, col, e);
    } else { // the flame lights when the alien's lighter touches the wick
      float lit = ease(win(t, LIGHT_AT, LIGHT_AT + .4)); float fl = 1. + .25*sin(t*23. + ord*9.);
      p = FLAME + (target - FLAME)*lit*fl; a = lit;
    }
    a *= show; return p;
  }
  if(s.x < .9){ // the little alien with its lighter
    float out_ = step(ALIEN_OUT, t)*(1. - step(ALIEN_HOME, t));
    float lighter = ease(win(t, ALIEN_AT - .2, ALIEN_AT + .1))*(1. - ease(win(t, LIGHT_AT + .3, ALIEN_BACK)));
    vec3 p = alienPath(t) + alien(q, t, lighter, col, a)*1.6; a *= out_; return p;
  }
  float j = floor(q.y*3.);
  float wave = ease(win(t, 17.6, 18.2))*(1. - ease(win(t, 20.4, 21.)));
  float beam = step(1., t)*(1. - step(BEAM_END, t));
  return crew(j, t) + saucer(r, t + j, beam, wave, col, a)*2.2;
}`;

export const SKY_SHADERS = { cake: CAKE, chatbot: CHATBOT, remit: REMIT, health: HEALTH, library: LIBRARY, crumb: BREADCRUMB };
