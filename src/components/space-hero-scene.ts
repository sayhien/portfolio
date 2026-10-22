// Shader code for the home page hero: a particle Saturn with wide rings, a
// detailed Earth beyond them, a flight through the Cassini gap and a swoosh
// into Earth's clouds. Same approach as earth-scenes.ts: every particle's
// place is worked out on the graphics card from a few random numbers.
// The camera and renderer live in space-hero.ts.
import { SAUCER_GLSL } from './saucer-shader';

export const VERTEX = `
precision highp float;
attribute vec4 aSeed;
attribute float aIdx;
uniform float uEarthN;
uniform sampler2D uLand;
uniform mat4 uProj, uView;
uniform vec3 uEye, uE;
uniform float uT, uDpr, uSizeRef, uFog, uNear, uEnter, uTiltX, uTiltZ, uScroll, uP;
// uPull is the swoosh's strength (0 to 1 and back), uSwoosh how far through it we are.
uniform float uPull, uSwoosh;
// The alien saucer: where it floats, how big it is, and how much it is waving.
uniform vec3 uSaucer; uniform float uSaucerScale, uWave;
varying vec3 vCol; varying float vA; varying float vSz;
float gSize; float gScreen;
uniform float uAspect;
float uAspectS(){ return uAspect; }
const float PI = 3.14159265, TAU = 6.2831853;
const vec3 MINT = vec3(.43,.91,.72), BLUE = vec3(.49,.71,1.), WHITE = vec3(.93,.94,.95), DEEP = vec3(.16,.59,.5);
const vec3 ORANGE = vec3(1.,.54,.24), CREAM = vec3(.96,.92,.82), SAND = vec3(.86,.78,.6), GREEN = vec3(.45,.72,.42);
const float SR = 420., ER = 210.;
const vec3 GOLD = vec3(1.,.79,.29);
const vec3 L = vec3(.62,.38,.69);
float h1(float n){ return fract(sin(n*12.9898+4.1414)*43758.5453); }
vec4 rnd(vec4 s, float k){ return vec4(h1(s.x*91.7+k), h1(s.y*57.3+k*1.7), h1(s.z*33.1+k*2.3), h1(s.w*77.9+k*3.1)); }
vec3 sph(vec2 r){ float z=r.x*2.-1.; float a=r.y*TAU; float q=sqrt(max(0.,1.-z*z)); return vec3(q*cos(a), z, q*sin(a)); }
vec3 ball(vec3 r){ return sph(r.xy)*pow(r.z, .3333); }
vec3 rotY(vec3 p,float a){ float c=cos(a), s=sin(a); return vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z); }
vec3 rotX(vec3 p,float a){ float c=cos(a), s=sin(a); return vec3(p.x, c*p.y-s*p.z, s*p.y+c*p.z); }
vec3 rotZ(vec3 p,float a){ float c=cos(a), s=sin(a); return vec3(c*p.x-s*p.y, s*p.x+c*p.y, p.z); }
vec3 ringPlane(vec3 p){ return rotZ(rotX(p, uTiltX), uTiltZ); }
float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float vnoise(vec3 p){
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  float a=mix(mix(hash3(i), hash3(i+vec3(1,0,0)), f.x), mix(hash3(i+vec3(0,1,0)), hash3(i+vec3(1,1,0)), f.x), f.y);
  float b=mix(mix(hash3(i+vec3(0,0,1)), hash3(i+vec3(1,0,1)), f.x), mix(hash3(i+vec3(0,1,1)), hash3(i+vec3(1,1,1)), f.x), f.y);
  return mix(a, b, f.z);
}
float fbm(vec3 p){ return .55*vnoise(p) + .3*vnoise(p*2.1) + .15*vnoise(p*4.3); }
${SAUCER_GLSL}
float hidden(vec3 p, vec3 C, float R){
  vec3 d = p - uEye; float Ln = length(d); d /= Ln;
  vec3 oc = uEye - C; float b = dot(oc, d); float c = dot(oc, oc) - R*R*.985;
  float disc = b*b - c;
  if(disc < 0.) return 0.;
  float th = -b - sqrt(disc);
  return (th > 0. && th < Ln - R*.01) ? 1. : 0.;
}
// How much ring material sits at a radius (in Saturn radii): bands, a Cassini gap and a thin Encke gap.
float ringDensity(float x){
  float d = .55 + .25*sin(x*31.) + .15*sin(x*73.+1.3) + .1*sin(x*157.);
  d *= smoothstep(1.22, 1.3, x)*(1. - smoothstep(2.62, 2.7, x));
  d *= 1. - (smoothstep(1.93, 1.96, x) - smoothstep(2.03, 2.06, x));
  d *= 1. - .85*(smoothstep(2.44, 2.45, x) - smoothstep(2.47, 2.48, x));
  return max(d, 0.);
}
float landAt(vec3 n){
  float lat = asin(clamp(n.y, -1., 1.)); float lon = atan(n.x, n.z);
  return step(.5, texture2D(uLand, vec2(lon/(2.*PI) + .5, .5 - lat/PI)).r);
}
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 3.), q = rnd(s, 17.);
  float keep = 1. - uEnter;
  // Earth's surface: even dots over the sphere with real continents, the same look as the ESG globe
  if(aIdx < uEarthN){
    float y = 1. - 2.*(aIdx + .5)/uEarthN, rr = sqrt(max(0., 1. - y*y)), ang = aIdx*2.399963229728653;
    vec3 n = vec3(rr*sin(ang), y, rr*cos(ang));
    vec3 LE = normalize(normalize(uEye - uE) + vec3(-.75, .35, 0.));
    float lit = .35 + .65*max(0., dot(n, LE));
    float L = landAt(rotX(rotY(n, t*.03), -.3));
    float close = smoothstep(ER*5., ER*1.15, length(uEye - uE));
    gSize = 1. + 1.4*close;
    vec3 p = uE + n*ER;
    col = (L > .5 ? MINT*1.25 : DEEP*1.2)*(.7 + .6*lit); a = (L > .5 ? 1. : .2)*(.7 + .3*lit)*(1. - .95*hidden(p, uE, ER))*keep;
    return p;
  }
  // Twinkling stars all around the scene
  if(s.x < .07){
    vec3 p = sph(r.xy)*(18000. + r.z*6000.);
    float tw = .55 + .45*sin(t*(1. + q.x*3.) + q.y*40.);
    col = q.z < .7 ? WHITE : (q.z < .85 ? BLUE : MINT); a = (.25 + .6*q.w*q.w)*tw;
    if(q.w > .985){ gSize = 2.6; a = .9*tw; }
    a *= 1. - uEnter;
    return p;
  }
  // A dense screen wide layer of twinkling stars for the trip through space.
  // It fades on entering Earth, leaving the page's quiet star sky (star-sky.ts).
  if(s.x < .11){
    gScreen = 1.;
    float tw = .5 + .5*sin(t*(.8 + q.x*2.6) + q.y*40.);
    float y = fract(r.y + uScroll*(.04 + r.z*.06));
    col = q.z < .7 ? WHITE : (q.z < .85 ? BLUE : MINT);
    a = (.18 + .7*q.w*q.w)*tw*.6;
    // A few stars stand out: bigger, brighter, and they flash rather than shimmer
    bool standout = q.w > .9965;
    if(standout){ float flash = pow(.5 + .5*sin(t*(.6 + q.x*1.4) + q.y*60.), 6.); gSize = 2.4 + 1.6*flash; a = .55 + .45*flash; col = mix(WHITE, q.z < .5 ? BLUE : MINT, .25); }
    a *= keep;
    return vec3(r.x*2. - 1., y*2. - 1., 0.);
  }
  // The swoosh, in three layers of light as we are pulled into Earth:
  // streaks spiralling past the edges, rings of light rushing outward, and fine sparks.
  if(s.x < .155){
    gScreen = 1.;
    float lane = floor(r.x*260.); float ang = lane/260.*TAU + (q.y - .5)*.012; float u = fract(h1(lane*3.7) + t*.9 + uSwoosh*7.);
    float rad = .12 + u*u*1.8; float len = (.05 + .65*uPull)*rad;
    float along = r.z;
    float rr = rad - along*len; float spin = (1. - u)*1.6*uPull;
    float tone = h1(lane*1.3);
    col = tone < .45 ? mix(WHITE, BLUE, q.w) : (tone < .9 ? MINT : GOLD);
    a = uPull*(.5 + 1.3*u)*(1. - along*.6);
    gSize = 1. + 1.8*u*uPull;
    return vec3(cos(ang + spin)*rr/uAspectS(), sin(ang + spin)*rr, 0.);
  }
  if(s.x < .175){
    gScreen = 1.;
    float k = floor(r.x*9.); float u = fract(t*.55 + k/9. + uSwoosh*4.);
    float rad = .04 + u*u*u*2.2; float ang = r.y*TAU;
    col = mod(k, 3.) < 1. ? MINT : (mod(k, 3.) < 2. ? BLUE : WHITE);
    a = uPull*.55*(1. - u)*smoothstep(0., .15, u)*(.6 + .4*sin(ang*6. + t*3.));
    gSize = 1. + uPull*u;
    return vec3(cos(ang)*rad/uAspectS(), sin(ang)*rad, 0.);
  }
  if(s.x < .2){
    gScreen = 1.;
    float u = fract(q.x + t*(.6 + q.y*.9) + uSwoosh*5.); float ang = r.y*TAU;
    float rad = .02 + u*u*1.7;
    col = q.z < .6 ? WHITE : (q.z < .85 ? MINT : GOLD);
    a = uPull*(.3 + 1.2*u)*step(.35, q.w);
    gSize = 1. + 2.2*u*u*uPull;
    return vec3(cos(ang)*rad/uAspectS(), sin(ang)*rad, 0.);
  }
  // Saturn: soft bands, lit from one side
  if(s.x < .31){
    gSize = 1.7;
    vec3 n = sph(s.yz); vec3 p = n*SR;
    float band = .5 + .5*sin(n.y*20. + sin(n.y*7. + 1.)*1.2);
    float lit = .18 + .82*max(0., dot(n, L));
    col = mix(SAND, CREAM, band)*mix(vec3(1.), MINT, .25)*(.5 + .8*lit);
    a = (.3 + .7*lit)*(1. - .95*hidden(p, vec3(0.), SR))*keep; return p;
  }
  // The rings: dense bands with gaps, plus a wide faint outer ring
  if(s.x < .52){
    float x = mix(1.22, 2.7, s.y);
    float ang = s.z*TAU + t*.012;
    vec3 p = ringPlane(vec3(cos(ang)*x*SR, (r.z-.5)*5., sin(ang)*x*SR));
    float spark = step(.996, q.x)*(.5 + .5*sin(t*3. + q.y*50.));
    col = mix(CREAM, mix(MINT, WHITE, .5), .5 + .5*sin(x*12.)); a = (.62*ringDensity(x) + spark)*(1. - hidden(p, vec3(0.), SR))*keep;
    // Saturn's shadow on the far side of the rings
    vec3 toSun = normalize(L); float back = dot(normalize(p), toSun);
    if(back < 0. && length(p - toSun*dot(p, toSun)) < SR) a *= .25;
    return p;
  }
  if(s.x < .53){
    float x = mix(2.85, 3.8, sqrt(r.x)); float ang = r.y*TAU;
    col = MINT; a = .07*keep; return ringPlane(vec3(cos(ang)*x*SR, (r.z-.5)*20., sin(ang)*x*SR));
  }
  // Thin orbit lines sweeping past
  if(s.x < .55){
    float k = floor(r.x*4.); float rad = SR*(3.1 + k*1.05); float ang = r.y*TAU;
    vec3 base = rotZ(rotX(vec3(cos(ang)*rad, 0., sin(ang)*rad*.92), .55 + k*.06), .35);
    col = mix(WHITE, MINT, .4); a = .2*keep; return base;
  }
  // Far planets in the background
  if(s.x < .555){
    float k = floor(r.x*3.);
    vec3 C = k < .5 ? vec3(-6200., 2200., -7800.) : k < 1.5 ? vec3(7200., -1700., -9500.) : vec3(-1200., 3600., -12000.);
    float R = k < .5 ? 200. : k < 1.5 ? 160. : 260.;
    vec3 n = sph(r.yz); float lit = max(0., dot(n, L));
    col = (k < .5 ? ORANGE : k < 1.5 ? BLUE : mix(BLUE, WHITE, .5))*(.35 + .8*lit); a = (.3 + .7*lit)*keep; return C + n*R;
  }
  // The alien saucer floating near Saturn. It spins slowly and waves when clicked.
  if(s.x < .565){
    vec3 sp = saucer(r, t, 0., uWave, col, a);
    sp = rotX(rotY(sp, t*.5), sin(t*.7)*.12);
    gSize = 1.5; a = min(1., a*1.8)*keep; return uSaucer + sp*uSaucerScale;
  }
  // Earth: its air and its moon (the surface is drawn above)
  vec3 n = sph(s.yz); vec3 spun = rotY(n, t*.03);
  // Earth is lit from just beside our viewpoint, so its day side faces us with a sliver of night at one edge
  vec3 LE = normalize(normalize(uEye - uE) + vec3(-.75, .35, 0.));
  float lit = .14 + .86*max(0., dot(n, LE));
  // Up close the specks grow, so the planet and clouds fill in as we arrive
  float close = smoothstep(ER*5., ER*1.15, length(uEye - uE));
  if(s.x < .945){
    // thin glowing air, brighter on the lit edge (as on the ESG globe)
    vec3 p = uE + n*ER*(1.01 + q.x*q.x*.09);
    col = mix(MINT, BLUE, q.w*.6); a = .14*lit*(1. - q.x)*(1. - .95*hidden(p, uE, ER))*keep; return p;
  }
  if(s.x < .98){
    float h = q.x*q.x; vec3 p = uE + n*ER*(1. + .07*h);
    float rim = 1. - abs(dot(n, normalize(uEye - uE)));
    col = mix(BLUE, MINT, .3); a = .22*(1. - h)*lit*(.4 + rim)*(1. - .95*hidden(p, uE, ER))*keep; return p;
  }
  float MR = ER*.27, ma = t*.05 + 1.; vec3 mc = uE + vec3(cos(ma)*ER*4.2, ER*.6, sin(ma)*ER*4.2);
  float crater = step(.8, h1(floor(n.x*5.)*7. + floor(n.y*5.)*3. + floor(n.z*5.)));
  col = CREAM*(.3 + .8*max(0., dot(n, L)))*(1. - .35*crater); a = (.4 + .6*max(0., dot(n, L)))*(1. - .95*hidden(mc + n*MR, mc, MR))*keep;
  return mc + n*MR;
}
void main(){
  gSize = 1.; gScreen = 0.;
  vec3 col; float a;
  vec3 p = scene(aSeed, uT, col, a);
  if(gScreen > .5){ gl_Position = vec4(p.xy, 0., 1.); gl_PointSize = 1.3*uDpr*gSize; vSz = gl_PointSize; vA = min(1., a); vCol = col; return; }
  vec3 start = sph(aSeed.zw)*(900. + aSeed.x*900.);
  float e = clamp((uT - aSeed.w*1.47)/2.13, 0., 1.); e = e*e*(3.-2.*e);
  if(aSeed.x >= .11){ p = mix(start, p, e); a *= mix(.2, 1., e); }
  vec4 vp = uView*vec4(p, 1.);
  gl_Position = uProj*vp;
  float d = max(-vp.z, uNear);
  float sz = 1.1*uDpr*(uSizeRef/d)*gSize;
  float minSz = 1.1*uDpr*gSize;
  gl_PointSize = clamp(sz, minSz, 4.5*uDpr*gSize);
  vSz = gl_PointSize;
  float fog = clamp(1.35 - d/uFog, .12, 1.);
  vA = min(1., a*1.5)*fog*min(1., sz/minSz);
  vCol = col;
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
