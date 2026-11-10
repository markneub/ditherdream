// Self-similar Bayer rank shared by the surface dots and the screen-space Bayer mode.
const RANK=`
float rank(ivec2 p){ float r=0.0, s=0.25;
  for(int k=0;k<8;k++){ int bx=p.x&1, by=p.y&1; float d = bx==by ? float(bx) : (bx==1 ? 2.0 : 3.0); r+=d*s; s*=0.25; p>>=1; }
  return r; }`;

const SCENE_VS=`#version 300 es
in vec3 aP; in vec3 aN; in vec2 aU;
uniform mat4 uM, uVP, uV, uSunVP;
out vec3 wP; out vec3 wN; out vec3 vN; out vec4 sP; out vec2 vU;
void main(){ vec4 w=uM*vec4(aP,1.0); wP=w.xyz; wN=mat3(uM)*aN; vN=mat3(uV)*wN; sP=uSunVP*w; vU=aU; gl_Position=uVP*w; }`;

const SCENE_FS=`#version 300 es
precision highp float; precision highp int; precision highp sampler2DShadow;
in vec3 wP; in vec3 wN; in vec3 vN; in vec4 sP; in vec2 vU;
uniform sampler2DShadow uShadow; uniform vec3 uSunDir, uLamp, uEye;
uniform float uShade, uEmit, uId, uKind, uPix, uD, uT, uLampI;
layout(location=0) out vec4 oLit; layout(location=1) out vec4 oEdge;
${RANK}
float h21(vec2 p){ vec3 q=fract(vec3(p.xyx)*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
// Distance from the hull's waterline outline (box x -12..12, z +-7, plus the bow wedge to x = 18).
float hullDist(vec2 p){
  vec2 q=abs(p)-vec2(12.0,7.0); float box=length(max(q,0.0))+min(max(q.x,q.y),0.0);
  float bow=max((abs(p.y)-7.0*(18.0-p.x)/6.0)*0.651, 12.0-p.x);
  return min(box,bow); }
// Surface-stable fractal dots: a self-similar Bayer point set stuck to the surface.
// As the surface recedes, dots drop out in Bayer order so on-screen density stays constant.
float surf(vec2 uv, float lum, float sigma){
  bool darkDots = lum>0.5; float cov = darkDots ? 1.0-lum : lum;
  if(cov<0.03) return darkDots ? 1.0 : 0.0;
  cov=max(cov,0.055);
  float l=log2(uD*sigma), L=floor(l), f=l-L, g=exp2(L);
  vec2 q=uv/g, c0=floor(q), fr=q-c0;
  float t=exp2(-2.0*f);
  float r=exp2(f)*sqrt(cov/3.14159)*1.07;
  float hit=0.0;
  for(int i=0;i<4;i++){ vec2 o=vec2(float(i&1),float(i>>1));
    float rk=rank(ivec2(c0+o));
    float w=smoothstep(0.0,0.3,1.0-rk/t);
    if(length(fr-o)<r*w) hit=1.0; }
  return darkDots ? 1.0-hit : hit;
}
void main(){
  vec3 n=normalize(wN); vec3 Vd=uEye-wP; float dist=length(Vd); Vd/=dist;
  float lum;
  vec3 s=sP.xyz/sP.w*0.5+0.5; float sh=1.0;
  float ndl=max(dot(n,uSunDir),0.0);
  if(s.x>0.0&&s.x<1.0&&s.y>0.0&&s.y<1.0&&s.z<1.0){ sh=0.0; vec2 ts=vec2(1.0/2048.0); float bias=0.0006+0.002*(1.0-ndl);
    for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) sh+=texture(uShadow, vec3(s.xy+vec2(x,y)*ts, s.z-bias));
    sh/=9.0; }
  if(uKind>0.5){
    vec3 wn=normalize(vec3(0.22*sin(wP.x*0.9+uT*1.1)+0.18*sin(wP.z*1.7-uT*0.8+wP.x*0.3), 1.0, 0.22*sin(wP.z*1.1+uT*0.9)+0.18*sin(wP.x*2.1+uT*1.3)));
    float spec=pow(max(dot(reflect(-Vd,wn),uSunDir),0.0),50.0);
    float fog=exp(-dist/60.0);
    // swell: broken bands of light travelling across the water, plus foam along the hull
    float ph=dot(wP.xz,vec2(0.17,0.52))+2.2*vnoise(wP.xz*0.09)-uT*0.55;
    float crest=smoothstep(0.72,1.0,sin(ph))*smoothstep(0.42,0.68,vnoise(wP.xz*vec2(0.16,0.4)+vec2(uT*0.06,0.0)));
    float foam=smoothstep(1.3,0.15,hullDist(wP.xz)+0.9*vnoise(wP.xz*1.3+uT*0.25));
    lum=(0.42*crest*(0.4+0.6*sh)+1.3*spec*sh)*fog+0.75*foam;
  } else {
    vec3 Lv=uLamp-wP; float d=length(Lv); float att=pow(clamp(1.0-d/7.0,0.0,1.0),2.0);
    float lamp=max(dot(n,Lv/d),0.0)*att*uLampI;
    float sky=0.05+0.05*n.y;
    lum=uShade*(sky+1.9*ndl*sh+lamp);
    lum=clamp(lum,0.0,1.0);
    lum=smoothstep(0.0,1.0,clamp((lum-0.03)/0.9,0.0,1.0));
  }
  lum=mix(lum,1.0,uEmit);
  float cs=abs(dot(n,Vd));
  float sigma=dist*uPix/sqrt(max(cs,0.1));
  float bit=surf(vU,lum,sigma);
  oLit=vec4(bit,lum,0.0,1.0);
  oEdge=vec4(normalize(vN)*0.5+0.5,uId);
}`;

