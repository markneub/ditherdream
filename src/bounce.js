// ---------- bounce: a ball climbing an invisible tower (line-art mock-up) ----------
// The user's design: platforms are arcs on the surface of a cylinder you can't see. The ball stays at the front and only
// moves up and down; swiping turns the tower so a platform is under the ball when it comes down. Every landing throws the
// ball up 3 m whatever height it fell from, and the levels are 2 m apart, so each bounce can gain one level (and the ball's
// top stops short of the level after that). A platform is a ghost while it is above the ball (drawn with a dashed outline,
// and the ball rises straight through it) and turns solid once the ball's underside is above its top, so it can be landed
// on. (Solid-both-ways was tried and the user found bumping into undersides frustrating.) The climb is in phases of ten levels (BO.PHASES): each phase sets how the
// levels are laid out, and is where new kinds of object and the colour/dither stages will hang.
// This first version is a mock-up to agree the game: plain line art (everything white and unlit on a white sky, so only
// the outlines show; the ball is solid black). The dither and colour effects come later.
const BO={ R0:2.4, R1:3.6, TH:0.22, SP:2.0, G:22, JUMP:Math.sqrt(2*22*3.0), BALL:0.3, WID:[1.15,0.9,0.68,0.5], pool:[], seed:1, levels:[], PHASE:10 };
// One entry per phase (ten levels); the last repeats. n: arcs per level (at most); wid: which BO.WID widths it may use;
// turn: the furthest (radians, edge to edge) from a platform to its follower on the next level;
// stack: may a platform sit directly over one on the level below? (The user asked for none until about level 20.)
BO.PHASES=[ {n:2,wid:[0,1],turn:0.5,stack:false}, {n:2,wid:[1,2],turn:0.75,stack:false}, {n:3,wid:[1,2],turn:0.95,stack:true}, {n:2,wid:[2,3],turn:1.15,stack:true}, {n:2,wid:[3],turn:1.35,stack:true} ];
const boPhase=lv=>Math.floor((Math.max(1,lv)-1)/BO.PHASE);
const BS={ y:0, vy:0, ang:0, spin:0, camY:0, top:0, score:0, best:0, state:'run', deadT:0, keys:new Set(), ptr:null };
beginScene();
add(sector(BO.R0,BO.R1,BO.TH,0,Math.PI*2,48),[0,-BO.TH/2,0],[0,0,0],1,{emit:1,dyn:true});            // the floor: a full ring
for(const w of BO.WID){ const g=sector(BO.R0,BO.R1,BO.TH,0,w,Math.max(4,Math.round(w*10)));       // platforms, pooled by width
  BO.pool.push(Array.from({length:22},()=>add(g.slice(),[0,-1000,0],[0,0,0],1,{emit:1,dyn:true}))); }
BO.pool.forEach(list=>list.forEach(o=>{ o.ghost=false; }));
BO.hoops=[0,1].map(()=>add(sector(BO.R1+0.5,BO.R1+0.58,0.05,0,Math.PI*2,48),[0,-1000,0],[0,0,0],1,{emit:1,dyn:true}));   // a thin hoop marks each new phase
const boBall=add(sphere(BO.BALL,20,12),[0,0,0],[0,0,0],0,{dyn:true,noShadow:true});
const BOUNCE=endScene({ name:'bounce', title:'Bounce (mock-up)', day:true, sky:0, sunI:0, noSun:true, sunDir:[0.05,-1,0.05], spawn:{x:0,z:0,yaw:0},
  hint:'swipe left or right to turn the tower<br>rise through the gaps, land on the platforms' });
BOUNCE.floorAt=()=>0;
// The platforms of level k (k >= 1): [{a: start angle, w: index into BO.WID}]. Levels are made in order and kept, because
// in a phase without stacking each level's arcs go in the gaps left by the level below.
const BTAU=Math.PI*2, boMod=a=>((a%BTAU)+BTAU)%BTAU;
// Every platform gets a follower on the next level whose near edge is at most the phase's `turn` (radians) round from its
// own edge, one way or the other, so the next landing is never far to turn to. Without `stack` a follower must not sit over
// any platform below; with it, it may, but part of every platform below is left open above (so there is a way up).
const boOver=(a1,w1,a2,w2,m)=>boMod(a2-a1)<BO.WID[w1]+m||boMod(a1-a2)<BO.WID[w2]+m;
function boLevel(k){ const L=BO.levels;
  for(let lv=L.length;lv<=k;lv++){ const rnd=rng(BO.seed*7919+lv*104729), ph=BO.PHASES[Math.min(BO.PHASES.length-1,boPhase(lv))], below=L[lv-1]||[], out=[], mg=0.12;
    const pick=()=>ph.wid[Math.floor(rnd()*ph.wid.length)];
    if(lv===0){ L.push(out); continue; }
    if(!below.length){ let a=rnd()*BTAU; for(let i=0;i<ph.n;i++){ out.push({a,w:pick()}); a+=BTAU/ph.n*(0.85+0.3*rnd()); } L.push(out); continue; }
    const near=p=>out.some(q=>boMod(q.a-p.a-BO.WID[p.w])<=ph.turn||boMod(p.a-q.a-BO.WID[q.w])<=ph.turn);
    const open=()=>below.every(p=>{ for(let t=0.05;t<BO.WID[p.w];t+=0.05) if(!out.some(q=>boMod(p.a+t-q.a)<BO.WID[q.w]+0.12||boMod(q.a-p.a-t)<0.12)) return true; return false; });
    for(let attempt=0;attempt<30;attempt++){ out.length=0;                         // the whole level again until every platform below has one
    for(const p of [...below].sort(()=>rnd()-0.5)){ if(near(p)) continue;
      for(let tries=0;tries<80;tries++){ const w=tries<40?pick():ph.wid[ph.wid.length-1], d=mg+rnd()*(ph.turn-mg), after=rnd()<0.5;   // later tries use the narrowest width
        const q={a:after?p.a+BO.WID[p.w]+d:p.a-d-BO.WID[w],w};
        if(out.some(o=>boOver(o.a,o.w,q.a,q.w,tries<40?0.25:0.1))) continue;
        if(!ph.stack&&below.some(o=>boOver(o.a,o.w,q.a,q.w,mg))) continue;
        if(boOver(p.a,p.w,q.a,q.w,mg)) continue;
        out.push(q); if(ph.stack&&!open()){ out.pop(); continue; } break; } }
    if(below.every(near)) break; }
    // anything that is not someone's follower can go anywhere it fits (a few extra, decoy platforms when stacking)
    for(let i=out.length;i<ph.n;i++) for(let tries=0;tries<12;tries++){ const q={a:rnd()*BTAU,w:pick()};
      if(out.some(o=>boOver(o.a,o.w,q.a,q.w,0.25))||(!ph.stack&&below.some(o=>boOver(o.a,o.w,q.a,q.w,mg)))) continue;
      out.push(q); if(ph.stack&&!open()){ out.pop(); continue; } break; }
    L.push(out); }
  return L[k]; }
