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
function setView(v){
  view=v; ptrs.clear(); pinch0=0; touchReset(); player.keys.clear();
  if(v!=='walk' && document.pointerLockElement===canvas) document.exitPointerLock();
  modeBtn.textContent = v==='walk' ? 'Orbit' : 'Walk the deck';
  hint.firstElementChild.textContent = v==='orbit' ? 'drag to orbit \u00b7 pinch / scroll to zoom'
    : coarse ? 'slide up to walk \u00b7 sideways to turn \u00b7 hold to look' : 'click, then WASD to walk \u00b7 Shift to run';
  hint.style.display='';
}
modeBtn.onclick=()=>setView(view==='walk'?'orbit':'walk');

window.__dbg={S,player,setView,cam(t,p,r){theta=t;phi=p;radius=r;},walk(x,z,yaw,pitch=0){player.x=x;player.z=z;player.yaw=yaw;player.pitch=pitch;player.y=floorAt(x,z)??0;}};

// ---------- loop ----------
let last=performance.now(), T=0;
function frame(now){
  const dt=Math.min((now-last)/1000,0.05); last=now; T+=dt;
  const walking=view==='walk';
  if(walking) player.update(dt); else if(S.spin && ptrs.size===0) theta+=dt*0.07;
  // a wider lens on foot, wider still on a tall screen
  const FOV=(walking ? (W<H?82:66) : 60)*Math.PI/180;
  const sw=Math.sin(T*1.1)*0.22;
  const lampPos=[3,2.9-Math.abs(sw)*0.05,sw]; lampObj.pos=lampPos;
  const lampI=2.3+0.18*Math.sin(T*7.3)*Math.sin(T*3.1);

  let eye, look;
  if(walking){ eye=player.eye(); const d=player.dir(); look=[eye[0]+d[0],eye[1]+d[1],eye[2]+d[2]]; }
  else { eye=[target[0]+radius*Math.sin(phi)*Math.cos(theta), target[1]+radius*Math.cos(phi), target[2]+radius*Math.sin(phi)*Math.sin(theta)]; look=target; }
  const V=M4.lookAt(eye,look,[0,1,0]);
  const VP=M4.mul(M4.persp(FOV,W/H,walking?0.06:0.2,500),V);

  gl.enable(gl.DEPTH_TEST);
  gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFB); gl.viewport(0,0,SM,SM);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(shadowProg.p); gl.uniformMatrix4fv(shadowProg.u.uSunVP,false,sunVP);
  for(const o of objs){ if(o.emit||o.kind) continue; gl.uniformMatrix4fv(shadowProg.u.uM,false,M4.trs(o.pos,o.rot)); gl.bindVertexArray(o.g.a); gl.drawArrays(gl.TRIANGLES,0,o.g.n); }

  gl.bindFramebuffer(gl.FRAMEBUFFER,sceneFB); gl.viewport(0,0,W,H);
  gl.clearBufferfv(gl.COLOR,0,[0,0,0,1]); gl.clearBufferfv(gl.COLOR,1,[0,0,0,0]); gl.clearBufferfi(gl.DEPTH_STENCIL,0,1,0);
  gl.useProgram(sceneProg.p); const u=sceneProg.u;
  gl.uniformMatrix4fv(u.uVP,false,VP); gl.uniformMatrix4fv(u.uV,false,V); gl.uniformMatrix4fv(u.uSunVP,false,sunVP);
  gl.uniform3fv(u.uSunDir,sunDir); gl.uniform3fv(u.uLamp,lampPos); gl.uniform3fv(u.uEye,eye);
  gl.uniform1f(u.uLampI,lampI); gl.uniform1f(u.uT,T);
  gl.uniform1f(u.uPix,2*Math.tan(FOV/2)/H); gl.uniform1f(u.uD,DOT_SPACING);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,shadowTex); gl.uniform1i(u.uShadow,0);
  for(const o of objs){ gl.uniformMatrix4fv(u.uM,false,M4.trs(o.pos,o.rot)); gl.uniform1f(u.uShade,o.shade); gl.uniform1f(u.uEmit,o.emit); gl.uniform1f(u.uKind,o.kind); gl.uniform1f(u.uId,o.id);
    gl.bindVertexArray(o.g.a); gl.drawArrays(gl.TRIANGLES,0,o.g.n); }

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
resize(); requestAnimationFrame(frame);
