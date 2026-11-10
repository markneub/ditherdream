// ---------- GL ----------
const canvas=document.getElementById('c');
const gl=canvas.getContext('webgl2',{antialias:false});
if(!gl) fail('WebGL2 is not available in this browser.');
function shader(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) fail('Shader error: '+gl.getShaderInfoLog(s)); return s; }
function program(vs,fs){ const p=gl.createProgram(); gl.attachShader(p,shader(gl.VERTEX_SHADER,vs)); gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));
  gl.bindAttribLocation(p,0,'aP'); gl.bindAttribLocation(p,1,'aN'); gl.bindAttribLocation(p,2,'aU'); gl.bindAttribLocation(p,3,'aA'); gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) fail('Link error: '+gl.getProgramInfoLog(p));
  const u={}; const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS); for(let i=0;i<n;i++){ const nm=gl.getActiveUniform(p,i).name; u[nm]=gl.getUniformLocation(p,nm); }
  return {p,u}; }



const sceneProg=program(SCENE_VS,SCENE_FS);

const shadowProg=program(SHADOW_VS,SHADOW_FS);

const postProg=program(POST_VS,POST_FS);

function vao(data){ const a=gl.createVertexArray(); gl.bindVertexArray(a); const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  // 12 floats per vertex: position 3, normal 3, uv 2, then (object id, shade, emissive, kind)
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,48,0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,3,gl.FLOAT,false,48,12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,2,gl.FLOAT,false,48,24);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3,4,gl.FLOAT,false,48,32);
  gl.bindVertexArray(null); return {a,n:data.length/12}; }
const quad=(()=>{ const a=gl.createVertexArray(); gl.bindVertexArray(a); const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,12,0); gl.bindVertexArray(null); return a; })();
function tex2d(w,h,ifmt,fmt,type,filter){ const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,ifmt,w,h,0,fmt,type,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; }

// A model's base-colour texture: repeating, mipmapped. `mean` is its average luminance, for the tone normalisation.
function loadTexture(url){ return new Promise((ok,bad)=>{ const im=new Image();
  im.onerror=()=>bad(new Error('could not load '+url));
  im.onload=()=>{ const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    const c=document.createElement('canvas'); c.width=c.height=32; const x=c.getContext('2d'); x.drawImage(im,0,0,32,32);
    const d=x.getImageData(0,0,32,32).data; let s=0; for(let i=0;i<d.length;i+=4) s+=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
    ok({t,mean:s/(32*32*255)}); };
  im.src=url; }); }
const whiteTex=tex2d(1,1,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,gl.NEAREST);
gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));

const SM=2048;
const shadowTex=tex2d(SM,SM,gl.DEPTH_COMPONENT24,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
const shadowFB=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFB);
gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTex,0);
gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);

// Lantern shadows: one depth cube map per lamp (up to 3), re-rendered every frame because the lanterns swing.
const CUBE=512, CUBE_NEAR=0.05, MAX_LAMPS=3;
const cubeTex=[]; for(let i=0;i<MAX_LAMPS;i++){ const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_CUBE_MAP,t);
  for(let f=0;f<6;f++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+f,0,gl.DEPTH_COMPONENT24,CUBE,CUBE,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_R,gl.CLAMP_TO_EDGE],[gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE],[gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL]]) gl.texParameteri(gl.TEXTURE_CUBE_MAP,k,v);
  cubeTex.push(t); }
gl.bindTexture(gl.TEXTURE_CUBE_MAP,null);
const cubeFB=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,cubeFB);
gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_CUBE_MAP_POSITIVE_X,cubeTex[0],0);
gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
const CUBE_FACES=[[[1,0,0],[0,-1,0]],[[-1,0,0],[0,-1,0]],[[0,1,0],[0,0,1]],[[0,-1,0],[0,0,-1]],[[0,0,1],[0,-1,0]],[[0,0,-1],[0,-1,0]]];

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
