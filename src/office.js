// ---------- the office: an empty corporate floor under flickering fluorescent tubes ----------
// 40 x 30 m (x -20..20, z -15..15), ceiling at OH. Walls, doors, cubicle partitions, pillars and light fittings are
// built here; the furniture is Poly Haven models (CC0) loaded from assets/ the first time the scene is opened.
// Rooms: reception (SW, the spawn), pillar hall (S), the lone-chair room (SE), the cubicle farm (middle), a corridor
// and three offices (E), meeting room and break room (NW), a long corridor with a store room behind it (NE).
const OH=3.0, OT=0.14, DOOR_H=2.05;
const OF={ rects:[], circles:[], inst:{}, fix:[] };
beginScene();
B(40,0.2,30,0,-0.1,0,0.5);                                                                // carpet
// a drop ceiling: 1.2 x 0.6 m tiles (the outline between neighbours is the grid), slightly uneven, a few missing
const TILE=(x,z)=>[-19.4+1.2*Math.round((x+19.4)/1.2), -14.7+0.6*Math.round((z+14.7)/0.6)];
{ const rnd=rng(5); for(let i=0;i<34;i++) for(let j=0;j<50;j++){ const gap=rnd()<0.012; B(1.2,0.04,0.6,-19.4+1.2*i,OH+0.02+(gap?0.5:0),-14.7+0.6*j,gap?0.08:0.84+0.08*rnd()); } }
// A wall piece between two points on an axis-aligned centre line.
function oSeg(x0,z0,x1,z1,y0=0,y1=OH,shade=0.76){ const w=Math.abs(x1-x0)||OT, d=Math.abs(z1-z0)||OT;
  B(w,y1-y0,d,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,shade); if(y0<1.6) OF.rects.push([(x0+x1)/2,(z0+z1)/2,w/2,d/2]); }
// A wall along `ax` ('x' or 'z') at coordinate c, from a to b, with doors: [position, swing side (+1/-1), closed?].
// An open door is a 1.6 m gap with a lintel, a frame, and two leaves standing open at right angles on the swing side;
// a closed one is just a leaf and frame on that face of the wall (it leads nowhere).
function oWall(ax,c,a,b,doors=[]){ const P=(u,v)=>ax==='x'?[u,v]:[v,u]; let cur=a;
  const piece=(u0,u1,y0,y1)=>{ const p=P(u0,c), q=P(u1,c); oSeg(p[0],p[1],q[0],q[1],y0,y1); };
  const bx=(su,sy,sv,u,y,v,shade)=>{ const p=P(u,v), s=P(su,sv); B(s[0],sy,s[1],p[0],y,p[1],shade); };
  for(const [p,side,closed] of [...doors].sort((m,n)=>m[0]-n[0])){ const w=closed?1.0:1.6;
    if(closed){ bx(w,DOOR_H,0.04,p,DOOR_H/2,c+side*(OT/2+0.02),0.68); bx(0.05,0.05,0.08,p+0.38,1.0,c+side*(OT/2+0.06),0.4); }
    else { piece(cur,p-w/2); piece(p-w/2,p+w/2,DOOR_H,OH); cur=p+w/2;
      for(const e of [-1,1]){ bx(0.04,DOOR_H-0.04,w/2-0.04,p+e*w/2,DOOR_H/2,c+side*(w/4+OT/2),0.68); const l=P(p+e*w/2,c+side*(w/4+OT/2)), h=P(0.02,w/4); OF.rects.push([l[0],l[1],h[0],h[1]]); } }
    for(const e of [-1,1]) bx(0.07,DOOR_H,OT+0.06,p+e*(w/2+0.01),DOOR_H/2,c,0.55);
    bx(w+0.16,0.07,OT+0.06,p,DOOR_H+0.035,c,0.55); }
  piece(cur,b); }
