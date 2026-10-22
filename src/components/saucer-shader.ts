// The alien saucer, made of particles, shared by the healthcare sky, the home
// page hero and the checkpoint rings scene. It needs sph, ball, rotX and TAU
// from the shader that includes it.
//
// saucer(r, t, beam, wave, col, a): r is a particle's random numbers, beam (0 to 1)
// shows the scanning beam, wave (0 to 1) raises the alien's arm and waves it.
// The saucer is about 46 units wide, centred on the origin.

export const SAUCER_GLSL = `
const vec3 SC_MINT = vec3(.43,.91,.72), SC_BLUE = vec3(.49,.71,1.), SC_WHITE = vec3(.93,.94,.95), SC_GREY = vec3(.6,.65,.72);
const vec3 SC_YELLOW = vec3(1.,.79,.29), SC_ORANGE = vec3(1.,.54,.24);
// The waving arm: up from the alien's shoulder to a hand with three fingers.
vec3 saucerArm(vec4 r, float t, float wave, out vec3 col, out float a){
  float swing = sin(t*11.)*.55*wave;
  vec3 shoulder = vec3(4., 7., 0.);
  vec3 dir = normalize(vec3(.55 + swing*.6, .85 - abs(swing)*.25, 0.));
  float lift = mix(.15, 1., wave);
  vec3 elbow = shoulder + vec3(dir.x*6., dir.y*6.*lift, 0.);
  vec3 hand = elbow + vec3(dir.x*.6 + swing*.8, 1.*lift, 0.)*5.;
  col = SC_MINT; a = .95*wave;
  if(r.y < .7){ float v = r.z; return v < .5 ? mix(shoulder, elbow, v*2.) : mix(elbow, hand, v*2. - 1.); }
  float finger = floor(r.z*3.) - 1.;
  return hand + vec3(finger*1.2, 1.4 + r.w*1.6, 0.);
}
vec3 saucer(vec4 r, float t, float beam, float wave, out vec3 col, out float a){
  vec3 p;
  if(r.x < .42){ float ang=r.y*TAU; float rad=mix(.25,1.,sqrt(r.z)); p=vec3(cos(ang)*rad*22., (r.w-.5)*(1.-rad*.8)*8., sin(ang)*rad*22.); col=mix(SC_GREY,SC_WHITE,r.w); a=.2; }
  else if(r.x < .56){ vec3 n=sph(r.yz); n.y=abs(n.y); p=n*10.5+vec3(0.,2.,0.); col=SC_BLUE; a=.1; }
  else if(r.x < .74){ p=ball(r.yzw)*5.2+vec3(0.,6.,0.); col=SC_MINT; a=.55; }
  else if(r.x < .755){ // two dark eyes that blink now and then
    float eye = step(.5, r.y)*2. - 1.; float blink = step(.06, fract(t*.23 + .4));
    p = vec3(eye*1.9, 7.4 + (r.z - .5)*1.2*blink, 4.6) ; col = SC_WHITE; a = .9*blink;
  }
  else if(r.x < .8){ p = saucerArm(r, t, wave, col, a); }
  else if(r.x < .83){ p=vec3(0., 11.+r.y*5., 0.); col=SC_MINT; a=.8; if(r.y>.8){ p=vec3(0.,17.,0.)+ball(r.zwy)*1.6; col=SC_YELLOW; a=1.; } }
  else if(r.x < .93){
    float k=floor(r.y*10.); float ang=k/10.*TAU; p=vec3(cos(ang)*20.5,0.,sin(ang)*20.5)+ball(r.zwy)*1.6;
    float speed = 4. + wave*10.; col=mod(k+floor(t*speed),2.)<1.?SC_YELLOW:SC_ORANGE; a=.85 + wave*.15;
  }
  else { float v=r.y; float ang=r.z*TAU; float rr=v*13.*sqrt(r.w); p=vec3(cos(ang)*rr,-4.-v*48.,sin(ang)*rr); col=SC_YELLOW; a=beam*.45*(1.-v); }
  return rotX(p, .3);
}
`;
