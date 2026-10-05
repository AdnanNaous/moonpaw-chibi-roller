# MOONPAW visual direction

MOONPAW is a side-view 2D pixel horror game. The world is drawn at a deliberately low internal resolution and scaled with nearest-neighbor sampling. The camera follows one x/y play plane. The player should always read as a small traveler in a large, indifferent place.

The image is built from authored silhouettes first: towers, ribs of iron, rooted trees, prison bars, arches, bridges, a funeral moon, and torn cloth. Black negative space carries the composition. Bone, ash, and dull metal carry the edges; warm red and amber mark danger and fire. Grain and stippling weather the shapes but never stand in for recognizable objects. This is original art informed by dirty-pixel technique and a severe Souls-like mood, without copying specific artwork or characters.

The pilgrim has a narrow animal mask, torn cloak, heavy boots, and a staff. Eyes are tiny points, not a cute facial focus. The short four-pose stride, different rising and falling silhouette, attack stroke, dash ghosts, and death slump must stay legible at mobile size. Feet align with the physics origin. The player, platform edges, pickups, and threat windups remain readable against the darkest scenery.

Each chapter has a strong distant landmark and a distinct threat language:

| Chapter | Skyline and near field | Main visual warning |
| --- | --- | --- |
| Crypt Court | Buttressed court, grave crosses, and knife-like roofs | Portcullis bars and red floor cue |
| Foundry | Chimneys, gear housings, broken rail machinery | Hammer shadow and hot piston |
| Flooded Cloister | Drowned arches and water marks | Rising pale tide line |
| Vanishing Archive | Stacks, ink-dark windows, and narrow bridges | Fading bridge surface |
| Bell Spine | Tall bell towers and exposed windward edges | Hanging blades and wind direction |
| Hungry Orchard | Skeletal branch canopies and low roots | Upright hunter silhouette |
| Prison Ramparts | High walls, barred openings, and rain | Horizontal red sight line |
| Rotating Choir | Organ-like pillars and ruined chapels | Sweeping metal disc |
| Unlit Below | Broken mineral masses and the largest empty sky | Crawling darkness edge |
| Throne of Bells | Spiked court and high throne shape | Crowned Warden windup |

Light is sparse and local. The moon is cold and partly eaten by shadow. Torches cast small amber pools. Pickups and checkpoints have restrained halos; they do not light the whole scene. Near architecture cuts across far light and fog to imply depth. Use a fixed number of gradients and particles per frame, stable seeded texture, and quality-dependent weather counts. Reduced motion holds decorative drift still while gameplay animation and hazard state remain visible.

The playfield owns the full canvas. HUD and touch controls live outside it, so scenery and warnings cannot hide beneath mobile buttons. The canvas resizes from its own client bounds. Check both landscape and narrow portrait views before release, especially the player's scale, platform edges, telegraph lines, and the opening composition.
