# Verification record

10 November 2026. Project: `D:\Projects\diwali-ar`, version 0.1.0.

## Local checks

- Kotlin JVM: 11 tests passed (Session 4, PCM decoder 4, timing/cue cursor 3).
- Python mastering: 3 tests passed. Verified transient spacing, non-mutating gain, tail silence and rejection of silent/non-finite input.
- Audio bundle validator: all six WAV files passed format, duration, signal, cue-range and checksum checks. This is structural validation, not a listening review.
- APK: Android build-tools 35.0.0 `apksigner verify --verbose` verified the debug APK's v2 signature. Manifest inspection found camera permission and AndroidX's internal receiver permission; no INTERNET permission.

## Android emulator

Final instrumentation run: **6 tests passed, 0 failures, 0 skipped**. The combined offline Gradle command `testDebugUnitTest connectedDebugAndroidTest` completed successfully in 3 minutes 10 seconds.

The task-owned Diwali_QA emulator runs Android 14 / API 34, 720 × 1600, host GPU, 2048 MB RAM, with a virtual rear camera and disabled host audio. Instrumentation covers:

- Selecting, placing, lighting and clearing all six firecrackers.
- Every real recording completing and returning the interface to placement mode.
- Background cancellation and persisted mute preference after recreation.
- Decoding every bundled PCM recording and finding nonzero signal.
- Visible warm particle pixels from the GLES renderer through a debug-only, non-exported fixture.
- Opaque placed artwork after drawing the translucent contact shadow.

The camera flow test captures temporary screenshots on the emulator; Gradle uninstalls the test target on completion. After the passing run, the same final APK was installed again and ready, placed and playing screenshots were captured and inspected under `dist/screenshots/qa/`. The placed cone is opaque and sparks originate at its tip. Their colored geometric background is the emulator's virtual camera input.

An earlier full run encountered Android System UI ANRs that began before the app tests. Host memory was constrained; the task-owned emulator was restarted at lower resolution with host GPU, Gradle workers were limited to two, and Gradle/Kotlin memory settings were reduced. The subsequent four-test run passed. The final suite adds completion checks and the artwork regression test.

Visual review found that placed artwork inherited the shadow Paint's alpha of 80. A regression test reproduced the failure (expected 255, actual 80); resetting alpha before the bitmap draw corrects it. The header gradient was also extended and its secondary tagline removed to improve contrast over bright camera input.

## Remaining device checks

No physical Poco M5 was connected. Installation on that phone, physical listening, subtype fidelity, camera behavior on MIUI, audio route/focus interruptions, permission denial, sustained frame rate, and speaker/display latency remain unverified. The emulator does not establish those results. The README gives the device check procedure and performance targets.

This is a camera-overlay prototype with screen-relative placement. It does not provide ARCore surface anchoring or headset VR. Sutli uses a generic recorded Diwali bang, chakri uses a spinning-bee variant, and ladi combines recorded pops into an authored sequence. See ASSETS.md for exact provenance and match limitations.
