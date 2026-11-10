// ---------- math (column-major) ----------
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a)||1;return [a[0]/l,a[1]/l,a[2]/l];};
const M4 = {
  mul(a,b){ const o=new Float32Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++){ let s=0; for(let k=0;k<4;k++) s+=a[k*4+r]*b[c*4+k]; o[c*4+r]=s; } return o; },
  persp(fy,asp,n,f){ const t=1/Math.tan(fy/2), o=new Float32Array(16); o[0]=t/asp; o[5]=t; o[10]=(f+n)/(n-f); o[11]=-1; o[14]=2*f*n/(n-f); return o; },
  ortho(l,r,b,t,n,f){ const o=new Float32Array(16); o[0]=2/(r-l); o[5]=2/(t-b); o[10]=-2/(f-n); o[12]=-(r+l)/(r-l); o[13]=-(t+b)/(t-b); o[14]=-(f+n)/(f-n); o[15]=1; return o; },
  lookAt(e,t,u){ let z=norm(sub(e,t)), x=norm(cross(u,z)), y=cross(z,x);
    return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -dot(x,e),-dot(y,e),-dot(z,e),1]); },
  trs(p,r){ const [cx,cy,cz]=r.map(Math.cos), [sx,sy,sz]=r.map(Math.sin);
    const m=[ cy*cz, cx*sz+sx*sy*cz, sx*sz-cx*sy*cz,  -cy*sz, cx*cz-sx*sy*sz, sx*cz+cx*sy*sz,  sy, -sx*cy, cx*cy ];
    return new Float32Array([m[0],m[1],m[2],0, m[3],m[4],m[5],0, m[6],m[7],m[8],0, p[0],p[1],p[2],1]); }
};

// ---------- geometry: pos3 normal3 uv2 (uv in object units, ~isometric) ----------
function nTri(a,b,c){ return norm(cross(sub(b,a),sub(c,a))); }
function G(){ const v=[];
  const tp=(p,n)=>{ const a=n.map(Math.abs); return a[0]>=a[1]&&a[0]>=a[2] ? [p[2],p[1]] : a[1]>=a[2] ? [p[0],p[2]] : [p[0],p[1]]; };
  return { v, tri(a,b,c,na,nb,nc,ua,ub,uc){ const fn=nTri(a,b,c); na=na||fn; nb=nb||na; nc=nc||na;
    ua=ua||tp(a,fn); ub=ub||tp(b,fn); uc=uc||tp(c,fn);
    v.push(...a,...na,...ua, ...b,...nb,...ub, ...c,...nc,...uc); } }; }
function box(w,h,d){ const g=G(), x=w/2,y=h/2,z=d/2;
  const q=(a,b,c,d2)=>{ g.tri(a,b,c); g.tri(a,c,d2); };
  q([-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]); q([x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]);
  q([x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z]); q([-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z]);
  q([-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z]); q([-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z]);
  return g.v; }
// triangular prism: base edge at x=0 spanning z=±d/2, apex at x=len
function wedge(len,h,d){ const g=G(), y=h/2, z=d/2, ctr=[len/3,0,0];
  const t=(a,b,c)=>{ const n=nTri(a,b,c), m=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,(a[2]+b[2]+c[2])/3]; if(dot(n,sub(m,ctr))<0) g.tri(a,c,b); else g.tri(a,b,c); };
  const A=[0,-y,-z],B=[0,-y,z],C=[len,-y,0],A2=[0,y,-z],B2=[0,y,z],C2=[len,y,0];
  t(A2,B2,C2); t(A,B,C); t(A,C,C2); t(A,C2,A2); t(B,C,C2); t(B,C2,B2); t(A,B,B2); t(A,B2,A2);
  return g.v; }
function cyl(rt,rb,h,s){ const g=G(), y=h/2, rm=(rt+rb)/2;
  for(let i=0;i<s;i++){ const a0=i/s*Math.PI*2, a1=(i+1)/s*Math.PI*2;
    const c0=[Math.cos(a0),0,Math.sin(a0)], c1=[Math.cos(a1),0,Math.sin(a1)];
    const sl=(rb-rt)/h, n0=norm([c0[0],sl,c0[2]]), n1=norm([c1[0],sl,c1[2]]);
    const b0=[rb*c0[0],-y,rb*c0[2]], b1=[rb*c1[0],-y,rb*c1[2]], t0=[rt*c0[0],y,rt*c0[2]], t1=[rt*c1[0],y,rt*c1[2]];
    const u0=a0*rm, u1=a1*rm;
    g.tri(b0,t1,b1,n0,n1,n1,[u0,-y],[u1,y],[u1,-y]); g.tri(b0,t0,t1,n0,n0,n1,[u0,-y],[u0,y],[u1,y]);
    g.tri([0,y,0],t1,t0,[0,1,0],[0,1,0],[0,1,0],[0,0],[t1[0],t1[2]],[t0[0],t0[2]]);
    g.tri([0,-y,0],b0,b1,[0,-1,0],[0,-1,0],[0,-1,0],[0,0],[b0[0],b0[2]],[b1[0],b1[2]]); }
  return g.v; }
