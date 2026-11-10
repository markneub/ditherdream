// ---------- lighthouse on a rock: a turning beam, a spiral stair, a keeper's cottage ----------
const LH = { a:17, h:2.6, rIn:2.2, rOut:2.6, top:16, steps:56, per:16, start:0.5 }; // island cap; tower; stair
LH.R=(LH.a*LH.a+LH.h*LH.h)/(2*LH.h); LH.rise=LH.top/LH.steps; LH.dA=Math.PI*2/LH.per; LH.end=LH.start+LH.steps*LH.dA; // stair ends half a turn round
LH.ground=r=>Math.sqrt(LH.R*LH.R-r*r)-LH.R;
const TAU=Math.PI*2, wrap=a=>((a%TAU)+TAU)%TAU;
beginScene();
B(900,0.2,900,0,-2.7,0,1,0,{kind:1});                                              // sea
add(mound(LH.a,LH.h,12,48),[0,0,0],[0,0,0],0.55);                                   // the rock
{ const rnd=rng(11); LH.rocks=[];
  for(let i=0;i<16;i++){ const a=rnd()*TAU, d=10.5+rnd()*6, r=0.5+rnd()*1.3, x=d*Math.cos(a), z=d*Math.sin(a);
    if(Math.abs(z)<2.2&&x<0) continue;                                             // keep the jetty clear
    add(rock(r,rnd),[x,LH.ground(Math.min(d,LH.a))+r*0.25,z],[0,rnd()*3,0],0.6+rnd()*0.25); LH.rocks.push([x,z,r*0.8]); } }
// tower: plinth, wall in bands (door gap at angle 0, facing +x), floor, newel, spiral steps
const DOOR=0.27;
add(sector(LH.rOut,3.0,0.5,DOOR+0.08,TAU-DOOR-0.08,40),[0,-0.05,0],[0,0,0],0.8);
add(sector(LH.rIn,LH.rOut,2.6,DOOR,TAU-DOOR,40),[0,1.0,0],[0,0,0],0.95);
for(const [y0,y1,sh] of [[2.3,6.5,0.95],[6.5,10.5,0.3],[10.5,16,0.95]]) add(sector(LH.rIn,LH.rOut,y1-y0,0,TAU,44),[0,(y0+y1)/2,0],[0,0,0],sh);
add(sector(0,LH.rIn,0.2,0,TAU,32),[0,-0.1,0],[0,0,0],0.7);
add(cyl(0.3,0.3,16,12),[0,8,0],[0,0,0],0.8);
for(let i=0;i<LH.steps;i++) add(sector(0.3,LH.rIn,0.07,LH.start+i*LH.dA,LH.start+(i+1)*LH.dA,3),[0,(i+1)*LH.rise-0.035,0],[0,0,0],0.85);
// lamp room: floor with a well for the stair, gallery ring with a rail, parapet, mullions, roof
const WELL=2.75, GDOOR=LH.end-WELL/2+Math.PI;   // the way out to the gallery is across the room from the stair well
//                                                                   // radians of floor left open above the last steps
add(sector(0.3,LH.rIn,0.2,LH.end,LH.end-WELL+TAU,28),[0,15.9,0],[0,0,0],0.8);
add(sector(LH.rIn,3.5,0.2,0,TAU,44),[0,15.9,0],[0,0,0],0.85);
add(sector(2.0,2.2,0.7,GDOOR+0.45,GDOOR-0.45+TAU,40),[0,16.35,0],[0,0,0],0.9);
for(let i=0;i<8;i++){ const a=i/8*TAU+0.2; B(0.1,2.4,0.1,2.1*Math.cos(a),17.2,2.1*Math.sin(a),0.5,-a); }
add(sector(2.0,2.3,0.12,0,TAU,40),[0,18.46,0],[0,0,0],0.5);
add(cyl(0.05,2.5,1.4,20),[0,19.2,0],[0,0,0],0.4); add(sphere(0.18,10,8),[0,20.0,0],[0,0,0],0.5);
for(let i=0;i<16;i++){ const a=i/16*TAU; B(0.07,1.0,0.07,3.4*Math.cos(a),16.5,3.4*Math.sin(a),0.6,-a); }
add(sector(3.35,3.45,0.06,0,TAU,44),[0,17.02,0],[0,0,0],0.7);
add(cyl(0.4,0.5,1.0,12),[0,16.5,0],[0,0,0],0.5);
// keeper's cottage
{ const x=8.5, z=4.5, y=LH.ground(Math.hypot(x,z))-0.2;
  B(5,2.8,3.6,x,y+1.4,z,0.9); add(wedge(1.5,5.4,4.1),[x,y+2.8,z],[0,0,HP],0.45);
  B(0.6,1.6,0.6,x+1.6,y+3.6,z+0.6,0.6); B(0.9,1.8,0.08,x-0.6,y+0.9,z-1.82,0.3);
  B(0.8,0.7,0.06,x+1.2,y+1.5,z-1.82,1,0,{emit:1}); LH.cottage=[x,z,2.6,1.9]; }
