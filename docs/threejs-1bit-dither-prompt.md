# Prompt: add a 1-bit, surface-stable dither look to this THREE.js project

Paste everything below the line into the other project's coding agent.

---

I want this THREE.js project rendered in a 1-bit look in the spirit of *Return of the Obra Dinn*: pure black and white, no
greys, with tone drawn as **dots that stick to surfaces** (they move with the geometry instead of swimming in screen space
when the camera moves), plus **1-pixel outlines** around objects and sharp creases, and big chunky pixels. This is a port
of a working WebGL2 renderer, so the maths below is known to work; adapt the plumbing to this project's THREE.js version
and structure. Please read the whole spec before starting, then implement it step by step, checking the result visually
after each step.

## How the frame is built

1. **Low-resolution render target.** Pick a whole number `k` (2 on a 3x phone: `k = max(1, round(devicePixelRatio * 2/3))`).
   Render size `W = ceil(innerWidth * dpr / k)`, `H = ceil(innerHeight * dpr / k)`. Call `renderer.setPixelRatio(1)`,
   `renderer.setSize(W, H, false)`, and set the canvas CSS size to `W*k/dpr` by `H*k/dpr` with
   `image-rendering: pixelated` (and `crisp-edges`), so every rendered pixel is an exact block of screen pixels. Create the
   renderer with `antialias: false`. Redo all of this on resize.
2. **Scene pass into two colour targets (MRT)**, both `RGBA8` (`UnsignedByteType`), `NearestFilter`, no mipmaps, plus a
   depth buffer. In current THREE (r163+) that is `new THREE.WebGLRenderTarget(W, H, { count: 2, type: THREE.UnsignedByteType,
   minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true })` with `rt.textures[0]` and
   `rt.textures[1]`; older versions use `THREE.WebGLMultipleRenderTargets`. The scene's materials write:
   - **target 0, "lit"** = `(dot bit 0/1, luminance 0..1, log view depth high byte, low byte)`
   - **target 1, "edge"** = `(view normal x*0.5+0.5, view normal y*0.5+0.5, object id high byte, low byte)`

   Clear target 0 to `(0, 0, 1, 1)` (depth "far") and target 1 to `(0, 0, 0, 0)` (id 0 = background) before the pass. Set
   `scene.background = null` for this pass (or handle the background yourself in the post pass).
3. **Post pass**: a full-screen triangle with a `ShaderMaterial` (`glslVersion: THREE.GLSL3`) that reads both textures
   and draws the final black-and-white image to the canvas at `W x H`: it takes the dot bit, then draws outlines where the
   object id or the normal changes between neighbouring pixels, then maps 0/1 to the two palette colours.

Keep THREE's own lighting and shadows: the scene materials stay `MeshStandardMaterial` / `MeshLambertMaterial` (whatever the
project uses) and are patched with `onBeforeCompile`, so the dither works from the luminance THREE already computes.

## The dots: surface-stable fractal dithering

After Rune Skovbo Johansen's "surface-stable fractal dithering", done procedurally with no textures.

- Every surface gets 2D coordinates in **metres** (roughly isometric): **project the position along the dominant axis of
  the normal** (hard switch, no blending): `|n.x|` largest → `pos.zy`, `|n.y|` largest → `pos.xz`, else `pos.xy`. This needs
  no UVs, so it works on any mesh. Use world position for static objects; for moving objects use object-space position
  (`transformed`) times the mesh's world scale, with the object-space normal, so the dots ride along with the object.
- Dots sit on a square lattice in those coordinates. `rank()` gives every lattice point a Bayer rank in `[0,1)`. The pattern
  is self-similar: points with rank < 1/4 are exactly the lattice at twice the spacing.
- `sigma` = surface metres per screen pixel, computed analytically (**not** `dFdx`, which breaks at seams):
  `sigma = viewDistance * uPix / sqrt(max(|dot(normal, viewDir)|, 0.1))` with `uPix = 2 * tan(fovY/2) / H` (H = render
  target height in pixels; update it on resize and when the fov changes).
- `l = log2(uD * sigma)`; its integer part picks the lattice spacing (`2^floor(l)` metres), its fraction `f` picks how many
  points of that lattice are switched on (`rank < 4^-f`), so the on-screen dot spacing stays at `uD` pixels and nothing pops
  as you move closer or further. Dots fade in by rank (`w`). `uD = 4.5` (dot spacing in render pixels) is a good start.
- Tone sets dot radius. Above 50% luminance: dark dots on light; below: light dots on dark. Coverage under 3% is clipped to
  solid, and tiny dots are clamped to a minimum size.

