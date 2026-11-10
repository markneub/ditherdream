// ---------- forest at night: a campfire in a clearing, moonlight through conifers ----------
const FO={ trees:[], rocks:[] };
beginScene();
B(600,0.4,600,0,-0.2,0,0.8);                         // ground
B(30,0.04,2.4,21,0.02,0,1);                          // the path in from the east
{ const rnd=rng(7);
  for(let n=0;n<400&&FO.trees.length<85;n++){ const x=(rnd()*2-1)*36, z=(rnd()*2-1)*36, s=0.8+rnd()*0.75;
    if(Math.hypot(x,z)<7 || (x>4&&Math.abs(z)<2.3) || FO.trees.some(t=>Math.hypot(t[0]-x,t[1]-z)<2.7)) continue;
    FO.trees.push([x,z,0.26*s]);
    add(cyl(0.15*s,0.24*s,2.6*s,8),[x,1.3*s,z],[0,0,0],0.5);
    for(let k=0;k<3;k++) add(cyl(0.03,(1.9-0.45*k)*s,2.7*s,9),[x,(2.1+1.65*k+1.35)*s,z],[0,rnd()*3,0],0.5+0.08*k); }
  for(let n=0;n<14;n++){ const x=(rnd()*2-1)*30, z=(rnd()*2-1)*30, r=0.4+rnd()*0.8;
    if(Math.hypot(x,z)<6 || (x>4&&Math.abs(z)<2.6) || FO.trees.some(t=>Math.hypot(t[0]-x,t[1]-z)<r+0.8)) continue;
    add(rock(r,rnd),[x,r*0.3,z],[0,rnd()*3,0],0.7); FO.rocks.push([x,z,r*0.8]); }
  // fire ring
  for(let i=0;i<9;i++){ const a=i/9*6.283; add(rock(0.2,rnd),[0.6*Math.cos(a),0.08,0.6*Math.sin(a)],[0,rnd()*3,0],0.7); } }
for(const ry of [0.3,1.4,2.5]) add(cyl(0.07,0.07,0.9,6),[0,0.16,0],[HP,ry,0.25],0.5);        // firewood
add(cyl(0.3,0.3,2.3,12),[2.5,0.3,0.6],[HP,0.25,0],0.6); add(cyl(0.28,0.28,2.0,12),[-1.3,0.28,-2.5],[HP,1.3,0],0.6);   // logs to sit on
add(wedge(1.7,3.2,2.8),[-3.6,0,3.2],[0,0.6,HP],0.9);                                       // tent
B(0.06,1.9,0.06,-1.9,0.95,2.0,0.6);                                                        // lantern post
const foFire={ pos:[0,0.5,0], intensity:2.5, range:19, flicker:0.3, phase:1, obj:add(rock(0.24,rng(3)),[0,0.5,0],[0,0,0],1,{emit:1,dyn:true}) };
const foLamp={ pos:[-1.9,1.95,2.0], intensity:1.2, range:6, phase:3, obj:add(sphere(0.1,8,6),[-1.9,1.95,2.0],[0,0,0],1,{emit:1,dyn:true}) };

const FOREST=endScene({ name:'forest', title:'Forest at night', sky:0.6, sunI:0.55, edge:40, fill:0.03, cubeFar:32,
  sunDir:[5,6,-3], sunAt:[0,4,0], sunHalf:42, tip:'follow the path to the fire',
  orbit:{ target:[0,2,0], radius:[40,30], theta:0.5, phi:0.95 }, spawn:{ x:24, z:0, yaw:Math.PI/2 } });
FOREST.lamps.push(foFire,foLamp);
FOREST.update=T=>{ foFire.pos=[0.05*Math.sin(T*9.1),0.5+0.06*Math.sin(T*13.7),0.05*Math.sin(T*7.3)]; foFire.obj.rot=[T*2,T*3,0]; };
FO.circles=[...FO.trees,...FO.rocks,[0,0,0.75],[-1.9,2.0,0.1]];
FO.rects=[[2.5,0.6,1.2,0.45],[-1.3,-2.5,0.5,1.05],[-3.6,3.2,1.7,1.7]];
FOREST.floorAt=(x,z)=>(Math.abs(x)>37||Math.abs(z)>37||walkBlocked(x,z,FO.circles,FO.rects))?null:0;