function sphere(r,ws,hs){ const g=G(), P=(i,j)=>{ const th=j/hs*Math.PI, ph=i/ws*Math.PI*2; return [Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph)]; };
  for(let j=0;j<hs;j++) for(let i=0;i<ws;i++){ const a=P(i,j),b=P(i+1,j),c=P(i+1,j+1),d=P(i,j+1), s=v=>v.map(t=>t*r);
    if(j>0) g.tri(s(a),s(b),s(c),a,b,c); if(j<hs-1) g.tri(s(a),s(c),s(d),a,c,d); }
  return g.v; }
// A slung cloth (hammock): hangs along x with a parabolic sag, narrow at the ends, edges curled up. Normals face up.
function sling(len,width,sag,nx=12,nz=6){ const g=G();
  const P=(i,j)=>{ const t=i/nx*2-1, sgm=j/nz*2-1, w=width/2*(1-0.8*t*t)+0.03;
    return [t*len/2, -sag*(1-t*t)+0.3*width*sgm*sgm*(1-t*t), sgm*w]; };
  const Nn=(i,j)=>{ const a=P(Math.max(i-1,0),j), b=P(Math.min(i+1,nx),j), c=P(i,Math.max(j-1,0)), d=P(i,Math.min(j+1,nz)); return norm(cross(sub(d,c),sub(b,a))); };
  const U=p=>[p[0],p[2]];
  for(let i=0;i<nx;i++) for(let j=0;j<nz;j++){ const a=P(i,j),b=P(i+1,j),c=P(i+1,j+1),d=P(i,j+1), na=Nn(i,j),nb=Nn(i+1,j),nc=Nn(i+1,j+1),nd=Nn(i,j+1);
    g.tri(a,b,c,na,nb,nc,U(a),U(b),U(c)); g.tri(a,c,d,na,nc,nd,U(a),U(c),U(d)); }
  return g.v; }
// Solid annular sector (a slice of a thick ring) around the y axis: radii r0..r1, height h centred on y=0,
// angles a0..a1. Used for tower walls with a door gap, spiral steps, ring floors.
function sector(r0,r1,h,a0,a1,segs){ const g=G(), y=h/2, P=(r,a,yy)=>[r*Math.cos(a),yy,r*Math.sin(a)];
  for(let i=0;i<segs;i++){ const b0=a0+(a1-a0)*i/segs, b1=a0+(a1-a0)*(i+1)/segs, n0=[Math.cos(b0),0,Math.sin(b0)], n1=[Math.cos(b1),0,Math.sin(b1)], m0=n0.map(v=>-v), m1=n1.map(v=>-v);
    const A=P(r1,b0,-y),B=P(r1,b1,-y),C=P(r1,b1,y),D=P(r1,b0,y), E=P(r0,b0,-y),F=P(r0,b1,-y),H=P(r0,b1,y),I=P(r0,b0,y);
    const u0=b0*r1,u1=b1*r1,v0=b0*r0,v1=b1*r0;
    g.tri(A,C,B,n0,n1,n1,[u0,-y],[u1,y],[u1,-y]); g.tri(A,D,C,n0,n0,n1,[u0,-y],[u0,y],[u1,y]);       // outer
    if(r0>0){ g.tri(E,F,H,m0,m1,m1,[v0,-y],[v1,-y],[v1,y]); g.tri(E,H,I,m0,m1,m0,[v0,-y],[v1,y],[v0,y]); } // inner
    const up=[0,1,0], dn=[0,-1,0];
    g.tri(D,H,C,up,up,up); g.tri(D,I,H,up,up,up); g.tri(A,B,F,dn,dn,dn); g.tri(A,F,E,dn,dn,dn); }
  if(a1-a0<Math.PI*2-1e-6) for(const [a,sg] of [[a0,-1],[a1,1]]){ const n=[-Math.sin(a)*sg,0,Math.cos(a)*sg], A=P(r0,a,-y),B=P(r1,a,-y),C=P(r1,a,y),D=P(r0,a,y), U=(r,yy)=>[r,yy];
    g.tri(A,B,C,n,n,n,U(r0,-y),U(r1,-y),U(r1,y)); g.tri(A,C,D,n,n,n,U(r0,-y),U(r1,y),U(r0,y)); }
  return g.v; }
