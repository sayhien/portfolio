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
  col = mix(CREAM, WHITE, q.x*.5)*(.55 + .6*shade); a = .2 + .16*shade;
  if(k < .5){ // Tianhe, the core module, with a node at the front
    p = q.w < .8 ? tube(q, vec3(-120.,0.,0.), vec3(56.,0.,0.), q.z < .45 ? 19. : 14.) : vec3(72.,0.,0.) + sph(q.xy)*14.;
    from = vec3(-900., 300., 0.);
  } else if(k < 1.5){ // its two solar wings unfold
    float side = step(.5, q.w)*2. - 1.; float open = ease((t - dockStart(1.))/1.2);
    p = wing(q, vec3(-85., side*20., 0.), vec3(0., side, 0.), vec3(1.,0.,0.), 150.*open, 34., cell);
    col = mix(BLUE*.7, CREAM, 1. - cell); a = .3*(open > .02 ? 1. : 0.);
  } else if(k < 2.5 || (k > 3.5 && k < 4.5)){ // Wentian and Mengtian, the two labs, either side of the node
    float side = k < 2.5 ? 1. : -1.;
    p = tube(q, vec3(72., 0., side*16.), vec3(72., 0., side*196.), 16.);
    from = vec3(72., 60., side*900.);
  } else if(k < 3.5 || k > 4.5 && k < 5.5){ // the labs' long wings at their far ends
    float side = k < 3.5 ? 1. : -1.; float dir = step(.5, q.w)*2. - 1.; float open = ease((t - dockStart(k))/1.2);
    p = wing(q, vec3(72. + dir*18., 0., side*186.), vec3(dir, 0., 0.), normalize(vec3(0., 1., .5)), 240.*open, 44., cell);
    col = mix(BLUE*.75, YELLOW*.8, (1. - cell)*.6); a = .3*(open > .02 ? 1. : 0.);
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
  col = mix(col, mix(MINT, YELLOW, h1(k)), window*lit); a = max(a, window*lit*(.7 + .3*sin(t*4. + q.x*20.)));
  a *= .8 + .4*lit;
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
    col = mix(BLUE*.5, mix(DEEP, MINT, .7), land)*glowSide; a = (land > .5 ? .85 : .3)*glowSide;
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
  col = mix(MINT, WHITE, r.z); a = e > 0. ? .9*exp(-e*2.2) : 0.;
  if(r.w > .7){ float lit = t - LIGHTS_ON; float pulse = fract(max(0., lit)*.35); a = lit > 0. ? .5*(1. - pulse) : 0.; rad = 60. + pulse*520.; port = vec3(0.); col = MINT; }
  return port + sph(r.yz)*rad;
}`;

// ---------------------------------------------------------------- Remittance, priority pain points
// Meteors cross the night sky in four waves, each brighter and denser than the
// last. They never hit the ground: they pass beyond the hills and fade.
const METEORS = HEADER + COMMON + `
const float WAVE_GAP = 3.2, FIRST_WAVE = 1.;
// Hill height: far ridges rise taller, so they still read as hills from the ground.
float hills(float x, float z){ return (fbm(vec3(x*.0016, 0., z*.0016))*150. - 10.)*(1. + 3.*smoothstep(-500., -5000., z)); }
// Which wave a meteor belongs to (waves hold 3, 6, 10 and 16 meteors), and its spot in it.
vec2 waveOf(float m){
  if(m < 3.) return vec2(0., m/3.);
  if(m < 9.) return vec2(1., (m - 3.)/6.);
  if(m < 19.) return vec2(2., (m - 9.)/10.);
  if(m < 35.) return vec2(3., (m - 19.)/16.);
  return vec2(4., (m - 35.)/5.);
}
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 41.), q = rnd(s, 43.);
  if(s.x < .16){ // stars across the dome of the sky
    vec3 n = sph(vec2(.5 + r.x*.5, r.y)); n.y = abs(n.y);
    col = r.z < .8 ? WHITE : BLUE; a = (.15 + .6*r.w*r.w)*(.6 + .4*sin(t*(1. + q.x*2.) + q.y*30.));
    return n*6000.;
  }
  if(s.x < .4){ // rolling hills: a ridge lit from behind by the sky, a faint slope, and warm lights of homes
    float x = (r.x - .5)*9000., z = -300. - r.y*r.y*6000.; float y = hills(x, z);
    float home = step(.993, q.x), ridge = step(.45, r.w);
    float far = smoothstep(-500., -5000., z);
    col = home > .5 ? YELLOW : mix(DEEP, mix(BLUE, MINT, .4), far);
    a = home > .5 ? .9*(.7 + .3*sin(t*2. + q.y*40.)) : (ridge > .5 ? .22 + .3*far : .05);
    return vec3(x, ridge > .5 ? y : y*r.w*2., z);
  }
  if(s.x < .45){ // a glow along the horizon that grows as the showers get stronger
    float intensity = clamp((t - FIRST_WAVE)/(WAVE_GAP*4.), 0., 1.);
    col = mix(BLUE, MINT, r.z); a = (.12 + .22*intensity)*(1. - r.w);
    return vec3((r.x - .5)*9000., 30. + r.w*r.w*500., -5200. - r.y*400.);
  }
  // The meteors, each a bright head and a fading trail
  float m = floor(r.x*40.); vec2 w = waveOf(m); float wave = w.x;
  float start = wave < 3.5 ? FIRST_WAVE + wave*WAVE_GAP + w.y*1.6 + h1(m*3.1)*.3 : FIRST_WAVE + 4.*WAVE_GAP + w.y*6. + floor(max(0., t - 16.)/6.)*6.;
  float power = wave < 3.5 ? .35 + wave*.32 : .3;
  float life = 1.9 - min(wave, 3.)*.15; float u = (t - start)/life;
  if(u < 0. || u > 1.) { a = 0.; col = WHITE; return vec3(0.); }
  vec3 from = vec3((h1(m*7.7) - .5)*2600., 1300. + h1(m*2.3)*600., -200. - h1(m*5.1)*900.);
  vec3 to = from + vec3((h1(m*9.9) - .5)*1800., -2600., -5200.);
  float trail = (.06 + .1*power)*r.y; float v = clamp(u - trail, 0., 1.);
  vec3 p = mix(from, to, v);
  float fadeGround = smoothstep(hills(p.x, p.z) - 10., hills(p.x, p.z) + 120., p.y);
  vec3 hot = wave < 1.5 ? mix(WHITE, BLUE, .4) : (wave < 2.5 ? MINT : mix(YELLOW, WHITE, .3));
  col = mix(hot, mix(ORANGE, BLUE, h1(m)), r.y);
  a = 1.5*power*(1. - r.y)*(1. - r.y)*fadeGround*(1.2 - u*.4);
  gSize = r.y < .04 ? 1.8 + power*2.6 : 1. + power*.5;
  // a soft glow around each head, bigger for the brighter waves
  if(r.y < .07 && q.w > .5){ a = .25*power*fadeGround; return mix(from, to, u) + ball(q.xyz)*(10. + power*22.); }
  return p + ball(q.xyz)*(1. + r.y*(6. + power*12.));
}`;

// ---------------------------------------------------------------- Healthcare report, usability test plan
// The alien craft flies a test course through five glowing rings, one per task.
// The path here must match pathAt() in space-band.ts.
const RINGS = HEADER + COMMON + `
uniform float uCraftU;
const float RING_R = 74.;
vec3 pathAt(float u){ return vec3(mix(-1000., 1000., u), sin(u*TAU)*140. + sin(u*17.)*12., -sin(u*PI*1.3)*380. + 120.); }
float ringU(float i){ return .14 + i*.18; }
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 47.), q = rnd(s, 53.);
  if(s.x < .14){ col = WHITE; a = .3; return dust(r, t*.3); }
  if(s.x < .32) return world(r, vec3(-700., -520., -1500.), 420., t*.03, 2., CREAM*.45, BLUE*.7, col, a);
  if(s.x < .7){ // the five rings, dim until the craft passes through, then lit for good
    float i = floor(r.x*5.); float ru = ringU(i); vec3 c = pathAt(ru);
    vec3 tg = normalize(pathAt(ru + .005) - pathAt(ru - .005));
    vec3 sd = normalize(cross(tg, vec3(0.,1.,0.))); vec3 up = cross(sd, tg);
    float passed = uCraftU - ru; float lit = smoothstep(0., .02, passed);
    float ang = r.y*TAU + t*(.25 + i*.05); float rad = RING_R*(1. + (r.z - .5)*.08);
    float burst = passed > 0. ? exp(-passed*60.) : 0.;
    rad += burst*60.*r.w;
    col = mix(BLUE*.8, MINT, lit); a = mix(.12, .3, lit)*(.6 + .4*step(.5, fract(r.y*24.)));
    gSize = 1. + lit*.6;
    return c + (sd*cos(ang) + up*sin(ang))*rad;
  }
  if(s.x < .78){ // the course drawn as a faint dotted line, and the lit stretch behind the craft
    float u = r.x; vec3 p = pathAt(u);
    float behind = step(u, uCraftU);
    col = mix(BLUE*.6, MINT, behind); a = (.08 + .3*behind)*step(.6, fract(u*160.)); return p + ball(r.yzw)*2.;
  }
  if(s.x < .86){ // the engine trail right behind the craft
    float v = r.x*r.x*.08; vec3 p = pathAt(max(0., uCraftU - v)) - vec3(0., 6., 0.);
    col = mix(YELLOW, MINT, r.x); a = .8*(1. - r.x)*step(.001, uCraftU); return p + ball(r.yzw)*(2. + r.x*14.);
  }
  vec3 here = pathAt(uCraftU), ahead = normalize(pathAt(uCraftU + .01) - here);
  vec3 sp = saucer(q, t, 0., 0., col, a);
  float heading = atan(ahead.x, ahead.z);
  sp = rotY(rotX(sp, -ahead.y*.8), heading - PI*.5);
  gSize = 1.1; a *= .45;
  return here + sp*2.4;
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
  if(s.x < .78){ // the twelve stars: a bright core, a soft halo and, for some, light spikes
    float k = floor(r.x*12.); vec3 c = uStar[int(k)];
    col = starTone(k);
    if(r.y < .35){ a = 1.; gSize = 1.6; return c + ball(q.xyz)*7.; }
    if(r.y < .8){ a = .22*(1. - q.x); return c + ball(q.xyz)*(10. + q.x*30.); }
    float arm = floor(q.y*2.); float len = (q.x - .5)*44.*(mod(k, 3.) < 1. ? 1. : .6);
    a = .5*(1. - abs(q.x - .5)*2.); return c + (arm < .5 ? vec3(len, 0., 0.) : vec3(0., len, 0.));
  }
  // The lines that join the stars into a figure, drawn in as each figure forms
  float j = floor(r.x*13.); int ji = int(j);
  float v = r.y; float show = uSegShow[ji];
  vec3 p = mix(uSegA[ji], uSegB[ji], v*min(1., show*1.6));
  col = mix(MINT, WHITE, .3); a = .55*clamp(show, 0., 1.)*step(.25, fract(v*40.));
  return p + ball(q.xyz)*1.2;
}`;

// ---------------------------------------------------------------- Breadcrumb, impact effort matrix
// Ideas drift as space dust, gather into four clouds, one for each corner of the
// impact effort grid, and the high impact, low effort cloud ignites into a star.
const CLOUDS = HEADER + COMMON + `
const float GATHER = 2.2, GATHER_TIME = 4.5, AXES = 3., IGNITE = 8.5;
vec3 corner(float k){ return vec3(k < 1.5 ? -230. : 230., mod(k, 2.) < .5 ? 150. : -150., 0.); }
vec3 scene(vec4 s, float t, out vec3 col, out float a){
  vec4 r = rnd(s, 67.), q = rnd(s, 71.);
  if(s.x < .1){ col = WHITE; a = .25; return dust(r, t*.4); }
  if(s.x < .14){ // the two axes of the grid, impact up and effort across
    float show = ease((t - AXES)/1.5); float v = (r.x - .5)*2.;
    vec3 p = r.y < .5 ? vec3(v*460.*show, 0., 0.) : vec3(0., v*320.*show, 0.);
    col = mix(BLUE, WHITE, .3); a = .25*show*step(.4, fract(v*30.)); return p + vec3(0., 0., -20.);
  }
  // The dust: each speck belongs to one of the four corners, set by its own random number
  float k = floor(r.x*4.); vec3 c = corner(k);
  vec3 loose = vec3((r.y - .5)*1600., (r.z - .5)*900., (r.w - .5)*1400.);
  loose += vec3(sin(t*.3 + q.x*9.), cos(t*.25 + q.y*9.), sin(t*.2 + q.z*9.))*60.;
  float g = ease((t - GATHER - q.w*1.5)/GATHER_TIME);
  // each cloud is a soft ball, densest in the middle, turning slowly
  vec3 dir = rotY(sph(q.xy), t*(.12 + q.w*.18));
  vec3 cloud = c + dir*(8. + 140.*pow(q.z, 1.7))*vec3(1., .75, 1.);
  vec3 p = mix(loose, cloud, g);
  float ig = ease((t - IGNITE)/1.2);
  col = mix(mix(BLUE, WHITE, q.w*.4), MINT, g*.5); a = .3 + .15*g;
  if(k > .5){ a *= 1. - .55*ig; return p; } // the other three dim as the chosen one ignites
  // The chosen cloud falls inward and ignites: a hot core, light spikes, and a flash of sparks
  p = mix(p, c + (p - c)*.13, ig);
  float core = 1. - smoothstep(0., 12., length(p - c));
  col = mix(col, mix(YELLOW, WHITE, core), ig); a = mix(a, .22 + .5*core, ig);
  float flash = t > IGNITE ? exp(-(t - IGNITE)*1.4) : 0.;
  if(q.y > .93){ p = c + sph(q.zw)*(20. + max(0., t - IGNITE)*160.); a = .9*flash; col = YELLOW; }
  else if(q.y > .88){ float len = (q.x - .5)*2.*170.*ig; p = c + (q.w < .5 ? vec3(len, 0., 0.) : vec3(0., len, 0.)); a = .6*ig*(1. - abs(q.x - .5)*2.); col = mix(YELLOW, WHITE, .5); }
  return p;
}`;

export const BAND_SHADERS = { station: STATION, meteors: METEORS, rings: RINGS, zodiac: ZODIAC, clouds: CLOUDS };
export type BandName = keyof typeof BAND_SHADERS;
