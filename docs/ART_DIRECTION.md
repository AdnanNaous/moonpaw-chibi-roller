# MOONPAW visual direction

MOONPAW is a side-view 2D pixel horror game. The world is drawn on a coarse internal grid and enlarged with nearest-neighbor sampling at an integer scale of at least two CSS pixels per cell. Tiny centered margins absorb the remainder instead of stretching cells. The camera follows one x/y play plane and keeps the floor visible during jumps. The player should always read as a small traveler in a large, indifferent place.

The image is built from authored silhouettes first: towers, ribs of iron, rooted trees, prison bars, arches, bridges, a funeral moon, and torn cloth. Black negative space carries the composition. Bone, ash, and dull metal carry the edges; warm red and amber mark danger and fire. Grain and stippling weather the shapes but never stand in for recognizable objects. This is original art informed by dirty-pixel technique and a severe Souls-like mood, without copying specific artwork or characters.

The pilgrim is an original 48-by-64 drawing in `src/pixel-art.ts`, packed into 23 isolated frames. Jointed legs and arms, ribbed armor, a recessed animal mask, split cloak, scarf and hooked blade form the silhouette. Eight stride poses follow distance traveled; jumps, wall kicks, three strikes, four roll orientations and landings have separate drawings. Rotated poses are fitted from their actual alpha bounds and anchored to source row 60, preventing atlas contamination and changing floor contact.

Walkways are cached material constructions, with a collision-aligned cap, masonry courses, recessed support bays and foundations. Iron ledges carry trusses and chain fixtures; rooted, damp and timber structures use their chapter palette. Moving, crumbling, vanishing and conveyor surfaces retain visible gameplay state. Rest points are wheel-and-lamp mechanisms; witness seals are wax-bound vessels. The exit displays two real recovered seals and three encounter locks, opening only when the gameplay conditions are met.

The title uses its own traveler and plinth composition over the existing chapter scenery. Menu rows, chapter previews, narrative panels and settings share thin rules, serif display type and quiet blue-gray surfaces. The HUD floats at the top of the world; touch controls occupy a separate bottom dock.

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

Light is sparse and local. The moon is cold and partly eaten by shadow. Torches cast small amber pools. Pickups and checkpoints have restrained halos; they do not light the whole scene. Near architecture cuts across far light and fog to imply depth. Use a fixed number of gradients and particles per frame, stable seeded texture, and quality-dependent weather counts. Reduced motion holds decorative drift still while gameplay animation and hazard state remain visible.

The playfield owns the full canvas. The HUD stays at the top and touch controls live outside it, so scenery and warnings cannot hide beneath mobile buttons. The canvas resizes from its own client bounds. Check both landscape and narrow portrait views before release, especially the player's scale, platform edges, telegraph lines, and the opening composition.
