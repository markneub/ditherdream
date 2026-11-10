// ---------- scene building ----------
// A scene is built between beginScene() and endScene(). Every add() is one object with its own id
// (outlines are drawn between ids). Static objects are baked into one vertex buffer (one draw call,
// which keeps the 6-faces-per-lantern shadow passes cheap); `dyn`, emissive and sea objects keep
// their own buffer and transform.
const HP=Math.PI/2;
let _items=null;
function beginScene(){ _items=[]; }
function add(geo,pos,rot=[0,0,0],shade=1,o={}){
  const it={geo,pos,rot,shade,emit:o.emit||0,kind:o.kind||0,dyn:!!o.dyn,id:_items.length+1};
  it.noShadow=!!(o.noShadow||it.emit||it.kind); it.noLampShadow=!!o.noLampShadow; _items.push(it); return it; }
function packInto(out,it,M){ const g=it.geo;
  for(let i=0;i<g.length;i+=8){ let px=g[i],py=g[i+1],pz=g[i+2],nx=g[i+3],ny=g[i+4],nz=g[i+5];
    if(M){ const x=M[0]*px+M[4]*py+M[8]*pz+M[12], y=M[1]*px+M[5]*py+M[9]*pz+M[13], z=M[2]*px+M[6]*py+M[10]*pz+M[14];
      const a=M[0]*nx+M[4]*ny+M[8]*nz, b=M[1]*nx+M[5]*ny+M[9]*nz, c=M[2]*nx+M[6]*ny+M[10]*nz; px=x;py=y;pz=z;nx=a;ny=b;nz=c; }
    out.push(px,py,pz,nx,ny,nz,g[i+6],g[i+7],it.id,it.shade,it.emit,it.kind); } }
function endScene(props){
  if(_items.length>65000) fail('Too many objects in one scene: '+_items.length+' (ids are 16-bit)');
  const st=[], dyn=[];
  for(const it of _items){ if(it.dyn||it.noShadow){ const d=[]; packInto(d,it,null); it.g=vao(d); dyn.push(it); } else packInto(st,it,M4.trs(it.pos,it.rot)); it.geo=null; }
  const sc=Object.assign({statics:vao(st),dyn,lamps:[],count:_items.length,
    sky:1,sunI:1.9,fill:0,day:false,foam:0,foamR:0,edge:0,cubeFar:25,sunDir:norm([7,6.5,9]),sunAt:[3,0,0],sunHalf:19,orbit:null,tip:''},props);
  sc.sunDir=norm(sc.sunDir);
  sc.sunVP=M4.mul(M4.ortho(-sc.sunHalf,sc.sunHalf,-sc.sunHalf,sc.sunHalf,5,115), M4.lookAt(sc.sunAt.map((v,i)=>v+sc.sunDir[i]*60),sc.sunAt,[0,1,0]));
  // the crescent's bite, offset from the moon's direction
  sc.moon2=norm(sub(sc.sunDir, cross(sc.sunDir,[0,1,0]).map(v=>v*0.022).map((v,i)=>v-[0,0.012,0][i])));
  _items=null; return sc; }
// ---------- imported meshes ----------
// Turns one glTF mesh into a drawable for sc.dyn (kind 2: lattice from position, tone from its texture). Every
// connected piece of the mesh (a rope, a block, a plank) gets its own id from idBase, so outlines separate the parts
// of a "joined" model the way they separate add() calls. Ids from 32768 mark model pixels for the post pass.
function meshPieces(mesh){
  const {pos,idx}=mesh, nv=pos.length/3, weld=new Map(), par=new Int32Array(nv), w=new Int32Array(nv);
  for(let i=0;i<nv;i++){ par[i]=i;                                                    // weld vertices split by UV seams
    const k=Math.round(pos[i*3]*2e3)+','+Math.round(pos[i*3+1]*2e3)+','+Math.round(pos[i*3+2]*2e3); let j=weld.get(k); if(j===undefined) weld.set(k,j=i); w[i]=j; }
  const find=x=>{ while(par[x]!==x){ par[x]=par[par[x]]; x=par[x]; } return x; };
  for(let t=0;t<idx.length;t+=3){ const a=find(w[idx[t]]); par[find(w[idx[t+1]])]=a; par[find(w[idx[t+2]])]=a; }
  const ids=new Map(), piece=new Int32Array(nv);
  for(let i=0;i<nv;i++){ const r=find(w[i]); let id=ids.get(r); if(id===undefined) ids.set(r,id=ids.size); piece[i]=id; }
  return {piece,n:ids.size}; }