```glsl
uniform float uD, uPix;
float rank(ivec2 p){ float r=0.0, s=0.25;
  for(int k=0;k<8;k++){ int bx=p.x&1, by=p.y&1; float d = bx==by ? float(bx) : (bx==1 ? 2.0 : 3.0); r+=d*s; s*=0.25; p>>=1; }
  return r; }
// returns 1 for a white pixel, 0 for black
float surf(vec2 uv, float lum, float sigma){
  bool darkDots = lum>0.5; float cov = darkDots ? 1.0-lum : lum;
  if(cov<0.03) return darkDots ? 1.0 : 0.0;
  cov=max(cov,0.055);
  float l=log2(uD*sigma), L=floor(l), f=l-L, g=exp2(L);
  vec2 q=uv/g, c0=floor(q), fr=q-c0;
  float t=exp2(-2.0*f);
  float r=exp2(f)*sqrt(cov/3.14159)*1.07;
  float hit=0.0;
  for(int i=0;i<4;i++){ vec2 o=vec2(float(i&1),float(i>>1));
    float rk=rank(ivec2(c0+o));
    float w=smoothstep(0.0,0.3,1.0-rk/t);
    if(length(fr-o)<r*w) hit=1.0; }
  return darkDots ? 1.0-hit : hit;
}
```

## Patching the scene materials (`onBeforeCompile`)

For every mesh material in the scene (give each mesh its own material, or see the note on ids below):

**Vertex shader**: add varyings and, after `#include <project_vertex>`:

```glsl
varying vec3 vDitherPos; varying vec3 vDitherNrm;   // (declare at the top)
// after #include <project_vertex>:
vDitherPos = (modelMatrix * vec4(transformed, 1.0)).xyz;      // or transformed * uDitherScale for moving objects
vDitherNrm = normalize(mat3(modelMatrix) * objectNormal);     // or objectNormal
```

**Fragment shader**: at the top declare the second output and the uniforms, paste `rank()` and `surf()`, and at the very end
of `main()` (after `#include <dithering_fragment>`, i.e. after THREE has written `gl_FragColor`):

```glsl
layout(location = 1) out highp vec4 gEdge;    // THREE already declares location 0 (pc_fragColor, aliased as gl_FragColor)
uniform float uObjectId;                      // 1..65535, unique per mesh (or per part you want outlined separately)
// ... rank(), surf() ...

// at the end of main():
float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
lum = pow(clamp(lum, 0.0, 1.0), 1.0/2.2);                      // the render target is linear; dither in perceptual space
lum = smoothstep(0.0, 1.0, clamp((lum-0.03)/0.9, 0.0, 1.0));   // tone curve: how much of the image is solid vs dotted
vec3 an = abs(vDitherNrm);
vec2 duv = an.x>=an.y && an.x>=an.z ? vDitherPos.zy : an.y>=an.z ? vDitherPos.xz : vDitherPos.xy;
float dist = length(vViewPosition);
float cs = abs(dot(normalize(normal), normalize(vViewPosition)));
float sigma = dist * uPix / sqrt(max(cs, 0.1));
float bit = surf(duv, lum, sigma);
float e = clamp(log2(1.0 + 1.0/gl_FragCoord.w) / 9.25, 0.0, 1.0) * 65535.0;   // log view depth in 16 bits
gl_FragColor = vec4(bit, lum, floor(e/256.0)/255.0, mod(floor(e), 256.0)/255.0);
gEdge = vec4(normalize(normal).xy*0.5+0.5, floor(uObjectId/256.0)/255.0, mod(uObjectId, 256.0)/255.0);
```

Notes:
- `normal` and `vViewPosition` are THREE's view-space normal and (negated) view position in lit materials; check the
  names in this THREE version's shader chunks. `objectNormal` comes from `beginnormal_vertex`.
- Add `uD`, `uPix`, `uObjectId` to `shader.uniforms` in `onBeforeCompile` and keep a reference
  (`material.userData.shader = shader`) so they can be updated every frame.
- **Object ids drive the outlines**, so neighbouring objects must differ. Easiest: one material instance per mesh. If
  materials are shared, set the id in `mesh.onBeforeRender` and set `material.uniformsNeedUpdate = true`, or THREE will not
  re-upload the uniform between meshes that share a material.
- Tone mapping and output colour-space conversion are not applied when rendering into a render target, so `gl_FragColor`
  here is linear; the `pow(..., 1/2.2)` above compensates. Tune the tone curve to taste.
- Bitwise operators need GLSL ES 3.00, which THREE uses on WebGL2.
- Transparent materials don't fit this scheme (one surface per pixel); keep them out of the pass or render them opaque.
- Materials not patched (lines, sprites, points) will write garbage to the second target: patch them too or hide them.

## Post pass

