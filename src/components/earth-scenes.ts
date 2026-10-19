// Shader code for the particle earth scenes. Every particle's position is
// worked out on the graphics card from a few random numbers, so tens of
// thousands of dots stay smooth. The renderer lives in earth.ts.

export type EarthMode = 'globe' | 'arcs';

export interface Camera {
  eye: [number, number, number];
  target: [number, number, number];
  fov: number;
  /** Moves the subject across the frame without turning the camera, in screen units. */
  shift: [number, number];
}

export interface EarthSceneDef {
  count: number;
  /** How many particles form the planet's surface (they get even sphere positions). */
  surface: number;
  camera: (t: number, narrow: boolean) => Camera;
  glsl: string;
}

// Shared helpers: random numbers, sphere sampling, geography and occlusion
const HEADER = `
precision highp float;
attribute vec4 aSeed;
attribute float aIdx;
attribute vec3 aGeo;
uniform mat4 uProj, uView;
uniform vec3 uEye;
uniform float uT, uDpr, uSurfN;
uniform sampler2D uLand;
varying vec3 vCol;
varying float vA;
varying float vSz;
const float PI = 3.14159265;
const vec3 MINT = vec3(.43,.91,.72), BLUE = vec3(.49,.71,1.), WHITE = vec3(.93,.94,.95), DEEP = vec3(.16,.59,.5), GREY = vec3(.6,.65,.72);
float h1(float n){ return fract(sin(n*12.9898+4.1414)*43758.5453); }
vec4 rnd(vec4 s, float k){ return vec4(h1(s.x*91.7+k), h1(s.y*57.3+k*1.7), h1(s.z*33.1+k*2.3), h1(s.w*77.9+k*3.1)); }
vec3 sph(vec2 r){ float z=r.x*2.-1.; float a=r.y*6.2831853; float q=sqrt(max(0.,1.-z*z)); return vec3(q*cos(a), z, q*sin(a)); }
vec3 ball(vec3 r){ return sph(r.xy)*pow(r.z, .3333); }
vec3 rotY(vec3 p,float a){ float c=cos(a), s=sin(a); return vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z); }
vec3 rotX(vec3 p,float a){ float c=cos(a), s=sin(a); return vec3(p.x, c*p.y-s*p.z, s*p.y+c*p.z); }
// Slow drifting stars
vec3 dust(vec4 r, float t){
  vec3 p = vec3((r.y-.5)*3200., (r.z-.5)*1800., (r.w-.5)*1800.-300.);
  p.x = mod(p.x + t*3. + 1600., 3200.) - 1600.;
  p.y += sin(t*.05 + r.x*40.)*20.;
  return p;
}
vec3 ll(float latDeg, float lonDeg){ float la=radians(latDeg), lo=radians(lonDeg); return vec3(cos(la)*sin(lo), sin(la), cos(la)*cos(lo)); }
float land(vec3 n){
  float lat = asin(clamp(n.y, -1., 1.)); float lon = atan(n.x, n.z);
  return step(.5, texture2D(uLand, vec2(lon/(2.*PI) + .5, .5 - lat/PI)).r);
}
// Turn the globe so a chosen place faces the camera, then spin slowly
vec3 orient(vec3 n, float lonC, float latC, float t, float rate){ return rotX(rotY(n, -radians(lonC) - t*rate), radians(latC)); }
// 1 when the globe blocks the view of p
float hidden(vec3 p, vec3 C, float R){
  vec3 d = p - uEye; float L = length(d); d /= L;
  vec3 oc = uEye - C; float b = dot(oc, d); float c = dot(oc, oc) - R*R*.985;
  float disc = b*b - c;
  if(disc < 0.) return 0.;
  float th = -b - sqrt(disc);
  return (th > 0. && th < L - 4.) ? 1. : 0.;
}
`;

// Every particle gathers from a loose cloud into place within about three and a half seconds
const MAIN = `
void main(){
  vec3 col; float a;
  vec3 p = scene(aSeed, aIdx, uT, col, a);
  vec3 start = sph(aSeed.zw)*(700. + aSeed.x*700.);
  float e = clamp((uT - aSeed.w*1.47)/2.13, 0., 1.); e = e*e*(3.-2.*e);
  p = mix(start, p, e);
  a *= mix(.25, 1., e);
  vec4 vp = uView*vec4(p, 1.);
  gl_Position = uProj*vp;
  float d = max(-vp.z, 1.);
  float sz = 1.1*uDpr*(900./d);
  float minSz = 1.1*uDpr;
  gl_PointSize = clamp(sz, minSz, 4.5*uDpr);
  vSz = gl_PointSize;
  float fog = clamp(1.35 - d/3200., .12, 1.);
  vA = min(1., a*1.5)*fog*min(1., sz/minSz);
  vCol = col;
}
`;

export const FRAGMENT = `
precision mediump float;
varying vec3 vCol;
varying float vA;
varying float vSz;
void main(){
  float r = length(gl_PointCoord - .5);
  if(r > .5) discard;
  float a = mix(1., smoothstep(.5, .1, r), clamp((vSz - 2.5)/3., 0., 1.))*vA;
  gl_FragColor = vec4(vCol*a, a);
}
`;

