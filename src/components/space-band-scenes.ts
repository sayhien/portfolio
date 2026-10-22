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
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 41.), q = rnd(s, 43.);
  if(s.x < .14){ col = r.z < .8 ? WHITE : BLUE; a = .1 + .4*r.w*r.w; return sph(r.xy)*(5000. + r.z*2000.); }
  if(s.x < .46) return world(r, PLANET, PLANET_R, t*.04, 2., CREAM*.3, BLUE*.55, col, a);
  if(s.x < .5){ // its thin air, brightest on the lit edge
    vec3 n = sph(r.xy); vec3 p = PLANET + n*PLANET_R*(1.01 + r.z*r.z*.05);
    col = mix(BLUE, MINT, r.w); a = .06*(1. - r.z)*(1. - .9*hidden(p, PLANET, PLANET_R)); return p;
  }
  float m = floor(r.x*ROCKS); bool hot = isPriority(m);
  float start = startOf(m), travel = travelOf(m), u = (t - start)/travel;
  vec3 from = launchOf(m), hit = PLANET + hitNormal(m)*PLANET_R;
  if(s.x < .86){ // the rocks and their trails, speeding up as they fall in
    if(u < 0. || u > 1.){ a = 0.; col = WHITE; return vec3(0.); }
    float v = mix(u, u*u, .55);
    if(r.y < .5){ // the rock itself: a lumpy cluster, glowing only for the four that matter
      float size = hot ? 9. : 3. + h1(m*8.3)*4.;
      vec3 p = mix(from, hit, v) + ball(q.xyz)*size*(.75 + .25*sin(q.w*20.));
      col = hot ? mix(YELLOW, WHITE, q.x*.6) : mix(GREY*.6, CREAM*.5, q.x);
      a = hot ? .5 + .5*u : .14; gSize = hot ? 1.4 : 1.; return p;
    }
    float back = (r.y - .5)*2.*(hot ? .22 : .06); // the trail behind it, long for the bright ones
    vec3 p = mix(from, hit, max(0., v - back)) + ball(q.xyz)*(hot ? 1. + back*30. : 1.);
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
    a = .8*exp(-e*2.5); return hit + dir*(20. + e*150.*q.w);
  }
  if(r.y < .7){ // a ring of light racing across the surface
    float ang = q.x*TAU, spread = .02 + e*.18;
    vec3 dir = normalize(n*cos(spread) + (tg*cos(ang) + bt*sin(ang))*sin(spread));
    col = mix(WHITE, YELLOW, q.y); a = .6*exp(-e*1.6); return PLANET + dir*PLANET_R*1.01;
  }
  col = mix(ORANGE, YELLOW, q.y); a = .7*exp(-e*.9); // the crater, glowing and slowly fading
  return hit + ball(q.xyz)*12.;
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
    if(r.y < .08){ a = .06; gSize = 1.3; return c + ball(q.xyz)*2.5; }
    if(r.y < .45){ a = .012*(1. - q.x); return c + ball(q.xyz)*(5. + q.x*12.); }
    // the rest join the background field
    col = WHITE; a = .05 + .25*q.x*q.x; return vec3((q.y - .5)*4200., (q.z - .5)*2600., -400. - q.w*3200.);
  }
  // The lines that join the stars into a figure, drawn in as each figure forms
  float j = floor(r.x*13.); int ji = int(j);
  float v = r.y; float show = uSegShow[ji];
  vec3 p = mix(uSegA[ji], uSegB[ji], v*min(1., show*1.6));
  col = mix(MINT, WHITE, .3); a = .25*clamp(show, 0., 1.)*step(.25, fract(v*40.));
  return p + ball(q.xyz)*1.2;
}`;

// ---------------------------------------------------------------- Breadcrumb, impact effort matrix
// Crystals glow on a moon's surface. A rover's robotic arm easily picks up the
// two bright ones close by (high impact, low effort) and drops them in its bed.
// A bright one far off on a ridge stays out of reach (high impact, high effort),
// and dull ones are left where they lie.
const CRYSTALS = HEADER + COMMON + `
const vec3 SHOULDER = vec3(25., 66., -22.), REST = vec3(5., 118., -22.);
const float UPPER = 72., FORE = 72., PICK_GAP = 4.2, FIRST_PICK = .6;
vec3 site(float i){
  return i < .5 ? vec3(70., 0., -112.) : i < 1.5 ? vec3(-35., 0., -128.) : i < 2.5 ? vec3(430., 62., -420.) :
         i < 3.5 ? vec3(130., 0., 150.) : i < 4.5 ? vec3(-210., 0., 95.) : i < 5.5 ? vec3(-390., 0., -270.) : vec3(310., 0., 210.);
}
bool bright(float i){ return i < 2.5; }
float ground(vec2 xz){ float d = length(xz - vec2(430., -420.)); return fbm(vec3(xz*.004, 0.))*26. - 8. + 70.*exp(-d*d/26000.); }
vec3 bedSpot(float i){ return vec3(-28. - i*26., 52., 0.); }
// Where the hand is during one pick: reach, grip, lift, swing over the bed, let go, fold back.
vec3 handDuring(float i, float u){
  vec3 c = site(i) + vec3(0., 22., 0.), over = c + vec3(0., 70., 0.), drop = bedSpot(i) + vec3(0., 62., 0.);
  if(u < 1.) return mix(REST, over, ease(u));
  if(u < 1.35) return mix(over, c, ease((u - 1.)/.35));
  if(u < 1.6) return c;
  if(u < 2.1) return mix(c, over, ease((u - 1.6)/.5));
  if(u < 3.) return mix(over, drop, ease((u - 2.1)/.9));
  if(u < 3.2) return drop;
  return mix(drop, REST, ease((u - 3.2)/.8));
}
vec3 handAt(float t){
  for(int k = 0; k < 2; k++){ float u = t - FIRST_PICK - float(k)*PICK_GAP; if(u >= 0. && u < 4.) return handDuring(float(k), u); }
  return REST;
}
// Two segment arm: find the elbow so both segments keep their length, bending upward.
vec3 elbowFor(vec3 hand){
  vec3 d = hand - SHOULDER; float len = clamp(length(d), 10., UPPER + FORE - 1.); vec3 dir = normalize(d);
  float along = (UPPER*UPPER - FORE*FORE + len*len)/(2.*len); float lift = sqrt(max(0., UPPER*UPPER - along*along));
  vec3 side = normalize(cross(dir, vec3(0., 1., 0.)) + vec3(.0001)); vec3 pole = normalize(cross(side, dir));
  return SHOULDER + dir*along + pole*lift;
}
// Where a crystal is: on the ground, in the gripper, falling into the bed, or resting there.
vec3 crystalAt(float i, float t, out float held){
  held = 0.;
  if(i > 1.5) return site(i);
  float u = t - FIRST_PICK - i*PICK_GAP;
  if(u < 1.5) return site(i);
  if(u < 3.2){ held = 1.; return handAt(t) - vec3(0., 22., 0.); }
  float fall = ease((u - 3.2)/.35);
  return mix(bedSpot(i) + vec3(0., 40., 0.), bedSpot(i), fall);
}
vec3 box(vec4 q, vec3 lo, vec3 hi){ // particles on the faces of a box
  vec3 p = mix(lo, hi, q.xyz); float f = floor(q.w*3.);
  float side = step(.5, fract(q.w*3.));
  if(f < .5) p.x = mix(lo.x, hi.x, side); else if(f < 1.5) p.y = mix(lo.y, hi.y, side); else p.z = mix(lo.z, hi.z, side);
  return p;
}
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 67.), q = rnd(s, 71.);
  if(s.x < .08){ vec3 n = sph(r.xy); n.y = abs(n.y); col = WHITE; a = .1 + .35*r.z*r.z; return n*5000.; } // stars over the horizon
  if(s.x < .42){ // the moon's surface, lit softly by the bright crystals near it
    vec2 xz = (r.xy - .5)*2600.; float y = ground(xz); vec3 p = vec3(xz.x, y, xz.y);
    float spill = 0.;
    for(int k = 0; k < 3; k++){ float held; vec3 c = crystalAt(float(k), t, held); float d = length(p - c); spill += exp(-d*d/5000.)*(1. - held); }
    // a fine grid of dust in rows, so the ground reads as a surface
    float row = step(.55, fract(xz.x*.05 + fbm(vec3(xz*.01, 1.))*2.));
    col = mix(mix(GREY*.6, BLUE*.5, r.z), MINT, min(1., spill)); a = (.1 + .1*row) + .35*min(1., spill);
    a *= 1. - smoothstep(900., 1300., length(xz));
    return p;
  }
  if(s.x < .6){ // the rover: chassis, cab, open bed and six wheels
    col = mix(GREY, WHITE, r.w*.4); a = .07;
    if(r.x < .3) return box(q, vec3(-75., 18., -34.), vec3(75., 46., 34.));
    if(r.x < .45) return box(q, vec3(40., 46., -30.), vec3(75., 76., 30.));
    if(r.x < .65){ vec3 p = box(q, vec3(-75., 46., -34.), vec3(20., 68., 34.)); if(p.y > 67.) p.y = 46.; return p; }
    if(r.x < .9){ // wheels
      float w = floor(q.x*6.); float wx = -52. + mod(w, 3.)*52., wz = w < 2.5 ? 40. : -40.; float ang = q.y*TAU;
      float rr = q.z < .7 ? 17. : 17.*q.z; col = GREY*.5; a = .1;
      return vec3(wx + cos(ang)*rr, 17. + sin(ang)*rr, wz + (q.w - .5)*8.);
    }
    if(r.x < .95){ col = YELLOW; a = .5; return vec3(76., 56., (step(.5, q.x)*2. - 1.)*20.) + ball(q.yzw)*3.; } // headlights
    col = MINT; a = .5; return vec3(60., 80. + q.x*24., 0.) + ball(q.yzw)*1.5; // antenna with a light
  }
  if(s.x < .68){ // the robotic arm and its gripper
    vec3 hand = handAt(t), elbow = elbowFor(hand);
    col = mix(CREAM, WHITE, r.w); a = .05;
    if(r.x < .42) return mix(SHOULDER, elbow, r.y) + ball(q.xyz)*4.;
    if(r.x < .8) return mix(elbow, hand, r.y) + ball(q.xyz)*3.;
    if(r.x < .9){ col = YELLOW; a = .45; return (r.y < .5 ? elbow : SHOULDER) + ball(q.xyz)*3.; }
    float claw = floor(r.y*3.); float ang = claw/3.*TAU; float grip = 0.;
    for(int k = 0; k < 2; k++){ float u = t - FIRST_PICK - float(k)*PICK_GAP; if(u > 1.3 && u < 3.1) grip = 1.; }
    vec3 out_ = vec3(cos(ang), 0., sin(ang))*mix(9., 4., grip);
    return hand + out_ - vec3(0., r.z*16., 0.);
  }
  // The crystals: tall, faceted, glowing. Bright ones shine mint and white, dull ones barely glow.
  float i = floor(r.x*7.); float held; vec3 c = crystalAt(i, t, held);
  bool lit = bright(i); float h = lit ? 34. : 20., w = lit ? 11. : 7.;
  if(r.y < .7){
    float cluster = floor(q.w*3.); vec3 off = cluster < .5 ? vec3(0.) : vec3((cluster - 1.5)*12., 0., (q.x - .5)*10.);
    float sc = cluster < .5 ? 1. : .55; float v = q.y*2. - 1.; float ang = floor(q.z*6.)/6.*TAU + q.x*1.05;
    vec3 p = c + off + vec3(cos(ang)*w*(1. - abs(v))*sc, (v + 1.)*h*.5*sc, sin(ang)*w*(1. - abs(v))*sc);
    col = lit ? mix(MINT, WHITE, q.x*.45) : mix(BLUE*.6, CREAM*.4, q.x); a = lit ? .18 : .06; gSize = lit ? 1.2 : 1.;
    return p;
  }
  // a soft glow around each bright crystal, with a few drifting sparkles
  if(!lit){ a = 0.; col = WHITE; return c; }
  col = mix(MINT, WHITE, q.y); a = .03 + .06*step(.97, q.x)*(.5 + .5*sin(t*4. + q.y*30.));
  return c + vec3(0., 16., 0.) + ball(q.xyz)*(18. + q.w*40.);
}`;

export const BAND_SHADERS = { station: STATION, meteors: METEORS, rings: RINGS, zodiac: ZODIAC, crystals: CRYSTALS };
export type BandName = keyof typeof BAND_SHADERS;