// meshes: glTF meshes sharing one texture; mats: one 4x4 per copy (rotation, uniform scale, translation). All copies are
// baked into one buffer; `parts` lists each copy's vertex range and bounding sphere so lamp shadow passes can skip far ones.
function modelBatch(meshes,mats,idBase,shade){
  const pcs=meshes.map(meshPieces), per=pcs.reduce((s,p)=>s+p.n,0), nIdx=meshes.reduce((s,m)=>s+m.idx.length,0);
  if(idBase+per*mats.length>65535) fail('Too many pieces in one scene’s models');
  const d=new Float32Array(nIdx*mats.length*12), parts=[]; let o=0;
  mats.forEach((M,k)=>{ const sc=Math.hypot(M[0],M[1],M[2]), lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9], first=o/12; let base=idBase+k*per;
    meshes.forEach((m,mi)=>{ const {pos,nrm,uv,idx}=m, pc=pcs[mi].piece;
      for(let t=0;t<idx.length;t++){ const i=idx[t], x=pos[i*3],y=pos[i*3+1],z=pos[i*3+2], a=nrm[i*3],b=nrm[i*3+1],c=nrm[i*3+2];
        const p=[M[0]*x+M[4]*y+M[8]*z+M[12], M[1]*x+M[5]*y+M[9]*z+M[13], M[2]*x+M[6]*y+M[10]*z+M[14]];
        for(let q=0;q<3;q++){ if(p[q]<lo[q]) lo[q]=p[q]; if(p[q]>hi[q]) hi[q]=p[q]; }
        d[o++]=p[0]; d[o++]=p[1]; d[o++]=p[2];
        d[o++]=(M[0]*a+M[4]*b+M[8]*c)/sc; d[o++]=(M[1]*a+M[5]*b+M[9]*c)/sc; d[o++]=(M[2]*a+M[6]*b+M[10]*c)/sc;
        d[o++]=uv[i*2]; d[o++]=uv[i*2+1]; d[o++]=base+pc[i]; d[o++]=shade; d[o++]=0; d[o++]=2; }
      base+=pcs[mi].n; });
    parts.push({first,count:o/12-first,c:[(lo[0]+hi[0])/2,(lo[1]+hi[1])/2,(lo[2]+hi[2])/2],r:Math.hypot(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2])/2}); });
  return {g:vao(d),pos:[0,0,0],rot:[0,0,0],count:per*mats.length,parts:mats.length>1?parts:null}; }
