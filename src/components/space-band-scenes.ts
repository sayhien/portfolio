// Shader code for the space bands in the middle of the case studies. Each band
// tells one idea from its case study as a short film: the story plays once
// when the band scrolls into view (uT counts seconds since then), then the
// scene settles into a calm loop. The cameras and the renderer live in
// space-band.ts; the shared particle helpers come from case-sky-scenes.ts.
import { COMMON, HEADER } from './case-sky-scenes';

// ---------------------------------------------------------------- AI Chatbot, page structure
// A space station modelled on China's Tiangong, built module by module in the
// same order as the page's eight sections, over a slowly turning Earth.
const STATION = HEADER + COMMON + `
const float EARTH_R = 6000.;
const vec3 EARTH_C = vec3(0., -6650., -400.);
const float FIRST_DOCK = 1.5, DOCK_GAP = 1.25, DOCK_TIME = 1.4, LIGHTS_ON = 12.4;
float dockStart(float k){ return FIRST_DOCK + k*DOCK_GAP; }
float docked(float k, float t){ return ease((t - dockStart(k))/DOCK_TIME); }
// A cylinder from a to b with the given radius, as a shell of particles.
vec3 tube(vec4 r, vec3 a, vec3 b, float rad){
  vec3 ax = normalize(b - a); vec3 side = normalize(cross(ax, abs(ax.y) > .9 ? vec3(1.,0.,0.) : vec3(0.,1.,0.))); vec3 up = cross(ax, side);
  float ang = r.y*TAU; return mix(a, b, r.z) + (side*cos(ang) + up*sin(ang))*rad;
}
// A flat solar wing from the root, out along dir, with a grid of cells.
vec3 wing(vec4 r, vec3 root, vec3 dir, vec3 across, float len, float wid, out float cell){
  float u = r.y, v = r.z - .5;
  cell = step(.08, fract(u*14.))*step(.12, fract((v + .5)*3.));
  return root + dir*u*len + across*v*wid;
}
vec3 station(vec4 r, vec4 q, float t, out vec3 col, out float a){
  float k = floor(r.x*8.), d = docked(k, t), lit = ease((t - LIGHTS_ON)/1.5);
  float appear = smoothstep(dockStart(k) - .4, dockStart(k) + .2, t);
  vec3 p; vec3 from = vec3(0.); float cell = 1.;
  // modules are shaded round their length, lit from one side, so they read as cylinders
  float shade = .3 + .7*max(0., cos(q.y*TAU - 2.));
  col = mix(CREAM, WHITE, q.x*.5)*(.55 + .6*shade); a = .05 + .07*shade;
  if(k < .5){ // Tianhe, the core module, with a node at the front
    p = q.w < .8 ? tube(q, vec3(-120.,0.,0.), vec3(56.,0.,0.), q.z < .45 ? 19. : 14.) : vec3(72.,0.,0.) + sph(q.xy)*14.;
    from = vec3(-900., 300., 0.);
  } else if(k < 1.5){ // its two solar wings unfold
    float side = step(.5, q.w)*2. - 1.; float open = ease((t - dockStart(1.))/1.2);
    p = wing(q, vec3(-85., side*20., 0.), vec3(0., side, 0.), vec3(1.,0.,0.), 150.*open, 34., cell);
    col = mix(BLUE*.7, CREAM, 1. - cell); a = .09*(open > .02 ? 1. : 0.);
  } else if(k < 2.5 || (k > 3.5 && k < 4.5)){ // Wentian and Mengtian, the two labs, either side of the node
    float side = k < 2.5 ? 1. : -1.;
    p = tube(q, vec3(72., 0., side*16.), vec3(72., 0., side*196.), 16.);
    from = vec3(72., 60., side*900.);
  } else if(k < 3.5 || k > 4.5 && k < 5.5){ // the labs' long wings at their far ends
    float side = k < 3.5 ? 1. : -1.; float dir = step(.5, q.w)*2. - 1.; float open = ease((t - dockStart(k))/1.2);
    p = wing(q, vec3(72. + dir*18., 0., side*186.), vec3(dir, 0., 0.), normalize(vec3(0., 1., .5)), 240.*open, 44., cell);
    col = mix(BLUE*.75, YELLOW*.8, (1. - cell)*.6); a = .09*(open > .02 ? 1. : 0.);
  } else if(k < 6.5){ // Shenzhou, the crew ship, docks at the front
    p = q.w < .75 ? tube(q, vec3(88.,0.,0.), vec3(150.,0.,0.), 9.) : wing(q, vec3(130., 0., 0.), vec3(0., step(.87, q.w)*2. - 1., 0.), vec3(1.,0.,0.), 46., 12., cell);
    from = vec3(900., 40., 0.);
  } else { // Tianzhou, the cargo ship, docks at the back
    p = q.w < .75 ? tube(q, vec3(-124.,0.,0.), vec3(-205.,0.,0.), 12.) : wing(q, vec3(-180., 0., 0.), vec3(0., step(.87, q.w)*2. - 1., 0.), vec3(1.,0.,0.), 60., 14., cell);
    from = vec3(-1000., -60., 0.);
  }
  p += from*(1. - d)*(1. - d); // wings have no approach, so from is zero for them
  a *= appear;
  // Window lights and a soft glow once the whole page is built
  float window = step(.985, h1(floor(r.y*90.) + k*17.)) * (k == 1. || k == 3. || k == 5. ? 0. : 1.);
  col = mix(col, mix(MINT, YELLOW, h1(k)), window*lit); a = max(a, window*lit*(.4 + .2*sin(t*4. + q.x*20.)));
  a *= .85 + .3*lit;
  return p;
}
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 31.), q = rnd(s, 37.);
  if(s.x < .07){ col = WHITE; a = .35; return sph(r.xy)*(5000. + r.z*2000.); }
  if(s.x < .4){ // Earth below, turning slowly: a cap of land and sea
    float y = 1. - r.x*.16; float ang = r.y*TAU; float q2 = sqrt(max(0., 1. - y*y));
    vec3 n = vec3(q2*cos(ang), y, q2*sin(ang)); vec3 local = rotY(rotX(n, t*.004), .3);
    float land = smoothstep(.5, .55, fbm(local*9. + 2.));
    float glowSide = .45 + .55*max(0., dot(n, normalize(vec3(-.4,.8,.3))));
    col = mix(BLUE*.5, mix(DEEP, MINT, .7), land)*glowSide; a = (land > .5 ? .6 : .22)*glowSide;
    return EARTH_C + n*EARTH_R;
  }
  if(s.x < .45){ // the thin bright air along the horizon
    float y = 1. - r.x*.16; float ang = r.y*TAU; float q2 = sqrt(max(0., 1. - y*y));
    vec3 n = vec3(q2*cos(ang), y, q2*sin(ang));
    col = mix(BLUE, MINT, r.z); a = .12*(1. - r.w); return EARTH_C + n*EARTH_R*(1.006 + r.w*.01);
  }
  if(s.x < .95) return station(r, q, t, col, a);
  // A ring of light at each docking port the moment a module locks on, and a beacon when all is built
  float k = floor(r.x*8.); float e = t - dockStart(k) - DOCK_TIME;
  vec3 port = k < .5 ? vec3(-30.,0.,0.) : k < 1.5 ? vec3(-85.,0.,0.) : k < 2.5 ? vec3(72.,0.,16.) : k < 3.5 ? vec3(72.,0.,186.) : k < 4.5 ? vec3(72.,0.,-16.) : k < 5.5 ? vec3(72.,0.,-186.) : k < 6.5 ? vec3(88.,0.,0.) : vec3(-124.,0.,0.);
  float ang = r.y*TAU; float rad = 18. + max(0., e)*70.;
  col = mix(MINT, WHITE, r.z); a = e > 0. ? .4*exp(-e*2.2) : 0.;
  if(r.w > .7){ float lit = t - LIGHTS_ON; float pulse = fract(max(0., lit)*.35); a = lit > 0. ? .18*(1. - pulse) : 0.; rad = 60. + pulse*520.; port = vec3(0.); col = MINT; }
  return port + sph(r.yz)*rad;
}`;

