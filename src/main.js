// ---------- orbit ----------
const hint=document.getElementById('hint'), modeBtn=document.getElementById('mode');
const coarse=matchMedia('(pointer: coarse)').matches;
let theta=0.2, phi=1.2, radius=innerWidth<innerHeight?27:20; const target=[1,2.6,0];
const ptrs=new Map(); let pinch0=0, r0=radius;
canvas.addEventListener('pointerdown',e=>{ hint.style.display='none'; if(view!=='orbit')return; canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){const p=[...ptrs.values()];pinch0=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);r0=radius;}});
canvas.addEventListener('pointermove',e=>{ if(view!=='orbit'||!ptrs.has(e.pointerId))return; const prev=ptrs.get(e.pointerId);
  if(ptrs.size===1){ theta+=(e.clientX-prev.x)*0.006; phi=Math.min(1.52,Math.max(0.15,phi-(e.clientY-prev.y)*0.006)); }
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){const p=[...ptrs.values()];const d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y); if(pinch0>0&&d>0) radius=Math.min(60,Math.max(5,r0*pinch0/d));}
});
const up=e=>{ptrs.delete(e.pointerId); if(ptrs.size<2)pinch0=0;};
canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up);
canvas.addEventListener('wheel',e=>{e.preventDefault(); if(view!=='orbit')return; radius=Math.min(60,Math.max(5,radius*Math.exp(e.deltaY*0.001)));},{passive:false});

// ---------- orbit <-> walk ----------
const fade=document.getElementById('fade');
function setScene(sc,at){
  scene=sc; at=at||sc.spawn;
  player.x=at.x; player.z=at.z; player.yaw=at.yaw; player.pitch=0; player.vx=player.vz=0; player.y=floorAt(at.x,at.z)??0;
  fade.style.transition='none'; fade.style.opacity=1; void fade.offsetWidth; fade.style.transition='opacity .45s'; fade.style.opacity=0;
  if(view==='walk') showHint();
}
function showHint(){
  hint.firstElementChild.innerHTML = view==='orbit' ? 'drag to orbit \u00b7 pinch / scroll to zoom'
    : (coarse ? 'slide up to walk \u00b7 sideways to turn<br>hold still to look around' : 'click, then WASD to walk \u00b7 Shift to run')
      + '<br>' + (scene===DECK ? 'the open hatch leads below' : 'the ladder leads back up');
  hint.style.display='';
}
function setView(v){
  if(v==='orbit' && scene!==DECK) setScene(DECK); // only the deck can be orbited
  view=v; ptrs.clear(); pinch0=0; touchReset(); player.keys.clear();
  if(v!=='walk' && document.pointerLockElement===canvas) document.exitPointerLock();
  modeBtn.textContent = v==='walk' ? 'Orbit' : 'Walk the deck';
  showHint();
}
modeBtn.onclick=()=>setView(view==='walk'?'orbit':'walk');

window.__dbg={S,player,setView,setScene,scenes:{deck:DECK,hold:HOLD},cam(t,p,r){theta=t;phi=p;radius=r;},walk(x,z,yaw,pitch=0,sc){ if(sc&&__dbg.scenes[sc]!==scene) setScene(__dbg.scenes[sc]); player.x=x;player.z=z;player.yaw=yaw;player.pitch=pitch;player.vx=player.vz=0;player.y=floorAt(x,z)??0;}};

