// Shader code for the space bands in the middle of the case studies. Each band
// tells one idea from its case study as a short film: the story plays once
// when the band scrolls into view (uT counts seconds since then), then the
// scene settles into a calm loop. The cameras and the renderer live in
// space-band.ts; the shared particle helpers come from case-sky-scenes.ts.
import { COMMON, HEADER } from './case-sky-scenes';
import { CAKE_GLSL } from './cake-shader';

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

// ---------------------------------------------------------------- Breadcrumb, impact effort matrix
// Quartz crystals stick out of a moon's surface here and there, twinkling, with
// little ones littering the ground. The three biggest, brightest ones sit in front
// of a rover, and its robotic arm works each one free in turn and lifts it into the
// rover's bed: high impact, low effort.
const CRYSTALS = HEADER + COMMON + `
// The arm rests folded to one side, so it never has to pass straight over its own base.
const vec3 SHOULDER = vec3(58., 80., 0.), REST = vec3(58., 150., 70.), BED = vec3(-30., 46., 0.);
const float UPPER = 88., FORE = 88., PICK = .8, BIG = 12., LITTLE = 70., PICKS = 3.;
// One pick, in seconds after its start: reach, grip, three ever harder tugs, the crystal pops free, then into the bed.
// The next pick starts the moment the last one is let go, which is CYCLE seconds after it began.
const float GRIP = 1.4, POP = 2.9, LIFTED = 3.2, OVER = 3.7, SWUNG = 4.5, LOWERED = 4.8, LET_GO = 5.0, CYCLE = 5.0, FOLDED = 6.0;
// Where the big crystal clusters grow. The first three are the ones the arm picks.
vec3 site(float i){
  return i < .5 ? vec3(185., 0., 12.) : i < 1.5 ? vec3(170., 0., -95.) : i < 2.5 ? vec3(150., 0., 95.) : i < 3.5 ? vec3(285., 0., 45.) :
         i < 4.5 ? vec3(-160., 0., 130.) : i < 5.5 ? vec3(70., 0., -170.) : i < 6.5 ? vec3(320., 0., -210.) : i < 7.5 ? vec3(-310., 0., -190.) :
         i < 8.5 ? vec3(260., 0., 230.) : i < 9.5 ? vec3(-60., 0., 250.) : i < 10.5 ? vec3(-420., 0., 60.) : vec3(450., 0., 40.);
}
float ground(vec2 xz){ return fbm(vec3(xz*.004, 0.))*24. - 8.; }
// Little crystals litter the ground between the big ones, never under the rover.
vec3 litterSite(float j){
  vec2 xz = vec2(h1(j*3.7) - .35, h1(j*5.3) - .5)*vec2(1300., 820.);
  if(abs(xz.x) < 120. && abs(xz.y) < 75.) xz.x += 260.;
  return vec3(xz.x, ground(xz) - 1., xz.y);
}
// Cluster i: the big ones first (0 to BIG - 1), then the little litter.
vec3 anySite(float i){ return i < BIG - .5 ? site(i) : litterSite(i - BIG); }
float sizeOf(float i){
  return i < .5 ? 62. : i < 1.5 ? 50. : i < 2.5 ? 46. : i < 3.5 ? 40. : i < BIG - .5 ? 14. + h1(i*4.7)*14. : 5. + h1(i*4.7)*9.;
}
bool glows(float i){ return i < 3.5 || h1(i*9.1) > .55; }
// Which pick the arm is on, and how many seconds into it.
float pickOf(float t){ return clamp(floor((t - PICK)/CYCLE), 0., PICKS - 1.); }
float sinceStart(float i, float t){ return t - PICK - i*CYCLE; }
vec3 bedSpot(float i){ return BED + vec3(i < .5 ? 10. : i < 1.5 ? -22. : -52., 0., i < .5 ? -12. : i < 1.5 ? 14. : -8.); }
float gripHeight(float i){ return sizeOf(i)*.55; }
// The tugs: each a short heave, stronger than the last, and stronger again for each bigger stand. Returns how far the hand lifts.
float tug(float u, float i){
  if(u < GRIP || u > POP) return 0.;
  float k = floor((u - GRIP)/.5), f = fract((u - GRIP)/.5);
  return (5. + k*4.)*(1. + i*.25)*max(0., sin(PI*f));
}
// The ground trembles a little while the arm strains, and shakes each time a crystal tears free.
float tremor(float t){
  float shake = 0.;
  for(float i = 0.; i < PICKS; i++){
    float u = sinceStart(i, t), e = u - POP;
    shake += (tug(u, i) > 0. ? .8*sin(u*55.) : 0.) + (e > 0. ? 5.*exp(-e*3.5)*sin(e*38.) : 0.);
  }
  return shake;
}
// Where the hand is through the three picks.
vec3 handAt(float t){
  float i = pickOf(t), u = sinceStart(i, t), gh = gripHeight(i);
  vec3 c = site(i) + vec3(0., gh, 0.), over = c + vec3(-20., 80., 0.), drop = bedSpot(i) + vec3(0., 70., 0.), low = bedSpot(i) + vec3(0., 40., 0.);
  vec3 from = i < .5 ? REST : bedSpot(i - 1.) + vec3(0., 40., 0.);
  float swing = site(i).z < 0. ? -70. : 70.;
  if(t < PICK) return REST;
  if(u < 1.) return mix(from, over, ease(u));
  if(u < GRIP) return mix(over, c, ease((u - 1.)/(GRIP - 1.)));
  if(u < POP) return c + vec3(0., tug(u, i), 0.);
  if(u < LIFTED) return mix(c, c + vec3(0., 30., 0.), 1. - pow(1. - (u - POP)/(LIFTED - POP), 3.)); // it pops free
  if(u < OVER) return mix(c + vec3(0., 30., 0.), over, ease((u - LIFTED)/(OVER - LIFTED)));
  if(u < SWUNG){ float k = ease((u - OVER)/(SWUNG - OVER)); return mix(over, drop, k) + vec3(0., 0., sin(k*PI)*swing); } // swing round the side
  if(u < LOWERED) return mix(drop, low, ease((u - SWUNG)/(LOWERED - SWUNG)));
  if(u < LET_GO) return low;
  return mix(low, REST, ease((u - LET_GO)/(FOLDED - LET_GO)));
}
bool gripping(float t){ float u = sinceStart(pickOf(t), t); return u > GRIP - .1 && u < LET_GO - .1; }
// Two segment arm on a turning base: the base faces the hand, and within that
// upright plane the elbow always bends upward, so it moves smoothly.
vec3 elbowFor(vec3 hand){
  vec3 d = hand - SHOULDER; vec2 across = d.xz; float reach = max(length(across), .001); vec2 facing = across/reach;
  vec2 d2 = vec2(reach, d.y); float len = clamp(length(d2), 10., UPPER + FORE - 1.); vec2 dir = d2/length(d2);
  float along = (UPPER*UPPER - FORE*FORE + len*len)/(2.*len); float lift = sqrt(max(0., UPPER*UPPER - along*along));
  vec2 e = dir*along + vec2(-dir.y, dir.x)*lift;
  return SHOULDER + vec3(facing.x*e.x, e.y, facing.y*e.x);
}
// Where a cluster's base is. A picked one barely budges while it is tugged, tears
// free, rides in the gripper, then rests in the bed. Everything else on the ground trembles.
vec3 baseOf(float i, float t){
  vec3 shake = vec3(0., tremor(t), 0.);
  if(i > PICKS - .5) return anySite(i) + shake;
  float u = sinceStart(i, t);
  if(u < GRIP) return site(i) + shake;
  if(u < POP) return site(i) + vec3(sin(u*31.)*1.5, tug(u, i)*.25, 0.);
  if(u < LET_GO) return handAt(t) - vec3(0., gripHeight(i), 0.);
  return bedSpot(i);
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
    vec2 xz = (r.xy - .5)*2600.; float y = ground(xz) + tremor(t)*exp(-length(xz - site(0.).xz)/400.); vec3 p = vec3(xz.x, y, xz.y);
    if(r.w > .97){ // a puff of dust bursts from the hole each time a crystal tears free
      float j = min(floor(r.z*PICKS), PICKS - 1.); float e = sinceStart(j, t) - POP; col = mix(GREY, CREAM, q.x)*.8; a = e > 0. && e < 1.6 ? .22*exp(-e*2.2) : 0.;
      return site(j) + normalize(vec3(q.x - .5, .8 + q.y, q.z - .5))*(10. + max(0., e)*90.*q.w) - vec3(0., max(0., e)*max(0., e)*30., 0.);
    }
    float row = step(.55, fract(xz.x*.05 + fbm(vec3(xz*.01, 1.))*2.));
    float spill = 0.;
    for(float j = 0.; j < PICKS; j++){ vec3 d = p - baseOf(j, t); spill = max(spill, exp(-dot(d, d)/9000.)); }
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
  // Most particles go to the big clusters, the rest are shared among the little litter.
  float i = r.x < .62 ? floor(r.x/.62*BIG) : BIG + min(floor((r.x - .62)/.38*LITTLE), LITTLE - 1.);
  vec3 base = baseOf(i, t); float size = sizeOf(i); bool lit = glows(i);
  float k = floor(r.w*5.); float tilt = k < .5 ? 0. : .25 + h1(k + i*7.)*.45, phi = h1(k*3.1 + i*5.)*TAU;
  vec3 axis = normalize(vec3(cos(phi)*tilt, 1., sin(phi)*tilt));
  float len = size*(k < .5 ? 1. : .45 + h1(k*1.7 + i)*.4), wid = len*.17;
  float edge; vec3 p = quartz(q, base + vec3(cos(phi), 0., sin(phi))*(k < .5 ? 0. : wid*1.5), axis, len, wid, edge);
  vec3 tone = lit ? MINT : mix(BLUE, CREAM, .5)*.8;
  col = mix(tone*.7, WHITE, edge*.5 + q.y*.3); a = (lit ? .05 : .025) + (lit ? .1 : .05)*edge;
  if(i < 2.5) a *= 1.3;
  // glints: a few specks flash brightly now and then
  if(q.x > .985){ float glint = pow(.5 + .5*sin(t*(2. + q.w*3.) + q.z*40.), 12.); col = WHITE; a = .9*glint; gSize = 1. + 1.6*glint; }
  return p;
}`;


