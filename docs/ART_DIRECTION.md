# MOONPAW visual direction

MOONPAW is a side-view 2D pixel horror game. The world is drawn on a coarse internal grid and enlarged with nearest-neighbor sampling at an integer scale of at least two CSS pixels per cell. Tiny centered margins absorb the remainder instead of stretching cells. The camera follows one x/y play plane and keeps the floor visible during jumps. The player should always read as a small traveler in a large, indifferent place.

The image is built from authored silhouettes first: towers, ribs of iron, rooted trees, prison bars, arches, bridges, a funeral moon, and torn cloth. Black negative space carries the composition. Bone, ash, and dull metal carry the edges; warm red and amber mark danger and fire. Grain and stippling weather the shapes but never stand in for recognizable objects. This is original art informed by dirty-pixel technique and a severe Souls-like mood, without copying specific artwork or characters.

The pilgrim is a feral cat with an elongated muzzle, articulated hocks, long tail, torn charcoal mantle and a broken circular collar charm. The generated transparent source has 32 drawings, isolated into 192-by-160 cells at startup by `src/pilgrim-atlas.ts`. The shared floor pivot prevents changing floor contact; component masks prevent neighboring tails from bleeding into another pose. Sixteen stride drawings follow distance traveled; jumps, wall contact, strikes, rolls, landings, hurt and death use distinct poses. See [the generation prompt, provenance and production study](CHARACTER_V6.md). The previous procedural character remains only as a local asset-error fallback.

Walkways are cached material constructions with a collision-aligned eroded cap and fractured foundations. Broad facets, irregular collapsed recesses, root veins, water marks, broken iron and timber replace repeating brick courses and support bays. Narrow stepping stones retain a readable top edge. Moving, crumbling, vanishing and conveyor surfaces retain visible gameplay state. Rest points are wheel-and-lamp mechanisms; witness seals are wax-bound vessels. The exit displays two real recovered seals and three encounter locks, opening only when the gameplay conditions are met.

The title lets the approved city painting carry the composition, with a crescent-thread emblem, engraved Cormorant SC lettering and four plain vertical commands. There is no giant traveler, pedestal or numbered marketing row. Chapter previews, narrative panels and settings share Cormorant SC headings and Barlow body text over the darkened scenery. Menus and narrative sheets avoid enclosing card borders. The HUD floats at the top of the world; touch controls occupy a separate bottom dock.

Each chapter has a strong distant landmark and a distinct threat language:

| Chapter | Skyline and near field | Main visual warning |
| --- | --- | --- |
| Crypt Court | Cliff-cut terraces, round tunnel vaults and broken orbit markers | Portcullis bars and red floor cue |
| Foundry | Chimneys, gear housings, broken rail machinery | Hammer shadow and hot piston |
| Flooded Cistern | Drowned waterworks and water marks | Rising pale tide line |
| Vanishing Archive | Stacks, ink-dark windows, and narrow bridges | Fading bridge surface |
| Bell Spine | Tall bell towers and exposed windward edges | Hanging blades and wind direction |
| Hungry Orchard | Skeletal branch canopies and low roots | Upright hunter silhouette |
| Prison Ramparts | High walls, barred openings, and rain | Horizontal red sight line |
| Rotating Engine | Mechanical wheel housings and industrial chambers | Sweeping metal disc |
| Unlit Below | Broken mineral masses and the largest empty sky | Crawling darkness edge |
| Throne of Bells | Pressure vessel, exposed coils and sealed industrial court | Regent windup |

Light is sparse and local. The moon is cold and partly eaten by shadow. Torches cast small amber pools after the platforms have been drawn, with local warm actor tints and projected contact shadows. They are grounded on actual walkways; lamps do not float over gaps. Enemies carry a pale one-pixel edge, stronger during windup. Pickups and checkpoints have restrained halos; they do not light the whole scene. Near architecture cuts across far light and fog to imply depth. Use a fixed number of gradients and particles per frame, stable seeded texture, and quality-dependent weather counts. Reduced motion holds decorative drift still while gameplay animation and hazard state remain visible.

The playfield owns the full canvas. The HUD stays at the top and touch controls live outside it, so scenery and warnings cannot hide beneath mobile buttons. The canvas resizes from its own client bounds. Check both landscape and narrow portrait views before release, especially the player's scale, platform edges, telegraph lines, and the opening composition.
