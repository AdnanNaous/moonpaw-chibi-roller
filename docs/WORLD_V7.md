# Enemies and terrain, v7

The accepted feral cat sheet and city paintings are preserved. This pass replaces the flat plated-stick enemy drawings and geometric platform faces with detailed isolated drawings that belong to the same ruined city.

## Enemy designs

- Sentinel: broad hunched beetle-shell jailer, pale oblong face, heavy stone shield.
- Skirmisher: narrow avian skull, long bent limbs, ragged cloak and sickle claws.
- Marksman: hooded revenant with a visible mechanical harpoon bow.
- Regent: mineral body, broken orbit crown, massive crescent axe.

Four rows represent idle, windup, attack and stagger. Anticipation changes the entire silhouette; it is not only a blinking color. Existing simulation timing, collision boxes and attack-range telegraphs stay authoritative.

`public/art/enemies-v7.png` is the original generated 1254 × 1254 RGBA source. `packEnemyAtlas` isolates alpha-connected drawings within measured floor bands into a 768 × 768 runtime canvas. Small nearby crown fragments remain attached to their own figure. Each cell is 192 × 192, floor pivot y=180, nominal body height 156; four kinds are columns and phases are rows. Every kind has one scale across all phases, preserving the crouch and recoil instead of stretching each pose. Source drawings remain unchanged on disk.

The generated Regent axe touches the previous row. The measured row boundary separates those poses during runtime packing; it is not a naïve equal-column crop. Browser inspection found 16 populated isolated cells with 4–27 pixels of horizontal padding. Baseline alpha ends at y=179–180. The initial main-thread prototype took 121–143 ms to pack on this Windows Chromium test. That expensive pixel traversal now supports an OffscreenCanvas factory and runs in the shared atlas worker during artwork loading; gameplay draws only the transferred packed canvas. Worker integration and frame pacing are verified separately from the initial gallery timings.

## Terrain

`public/art/terrain-v7.png` is the original generated 1536 × 1024 RGBA source. It contains four long fragments: carved funerary stone, corroded foundry iron, rotten archive timber and fungal-root slate. Circular reliefs, deep fissures, irregular worn plates and hanging roots provide detail without a regular brick grid. No crosses or Christian symbols are introduced.

`preloadStructureArt()` loads the image and delegates material isolation to `packTerrainAtlas` through the shared atlas worker. `structure()` crops broad deterministic material sections at their natural aspect ratio instead of compressing a whole slab into a tiny ledge. A continuous top cap is aligned exactly to collision y=0; all carved faces and hanging roots stay below it. Theme tint and lower-face shadow are baked into each cached platform canvas. Existing crumble, conveyor, moving and memory overlays are drawn by the renderer and remain functional.

`preloadStructureArt()` increments `structureArtRevision` when ready. The renderer should clear its structure cache at that point. Failed source loads leave the original procedural terrain and enemy fallback available. Ten sample platforms painted in about 2 ms total in the browser. Root integration and gameplay profiling are separate from this asset-gallery measurement.
