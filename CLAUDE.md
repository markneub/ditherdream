# ditherdream

A 1-bit, Obra Dinn-inspired renderer experiment: a small moonlit ship scene in plain WebGL2,
dithered with dots that stick to surfaces. No build step, no runtime dependencies.

## Run and check

- Open `index.html` in a browser (works from `file://`; scripts are classic, not modules).
- `npm install && npm run shots` renders fixed camera angles at phone size into `shots/`
  (gitignored) and exits non-zero on any page or shader error. Set `CHROME_PATH` to use an
  installed Chrome instead of Playwright's download. Look at the PNGs after every visual change.
- `window.__dbg` exposes `S` (dev switches), `cam(theta, phi, radius)`, `setView(v)`, `player` and
  `walk(x, z, yaw, pitch)` for scripted views. The shots script also runs a simulated walk test
  (`player.update(1/60)` in a loop: up the steps, into the rail, to the bow, off the quarterdeck edge).

## Deploy

- `.github/workflows/pages.yml` runs on every push and publishes `index.html` + `src/` **only from the
  default branch** (`main`). Live at https://markneub.github.io/ditherdream/
- Pages source must be "GitHub Actions" (repo Settings → Pages). New top-level files the page needs
  must be added to the `cp` line in the workflow.

## Layout

Files load in this order and share the global scope (top-level `const`s are visible across files):

| File | What it holds |
| --- | --- |
| `src/state.js` | Fixed look (`PIXEL`, `DOT_SPACING`, `DARK`/`LIGHT`) and dev switches `S` |
| `src/geometry.js` | Matrix helpers; box / wedge / cylinder / sphere builders (pos3, normal3, uv2) |
| `src/shaders.js` | All GLSL: `SCENE_*` (lighting + surface dots), `SHADOW_*`, `POST_*` (sky, edges, palette) |
| `src/renderer.js` | GL setup, programs, shadow map, MRT framebuffer, `resize()` |
| `src/scene.js` | The ship: every object is one `add(geometry, pos, rot, shade, opts)` call |
| `src/walk.js` | First-person `player`, `floorAt()` + colliders for the ship, touch and desktop controls |
| `src/main.js` | Orbit input, `setView('orbit' or 'walk')`, the frame loop (shadow pass, scene pass, post pass) |

## How the frame is built

1. **Shadow pass**: depth from the moon into a 2048 px shadow map.
2. **Scene pass** into two targets: `lit` = (surface-dot bit, luminance) and `edge` = (view normal, object id).
3. **Post pass**: picks the surface bit or screen-space Bayer, draws sky/stars/moon where id = 0,
   then 1 px outlines where id or normal changes between neighbouring pixels, then maps to the 2-colour palette.

Canvas resolution is device pixels divided by a whole number (`PIXEL`), so every scene pixel is an
exact block of screen pixels.

**The look is fixed, with no on-screen options** (the user's pick): fine surface dots, 2 device
pixels per scene pixel on a phone, outlines on, pure black and white. `S.mode = 1` (screen-space
Bayer), `S.raw`, `S.edges` and `S.spin` remain as dev switches via `window.__dbg.S`.

## Walking (`src/walk.js`)

The one button on screen switches between orbiting and walking the deck (the user asked for a
first-person scene with **the same walk controls as their pacnw project**; this is a port of its
`touch.js`/`player.js`, keep the two in step):

- **Touch, one thumb:** sliding sideways turns (~130 degrees per screen width); how far up from the touch
  point sets speed (80 px = full, over 0.92 runs, pulling down backs up slowly). Holding still
  260 ms (within 10 px) makes the drag a free look instead, with a vignette (`#look-cue`); letting go
  mid-swipe glides the turn; after a look the pitch eases back to level. A second finger while
  walking is also a free look.
- **Desktop:** click captures the mouse (a held drag looks if pointer lock is refused), WASD/arrows, Shift runs.
- Yaw 0 faces -z, positive yaw turns left. Speeds are scaled to the deck (2.4 m/s walk, 5 run; pacnw uses 5/13).
- `floorAt(x, z)` is the walkable height or `null` (overboard or inside a collider). A move is allowed
  if the floor there is at most 0.45 m up or 0.6 m down from here, which gives steps, the hatch,
  and the quarterdeck edge with one rule. Colliders are hand-listed to match `scene.js`: **update
  both when moving objects**.
- Walking uses a wider lens (82 degrees vertical on a tall screen, 66 on a wide one) and a 6 cm near plane.

## Surface-stable dots (`surf()` in `SCENE_FS`)

After Rune Skovbo Johansen's "surface-stable fractal dithering", done procedurally with no textures.

- Each surface has UVs in object units (roughly isometric). Dots sit on a square lattice in UV space.
- `rank()` gives every lattice point a Bayer rank. The pattern is self-similar: points with
  rank < 1/4 are exactly the lattice at twice the spacing.
- `sigma` = UV units per screen pixel, computed analytically from distance and view angle (not
  `dFdx`, which breaks at UV seams). `l = log2(uD * sigma)`; its integer part picks the lattice,
  its fraction `f` picks how many points are switched on (`rank < 4^-f`), so on-screen dot
  density stays constant and nothing pops at level changes. Dots scale in by rank (`w`).
- Tone sets dot radius. Above 50% luminance: dark dots on light; below: light dots on dark.
  Coverage under 3% is clipped to solid, and tiny dots are clamped to a minimum size.

## Knobs worth trying

- `DOT_SPACING` in `state.js` (`uD`): on-screen dot spacing in scene pixels.
- Tone curve at the end of the lit branch in `SCENE_FS`: how much of the image is solid vs dotted.
- `sqrt(max(cs,0.1))` in `sigma`: the trade between stretched dashes and sub-pixel noise at grazing angles.
- Edge thresholds in `POST_FS` (`0.002` for id, `0.75` for normal dot product).

## Known weak spots

- Grazing-angle surfaces turn dots into dashes; no anisotropy compensation yet.
  Round dots there need an anisotropic lattice (separate fractal levels along and across the view
  direction); just stretching dots in UV makes them overlap their neighbours.
- Small dots shimmer at their edges as they cross the pixel grid (no anti-aliasing in 1-bit).
- The 50% flip between dark-dots and light-dots is a visible contour on smooth gradients.
- Spheres and the bow wedge use per-triangle planar UVs, so the pattern has seams there.
- Sea: black with broken swell bands, foam along the hull (`hullDist`) and moon glitter; star cells can twinkle.
- Outlines are 1 px and can clutter on thin distant objects (balusters, cannon wheels).
- Lantern light casts no shadows.

## Ideas not yet tried

Hatching or line patterns instead of dots; per-material patterns (Obra Dinn mixes Bayer and
blue noise); importing a glTF model; dot anti-shimmer by
snapping dot centres to pixel centres.
