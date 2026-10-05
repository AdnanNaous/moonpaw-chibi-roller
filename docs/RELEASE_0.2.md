# v0.2.0 verification — 2026-10-05

- 18 gameplay/input unit tests passed, including all-ten-chapter traversal from spawn using update inputs, seal collection and the Regent fight. The traversal controller reads exact world timing; this is a reachability check, not a human difficulty assessment.
- Two browser tests passed: narrative, paused journal/settings, credits and three ending UI fixtures; real CDP multi-touch movement/jump/release/cancel at 844×390 plus portrait layout at 390×844. Touch controls do not overlap the canvas. Device emulation is not physical phone testing.
- Packaged Windows app passed custom protocol loading, story, keyboard movement, jump, pause and creator links with no page errors. See app-smoke.json.
- Production web build reloaded offline with 31 cached files and fetched its bundled chapter audio while offline.
- Actual rendered views of all ten chapter themes were inspected in ten-thresholds.png. These use visual fixtures; gameplay traversal is separately tested.
- Original audio measured for peak/RMS and loop boundaries. Listening and comfort on target hardware remain to be reviewed.
- Local Windows portable build completed. Android/iOS assets synchronized. Android binary compilation is performed by GitHub Actions; iOS requires macOS/Xcode.

No physical phone or hardware gamepad performance claim is made. No universal FPS claim is made from desktop screenshots.
