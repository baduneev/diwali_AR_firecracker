# Diwali AR — Android and iPhone source

## Easier placement on incomplete scans (0.2.12)

Aim down and tap the camera view; you no longer have to wait for a complete plane highlight. A tap queries native AR hit testing once, preferring measured horizontal planes, then horizontal estimates. Previously observed horizontal patches remain usable. Walls, ceilings, upward rays, invalid positions and targets beyond five metres are rejected.

**Assisted placement is on by default** in Options. If no horizontal geometry is available, a feature/depth hit can supply an estimated level surface. With no usable hit at all, placement projects the tapped ray onto a horizontal surface initially 1.2 m below the phone. This last fallback is an assumed height, not surface detection. Options can change that distance before placement; after an estimated placement, Raise/Lower object adjusts it in 5 cm steps before ignition. Estimated placements are labelled on screen. Turn assistance off to require horizontal hit/observed-plane geometry.

Native hit queries have a 450 ms deadline before assisted fallback. No continuous hit-test stream or extra per-frame camera callback is enabled. Clear, selection, tracking loss, newer taps and navigator teardown invalidate pending requests. Existing independent point anchoring and burn behavior are retained.

The camera must still achieve AR tracking: pure darkness, glare, blur and surfaces without usable visual features can prevent that. Brightening the displayed camera image does not add tracking information. This is not ARCore Instant Placement and does not bypass ARCore/ARKit tracking. See [Google's environment guidance](https://developers.google.com/ar/design/environment/definition) and [Viro hit-test API](https://viro-community.readme.io/docs/viroarscene). No phone was connected for the 0.2.12 build; low-light success and drift require physical verification.

## Camera-first controls and burn progression (0.2.11)

The app header is removed. The lower tray contains a short status, a scrolling firecracker selector and Clear / Light / Options, with 48 dp minimum buttons. Sound, dimming, size, reduced flashes, Studio view controls, modes, diagnostics and credits are in Options. Studio gestures and sky-tap projection use the expanded viewport. The operating system status bar remains. A physical 1080 x 2400 capture of this layout reserves approximately 74-76% of the screen above the controls.

Anar builds a predominantly golden fountain, reaches a taller/denser middle, then loses height and emission. Chakri stays flat, accelerates a dense tangential jet and bright flame core, then slows and fades over its 12-second body. Phuljhadi gets a short attack and end taper. Native audio clocks drive each burn; continuous audio gain follows the same power envelope. Ground sparks expire before their conservative ballistic trajectory crosses the surface. Default models are now 1.25 times the original generated dimensions, a modest visual increase; Options calls this natural size rather than claiming exact physical measurements.

Sky burst tap uses four preloaded audio players and independent projectile clocks/targets. Tap again while an earlier shot is flying; up to four can overlap. A completed slot is reused. Direct taps skip the ground-fuse prefix and start with a 1.2-second launch lead-in; visual and audio clocks use the same absolute source offset. Each has a fixed particle budget, totalling at most 1,072 spark/smoke slots for four shots. Mixer gains account for overlapping voices. Clear, kind/mode changes, backgrounding and loss of tracking cancel the active/pending launches; late native seeks cannot resurrect them. Sky taps need camera tracking but no detected floor.

Sutli's fuse lasts to the recorded bang (1.0835 s), followed by a short localized flash, one spark impulse, spreading smoke and spent fragments. Reduce flashes suppresses the flash sphere and dynamic light. The bang uses the original recording's reinforced 70-400 Hz content and soft transient compression, normalized to 0.96 full scale. Its app gain is strongest, with clipping/headroom and relative transient tests. It remains a generic licensed Diwali bang, not a verified Sutli brand recording. Device volume is not changed.

Android's pinned Viro bridge previously requested a destructive native particle reset for each modifier change, clearing Chakri's in-flight sparks as its jet rotated. Live power, physics and appearance setters now retain existing particles; duration/delay changes still request a fresh cycle. Burst phases/pop cues use fresh keyed emitters. A regression executes the actual Java setters against SDK type boundaries and was observed failing before this repair. The existing colour normalization, AR event backpressure and native renderer binaries are preserved. iOS native modifier lifecycle is not verified; iOS JS/resource export is separate from native build/signing/testing.

A physical AR-to-Studio test also exposed a renderer-startup native crash. Mode changes now first remove the active navigator and allow a separate 500 ms retirement interval before creating the next native GL view. Fast intervening AR-support checks cannot bypass that interval, and cancelled transitions cannot reopen an obsolete view. Initial cold startup does not add this delay. React lifecycle regressions verify the disposal/creation order; physical verification is recorded in VERIFICATION.md.

See [effect reference notes](EFFECT_REFERENCES.md) for supplier video links, sampled-frame observations and limits. Reference-video imagery/audio is not bundled.

## What changed

- 94 original OBJ mesh parts at real-world meter scale, with paper, rope, metal, normal-map and charred materials. The objects are actual 3D geometry rather than camera-facing illustrations.
- Horizontal plane placement. Tap a highlighted detected surface; its world position is used for the model. The model and cached highlights render independently of the native plane node, so a plane being retired does not automatically hide them. On Android, Viro automatically attempts a native point anchor for each direct scene-root node. Plane retirement does not establish that this separate anchor failed. Actual anchor success and camera relocalization drift still require a phone check; no anchors persist across app launches.
- Flat spiral chakri, 36 separate grounded ladi tubes, horizontal coated sparkler, standing cone and launch tube, and wrapped sutli shell.
- Progressive charring, sparkler coating consumption, sequential ladi consumption at recorded pop times, spent remnants, shell collapse, and debris after the sutli bang.
- Native particles with gravity, drift, smoke, local warm light and contact shading. Studio also uses shadow maps. The reduced-flashes setting removes the local flickering light and lowers the particle cap.
- Audio-driven visual timing, using the native recording player's current playback position. Recordings are bundled; mute retains the playback clock. Approximate distance attenuation is applied, rather than claimed binaural spatial audio.
- Tracking loss or audio interruption stops ignition/playback. Backgrounding clears placement so an old anchor is not silently reused in a new AR session.
- Explicit 3D studio mode for phones without AR support. This shows a virtual floor; it is not a camera overlay or world-tracked AR.

## Android particle colours (0.2.8)

Physical testing exposed a Viro 2.52.0 Android bridge defect: both initial and interpolated colour channels were passed as 0?255 floats to a renderer that expects 0?1. This made particles white even when their textures were coloured. The Android prebuild plugin now replaces only that emitter bridge class family and normalizes both paths. View managers, native renderer libraries and anchor code remain unchanged. The upstream MIT notice is retained in `plugins/native/VRTParticleEmitter.java`; `NormalizedParticleColor.java` has a native regression test. iOS keeps its existing native bridge.

The default remains **Real size**, Chakri has **12 seconds of spin**, Anar and both aerial effects have **gold, red, green and blue sparks**, and **Sky burst ? tap** launches without a floor plane once camera tracking is ready. Dim is on by default during combustion; it darkens the displayed surroundings while leaving the tracking input unchanged.

## Size, longer Chakri and colourful effects (0.2.7)

The connected-device review of 0.2.6 found Large too big, so the app now starts at **Real size (1?)**. The cone is approximately 15 cm high and the other six model sets retain their authored metre dimensions. Size remains selectable before ignition. The Anar fountain is wider, with a smaller gold flame core and separate gold/red/green/blue spark streams. Both sky fireworks use those four colours. The streams share one particle budget rather than multiplying it.

Chakri now burns for **12 seconds**, plus the original one-second ignition and a quarter-second silent tail (13.25 seconds total). The real spinning-bee sound is repeated with 40 ms crossfades and unchanged pitch, then faded out. This is an edited loop, not a newly sourced long chakri recording. `tools/build_effects.py` generates the coloured sprites and extended audio offline using the original Kotlin chakri WAV as input; that original recording is unchanged. The manifest and in-app credits document the edit.

The background dimmer is limited to the local room around the session origin and uses explicit node opacity. Good physical lighting is still required for tracking. Camera-background dimming is not an exposure adjustment and does not darken the tracker input.

## Larger effects and sky taps (0.2.6 history)

- Models start at **Large (2.5?)** presentation size. **Size** cycles through real dimensions, large and extra large (4?); it scales geometry around the existing ground contact point. Change size before ignition. The six underlying meshes retain their authored metre dimensions.
- **Dim: on** darkens the displayed camera surroundings during ignition/combustion, then restores them when playback ends, is interrupted or cleared. A low-poly, inward-facing distant shell renders behind the virtual effects. It does not modify camera exposure or the image ARCore/ARKit uses for tracking. Physical lighting and visual features are still needed for tracking. Dim can be switched off during playback.
- Anar has a denser, taller golden shower and a bright flame core. Sky shot has a larger, longer-lived golden burst, a visible rising trail and a prompt to tilt above its tube. Reduced flashes removes the flame core and dynamic flickering light and limits every emitter to at most 100 particles.
- **Sky burst ? tap** is a separate aerial firework. With camera tracking ready, aim at the sky and tap the camera area between the header and tray. It launches automatically without a detected horizontal plane. The native camera projection converts the tapped point into a world ray; the burst is eight metres down that ray. Keep some textured surroundings in view so the tracker can keep its pose. A new shot is available after playback ends. This variant reuses the licensed sky-shot recording; it is not a new recording.
- Studio supports the new aerial effect through a short tap, with a farther starting view. Studio uses touch controls rather than physical tracking; dimming applies only to the real AR camera background.

### Connected-device findings, 13 November 2026

The attached test device identifies as **OnePlus IV2201, Android 13**, with ARCore 1.57.262640293. The user successfully placed objects in both the official Google hello_ar_java comparison and Diwali AR 0.2.5, reporting slightly less drift in Diwali. This does not establish drift-free tracking. Google's second run first reported a plane at about 15 seconds; there is no required scan timer. Camera/IMU clock-offset warnings appeared in both apps and do not by themselves establish the cause of drift. A short SurfaceFlinger sample measured about 29.9 FPS while scanning Diwali; combustion performance needs a separate sample.

## Native event backpressure and independent placement (0.2.5)

This repair changes the native Android bridge as well as the app. The 0.2.4 JavaScript throttle still allowed every native plane polygon to be serialized and sent into JavaScript. The Android scene bridge now keeps only the latest plane snapshot per 100 ms interval, bounds the pending queue to eight planes, and omits polygon vertices that this app never uses. Found/removed events remain immediate. Removal cancels pending updates for that plane, and scene teardown cancels queued work. Ambient-light delivery is limited to one latest sample per 200 ms. This reduces event/serialization work; it is not a measured Realme frame-rate result.

Correction to the earlier anchoring analysis: the pinned Android SDK's `VRTNode` automatically attempts a point anchor for direct children of an AR scene. The app was incorrectly using the lifetime of the detection plane to decide whether the separately anchored model could ignite or continue burning. Retiring that plane now updates discovery metadata without disabling ignition or interrupting combustion. Camera tracking loss and audio interruption still block/stop playback.

The last observed horizontal patches remain usable for the current AR session while camera tracking is normal, rather than disappearing after three seconds. Cached patches are slightly faded and limited to eight total surfaces. They are cleared with a new AR session/background cycle. A tap is accepted from the native renderer's hit on the visible quad; it is no longer rejected by rechecking an outdated plane pose after native anchor correction. Finite hit coordinates, current session/run, camera tracking and a still-cached surface remain required. Cached patches assume the physical surface has not moved; restart AR after rearranging the room.

Install **0.2.5** over Diwali AR. **About & modes ? Tracking info** shows the native tracking state/reason, live/cached surface counts, plane event counts received by JavaScript and maximum JS scheduling delay. **Share diagnostics** opens the system share sheet; nothing is uploaded automatically. Scheduling delay is not camera/GPU FPS and includes time spent backgrounded. Studio is explicitly marked as simulated tracking.

The native Android replacement is `plugins/native/VRTARScene.java`, derived from Viro 2.52.0 under its included MIT notice. `withArBackpressure.js` removes only that class family from the bridge AAR and compiles the replacement into the app; it fails for another Viro version until reviewed. Native renderer libraries, SDK point-anchor code and view managers are preserved. iOS uses the shared placement fix but retains its original native event bridge.

Physical Realme P4 Pro / Android 16 verification is still unavailable. The test suite now exercises the actual Java bridge against deterministic Android/RN/Viro boundary types, in addition to the React callback regressions. Neither suite simulates real-world visual tracking or measures native GPU frame time.

## Surface recovery and lighter AR rendering (0.2.4)

Detected surfaces no longer disappear immediately when the native tracker removes a plane. A faded, noninteractive highlight remains at its last known pose for three seconds while the app waits for recovery. Observed bounds do not shrink during early refinement. Up to eight surface previews are retained, and plane/light changes are coalesced into 100 ms updates instead of redrawing for every native callback. Scanning no longer subscribes to per-frame camera transforms.

In 0.2.4, a placed model remained at its last valid world position even after its preview expired. If a replacement plane covers that point, the placement is associated with it. A replacement already present when the old plane is removed preserves an ongoing burn. When no replacement exists, ignition is disabled and an active burn stops; the model remains visible. This avoids silent disappearance, but does not claim persistent native point anchors or eliminate drift during camera relocalization.

AR now uses textured Lambert materials and disables HDR, PBR, bloom, shadow maps and multisampling. Contact shading and bounded particles remain. Studio keeps its previous rendering settings. These changes reduce rendering work; native GPU performance and physical tracking on the Realme P4 Pro have not been measured because the phone is not connected.

Install **0.2.4** as an update, then test a floor and tabletop while moving slowly around the placed object. In **About & modes ? Tracking info**, you can read the version, camera-tracking state, live/recovering surface counts and placement availability. These are app diagnostics, not FPS measurements. Report these values if a surface still disappears or placement stalls.

## Easier horizontal surface placement and less model work (0.2.3)

Scan a floor, tabletop, shelf, bench, or other upward horizontal surface. Placement trusts ARKit/ARCore's horizontal classification instead of applying another angle filter. A newly discovered plane can be used before its measured bounds finish growing: zero extents show a small 12 cm target. Taps allow 15 cm of pose/bounds uncertainty and are checked against the highlighted surface that was displayed when tapped, so a concurrent plane update does not silently reject a valid tap. Walls, ceilings, missing anchors, invalid coordinates, and lost tracking remain excluded.

Repeated identical plane updates are ignored, and scene/plane callbacks no longer feed duplicate updates into app state. The selected object's rendering and individual mesh parts are cached until their actual appearance changes. In a React callback replay of 60 plane refinements plus 20 UI refreshes, unchanged mesh component renders fell from 640 to zero; material changes, burn-down, particles, and model switching still update. This is a component-work measurement, not a physical-phone frame-rate result.

Real AR still depends on the phone's tracker finding a surface; the app cannot guarantee tracking on an entirely blank/glossy surface or unsupported hardware. Scan in good light while moving slowly. Physical-phone surface detection and placement latency remain unverified here.

The current user test target is a Realme P4 Pro 5G on Android 16. Google lists that model on its [ARCore supported-device list](https://developers.google.com/ar/devices). The phone has not been connected to this workspace for physical verification. Install the latest 0.2.5 APK as an update to Diwali AR, then test floors and tabletops in AR mode.

## AR floor detection and placement (0.2.2)

AR now listens to scene-level plane discovery and highlights every detected upward horizontal surface, including early small surfaces. The former single automatic plane required both extents to reach 40 cm and could bind to a different surface from the one the user intended to tap. Detection feedback now distinguishes camera tracking, scanning without a surface, and the number of available horizontal surfaces.

Tap a highlighted area to place. Placement converts the native world hit using all three rotation angles and scale, rather than yaw alone. In 0.2.2?0.2.3 the selected native plane ID was retained and local placement recalculated as its pose was refined. Version 0.2.4 instead retains the selected world point independently of native plane visibility, as described above. Removing another plane does not clear the selected object or falsely disable camera tracking. Tracking loss blocks new placement and ignition; Clear restores the available surface highlights.

Check AR in good light over a textured floor, moving the phone slowly sideways while aiming down. Plain glossy tiles, darkness, and rapid movement can prevent native surface tracking. Use an ARCore-supported Android device or an ARKit-capable iPhone. Studio mode remains available on unsupported phones. The 0.2.2 automated callback and transform regressions pass, but physical Android/iPhone floor detection still requires a device check; no device was connected during this repair.

## Studio camera controls (0.2.1)

On Poco M5, open **Diwali AR → Open 3D studio**. Tap the floor once to place the selected firecracker. Drag left/right to orbit all the way around it, drag up/down to change viewing elevation, and spread/pinch two fingers to zoom in/out. These gestures work before ignition, while burning, and on spent remnants. They move the camera while the firecracker stays on the floor. Studio movement is controlled by touch rather than walking with the phone.

The scrollable camera-control row also provides **Reset view**, **Zoom in/out**, **View left/right**, and **View higher/lower** buttons. Clear removes the firecracker without resetting your viewpoint. Reset view restores the starting viewpoint without interrupting combustion. Dragging, pinching and long presses do not place or relight firecrackers.

## Run and build

Requires Node >=20.19.4 (Node 22 recommended), JDK 17 for Android, and the Android SDK. Dependencies are pinned by package-lock.json. Do not use Expo Go: Viro requires a compiled native app.

```powershell
npm ci
npm test
npm run typecheck
python -m unittest discover -s tests -p "test_*.py" -v
npx expo prebuild --platform android
npm run android
```

For the optional Python checks or mesh regeneration, install `tools/requirements-dev.txt`. The native studio flow check expects the installed APK and the task's 720 × 1600 Android emulator: `python tools/qa_android.py`. It tests studio mode, not real-world tracking. `tools/qa_studio_camera.py` checks rendered viewpoint changes with real touchscreen drags, camera buttons, reset and a two-pointer pinch. Its pinch helper `tools/StudioPinch.java` is an emulator-only adb-shell tool; compile it against Android's platform jar, convert with D8, and push the dex to `/data/local/tmp/diwali-camera-gesture.dex` before the check. This helper is not included in the app.

For a standalone Android APK with the JS bundle included:

```powershell
cd android
.\gradlew.bat :app:assembleRelease
```

The local release configuration uses a debug signing key for personal testing, not a production distribution key. Android is restricted to ARM64 because the renderer's Android binaries do not include x86_64. A packaging regression test checks every advertised ABI for the renderer library. Avoid overriding that architecture restriction.

The config plugin in plugins/withNativeCorrections.js fixes Viro 2.52's legacy AGP version rewrite, keeps ARCore optional for the explicit studio mode, restricts the ABI, and removes unused iOS microphone/photo descriptions. The generated Android project has New Architecture enabled; the Viro prebuild warning about it is misleading and the resulting property was inspected.

Android also uses extracted native libraries to support ARM translation in the test emulator. `plugins/withEglFallback.js` replaces two Viro Java EGL surface factories with equivalents that retry using the default display colorspace if the preferred sRGB surface fails. It removes only those two original classes from the dependency archive during Android prebuild and supplies the replacement sources; the native renderer binaries are preserved. This corrected the reproducible black-viewport failure. Source and recording license notices are bundled and accessible in About → Credits & licenses.

## iPhone X from this Windows PC

The app targets iOS 15.1 and later, which includes iPhone X on iOS 16. Its native AR framework is ARKit; no LiDAR hardware is required. Actual iPhone X rendering, tracking stability and performance have not been verified here.

An APK cannot run on an iPhone. React Native shares source; it does not remove Apple's iOS compilation and signing requirements. A cloud Mac can build the iPhone version through Expo EAS. For a physical-device cloud build, you need your own Expo account, Apple Developer Program membership, and device registration. No iPhone build has been submitted or signed in this workspace.

From this directory, after signing in locally:

```powershell
npx eas-cli login
npx eas-cli build:configure
npx eas-cli device:create
npx eas-cli build --platform ios --profile preview
```

Follow the device-registration link on the iPhone X, include that device when EAS prepares the provisioning profile, and open the completed build's install link on that iPhone. EAS will ask for Apple signing authorization interactively. Do not put account passwords or signing secrets in project files. Follow any Developer Mode prompt that the chosen distribution method requires.

References: [Expo physical-device cloud builds](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/), [ARKit world tracking](https://developer.apple.com/documentation/arkit/arworldtrackingconfiguration), [Apple iOS 16 compatibility](https://support.apple.com/en-sa/103267).

### Alternative for personal testing without paid Apple membership

An optional, not-yet-executed GitHub Actions workflow is included at `.github/workflows/ios-unsigned.yml`. Put this cross-platform directory at the root of a repository in your own GitHub account, then run **Actions → Build unsigned iPhone test app → Run workflow**. It uses a cloud Mac to generate the native project, compile without signing, and produce `Diwali-AR-unsigned.ipa`. A cloud Mac is still required for compilation; this does not compile iOS on Windows. GitHub's account quotas and billing apply: [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

An unsigned IPA cannot be opened directly on an iPhone. For personal testing, [AltStore Classic's official Windows setup](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows) provides a route to sign and sideload with your own Apple ID from Windows. After setup, import the generated IPA in AltStore's My Apps tab. Free-account apps require regular refresh (normally seven days); see [AltStore's app refresh explanation](https://faq.altstore.io/altstore-classic/your-altstore). This cloud-build and sideload path has not been run for this project, and no repository has been uploaded or workflow dispatched from this workspace.

## Assets and limits

All six WAV recordings are inherited unchanged from the licensed Pixabay bundle. ASSETS.md and assets/audio-manifest.json record provenance. Sutli's subtype remains unverified, chakri uses a spinning-bee variant, and ladi is an authored sequence of recorded pops. New geometry does not make those recordings exact product matches.

The geometry and procedural texture generator is tools/build_models.py. It builds 94 OBJ parts and a literal Metro asset manifest. It uses Python/Pillow. The bundled files are sufficient to build the app; regenerating artwork does not require downloading models.

This is a graphics simulation, not a chemical combustion solver. It does not claim LiDAR room reconstruction, real-object occlusion on iPhone X, persistent anchors across launches, exact physical acoustics, or photorealistic captured 3D assets. Smoke and sparks use bounded native particle pools; their collision with arbitrary room objects is not simulated. Physical-device tracking, audio latency, visual quality, accessibility, and sustained frame rate need review before calling this production-ready.

The Poco M5 is absent from [Google's ARCore supported-device list](https://developers.google.com/ar/devices), checked on 10 November 2026. A shared framework does not add ARCore certification to that hardware. Use the explicit studio mode for model preview on an unsupported phone; world tracking requires an ARKit/ARCore-capable device.

See VERIFICATION.md for performed checks and the distinction between source packaging, Android native compilation, and iPhone device verification.

Asset regeneration requires Python with Pillow and NumPy. `tools/build_effects.py` also expects the original Kotlin `app/src/main/assets/audio/chakri.wav` in the parent repository; the already generated WAV and sprites are included for ordinary Android/iOS builds. Native bridge regression tests require JDK 17.