// ---------- loop ----------
let last=performance.now(), T=0;
const IDENT=new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
function frame(now){
  const dt=Math.min((now-last)/1000,0.05); last=now; T+=dt;
  const walking=view==='walk';
  if(walking){ player.update(dt); const go=scene.exit&&scene.exit(player); if(go) setScene(go.scene,go); }
  else if(S.spin && ptrs.size===0) theta+=dt*0.07;
  const sc=scene;
  // lanterns swing with the ship; their light flickers a little
  for(const l of sc.lamps){ const a=0.2*Math.sin(T*1.1+l.phase);
    l.pos=[l.pivot[0], l.pivot[1]-l.len*Math.cos(a), l.pivot[2]+l.len*Math.sin(a)*2.2]; l.obj.pos=l.pos;
    l.now=l.intensity*(1+0.07*Math.sin(T*7.3+l.phase)*Math.sin(T*3.1+l.phase*2)); }
  // a wider lens on foot, wider still on a tall screen
  const FOV=(walking ? (W<H?82:66) : 60)*Math.PI/180;

  let eye, look;
  if(walking){ eye=player.eye(); const d=player.dir(); look=[eye[0]+d[0],eye[1]+d[1],eye[2]+d[2]]; }
  else { eye=[target[0]+radius*Math.sin(phi)*Math.cos(theta), target[1]+radius*Math.cos(phi), target[2]+radius*Math.sin(phi)*Math.sin(theta)]; look=target; }
  const V=M4.lookAt(eye,look,[0,1,0]);
  const VP=M4.mul(M4.persp(FOV,W/H,walking?0.06:0.2,500),V);

  const drawScene=(uM,shadows)=>{
    gl.uniformMatrix4fv(uM,false,IDENT); gl.bindVertexArray(sc.statics.a); gl.drawArrays(gl.TRIANGLES,0,sc.statics.n);
    for(const o of sc.dyn){ if(shadows&&o.noShadow) continue; gl.uniformMatrix4fv(uM,false,M4.trs(o.pos,o.rot)); gl.bindVertexArray(o.g.a); gl.drawArrays(gl.TRIANGLES,0,o.g.n); } };

  // shadow passes: the moon, then six cube faces per lantern
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(shadowProg.p);
  gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFB); gl.viewport(0,0,SM,SM); gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(shadowProg.u.uSunVP,false,sunVP); drawScene(shadowProg.u.uM,true);
  gl.bindFramebuffer(gl.FRAMEBUFFER,cubeFB); gl.viewport(0,0,CUBE,CUBE);
  sc.lamps.forEach((l,i)=>{ for(let f=0;f<6;f++){
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_CUBE_MAP_POSITIVE_X+f,cubeTex[i],0); gl.clear(gl.DEPTH_BUFFER_BIT);
    const d=CUBE_FACES[f][0], p=l.pos;
    gl.uniformMatrix4fv(shadowProg.u.uSunVP,false,M4.mul(CUBE_PROJ,M4.lookAt(p,[p[0]+d[0],p[1]+d[1],p[2]+d[2]],CUBE_FACES[f][1])));
    drawScene(shadowProg.u.uM,true); } });

  gl.bindFramebuffer(gl.FRAMEBUFFER,sceneFB); gl.viewport(0,0,W,H);
  gl.clearBufferfv(gl.COLOR,0,[0,0,0,1]); gl.clearBufferfv(gl.COLOR,1,[0,0,0,0]); gl.clearBufferfi(gl.DEPTH_STENCIL,0,1,0);
  gl.useProgram(sceneProg.p); const u=sceneProg.u;
  gl.uniformMatrix4fv(u.uVP,false,VP); gl.uniformMatrix4fv(u.uV,false,V); gl.uniformMatrix4fv(u.uSunVP,false,sunVP);
  gl.uniform3fv(u.uSunDir,sunDir); gl.uniform3fv(u.uEye,eye);
  const lp=new Float32Array(9), lq=new Float32Array(6);
  sc.lamps.forEach((l,i)=>{ lp.set(l.pos,i*3); lq[i*2]=l.now; lq[i*2+1]=l.range; });
  gl.uniform3fv(u['uLamp[0]'],lp); gl.uniform2fv(u['uLampP[0]'],lq);
  gl.uniform1f(u.uSky,sc.sky); gl.uniform1f(u.uFill,sc.fill); gl.uniform1f(u.uSunI,sc.sunI); gl.uniform1f(u.uT,T);
  gl.uniform1f(u.uPix,2*Math.tan(FOV/2)/H); gl.uniform1f(u.uD,DOT_SPACING);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,shadowTex); gl.uniform1i(u.uShadow,0);
  for(let i=0;i<MAX_LAMPS;i++){ gl.activeTexture(gl.TEXTURE1+i); gl.bindTexture(gl.TEXTURE_CUBE_MAP,cubeTex[i]); gl.uniform1i(u['uCube'+i],1+i); }
  drawScene(u.uM,false);
  for(let i=0;i<MAX_LAMPS;i++){ gl.activeTexture(gl.TEXTURE1+i); gl.bindTexture(gl.TEXTURE_CUBE_MAP,null); }

  gl.disable(gl.DEPTH_TEST);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,W,H);
  gl.useProgram(postProg.p); const p=postProg.u;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,litTex); gl.uniform1i(p.tLit,0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,edgeTex); gl.uniform1i(p.tEdge,1);
  gl.uniform2f(p.res,W,H); gl.uniform1f(p.tanHalf,Math.tan(FOV/2)); gl.uniform1f(p.aspect,W/H);
  gl.uniformMatrix3fv(p.camRot,false,new Float32Array([V[0],V[4],V[8], V[1],V[5],V[9], V[2],V[6],V[10]]));
  gl.uniform1f(p.mode,S.mode); gl.uniform1f(p.edges,S.edges?1:0); gl.uniform1f(p.raw,S.raw?1:0);
  gl.uniform3fv(p.dark,DARK); gl.uniform3fv(p.light,LIGHT);
  gl.uniform3fv(p.uMoon,sunDir); gl.uniform3fv(p.uMoon2,moon2);
  gl.bindVertexArray(quad); gl.drawArrays(gl.TRIANGLES,0,3);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,null);
  requestAnimationFrame(frame);
}
resize();
if(new URLSearchParams(location.search).get('scene')==='hold'){ setScene(HOLD); setView('walk'); } // ?scene=hold starts below decks
requestAnimationFrame(frame);