// ---------------------------------------------------------------- Four Leaves, ordering a cake
// A saucer comes down, lifts the finished cake up its beam and rises off in a
// gentle arc. Then it leaps to light speed, leaving a streak while the stars
// stretch, and vanishes in a sparkle: the cake is on its way.
const DELIVERY = HEADER + COMMON + CAKE_GLSL + `
const float DELIVERY_SPEED = 1.1;          // a little quicker than the shared band speed
const float LIFT_END = 4.07, AWAY = 4.33, GLIDE_END = 6.33, JUMP = 6.6, GONE = 7.07;
vec3 arc(float u){ vec3 a = vec3(0., 360., 0.), b = vec3(-260., 560., -500.), c = vec3(-120., 700., -1300.); return mix(mix(a, b, u), mix(b, c, u), u); }
vec3 scene(vec4 s, float time, out vec3 col, out float a){
  vec4 r = rnd(s, 3.), q = rnd(s, 5.);
  float t = time*DELIVERY_SPEED;
  vec3 far = vec3(500., 900., -8000.);
  float glide = ease(win(t, AWAY, GLIDE_END)), jump = easeIn(win(t, JUMP, GONE)), gone = step(GONE, t);
  vec3 craft = t < AWAY ? mix(vec3(380., 900., -900.), vec3(0., 360., 0.), easeOut(win(t, 0., 2.2))) + vec3(0., sin(t*1.4)*5., 0.) : mix(arc(glide), far, jump);
  vec3 hold = craft - vec3(0., 221., 0.);   // the cake hangs just under the saucer
  vec3 cakeAt = t < AWAY ? mix(vec3(0.), hold, ease(win(t, 2.6, LIFT_END))) : hold;
  if(s.x < .07){ // stars stretch towards the jump point while the saucer leaps
    vec3 p = cakeStars(r, t, col, a); float warp = sin(win(t, 6.53, 7.33)*PI);
    a *= 1. + warp; return p + normalize(far - p)*q.x*warp*900.;
  }
  if(s.x < .5) return cakeGround(r, col, a);
  if(s.x < .82){
    float kind, tier, ord; vec3 target = cakeShape(r, col, kind, tier, ord);
    if(kind > 3.5) target = FLAME + (target - FLAME)*(1. + .25*sin(t*23. + ord*9.));
    a = cakeGlow(kind)*(1. - gone); return cakeAt + rotY(target, glide*.8);
  }
  if(s.x < .87){ // the tractor beam while the cake is lifted
    float on = ease(win(t, 2.2, 2.6))*(1. - ease(win(t, LIFT_END, AWAY + .07)));
    float ang = q.y*TAU; float v = q.z; float rad = mix(30., 110., v)*sqrt(q.w);
    col = YELLOW; a = .14*on; return mix(craft - vec3(0., 40., 0.), vec3(0.), v) + vec3(cos(ang)*rad, 0., sin(ang)*rad);
  }
  if(s.x < .94){ vec3 p = craft + rotZ(saucer(r, t, 0., 0., col, a), sin(glide*PI)*.3)*4.; a *= 1. - gone; return p; }
  if(s.x < .97){ // the streak left behind by the leap
    float on = step(JUMP, t)*(1. - ease(win(t, GONE, GONE + .53)));
    col = mix(MINT, WHITE, q.y); a = .75*on*q.y; return mix(arc(1.), craft, q.y) + ball(q.zwx)*14.*(1. - q.y);
  }
  // the sparkle where it vanishes: a four point star, a ring and a puff of sparks
  float u = win(t, GONE, GONE + 1.3), flare = sin(u*PI);
  if(q.x < .4){
    float arm = floor(q.y*4.); vec3 dir = arm < 1. ? vec3(1.,0.,0.) : (arm < 2. ? vec3(-1.,0.,0.) : (arm < 3. ? vec3(0.,1.,0.) : vec3(0.,-1.,0.)));
    col = mix(WHITE, YELLOW, q.z); a = flare*(1. - q.z)*1.3; return far + dir*q.z*q.z*1000.*flare;
  }
  if(q.x < .7){ float ang = q.y*TAU; col = MINT; a = (1. - u)*.8*step(.001, u); return far + vec3(cos(ang), sin(ang), 0.)*u*700.; }
  col = mix(YELLOW, WHITE, q.w); a = (1. - u)*step(.001, u); return far + sph(q.yz)*u*500.*q.w;
}`;

export const BAND_SHADERS = { delivery: DELIVERY, station: STATION, meteors: METEORS, rings: RINGS, crystals: CRYSTALS };
export type BandName = keyof typeof BAND_SHADERS;
