// ---------- cathedral: a long nave, columns, sunlight in bars through the south windows ----------
const CA={ cols:[], pews:[] };
beginScene();
for(let i=0;i<10;i++) for(let j=0;j<5;j++) B(4,0.2,2.92,-18+4*i,-0.1,-5.84+2.92*j,(i+j)%2?0.62:0.82);   // floor slabs
for(const sg of [1,-1]){ const z=sg*7.3;                                                          // side walls with tall windows
  B(40.6,3,0.6,0,1.5,z,0.9); B(40.6,1.5,0.6,0,10.25,z,0.9);
  for(let x=-20;x<=20;x+=4) B(x===-20||x===20?1.8:2.4,6.5,0.6,x===-20?-19.4:x===20?19.4:x,6.25,z,0.9);
  for(let x=-18;x<=18;x+=4){ B(0.12,6.5,0.2,x,6.25,z,0.5); B(1.6,0.12,0.2,x,7.6,z,0.5); B(1.6,0.12,0.2,x,5.2,z,0.5); }
  B(34,1.0,0.9,0,10.3,sg*3.6,0.88);                                                               // arcade over the columns
  for(let x=-16;x<=16;x+=4){ add(cyl(0.42,0.48,9,18),[x,4.9,sg*3.6],[0,0,0],0.92); B(1.3,0.4,1.3,x,0.2,sg*3.6,0.8); B(1.25,0.4,1.25,x,9.6,sg*3.6,0.8); CA.cols.push([x,sg*3.6,0.7]); } }
B(0.6,11,15.2,-20.3,5.5,0,0.9);                                                                   // west wall
B(0.6,4,15.2,20.3,2,0,0.9); B(0.6,1,15.2,20.3,10.5,0,0.9); for(const sg of [1,-1]) B(0.6,6,6.1,20.3,7,sg*4.55,0.9);   // east wall, one tall window
for(const z of [-0.5,0.5]) B(0.2,6,0.12,20.3,7,z,0.5); B(0.2,0.12,3,20.3,8.2,0,0.5);
for(const x of [-20.3,20.3]) add(sector(0,7.6,0.6,-HP,HP,28),[x,11,0],[0,0,HP],0.9);              // gable ends
add(vault(7.3,40.6,24),[0,11,0],[0,0,0],0.85);                                                    // barrel vault
for(let x=-13;x<=7.1;x+=1.6) for(const sg of [1,-1]){ B(0.5,0.08,1.7,x,0.5,sg*1.75,0.7); B(0.08,1.0,1.7,x+0.25,0.6,sg*1.75,0.6); B(0.5,0.5,0.08,x,0.25,sg*0.92,0.6); CA.pews.push([x+0.05,sg*1.75,0.36,0.88]); }
B(6,0.3,8,17,0.15,0,0.85); B(1.2,1.1,2.6,17.6,0.85,0,0.95); B(0.1,1.5,0.1,17.6,2.15,0,0.6); B(0.1,0.1,0.7,17.6,2.45,0,0.6);   // altar
for(const z of [-0.95,0.95]) add(cyl(0.04,0.05,0.5,8),[17.6,1.65,z],[0,0,0],0.9);
B(0.05,9.9,0.05,-4,13.25,0,0.5);                                                                  // chandelier chain
const caLamps=[ lantern([-4,8.3,0],0.7,0,2.6,15), ...[-0.95,0.95].map((z,i)=>({ pos:[17.6,2.0,z], intensity:1.3, range:8, flicker:0.15, phase:i*2+1, obj:add(rock(0.07,rng(i+1)),[17.6,2.0,z],[0,0,0],1,{emit:1,dyn:true}) })) ];

const CATHEDRAL=endScene({ name:'cathedral', title:'Cathedral', day:true, sky:2.2, sunI:2.3, fill:0.06, cubeFar:34,
  sunDir:[1.5,5,6], sunAt:[0,6,0], sunHalf:27, spawn:{ x:-17.5, z:0, yaw:-Math.PI/2 } });
CATHEDRAL.lamps.push(...caLamps);
CATHEDRAL.floorAt=(x,z)=>(Math.abs(x)>19.6||Math.abs(z)>6.65||walkBlocked(x,z,CA.cols,[...CA.pews,[17.6,0,0.65,1.35]]))?null:(x>14?0.3:0);
