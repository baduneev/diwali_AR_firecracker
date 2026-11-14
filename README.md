# Diwali Camera

The newer shared Android/iPhone AR project is in [cross-platform/README.md](cross-platform/README.md). It uses native surface tracking and 3D meshes. This document describes the original Kotlin camera-overlay version; its source and debug APK remain available separately.

Kotlin Android camera-overlay simulation for the Poco M5. Choose one of six virtual firecrackers, tap/drag a position, then light it. Placement is fixed to the screen; this app does not claim ARCore surface tracking.

## Current status

The source and debug APK now include six playable effects, PCM recordings, a provenance manifest, and in-app credits. Five licensed source recordings were obtained through Pixabay, then edited offline. The build refuses to proceed if any recording, manifest, or credits file is missing.

Sound fidelity is explicitly qualified: sutli uses a generic recorded Diwali bang; chakri uses a spinning-bee variant; ladi is assembled from recorded pops. These are not claimed as exact recordings of the pictured products. See ASSETS.md for the adopted sources, licenses, edits and hashes.

Actual Poco M5 camera, speaker synchronization and sustained-performance tests remain pending; no physical phone is connected. See VERIFICATION.md for emulator and local check results and their limits.

## Build

Use JDK 17, Android SDK platform 36, and the included Gradle 8.14 wrapper. Dependencies and plugins are fixed in the Gradle files. Build tools may require internet; the app itself declares no INTERNET permission.

Set `JAVA_HOME` to a JDK 17 installation. Put the SDK path in an ignored `local.properties`, for example:

```properties
sdk.dir=C:/Users/Neev/AppData/Local/Android/Sdk
```

```powershell
.\gradlew.bat testDebugUnitTest assembleDebug
```

Optional workstation bootstrap: `python tools/bootstrap.py` downloads an official Eclipse Temurin JDK into ignored `.tools/`. It requires the Python `requests` package. No development tooling is included in the source ZIP or APK.

## Reproduce the recording bundle

The mastered WAV files are already bundled, so building the app requires no source-library downloads. For editing, obtain the five original MP3s listed in ASSETS.md through their licensed source pages and place them in ignored `.research/audio-inputs/`. Run `python tools/prepare_audio.py`, then `python tools/write_asset_ledger.py`. Preparation performs no network requests. Python dependencies are listed in `tools/requirements-dev.txt`; imageio-ffmpeg is installed in ignored `.tools/python/` on this workstation, or can be installed normally in a Python environment.

Preparation preserves pitch, records source/output hashes and exact edits, converts to mono PCM, adds short fades, and uses a real sparkler-hiss excerpt as virtual ignition. The ladi track mixes 36 recorded pops with matching visual cue offsets. Numeric processing does not establish exact subtype fidelity; do not remove the documented match limitations without checking replacements.

```powershell
python tools/validate_assets.py
.\gradlew.bat testDebugUnitTest assembleDebug connectedDebugAndroidTest
```

Final APK location: `app/build/outputs/apk/debug/app-debug.apk`. It uses Android's debug signing key for sideloading, not a generated production keystore.

## Verification

- `SessionTest`: rejects invalid/double starts; locks placement during playback; ignores stale completion; clears on interruption.
- `PcmWaveTest`: reads PCM with an odd-sized metadata chunk; rejects stereo, wrong-rate and truncated input.
- `RendererTest`: debug-only internal harness verifies visible warm particle pixels over a transparent EGL texture using an in-memory silence fixture. That fixture is not a bundled firecracker recording. The internal activity is not exported and is omitted from release builds.
- `TimelineTest`: cue catch-up without duplicate pops and monotonic playback position with per-run reset.
- `CameraFlowTest`: six selections/place/light/clear, playback completion for every effect, background cancellation, preference persistence, actual audio decoding. Results are recorded in VERIFICATION.md.
- `OverlayTest`: placed artwork remains opaque after drawing its translucent contact shadow.
- `tools/test_audio_mastering.py`: transient spacing/pitch timing, non-destructive mastering, tail silence and rejection of invalid sources.

Renderer-only emulator command used successfully:

```powershell
.\gradlew.bat connectedDebugAndroidTest '-Pandroid.testInstrumentationRunnerArguments.class=com.neev.diwalicamera.RendererTest'
```

The emulator uses a virtual camera and disabled host audio. It cannot establish physical speaker latency, sound quality, or Poco M5 frame rates. An initial instrumentation harness process mismatch was corrected. A later full run was obstructed by Android System UI ANRs that started before the app tests; those infrastructure failures and the rerun are recorded in VERIFICATION.md.

## On your Poco M5

Copy `dist/Diwali-Camera-debug.apk` to the phone and allow installation from the file manager when Android asks. For USB installation, enable USB debugging, connect the phone, and use `adb devices` followed by `adb install -r Diwali-Camera-debug.apk`. MIUI may offer a separate Install via USB setting. The app requests camera access and transient audio focus; it does not save or upload camera footage.

Check all six effects in bright/dim scenes, clear during playback, background/return, permission denial, audio interruption, muted replay, and route changes. Measure physical sound/display timing using an external recording with audio retained. Target burst synchronization within 50 ms on the built-in speaker and at least 30 rendered FPS during a ten-minute session. The renderer logs frame cadence under `DiwaliFrames`; use Perfetto for detailed camera/GL/compositor profiling. Bluetooth timing and verified flash-safety certification are not claimed.

## Source layout

`MainActivity.kt` owns camera lifecycle, permission/settings flows and controls. `Session.kt` owns allowed state transitions and run cancellation. `Effects.kt` loads typed effect definitions and recording cue offsets. `AudioEngine.kt` streams PCM through AudioTrack and exposes the presentation clock. `ParticleView.kt` draws pooled particles in GLES. `CrackerArt.kt` contains original artwork, placement reticle, contrast scrim and local glow.

The existing browser QA project in the parent folder is a separate project.

## Current shared AR build

Version 0.2.12 uses the React Native app in [cross-platform](cross-platform/README.md). The current Android deliverable is `dist/Diwali-AR-0.2.12-assisted-placement.apk`. It adds on-demand tap hit testing and labelled assisted horizontal placement when full surface geometry is unavailable, with adjustable height. Compact controls, burn dynamics and overlapping sky shots are retained. The original Kotlin app remains in `app/`.