// outer walls
oWall('x',-15,-20,20); oWall('x',15,-20,20,[[-17,-1,1],[14,-1,1]]); oWall('z',-20,-15,15,[[2,1,1]]); oWall('z',20,-15,15,[[-8.5,-1,1],[11,-1,1]]);
// the south band (reception | pillar hall | lone-chair room) and its wall to the middle
oWall('x',7,-20,20,[[-15,1],[0,-1],[7,-1]]); oWall('z',-10,7,15,[[11,1]]); oWall('z',8,7,15,[[11.5,-1]]);
// the middle band: cubicle farm | corridor | three offices
oWall('z',6,-7,7,[[-4,1],[4,-1]]); oWall('z',9,-7,7,[[-4.6,1],[0,1],[4.6,1]]); oWall('x',-2.3,9,20); oWall('x',2.3,9,20);
// the north band: meeting room | break room | long corridor, with the store room behind it
oWall('x',-7,-20,20,[[-14,-1],[-4.5,-1],[7.5,1]]); oWall('z',-9,-15,-7); oWall('z',0,-15,-7,[[-8.5,-1]]); oWall('x',-10,0,20,[[14,-1],[5,1,1]]);
// pillars in the hall and at the open end of the farm
for(const [x,z] of [[-5,9.6],[-5,12.4],[-1,9.6],[-1,12.4],[3,9.6],[3,12.4],[2.5,-3.5],[2.5,3.5]]){ B(0.5,OH,0.5,x,OH/2,z,0.8); OF.rects.push([x,z,0.25,0.25]); }
// cubicles: two spines along x with six bays on each side (partitions 1.5 m high, you can see over them)
const CUB_X0=-16.6, CUB_W=2.6, CUB_D=2.2, SPINES=[-3.2,3.2];
function oPart(x0,z0,x1,z1){ const w=Math.abs(x1-x0)||0.06, d=Math.abs(z1-z0)||0.06; B(w,1.5,d,(x0+x1)/2,0.75,(z0+z1)/2,0.62); B(w+0.02,0.04,d+0.02,(x0+x1)/2,1.52,(z0+z1)/2,0.4); OF.rects.push([(x0+x1)/2,(z0+z1)/2,w/2,d/2]); }
for(const zs of SPINES){ oPart(CUB_X0,zs,CUB_X0+6*CUB_W,zs); for(let i=0;i<=6;i++) oPart(CUB_X0+i*CUB_W,zs-CUB_D,CUB_X0+i*CUB_W,zs+CUB_D); }
// break room counter, and shelves in the store room (built, not models)
B(3.2,0.9,0.6,-4.5,0.45,-14.55,0.7); B(3.3,0.05,0.66,-4.5,0.92,-14.55,0.9); OF.rects.push([-4.5,-14.55,1.6,0.33]);
for(const x of [3,7.5]){ for(const y of [0.5,1.1,1.7]) B(2.4,0.04,0.5,x,y,-14.6,0.75); for(const e of [-1.2,1.2]) B(0.05,1.9,0.5,x+e,0.95,-14.6,0.6); OF.rects.push([x,-14.6,1.2,0.25]); }
for(const [x,z,s,r] of [[3,-14.6,0.4,0.2],[7.9,-14.6,0.35,0.5],[17.5,-13.6,0.6,0.3],[18.3,-12.7,0.5,1.1],[17.6,-13.5,0.45,0.8]]) add(box(s,s,s),[x,z===-14.6?1.12+s/2:(x===17.6?0.6+s/2:s/2),z],[0,r,0],0.85); // cartons
OF.rects.push([17.9,-13.2,0.75,0.75]);

// Light fittings: [x, z, kind]. 0 steady, 1 flickering, 2 dying (mostly dark, strikes now and then), 3 dead.
// Each is a panel set into the ceiling grid in place of a tile: a dark one, with a glowing one under it while it is lit.
const TUBE_Y=OH-0.02;
function oLights(list){ for(const [px,pz,kind=0] of list){ const [x,z]=TILE(px,pz), f={x,z,kind,seed:OF.fix.length*7.31+1.7,on:1};
  B(1.14,0.02,0.54,x,OH-0.008,z,0.3);
  if(kind<3) f.obj=add(box(1.12,0.02,0.52),[x,TUBE_Y,z],[0,0,0],1,{emit:1,dyn:true});
  OF.fix.push(f); } }
oLights([[-17,12.5],[-13,10],                                                          // reception
  [-7,11],[-3,11,3],[1,11,1],[5,11],[-3,13.8,3],                                         // pillar hall
  [14,11,2],[17,13,3],[11,13,3],                                                         // lone-chair room
  [-18.3,-4],[-18.3,3],[-14,0],[-8.8,0],[-3.6,0],[-14,6.1,3],[-8.8,6.1],[-3.6,6.1,3],[-14,-6.1],[-8.8,-6.1,3],[-3.6,-6.1,1],[2.5,0],[3.5,-5,3],[3.5,5],  // farm
  [7.5,-4.5],[7.5,0.5],[7.5,5],                                                        // corridor
  [14.5,-4.6],[14.5,0,1],[14.5,4.6],                                                   // offices
  [-14.5,-11],[-4.5,-11],                                                              // meeting, break room
  [3,-8.5],[8,-8.5,3],[12.5,-8.5,1],[17,-8.5],                                           // long corridor
  [9,-12.5,2]]);                                                                         // store room