// ---------------------------------------------------------------- Remittance, priority pain points
// A swarm of meteorites sweeps from right to left and crashes into a planet.
// Most are dull rocks that leave a small puff. Four of them, the priority pain
// points, burn brightly on the way in and flash as they hit.
const METEORS = HEADER + COMMON + `
const vec3 PLANET = vec3(-650., -60., -300.);
const float PLANET_R = 320., ROCKS = 28.;
bool isPriority(float m){ return m < 4.; }
float startOf(float m){ return isPriority(m) ? 1.5 + m*1.7 : .3 + h1(m*3.7)*7.; }
float travelOf(float m){ return 2.7 - h1(m*5.3)*.6; }
vec3 launchOf(float m){ return vec3(1500. + h1(m*1.9)*500., (h1(m*2.7) - .5)*700., -300. + (h1(m*4.1) - .5)*900.); }
vec3 hitNormal(float m){ return normalize(vec3(1., (h1(m*6.1) - .5)*1.3, (h1(m*7.9) - .5)*1.3)); }
// The planet shudders after each big impact: knocked back, then wobbling as it settles.
vec3 planetAt(float t){
  vec3 shift = vec3(0.);
  for(int k = 0; k < 4; k++){
    float m = float(k), e = t - startOf(m) - travelOf(m);
    if(e > 0.) shift -= hitNormal(m)*(16.*sin(e*24.)*exp(-e*3.2) + 22.*e*exp(-e*1.6));
  }
  return PLANET + shift;
}
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 41.), q = rnd(s, 43.);
  if(s.x < .14){ col = r.z < .8 ? WHITE : BLUE; a = .1 + .4*r.w*r.w; return sph(r.xy)*(5000. + r.z*2000.); }
  vec3 P = planetAt(t);
  if(s.x < .46) return world(r, P, PLANET_R, t*.04, 2., CREAM*.3, BLUE*.55, col, a);
  if(s.x < .5){ // its thin air, brightest on the lit edge
    vec3 n = sph(r.xy); vec3 p = P + n*PLANET_R*(1.01 + r.z*r.z*.05);
    col = mix(BLUE, MINT, r.w); a = .06*(1. - r.z)*(1. - .9*hidden(p, P, PLANET_R)); return p;
  }
  float m = floor(r.x*ROCKS); bool hot = isPriority(m);
  float start = startOf(m), travel = travelOf(m), u = (t - start)/travel;
  vec3 from = launchOf(m), aim = planetAt(start + travel) + hitNormal(m)*PLANET_R, hit = P + hitNormal(m)*PLANET_R;
  if(s.x < .86){ // the rocks and their trails, speeding up as they fall in
    if(u < 0. || u > 1.){ a = 0.; col = WHITE; return vec3(0.); }
    float v = mix(u, u*u, .55);
    if(r.y < .5){ // the rock itself: a lumpy cluster, glowing only for the four that matter
      float size = hot ? 19. : 3. + h1(m*8.3)*4.;
      vec3 p = mix(from, aim, v) + ball(q.xyz)*size*(.75 + .25*sin(q.w*20.));
      col = hot ? mix(YELLOW, WHITE, q.x*.6) : mix(GREY*.6, CREAM*.5, q.x);
      a = hot ? .5 + .5*u : .14; gSize = hot ? 1.4 : 1.; return p;
    }
    float back = (r.y - .5)*2.*(hot ? .22 : .06); // the trail behind it, long for the bright ones
    vec3 p = mix(from, aim, max(0., v - back)) + ball(q.xyz)*(hot ? 3. + back*50. : 1.);
    col = hot ? mix(YELLOW, ORANGE, back*5.) : GREY*.5;
    a = (hot ? .55*(.4 + .6*u) : .06)*(1. - (r.y - .5)*2.); return p;
  }
  // What happens on impact: a bright flash, sparks and a glowing crater for the four, a small puff for the rest
  float e = t - start - travel;
  vec3 n = hitNormal(m); vec3 tg = normalize(cross(n, vec3(0., 1., 0.))), bt = cross(n, tg);
  if(e < 0. || e > (hot ? 3.5 : .8)){ a = 0.; col = WHITE; return vec3(0.); }
  if(!hot){ col = CREAM*.6; a = .12*exp(-e*5.); return hit + (n*.6 + sph(q.xy)*.5)*(4. + e*40.)*q.z; }
  if(r.y < .35){ // sparks thrown up and outward
    vec3 dir = normalize(n*1.2 + sph(q.xy)*.9); col = mix(YELLOW, ORANGE, q.z);
    a = .8*exp(-e*2.2); return hit + dir*(30. + e*240.*q.w);
  }
  if(r.y < .7){ // a ring of light racing across the surface
    float ang = q.x*TAU, spread = .03 + e*.3;
    vec3 dir = normalize(n*cos(spread) + (tg*cos(ang) + bt*sin(ang))*sin(spread));
    col = mix(WHITE, YELLOW, q.y); a = .6*exp(-e*1.4); return P + dir*PLANET_R*1.01;
  }
  // the crater: a white flash at first, then an orange glow that slowly fades
  float flash = exp(-e*7.); col = mix(mix(ORANGE, YELLOW, q.y), WHITE, flash); a = .7*exp(-e*.9);
  return hit + ball(q.xyz)*(24. + flash*40.);
}`;

