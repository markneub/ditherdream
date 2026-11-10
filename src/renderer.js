// ---------- GL ----------
const canvas=document.getElementById('c');
const gl=canvas.getContext('webgl2',{antialias:false});
if(!gl) fail('WebGL2 is not available in this browser.');
function shader(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) fail('Shader error: '+gl.getShaderInfoLog(s)); return s; }
function program(vs,fs){ const p=gl.createProgram(); gl.attachShader(p,shader(gl.VERTEX_SHADER,vs)); gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));
  gl.bindAttribLocation(p,0,'aP'); gl.bindAttribLocation(p,1,'aN'); gl.bindAttribLocation(p,2,'aU'); gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) fail('Link error: '+gl.getProgramInfoLog(p));
  const u={}; const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS); for(let i=0;i<n;i++){ const nm=gl.getActiveUniform(p,i).name; u[nm]=gl.getUniformLocation(p,nm); }
  return {p,u}; }



const sceneProg=program(SCENE_VS,SCENE_FS);

const shadowProg=program(SHADOW_VS,SHADOW_FS);

const postProg=program(POST_VS,POST_FS);

function vao(data){ const a=gl.createVertexArray(); gl.bindVertexArray(a); const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,3,gl.FLOAT,false,32,12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,2,gl.FLOAT,false,32,24);
  gl.bindVertexArray(null); return {a,n:data.length/8}; }
const quad=(()=>{ const a=gl.createVertexArray(); gl.bindVertexArray(a); const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,12,0); gl.bindVertexArray(null); return a; })();
function tex2d(w,h,ifmt,fmt,type,filter){ const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,ifmt,w,h,0,fmt,type,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; }

const SM=2048;
const shadowTex=tex2d(SM,SM,gl.DEPTH_COMPONENT24,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
const shadowFB=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFB);
gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTex,0);
gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);

let W=1,H=1, litTex, edgeTex, depthRB; const sceneFB=gl.createFramebuffer();
function resize(){
  const k=PIXEL;
  W=Math.max(1,Math.ceil(innerWidth*dpr/k)); H=Math.max(1,Math.ceil(innerHeight*dpr/k));
  canvas.width=W; canvas.height=H; canvas.style.width=(W*k/dpr)+'px'; canvas.style.height=(H*k/dpr)+'px';
  if(litTex){ gl.deleteTexture(litTex); gl.deleteTexture(edgeTex); gl.deleteRenderbuffer(depthRB); }
  litTex=tex2d(W,H,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,gl.NEAREST); edgeTex=tex2d(W,H,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,gl.NEAREST);
  depthRB=gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER,depthRB); gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,W,H);
  gl.bindFramebuffer(gl.FRAMEBUFFER,sceneFB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,litTex,0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,edgeTex,0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depthRB);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) fail('Framebuffer incomplete');
}
addEventListener('resize',resize);