```glsl
precision highp float; precision highp int;
uniform sampler2D tLit, tEdge; uniform vec2 res; uniform vec3 dark, light;
in vec2 vUv; out vec4 o;
vec3 nrm(vec4 c){ vec2 n=c.rg*2.0-1.0; return vec3(n, sqrt(max(0.0,1.0-dot(n,n)))); }
float invZ(vec4 l){ return 1.0/(exp2((l.b*65280.0+l.a*255.0)/65535.0*9.25)-1.0+1e-4); }   // 1 / view depth
void main(){
  vec4 L=texture(tLit,vUv), c=texture(tEdge,vUv);
  float lum=L.g, bit;
  bool bg = c.b==0.0 && c.a==0.0;
  if(bg){ bit=0.0; lum=0.0; }              // background: black (or white for a daytime look, or draw a sky here)
  else bit=L.r;
  vec2 px=1.0/res;
  vec4 r=texture(tEdge,vUv+vec2(px.x,0.0)), u=texture(tEdge,vUv+vec2(0.0,px.y));
  // an outline where the id changes to the right or above...
  bool e=abs(c.a-r.a)+abs(c.b-r.b)>0.002 || abs(c.a-u.a)+abs(c.b-u.b)>0.002;
  bool rb=r.b==0.0&&r.a==0.0, ub=u.b==0.0&&u.a==0.0;
  // ...or where the normal turns sharply (0.75 suits simple shapes; for detailed meshes use ~0.2, see below)
  if(!bg && !rb && dot(nrm(c),nrm(r))<0.75) e=true;
  if(!bg && !ub && dot(nrm(c),nrm(u))<0.75) e=true;
  // the line is black on bright areas and white on dark ones
  if(e){ float l2=max(lum, max(texture(tLit,vUv+vec2(px.x,0.0)).g, texture(tLit,vUv+vec2(0.0,px.y)).g)); bit = l2>0.5 ? 0.0 : 1.0; }
  o=vec4(mix(dark,light,bit),1.0);
}
```

Render it with an `OrthographicCamera(-1,1,1,-1,0,1)` and a single triangle covering the screen (positions
`(-1,-1), (3,-1), (-1,3)`, `vUv = pos*0.5+0.5`), to the canvas (`renderer.setRenderTarget(null)`). `dark = (0,0,0)`,
`light = (1,1,1)`.

**Detailed meshes** (scanned or sculpted models): the normal rule scribbles over every small bevel. For those, give them ids
in a range you can recognise (e.g. 32768 and up, so `c.b >= 0.5`), use a crease threshold of `0.2` for them, and add depth
steps: `1/z` is linear across the screen on any plane, so its second difference is zero on flat surfaces. Taking only the
negative side puts the line on the nearer surface, one pixel wide:

```glsl
bool mdl = c.b>=0.5;
if(mdl && !e){ float zc=invZ(L), zr=invZ(texture(tLit,vUv+vec2(px.x,0.0))), zl=invZ(texture(tLit,vUv-vec2(px.x,0.0))),
  zu=invZ(texture(tLit,vUv+vec2(0.0,px.y))), zd=invZ(texture(tLit,vUv-vec2(0.0,px.y)));
  if(min(zl+zr,zu+zd)-2.0*zc < -0.03*zc) e=true; }
```

Also give each connected piece of a joined mesh its own id (weld vertices by position, find connected components) if the
parts should be outlined separately.

## Optional extras

- **Texture as tone:** multiply the luminance by the base-colour texture's brightness relative to its mean, raised to a
  contrast power, clamped to `0.3..1.7`, so wood grain or print comes through as denser or sparser dots.
- **Atkinson-like variant** (classic Mac look): tone sets how *many* small square dots are on rather than their size; which
  ones is the Bayer order shuffled by a per-point random number; contrast pushed with `(lum-0.5)*1.3+0.5`; `uD = 2.4`. In
  `surf()`: square dots of fixed radius `exp2(f)*0.36` (test `max(abs(dv.x),abs(dv.y))` instead of `length`), the whole
  lattice on at 50% (`want = min(cov*2.0, 1.0)`), coverage floor `0.012` instead of `0.03`, no `cov` minimum, and multiply
  `w` by `smoothstep(0.0, 0.3, 1.0 - (rank/t + 0.7*(h-0.5)) / want)` where `h` is a hash of the lattice point that is the
  same at every level: strip the point's common factors of two (`int m=c.x|c.y, k=m&(-m); if(k==0) k=1; ivec2 b=c/k;`)
  and hash `vec2(b) + 17.0*(L + log2(k))`.
- **Distance fade:** `lum = mix(lum, 1.0, amount * smoothstep(start, end, dist))` in the material for a hazy, mostly-white
  daytime look.

## Known limits (expected, not bugs)

- Surfaces seen nearly edge-on turn dots into dashes.
- Small dots shimmer slightly at their edges as they cross the pixel grid (there is no anti-aliasing in 1-bit).
- The switch from dark-dots-on-light to light-dots-on-dark at 50% is a visible contour on smooth gradients.
- Outlines are 1 px and can clutter on thin, distant objects.

## Checking it

After each step, look at the result at phone size and on a desktop: the image must be pure black and white, dots must stay
put on surfaces while the camera orbits (only appearing and disappearing in place as distance changes), dot spacing on
screen should look about the same near and far, and every object should have a clean 1-pixel outline. Things to tune
afterwards: `uD` (dot spacing), the tone curve, the `sqrt(max(cs, 0.1))` term in `sigma` (stretched dashes versus sub-pixel
noise at grazing angles), and the outline thresholds (`0.002` for ids, `0.75` for normals).
