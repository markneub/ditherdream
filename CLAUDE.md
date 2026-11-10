# ditherdream

A 1-bit, Obra Dinn-inspired renderer experiment in plain WebGL2: nine small scenes (a ship's deck and
hold, a real ship model at anchor, an empty office, a lighthouse, a forest, a cathedral, a night train, desert ruins), dithered with dots that stick to surfaces. No build step, no runtime dependencies.
Seven scenes are boxes and cylinders generated in code; `anchor` is a Poly Haven model and `office` is code-built rooms
with Poly Haven furniture, both loaded from `assets/`.

## Run and check

- Open `index.html` in a browser (works from `file://`; scripts are classic, not modules). The `anchor` and `office` scenes fetch
  their models, so they need a web server (`python3 -m http.server`); from `file://` it says so and the other scenes still work.
- `npm install && npm run shots` renders fixed views of every scene at phone size into `shots/`
  (gitignored; it serves the folder over http itself), runs the walk tests, and exits non-zero on any page or shader error. `npm run shots -- forest`
  renders only views whose name starts with `forest`; `npm run shots -- tests` runs only the walk tests.
  Set `CHROME_PATH` to use an installed Chrome. **Look at the PNGs after every visual change.**
  (SwiftShader takes ~6 minutes for the full run.)
- `window.__dbg`: `S` (dev switches), `scenes` (by name), `setScene(sc)`, `setView('orbit'|'walk')`,
  `cam(theta, phi, radius)`, `player`, `walk(x, z, yaw, pitch, sceneName, y)`.
- Walk tests (simulated, `player.update(1/60)` in a loop): the deck's steps/rails/edges, hatch down and
  ladder up, the anchored ship's two ladders and bulwark, every office room reachable from the spawn (flood fill), the lighthouse door → spiral stair → lamp room → gallery, and every scene's spawn + 20 s straight ahead.

## Deploy

- `.github/workflows/pages.yml` runs on every push and publishes `index.html` + `src/` + `assets/` **only from the
  default branch** (`main`). Live at https://markneub.github.io/ditherdream/
