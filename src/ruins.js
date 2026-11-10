// ---------- desert ruins at noon: mostly white, small hard shadows ----------
const RU={ circles:[], rects:[] };
beginScene();
B(1200,0.4,1200,0,-0.2,0,0.97);                                                            // sand
for(const [x,z,a,h] of [[70,-60,34,6],[-30,-95,40,7],[110,30,30,5],[-90,40,36,6],[20,110,44,7],[-120,-40,30,5],[60,90,26,4]]) add(mound(a,h,8,36),[x,h,z],[0,0,0],0.5);   // dunes
add(flatcyl(0.02,30,36,4),[-150,18,-100],[0,0.6,0],0.6); add(flatcyl(0.02,19,23,4),[-95,11.5,-150],[0,0.6,0],0.6);   // pyramids
// temple platform: three steps up to 1.2 m
B(26,0.4,14,0,0.2,0,0.95); B(24.8,0.4,12.8,0,0.6,0,0.95); B(23.6,0.4,11.6,0,1.0,0,0.95);
{ const P=1.2, col=(x,z,h)=>{ if(!h) return; add(cyl(0.5,0.58,h,16),[x,P+0.3+h/2,z],[0,0,0],0.95); B(1.4,0.3,1.4,x,P+0.15,z,0.9); if(h>=7) B(1.4,0.35,1.4,x,P+0.3+h+0.175,z,0.9); RU.circles.push([x,z,0.72]); };
  const rows=[[-4.8,[7,7,7,7,3.2,0,7,7,2.1]],[4.8,[7,2.6,0,7,7,7,1.5,0,7]]];
  for(const [z,hs] of rows){ hs.forEach((h,i)=>col(-10+2.5*i,z,h));
    for(let i=0;i<8;i++) if(hs[i]>=7&&hs[i+1]>=7) B(3.7,0.8,1.2,-10+2.5*i+1.25,P+0.3+7+0.35+0.4,z,0.95); }
  [[-10,-2.4,7],[-10,0,7],[-10,2.4,7],[10,-2.4,4],[10,2.4,7]].forEach(c=>col(...c));
  B(1.2,0.8,6.2,-10,P+8.05,-0.05,0.95);
  // what is left of the inner walls
  for(const [w,h,d,x,z] of [[8,3.4,0.7,-2,2.6],[3,1.6,0.7,4,2.6],[0.7,5,4.6,-6.2,0.3],[5,2.2,0.7,-3.6,-2.4],[0.7,1.2,3,6,0.4]]){ B(w,h,d,x,P+h/2,z,0.92); RU.rects.push([x,z,w/2,d/2]); }
  B(1.4,1.2,1.4,2.5,P+0.6,0,0.9); add(cyl(0.3,0.36,1.5,12),[2.5,P+1.95,0],[0,0,0],0.9); RU.rects.push([2.5,0,0.7,0.7]);   // a statue, to the knees
}
add(sphere(0.48,16,12),[6.5,0.4,8.6],[0,0,0],0.9); RU.circles.push([6.5,8.6,0.48]);                   // its head
for(const [x,y,z,ry,len] of [[4,0.52,9.5,0.4,1.7],[1.6,0.52,10.4,1.9,1.4],[-12.5,0.52,-9,0.9,2.2],[14.5,0.52,-3,2.6,1.5],[3.5,1.72,-1.3,0.3,1.3]]){ add(cyl(0.5,0.55,len,16),[x,y,z],[HP,ry,0],0.93); RU.circles.push([x,z,0.8]); }   // fallen drums
add(flatcyl(0.38,0.72,9,4),[-17,4.5,9],[0,0.785,0],0.95); add(flatcyl(0.01,0.38,0.8,4),[-17,9.4,9],[0,0.785,0],0.95); RU.circles.push([-17,9,0.75]);   // obelisk
for(const dx of [-2.4,2.4]){ B(1.4,5,1.4,17+dx,2.5,-10,0.95); RU.rects.push([17+dx,-10,0.7,0.7]); } B(6.4,1.1,1.6,17,5.55,-10,0.95);   // gateway
{ const rnd=rng(21); for(let i=0;i<16;i++){ const a=rnd()*6.283, d=15+rnd()*16, s=0.5+rnd()*0.9, x=d*Math.cos(a), z=d*Math.sin(a)*0.8;
    if(walkBlocked(x,z,RU.circles,RU.rects)||(Math.abs(x)<14&&Math.abs(z)<8)) continue;
    B(s*1.4,s,s,x,s/2-0.05,z,0.93,rnd()*3); RU.circles.push([x,z,s*0.8]); } }

const RUINS=endScene({ name:'ruins', title:'Desert ruins', day:true, sky:2.6, sunI:2.0,
  sunDir:[4,7,2.5], sunAt:[0,3,0], sunHalf:36,
  orbit:{ target:[0,3.5,0], radius:[50,38], theta:0.9, phi:1.15 }, spawn:{ x:24, z:2.5, yaw:Math.PI/2 } });
RUINS.floorAt=(x,z)=>{ if(Math.hypot(x,z)>48||walkBlocked(x,z,RU.circles,RU.rects)) return null;
  const ax=Math.abs(x), az=Math.abs(z); return ax<11.8&&az<5.8?1.2 : ax<12.4&&az<6.4?0.8 : ax<13&&az<7?0.4 : 0; };
