# Visual reference review — 14 November 2026

The user's photographs define the requested objects. For this update, the public [Manicka Nadar Fireworks product-video gallery](https://www.manickanadarfireworks.com/fireworks-sivakasi-india-video.html) supplied normal product demonstrations rather than amplified-container or stunt explosions.

The browser playback host was unavailable. Public YouTube pages and their low-resolution storyboard sequences were retrieved and inspected as ordered frame samples. This is **not a full playback/audio audition**. Frame times are approximate; sparse samples cannot measure the duration of a very brief flash, exact physical height, spin rate or loudness. Camera exposure also changes apparent brightness. These observations support the following authored simulation choices, not measured physics or exact brand reproduction.

| Reference | Observed in sampled frames | App treatment |
|---|---|---|
| [Flower Pots Big](https://www.youtube.com/watch?v=JoKEmWgYZvw) | A compact bright base develops into a tall upward column through the middle samples; the last samples fall back to a small glow and then a spent object. | Anar rises gradually in density and velocity, sustains a broad middle, then loses height and emission. Gravity spreads the falling sparks. The envelope follows the app recording's duration rather than copying the footage's shorter duration. |
| [Spinner Big](https://www.youtube.com/watch?v=njrseemrths) | Bright output stays close to the ground in several separate demonstration cycles. Sparse samples do not resolve the coil's exact rotations. | Flat Chakri with a rotating tangential jet, low sparks, continuous acceleration/deceleration and no upright fountain. Its 12-second body is an artistic duration using the documented recording loop. |
| [Bullet Bomb](https://www.youtube.com/watch?v=YCDubx9EGPM) and earlier [Sutli night demonstration](https://www.youtube.com/watch?v=NwFSo6aCLNQ) | The new sound-cracker samples mainly show before/after ground and smoke; the brief flash is easy to miss. The earlier stored Sutli storyboard shows a small ignition point and localized burst. | Fuse → one short flash/spark impulse → spreading smoke/spent fragments. A sustained flame or a visible pressure-wave ring would exaggerate this behavior. Actual flash timing is authored; detonation is synchronized to the bundled recording's transient. |
| [Star Fire comet](https://www.youtube.com/watch?v=wEKkdqw16Lc) | A compact rising light precedes separate coloured sky effects; long dark gaps occur between demonstrations. | Keep launch trail distinct from the one-shot coloured star burst, with gravity and opacity decay. The app uses a deliberately visible virtual height, not a measured real launch altitude. |
| [Electric / Crackling Sparklers](https://www.youtube.com/watch?v=GEe1GuDwiSA) | Localized bright sparks surround the small glowing tip; the plume does not become a large aerial shell. | Short tip sparks, a moving burn front and brief start/end envelope, with spent coating retained. |

Ladi retains its existing sequence of 36 measured cues in the licensed, edited bang recording; this update does not claim a new fully reviewed Ladi video segment. All footage/storyboard files stay in ignored local research/output directories. No third-party video frames, packaging art or video sound was copied into app assets.

## Sound and tuning limits

The retained recordings and licenses are listed in [ASSETS.md](ASSETS.md). Sutli is an isolated generic Diwali bang; Chakri is an edited spinning-bee loop. They are not exact subtype/brand recordings. Sutli's stronger master is checked for clipping, peak headroom and relative short-window transient level in the actual WAVs. Perceived loudness still depends on the phone speaker, system volume and listener distance.

`src/effects.ts` authors smooth intensity envelopes independently of the loudest PCM sample. A single unusually loud crackle late in a fountain recording must not move the fountain's entire power peak to the last seconds. Tests exercise actual native scene props at early/middle/late times, one-shot blast timing, reduced-flash behavior, and the packaged audio data/gain relationship.

## Android particle lifecycle investigation

The pinned bridge requested `resetEmissionCycle()` for every appearance, physics and spawning change. An actual Java setter regression demonstrated that each changing jet direction requested another reset. The upstream [particle JNI implementation](https://github.com/viromedia/virocore/blob/master/ViroRenderer/capi/ParticleEmitter_JNI.cpp) resets with `true`, and [the renderer implementation](https://github.com/viromedia/virocore/blob/master/ViroRenderer/VROParticleEmitter.cpp) clears its live particle arrays in that path. Live modifier setters in the app's existing 2.52.0 bridge replacement now avoid that reset; explicit delay/duration changes still request it. The renderer .so binary is retained.
