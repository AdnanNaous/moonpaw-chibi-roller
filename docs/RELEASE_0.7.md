# MOONPAW: Ashen Vow — 0.7.0

This release addresses the measured rendering hitching, chapter openings and the enemy/platform art. The approved feral cat and ten city paintings are preserved.

## Frame pacing

The previous renderer rasterized a pixel scene and copied it into a second, full-window canvas every frame. Profiling attributed most sampled rendering time to that final copy. The visible canvas now uses the actual pixel grid, with nearest-neighbour scaling handled by the browser compositor. Static vignette, grain and scanlines are cached; light textures are bounded and reused. Repeated same-size resize calls and same-theme restarts retain scenery rather than repainting it. Aspect-ratio changes invalidate scenery when the world scale changes.

Alpha isolation for the hero, four enemies and four terrain materials runs in a module worker with OffscreenCanvas. The transferred results match the direct packers byte for byte. Older WebViews without the worker APIs retain the original packing fallback. Original source PNGs remain unchanged.

A controlled Chromium run at 1440×900, high effects and 4× CPU slowdown measured the previous build's 95th-percentile frame interval at 66.7 ms. The direct-canvas implementation measured 33.4 ms; steady-window intervals over 50 ms fell from 19 to 3. At normal CPU speed, the new run measured 16.8 ms at the 95th percentile and no intervals over 50 ms in its steady window. These are local synthetic measurements, not a physical-phone or universal performance guarantee. Initial decoding, scenery generation and switching display quality still produce startup/transition long tasks. See the recorded [baseline](performance-v7-baseline.json), [slowed run](performance-v7-direct.json) and [normal-speed run](performance-v7-normal.json).

## Chapter openings and world art

All ten chapters have authored interactive openings: 31 beats framed around the city's ribbon, chain, waterline, erased map, bell rope, fruit, prison marks, witnesses, reflection and final seals. Camera motion and letterboxing frame the existing world. Dialogue is immediately readable, with Continue and Skip controls for keyboard, touch and controller. Simulation stays paused, and transitions discard held action edges and accumulated simulation time. Reduced motion preserves the story.

Sentinels, skirmishers, marksmen and the Regent have distinct detailed silhouettes with idle, windup, attack and stagger drawings. Movement and combat timings stay authoritative. Walkways now use carved stone, corroded iron, rotten timber and fungal roots, with continuous collision-aligned top caps and deeper faces. See [enemy and terrain specifications](WORLD_V7.md).

These openings use real-time game scenes rather than rendered video. Existing sampled-instrument music and effects are unchanged in this release.

## Security

Production builds no longer expose the writable game-state debugging object. Saves and journal keys have bounded, known-field validation. The desktop application validates IPC senders, confines asset requests to its own packaged origin, denies permissions and limits external links. A content policy blocks inline scripts, eval, foreign connections, frames and plugins while allowing packaged workers, artwork, fonts and sound. Packaged Electron fuses disable Node execution modes and require the app's ASAR archive and embedded integrity hash.

This is an offline, public-source single-player game. A device owner can still edit code, memory and valid-looking local saves. These controls protect application boundaries and reject malformed state; they do not prove that a local score was earned. A future competitive service would need authoritative validation. Read the [security boundary notes](SECURITY.md).

## Validation boundary

Unit tests cover campaign traversal/combat, input, save validation and native boundary helpers. Browser checks cover all chapter beats, responsive controls, held-input transitions, exact worker output, caches and late-load disposal. Production offline checks verify cached fonts/art/worker, input and absence of the debug object. Native checks use the official Electron development shell for fullscreen, movement, jump, story, settings, links and quit. Windows archives are inspected without executing an unsigned packaged binary. Physical Android/controller testing, human listening and difficulty/art acceptance remain pending; no iOS binary is supplied.