- **Auto-merge (the user's standing instruction, "for now"):** they test on the live site from a phone, so once a change is
  pushed and `npm run shots` passes, open a pull request to `main` and merge it without asking first. Stop when they say so.
- Pages source must be "GitHub Actions" (repo Settings → Pages). New top-level files the page needs
  must be added to the `cp` line in the workflow.

## Layout

Files load in this order and share the global scope (top-level `const`s are visible across files):

| File | What it holds |
| --- | --- |
| `src/state.js` | Fixed look (`PIXEL`, `DOT_SPACING`, `DARK`/`LIGHT`) and dev switches `S` |
| `src/geometry.js` | Matrix helpers; shape builders (pos3, normal3, uv2): `box wedge cyl flatcyl sphere sector vault mound sling rock`; `rng(seed)` |
| `src/shaders.js` | All GLSL: `SCENE_*` (lighting + surface dots), `SHADOW_*`, `POST_*` (sky, edges, palette) |
| `src/renderer.js` | GL setup, programs, shadow map, MRT framebuffer, `resize()` |
| `src/scene.js` | Scene builder (`beginScene`/`add`/`B`/`lantern`/`endScene`), `modelObject`/`modelBatch` + `heightField` for imported meshes, `WALK` + `walkBlocked`, and `DECK` |
| `src/gltf.js` | `loadGLTF(url)`: meshes with node transforms applied, and each one's base-colour image URL |
| `src/anchor.js` | The model scene: loads the ship on first open, builds its height map, ladders |
| `src/office.js` | The office: floor plan helpers (`oWall`, `oPart`, `oLights`), furniture placement, the roaming lamps |
| `src/hold.js` `lighthouse.js` `forest.js` `cathedral.js` `train.js` `ruins.js` | One scene each: geometry, lamps, `update(T)`, `floorAt`, `spawn` |
| `src/walk.js` | First-person `player`, the deck's and hold's floors and the hatch/ladder between them, `scene` (the current one), touch and desktop controls |
| `src/main.js` | `SCENES`, the scene switcher, orbit input, `setScene`/`setView`, the frame loop (shadow passes, scene pass, post pass) |

## How the frame is built

1. **Shadow passes**: depth from the moon into a 2048 px shadow map, then a 512 px depth **cube map per
   lantern** (up to 3, six faces each, every frame, since the lanterns swing; `cubeSh` in `SCENE_FS`
   with a world-space bias). Static geometry is one baked buffer per scene, so each pass is one draw.
2. **Scene pass** into two targets: `lit` = (surface-dot bit, luminance, 16-bit log view depth) and `edge` = (view normal xy, 16-bit object id).
3. **Post pass**: picks the surface bit or screen-space Bayer, draws the sky where id = 0 (night: stars + moon;
   `day` scenes: white with the sun as a thin ring),
   then 1 px outlines where id or normal changes between neighbouring pixels, then maps to the 2-colour palette.

Canvas resolution is device pixels divided by a whole number (`PIXEL`), so every scene pixel is an
exact block of screen pixels.

**The look is fixed, with no on-screen options for it** (the user's pick; the only buttons are Scenes and Walk/Orbit): fine surface dots, 2 device
pixels per scene pixel on a phone, outlines on, pure black and white. `S.mode = 1` (screen-space
Bayer), `S.raw`, `S.edges` and `S.spin` remain as dev switches via `window.__dbg.S`.

## Scenes

The "Scenes" button (top left) lists them; `?scene=<name>` starts in one. Scenes with an `orbit` view open
in it with a Walk/Orbit button; the rest are walked.

- A scene is built between `beginScene()` and `endScene(props)`. Props (defaults in `endScene`): `name`,
  `title`, `sunDir`/`sunAt`/`sunHalf` (the sun or moon and its shadow box), `sunI`, `sky` (ambient), `fill`
  (unshadowed light near each lamp, standing in for bounce), `day`, `foam` (1 ship hull, 2 round island
  of radius `foamR`), `edge` (ground fades to black beyond this radius), `cubeFar`, `orbit`, `spawn`, `tip`.
  Then `lamps` (max 3), `update(T, dt)`, `floorAt(x, z, y)`, optional `exit(player)`.
- Per-object data (id, shade, emissive, kind) rides in a 4th vertex attribute (`aA` → `vA`). Ids are 16-bit.
  Static objects are baked into one buffer; `dyn`/emissive/sea objects keep their own and can move
  (`noShadow`, `noLampShadow` skip the shadow passes).
- Lamps: `{pos, intensity, range, flicker, phase, obj}`; `pivot`+`len` makes it swing (`lantern()`);
  `dir`+`cone` (cos of the half-angle) makes it a spot. Each casts cube-map shadows.

| Scene | What it's for | Notes |
| --- | --- | --- |
| `deck` | the original | moonlit, one lantern; the open hatch leads to `hold` |
| `anchor` | a real model, to compare with `deck` | see "The model scene" below |
| `office` | flicker, darkness, many copies of models | see "The office" below |
| `hold` | lantern light, hard swinging shadows | moonlight only through the hatch grating; the ladder leads up |
| `lighthouse` | a moving light, a climb | spot lamp turning in the lamp room (lights the sea via the sea shader); 3.5-turn spiral stair: `floorAt` returns the highest floor within a step's reach of your height (several floors overlap); gallery door is opposite the stair well |
| `forest` | many thin overlapping shapes | 85 conifers (seeded), campfire lamp with jitter + flicker, dappled moonlight |
| `cathedral` | big gradients, shafts of light | `day`; sun in bars through the south windows; barrel vault (`vault`), swinging chandelier, two altar candles |
| `train` | light sliding past | everything outside moves (`update`): ground (wraps every 64 m so the dots repeat exactly), poles, trees, two trackside lamps whose light sweeps through the windows |
| `ruins` | mostly white | `day`, high sun, small hard shadows; dunes and pyramids have a lower shade so their far sides dot |

- `deck` ↔ `hold`: `scene.exit(player)` returns `{scene, x, z, yaw}`; arrivals sit outside both trigger zones.
- Colliders are hand-listed or collected while building (`FO.trees`, `RU.circles`, ...): keep them in step with the geometry.

## Walking (`src/walk.js`)

The Walk/Orbit button switches view where a scene has both (the user asked for a
first-person scene with **the same walk controls as their pacnw project**; this is a port of its
`touch.js`/`player.js`, keep the two in step):

- **Touch, one thumb:** sliding sideways turns (~130 degrees per screen width); how far up from the touch
  point sets speed (80 px = full, over 0.92 runs, pulling down backs up slowly). Holding still
  260 ms (within 10 px) makes the drag a free look instead, with a vignette (`#look-cue`); letting go
  mid-swipe glides the turn; after a look the pitch eases back to level. A second finger while
  walking is also a free look.
- **Desktop:** click captures the mouse (a held drag looks if pointer lock is refused), WASD/arrows, Shift runs.
- Yaw 0 faces -z, positive yaw turns left. Speeds are scaled to the deck (2.4 m/s walk, 5 run; pacnw uses 5/13).
- `floorAt(x, z, y)` is the walkable height or `null` (overboard or inside a collider); `y` is your current height, for places with floors above each other. A move is allowed
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
- New scenes (lighthouse, forest, cathedral, train, ruins) were built unattended in one pass and only checked in
  headless stills: lighting levels, speeds and collider fit are first guesses. Not yet tried on a phone; the train
  (45 moving objects) and forest (85 trees × lamp cube passes) are the likeliest to be slow.
- The lighthouse beam only shows where it lands (sea, rail, mullions); there is no visible shaft in the air.
- The hold's floor is mid-tone dots nearly everywhere a lamp reaches: busy. Fewer, brighter pools might read better.
- Looking up through the hatch from the hold shows sky only (the deck's mast and rigging aren't in that scene).

## The model scene (`anchor`)

The user found the code-built scenes "too rudimentary" and asked for a scene from real models. `anchor` is Poly Haven's
*Dutch Ship Medium* (CC0; ~69k triangles in three meshes: hull, rigging, sails) at anchor at night, next to `deck` in the
list so the two can be compared. Poly Haven (`api.polyhaven.com`, `dl.polyhaven.org`) was reachable from the cloud session
that built this; see `assets/README.md`.

- **Loading:** `ANCHOR.load()` (called by `setScene` the first time, memoised) fetches the glTF, makes one `sc.dyn` object
  per mesh (`modelObject`, kind 2, with `tex` + `contrast`) and builds the height map. Until then the scene is sea and a lantern.
- **Dots:** kind 2 ignores the scan-atlas UVs for the lattice and uses world position projected along the dominant axis
  of the normal (hard switch, metres). The model never moves, so world = object; a moving model would need its object position.
- **Tone:** shade is multiplied by `(texture luminance / the texture's mean) ^ contrast`, clamped to 0.3..1.7 (`uTone`).
- **Outlines:** every connected piece of a mesh gets its own id (welded by position, union-find), from 32768 up; ids in that
  range mark model pixels in the post pass. There the normal rule only fires on sharp creases (`MODEL_CREASE`), and depth
  steps are found from the second difference of 1/z (zero on any plane; negative side only, so the line is 1 px on the nearer
  surface; `MODEL_DEPTH` is the relative step). This was the feared risk and it reads well in shots, near and far.
- **Walking:** `heightField` rasterises the hull (below y 4.7) and rigging (below 3.7) into 10 cm cells, highest surface
  wins; `floorAt` takes the highest of five samples a body-radius apart, so rails, masts, the boat and the capstan block
  with no hand-listed colliders. The two ladders are hand-placed ramps (`ANCHOR_LADDERS`). The poop deck is not reachable.
- **Not done / first guesses:** no barrels or crates added as dressing (the model has its own deck furniture); the ship does
  not sway; no way below; shade/contrast per mesh (`ANCHOR_LOOK`), the lantern's spot on the mainmast and `shipDist` (foam
  outline) were set from headless stills only. Not yet tried on a phone: each lamp redraws the model six times a frame.

## The office (`office`)

The user asked for a spooky backrooms-style corporate office lit by flickering fluorescent lights, with walls and doors
built in code, cubicles, Poly Haven office furniture, and about 30 seconds of unique walking. It is 40 x 30 m, walk only:
reception (spawn), pillar hall, a dark room with one chair and a lit screen, a 24-bay cubicle farm, a corridor with
three offices, meeting room, break room, a long corridor and a store room. The room list is at the top of `office.js`.

- **Plan:** `oWall(axis, c, a, b, doors)` builds a wall with 1.6 m double doorways (lintel, frame, two leaves standing open; the
  user found 1.2 m too narrow to get through) or closed dummy doors, and records colliders in `OF.rects`. Furniture helpers (`desk`, `chair`, `mono`, `table`, `tv`, `plant`)
  add a model copy and its collider; rect-collider models must sit at quarter turns. Models face +z at `ry` 0.
- **Ceiling:** 3 m up, a drop ceiling of 1700 separate 1.2 x 0.6 m tiles (the id outline between them is the grid; a few
  are missing). The user found 2.7 m too low and plain strips unconvincing. Light fittings are panels snapped to the grid (`TILE`).
- **Clocks:** the model's glass renders opaque and its numerals are texture only, so `oClock` adds dark hour marks and hands in front.
- **Lights:** 37 fittings (`oLights`), each steady, flickering, dying or dead. **Keep flicker rare**: the first version had 11
  stuttering fittings at 24 Hz and the user called it "way too much"; now four stutter briefly every half minute or so and two are nearly dead.
  `tubeOn(f, T)` is its brightness, and a lit
  fitting's emissive tube is hidden (moved to y -50) while it is off. Only three lamps exist: every frame `update` puts
  them at the three nearest working fittings and fades each by how close it is to being swapped out (`d4 - d`), so the
  swap never pops. The result is that light follows you and rooms further off are black with white outlines. A lamp at
  zero brightness skips its six shadow passes.
- **Models:** `modelBatch` bakes all copies of a model into one buffer per texture and keeps each copy's vertex range and
  bounding sphere (`parts`); lamp shadow passes draw only the copies within the lamp's range. `noSun` skips the sun's
  shadow pass (there is no sun indoors). Textures were shrunk to 512 px; see `assets/README.md`.
- **First guesses, from headless stills only:** lamp brightness (1.9) and wall/carpet shades, the flicker timing (never seen
  in motion here). Not yet tried on a phone.

## Ideas not yet tried

A visible lighthouse beam (a dotted cone?). Hatching or line patterns instead of dots; per-material patterns (Obra Dinn mixes Bayer and
blue noise); more models (dressing, a second scene); dot anti-shimmer by
snapping dot centres to pixel centres.
