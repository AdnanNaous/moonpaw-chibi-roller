# MOONPAW: Ashen Vow 0.3 — playable remake

The earlier game relied on sparse geometry, weak combat and quiet synthesized beds. This remake adds three required fights to each of the ten chapters, pursuing enemies with committed warnings and recovery windows, five health, stamina pressure, protected combat dodges, buffered strikes and three-hit combos. One of three pacts changes the fighting style after the first encounter. The Regent has twelve health and three phases; spikes and machinery still require platforming rather than dodge immunity.

The visual world now uses ten distinct detailed environment regions, cached materials, separate scrolling foreground, pixel actors and restrained lighting. Cross imagery, pointed church facades and religious ornaments were removed. The environment atlas is generated with OpenAI imagegen; characters, playable geometry and effects are code-authored. This is an original game influenced by the requested qualities, not a copy of any referenced game's assets or a claim of studio-level parity.

Settings has Audio, Display and Controls categories, independent music/effects controls, larger touch buttons and reduced decorative motion. Desktop Exit saves unlocks/journal/settings, ends the attempt and closes the app. Android Exit to device returns to the title before minimizing. Fullscreen works from visible controls and F11 on desktop.

Three original sampled-instrument arrangements and aligned encounter stems replace the bare-drone soundtrack. Their production source and custom instrument license are documented in [AUDIO_MANIFEST.md](AUDIO_MANIFEST.md). These are programmatically composed sampled instruments, not live orchestral recordings. Six score/stem files, ten environments and seventeen effects are bundled offline.

Verification:

- 28 unit tests, including actual-input traversal of all ten chapters, every mandatory encounter, seals and final fight.
- Six browser tests covering story/endings, fullscreen, separate settings persistence, pact selection, real CDP simultaneous touch input, and simulated Android/controller boundaries.
- Windows Electron development-shell checks: native fullscreen/F11, keyboard movement/jump, story, settings, Exit cancellation and actual native quit.
- Production offline reload: atlas, large score and environment audio all available in a 47-entry cache.
- Audio playback lifecycle, separate buses, synchronized stems, bounded decoded cache and disposal checked; tested maximum-volume stacked mixes peak below 0.841.
- Actual desktop and emulated mobile views plus all ten chapter fixtures inspected. Desktop fixture measurements were about 58–60 FPS.

Independent read-only Review Agent found two defects: missing atlas precaching and retained Android exit state. Both were fixed and reviewed again with no remaining actionable findings. Added Android/controller checks simulate their native boundaries; they are not physical-device testing.

Windows packaging is unsigned. The previous v0.2.1 package was blocked by Application Control on this PC; development-shell execution works. No protection settings were changed. Physical Android/controller operation, real-device performance, human music audition and difficulty tuning remain unverified.
