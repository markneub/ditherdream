// ---------- bounce: a ball climbing an invisible tower (line-art mock-up) ----------
// The user's design: platforms are arcs on the surface of a cylinder you can't see. The ball stays at the front and only
// moves up and down; swiping turns the tower so a platform is under the ball when it comes down. Every landing throws the
// ball up 2.9 m whatever height it fell from, and the levels are 1.6 m apart, so each bounce can gain one level.
// This first version is a mock-up to agree the game: plain line art (everything white and unlit on a white sky, so only
// the outlines show; the ball is solid black). The dither and colour effects come later.
const BO={ R0:2.4, R1:3.6, TH:0.22, SP:1.6, G:22, JUMP:Math.sqrt(2*22*2.9), BALL:0.3, WID:[1.5,1.1,0.8,0.55], pool:[], seed:1 };
const BS={ y:0, vy:0, ang:0, spin:0, camY:0, top:0, score:0, best:0, state:'run', deadT:0, keys:new Set(), ptr:null };
beginScene();
add(sector(BO.R0,BO.R1,BO.TH,0,Math.PI*2,48),[0,-BO.TH/2,0],[0,0,0],1,{emit:1,dyn:true});            // the floor: a full ring
for(const w of BO.WID){ const g=sector(BO.R0,BO.R1,BO.TH,0,w,Math.max(4,Math.round(w*10)));       // platforms, pooled by width
  BO.pool.push(Array.from({length:22},()=>add(g.slice(),[0,-1000,0],[0,0,0],1,{emit:1,dyn:true}))); }
const boBall=add(sphere(BO.BALL,20,12),[0,0,0],[0,0,0],0,{dyn:true,noShadow:true});
const BOUNCE=endScene({ name:'bounce', title:'Bounce (mock-up)', day:true, sky:0, sunI:0, noSun:true, sunDir:[0.05,-1,0.05], spawn:{x:0,z:0,yaw:0},
  hint:'swipe left or right to turn the tower<br>land on a platform to bounce higher' });
BOUNCE.floorAt=()=>0;
// The platforms of level k (k >= 1): [{a: start angle, w: index into BO.WID}]. Fewer and narrower as you climb.
function boLevel(k){ const rnd=rng(BO.seed*7919+k*104729), n=k<6?3:k<16?2:(rnd()<0.6?2:1), out=[]; let a=rnd()*Math.PI*2;
  for(let i=0;i<n;i++){ const lo=k<8?0:k<20?1:2, w=Math.min(3,lo+Math.floor(rnd()*2)); out.push({a,w}); a+=Math.PI*2/n*(0.8+0.4*rnd()); }
  return out; }