// Inside of a barrel vault: half a cylinder of radius r along x (length len), normals facing the axis.
function vault(r,len,segs){ const g=G(), x=len/2;
  for(let i=0;i<segs;i++){ const a0=Math.PI*i/segs, a1=Math.PI*(i+1)/segs, c0=[0,Math.sin(a0),Math.cos(a0)], c1=[0,Math.sin(a1),Math.cos(a1)], n0=c0.map(v=>-v), n1=c1.map(v=>-v);
    const A=[-x,r*c0[1],r*c0[2]],B=[x,r*c0[1],r*c0[2]],C=[x,r*c1[1],r*c1[2]],D=[-x,r*c1[1],r*c1[2]];
    g.tri(A,B,C,n0,n0,n1,[-x,a0*r],[x,a0*r],[x,a1*r]); g.tri(A,C,D,n0,n1,n1,[-x,a0*r],[x,a1*r],[-x,a1*r]); }
  return g.v; }
// Spherical cap (a low mound): base radius a, height h, apex at y=0, rim at y=-h.
function mound(a,h,rings=10,segs=40){ const g=G(), R=(a*a+h*h)/(2*h), am=Math.asin(a/R);
  const P=(i,j)=>{ const th=am*i/rings, ph=Math.PI*2*j/segs; return [R*Math.sin(th)*Math.cos(ph), R*Math.cos(th)-R, R*Math.sin(th)*Math.sin(ph)]; };
  const Nn=p=>norm([p[0],p[1]+R,p[2]]), U=p=>[p[0],p[2]];
  for(let i=0;i<rings;i++) for(let j=0;j<segs;j++){ const A=P(i,j),B=P(i+1,j),C=P(i+1,j+1),D=P(i,j+1);
    g.tri(A,C,B,Nn(A),Nn(C),Nn(B),U(A),U(C),U(B)); if(i>0) g.tri(A,D,C,Nn(A),Nn(D),Nn(C),U(A),U(D),U(C)); }
  return g.v; }
/** Seeded random numbers, so scenes come out the same every time. */
function rng(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
// Flat-faced frustum / pyramid / obelisk: like cyl() but each side is one flat facet (rt = 0.01 for a point).
function flatcyl(rt,rb,h,s){ const g=G(), y=h/2;
  for(let i=0;i<s;i++){ const a0=i/s*Math.PI*2, a1=(i+1)/s*Math.PI*2, c0=[Math.cos(a0),Math.sin(a0)], c1=[Math.cos(a1),Math.sin(a1)];
    const b0=[rb*c0[0],-y,rb*c0[1]], b1=[rb*c1[0],-y,rb*c1[1]], t0=[rt*c0[0],y,rt*c0[1]], t1=[rt*c1[0],y,rt*c1[1]];
    const n=norm(cross(sub(t0,b0),sub(b1,b0))), w=Math.hypot(b1[0]-b0[0],b1[2]-b0[2]), wt=Math.hypot(t1[0]-t0[0],t1[2]-t0[2]), sl=Math.hypot(h,rb-rt);
    g.tri(b0,t1,b1,n,n,n,[-w/2,0],[wt/2,sl],[w/2,0]); g.tri(b0,t0,t1,n,n,n,[-w/2,0],[-wt/2,sl],[wt/2,sl]);
    g.tri([0,y,0],t1,t0,[0,1,0],[0,1,0],[0,1,0]); g.tri([0,-y,0],b0,b1,[0,-1,0],[0,-1,0],[0,-1,0]); }
  return g.v; }
// A rough boulder: an octahedron with its corners pushed about (flat facets).
function rock(r,rnd){ const g=G(), j=()=>0.7+0.6*rnd(), P=[[r*j(),0,0],[-r*j(),0,0],[0,r*j()*0.8,0],[0,-r*0.6,0],[0,0,r*j()],[0,0,-r*j()]];
  for(const [a,b,c] of [[0,2,4],[4,2,1],[1,2,5],[5,2,0],[4,3,0],[1,3,4],[5,3,1],[0,3,5]]){ const n=nTri(P[a],P[b],P[c]), ctr=[0,0,0], m=P[a].map((v,i)=>(v+P[b][i]+P[c][i])/3);
    if(dot(n,m)<0) g.tri(P[a],P[c],P[b]); else g.tri(P[a],P[b],P[c]); }
  return g.v; }
