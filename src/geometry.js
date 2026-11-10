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
