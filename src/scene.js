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
