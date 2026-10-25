// The swoosh: three layers of light drawn straight on the screen as the
// camera dives into Earth. Used by the home page hero. The shader that includes it must declare the
// globals gScreen and gSize, and the colours WHITE, BLUE, MINT and GOLD.
//
// swoosh(layer, r, q, t, pull, along, aspect, col, a)
//   layer 0: streaks spiralling past the edges
//   layer 1: rings of light rushing outward
//   layer 2: fine sparks
//   pull is the swoosh's strength (0 to 1 and back), along how far through it we are.
export const SWOOSH_GLSL = `
vec3 swoosh(float layer, vec4 r, vec4 q, float t, float pull, float along, float aspect, out vec3 col, out float a){
  gScreen = 1.;
  if(layer < .5){
    float lane = floor(r.x*260.); float ang = lane/260.*TAU + (q.y - .5)*.012; float u = fract(h1(lane*3.7) + t*.9 + along*7.);
    float rad = .12 + u*u*1.8; float len = (.05 + .65*pull)*rad;
    float rr = rad - r.z*len; float spin = (1. - u)*1.6*pull;
    float tone = h1(lane*1.3);
    col = tone < .45 ? mix(WHITE, BLUE, q.w) : (tone < .9 ? MINT : GOLD);
    a = pull*(.5 + 1.3*u)*(1. - r.z*.6);
    gSize = 1. + 1.8*u*pull;
    return vec3(cos(ang + spin)*rr/aspect, sin(ang + spin)*rr, 0.);
  }
  if(layer < 1.5){
    float k = floor(r.x*9.); float u = fract(t*.55 + k/9. + along*4.);
    float rad = .04 + u*u*u*2.2; float ang = r.y*TAU;
    col = mod(k, 3.) < 1. ? MINT : (mod(k, 3.) < 2. ? BLUE : WHITE);
    a = pull*.55*(1. - u)*smoothstep(0., .15, u)*(.6 + .4*sin(ang*6. + t*3.));
    gSize = 1. + pull*u;
    return vec3(cos(ang)*rad/aspect, sin(ang)*rad, 0.);
  }
  float u = fract(q.x + t*(.6 + q.y*.9) + along*5.); float ang = r.y*TAU;
  float rad = .02 + u*u*1.7;
  col = q.z < .6 ? WHITE : (q.z < .85 ? MINT : GOLD);
  a = pull*(.3 + 1.2*u)*step(.35, q.w);
  gSize = 1. + 2.2*u*u*pull;
  return vec3(cos(ang)*rad/aspect, sin(ang)*rad, 0.);
}
`;