// Is a platform under (or over) the ball? The ball sits at the front (world angle pi/2 in sector()'s x-to-z convention).
function boUnder(p,m=0.06){ const t=boMod(Math.PI/2+BS.ang+p.a); return t<=BO.WID[p.w]+m||t>=BTAU-m; }
function boReset(){ Object.assign(BS,{y:BO.BALL,vy:BO.JUMP,ang:0,spin:0,camY:0,top:0,score:0,state:'run'}); BO.seed=(Date.now()&0xffff)+1; BO.levels=[];
  const p1=boLevel(1)[0]; BS.ang=BO.WID[p1.w]+0.3-Math.PI/2-p1.a;                    // start under a gap in level 1, just past a platform's end
  boHud(); }
const boEl=document.createElement('div'); boEl.style.cssText='position:fixed;left:0;right:0;top:calc(12px + env(safe-area-inset-top));text-align:center;pointer-events:none;display:none;font-size:16px';
boEl.innerHTML='<span style="background:rgba(0,0,0,.8);color:#fff;padding:5px 10px;border-radius:5px;display:inline-block;line-height:1.5"></span>'; document.body.appendChild(boEl);
function boHud(){ boEl.firstChild.innerHTML = BS.state==='dead' ? `fell at ${BS.score}${BS.best?` · best ${BS.best}`:''}<br>tap to try again` : `${BS.score}<span style="opacity:.6"> \u00b7 phase ${boPhase(BS.score+1)+1}</span>`; }
BOUNCE.enter=()=>{ boEl.style.display=''; boReset(); }; BOUNCE.leave=()=>{ boEl.style.display='none'; };
BOUNCE.update=(T,dt)=>{
  if(BS.state==='run'){
    const k=BS.keys; BS.ang+=((k.has('ArrowRight')||k.has('KeyD')?1:0)-(k.has('ArrowLeft')||k.has('KeyA')?1:0))*2.6*dt;
    if(!BS.ptr){ BS.ang+=BS.spin*dt; BS.spin*=Math.exp(-dt*5); }                    // a released swipe glides on briefly
    const y0=BS.y; BS.vy-=BO.G*dt; BS.y+=BS.vy*dt;
    if(BS.vy<=0){                                                                   // falling: did the ball's underside cross a platform top? (rising, it passes through)
      const k0=Math.floor((y0-BO.BALL)/BO.SP+1e-6), k1=Math.floor((BS.y-BO.BALL)/BO.SP+1e-6);
      for(let lv=k0;lv>k1&&lv>=0;lv--) if(lv===0||boLevel(lv).some(p=>boUnder(p))){ BS.y=lv*BO.SP+BO.BALL; BS.vy=BO.JUMP; BS.top=lv;
        if(lv>BS.score){ BS.score=lv; boHud(); } break; } }
    BS.camY+=(Math.max(BS.camY,BS.top*BO.SP)-BS.camY)*Math.min(1,dt*3);            // the view only ever moves up
    if(BS.y<BS.camY-7.5){ BS.state='dead'; BS.deadT=performance.now(); BS.best=Math.max(BS.best,BS.score); boHud(); } }
  // put pooled platforms on the levels in view, turned with the tower
  const used=BO.WID.map(()=>0), kc=Math.round(BS.camY/BO.SP);
  for(let lv=Math.max(1,kc-4);lv<=kc+8;lv++) for(const p of boLevel(lv)){ const o=BO.pool[p.w][used[p.w]++]; if(!o) continue; o.pos=[0,lv*BO.SP-BO.TH/2,0]; o.rot=[0,BS.ang+p.a,0]; o.ghost=BS.y-BO.BALL<lv*BO.SP-1e-3; }
  BO.pool.forEach((list,i)=>{ for(let j=used[i];j<list.length;j++) list[j].pos=[0,-1000,0]; });
  const ph0=Math.max(1,Math.round(BS.camY/BO.SP/BO.PHASE)); BO.hoops.forEach((o,i)=>{ o.pos=[0,(ph0+i)*BO.PHASE*BO.SP+BO.SP-BO.TH/2,0]; });   // at levels 11, 21, ...
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
