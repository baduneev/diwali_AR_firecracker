# Diwali AR — Android and iPhone source

React Native / Expo native app, using Viro's ARKit backend on iOS and ARCore on supported Android phones. This replaces the original camera-overlay approach for the new version. The original Kotlin project and its APK remain separate.

## What changed

- 94 original OBJ mesh parts at real-world meter scale, with paper, rope, metal, normal-map and charred materials. The objects are actual 3D geometry rather than camera-facing illustrations.
- Horizontal plane placement. Tap a highlighted detected surface; the object becomes a child of the native tracked plane. Its position is not recomputed from camera motion. Plane refinement and tracking drift can still move an AR anchor.
- Flat spiral chakri, 36 separate grounded ladi tubes, horizontal coated sparkler, standing cone and launch tube, and wrapped sutli shell.
- Progressive charring, sparkler coating consumption, sequential ladi consumption at recorded pop times, spent remnants, shell collapse, and debris after the sutli bang.
- Native particles with gravity, drift, smoke, local warm light, contact shading and shadow receiving. The reduced-flashes setting removes the local flickering light and lowers the particle cap.
- Audio-driven visual timing, using the native recording player's current playback position. Recordings are bundled; mute retains the playback clock. Approximate distance attenuation is applied, rather than claimed binaural spatial audio.
- Tracking loss or audio interruption stops ignition/playback. Backgrounding clears placement so an old anchor is not silently reused in a new AR session.
- Explicit 3D studio mode for phones without AR support. This shows a virtual floor; it is not a camera overlay or world-tracked AR.

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