function modelObject(mesh,idBase,shade){ return modelBatch([mesh],[M4.trs([0,0,0],[0,0,0])],idBase,shade); }
// A height map for walking on a model: the highest surface under `ymax` in each cell (so decks are floors, and rails,
// masts and anything else more than a step high are walls). parts: [[mesh, ymax], ...]. at(x, z) is null off the map.
function heightField(parts,x0,x1,z0,z1,cell){
  const W=Math.ceil((x1-x0)/cell), H=Math.ceil((z1-z0)/cell), h=new Float32Array(W*H).fill(-99);
  for(const [m,ymax] of parts){ const p=m.pos, ix=m.idx;
    for(let t=0;t<ix.length;t+=3){ const a=ix[t]*3,b=ix[t+1]*3,c=ix[t+2]*3;
      if(Math.min(p[a+1],p[b+1],p[c+1])>ymax) continue;
      // sample the triangle on a barycentric grid finer than the cells (this also catches vertical faces)
      const L=Math.max(Math.hypot(p[a]-p[b],p[a+1]-p[b+1],p[a+2]-p[b+2]),Math.hypot(p[a]-p[c],p[a+1]-p[c+1],p[a+2]-p[c+2]),Math.hypot(p[b]-p[c],p[b+1]-p[c+1],p[b+2]-p[c+2]));
      const n=Math.ceil(L/(cell*0.45))+1;
      for(let i=0;i<=n;i++) for(let j=0;j<=n-i;j++){ const u=i/n,v=j/n,q=1-u-v, y=u*p[a+1]+v*p[b+1]+q*p[c+1]; if(y>ymax) continue;
        const cx=Math.floor((u*p[a]+v*p[b]+q*p[c]-x0)/cell), cz=Math.floor((u*p[a+2]+v*p[b+2]+q*p[c+2]-z0)/cell);
        if(cx>=0&&cz>=0&&cx<W&&cz<H&&y>h[cz*W+cx]) h[cz*W+cx]=y; } } }
  return {W,H,h,at(x,z){ const cx=Math.floor((x-x0)/cell), cz=Math.floor((z-z0)/cell); if(cx<0||cz<0||cx>=W||cz>=H) return null; const y=h[cz*W+cx]; return y<-90?null:y; }}; }

// Walking: sizes, and the collider test every scene's floorAt uses. Circles: [x, z, r]; rects: [x, z, halfX, halfZ].
const WALK = { speed: 2.4, run: 5, eye: 1.7, radius: 0.3, stepUp: 0.45, drop: 0.6 };
function walkBlocked(x, z, circles, rects) {
  const r = WALK.radius;
  for (const c of circles) if (Math.hypot(x - c[0], z - c[1]) < c[2] + r) return true;
  for (const b of rects) if (Math.abs(x - b[0]) < b[2] + r && Math.abs(z - b[1]) < b[3] + r) return true;
  return false;
}
/** Shorthand for the commonest object: a box of size (w,h,d) centred at (x,y,z), turned ry about the vertical. */
function B(w,h,d,x,y,z,shade=1,ry=0,o){ return add(box(w,h,d),[x,y,z],[0,ry,0],shade,o); }
/** A hanging lantern that swings with the ship: a glowing ball on a pivot. */
function lantern(pivot,len,phase,intensity,range){ return {pivot,len,phase,intensity,range,pos:[pivot[0],pivot[1]-len,pivot[2]],obj:add(sphere(0.11+len*0.2,12,8),[0,0,0],[0,0,0],1,{emit:1,dyn:true})}; }