const SHADOW_VS=`#version 300 es
in vec3 aP; uniform mat4 uM, uSunVP; void main(){ gl_Position=uSunVP*uM*vec4(aP,1.0); }`;

const SHADOW_FS=`#version 300 es
precision mediump float; out vec4 o; void main(){ o=vec4(1.0); }`;

const POST_VS=`#version 300 es
in vec3 aP; out vec2 vUv; void main(){ vUv=aP.xy*0.5+0.5; gl_Position=vec4(aP.xy,0.0,1.0); }`;

const POST_FS=`#version 300 es
precision highp float; precision highp int;
uniform sampler2D tLit, tEdge;
uniform vec2 res; uniform float tanHalf, aspect, mode, edges, raw;
uniform mat3 camRot; uniform vec3 dark, light, uMoon, uMoon2;
in vec2 vUv; out vec4 o;
${RANK}
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec4 L=texture(tLit,vUv), c=texture(tEdge,vUv);
  float lum=L.g, bit;
  if(c.a==0.0){
    // sky: anchored to view direction, so it is stable under any camera motion
    vec2 ndc=vUv*2.0-1.0;
    vec3 d=camRot*normalize(vec3(ndc.x*tanHalf*aspect, ndc.y*tanHalf, -1.0));
    bit=0.0; lum=0.0;
    if(dot(d,uMoon)>0.9978 && dot(d,uMoon2)<0.9984){ bit=1.0; lum=1.0; }
    else if(d.y>0.01){
      vec3 a=abs(d); vec2 f; float fo;
      if(a.x>=a.y && a.x>=a.z){ f=d.zy/a.x; fo=1.0; } else if(a.y>=a.z){ f=d.xz/a.y; fo=2.0; } else { f=d.xy/a.z; fo=3.0; }
      vec2 cell=floor(f*170.0), fr=fract(f*170.0)-0.5;
      if(hash(cell+fo*57.0)>0.994 && max(abs(fr.x),abs(fr.y))<0.3){ bit=1.0; lum=0.8; }
    }
  } else {
    bit = mode<0.5 ? L.r : step(rank(ivec2(gl_FragCoord.xy))+0.002, lum);
  }
  if(raw>0.5){ o=vec4(mix(dark,light,lum),1.0); return; }
  if(edges>0.5){
    vec2 px=1.0/res;
    vec4 r=texture(tEdge,vUv+vec2(px.x,0.0)), u=texture(tEdge,vUv+vec2(0.0,px.y));
    bool e=abs(c.a-r.a)>0.002 || abs(c.a-u.a)>0.002;
    if(c.a>0.0 && r.a>0.0 && dot(c.rgb*2.0-1.0,r.rgb*2.0-1.0)<0.75) e=true;
    if(c.a>0.0 && u.a>0.0 && dot(c.rgb*2.0-1.0,u.rgb*2.0-1.0)<0.75) e=true;
    if(e){ float l2=max(lum, max(texture(tLit,vUv+vec2(px.x,0.0)).g, texture(tLit,vUv+vec2(0.0,px.y)).g)); bit = l2>0.5 ? 0.0 : 1.0; }
  }
  o=vec4(mix(dark,light,bit),1.0);
}`;
