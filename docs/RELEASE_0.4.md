# MOONPAW: Ashen Vow 0.4 — the traveler and the thresholds

The detailed chapter scenery is retained. This update rebuilds the parts the player actually uses: the title and chapter route, story presentation, HUD, touch dock, settings, character poses and walkable structures.

The pilgrim now has 23 articulated 48×64 pixel poses: eight strides, rising/falling and wall poses, three strikes, four roll orientations, landing, hurt and death. Stride animation follows traveled distance. Every rotated pose is packed independently and anchored using its actual raster bounds, keeping roll contact on the floor. Walkways use material-specific supports and foundations. Rest lamps, name vessels and exit machinery share the world palette; the door shows the two recovered seals and three cleared encounter locks.

Movement has stronger stopping and reversal, a direction committed during a roll, controlled speed afterward, wall-kick separation, variable jump height and buffered jumps on landing. The ten existing authored chapters, thirty mandatory encounters, three pacts, final Regent, endings, journal and creator links remain.

Title music starts after interaction and fades through a darker timbre. Pause ducks the selected music level and restores it on resume. Contact sounds distinguish stone, iron, timber and water; landings and rolls add restrained cloth and impact textures. UI sounds are short and throttled. The existing three sampled-instrument arrangements remain; this release does not claim a new orchestra or ten independent scores.

Verified on 2026-10-08:

- 33 unit tests, including real-input traversal of all ten chapters and five focused movement checks.
- Six browser tests covering story/endings, fullscreen, persistent settings, pacts, simultaneous CDP touch input and simulated native/controller boundaries.
- Actual desktop and emulated mobile views at 1440×900, 844×390 and 390×844: no page errors or horizontal overflow; measured rendering around 59–60 FPS on this PC.
- Native Electron development-shell movement, jumping, story, fullscreen/F11, credits, independent settings, Exit cancellation and actual native quit.
- Production offline reload with 47 cached resources, including environment art and sampled score.
- Audio title gesture/filtering, independent buses, encounter stem, voice caps, finite contact samples, cleanup, pause recovery, mute and disposal.
- Independent read-only review identified sprite atlas/contact defects and repeated title-plinth allocation. Fixed and re-reviewed with no remaining findings.

The Windows package is unsigned, and development-shell verification does not establish packaged execution on every Windows installation. Physical Android/controller use, real-device performance, human music listening and difficulty tuning remain pending. iOS source is supplied without an iOS binary.
