// Shader code for the farewell astronaut above the footer. Same particle
// approach as the other space scenes: every particle's place is worked out on
// the graphics card from a few random numbers. The camera, the scroll story
// and the renderer live in astronaut.ts.
//
// The astronaut stands at the origin, about 200 units tall, with the helmet
// centred at HELMET. Earth hangs far below. Uniforms that tell the story:
//   uVisor   0 to 1, the gold sun visor sliding down over the clear dome
//   uWave    0 to 1, the right arm raised and waving goodbye
//   uOffset  where the astronaut has drifted to as space pulls him away
//   uPull    the swoosh's strength (0 to 1 and back), uSwoosh how far through it we are
import { COMMON, HEADER } from './case-sky-scenes';
import { SWOOSH_GLSL } from './swoosh-shader';

const SCENE = `
const vec3 GOLD = vec3(1., .74, .3);
${SWOOSH_GLSL}
uniform sampler2D uFace;
uniform float uVisor, uWave, uPull, uSwoosh, uGain, uDot;
uniform vec3 uOffset;
const vec3 HELMET = vec3(0., 62., 0.);
const float DOME_R = 30.;
const vec3 EARTH_C = vec3(0., -3200., -1500.);
const float EARTH_R = 2600.;
const vec3 LIGHT = vec3(-.5, .6, .65);
const vec3 SUIT = vec3(.9, .92, .95);

vec3 gEye; // the camera, in the astronaut's own frame
float shade(vec3 n){ return .4 + .75*max(0., dot(normalize(n), normalize(LIGHT))); }

// A tube between two points, as a shell of particles. Gives back the surface normal too.
vec3 limb(vec4 r, vec3 a, vec3 b, float rad, out vec3 n){
  vec3 ax = normalize(b - a); vec3 side = normalize(cross(ax, abs(ax.y) > .9 ? vec3(1.,0.,0.) : vec3(0.,1.,0.))); vec3 up = cross(ax, side);
  float ang = r.y*TAU; n = side*cos(ang) + up*sin(ang);
  return mix(a, b, r.z) + n*rad;
}
vec3 blob(vec4 r, vec3 c, vec3 radii, out vec3 n){ vec3 s = sph(r.yz); n = normalize(s/radii); return c + s*radii; }

// The waving arm: hangs down at rest, then lifts out to the side and swings its forearm.
void rightArm(float t, out vec3 elbow, out vec3 hand){
  vec3 shoulder = vec3(30., 28., 0.);
  vec3 upper = normalize(mix(vec3(.25, -1., .05), vec3(.85, .55, .12), uWave));
  elbow = shoulder + upper*30.;
  float swing = sin(t*5.5)*.55*uWave;
  vec3 fore = normalize(mix(vec3(.1, -1., .25), vec3(sin(swing)*.9, cos(swing), .15), uWave));
  hand = elbow + fore*28.;
}

// The garden from the footer, as the gold visor reflects it: hills and flowers below, night sky above.
vec3 reflection(vec3 n, out float bright){
  float u = n.x*1.4, v = n.y*1.3;
  float hill = -.12 + .09*sin(u*4.2 + 1.) + .05*sin(u*9.3);
  vec3 col; bright = .5;
  if(v < hill){
    float depth = clamp((hill - v)*3., 0., 1.);
    col = mix(MINT*.75, DEEP*.6, depth);
    float bloom = step(.86, hash3(floor(vec3(u*30., v*30., 1.))));
    if(bloom > .5){ col = mix(ORANGE, YELLOW, hash3(floor(vec3(u*30., v*30., 7.)))); bright = .95; }
  } else {
    col = vec3(.1, .13, .18);
    if(length(vec2(u - .55, v - .48)) < .12){ col = CREAM; bright = .9; } // the moon over the hills
    else if(hash3(floor(vec3(u*45., v*45., 3.))) > .95){ col = WHITE; bright = .7; }
    else bright = .25;
  }
  return col;
}

// How much of the dome the visor covers at a point: it slides down from the top, front side only.
float visorCover(vec3 n){
  float fromTop = acos(clamp(n.y, -1., 1.))/PI; // 0 at the top, 1 at the bottom
  return smoothstep(uVisor*.9 + .02, uVisor*.9 - .02, fromTop)*smoothstep(-.25, .05, n.z);
}

vec3 suit(vec4 r, vec4 q, float t, out vec3 col, out float a){
  vec3 n; vec3 p; float k = q.x;
  col = SUIT; a = .2;
  if(k < .3){ p = blob(r, vec3(0., 0., 0.), vec3(30., 40., 19.), n); } // torso
  else if(k < .38){ p = blob(r, vec3(0., 4., -24.), vec3(26., 34., 11.), n); col = SUIT*.8; } // life support pack
  else if(k < .43){ p = vec3(0., 37., 0.) + vec3(cos(r.y*TAU)*22., (r.z - .5)*6., sin(r.y*TAU)*16.); n = vec3(cos(r.y*TAU), 0., sin(r.y*TAU)); col = GREY; a = .16; } // neck ring
  else if(k < .53){ vec3 e, h; rightArm(t, e, h); p = r.x < .5 ? limb(r, vec3(30., 28., 0.), e, 9., n) : limb(r, e, h, 8., n); }
  else if(k < .56){ vec3 e, h; rightArm(t, e, h); p = blob(r, h, vec3(8., 9., 7.), n); col = SUIT*.85; } // waving glove
  else if(k < .65){ vec3 e = vec3(-36., 0., 6.), h = vec3(-34., -26., 14.); p = r.x < .5 ? limb(r, vec3(-30., 28., 0.), e, 9., n) : limb(r, e, h, 8., n); }
  else if(k < .67){ p = blob(r, vec3(-34., -32., 15.), vec3(8., 8., 7.), n); col = SUIT*.85; }
  else if(k < .85){ float side = r.x < .5 ? -1. : 1.; vec3 hip = vec3(side*14., -36., 0.), knee = vec3(side*17., -82., 6.), ankle = vec3(side*17., -124., 2.);
    p = r.w < .5 ? limb(r, hip, knee, 12., n) : limb(r, knee, ankle, 11., n); }
  else if(k < .9){ float side = r.x < .5 ? -1. : 1.; p = blob(r, vec3(side*17., -130., 6.), vec3(10., 6., 15.), n); col = GREY; }
  else if(k < .95){ p = vec3(0., 10., 19.) + vec3((r.y - .5)*24., (r.z - .5)*16., 0.); n = vec3(0., 0., 1.); col = mix(GREY, MINT, step(.8, r.w)); a = .2; } // chest controls
  else { p = vec3(-30., 18., 0.) + vec3(0., (r.z - .5)*10., (r.y - .5)*14.); n = vec3(-1., 0., 0.); col = mix(BLUE, WHITE, step(.5, fract(r.z*6.))); a = .22; } // shoulder patch
  col *= shade(n);
  return p;
}

vec3 helmet(vec4 r, vec4 q, float t, float part, out vec3 col, out float a){
  vec3 n = sph(r.yz);
  vec3 p = HELMET + n*DOME_R;
  vec3 view = normalize(gEye - p);
  float rim = 1. - abs(dot(n, view));
  if(part < .5){ // the clear dome: almost invisible, with a bright rim and a highlight
    float glint = smoothstep(.93, .99, dot(n, normalize(vec3(-.45, .6, .65))));
    col = mix(BLUE, WHITE, rim); a = (.03 + .4*pow(rim, 3.) + .9*glint)*(1. - visorCover(n));
    return p;
  }
  // the gold visor, reflecting the garden below
  p = HELMET + n*(DOME_R + .6);
  float cover = visorCover(n);
  float bright; vec3 refl = reflection(n, bright);
  col = mix(GOLD*.6, refl*mix(vec3(1.), GOLD, .45), .7)*(.6 + .6*rim);
  a = cover*(.5 + .8*bright)*smoothstep(-.1, .2, n.z);
  gSize *= 1.8;
  return p;
}

vec3 face(vec4 r, out vec3 col, out float a){
  vec2 uv = r.yz;
  vec4 tex = texture2D(uFace, uv);
  float x = (uv.x - .5)*30., y = (.5 - uv.y)*30.;
  float bulge = 9.*sqrt(max(0., 1. - (x/17.)*(x/17.))) - 9.;
  vec3 p = HELMET + vec3(x, y - 1., 8. + bulge);
  float b = tex.r;
  vec3 dir = normalize(p - HELMET);
  float edge = smoothstep(1., .75, length((uv - .5)*vec2(2., 1.8)));
  col = mix(DEEP, MINT, b); a = tex.a*edge*(.03 + 1.3*pow(b, 2.4))*(1. - visorCover(dir));
  return p;
}

// Where the dive lands on Earth, as a direction from its centre.
const vec3 LANDING = vec3(0., .862, .507);
// A point on Earth: most of the dots crowd round the landing spot, so the dive stays dense to the end.
vec3 earthDir(vec4 r){
  if(r.x < .2) return sph(r.yz);
  // Thicker towards the landing spot and thinning smoothly outwards, with no hard edge.
  vec3 side = normalize(cross(LANDING, vec3(1., 0., 0.))), up = cross(side, LANDING);
  float ang = r.y*TAU, rad = 1.1*sqrt(r.z)*(.25 + .75*r.w);
  return normalize(LANDING*cos(rad) + (side*cos(ang) + up*sin(ang))*sin(rad));
}
vec3 earth(vec4 r, float t, out vec3 col, out float a){
  vec3 n = earthDir(r); vec3 local = rotY(n, t*.01);
  float land = smoothstep(.45, .51, fbm(local*3.2 + 7.) + .15*(fbm(local*60.) - .5));
  float cloud = smoothstep(.58, .72, fbm(local*6. + t*.02) + .2*(fbm(local*90. + t*.05) - .5));
  float lit = .3 + .7*max(0., dot(n, normalize(vec3(-.3, .8, .5))));
  vec3 p = EARTH_C + n*EARTH_R*(1. + cloud*.004);
  col = mix(mix(BLUE*.35, DEEP*.6, .4), mix(MINT, vec3(.5,.8,.45), .5), land);
  col = mix(col, WHITE, cloud*.75)*lit;
  float rim = 1. - abs(dot(n, normalize(uEye - p)));
  col = mix(col, BLUE, pow(rim, 4.)*.6);
  a = (.2 + .45*land + .5*cloud)*(.5 + .7*lit)*(1. - .97*hidden(p, EARTH_C, EARTH_R));
  return p;
}

vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 5.), q = rnd(s, 11.);
  float yaw = sin(t*.3)*.12 + uWave*.15;
  gEye = rotY(uEye - uOffset, -yaw);
  if(s.x < .06){ vec3 n = sph(r.yz); col = WHITE; a = .15 + .35*r.w*r.w; return uEye + n*5000.; } // stars
  if(s.x < .1) return swoosh(0., r, q, t, uPull, uSwoosh, uAspect, col, a);
  if(s.x < .12) return swoosh(1., r, q, t, uPull, uSwoosh, uAspect, col, a);
  if(s.x < .14) return swoosh(2., r, q, t, uPull, uSwoosh, uAspect, col, a);
  if(s.x < .32) return earth(r, t, col, a);
  gSize = uDot;
  vec3 p;
  if(s.x < .5) p = face(r, col, a);
  else if(s.x < .56) p = helmet(r, q, t, 0., col, a);
  else if(s.x < .78) p = helmet(r, q, t, 1., col, a);
  else p = suit(r, q, t, col, a);
  // Up close the helmet needs extra light to read; the suit only a little, so it stays quiet.
  a *= s.x < .78 ? uGain : 1. + (uGain - 1.)*.15;
  // A slow floating sway, then the drift away into space
  p = rotY(p, yaw) + uOffset + vec3(0., sin(t*.6)*1.5, 0.);
  return p;
}
`;

export const ASTRONAUT_VERTEX = HEADER + COMMON + SCENE;
