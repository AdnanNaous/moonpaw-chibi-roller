# Noir: feral pilgrim

The previous character used a small procedural humanoid mask and rigid limbs. It was readable but did not belong beside the detailed environment paintings. The replacement is a quadrupedal cat with articulated hocks, a narrow muzzle, expressive tail, torn mantle, pale scars and a broken circular collar charm. There are no crosses or borrowed game characters.

The transparent source `public/art/pilgrim-v6.png` contains the 32 character drawings used by the game. The original PNG is preserved unchanged. Its 32 disconnected drawings are isolated by their alpha components at startup, then packed into 192×160 animation cells with a shared floor pivot. This avoids cutting off long tails or importing neighboring drawings from the uneven source grid. It is packed once, not during gameplay. A missing or invalid sheet uses the bundled procedural fallback.

Two idle drawings, sixteen stride drawings, rising/falling jumps, four rolls, three strikes, landing, hurt, death and wall poses replace the previous normal character. The additional idle drawing is retained in the atlas. Gait timing follows distance traveled; physics and interpolation remain unchanged. Three claw traces accompany strikes. Torch tint, contact shadows, pixel sampling and dash trails use the new atlas.

## Production study

- [Team Cherry's Hollow Knight production case study](https://unity.com/made-with-unity/hollow-knight): traditional sprite animation, simple layered lighting and a deliberate drawing workflow. Applied here as distinct poses, planar artwork and restrained local effects.
- [Jen Zee's firsthand Hades art interview](https://mcvuk.com/business-news/behind-the-art-of-hades-we-value-artistic-integrity-and-excellence-in-artistic-craft-at-supergiant-however-were-first-and-foremost-a-game-design-lead-team/): gameplay and narrative guide the art, including UI and effects. Applied here by removing the marketing-style numbered menu and matching the pilgrim's material language to the city.
- [Yudho's own portfolio](https://yudho.xyz/): texture and negative space support recognizable forms. Applied here as ragged silhouette, muted cloth and bone, with a small eye accent.
- [Official Silksong screenshots](https://hollowknightsilksong.com/): inspected for foreground/background separation and clear character silhouettes. No reference artwork was copied or bundled.

These sources informed decisions; they do not establish equivalent craftsmanship. The new art was inspected in the actual renderer. Automated checks establish asset isolation, menu access and runtime behavior; human assessment of animation and visual quality remains necessary.
