// The Four Leaves cake world, made of particles: a starry sky, the curved
// surface of a small planet, a three tier strawberry cake, and a little alien
// with a lighter. Shared by the Four Leaves hero sky (the saucers build the
// cake) and its space band (a saucer delivers it). Needs HEADER and COMMON
// from case-sky-scenes.ts in front of it.

export const CAKE_GLSL = `
const vec3 SPONGE = vec3(.98,.84,.6), STRAW = vec3(.98,.3,.36);
float easeOut(float v){ float x=clamp(v,0.,1.); return 1.-(1.-x)*(1.-x)*(1.-x); }
float easeIn(float v){ float x=clamp(v,0.,1.); return x*x*x; }
float win(float t, float a, float b){ return clamp((t-a)/(b-a), 0., 1.); }

// ---- the sky and the planet's surface (the cake stands at the origin)
const float PR = 5200.; const vec3 PC = vec3(0., -5200., 0.);
vec3 cakeStars(vec4 r, float t, out vec3 col, out float a){
  vec3 d = sph(r.xy); d.y = abs(d.y)*.9 + .05;
  col = mix(WHITE, BLUE, r.z*.5); a = (.25 + .5*r.w)*(.6 + .4*sin(t*(1. + r.z*3.) + r.w*20.));
  return d*6500. + vec3(0., -300., 0.);
}
vec3 cakeGround(vec4 r, out vec3 col, out float a){
  float rad = 2400.*pow(r.x, .6); float ang = r.y*TAU;
  vec2 at = vec2(cos(ang)*rad, sin(ang)*rad - 400.);
  vec3 p = PC + normalize(vec3(at.x, PR, at.y))*PR;
  float n = fbm(p*.004 + 7.);
  float crater = smoothstep(.62, .66, fbm(p*.0018 + 2.));
  col = mix(GREY*.55, CREAM*.8, n)*(1. - .4*crater); a = .12 + .22*n + .16*crater;
  float pad = 1. - smoothstep(60., 150., length(at)); // a soft pad of light where the cake stands
  col = mix(col, MINT, pad*.5); a += pad*.25;
  return p + vec3(0., (r.z - .5)*2., 0.);
}

// ---- the cake: three tiers of sponge with cream layers, piped cream, strawberries and a candle
vec3 tierDims(float k){ return k < .5 ? vec3(0., 52., 92.) : (k < 1.5 ? vec3(52., 44., 66.) : vec3(96., 36., 42.)); }
const vec3 FLAME = vec3(0., 174., 0.);
// kind 0 sponge, 1 piping, 2 berry, 3 candle, 4 flame. ord orders the build inside each group (0 first, 1 last).
vec3 cakeShape(vec4 r, out vec3 col, out float kind, out float tier, out float ord){
  vec4 q = rnd(r, 21.);
  if(r.x < .7){
    float k = r.y < .45 ? 0. : (r.y < .76 ? 1. : 2.); tier = k; kind = 0.;
    vec3 d = tierDims(k); float ang = q.y*TAU;
    if(q.z < .66){
      ord = q.w*.92; float y = d.x + q.w*d.y;
      float layer = 1. - smoothstep(.0, .08, abs(fract(q.w*3.) - .5) - .38);
      col = mix(SPONGE*.55, CREAM*.8, layer);
      return vec3(cos(ang)*d.z, y, sin(ang)*d.z);
    }
    float rr = d.z*sqrt(q.w); ord = .92 + .08*q.x; col = CREAM*.6;
    return vec3(cos(ang)*rr, d.x + d.y, sin(ang)*rr);
  }
  if(r.x < .84){
    float k = floor(q.x*3.); tier = k; kind = 1.; vec3 d = tierDims(k);
    float N = floor(d.z*.3); float i = floor(q.y*N); float ang = (i + .5)/N*TAU; ord = (i + .5)/N;
    col = WHITE;
    return vec3(cos(ang)*d.z*.93, d.x + d.y + 4., sin(ang)*d.z*.93) + ball(q.zwx)*vec3(5.5, 6., 5.5);
  }
  if(r.x < .95){
    float top = step(.42, q.x); tier = 2.; kind = 2.;
    float N = top > .5 ? 7. : 11.; float i = floor(q.y*N);
    ord = top > .5 ? .5 + (i + .5)/N*.5 : (i + .5)/N*.5;
    vec3 d = tierDims(top > .5 ? 2. : 1.); float ang = (i + .5)/N*TAU + top*.4; float rad = top > .5 ? 24. : d.z - 13.;
    vec3 c0 = vec3(cos(ang)*rad, d.x + d.y + 10., sin(ang)*rad);
    if(q.z < .84){ col = STRAW*(1.1 + .4*q.w); return c0 + ball(q.wzx)*vec3(8., 10.5, 8.); }
    col = MINT; return c0 + vec3(0., 10., 0.) + ball(q.wzx)*vec3(5., 2., 5.);
  }
  tier = 2.; ord = q.y;
  if(q.x < .55){ kind = 3.; col = WHITE; return vec3((q.z - .5)*3.5, 132. + q.y*34., (q.w - .5)*3.5); }
  kind = 4.; col = mix(YELLOW, ORANGE, q.y); return FLAME + ball(q.yzw)*vec3(4.5, 8., 4.5);
}
// How bright a cake particle is once in place: berries glow fully, the rest stays soft so the cake keeps its colours.
float cakeGlow(float kind){ return kind > 1.5 && kind < 2.5 ? 1. : .32; }

// ---- a little alien with a jet pack, holding a lighter out in its right hand (about 30 units tall, facing +z)
vec3 alien(vec4 q, float t, float lighter, out vec3 col, out float a){
  if(q.x < .35){ col = MINT; a = .55; return ball(q.yzw)*vec3(5., 7., 5.); }
  if(q.x < .58){ col = MINT; a = .6; return vec3(0., 11., 0.) + ball(q.yzw)*5.5; }
  if(q.x < .63){ float e = step(.5, q.y)*2. - 1.; col = WHITE; a = .95; return vec3(e*2., 12., 4.8) + ball(q.zwy)*.9; }
  if(q.x < .72){ col = MINT; a = .7; return mix(vec3(4., 4., 0.), vec3(11., 7., 0.), q.y); }
  if(q.x < .78){ col = GREY; a = .8; return vec3(12., 7., 0.) + (q.yzw - .5)*vec3(2., 4., 2.); }
  if(q.x < .88){ col = mix(YELLOW, ORANGE, q.y); a = lighter; return vec3(12., 11. + q.y*4.*(1. + .3*sin(t*30.)), 0.) + ball(q.zwy)*1.6; }
  col = mix(YELLOW, ORANGE, q.y); a = .6*q.z; return vec3(0., -8. - q.y*14., 0.) + ball(q.zwy)*2.*(1. + q.y);
}
`;