// ---------------------------------------------------------------- Healthcare report, usability test plan
// The alien craft flies a test course through five glowing rings, one per task.
// The path here must match pathAt() in space-band.ts.
const RINGS = HEADER + COMMON + `
uniform float uCraftU;
const float RING_R = 74.;
vec3 pathAt(float u){ return vec3(mix(-1000., 1000., u), sin(u*TAU)*140., -sin(u*PI*1.3)*380. + 120.); }
vec3 tangentAt(float u){ return normalize(pathAt(u + .003) - pathAt(u - .003)); }
float ringU(float i){ return .14 + i*.18; }
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 47.), q = rnd(s, 53.);
  if(s.x < .14){ col = WHITE; a = .25; return dust(r, t*.3); }
  if(s.x < .66){ // the five rings: dim, lit as the craft passes through, then dim again
    float i = floor(r.x*5.); float ru = ringU(i); vec3 c = pathAt(ru);
    vec3 tg = tangentAt(ru); vec3 sd = normalize(cross(tg, vec3(0.,1.,0.))); vec3 up = cross(sd, tg);
    float passed = uCraftU - ru; float lit = passed >= 0. ? exp(-passed*12.) : smoothstep(-.05, 0., passed);
    float ang = r.y*TAU + t*(.25 + i*.05); float rad = RING_R*(1. + (r.z - .5)*.08);
    col = mix(BLUE*.7, MINT, lit); a = mix(.016, .24, lit)*(.6 + .4*step(.5, fract(r.y*24.)));
    gSize = 1. + lit*.5;
    return c + (sd*cos(ang) + up*sin(ang))*rad;
  }
  if(s.x < .7){ // the course as a very faint dotted line
    float u = r.x; col = BLUE*.6; a = .03*step(.6, fract(u*160.)); return pathAt(u) + ball(r.yzw)*2.;
  }
  if(s.x < .9){ // two long, thin contrails, like a fighter jet's
    if(uCraftU < .001){ a = 0.; col = WHITE; return vec3(0.); }
    float v = r.x*.26; float u = max(0., uCraftU - v);
    vec3 tg = tangentAt(u); vec3 sd = normalize(cross(tg, vec3(0.,1.,0.)));
    float engine = step(.5, r.y)*2. - 1.;
    vec3 p = pathAt(u) + sd*engine*(9. + r.x*10.) - vec3(0., 4., 0.);
    col = mix(WHITE, mix(MINT, BLUE, r.x), min(1., r.x*2.5));
    a = .3*pow(1. - r.x, 1.6); gSize = 1.;
    return p + ball(q.xyz)*(.5 + r.x*3.);
  }
  vec3 here = pathAt(uCraftU), ahead = tangentAt(uCraftU);
  vec3 sp = saucer(q, t, 0., 0., col, a);
  float heading = atan(ahead.x, ahead.z);
  sp = rotY(rotX(sp, -ahead.y*.8), heading - PI*.5);
  gSize = 1.; a *= .26;
  return here + sp*1.9;
}`;

