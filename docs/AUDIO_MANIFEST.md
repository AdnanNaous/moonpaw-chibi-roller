# Music and sound production

The game now plays an original composed instrumental score over its environment sound, with a separate encounter stem. The arrangement has written note events, a recurring chromatic five-note motif, harmonic changes, a question/answer phrase, and a developed final section. It is rendered with sampled instruments, rather than a single generated sine-wave drone. This is a programmatically arranged score using a General MIDI sound bank; it is **not a live orchestral recording**. No melody or recording from the referenced commercial games is included.

| Arrangement | Tempo | Length | Instruments and placement |
| --- | --- | --- | --- |
| Salt Beneath the Glass | 76 BPM | 75.789 s | Cello, low clarinet, soft piano, strings, pizzicato bass and timpani; chapters 1, 3, 4 |
| The Iron Orchard | 96 BPM | 60.000 s | Cello, marimba/vibraphone, strings, rhythmic pizzicato and low percussion; chapters 2, 5, 7 |
| No Name for the Night | 108 BPM | 53.333 s | Viola, bassoon, low horn colour, strings and mechanical percussion; chapters 6, 8, 9, 10 |

Each arrangement contains 24 bars. Its encounter stem has exactly the same sample length and starts on the same Web Audio clock, so drums and short low strings can enter without restarting the melody. Ten existing chapter environments remain at a much lower gain beneath the score. There are three full score arrangements, not ten independent full scores.

The source note events and instrument assignments are embedded in [compose_audio.py](../scripts/compose_audio.py). The renderer produces three complete passes and retains the middle one, preserving the previous phrase's sample release and reverb. An 8 ms boundary correction removes the electrical sample discontinuity. This does not establish that every musical transition will sound seamless to a listener.

## Offline assets and controls

Six score/stem WAVs are stereo, 24,000 Hz, 16-bit PCM. Ten environments and seventeen effects are mono, 22,050 Hz, 16-bit PCM. All are bundled locally and use no network service while playing. The complete audio folder is approximately 54.7 MB.

The director has independent master, music, and effects volume controls. Encounter intensity fades the aligned percussion stem up and down rather than changing the volume of all sounds. A decoded-buffer cache retains the current score pair and current environment, avoiding accumulation of every resampled chapter in mobile memory. Cue cooldowns, a four-voice effect limit, and a final dynamics compressor remain.

New cues distinguish a blade swish from its impact, a bright metal parry, a grounded enemy defeat, and healing. Event aliases cover `guard`, `hurt`, `encounter`, `enemy_attack`, `boss_attack`, `arena_cleared`, and `boon`, alongside the existing events. The Foley is synthesized sound design, not a field recording library.

## Source, license, and reproduction

Instrument recordings come from **GeneralUser GS 2.0.3 by S. Christian Collins**, downloaded from [the author's repository](https://github.com/mrbumpy409/GeneralUser-GS). Its [license](https://github.com/mrbumpy409/GeneralUser-GS/blob/main/documentation/LICENSE.txt) permits private and commercial music creation. The unmodified license is bundled at [GeneralUser-GS-LICENSE.txt](../public/audio/GeneralUser-GS-LICENSE.txt). This is a custom license, not CC0. The author's license also explains the historical uncertainty of the origins of some contained samples; that notice is retained.

The offline renderer is [SpessaSynth Core](https://github.com/spessasus/spessasynth_core) 4.3.22, Apache-2.0, with stb-vorbis 0.0.6. These tools and the SoundFont are production dependencies cached under ignored `.audio-tools`; neither is shipped as a runtime dependency. Archive/SoundFont SHA-256 checks are pinned in the composition script. Run `python scripts/compose_audio.py` with NumPy installed and Node available to reproduce the WAVs; the first run downloads those free production dependencies.

A Creative Claw Lyria instrumental generation was attempted but rejected before starting for insufficient account credits. No generated music was returned and no purchase was made. The checked-in music is the sampled-instrument arrangement described above.

## Verification and remaining listening review

[score-manifest.json](../public/audio/score-manifest.json) records tempo, sample length, note count, RMS, and peak for each rendered track. Scores contain 337–465 notes per arrangement; encounter stems contain 416–440 events. All six files are non-silent. Their peak is 0.620 and RMS ranges from 0.0741 to 0.1158. Score/stem sample counts match within each arrangement and the corrected boundary sample jump is zero.

[mix-validation.json](../public/audio/mix-validation.json) records a stereo OfflineAudioContext render at full master/music/effects volume with a fully active encounter stem and four overlapping loud cues at three times. Peak values were 0.8112, 0.8104, and 0.8400 for the three arrangements through the actual compressor settings. This verifies electrical headroom in that tested mix, not every conceivable combination or perceived loudness.

A browser test using the real `AudioDirector` verified the three playing layers, independent volume buses, encounter fade, parry/hit loading, pause/resume, decoded-buffer eviction, equal stem lengths, and closing its audio context. The audio was not auditioned by a human on speakers, headphones, a physical phone, or a controller setup during this automated work. Musical quality and fatigue still need that listening review.

## v0.4 interaction and contact sound

The existing three arrangements remain. Title playback is armed without creating an AudioContext; the first user interaction starts the current chapter arrangement with a slow fade and a low-pass treatment. Pause reduces the music bus to 60 percent of its selected level, then restores it on resume. This is a different presentation of the score, not an additional recorded title track.

`src/audio-foley.ts` renders small original stone, iron, wood, water, landing, cloth and UI textures once per audio context. Foot contacts follow traveled distance rather than frame timing. Variations are deterministic; a six-voice cap and ended-source cleanup bound simultaneous Foley. Existing cues keep their four-voice limit and gain controls, with slight attack/jump/dash variation. Both sets pass through the master compressor. All these sounds are synthesized; no field recordings are claimed.

Additional runtime checks verified deferred title playback, title filtering, finite Foley samples, the six-voice cap, cleanup, pause gain recovery, mute and context disposal. Perceived quality has not been human-auditioned here.
