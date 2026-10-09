# MOONPAW: Ashen Vow 0.5 — weight, contact and dangerous crossings

Running slows to 5.2 world units per second. Rolls follow an eased horizontal speed and continue falling under gravity. Rising gravity is 30 and falling gravity is 40; a held jump peaks around 2.1 units. Ground braking, air steering, short hops and protected wall kicks remain responsive. Fixed-step position interpolation smooths the player, enemies and moving platforms without changing collisions. The camera follows velocity gradually and stays level through ordinary jumps.

The pilgrim has 31 isolated pixel poses, including sixteen run drawings. Planted shoes sweep backward to nearly cancel the body's advance, then lift into a tucked swing. A 2.7-unit gait cycle and matching contact sounds replace the previous rapid shuffle. Rolled poses retain their measured floor contact and independent packing.

Enemies have pale one-pixel edges, stronger during windup. Torches illuminate platforms after they are painted, tint nearby actors and cast shadows away from supported lamps. Broken caps and fractured stone, timber, iron, root and wet materials replace repeating support bays. Barlow and Barlow Condensed are bundled locally with their SIL Open Font License; menu and story typography sit directly over the darkened world.

Both required seals in every chapter now need a raised route: twenty climbs across moving, fading, crumbling, conveyor and solid ledges. Intermediate shelves split the widest crossings to fit the heavier jump. Existing hazards, thirty sealed encounters, checkpoints, pacts, story, endings, memories and creator links remain. The Regent's later high cleave catches habitual jumps; its low shockwave rewards jumping. Distinct text and attack-zone tells distinguish the two. Boss health, damage, windups, recovery and stamina costs are unchanged.

Verified on 2026-10-09:

- 52 unit checks, including ten complete spawn-to-ending journeys using real inputs, twenty local seal climbs, weighted movement and both boss counterpatterns.
- Seven browser checks: fullscreen, story/endings, settings, pacts, simultaneous touch, simulated native/controller boundaries and render interpolation/pause/respawn behavior.
- Desktop and emulated mobile views at 1440×900, 844×390 and 390×844: no page errors or horizontal overflow, around 60 FPS on this PC. Ten chapter art fixtures measured 54–60 FPS while switching scenes.
- Native Electron development-shell movement, jump, story, fullscreen/F11, credits, settings, Exit cancellation and actual native quit.
- Production offline reload and keyboard movement, with 54 cached resources including six font files and the font license.
- Sprite packing/contact, finite contact sounds, voice cap/cleanup, title gesture/filter, pause recovery, mute and disposal.
- Independent review caught sliding feet and misaligned/phantom-lamp shadows; corrected and re-reviewed with no remaining actionable findings.
- Windows archive CRC and current ASAR assets, fonts, license, version and preload verified before publication.

The three existing sampled-instrument scores remain. Physical phone/controller performance, human listening and difficulty evaluation are still required. The Windows archive is unsigned; development-shell checks do not establish packaged execution on every PC. Android builds are debug APKs. iOS source remains without an iOS binary.
