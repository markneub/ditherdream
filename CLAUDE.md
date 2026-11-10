# ditherdream

A 1-bit, Obra Dinn-inspired renderer experiment: a small moonlit ship scene in plain WebGL2,
dithered with dots that stick to surfaces. No build step, no runtime dependencies.

## Run and check

- Open `index.html` in a browser (works from `file://`; scripts are classic, not modules).
- `npm install && npm run shots` renders fixed camera angles at phone size into `shots/`
  (gitignored) and exits non-zero on any page or shader error. Set `CHROME_PATH` to use an
  installed Chrome instead of Playwright's download. Look at the PNGs after every visual change.
- `window.__dbg` exposes `S` (dev switches) and `cam(theta, phi, radius)` for scripted views.

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
| `src/main.js` | Orbit input, the frame loop (shadow pass, scene pass, post pass) |

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
- Small dots shimmer at their edges as they cross the pixel grid (no anti-aliasing in 1-bit).
- The 50% flip between dark-dots and light-dots is a visible contour on smooth gradients.
- Spheres and the bow wedge use per-triangle planar UVs, so the pattern has seams there.
- Sea is nearly black except moon glitter; star cells can twinkle.
- Outlines are 1 px and can clutter on thin distant objects (balusters, cannon wheels).
- Lantern light casts no shadows.

## Ideas not yet tried

Hatching or line patterns instead of dots; per-material patterns (Obra Dinn mixes Bayer and
blue noise); first-person camera with walking; importing a glTF model; dot anti-shimmer by
snapping dot centres to pixel centres.
