// ---------- a small glTF reader: meshes, node transforms, base-colour texture ----------
// Enough for Poly Haven's static models (separate .gltf + .bin + .jpg). No skins, animation, cameras or sparse accessors.
// Needs http(s): fetch() does not work from file://.
async function loadGLTF(url){
  const base=url.slice(0,url.lastIndexOf('/')+1);
  const get=async u=>{ const r=await fetch(u); if(!r.ok) throw new Error(u+': '+r.status); return r; };
  const g=await (await get(url)).json();
  const bufs=await Promise.all(g.buffers.map(b=>get(base+b.uri).then(r=>r.arrayBuffer())));
  const TYPES={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array}, SIZE={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
  const acc=i=>{ const a=g.accessors[i], bv=g.bufferViews[a.bufferView], T=TYPES[a.componentType], n=SIZE[a.type], off=(bv.byteOffset||0)+(a.byteOffset||0);
    if(!bv.byteStride||bv.byteStride===n*T.BYTES_PER_ELEMENT) return new T(bufs[bv.buffer],off,a.count*n);
    const out=new T(a.count*n), dv=new DataView(bufs[bv.buffer]);                        // interleaved: floats only
    for(let k=0;k<a.count;k++) for(let c=0;c<n;c++) out[k*n+c]=dv.getFloat32(off+k*bv.byteStride+c*4,true);
    return out; };
  const local=nd=>{ if(nd.matrix) return new Float32Array(nd.matrix);
    const [x,y,z,w]=nd.rotation||[0,0,0,1], s=nd.scale||[1,1,1], t=nd.translation||[0,0,0];
    return new Float32Array([(1-2*(y*y+z*z))*s[0],2*(x*y+z*w)*s[0],2*(x*z-y*w)*s[0],0, 2*(x*y-z*w)*s[1],(1-2*(x*x+z*z))*s[1],2*(y*z+x*w)*s[1],0,
      2*(x*z+y*w)*s[2],2*(y*z-x*w)*s[2],(1-2*(x*x+y*y))*s[2],0, t[0],t[1],t[2],1]); };
  const out=[];
  const visit=(ni,parent)=>{ const nd=g.nodes[ni], M=parent?M4.mul(parent,local(nd)):local(nd);
    if(nd.mesh!==undefined) for(const p of g.meshes[nd.mesh].primitives){
      if(p.mode!==undefined&&p.mode!==4) continue;                                        // triangles only
      const pos=Float32Array.from(acc(p.attributes.POSITION)), nrm=Float32Array.from(acc(p.attributes.NORMAL)), n=pos.length/3;
      for(let k=0;k<n*3;k+=3){ const x=pos[k],y=pos[k+1],z=pos[k+2], a=nrm[k],b=nrm[k+1],c=nrm[k+2];   // normals: fine for rotation + uniform scale
        pos[k]=M[0]*x+M[4]*y+M[8]*z+M[12]; pos[k+1]=M[1]*x+M[5]*y+M[9]*z+M[13]; pos[k+2]=M[2]*x+M[6]*y+M[10]*z+M[14];
        const u=M[0]*a+M[4]*b+M[8]*c, v=M[1]*a+M[5]*b+M[9]*c, w=M[2]*a+M[6]*b+M[10]*c, l=Math.hypot(u,v,w)||1; nrm[k]=u/l; nrm[k+1]=v/l; nrm[k+2]=w/l; }
      const uv=p.attributes.TEXCOORD_0!==undefined?acc(p.attributes.TEXCOORD_0):new Float32Array(n*2);
      const idx=p.indices!==undefined?acc(p.indices):Uint32Array.from({length:n},(_,k)=>k);
      const mat=g.materials&&g.materials[p.material], ti=mat&&mat.pbrMetallicRoughness&&mat.pbrMetallicRoughness.baseColorTexture;
      out.push({name:nd.name||g.meshes[nd.mesh].name||'',pos,nrm,uv,idx,image:ti?base+g.images[g.textures[ti.index].source].uri:null}); }
    for(const c of nd.children||[]) visit(c,M); };
  for(const ni of g.scenes[g.scene||0].nodes) visit(ni,null);
  return out;
}