// Is a platform under the ball? The ball sits at the front (world angle pi/2 in sector()'s x-to-z convention).
function boUnder(p){ const m=0.06, t=((Math.PI/2+BS.ang+p.a)%(Math.PI*2)+Math.PI*2)%(Math.PI*2); return t<=BO.WID[p.w]+m||t>=Math.PI*2-m; }
function boReset(){ Object.assign(BS,{y:BO.BALL,vy:BO.JUMP,ang:0,spin:0,camY:0,top:0,score:0,state:'run'}); BO.seed=(Date.now()&0xffff)+1; boHud(); }
const boEl=document.createElement('div'); boEl.style.cssText='position:fixed;left:0;right:0;top:calc(12px + env(safe-area-inset-top));text-align:center;pointer-events:none;display:none;font-size:16px';
boEl.innerHTML='<span style="background:rgba(0,0,0,.8);color:#fff;padding:5px 10px;border-radius:5px;display:inline-block;line-height:1.5"></span>'; document.body.appendChild(boEl);
function boHud(){ boEl.firstChild.innerHTML = BS.state==='dead' ? `fell at ${BS.score}${BS.best?` · best ${BS.best}`:''}<br>tap to try again` : String(BS.score); }
BOUNCE.enter=()=>{ boEl.style.display=''; boReset(); }; BOUNCE.leave=()=>{ boEl.style.display='none'; };
BOUNCE.update=(T,dt)=>{
  if(BS.state==='run'){
    const k=BS.keys; BS.ang+=((k.has('ArrowRight')||k.has('KeyD')?1:0)-(k.has('ArrowLeft')||k.has('KeyA')?1:0))*2.6*dt;
    if(!BS.ptr){ BS.ang+=BS.spin*dt; BS.spin*=Math.exp(-dt*5); }                    // a released swipe glides on briefly
    const y0=BS.y; BS.vy-=BO.G*dt; BS.y+=BS.vy*dt;
    if(BS.vy<0){                                                                    // falling: did the ball's underside cross a platform top?
      const k0=Math.floor((y0-BO.BALL)/BO.SP+1e-6), k1=Math.floor((BS.y-BO.BALL)/BO.SP+1e-6);
      for(let lv=k0;lv>k1&&lv>=0;lv--) if(lv===0||boLevel(lv).some(boUnder)){ BS.y=lv*BO.SP+BO.BALL; BS.vy=BO.JUMP; BS.top=lv;
        if(lv>BS.score){ BS.score=lv; boHud(); } break; } }
    BS.camY+=(Math.max(BS.camY,BS.top*BO.SP)-BS.camY)*Math.min(1,dt*3);            // the view only ever moves up
    if(BS.y<BS.camY-7.5){ BS.state='dead'; BS.deadT=performance.now(); BS.best=Math.max(BS.best,BS.score); boHud(); } }
  // put pooled platforms on the levels in view, turned with the tower
  const used=BO.WID.map(()=>0), kc=Math.round(BS.camY/BO.SP);
  for(let lv=Math.max(1,kc-5);lv<=kc+9;lv++) for(const p of boLevel(lv)){ const o=BO.pool[p.w][used[p.w]++]; if(!o) continue; o.pos=[0,lv*BO.SP-BO.TH/2,0]; o.rot=[0,BS.ang+p.a,0]; }
  BO.pool.forEach((list,i)=>{ for(let j=used[i];j<list.length;j++) list[j].pos=[0,-1000,0]; });
  boBall.pos=[0,BS.y,(BO.R0+BO.R1)/2];
};
// seen from the side and a little above, through a long lens so the tower looks nearly flat-on
BOUNCE.camera=()=>({ eye:[0,BS.camY+7,24], look:[0,BS.camY+3.4,0], fov:innerWidth<innerHeight?40:30 });
// input: drag (touch or mouse) turns the tower, arrows / A D too; a tap restarts after a fall
canvas.addEventListener('pointerdown',e=>{ if(scene!==BOUNCE) return; e.preventDefault();
  if(BS.state==='dead'){ if(performance.now()-BS.deadT>500) boReset(); return; }
  BS.ptr={id:e.pointerId,x:e.clientX,t:performance.now()}; BS.spin=0; });
window.addEventListener('pointermove',e=>{ const p=BS.ptr; if(scene!==BOUNCE||!p||p.id!==e.pointerId) return;
  const d=(e.clientX-p.x)*4.2/Math.min(innerWidth,600), now=performance.now(); BS.ang+=d; BS.spin+=(d/Math.max(0.004,(now-p.t)/1000)-BS.spin)*0.5; p.x=e.clientX; p.t=now; });
const boUp=e=>{ if(BS.ptr&&BS.ptr.id===e.pointerId){ if(performance.now()-BS.ptr.t>80) BS.spin=0; BS.ptr=null; } };
window.addEventListener('pointerup',boUp); window.addEventListener('pointercancel',boUp);
document.addEventListener('keydown',e=>{ if(scene===BOUNCE) BS.keys.add(e.code); }); document.addEventListener('keyup',e=>BS.keys.delete(e.code));