// Furniture: OF.inst[model] = [[x, y, z, ry, scale], ...]. Models face +z at ry 0. Colliders go in by hand.
const put=(name,x,z,ry=0,y=0,s=1)=>{ (OF.inst[name]=OF.inst[name]||[]).push([x,y,z,ry,s]); };
const quarter=ry=>Math.round(Math.abs(ry)/HP)%2===1;
const desk=(x,z,ry)=>{ put('metal_office_desk',x,z,ry); OF.rects.push(quarter(ry)?[x,z,0.47,1.0]:[x,z,1.0,0.47]); };
const chair=(x,z,ry)=>{ put('modern_arm_chair_01',x,z,ry); OF.circles.push([x,z,0.36]); };
const mono=(x,z,ry)=>{ put('plastic_monobloc_chair_01',x,z,ry); OF.circles.push([x,z,0.28]); };
const table=(x,z,ry)=>{ put('dining_table',x,z,ry); OF.rects.push(quarter(ry)?[x,z,0.68,1.12]:[x,z,1.12,0.68]); };
const tv=(x,z,ry,y=0.79)=>put('Television_01',x,z,ry,y);
const plant=(x,z,ry=0)=>{ put('potted_plant_04',x,z,ry,0,3.4); OF.circles.push([x,z,0.3]); };
// cubicles: [spine, side (+1 south of the spine, -1 north), bay 0..5, what's in it]. d desk, c chair, t screen, x chair left askew
{ const rnd=rng(11);
  for(const [sp,side,bay,what] of [[0,-1,0,'dct'],[0,-1,1,'dc'],[0,-1,3,'dt'],[0,-1,4,'dx'],[0,1,0,'d'],[0,1,2,'dct'],[0,1,3,'dct'],[0,1,5,'dx'],
      [1,-1,1,'dct'],[1,-1,2,'d'],[1,-1,4,'dct'],[1,-1,5,'c'],[1,1,0,'dt'],[1,1,2,'x'],[1,1,3,'dct'],[1,1,4,'dc']]){
    const x=CUB_X0+(bay+0.5)*CUB_W, zs=SPINES[sp], ry=side>0?0:Math.PI, dz=zs+side*0.55;
    if(what.includes('d')) desk(x,dz,ry);
    if(what.includes('t')) tv(x+(rnd()-0.5)*0.8,dz-side*0.1,ry+(rnd()-0.5)*0.5);
    if(what.includes('c')) chair(x+(rnd()-0.5)*0.5,dz+side*0.95,ry+Math.PI+(rnd()-0.5)*0.7);
    if(what.includes('x')) chair(x+0.5,dz+side*1.35,rnd()*6.28); } }
// reception: a desk facing the door you can't open, a sofa, a plant, a clock
desk(-16.5,9.6,0); chair(-16.5,8.75,0.2); tv(-17,9.55,0.3); put('sofa_02',-19.3,12.2,HP); OF.rects.push([-19.3,12.2,0.45,0.9]); plant(-19.3,14.3); plant(-10.7,7.8,2);
// The clocks: the model's glass is opaque here and its numerals are only texture, so the marks and hands are added in front.
// `face` is the way it looks (+1 towards +z, -1 towards -z); both stopped at the same time.
function oClock(x,z,face){ const s=2.2, y=2.3, r=0.14*s, zf=z+face*0.052*s; put('wall_clock',x,z,face>0?0:Math.PI,y,s);
  const mark=(th,len,wid,rad,dz)=>add(box(wid,len,0.006),[x+face*Math.sin(th)*rad,y+Math.cos(th)*rad,zf+face*dz],[0,0,-face*th],0.05);
  for(let h=0;h<12;h++) mark(h*Math.PI/6,h%3?0.035:0.06,h%3?0.014:0.024,r*0.86,0);
  mark((3+47/60)*Math.PI/6,r*0.5,0.03,r*0.25,0.008); mark(47*Math.PI/30,r*0.8,0.02,r*0.4,0.016); }