// Hero: a green planet of real continents, softly lit, turning slowly among stars
const GLOBE = `
const vec3 LIGHT = vec3(-.55, .45, .7);
const float SPIN = .0168;
vec3 scene(vec4 s, float idx, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 61.);
  float R = 500.;
  if(idx < uSurfN){
    float L = land(aGeo);
    vec3 n = orient(aGeo, 20., 18., t, SPIN);
    float lit = .35 + .65*max(0., dot(n, normalize(LIGHT)));
    vec3 p = n*R;
    col = (L > .5 ? MINT*1.25 : DEEP*1.2)*(.7 + .6*lit); a = (L > .5 ? 1. : .2)*(.7 + .3*lit);
    a *= 1. - .95*hidden(p, vec3(0.), R); return p;
  }
  if(s.x < .2){ col = WHITE; a = .3; return dust(r, t); }
  // thin glowing air, brighter on the lit edge
  vec3 n = sph(r.xy); vec3 p = n*R*(1.01 + r.z*r.z*.09);
  float lit = .3 + .7*max(0., dot(n, normalize(LIGHT)));
  col = mix(MINT, BLUE, r.w*.6); a = .14*lit*(1. - r.z)*(1. - .95*hidden(p, vec3(0.), R)); return p;
}`;

// Before the UI features: skimming low over a huge planet while streams of
// light arc in from far away and land on one point close to the viewer
const ARCS = `
const float SR = 2000.;
const vec3 SC = vec3(0., -2160., -220.);
vec3 cap(float lam, float phi){ return vec3(sin(lam)*cos(phi), cos(lam)*cos(phi), sin(phi)); }
vec3 meet(){ return cap(0., .1); }
vec3 surface(float idx, float t, out float L){
  float cols = 240.; float rows = ceil(uSurfN/cols);
  float c = mod(idx, cols), w = floor(idx/cols);
  float lam = (c/cols - .5)*1.3;
  float travel = (w/rows)*.85 - .3 + t*.004;
  float phi = mod(travel + .3, .85) - .3;
  L = land(ll(48. - degrees(travel), -30. + degrees(lam)*1.2));
  return SC + cap(lam, phi)*SR;
}
vec3 source(float k){ return cap((h1(k*1.7) - .5)*1.3, -.5 + h1(k*3.3)*.5); }
vec3 arc(float k, float v, float lift){ return SC + normalize(mix(source(k), meet(), v))*(SR + sin(PI*v)*lift); }
vec3 scene(vec4 s, float idx, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 37.);
  if(idx < uSurfN){
    float L; vec3 p = surface(idx, t, L);
    col = L > .5 ? GREY*1.1 : BLUE*.5; a = (L > .5 ? .75 : .08)*(1. - hidden(p, SC, SR)); return p;
  }
  if(s.x < .07){ col = WHITE; a = .3; vec3 d = dust(r, t); d.y = abs(d.y) + 100.; return d; }
  if(s.x < .17){ // faint threads linking the sources to each other
    float k = floor(r.x*24.);
    float v = r.z; col = BLUE; a = .12;
    return SC + normalize(mix(source(k), source(mod(k + 5., 24.)), v))*(SR + sin(PI*v)*90.);
  }
  if(s.x < .23){ // a bright core where everything lands
    col = mix(WHITE, MINT, length(ball(r.xyz))); a = .8;
    return SC + meet()*(SR + 16.) + ball(r.zwy)*11.;
  }
  if(s.x < .27){ // a thin beam of light rising from the core
    col = mix(WHITE, MINT, r.z); a = .55*(1. - r.z);
    return SC + meet()*(SR + 4. + r.z*r.z*360.) + ball(r.xyw)*3.;
  }
  // comets of light travelling along the arcs, plus rings spreading from the point
  float k = floor(r.x*24.);
  float lift = 160. + h1(k*5.1)*260.;
  if(s.y < .3){ float v = r.z; col = mix(BLUE, MINT, v); a = .13; return arc(k, v, lift); }
  if(s.y < .92){
    float v = fract(t*.035 + h1(k*7.)) - r.z*r.z*.3;
    col = mix(BLUE, MINT, v); a = v < 0. ? 0. : .85*(1. - r.z);
    return arc(k, max(v, 0.), lift);
  }
  vec3 dst = meet();
  float ring = fract(t*.05 + r.w); float ang = r.y*6.2831853;
  vec3 tang = normalize(cross(dst, vec3(1., 0., 0.))), bit = normalize(cross(dst, tang));
  col = MINT; a = .7*(1. - ring);
  return SC + dst*SR + (tang*cos(ang) + bit*sin(ang))*ring*340.;
}`;

export const SCENES: Record<EarthMode, EarthSceneDef> = {
  globe: {
    count: 96000,
    surface: 80000,
    camera: (t, narrow) => ({
      eye: [Math.sin(t * 0.02) * 160, 80, 1500],
      target: [0, 0, 0],
      fov: 42,
      // On phones the planet sits low, under the title
      shift: narrow ? [0, -0.78] : [0.58, -0.02],
    }),
    glsl: GLOBE,
  },
  arcs: {
    count: 62000,
    surface: 38000,
    camera: (t) => ({ eye: [Math.sin(t * 0.02) * 120, 110, 900], target: [0, -50, -420], fov: 46, shift: [0, 0] }),
    glsl: ARCS,
  },
};

export const vertexSource = (mode: EarthMode) => HEADER + SCENES[mode].glsl + MAIN;
