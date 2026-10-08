# Can iOS use volume buttons to fire in a duel?

Researched: 2026-10-08. Scope: whether PR #104's Android volume-button input can be carried over to iOS, what Apple publicly supports, and practical alternatives for this duel.

## Conclusion

**No: the Android behavior does not port to iOS as-is.** PR #104 intercepts both volume keys through an Android `Window.Callback`, consumes them so system volume is unchanged, and invokes the duel's shot handler.
iOS has no documented general-purpose API for intercepting volume buttons as arbitrary game input. Apple's capture-button event API is limited to active camera-capture use cases; Apple explicitly says it cannot be used outside them.
This duel is not a camera app. [PR #104](https://github.com/pix-l-crafters/pocket-draw/pull/104), [Android module](https://github.com/pix-l-crafters/pocket-draw/blob/wutianze3/feat/android-volume-fire/modules/volume-fire/android/src/main/java/expo/modules/volumefire/VolumeFireModule.kt), [Apple, `AVCaptureEventInteraction`](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction).

**Qualified answer:** a foreground iOS app can observe `AVAudioSession.outputVolume` changes via KVO and infer an increase or decrease. That can approximate a trigger, but it does not identify the source or consume the press.
Volume changes; unrelated adjustments may be mistaken for firing, and presses at minimum/maximum produce no value change. This is not equivalent to PR #104. [Apple, `AVAudioSession.outputVolume`](https://developer.apple.com/documentation/avfaudio/avaudiosession/outputvolume); [Apple, `MPVolumeView`](https://developer.apple.com/documentation/mediaplayer/mpvolumeview).

The existing full-screen **“TAP ANYWHERE”** FIRE target (`Pressable`) remains the straightforward supported iOS input and the common cross-platform fallback.
An iOS motion gesture is technically feasible because the app already uses Expo's accelerometer, but needs careful false-trigger/timing design and is not a volume-button substitute. [Duel FIRE UI](https://github.com/pix-l-crafters/pocket-draw/blob/wutianze3/feat/android-volume-fire/src/features/duel/PreRound.tsx), [Expo Accelerometer](https://docs.expo.dev/versions/latest/sdk/accelerometer/).

This does not satisfy issue #37's literal iOS acceptance criterion, which requests volume-up/down firing on both platforms. The project's fire-mechanic spec instead selects iOS tap-to-fire and documents the camera-event and volume-observation compromises.
Keeping iOS volume-button firing as a requirement needs an explicit product decision; this research finds no supported general-purpose path reproducing PR #104. [Issue #37](https://github.com/pix-l-crafters/pocket-draw/issues/37), [fire-mechanic spec](https://github.com/pix-l-crafters/pocket-draw/blob/dev/docs/superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md).

## What PR #104 actually does

- The native Android Expo module wraps the activity's window callback while its JS listener is active, then reinstalls it when the activity enters foreground.
  It emits one event for the initial `ACTION_DOWN` (ignoring repeats), consumes both down/up events, and restores the callback on background, listener stop, or module destruction. [PR #104](https://github.com/pix-l-crafters/pocket-draw/pull/104), [module source](https://github.com/pix-l-crafters/pocket-draw/blob/wutianze3/feat/android-volume-fire/modules/volume-fire/android/src/main/java/expo/modules/volumefire/VolumeFireModule.kt).
- In JS, `PreRound` subscribes to `onVolumeButton` only on Android during `fire`; either key calls the same `handleFire` as tapping. That handler rejects duplicate/late shots and reports reaction time.
  The full-screen tap remains on both platforms. Android's prompt says “PRESS VOLUME OR TAP ANYWHERE”; iOS says “TAP ANYWHERE”. [JS trigger](https://github.com/pix-l-crafters/pocket-draw/blob/wutianze3/feat/android-volume-fire/src/features/duel/volumeFireTrigger.ts), [duel integration](https://github.com/pix-l-crafters/pocket-draw/blob/wutianze3/feat/android-volume-fire/src/features/duel/PreRound.tsx).
- Therefore the feature is not simply “listen for volume changes”: it deliberately intercepts and suppresses the system's volume-key action while the in-app FIRE window is active. That distinction is central to iOS feasibility.

## iOS behavior and constraints

### 1. Detecting volume-key presses while the app is foregrounded

Apple documents `AVCaptureEventInteraction` for capture-button events, available beginning **iOS/iPadOS 17.2**. It can only be used for capture use cases; events go only to apps actively using the camera.
Backgrounded apps and apps not performing capture do not receive events. The API overrides normal button behavior, so Apple requires an appropriate response. [Apple, `AVCaptureEventInteraction`](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction) (availability and Important note); [Apple, `AVCaptureEvent`](https://developer.apple.com/documentation/avkit/avcaptureevent) (phases).

This is not a general volume-button API for foreground games. Creating a camera session just to unlock it would not fit the documented capture purpose; the duel does not need a camera.
App Review says APIs must be used for their intended purposes, so this is not a supported iOS port. [Apple, `AVCaptureEventInteraction`](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction); [App Review Guidelines 2.5.1](https://developer.apple.com/app-store/review/guidelines/#software-requirements).

Apple's audio APIs expose the _resulting system volume_, not a general press callback. `AVAudioSession.outputVolume` is read-only; only the user can directly set system volume.
KVO can infer up/down by comparing old/new values, but reports a volume change, not its source; it misses endpoint presses and cannot consume the press. [Apple, `AVAudioSession.outputVolume`](https://developer.apple.com/documentation/avfaudio/avaudiosession/outputvolume).

### 2. Changing volume or showing system volume UI

`MPVolumeView` is Apple's supported in-app volume control and route picker. While sound plays, device-volume buttons move its slider to reflect the changed system volume.
It cannot convert a press to a shot while preventing the volume action. [Apple, `MPVolumeView`](https://developer.apple.com/documentation/mediaplayer/mpvolumeview).

Observing `outputVolume` cannot emulate PR #104: it reacts after volume changes, and Apple does not document a way for an app to set/restore system volume directly.
Temporarily changing volume or showing volume UI could be distracting and leave sound at an unintended level; it does not replace consuming Android's key event. [Apple, `AVAudioSession.outputVolume`](https://developer.apple.com/documentation/avfaudio/avaudiosession/outputvolume); [Apple, `MPVolumeView`](https://developer.apple.com/documentation/mediaplayer/mpvolumeview).

### 3. Background and locked-screen behavior

The camera-capture event API explicitly withholds events when the app is backgrounded, as well as when it is not actively using the camera. It cannot support firing from the lock screen. [Apple, `AVCaptureEventInteraction`](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction).

UIKit says backgrounded apps may be suspended except for defined background modes and associated events. Those modes do not create a generic volume-button stream; `AVCaptureEventInteraction` also excludes backgrounded apps.
Duel input is therefore foreground-only; lock-screen/background firing is not a realistic supported option. [Apple, background execution sequence](https://developer.apple.com/documentation/uikit/about-the-background-execution-sequence); [Apple, `AVCaptureEventInteraction`](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction).

### 4. App Store and private-API constraints

App Review guideline **2.5.1** requires public APIs used for their intended purposes. Guideline **2.5.9** says apps that alter or disable standard switches, including Volume Up/Down, will be rejected.
PR #104 consumes those buttons on Android; reproducing suppression on iOS would conflict with 2.5.9 and lacks a supported general-purpose API. [Apple, App Review Guidelines 2.5.1 and 2.5.9](https://developer.apple.com/app-store/review/guidelines/#software-requirements).

Private UIKit/IOKit hooks and undocumented responder behavior are not acceptable workarounds: they violate the public-API requirement and are not stable contracts. Apple's guidelines do not name every hook; this applies 2.5.1, not a claim that Apple reviewed this implementation.
The capture interaction is public but purpose-limited, not a workaround for a non-camera game. [Apple, App Review Guidelines 2.5.1](https://developer.apple.com/app-store/review/guidelines/#software-requirements); [Apple, `AVCaptureEventInteraction`](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction).

### 5. Realistic alternatives

1. **Keep tap-to-fire (recommended).** The full-screen `Pressable` remains available and routes to the shared `handleFire` on both platforms.
   This is the simplest dependable iOS input; retain “TAP ANYWHERE” copy. [Duel FIRE UI](https://github.com/pix-l-crafters/pocket-draw/blob/wutianze3/feat/android-volume-fire/src/features/duel/PreRound.tsx).
2. **Best-effort volume-change observation (not equivalent).** Observe `outputVolume` via KVO and treat value changes as shots. This documents volume changes, not button presses.
   Volume changes; other controls may cause false fires, and endpoints are missed. Use only if product accepts these compromises; it does not meet PR #104's behavior. [Apple, `AVAudioSession.outputVolume`](https://developer.apple.com/documentation/avfaudio/avaudiosession/outputvolume); [Apple, `MPVolumeView`](https://developer.apple.com/documentation/mediaplayer/mpvolumeview).
3. **Optional motion gesture.** Expo supports accelerometer updates on iOS, and this app already uses the sensor for its “top edge down” pre-round check.
   A deliberate tilt/flick/shake could work in the foreground, but is app-defined rather than a button press. It risks false triggers and timing ambiguity; choose and validate it explicitly.
   [Expo Accelerometer](https://docs.expo.dev/versions/latest/sdk/accelerometer/); [current duel sensor use](https://github.com/pix-l-crafters/pocket-draw/blob/wutianze3/feat/android-volume-fire/src/features/duel/PreRound.tsx).
4. **Optional paired game controller.** Apple Game Controller supports connected physical input on iOS/iPadOS (framework available since iOS 7), including button handlers.
   It requires a compatible controller and native integration; it is not a built-in-phone-button path. [Apple, `GCController`](https://developer.apple.com/documentation/gamecontroller/gccontroller).

Current implementation: The best-effort KVO approach is implemented in the iOS `VolumeFireModule` alongside the full-screen tap. It observes system-volume changes without suppressing them and remains an approximation, not Android-style key interception. Native iOS build and device-button verification have not been performed. [iOS module](../../modules/volume-fire/ios/VolumeFireModule.swift), [fire-mechanic spec](../superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md).

## Sources

- PR #104: <https://github.com/pix-l-crafters/pocket-draw/pull/104>
- Issue #37: <https://github.com/pix-l-crafters/pocket-draw/issues/37>
- Fire-mechanic spec: <https://github.com/pix-l-crafters/pocket-draw/blob/dev/docs/superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md>
- Android volume-fire module: <https://github.com/pix-l-crafters/pocket-draw/blob/wutianze3/feat/android-volume-fire/modules/volume-fire/android/src/main/java/expo/modules/volumefire/VolumeFireModule.kt>
- JS volume trigger: <https://github.com/pix-l-crafters/pocket-draw/blob/wutianze3/feat/android-volume-fire/src/features/duel/volumeFireTrigger.ts>
- Duel integration/UI: <https://github.com/pix-l-crafters/pocket-draw/blob/wutianze3/feat/android-volume-fire/src/features/duel/PreRound.tsx>
- Apple, `AVCaptureEventInteraction`: <https://developer.apple.com/documentation/avkit/avcaptureeventinteraction>
- Apple, `AVCaptureEvent`: <https://developer.apple.com/documentation/avkit/avcaptureevent>
- Apple, `AVAudioSession.outputVolume`: <https://developer.apple.com/documentation/avfaudio/avaudiosession/outputvolume>
- Apple, `MPVolumeView`: <https://developer.apple.com/documentation/mediaplayer/mpvolumeview>
- Apple, App Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- Apple, background execution sequence: <https://developer.apple.com/documentation/uikit/about-the-background-execution-sequence>
- Apple, `GCController`: <https://developer.apple.com/documentation/gamecontroller/gccontroller>
- Expo, Accelerometer: <https://docs.expo.dev/versions/latest/sdk/accelerometer/>
