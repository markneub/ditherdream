// Self-similar Bayer rank shared by the surface dots and the screen-space Bayer mode.
const RANK=`
float rank(ivec2 p){ float r=0.0, s=0.25;
  for(int k=0;k<8;k++){ int bx=p.x&1, by=p.y&1; float d = bx==by ? float(bx) : (bx==1 ? 2.0 : 3.0); r+=d*s; s*=0.25; p>>=1; }
  return r; }`;

const SCENE_VS=`#version 300 es
in vec3 aP; in vec3 aN; in vec2 aU; in vec4 aA;
uniform mat4 uM, uVP, uV, uSunVP;
out vec3 wP; out vec3 wN; out vec3 vN; out vec4 sP; out vec2 vU; flat out vec4 vA;
void main(){ vA=aA; vec4 w=uM*vec4(aP,1.0); wP=w.xyz; wN=mat3(uM)*aN; vN=mat3(uV)*wN; sP=uSunVP*w; vU=aU; gl_Position=uVP*w; }`;

const SCENE_FS=`#version 300 es
precision highp float; precision highp int; precision highp sampler2DShadow; precision highp samplerCubeShadow;
in vec3 wP; in vec3 wN; in vec3 vN; in vec4 sP; in vec2 vU; flat in vec4 vA; // vA = (object id, shade, emissive, kind)
uniform sampler2DShadow uShadow; uniform samplerCubeShadow uCube0, uCube1, uCube2;
uniform vec3 uSunDir, uEye; uniform vec3 uLamp[3]; uniform vec2 uLampP[3]; uniform vec4 uLampD[3]; // lamp position; (intensity, range); spot (direction, cos of half-angle; -2 = shines all round)
uniform float uPix, uD, uT, uSky, uSunI, uFill, uFoam, uFoamR, uEdge; uniform vec2 uCubeNF; // cube shadow near, far
uniform sampler2D uTex; uniform vec2 uTone; // a model's base-colour texture; (1 / its mean luminance, contrast)
#define CN uCubeNF.x
#define CF uCubeNF.y
float cubeSh(samplerCubeShadow c, vec3 v, float bias){ vec3 a=abs(v); float m=max(max(a.x,max(a.y,a.z))-bias,CN);
  float d=(CF+CN)/(CF-CN)-2.0*CF*CN/((CF-CN)*m); return texture(c,vec4(v,d*0.5+0.5)); }
float lampLight(int i, vec3 n){ vec2 P=uLampP[i]; if(P.x<=0.0) return 0.0;
  vec3 Lv=uLamp[i]-wP; float d=length(Lv), att=pow(clamp(1.0-d/P.y,0.0,1.0),2.0), nl=max(dot(n,Lv/d),0.0);
  vec4 D=uLampD[i]; bool spot=D.w>-1.5; if(spot) att*=smoothstep(D.w,D.w+0.035,dot(-Lv/d,D.xyz));
  // a little unshadowed fill near each lamp stands in for light bouncing round the room
  float fill=spot ? 0.0 : uFill*P.x*pow(clamp(1.0-d/(P.y*0.55),0.0,1.0),2.0);
  if(att*nl<=0.0) return fill;
  float bias=0.03+0.08*(1.0-nl);
  float s = i==0 ? cubeSh(uCube0,-Lv,bias) : i==1 ? cubeSh(uCube1,-Lv,bias) : cubeSh(uCube2,-Lv,bias);
  return nl*att*P.x*s+fill; }
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
// The same for the anchored Dutch ship: a lens about 16 m long and 5 m across.
float shipDist(vec2 p){ float t=(p.x+0.4)/8.4; return max(abs(p.y)-2.5*(1.0-t*t*t*t), abs(p.x+0.4)-8.4)*0.8; }
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
  float texL=dot(texture(uTex,vU).rgb,vec3(0.299,0.587,0.114)); // sampled outside any branch (derivatives)
  bool model=vA.w>1.5; // kind 2: an imported mesh
  vec3 n=normalize(wN), an=abs(n); vec3 Vd=uEye-wP; float dist=length(Vd); Vd/=dist;
  vec3 vn=normalize(vN);
  if(dot(n,Vd)<0.0){ n=-n; vn=-vn; } // thin two-sided things (hammocks, shells) light the side you see
  float lum;
  vec3 s=sP.xyz/sP.w*0.5+0.5; float sh=1.0;
  float ndl=max(dot(n,uSunDir),0.0);
  if(s.x>0.0&&s.x<1.0&&s.y>0.0&&s.y<1.0&&s.z<1.0){ sh=0.0; vec2 ts=vec2(1.0/2048.0); float bias=0.0006+0.002*(1.0-ndl);
    for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) sh+=texture(uShadow, vec3(s.xy+vec2(x,y)*ts, s.z-bias));
    sh/=9.0; }
  if(vA.w>0.5&&!model){
    vec3 wn=normalize(vec3(0.22*sin(wP.x*0.9+uT*1.1)+0.18*sin(wP.z*1.7-uT*0.8+wP.x*0.3), 1.0, 0.22*sin(wP.z*1.1+uT*0.9)+0.18*sin(wP.x*2.1+uT*1.3)));
    float spec=pow(max(dot(reflect(-Vd,wn),uSunDir),0.0),50.0);
    float fog=exp(-dist/60.0);
    // swell: broken bands of light travelling across the water, plus foam along the hull
    float ph=dot(wP.xz,vec2(0.17,0.52))+2.2*vnoise(wP.xz*0.09)-uT*0.55;
    float crest=smoothstep(0.72,1.0,sin(ph))*smoothstep(0.42,0.68,vnoise(wP.xz*vec2(0.16,0.4)+vec2(uT*0.06,0.0)));
    float shore = uFoam<0.5 ? 9.0 : uFoam<1.5 ? hullDist(wP.xz) : uFoam<2.5 ? length(wP.xz)-uFoamR : shipDist(wP.xz); // 1: the deck's hull, 2: a round island, 3: the anchored ship
    float foam=smoothstep(1.3,0.15,shore+0.9*vnoise(wP.xz*1.3+uT*0.25));
    vec3 up=vec3(0.0,1.0,0.0);
    lum=(0.42*crest*(0.4+0.6*sh)+1.3*spec*sh)*fog+0.75*foam+0.8*(lampLight(0,up)+lampLight(1,up)+lampLight(2,up));
  } else {
    float lamp=lampLight(0,n)+lampLight(1,n)+lampLight(2,n);
    float sky=(0.05+0.05*n.y)*uSky;
    float shade=vA.y;
    if(model) shade*=clamp(pow(texL*uTone.x,uTone.y),0.3,1.7); // texture as tone: planking and grain become denser or sparser dots
    lum=shade*(sky+uSunI*ndl*sh+lamp);
    if(uEdge>0.0) lum*=smoothstep(uEdge+22.0,uEdge,length(wP.xz)); // the world fades to black past the scene's edge
    lum=clamp(lum,0.0,1.0);
    lum=smoothstep(0.0,1.0,clamp((lum-0.03)/0.9,0.0,1.0));
  }
  lum=mix(lum,1.0,vA.z);
  float cs=abs(dot(n,Vd));
  float sigma=dist*uPix/sqrt(max(cs,0.1));
  // Models have scan-atlas UVs that would tear the lattice: project position along the normal's dominant axis instead (metres).
  vec2 uv = !model ? vU : an.x>=an.y&&an.x>=an.z ? wP.zy : an.y>=an.z ? wP.xz : wP.xy;
  float bit=surf(uv,lum,sigma);
  // view depth, log-encoded in 16 bits, for the post pass's depth outlines
  float e=clamp(log2(1.0+1.0/gl_FragCoord.w)/9.25,0.0,1.0)*65535.0;
  oLit=vec4(bit,lum,floor(e/256.0)/255.0,mod(floor(e),256.0)/255.0);
  oEdge=vec4(vn.xy*0.5+0.5, floor(vA.x/256.0)/255.0, mod(vA.x,256.0)/255.0); // view normal xy + 16-bit object id
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
uniform vec2 res; uniform float tanHalf, aspect, mode, edges, raw, day;
uniform mat3 camRot; uniform vec3 dark, light, uMoon, uMoon2;
#define MODEL_CREASE 0.2
#define MODEL_DEPTH 0.03
in vec2 vUv; out vec4 o;
${RANK}
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 nrm(vec4 c){ vec2 n=c.rg*2.0-1.0; return vec3(n,sqrt(max(0.0,1.0-dot(n,n)))); }
float invZ(vec4 l){ return 1.0/(exp2((l.b*65280.0+l.a*255.0)/65535.0*9.25)-1.0+1e-4); } // 1 / view depth: linear across the screen on any plane
void main(){
  vec4 L=texture(tLit,vUv), c=texture(tEdge,vUv);
  float lum=L.g, bit;
  bool bg = c.b==0.0 && c.a==0.0;
  if(bg && day>0.5){
    // daytime sky: white, with the sun as a thin ring
    vec2 ndc=vUv*2.0-1.0;
    vec3 d=camRot*normalize(vec3(ndc.x*tanHalf*aspect, ndc.y*tanHalf, -1.0));
    float m=dot(d,uMoon); bit = (m>0.9966 && m<0.9976) ? 0.0 : 1.0; lum=1.0;
  } else if(bg){
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
    bool e=abs(c.a-r.a)+abs(c.b-r.b)>0.002 || abs(c.a-u.a)+abs(c.b-u.b)>0.002;
    bool rb=r.b==0.0&&r.a==0.0, ub=u.b==0.0&&u.a==0.0;
    // Imported meshes (ids from 32768) are too detailed for the normal rule: it only catches sharp creases there, and
    // depth steps do the rest. 1/z is linear on a plane, so its second difference is zero however steep the surface;
    // taking only the negative side puts the line on the nearer surface, one pixel wide.
    bool mdl=c.b>=0.5; float crease = mdl ? MODEL_CREASE : 0.75;
    if(!bg && !rb && dot(nrm(c),nrm(r))<crease) e=true;
    if(!bg && !ub && dot(nrm(c),nrm(u))<crease) e=true;
    if(mdl && !e){ float zc=invZ(L), zr=invZ(texture(tLit,vUv+vec2(px.x,0.0))), zl=invZ(texture(tLit,vUv-vec2(px.x,0.0))),
      zu=invZ(texture(tLit,vUv+vec2(0.0,px.y))), zd=invZ(texture(tLit,vUv-vec2(0.0,px.y)));
      if(min(zl+zr,zu+zd)-2.0*zc < -MODEL_DEPTH*zc) e=true; }
    if(e){ float l2=max(lum, max(texture(tLit,vUv+vec2(px.x,0.0)).g, texture(tLit,vUv+vec2(0.0,px.y)).g)); bit = l2>0.5 ? 0.0 : 1.0; }
  }
  o=vec4(mix(dark,light,bit),1.0);
}`;
