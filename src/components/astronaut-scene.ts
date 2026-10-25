// Shader code for the farewell astronaut above the footer. Same particle
// approach as the other space scenes: every particle's place is worked out on
// the graphics card from a few random numbers. The camera, the scroll story
// and the renderer live in astronaut.ts.
//
// The astronaut wears a spacewalk suit modelled on NASA's EMU: a bubble helmet
// under a white visor assembly with a light on each side, a hard upper torso
// with the chest control box, a life support pack on the back, bearing rings at
// the shoulders, wrists, waist and ankles, folds at the elbows and knees, and red
// commander stripes on the legs. He floats facing +z, about 190 units tall.
// Uniforms that tell the story:
//   uVisor   0 to 1, the gold sun visor sliding down over the clear bubble
//   uWave    0 to 1, the right arm raised and waving goodbye
//   uOffset  where the astronaut has drifted to as space pulls him away
//   uPull    the swoosh's strength (0 to 1 and back), uSwoosh how far through it we are
//   uGain    extra light for the helmet when the camera is close
import { COMMON, HEADER } from './case-sky-scenes';
import { SWOOSH_GLSL } from './swoosh-shader';

const SCENE = `
const vec3 GOLD = vec3(1., .74, .3);
${SWOOSH_GLSL}
uniform float uVisor, uWave, uPull, uSwoosh, uGain, uDot;
uniform vec3 uOffset;
const vec3 HELMET = vec3(0., 62., 2.);
const float HELMET_R = 19.;
const vec3 EARTH_C = vec3(0., -3200., -1500.);
const float EARTH_R = 2600.;
const vec3 SUN = vec3(-.55, .55, .63);
const vec3 SUIT = vec3(.93, .93, .9), RED = vec3(.92, .3, .26), SKIN = vec3(.6, .46, .38);

vec3 gEye; // the camera, in the astronaut's own frame

// ------------------------------------------------------------ shapes
// A rounded box: e = 2 is an ellipsoid, higher values square it off.
vec3 rbox(vec4 r, vec3 c, vec3 h, float e, out vec3 n){
  vec3 s = sph(r.yz);
  vec3 u = sign(s)*pow(abs(s), vec3(2./e));
  n = normalize(sign(u)*pow(abs(u) + 1e-4, vec3(e - 1.))/h);
  return c + u*h;
}
// A tapered tube from a to b, with soft folds round it like the cloth of a suit.
vec3 limb(vec4 r, vec3 a, vec3 b, float ra, float rb, float folds, out vec3 n){
  vec3 ax = normalize(b - a); vec3 side = normalize(cross(ax, abs(ax.y) > .9 ? vec3(1.,0.,0.) : vec3(0.,1.,0.))); vec3 up = cross(ax, side);
  float ang = r.y*TAU, v = r.z;
  n = side*cos(ang) + up*sin(ang);
  float rad = mix(ra, rb, v)*(1. + .05*sin(v*folds*TAU));
  return mix(a, b, v) + n*rad;
}
// A bearing ring round an axis.
vec3 ring(vec4 r, vec3 c, vec3 axis, float R, float w, out vec3 n){
  vec3 side = normalize(cross(axis, abs(axis.y) > .9 ? vec3(1.,0.,0.) : vec3(0.,1.,0.))); vec3 up = cross(axis, side);
  float ang = r.y*TAU, tube = r.z*TAU;
  vec3 dir = side*cos(ang) + up*sin(ang);
  n = dir*cos(tube) + axis*sin(tube);
  return c + dir*R + n*w;
}

// ------------------------------------------------------------ lighting
// Sunlight from the upper left, a cool glow from Earth below, and dots on the far side of a shape fade
// away so the figure reads as solid.
float facing(vec3 p, vec3 n){ return dot(n, normalize(gEye - p)); }
vec3 lit(vec3 base, vec3 p, vec3 n){
  float sun = max(0., dot(n, normalize(SUN)));
  return base*(.38 + .85*sun) + BLUE*.25*max(0., -n.y) + WHITE*.35*pow(1. - abs(facing(p, n)), 3.);
}
float solid(vec3 p, vec3 n){ return mix(.06, 1., smoothstep(-.15, .3, facing(p, n))); }

// ------------------------------------------------------------ pose
// The waving arm: rests forward like the left one, then lifts beside the helmet and swings from the elbow.
void rightArm(float t, out vec3 elbow, out vec3 wrist){
  float swing = sin(t*5.5)*.5*uWave;
  elbow = mix(vec3(37., 14., 9.), vec3(46., 46., 6.), uWave);
  vec3 fore = normalize(mix(vec3(-.3, -.85, .75), vec3(sin(swing), cos(swing), .2), uWave));
  wrist = elbow + fore*24.;
}

// ------------------------------------------------------------ helmet
// The clear opening at the front of the helmet, where the bubble and the sun visor are.
float opening(vec3 n){ return smoothstep(.08, .2, n.z)*smoothstep(.78, .66, n.y)*smoothstep(-.58, -.46, n.y); }
// How much of the opening the visor covers at a point: it slides down from the top.
float visorCover(vec3 n){
  float fromTop = acos(clamp(n.y, -1., 1.))/PI; // 0 at the top, 1 at the bottom
  return smoothstep(uVisor*.82 + .03, uVisor*.82 - .03, fromTop)*opening(n);
}
// The garden from the footer, as the gold visor reflects it: hills and flowers below, night sky above.
vec3 reflection(vec3 n, out float bright){
  float u = n.x*1.5, v = n.y*1.4;
  float hill = -.1 + .08*sin(u*4.2 + 1.) + .04*sin(u*9.3);
  vec3 col;
  if(v < hill){
    col = mix(MINT*.8, DEEP*.6, clamp((hill - v)*3., 0., 1.)); bright = .55;
    if(hash3(floor(vec3(u*34., v*34., 1.))) > .86){ col = mix(ORANGE, YELLOW, hash3(floor(vec3(u*34., v*34., 7.)))); bright = 1.; }
  } else {
    col = vec3(.1, .13, .18); bright = .22;
    if(length(vec2(u - .5, v - .45)) < .1){ col = CREAM; bright = .95; } // the moon over the hills
    else if(hash3(floor(vec3(u*45., v*45., 3.))) > .95){ col = WHITE; bright = .7; }
  }
  return col;
}
vec3 helmet(vec4 r, vec4 q, float k, out vec3 col, out float a){
  vec3 n = sph(r.yz);
  if(k < .5){ // the gold sun visor, reflecting the garden
    n.z = abs(n.z);
    vec3 p = HELMET + n*(HELMET_R + .4);
    float bright; vec3 refl = reflection(n, bright);
    float edge = 1. - abs(facing(p, n));
    col = mix(GOLD*.55, refl*mix(vec3(1.), GOLD, .4), .72)*(.65 + .5*edge) + WHITE*.6*smoothstep(.94, .99, dot(n, normalize(SUN + vec3(0., 0., .6))));
    a = visorCover(n)*(.4 + .7*bright);
    gSize *= 1.5;
    return p;
  }
  if(k < .66){ // the clear bubble: a bright rim and one highlight
    n.z = abs(n.z);
    vec3 p = HELMET + n*HELMET_R;
    float edge = 1. - abs(facing(p, n));
    float glint = smoothstep(.95, .995, dot(n, normalize(vec3(-.4, .55, .75))));
    col = mix(BLUE, WHITE, edge); a = (.02 + .45*pow(edge, 3.) + .9*glint)*opening(n)*(1. - visorCover(n));
    return p;
  }
  // the white visor assembly round the top, sides and back, with a raised frame round the opening
  float open = opening(n);
  if(open > .5) n.z = -n.z;
  float frame = 1. - smoothstep(.0, .35, abs(opening(n) - .25));
  vec3 p = HELMET + n*(HELMET_R + 1.6 + frame*.8);
  col = lit(SUIT, p, n); a = .3*solid(p, n);
  return p;
}
// The head inside, in shadow: a white and brown cap with ear cups, the face only a soft shape.
vec3 head(vec4 r, out vec3 col, out float a){
  vec3 n; vec3 c = HELMET + vec3(0., -1., -1.);
  vec3 p = rbox(r, c, vec3(8., 10.5, 9.), 2.2, n);
  vec3 d = p - c;
  bool face = d.z > 2.5 && d.y < 3. && abs(d.x) < 6.;
  bool ear = !face && abs(d.x) > 6.5 && abs(d.y + 1.) < 3.5;
  col = face ? SKIN*.55 : ear ? GREY*.3 : mix(CREAM, vec3(.55, .42, .3), step(.5, fract(d.y*.12 + .5)));
  a = (face ? .1 : .16)*solid(p, n)*(1. - visorCover(normalize(p - HELMET)));
  col *= .5 + .5*max(0., dot(n, normalize(SUN)));
  return p;
}
// The helmet lights, one each side, with bright lamps facing forward.
vec3 lamp(vec4 r, vec4 q, out vec3 col, out float a){
  float side = q.z < .5 ? -1. : 1.;
  vec3 c = HELMET + vec3(side*19.5, 2., 4.);
  if(q.w < .2){ // the lamp glass
    float ang = r.y*TAU, rad = 2.6*sqrt(r.z);
    col = WHITE; a = .9; gSize *= 1.3;
    return c + vec3(cos(ang)*rad, -2. + sin(ang)*rad, 6.3);
  }
  vec3 n; vec3 p = rbox(r, c, vec3(4.2, 6.5, 6.), 5., n);
  col = lit(SUIT*.9, p, n); a = .25*solid(p, n);
  return p;
}

// ------------------------------------------------------------ suit
vec3 arm(vec4 r, vec4 q, vec3 shoulder, vec3 elbow, vec3 wrist, out vec3 col, out vec3 n){
  float k = q.y; vec3 fore = normalize(wrist - elbow);
  col = SUIT;
  if(k < .06){ col = GREY; return ring(r, shoulder, normalize(shoulder - vec3(0., 36., 0.)), 9.6, 1.6, n); }
  if(k < .44) return limb(r, shoulder, elbow, 9.8, 8.6, 3., n);
  if(k < .52) return rbox(r, elbow, vec3(8.7), 2., n);
  if(k < .82) return limb(r, elbow, wrist, 8.4, 6.8, 2., n);
  if(k < .88){ col = GREY; return ring(r, wrist, fore, 6.9, 1.4, n); }
  col = SUIT*.85; return rbox(r, wrist + fore*7.5, vec3(5.6, 6.2, 5.), 2.4, n); // glove
}
vec3 leg(vec4 r, vec4 q, float side, out vec3 col, out vec3 n){
  vec3 hip = vec3(side*11., -18., 0.), knee = vec3(side*14., -58., 12.), ankle = vec3(side*13., -96., 4.);
  float k = q.y; col = SUIT;
  if(k < .45){ vec3 p = limb(r, hip, knee, 11.6, 9.8, 3., n); if(r.z > .7 && r.z < .82) col = RED*1.15; return p; }
  if(k < .53) return rbox(r, knee, vec3(9.9), 2., n);
  if(k < .86) return limb(r, knee, ankle, 9.6, 7.7, 2., n);
  if(k < .91){ col = GREY; return ring(r, ankle, normalize(ankle - knee), 7.9, 1.5, n); }
  return rbox(r, vec3(side*13., -104., 9.), vec3(7.6, 7., 12.), 3.4, n); // boot
}
vec3 suit(vec4 r, vec4 q, float t, out vec3 col, out float a){
  vec3 n, p; float k = q.x; col = SUIT; a = .32;
  if(k < .2) p = rbox(r, vec3(0., 25., 0.), vec3(26., 21., 16.), 3., n); // hard upper torso
  else if(k < .24){ // the chest control box, with a small mint display
    p = rbox(r, vec3(0., 24., 19.), vec3(13., 7., 5.), 6., n);
    col = SUIT*.8;
    if(n.z > .8 && abs(p.x) < 9. && p.y > 25.){ col = MINT; a = .6; }
  }
  else if(k < .36) p = rbox(r, vec3(0., 26., -24.), vec3(25., 28., 10.), 6., n); // life support pack
  else if(k < .4) p = rbox(r, vec3(0., -6., -26.), vec3(23., 8., 9.), 5., n); // rescue jet pack under it
  else if(k < .48) p = rbox(r, vec3(0., -8., 0.), vec3(21., 14., 15.), 2.6, n); // lower torso
  else if(k < .5){ col = GREY; p = ring(r, vec3(0., 5., 0.), vec3(0., 1., 0.), 20., 1.8, n); } // waist bearing
  else if(k < .52){ col = GREY; p = ring(r, vec3(0., 45., 2.), normalize(vec3(0., 1., .15)), 14.5, 2.2, n); } // neck ring
  else if(k < .64){ vec3 e, w; rightArm(t, e, w); p = arm(r, q, vec3(27., 36., 0.), e, w, col, n); }
  else if(k < .76) p = arm(r, q, vec3(-27., 36., 0.), vec3(-37., 14., 9.), vec3(-31., -3., 25.), col, n);
  else p = leg(r, q, q.z < .5 ? -1. : 1., col, n);
  col = lit(col, p, n); a *= solid(p, n);
  return p;
}

// ------------------------------------------------------------ Earth
// Where the dive lands on Earth, as a direction from its centre.
const vec3 LANDING = vec3(0., .862, .507);
// A point on Earth: thicker towards the landing spot and thinning smoothly outwards, so the dive stays dense.
vec3 earthDir(vec4 r){
  if(r.x < .2) return sph(r.yz);
  vec3 side = normalize(cross(LANDING, vec3(1., 0., 0.))), up = cross(side, LANDING);
  float ang = r.y*TAU, rad = 1.1*sqrt(r.z)*(.25 + .75*r.w);
  return normalize(LANDING*cos(rad) + (side*cos(ang) + up*sin(ang))*sin(rad));
}
vec3 earth(vec4 r, float t, out vec3 col, out float a){
  vec3 n = earthDir(r); vec3 local = rotY(n, t*.01);
  float land = smoothstep(.45, .51, fbm(local*3.2 + 7.) + .15*(fbm(local*60.) - .5));
  float cloud = smoothstep(.58, .72, fbm(local*6. + t*.02) + .2*(fbm(local*90. + t*.05) - .5));
  float light = .3 + .7*max(0., dot(n, normalize(vec3(-.3, .8, .5))));
  vec3 p = EARTH_C + n*EARTH_R*(1. + cloud*.004);
  col = mix(mix(BLUE*.35, DEEP*.6, .4), mix(MINT, vec3(.5,.8,.45), .5), land);
  col = mix(col, WHITE, cloud*.75)*light;
  float rim = 1. - abs(dot(n, normalize(uEye - p)));
  col = mix(col, BLUE, pow(rim, 4.)*.6);
  a = (.2 + .45*land + .5*cloud)*(.5 + .7*light)*(1. - .97*hidden(p, EARTH_C, EARTH_R));
  return p;
}

vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 5.), q = rnd(s, 11.);
  float yaw = sin(t*.3)*.1 + uWave*.12;
  gEye = rotY(uEye - uOffset, -yaw);
  if(s.x < .06){ vec3 n = sph(r.yz); col = WHITE; a = .15 + .35*r.w*r.w; return uEye + n*5000.; } // stars
  if(s.x < .1) return swoosh(0., r, q, t, uPull, uSwoosh, uAspect, col, a);
  if(s.x < .12) return swoosh(1., r, q, t, uPull, uSwoosh, uAspect, col, a);
  if(s.x < .14) return swoosh(2., r, q, t, uPull, uSwoosh, uAspect, col, a);
  if(s.x < .27) return earth(r, t, col, a);
  gSize = uDot;
  vec3 p; float close = 1.;
  if(s.x < .5) p = helmet(r, q, (s.x - .27)/.23, col, a);
  else if(s.x < .54) p = head(r, col, a);
  else if(s.x < .58) p = lamp(r, q, col, a);
  else { p = suit(r, q, t, col, a); close = 0.; }
  // Up close the helmet needs extra light to read; the suit only a little, so it stays quiet.
  a *= mix(1. + (uGain - 1.)*.25, uGain, close);
  // A slow floating sway, then the drift away into space
  p = rotY(p, yaw) + uOffset + vec3(0., sin(t*.6)*1.5, 0.);
  return p;
}
`;

export const ASTRONAUT_VERTEX = HEADER + COMMON + SCENE;
