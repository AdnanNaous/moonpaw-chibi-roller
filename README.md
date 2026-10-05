# MOONPAW: Ashen Vow

**Ten stolen names. One way to break the bell.**

A dark 2D pixel platformer by **Adnan Naous**. Guide Noir through the sealed city, recover the witnesses' names, and confront Regent Ilyan. Running, variable-height jumping, wall jumping, rolling and timed strikes share a finite stamina bar. Layered painted scenery, torch pools, fog and particles create depth with planar gameplay.

Version **0.2.1** sharpens the pixel art with integer scaling and an original animated bitmap pilgrim, adds visible fullscreen controls, and raises the quiet audio mix. The ten themes and campaign stay intact. Physical phone/controller testing and human difficulty tuning remain necessary; automated completion proves the routes are possible, not that their challenge is ideal.

![Ten thresholds](docs/screenshots/ten-thresholds.png)

## Play

Download the Windows ZIP or Android test APK from [Releases](https://github.com/AdnanNaous/moonpaw-chibi-roller/releases). Extract the whole Windows ZIP and run MOONPAW Ashen Vow.exe inside its folder. The package includes its runtime and assets. This v0.2.1 unsigned executable was blocked by Windows Application Control on the development PC; the Electron development shell passed the application checks. No protection settings were changed. Android is a debug-signed test build. Previous releases stay available separately.

Use **Fullscreen** on the title screen, the **⛶** button during play, or **F11** on desktop. Press the same button/key to return to a window. Fullscreen buttons appear where the browser or application supports it. Sound starts on the first interaction; the default volume is 70%, adjustable in Settings. Existing custom volume and mute choices are preserved; the previous 32% default migrates to 70%.

The web build is installable and works offline after its first complete load. Capacitor Android and iOS projects are supplied; Android uses SDK 36/JDK 21, and iOS requires macOS/Xcode. No iOS binary has been built here.

| Action | Keyboard / mouse | Standard controller | Touch |
| --- | --- | --- | --- |
| Move | A/D or arrows | Left stick / D-pad | Floating horizontal pad |
| Jump | Space, W, up, Z / left mouse | A | Jump |
| Roll / air dash | Shift, X / right mouse | B or X | Roll |
| Strike | J | RT or Y | Strike |
| Pause | Escape / P | Start | HUD pause |

Touch controls occupy their own strip below the world. Move and jump can be held together. Hold jump for height; release for a short hop. Landing restores the air dash, while stamina limits repeated rolls and strikes. Bells establish respawn points. Recover **both seals** to unlock each exit. The Regent must also be defeated in the last chapter.

Progress and journal entries stay on the device. The redesigned campaign uses a separate save slot, preserving the previous prototype's stored data.

## The ten thresholds

1. **Sentence of Stone** — execution gates telegraph their fall.
2. **Mouth of Iron** — conveyors, hammers and foundry machinery.
3. **Drowned Procession** — black tides with rise and drain windows.
4. **Palimpsest** — bridges fade in a repeating sequence.
5. **The Bell Spine** — raised towers and reversing gusts.
6. **The Hungry Orchard** — stalkers can be staggered with a strike.
7. **Arrow Vigil** — high and low volleys warn with aim lines.
8. **Choir of Knives** — rotating blades demand timed crossings.
9. **Unlit Below** — darkness and disappearing paths.
10. **Regent at the Door** — combined hazards and a recovery-window boss fight.

Read discovered testimony in the journal. Ten hidden memories unlock the third of three endings. There are also title and keyboard Easter eggs.

## Develop

Node.js 22.12+ and pnpm 11 are required. Versions are locked.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm test:browser
pnpm build
pnpm desktop
pnpm desktop:release
pnpm mobile:sync
pnpm android
pnpm ios
```

Builds go to `dist/` and `release/`. To reproduce the Windows ZIP, run `pnpm desktop:pack`, then `python scripts/package_windows.py`. `scripts/compose_audio.py` regenerates ten original 40-second sound beds and thirteen short effects with Python/NumPy. WAV files are bundled; there are no runtime remote assets. Sound levels, concurrent voices and repeated cues are capped. Footstep beeps have been removed.

- `src/core.ts`, `src/levels.ts`: fixed-step simulation and authored campaign
- `src/input.ts`, `src/touch.ts`: keyboard, mouse, controller and multi-touch
- `src/renderer.ts`, `src/pixel-art.ts`: Canvas 2D scenery, bitmap character and effects
- `src/story.ts`, `src/main.ts`: narrative, journal, endings and UI
- `src/audio.ts`, `public/audio/`: original synthesized soundtrack/effects
- `electron/`, `android/`, `ios/`: application shells
- `tests/`, `docs/`: traversal, input, application checks and design notes

## Credits & links

Created and directed by **Adnan Naous**. Artwork, story, synthesized soundscapes and engineering developed with Codex. Prototype explored with Grok. Yudho's dirty-pixel approach and Souls atmosphere informed the direction; no artwork or audio was copied from those references.

[Portfolio](https://adnannaous.vercel.app) · [GitHub](https://github.com/AdnanNaous) · [X @vc_351](https://x.com/vc_351) · [LinkedIn](https://www.linkedin.com/in/adnan-naous/) · [All links](https://linktr.ee/VC351)

Original game content is copyright reserved; the repository does not grant an open-source license to it. Dependencies retain their own licenses.
