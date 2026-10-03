# Release verification

Verified for v0.1.0 on 2026-10-03:

- 16 unit tests passed, including actual movement and collisions across all ten maps.
- Two Playwright browser tests passed: all three ending screens and mobile landscape/portrait controls.
- The packaged Windows executable passed keyboard movement, jump, quick-tap pause, story and credit-link checks with no page errors. See `app-smoke.json`.
- Offline web reload and soundtrack fetch passed with networking disabled; 27 resources were cached.
- The portable Windows launcher opened a native MOONPAW window successfully.

The main-route traversal test does not teleport. The ending UI tests use fixture saves and place the player at the final door to test narrative branches separately from traversal.

The source/build checks are reproducible with `pnpm test` and `pnpm build`. Functional checks cover physics, input edges, saves, checkpoints, secret persistence and ending progression. A traversal controller checks the main route of each authored stage without teleporting.

Browser inspection covers title, story progression/skip, actual keyboard movement, pause/resume, chapter selector, credits and links, sound assets, desktop and mobile layouts. Measured frame rates are environment-specific, not a guarantee for every device.

The Windows executable must load its packaged assets from `moonpaw://game/`, render the menu, start a chapter, play audio and return to title. Physical controller and Android/iOS hardware testing are pending. Android/iOS source projects are supplied; signing/store submission is a separate release step.

Secrets: one memory per chapter; the title paw hides a note after seven clicks, and typing 351 reveals Room 351. Normal ending choices are available at chapter 10. The true ending requires all ten unique memories.