oClock(-13,14.92,-1); oClock(-14.5,-14.92,1);
// the lone-chair room: one plastic chair in front of a screen on the floor
mono(14.6,11.4,HP+0.1); tv(16.4,11.3,-HP,0);
add(box(0.01,0.25,0.33),[16.17,0.25,11.31],[0,0,0],1,{emit:1});                         // ... which is on
// offices: a desk and chair each; the middle one has been left in a hurry
desk(18.2,-4.6,-HP); chair(19.1,-4.5,-HP+0.2); tv(18.2,-4.2,-HP); plant(19.3,-6.4);
desk(17.5,0.2,-HP+0); chair(15.6,1.3,2.4); put('modern_arm_chair_01',13,-1.2,0.6); OF.circles.push([13,-1.2,0.36]);
desk(18.2,4.6,-HP); chair(19.1,4.8,-HP-0.3); tv(18.25,5.1,-HP-0.2); put('sofa_02',10.6,6.4,Math.PI); OF.rects.push([10.6,6.4,0.9,0.45]);
// meeting room: a long table, plastic chairs round it, one of them over by the wall
table(-15.6,-11,0); table(-13.4,-11,0);
for(const x of [-16.2,-14.6,-13,-12]){ mono(x,-12.15,0.1*(x%2)); mono(x+0.3,-9.85,Math.PI+0.15); }
mono(-10.2,-14.2,-0.8); tv(-17.8,-11,HP,0.87);
// break room: two tables and a few chairs
table(-6.5,-9.6,HP); mono(-7.6,-9.4,HP); mono(-5.4,-10,-HP+0.3); mono(-1.2,-13.8,-2.2); mono(-1.5,-12.9,-1.4); plant(-8.3,-14.3,1);
// the long corridor, the hall and the farm's open end
put('WetFloorSign_01',10.5,-8.3,0.4); OF.circles.push([10.5,-8.3,0.2]); put('WetFloorSign_01',-1.5,10.2,2); OF.circles.push([-1.5,10.2,0.2]);
chair(1.2,12.9,2.5); plant(4.6,-6.2); desk(3.8,2.2,HP); tv(3.75,2.3,HP+0.2); mono(18.6,-8.4,-HP);

// three lamps do the lighting: each frame they sit at the three nearest working fittings (see update)
const officeLamps=[0,1,2].map(i=>({pos:[0,OH-0.3,0],intensity:0,range:9.5,flicker:0,phase:i}));
const OFFICE=endScene({ name:'office', title:'The office', loadingText:'loading the furniture…', sky:1.7, sunI:0, noSun:true, fill:0.2, cubeFar:14,
  spawn:{ x:-17.6, z:12.6, yaw:-Math.PI/2 }, tip:'nobody else is here' });
OFFICE.lamps.push(...officeLamps);
OFFICE.floorAt=(x,z)=>(Math.abs(x)>19.9||Math.abs(z)>14.9||walkBlocked(x,z,OF.circles,OF.rects))?null:0;
// How lit a fitting is at time T, 0..1. Most are steady; four stutter now and then and two are nearly dead.
function tubeOn(f,T){ const h=k=>{ const v=Math.sin((Math.floor(T*k)+f.seed)*127.1+f.seed*311.7)*43758.5453; return v-Math.floor(v); };
  if(f.kind===0) return 1;
  if(f.kind===1) return h(0.4)<0.1 ? (h(12)<0.55?1:0.15) : 1;                             // steady; a short stutter every half minute or so
  if(f.kind===2) return h(0.25)<0.18 ? (h(10)<0.45?1:0) : 0;                              // dark; tries to strike now and then
  return 0; }
OFFICE.update=T=>{
  const px=player.x, pz=player.z, near=[];
  for(const f of OF.fix){ if(f.kind===3) continue; f.on=tubeOn(f,T); f.obj.pos[1]=f.on>0.3?TUBE_Y:-50; f.d=Math.hypot(f.x-px,f.z-pz); near.push(f); }
  near.sort((a,b)=>a.d-b.d);
  // the lamps fade out as their fitting is about to stop being one of the nearest three, so the swap never shows
  const d4=near[3].d;
  officeLamps.forEach((l,i)=>{ const f=near[i]; l.pos=[f.x,OH-0.3,f.z]; l.intensity=1.9*f.on*Math.min(1,(d4-f.d)/1.5); });
};
OFFICE.load=()=>OFFICE._load||(OFFICE._load=(async()=>{
  const SHADE={ metal_office_desk:0.75, modern_arm_chair_01:0.6, Television_01:0.5, WetFloorSign_01:0.95, wall_clock:0.9, potted_plant_04:0.65, plastic_monobloc_chair_01:0.92, sofa_02:0.6, dining_table:0.8 };
  let id=32768;
  for(const [name,meshes] of await Promise.all(Object.keys(OF.inst).map(async n=>[n,await loadGLTF(`assets/${n}/${n}.gltf`)]))){
    const mats=OF.inst[name].map(([x,y,z,ry,s])=>{ const M=M4.trs([x,y,z],[0,ry,0]); for(let k=0;k<12;k++) M[k]*=s; return M; });
    for(const image of new Set(meshes.map(m=>m.image))){                                  // one batch per texture
      const o=modelBatch(meshes.filter(m=>m.image===image),mats,id,SHADE[name]||0.8); id+=o.count;
      o.tex=image?await loadTexture(image):{t:whiteTex,mean:1}; o.contrast=1.3; OFFICE.dyn.push(o); } }
  OFFICE.ready=true;
})().catch(e=>{ OFFICE._load=null; throw e; }));