// ---------------------------------------------------------------- Design library, component creation criteria
// The same twelve stars glide into one zodiac figure after another. The same
// components make every layout. Star places and lines come from space-band.ts.
const ZODIAC = HEADER + COMMON + `
uniform vec3 uStar[12];
uniform vec3 uSegA[13], uSegB[13];
uniform float uSegShow[13];
uniform float uStarShow; // the current set of stars fading in, holding, then dimming away
vec3 starTone(float k){ float m = mod(k, 4.); return m < 1. ? MINT : m < 2. ? mix(BLUE, WHITE, .4) : m < 3. ? YELLOW : WHITE; }
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 59.), q = rnd(s, 61.);
  if(s.x < .3){ // a deep field of stars at many distances, so the camera's moves show depth
    vec3 p = vec3((r.x - .5)*4200., (r.y - .5)*2600., -400. - r.z*3200.);
    col = r.w < .75 ? WHITE : (r.w < .9 ? BLUE : MINT); a = .1 + .5*q.x*q.x*(.6 + .4*sin(t*(1. + q.y*2.) + q.z*30.));
    return p;
  }
  if(s.x < .5){ // a soft band of nebula behind the figures
    vec3 p = vec3((r.x - .5)*3600., (r.y - .5)*500. + sin(r.x*6.)*200., -900. - r.z*900.);
    float cloud = fbm(p*.002 + vec3(0., 0., t*.02));
    col = mix(BLUE*.6, mix(MINT, YELLOW, .3), cloud); a = .07*smoothstep(.4, .75, cloud); return p;
  }
  if(s.x < .78){ // the twelve stars: like the background stars, only a touch brighter, with a faint halo
    float k = floor(r.x*12.); vec3 c = uStar[int(k)];
    col = mix(WHITE, starTone(k), .35);
    if(r.y < .08){ a = .06*uStarShow; gSize = 1.3; return c + ball(q.xyz)*2.5; }
    if(r.y < .45){ a = .012*(1. - q.x)*uStarShow; return c + ball(q.xyz)*(5. + q.x*12.); }
    // the rest join the background field
    col = WHITE; a = .05 + .25*q.x*q.x; return vec3((q.y - .5)*4200., (q.z - .5)*2600., -400. - q.w*3200.);
  }
  // The lines that join the stars into a figure, drawn in as each figure forms
  float j = floor(r.x*13.); int ji = int(j);
  float v = r.y; float show = uSegShow[ji];
  vec3 p = mix(uSegA[ji], uSegB[ji], v*min(1., show*1.6));
  col = mix(MINT, WHITE, .3); a = .25*clamp(show, 0., 1.)*uStarShow*step(.25, fract(v*40.));
  return p + ball(q.xyz)*1.2;
}`;

