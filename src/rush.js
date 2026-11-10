// ---------- tunnel run: a fast flyer where white is open and black is solid, and a tap inverts the picture ----------
// A prototype to see how the surface dots behave at speed. You fly down a square tunnel; gates come at you, each
// quarter of a gate either "light" (emissive, drawn white), "dark" (drawn black) or missing. You pass through whatever is
// white on screen. Tapping swaps the two palette colours (RUSH.invert), so the dark quarters become the white ones.
// The tunnel is 43 identical 4 m segments; the camera's z wraps every 4 m, so it never ends. Gates are pooled objects.
const RT=7, RSEG=4, RLIM=RT/2-0.7;                       // tunnel width and height; segment length; how far off-centre you can steer
const R={ x:0, y:RT/2, vx:0, dist:0, speed:0, score:0, best:0, state:'run', gates:[], last:0, rnd:rng(1), keys:new Set(), ptr:new Map(), deadT:0 };
beginScene();
for(let i=0;i<43;i++){ const z=6-RSEG*i, s=i%2?0.62:0.78;
  B(RT+0.6,0.3,RSEG,0,-0.15,z,s); B(RT+0.6,0.3,RSEG,0,RT+0.15,z,s*0.9); for(const e of [-1,1]) B(0.3,RT,RSEG,e*(RT/2+0.15),RT/2,z,s*0.95); }
B(RT,RT,0.3,0,RT/2,-163,0.02);                                                        // the far end
// gate pool: each gate has four light and four dark quarter panels, parked out of sight when not in its pattern
const RQ=[[-1,1],[1,1],[-1,-1],[1,-1]];                                               // quarter order: top-left, top-right, bottom-left, bottom-right
for(let k=0;k<8;k++) R.gates.push({ d:0, pat:'....',
  a:RQ.map(()=>add(box(RT/2,RT/2,0.16),[0,-100,0],[0,0,0],1,{emit:1,dyn:true})),
  b:RQ.map(()=>add(box(RT/2,RT/2,0.16),[0,-100,0],[0,0,0],0.02,{dyn:true})) });
const rushLamp={pos:[0,RT/2,0],intensity:2.2,range:70,flicker:0};
const RUSH=endScene({ name:'rush', title:'Tunnel run', sky:0.5, fill:0.22, sunI:0, noSun:true, cubeFar:80, spawn:{x:0,z:0,yaw:0},
  hint:'white is open, black is solid<br>drag to steer · tap to invert' });
RUSH.lamps.push(rushLamp); RUSH.floorAt=()=>0;
// patterns: A light, B dark, . a hole. Later ones are added as the score climbs.
const RPATS=['AABB','BBAA','ABAB','BABA','AAAA','BBBB','ABBA','BAAB','B.BB','BB.B','ABBB','BBAB','BABB','.BBB'];
function rushGate(g){ const n=R.score<4?4:R.score<10?6:R.score<18?8:RPATS.length; g.pat=RPATS[Math.floor(R.rnd()*n)];
  if(R.rnd()<0.5) g.pat=g.pat.replace(/[AB]/g,c=>c==='A'?'B':'A');                   // either polarity, so you can't just stay inverted
  R.last+=Math.max(22,34-R.score*0.4); g.d=R.last; }
function rushReset(){ Object.assign(R,{x:0,y:RT/2,vx:0,dist:0,speed:16,score:0,state:'run',last:6,rnd:rng(Date.now()&0xffff)}); RUSH.invert=false;
  for(const g of R.gates) rushGate(g); rushHud(); }
