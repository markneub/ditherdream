// ---------- night train: lamps and trees sliding past the windows ----------
const TR={ seats:[], speed:14, loop:192 };
beginScene();
B(18.3,0.2,3.2,0,-0.1,0,0.6); B(18.3,0.15,3.4,0,2.38,0,0.85);                                       // floor, ceiling
for(const sg of [1,-1]){ B(0.15,2.4,3.4,sg*9.07,1.15,0,0.8); B(0.05,2.0,0.8,sg*8.98,1.0,0,0.3);     // end walls and doors
  const z=sg*1.66;
  B(18.3,0.9,0.12,0,0.45,z,0.8); B(18.3,0.45,0.12,0,2.08,z,0.8);                                    // wall below and above the windows
  for(let x=-9;x<=9;x+=2) B(0.5,0.95,0.12,x,1.375,z,0.8);                                           // pillars between windows
  B(18,0.04,0.42,0,1.93,sg*1.38,0.7); for(let x=-8;x<=8;x+=2) B(0.04,0.12,0.4,x,1.86,sg*1.38,0.5);  // luggage rack
  for(let x=-9;x<=9;x+=2){                                                                          // seats, back to back at each pillar
    B(0.12,1.15,0.95,x,0.72,sg*1.12,0.75);
    for(const d of [-1,1]){ if(Math.abs(x+d*0.3)>8.9) continue; B(0.46,0.1,0.95,x+d*0.32,0.46,sg*1.12,0.9); B(0.4,0.42,0.9,x+d*0.32,0.2,sg*1.12,0.5); }
    TR.seats.push([x,sg*1.12,0.56,0.48]); }
  for(let x=-8;x<=8;x+=4) B(0.5,0.05,0.5,x,0.74,sg*1.33,0.9);                                       // little tables under some windows
}
B(0.7,0.3,0.4,-5.2,2.1,1.38,0.6); B(0.5,0.34,0.38,2.8,2.12,-1.38,0.9); B(0.9,0.26,0.4,5.1,2.08,1.38,0.4);   // luggage
// outside (all moving): the ground, poles and trees on both sides, two trackside lamps
const trGround=B(500,0.2,90,0,-1.2,0,0.7,0,{dyn:true,noShadow:true});
const trPass=[]; { const rnd=rng(5);
  for(let i=0;i<7;i++) trPass.push({ o:B(0.2,7,0.2,0,2.3,4.6,0.5,0,{dyn:true,noLampShadow:true}), x0:i*27+rnd()*9, y:2.3, z:4.6 });
  for(let i=0;i<12;i++){ const s=0.9+rnd()*0.8, z=-(6+rnd()*7), x0=i*16+rnd()*10;
    trPass.push({ o:add(cyl(0.04,1.9*s,6*s,9),[0,0,0],[0,0,0],0.5,{dyn:true,noLampShadow:true}), x0, y:-1.1+1.2*s+3*s, z });
    trPass.push({ o:add(cyl(0.18*s,0.24*s,1.4*s,7),[0,0,0],[0,0,0],0.4,{dyn:true,noLampShadow:true}), x0, y:-1.1+0.6*s, z }); }
  for(let i=0;i<8;i++){ const s=1+rnd()*0.9, z=9+rnd()*10; trPass.push({ o:add(cyl(0.04,2*s,6.5*s,9),[0,0,0],[0,0,0],0.5,{dyn:true,noLampShadow:true}), x0:i*24+rnd()*12, y:-1.1+4*s, z }); } }
const trLamps=[ { pos:[0,2.2,0], intensity:1.7, range:8, flicker:0.12, phase:1, obj:add(cyl(0.16,0.16,0.04,12),[0,2.29,0],[0,0,0],1,{emit:1,dyn:true}) },
  ...[40,136].map(x0=>({ pos:[0,3.4,4.3], x0, intensity:3.2, range:15, flicker:0, obj:add(sphere(0.16,8,6),[0,0,0],[0,0,0],1,{emit:1,dyn:true}), post:B(0.14,4.6,0.14,0,1.1,4.6,0.5,0,{dyn:true,noLampShadow:true}) })) ];

const TRAIN=endScene({ name:'train', title:'Night train', sky:0.5, sunI:1.5, fill:0.1, cubeFar:24,
  sunDir:[3,4,-7], sunAt:[0,1,0], sunHalf:17, spawn:{ x:-7.9, z:0, yaw:-Math.PI/2 } });
TRAIN.lamps.push(...trLamps);
TRAIN.update=T=>{ const d=T*TR.speed, at=x0=>((x0-d)%TR.loop+TR.loop)%TR.loop-TR.loop/2;
  trGround.pos=[-(d%64),-1.2,0];                    // the dots repeat every power of two, so a 64 m wrap is seamless
  for(const p of trPass) p.o.pos=[at(p.x0),p.y,p.z];
  for(const l of trLamps) if(l.x0!==undefined){ const x=at(l.x0); l.pos=[x,3.4,4.3]; l.post.pos=[x,1.1,4.6]; } };
TRAIN.floorAt=(x,z)=>(Math.abs(x)>8.65||Math.abs(z)>1.3||walkBlocked(x,z,[],TR.seats))?null:0;