// ---------------------------------------------------------------- Breadcrumb, impact effort matrix
// Quartz crystals stick out of a moon's surface here and there, twinkling. The
// biggest, brightest one sits right in front of a rover, and its robotic arm
// easily lifts it into the rover's bed: high impact, low effort.
const CRYSTALS = HEADER + COMMON + `
const vec3 SHOULDER = vec3(58., 80., 0.), REST = vec3(30., 150., 0.), BED = vec3(-30., 46., 0.);
const float UPPER = 88., FORE = 88., PICK = .8, SITES = 9.;
// Crystal clusters: where they grow, how big they are, and whether they glow.
vec3 site(float i){
  return i < .5 ? vec3(185., 0., 12.) : i < 1.5 ? vec3(-160., 0., 130.) : i < 2.5 ? vec3(70., 0., -170.) : i < 3.5 ? vec3(320., 0., -210.) :
         i < 4.5 ? vec3(-310., 0., -190.) : i < 5.5 ? vec3(260., 0., 230.) : i < 6.5 ? vec3(-60., 0., 250.) : i < 7.5 ? vec3(-420., 0., 60.) : vec3(450., 0., 40.);
}
float sizeOf(float i){ return i < .5 ? 62. : 18. + h1(i*4.7)*22.; }
bool glows(float i){ return i < .5 || h1(i*9.1) > .55; }
float ground(vec2 xz){ return fbm(vec3(xz*.004, 0.))*24. - 8.; }
// Where the hand is: reach over the crystal, grip it, lift, swing back over the cab, lower it into the bed, fold away.
vec3 handAt(float t){
  vec3 c = site(0.) + vec3(0., 34., 0.), over = c + vec3(-20., 80., 0.), drop = BED + vec3(0., 70., 0.);
  float u = t - PICK;
  if(u < 0.) return REST;
  if(u < 1.1) return mix(REST, over, ease(u/1.1));
  if(u < 1.5) return mix(over, c, ease((u - 1.1)/.4));
  if(u < 1.8) return c;
  if(u < 2.4) return mix(c, over, ease((u - 1.8)/.6));
  if(u < 3.6) return mix(over, drop, ease((u - 2.4)/1.2));
  if(u < 4.) return mix(drop, BED + vec3(0., 40., 0.), ease((u - 3.6)/.4));
  if(u < 4.2) return BED + vec3(0., 40., 0.);
  return mix(BED + vec3(0., 40., 0.), REST, ease((u - 4.2)/1.));
}
bool gripping(float t){ float u = t - PICK; return u > 1.4 && u < 4.1; }
// Two segment arm: the elbow keeps both segments their length, bending upward.
vec3 elbowFor(vec3 hand){
  vec3 d = hand - SHOULDER; float len = clamp(length(d), 10., UPPER + FORE - 1.); vec3 dir = normalize(d);
  float along = (UPPER*UPPER - FORE*FORE + len*len)/(2.*len); float lift = sqrt(max(0., UPPER*UPPER - along*along));
  vec3 side = normalize(cross(dir, vec3(0., 0., 1.)) + vec3(0., .0001, 0.)); vec3 pole = normalize(cross(dir, side));
  if(pole.y < 0.) pole = -pole;
  return SHOULDER + dir*along + pole*lift;
}
// Where a cluster's base is: the big one travels with the gripper, then rests in the bed.
vec3 baseOf(float i, float t){
  if(i > .5) return site(i);
  float u = t - PICK;
  if(u < 1.5) return site(0.);
  if(u < 4.1) return handAt(t) - vec3(0., 34., 0.);
  return BED;
}
// One quartz point: a six sided column with a pointed tip, tilted out of the ground.
vec3 quartz(vec4 q, vec3 base, vec3 axis, float len, float wid, out float edge){
  vec3 side = normalize(cross(axis, vec3(0., 0., 1.)) + vec3(.0001)); vec3 fwd = cross(axis, side);
  float v = q.y*1.1 - .1; // a little of it is buried
  float rad = v < .78 ? wid : wid*max(0., 1. - (v - .78)/.22);
  float k = floor(q.z*6.), f = fract(q.z*6.);
  vec2 c0 = vec2(cos(k/6.*TAU), sin(k/6.*TAU)), c1 = vec2(cos((k + 1.)/6.*TAU), sin((k + 1.)/6.*TAU));
  vec2 hex = mix(c0, c1, f)*rad;
  edge = 1. - min(f, 1. - f)*2.; // 1 on the column's edges, 0 mid face
  return base + axis*v*len + side*hex.x + fwd*hex.y;
}
vec3 box(vec4 q, vec3 lo, vec3 hi){ // particles on the faces of a box
  vec3 p = mix(lo, hi, q.xyz); float f = floor(q.w*3.); float side = step(.5, fract(q.w*3.));
  if(f < .5) p.x = mix(lo.x, hi.x, side); else if(f < 1.5) p.y = mix(lo.y, hi.y, side); else p.z = mix(lo.z, hi.z, side);
  return p;
}
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 67.), q = rnd(s, 71.);
  if(s.x < .07){ vec3 n = sph(r.xy); n.y = abs(n.y); col = WHITE; a = .1 + .35*r.z*r.z; return n*5000.; } // stars over the horizon
  if(s.x < .4){ // the moon's surface in faint rows of dust, lit softly around the big crystal
    vec2 xz = (r.xy - .5)*2600.; float y = ground(xz); vec3 p = vec3(xz.x, y, xz.y);
    float row = step(.55, fract(xz.x*.05 + fbm(vec3(xz*.01, 1.))*2.));
    vec3 big = baseOf(0., t); float d = length(p - big); float spill = exp(-d*d/9000.);
    col = mix(mix(GREY*.6, BLUE*.5, r.z), MINT, spill); a = (.1 + .1*row + .3*spill)*(1. - smoothstep(900., 1300., length(xz)));
    return p;
  }
  if(s.x < .56){ // the rover: chassis, cab, open bed, six wheels and headlights
    col = mix(GREY, WHITE, r.w*.4); a = .06;
    if(r.x < .3) return box(q, vec3(-75., 18., -34.), vec3(75., 46., 34.));
    if(r.x < .45) return box(q, vec3(40., 46., -30.), vec3(75., 76., 30.));
    if(r.x < .65){ vec3 p = box(q, vec3(-75., 46., -34.), vec3(20., 66., 34.)); if(p.y > 65.) p.y = 46.; return p; }
    if(r.x < .9){
      float w = floor(q.x*6.); float wx = -52. + mod(w, 3.)*52., wz = w < 2.5 ? 40. : -40.; float ang = q.y*TAU;
      float rr = q.z < .7 ? 17. : 17.*q.z; col = GREY*.5; a = .08;
      return vec3(wx + cos(ang)*rr, 17. + sin(ang)*rr, wz + (q.w - .5)*8.);
    }
    col = YELLOW; a = .5; return vec3(76., 58., (step(.5, q.x)*2. - 1.)*20.) + ball(q.yzw)*3.;
  }
  if(s.x < .64){ // the robotic arm, mounted on top of the cab, with a three claw gripper
    vec3 hand = handAt(t), elbow = elbowFor(hand);
    col = mix(CREAM, WHITE, r.w); a = .035;
    if(r.x < .42) return mix(SHOULDER, elbow, r.y) + ball(q.xyz)*4.;
    if(r.x < .8) return mix(elbow, hand, r.y) + ball(q.xyz)*3.;
    if(r.x < .9){ col = YELLOW; a = .4; return (r.y < .5 ? elbow : SHOULDER) + ball(q.xyz)*3.; }
    float claw = floor(r.y*3.); float ang = claw/3.*TAU;
    vec3 out_ = vec3(cos(ang), 0., sin(ang))*(gripping(t) ? 13. : 20.);
    return hand + out_ - vec3(0., r.z*22., 0.);
  }
  // The quartz clusters: several pointed columns each, tilted out of the ground, with twinkling glints
  float i = floor(r.x*SITES); vec3 base = baseOf(i, t); float size = sizeOf(i); bool lit = glows(i);
  float k = floor(r.w*5.); float tilt = k < .5 ? 0. : .25 + h1(k + i*7.)*.45, phi = h1(k*3.1 + i*5.)*TAU;
  vec3 axis = normalize(vec3(cos(phi)*tilt, 1., sin(phi)*tilt));
  float len = size*(k < .5 ? 1. : .45 + h1(k*1.7 + i)*.4), wid = len*.17;
  float edge; vec3 p = quartz(q, base + vec3(cos(phi), 0., sin(phi))*(k < .5 ? 0. : wid*1.5), axis, len, wid, edge);
  vec3 tone = lit ? MINT : mix(BLUE, CREAM, .5)*.8;
  col = mix(tone*.7, WHITE, edge*.5 + q.y*.3); a = (lit ? .05 : .025) + (lit ? .1 : .05)*edge;
  if(i < .5) a *= 1.3;
  // glints: a few specks flash brightly now and then
  if(q.x > .985){ float glint = pow(.5 + .5*sin(t*(2. + q.w*3.) + q.z*40.), 12.); col = WHITE; a = .9*glint; gSize = 1. + 1.6*glint; }
  return p;
}`;

export const BAND_SHADERS = { station: STATION, meteors: METEORS, rings: RINGS, zodiac: ZODIAC, crystals: CRYSTALS };
export type BandName = keyof typeof BAND_SHADERS;
