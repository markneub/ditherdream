# ditherdream

A 1-bit renderer experiment inspired by *Return of the Obra Dinn*: ten small scenes drawn in two
colours, with halftone dots that stay glued to surfaces as the camera moves. Ship's deck, a model ship at anchor
(Poly Haven's CC0 *Dutch Ship Medium*), an empty office under flickering tubes, a tunnel-flying game, below decks,
lighthouse, forest at night, cathedral, night train, desert ruins.

Live at https://markneub.github.io/ditherdream/ or open `index.html` in any WebGL2 browser (the two scenes with models need a web server, e.g. `python3 -m http.server`). "Scenes" switches scene. Drag to orbit, pinch or scroll to zoom; "Walk" puts you on foot.

`npm install && npm run shots` renders reference screenshots into `shots/`.

Add `?dither=atkinson` to the address for an alternative, Atkinson-like look (small square dots whose number, not size, follows the tone).

See [CLAUDE.md](CLAUDE.md) for how it works and what to try next.