function rushFlip(){ if(R.state==='dead'){ if(performance.now()-R.deadT>500) rushReset(); return; } RUSH.invert=!RUSH.invert; }
const rushEl=document.createElement('div'); rushEl.style.cssText='position:fixed;left:0;right:0;top:calc(12px + env(safe-area-inset-top));text-align:center;pointer-events:none;display:none;font-size:16px';
rushEl.innerHTML='<span style="background:rgba(0,0,0,.8);color:#fff;padding:5px 10px;border-radius:5px;display:inline-block;line-height:1.5"></span>'; document.body.appendChild(rushEl);
function rushHud(){ rushEl.firstChild.innerHTML = R.state==='dead' ? `crashed at ${R.score}${R.best?` · best ${R.best}`:''}<br>tap to fly again` : String(R.score); }
RUSH.enter=()=>{ rushEl.style.display=''; rushReset(); }; RUSH.leave=()=>{ rushEl.style.display='none'; };
RUSH.update=(T,dt)=>{
  if(R.state==='run'){
    const k=R.keys, ax=(k.has('ArrowRight')||k.has('KeyD')?1:0)-(k.has('ArrowLeft')||k.has('KeyA')?1:0), ay=(k.has('ArrowUp')||k.has('KeyW')?1:0)-(k.has('ArrowDown')||k.has('KeyS')?1:0);
    const x0=R.x; R.x=Math.max(-RLIM,Math.min(RLIM,R.x+ax*7*dt)); R.y=Math.max(RT/2-RLIM,Math.min(RT/2+RLIM,R.y+ay*7*dt));
    R.vx+=((R.x-x0)/Math.max(dt,1e-3)-R.vx)*Math.min(1,dt*8);
    R.speed=Math.min(46,16+R.score*0.9); const before=R.dist; R.dist+=R.speed*dt;
    for(const g of R.gates){
      if(g.d>before&&g.d<=R.dist){                                                    // crossing this gate now: which quarter, and is it white?
        const c=g.pat[(R.y>RT/2?0:2)+(R.x<0?0:1)];
        if(c!=='.'&&c!==(RUSH.invert?'B':'A')){ R.state='dead'; R.deadT=performance.now(); R.best=Math.max(R.best,R.score); R.dist=g.d-0.6; rushHud(); break; }
        R.score++; rushHud(); }
      if(g.d<R.dist-3) rushGate(g); } }
  // the camera's z wraps every segment; gates are placed relative to it
  const cz=-(R.dist%RSEG);
  for(const g of R.gates){ const z=cz-(g.d-R.dist), far=z<-160;
    RQ.forEach(([sx,sy],i)=>{ const p=[sx*RT/4,RT/2+sy*RT/4,z], c=far?'.':g.pat[i]; g.a[i].pos=c==='A'?p:[0,-100,0]; g.b[i].pos=c==='B'?p:[0,-100,0]; }); }
  R.eye=[R.x,R.y,cz]; rushLamp.pos=[R.x*0.5,RT/2+1.2,cz+0.5];
};
// the game's own camera: straight down the tunnel, leaning a little into sideways moves
RUSH.camera=()=>{ const roll=Math.max(-0.25,Math.min(0.25,-R.vx*0.03)); return { eye:R.eye||[0,RT/2,0], look:[R.x,R.y,(R.eye?R.eye[2]:0)-1], up:[Math.sin(roll),Math.cos(roll),0] }; };
// input. Touch: drag moves you (relative), a quick tap inverts. Mouse: you follow the pointer, a click inverts. Keys: arrows / WASD, space.
canvas.addEventListener('pointerdown',e=>{ if(scene!==RUSH) return; e.preventDefault(); R.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,t:performance.now(),moved:0}); });
window.addEventListener('pointermove',e=>{ if(scene!==RUSH||R.state!=='run') return;
  if(e.pointerType==='mouse'){ R.x=Math.max(-RLIM,Math.min(RLIM,(e.clientX/innerWidth-0.5)*2.4*RLIM)); R.y=RT/2+Math.max(-RLIM,Math.min(RLIM,(0.5-e.clientY/innerHeight)*2.4*RLIM)); return; }
  const p=R.ptr.get(e.pointerId); if(!p) return; const k=RT/Math.min(innerWidth,innerHeight)*1.15, dx=e.clientX-p.x, dy=e.clientY-p.y;
  R.x=Math.max(-RLIM,Math.min(RLIM,R.x+dx*k)); R.y=Math.max(RT/2-RLIM,Math.min(RT/2+RLIM,R.y-dy*k)); p.moved+=Math.abs(dx)+Math.abs(dy); p.x=e.clientX; p.y=e.clientY; });
const rushUp=e=>{ const p=R.ptr.get(e.pointerId); if(!p) return; R.ptr.delete(e.pointerId); if(scene===RUSH&&e.type==='pointerup'&&p.moved<14&&performance.now()-p.t<300) rushFlip(); };
window.addEventListener('pointerup',rushUp); window.addEventListener('pointercancel',rushUp);
document.addEventListener('keydown',e=>{ if(scene!==RUSH) return; if(e.code==='Space'&&!e.repeat){ e.preventDefault(); rushFlip(); } R.keys.add(e.code); });
document.addEventListener('keyup',e=>R.keys.delete(e.code));
