// ---------- at anchor: a scene built from a real model ----------
// Poly Haven's "Dutch Ship Medium" (CC0), loaded from assets/ the first time the scene is opened. Model units are
// metres, bow towards +x like the deck; the main deck is at about y = 1.7, the waterline at SEA.
const SEA=0.35;
beginScene();
add(box(600,0.2,600),[0,SEA-0.1,0],[0,0,0],1,{kind:1});
B(0.9,0.06,0.06,-0.95,4.3,0,0.6);                                   // a bracket on the mainmast for the lantern
const anchorLamp=lantern([-1.3,4.3,0],0.35,0,2.3,7);
const ANCHOR=endScene({ name:'anchor', title:'At anchor', loadingText:'loading the ship\u2026', foam:3, sunAt:[1,8,0], sunHalf:16,
  orbit:{ target:[1,8,0], radius:[38,28], theta:0.75, phi:1.25 }, spawn:{ x:-4.6, z:0.9, yaw:-Math.PI/2 } });
ANCHOR.lamps.push(anchorLamp);
// per mesh: base shade, texture contrast, and the height below which it counts for walking
const ANCHOR_LOOK={ hull:[0.66,1.5,4.7], rigging:[0.7,1.3,3.7], sails:[0.95,1.2,0] };
ANCHOR.load=()=>ANCHOR._load||(ANCHOR._load=(async()=>{
  const meshes=await loadGLTF('assets/dutch_ship_medium/dutch_ship_medium_1k.gltf'); let id=32768; const floors=[];
  for(const m of meshes){ const [shade,contrast,ymax]=ANCHOR_LOOK[m.name.split('_').pop()]||[0.8,1.3,0];
    const o=modelObject(m,id,shade); id+=o.count; o.tex=await loadTexture(m.image); o.contrast=contrast; ANCHOR.dyn.push(o);
    if(ymax) floors.push([m,ymax]); }
  ANCHOR.heights=heightField(floors,-11,14,-3.6,3.6,0.1);
  ANCHOR.ready=true;
})().catch(e=>{ ANCHOR._load=null; throw e; }));
// The floor is the model's own height map; your body is the highest of five samples, which keeps you a radius off rails.
// The two ladders (main deck up to the quarterdeck and to the forecastle) are too steep for the step rule, so each is a
// ramp along x: [x at the foot, x at the head, z0, z1, y at the foot, y at the head].
const ANCHOR_LADDERS=[[-4.7,-5.5,-0.9,-0.4,1.85,3.1],[3.1,3.9,-1.05,-0.6,1.75,3.0]];
ANCHOR.floorAt=(x,z)=>{ const f=ANCHOR.heights; if(!f) return 1.75;
  for(const [xa,xb,z0,z1,ya,yb] of ANCHOR_LADDERS){ const t=(x-xa)/(xb-xa); if(t>=0&&t<=1&&z>z0&&z<z1) return ya+(yb-ya)*t; }
  let y=-99; for(const [dx,dz] of [[0,0],[0.25,0],[-0.25,0],[0,0.25],[0,-0.25]]){ const v=f.at(x+dx,z+dz); if(v===null) return null; if(v>y) y=v; }
  return y; };
