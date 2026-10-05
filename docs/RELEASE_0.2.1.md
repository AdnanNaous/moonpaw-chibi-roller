# MOONPAW: Ashen Vow 0.2.1

The previous image used fine vector details and fractional enlargement, so the character and scenery did not read clearly as pixel art. The renderer now uses a coarser grid, integer nearest-neighbor scaling and an original eleven-frame bitmap pilgrim. Less grain keeps the shapes visible. The camera also keeps the floor in view while jumping. The ten themes, gameplay and story remain intact.

Fullscreen has a visible title/settings button and a HUD control. F11 uses the same desktop bridge. Native window state changes update the label without rebuilding the game. The bridge exposes only fullscreen operations and retains renderer sandboxing.

Audio was too quiet because the master and chapter gains multiplied to 0.1344. The new default reaches 0.77, about 15.16 dB louder before compression. Effects are raised too, with the existing voice limits and compressor. Custom volume and mute settings are preserved; the old default migrates to 70%.

Verified locally:

- 19 unit tests, including settings migration and the existing ten-chapter traversal.
- Three browser tests: fullscreen state, integer scaling, story/endings and real CDP simultaneous touch input.
- Windows Electron development-shell check: fullscreen button/F11, story, keyboard movement, jump, pause and credits; no page errors.
- Offline production reload: 31 cached files including playable sound.
- Maximum-volume stacked audio test peak 0.7633, below clipping.
- Desktop and mobile screenshots plus all ten theme fixtures reviewed; mobile checks use browser emulation.

Windows packaging succeeds, but Application Control blocked the newly packaged unsigned executable on this PC. The development shell runs. No security policy was changed. Android is a debug-signed test APK. Physical phone/controller testing, device listening and difficulty tuning remain unverified.