// ---------- the deck: a small ship at night ----------
beginScene();
add(box(600,0.2,600),[0,-2.7,0],[0,0,0],1,{kind:1});                 // sea
add(box(24,2.8,14),[0,-1.6,0],[0,0,0],0.55);                         // hull
add(wedge(6,3,14),[12,-1.5,0],[0,0,0],0.6);                          // bow
for(let i=0;i<14;i++) add(box(24,0.2,1),[0,-0.1,-6.5+i],[0,0,0],0.66+0.06*((i*7)%3)); // planks
for(const z of [-6.85,6.85]){ add(box(24,0.9,0.3),[0,0.45,z],[0,0,0],0.7); add(box(24.2,0.12,0.55),[0,0.96,z],[0,0,0],0.85); }
for(const sgn of [1,-1]){ add(box(9.25,0.9,0.3),[15,0.45,sgn*3.45],[0,sgn*0.862,0],0.7); add(box(9.4,0.12,0.55),[15,0.96,sgn*3.45],[0,sgn*0.862,0],0.85); }
// quarterdeck, steps, balustrade
add(box(6,1.4,13.4),[-9,0.7,0],[0,0,0],0.72);
for(let k=0;k<3;k++) add(box(0.5,1.05-0.35*k,3),[-5.75+0.5*k,(1.05-0.35*k)/2,0],[0,0,0],0.8);
for(let z=-6;z<=6.01;z+=0.75) if(Math.abs(z)>1.6) add(box(0.14,0.8,0.14),[-6.15,1.8,z],[0,0,0],0.9);
for(const sgn of [1,-1]) add(box(0.22,0.12,4.75),[-6.15,2.26,sgn*4.1],[0,0,0],0.9);
// wheel + helmsman
add(box(0.5,1.0,0.5),[-9.2,1.9,0],[0,0,0],0.7);
add(cyl(0.75,0.75,0.12,24),[-8.85,2.5,0],[0,0,HP],0.85);
add(cyl(0.33,0.42,1.5,14),[-10.2,2.15,0.2],[0,0,0],0.6);
add(sphere(0.33,16,10),[-10.2,3.2,0.2],[0,0,0],0.8);
// mast, yards, furled sails, top
add(cyl(0.28,0.42,14,18),[2,7,0],[0,0,0],0.62);
add(cyl(1.0,0.8,0.35,18),[2,9.9,0],[0,0,0],0.7);
add(cyl(0.1,0.1,11,8),[2,8.7,0],[HP,0,0],0.6);
add(cyl(0.34,0.34,9.6,12),[2.25,8.35,0],[HP,0,0],1.0);
add(cyl(0.08,0.08,7,8),[2,12.4,0],[HP,0,0],0.6);
add(cyl(0.26,0.26,6,12),[2.2,12.1,0],[HP,0,0],1.0);
// cargo
add(box(1.6,1.6,1.6),[-1.6,0.8,-4.3],[0,0.15,0],0.9);
add(box(1.1,1.1,1.1),[-1.7,2.15,-4.35],[0,0.6,0],0.95);
add(box(1.3,1.3,1.3),[0.2,0.65,-4.7],[0,-0.2,0],0.8);
add(box(2.2,0.9,1.4),[-2.6,0.45,4.6],[0,0.3,0],0.85);
for(const [x,z] of [[5,4.6],[6.35,4.9],[5.7,3.5]]) add(cyl(0.55,0.55,1.4,18),[x,0.7,z],[0,0,0],0.78);
add(cyl(0.55,0.55,1.4,18),[8.4,0.55,4.2],[HP,0.5,0],0.78);
// hatch
add(box(3.2,0.22,3.2),[7,0.11,0],[0,0,0],0.9);
add(box(2.6,0.3,2.6),[7,0.15,0],[0,0,0],0.3);
// ... its forward part under a grating, the aft part open with the ladder's rails standing out of it
for(let x=6.84;x<8.3;x+=0.28) add(box(0.1,0.06,2.6),[x,0.33,0],[0,0,0],0.9);
for(const z of [-0.45,0.45]) add(box(1.6,0.06,0.08),[7.5,0.33,z],[0,0,0],0.9);
for(const z of [-0.3,0.3]) add(box(0.08,0.75,0.08),[5.82,0.6,z],[0,0,0],0.8);
// cannons
for(const x of [4.5,8.5]){ add(box(1.0,0.45,1.7),[x,0.42,-5.0],[0,0,0],0.6);
  add(cyl(0.2,0.3,2.5,14),[x,0.85,-5.5],[-HP,0,0],0.45);
  for(const dx of [-0.58,0.58]) for(const dz of [-0.5,0.5]) add(cyl(0.25,0.25,0.14,12),[x+dx,0.25,-5.0+dz],[0,0,HP],0.5); }
// lantern
add(box(0.9,0.08,0.08),[2.6,3.3,0],[0,0,0],0.6);
const deckLamp=lantern([3,3.3,0],0.4,0,2.3,7);


const DECK=endScene({ name:'deck', title:'Ship\u2019s deck', foam:1, tip:'the open hatch leads below',
  orbit:{ target:[1,2.6,0], radius:[27,20], theta:0.2, phi:1.2 } });
DECK.lamps.push(deckLamp);