// jetty, out along -x
B(10,0.16,1.6,-20,-2.05,0,0.75); for(const x of [-16,-20,-24.6]) for(const z of [-0.7,0.7]) add(cyl(0.11,0.11,2.2,8),[x,-2.6,z],[0,0,0],0.5);
// the light, and two small lamps on the stair
const lhBeam={ pos:[0,17.3,0], dir:[1,0,0], cone:Math.cos(0.26), intensity:7, range:220, flicker:0, obj:add(sphere(0.35,14,10),[0,17.3,0],[0,0,0],1,{emit:1,dyn:true}) };
const lhStair=[[-1.55,2.3,0.9],[1.3,9.6,-1.1]].map((p,i)=>({ pos:p, intensity:1.3, range:8, phase:i*2, obj:add(sphere(0.09,8,6),p,[0,0,0],1,{emit:1,dyn:true}) }));

const LIGHTHOUSE=endScene({ name:'lighthouse', title:'Lighthouse', foam:2, foamR:LH.a-0.6, fill:0.05, cubeFar:230,
  sunDir:[-6,5,8], sunAt:[0,6,0], sunHalf:27, tip:'the door faces the cottage · stairs go to the lamp',
  orbit:{ target:[0,7,0], radius:[62,46], theta:0.6, phi:1.25 }, spawn:{ x:9.5, z:0, yaw:Math.PI/2 } });
LIGHTHOUSE.lamps.push(lhBeam,...lhStair);
LIGHTHOUSE.update=T=>{ const a=T*0.45, d=norm([Math.cos(a),-0.16,Math.sin(a)]); lhBeam.dir=d; };
/** Several floors can lie above each other here (the stair winds 3.5 turns), so the height you're at picks one. */
LIGHTHOUSE.floorAt=(x,z,y=0)=>{
  const r=Math.hypot(x,z), th=wrap(Math.atan2(z,x)), c=[];
  const inDoor=Math.min(th,TAU-th)<0.2;
  // lamp room and gallery (not the stair well, the parapet except at its gap, or the lamp's pedestal)
  if(r<3.3 && r>0.85){ const well=r<LH.rIn && wrap(LH.end-th)<WELL, parapet=r>1.7&&r<2.5&&Math.abs(wrap(th-GDOOR+Math.PI)-Math.PI)>0.36; if(!well&&!parapet) c.push(LH.top); }
  // the rock outside, the doorway, the jetty
  if(r>3.3 && r<LH.a-1.3 && !walkBlocked(x,z,LH.rocks,[LH.cottage])) c.push(LH.ground(r));
  if(r>1.8 && r<=3.3 && inDoor) c.push(0);
  if(x<-14.8 && x>-24.7 && Math.abs(z)<0.5) c.push(-1.97);
  // inside: the ground floor, and every turn of the stair that passes over this spot
  if(r>0.6 && r<1.9){ c.push(0); const rel=wrap(th-LH.start);
    for(let k=0;k<4;k++){ const h=((rel+TAU*k)/LH.dA+0.5)*LH.rise; if(h<=LH.top+LH.rise) c.push(Math.min(h,LH.top)); } }
  if(!c.length) return null;
  // the highest floor within a step's reach (a stair tread wins over the floor under it); else the nearest, which the caller will refuse
  const reach=c.filter(h=>h-y<=WALK.stepUp+0.01 && y-h<=WALK.drop);
  return reach.length ? Math.max(...reach) : c.reduce((a,b)=>Math.abs(b-y)<Math.abs(a-y)?b:a);
};
