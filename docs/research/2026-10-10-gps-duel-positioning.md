# Can phone GPS support close-range duel aiming, and what should replace it?

Researched: 2026-10-10. Scope: the current calibration and shot pipeline, an executable probe of its rejection paths, primary-source sensor contracts, and practical opponent-positioning alternatives. Repository snapshot: `13b9b34c842c9698818b0b2bf114baee60d984fd`; locked packages: Expo SDK 54, `expo-location` 19.0.8 and `expo-sensors` 15.0.8. No application code was changed. This is an
investigation, not a claim that GPS is the sole cause of the reported missed shots. [Dependencies][repo-packages]

## Conclusion

**GPS coordinates plus a compass are a poor foundation for deciding whether a phone points at another person only a few meters away.** The system must estimate two positions, subtract them to obtain an opponent bearing, and compare that bearing with a separately measured phone orientation. Ordinary phone positioning uncertainty is already comparable with that separation; compass uncertainty is
additional. GPS.gov gives a typical smartphone open-sky accuracy of about a **4.9 m radius**, with worse results around obstructions. That is context, not a measured error or guarantee for these players' devices. [GPS.gov accuracy](https://www.gps.gov/gps-accuracy); [Expo 54 Location](https://docs.expo.dev/versions/v54.0.0/sdk/location/).

**Recommended existing-phone option: an explicitly stationary, per-round opponent-facing orientation calibration.** Have each player point the intended aim axis toward the opponent, record that local orientation, then judge the draw against that reference for the short round. This avoids needing geographic north or a GPS-derived bearing. It measures whether the player returns toward a calibrated
direction; **it does not locate or track an opponent who moves**. This recommendation is an engineering inference from supported relative-orientation APIs, not a completed implementation or device validation. [Android game rotation vector](https://developer.android.com/develop/sensors-and-location/sensors/sensors_position#sensors-pos-gamerot);
[Apple arbitrary-reference attitude](https://developer.apple.com/documentation/coremotion/cmattitudereferenceframe/xarbitraryzvertical).

**If moving-opponent tracking is a real requirement, use a visual target or a shared visual-inertial coordinate system; evaluate UWB only for a verified compatible device population.** Camera tracking observes target pose while visible; shared AR can let each phone publish its own pose in a common frame. UWB can provide excellent range and sometimes direction, but hardware, APIs, antenna
orientation, missing direction results, and platform interoperability must be checked. None is a drop-in `expo-location` accuracy setting. [ARCore moving-image tracking](https://developers.google.com/ar/develop/augmented-images); [ARCore cross-platform Cloud Anchors](https://developers.google.com/ar/develop/cloud-anchors); [Android UWB](https://developer.android.com/develop/connectivity/uwb);
[Apple Nearby Interaction setup](https://developer.apple.com/documentation/nearbyinteraction/initiating-and-maintaining-a-session).

## What GPS actually does in this build

**Pose calibration does not calibrate GPS or save the opponent's direction.** The current sequence is manually confirm separation, capture **shoulder first, then ready**, and enter the pre-round ritual. Some older instructions describe ready-first; the current executable flow is the source of truth. [Setup routing][repo-duel]; [pose capture][repo-calibration]

| Stage                      | Inputs actually used                                                                                               | GPS involvement                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Stand apart                | Player confirmation that both are a few paces apart                                                                | No distance measurement or enforcement                                                                     |
| Shoulder/ready calibration | Accelerometer pose checks and DeviceMotion `rotation.beta`; two-second steady hold or valid volume-up confirmation | None; saves pitch endpoints, not geographic position or target heading                                     |
| Clock calibration          | Peer ping/pong timestamps, choosing the lowest-round-trip sample                                                   | Not GPS time; used for reaction timing and remote-fix age conversion                                       |
| Pre-round ritual           | Ready pose, peer readiness, motion/clock status; starts location and compass watchers                              | Requests each phone's location and exchanges precise fixes with the accepted peer; shows tracking warnings |
| Fire                       | Latest pitch, compass reading, local fix and received peer fix                                                     | May veto an otherwise valid pitch zone based on tracking validity or opponent bearing                      |
| Round scoring              | Each phone's transmitted zone/reaction time                                                                        | Does not independently locate the opponent or recalculate a physical bullet collision                      |

Sources: [setup and round mounting][repo-duel], [calibration][repo-calibration], [pose checks][repo-pose], [clock synchronization][repo-clock], [pre-round/fire][repo-preround], [tracking hook][repo-tracking], [round judge][repo-rounds].

### Exact shot-decision sequence

1. Sample the latest delivered pitch. Compute `F = (thetaFire - thetaReady) / (thetaShoulder - thetaReady)`. `0.8 <= F <= 1.0` is bodyshot; `1.0 < F <= 1.2` is headshot; below/above those bands is `tooLow`/`tooHigh`. An unavailable pitch produces `tiltUnavailable`. These are **tilt bands, not measured head/torso positions**. [Pitch classifier][repo-pitch]; [motion sampling][repo-motion];
   [fire handler][repo-preround]
2. If pitch already missed, retain that cause. Otherwise require valid local and peer coordinates with positive finite accuracy, local/peer fix age no greater than **5 seconds**, a valid true-north compass reading with **accuracy category exactly 3**, compass callback age no greater than **2 seconds**, and a finite clock offset. These checks happen **before** the close-range bypass.
   [Tracking checks and capture][repo-tracking]
3. Compute spherical separation and initial opponent bearing. If separation is **less than or equal to the sum of the two reported location accuracies**, preserve the pitch result without checking heading alignment. Otherwise require heading error **at most 30°**. [Aim classifier and geometry][repo-aim]

The watch requests `Accuracy.High`, `timeInterval: 1000`, `distanceInterval: 0`. It publishes each accepted fix and repeats it every second with its **original** timestamp, so repeats do not make an old fix fresh. Peer age uses `now - (sampleAtMs - clockOffsetMs)`. Watchers are recreated with each mounted round; successful pose calibration is not proof that these later watchers are ready.
[Tracking lifecycle][repo-tracking]; [round key][repo-duel]

The rounded public map coordinates are **not** the input to this calculation: the hook sends raw accepted coordinates directly through `aimPosition`. Improving map-marker display or coordinate rounding therefore does not fix this shot path. [Direct peer exchange][repo-tracking]

## Demonstrated reasons a correctly raised shot can miss

### 1. Compass callback age can reject a stable direction

The pre-round readiness check deliberately removes `headingStale` from its warnings, but the fire-time check does not. Countdown confirmation is gated by pose/peer readiness and motion/clock state, **not** `trackingIssues`. Thus the game can start with tracking warnings, and can also show no tracking warning while the later shot fails the compass-age rule.
[Readiness versus capture][repo-tracking]; [confirmation enablement][repo-preround]

This conflicts with a native delivery assumption: the published **expo-location 19.0.8 Android source** emits heading only when azimuth changes by more than `0.0355` radians (about 2.03°) and more than 50 ms have elapsed. It has no periodic heading heartbeat. Raising the phone without changing its horizontal bearing does not guarantee another callback. iOS forwards Core Location heading events,
also without an Expo heartbeat. **Demonstrated app failure path; whether it caused these players' shots remains unverified.** [Locked Android package source](https://unpkg.com/expo-location@19.0.8/android/src/main/java/expo/modules/location/LocationModule.kt);
[Expo SDK 54 Android source](https://github.com/expo/expo/blob/sdk-54/packages/expo-location/android/src/main/java/expo/modules/location/LocationModule.kt); [iOS heading streamer](https://github.com/expo/expo/blob/sdk-54/packages/expo-location/ios/Providers/DeviceHeadingStreamer.swift)

Do not fix this by falsely refreshing an old sensor timestamp. A future implementation needs to distinguish an unchanged heading from sensor/lifecycle failure, or use continuously sampled relative attitude for the intended game rule. This is a recommendation from the source mismatch, not an implemented fix.

### 2. The close-range bypass does not bypass sensor availability

Fresh overlapping GPS uncertainty already preserves body/head shots. Therefore “overlapping GPS always forces a miss” is **not true in this build**, although older game instructions still say it. Missing/stale coordinates, accuracy category 2, invalid true heading, or stale compass callbacks still reject before that bypass. [Capture ordering][repo-tracking]; [uncertainty bypass][repo-aim];
[outdated instructions][repo-instructions]

Conversely, with usable readings inside the overlap threshold, even a **180° wrong-way aim** keeps its pitch score. Just outside the threshold, the full 30° bearing test returns. GPS jitter can therefore change which scoring rule applies. This is a policy discontinuity, not a spherical-math precision problem. [Aim geometry][repo-aim]

### 3. A non-overlapping position estimate can still have a poor bearing

The classifier checks whether error circles overlap, but does not propagate the remaining position uncertainty into angular uncertainty outside that threshold. Nor does it combine compass uncertainty with the position-derived angle. Non-overlap is not proof that the 30° cone can be judged reliably; the geometry below explains why. [Aim geometry][repo-aim];
[Android accuracy confidence](<https://developer.android.com/reference/android/location/Location#getAccuracy()>)

### 4. Pitch and coordinate-frame errors are independent of GPS

The app samples only DeviceMotion `beta` for scoring; it does not turn the complete orientation into a physical top-edge aim vector. Shoulder pose validation allows phone roll. A different grip between calibration and firing is therefore a device-validation concern, not something better GPS inherently repairs. Apple heading uses the portrait top edge by default; the Expo iOS heading streamer does
not configure another heading orientation. These facts warrant an axis/grip check, **not a claim that a particular axis mismatch was reproduced**. [Pitch monitor][repo-motion]; [pose acceptance][repo-pose]; [Apple heading orientation](https://developer.apple.com/documentation/corelocation/cllocationmanager/headingorientation);
[Expo heading streamer](https://github.com/expo/expo/blob/sdk-54/packages/expo-location/ios/Providers/DeviceHeadingStreamer.swift)

### Executed probe of current source

Ran `node --experimental-vm-modules /tmp/pocket-draw-positioning-smoke.mjs` using Node 24.21.0. The temporary harness loaded the **unmodified** `aimBearing.ts`, `pitchZoneClassifier.ts`, and `useAimTracking.ts` through Node's TypeScript stripping and VM modules. Native callbacks, clock progression, and the minimal React hook lifecycle were synthetic; this exercised real decision logic, not a
physical sensor or rendered UI. All seven scenario assertions passed. The temporary script was removed after recording the results; no permanent tests or gameplay edits were added.

For the coordinate examples, self was `(0, 0)`, the nearby opponent was `(0.00003, 0)`, and each reported accuracy was 5 m.

| Scenario                                                          | Observed current result                                                           |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 3.336 m separation, heading 180° away                             | `bodyshot`; GPS-uncertainty bypass true                                           |
| Opponent estimate displaced to `(0.00003, 0.0001)`, heading north | Estimated separation 11.609 m, heading error 73.301°; `offTarget`                 |
| Fresh compass category 3 and fresh nearby coordinates             | `bodyshot`                                                                        |
| Fresh coordinates, no heading callback for 2,001 ms               | Pre-round warnings empty; fire becomes `compassUnavailable`, issue `headingStale` |
| Fresh nearby coordinates and fresh compass category 2             | `compassUnavailable`, issue `headingUnreliable`                                   |
| Fresh compass but both fixes 5,001 ms old                         | `locationUnavailable`; diagnostics record both stale fixes                        |
| Pitch `F = 0.79`, with tracking also unusable                     | `tooLow` retained; pitch miss takes precedence                                    |

These controlled inputs demonstrate rejection paths and bypass behavior. They do **not** establish how often any path occurs in real play, nor reproduce the actual users' sensor samples.

### How to identify what rejected the real shots

Use the existing completed-match diagnostics rather than assuming all zero scores mean bad GPS:

1. Inspect both players' `analytics/{matchId}_{playerId}` records for the same completed match; confirm both apps run the investigated build. Do not use public map pins as shot evidence.
2. Check `rounds[].missReason` first, then `rounds[].shot.aim.issues`: `headingStale`, `headingUnreliable`, local/peer position missing/stale, or invalid clock offset.
3. For `offTarget`, inspect heading, calculated bearing, heading error, separation, both accuracy radii, and `bypassedWithinGpsUncertainty`.
4. For `tooLow`/`tooHigh`/`tiltUnavailable`, inspect pitch endpoints, `thetaFire`, `raiseFraction`, motion sample age and orientation. Better positioning would not change these pitch failures.
5. Compare a stationary heading through the actual ready/countdown/draw sequence, indoors versus clear outdoor space, and consistent versus changed grip. Record sensor unavailability separately from genuine aiming error. This is a proposed physical validation, not one performed here.

The fields and upload lifecycle already exist; unconfirmed or queued matches may not yet be in Firestore. No production analytics was accessed in this investigation. [Analytics documentation](../analytics.md); [diagnostics schema][repo-schema]; [capture fields][repo-tracking]

**Privacy correction:** current instructions say precise GPS never goes to Firestore, but shot analytics include both players' precise coordinate snapshots and the backend persists the supplied analytics. Do not repeat the peer-only claim as current behavior or share raw exports publicly. This mismatch was documented here, not changed. [Instructions][repo-instructions];
[diagnostics schema][repo-schema]; [analytics persistence][repo-analytics]

## Evidence: position, bearing, orientation, and freshness are different things

### GPS and fused location do not directly observe the opponent

A geographic location API estimates **this phone's coordinates**. Google's fused location provider combines underlying technologies such as GPS and Wi-Fi; requesting higher accuracy asks the provider for better service, not direct peer-to-peer measurement. Apple's `desiredAccuracy` explicitly says applications must accept that results can initially, or otherwise, be less accurate than requested.
[Google Fused Location Provider](https://developers.google.com/location-context/fused-location-provider); [Apple `desiredAccuracy`](https://developer.apple.com/documentation/corelocation/cllocationmanager/desiredaccuracy).

GPS accuracy depends on satellite geometry, signal blockage, receiver quality, and atmospheric conditions. Indoor use and signals reflected by buildings or walls can degrade it. Survey-grade centimeter-level positioning described by GPS.gov uses specialized receivers and/or augmentation; those results must not be substituted for an ordinary app's phone-location accuracy.
[GPS.gov accuracy](https://www.gps.gov/gps-accuracy).

A phone's reported uncertainty also is **not a hard boundary**. Android defines horizontal `getAccuracy()` as an estimated radius at the **68th-percentile confidence level**. Expo calls `coords.accuracy` a radius of uncertainty without establishing an identical cross-platform probability model. Consequently, summing two reported radii can be a useful ambiguity heuristic but does not guarantee that
both true positions lie inside those circles. [Android `Location.getAccuracy`](<https://developer.android.com/reference/android/location/Location#getAccuracy()>); [Expo 54 `LocationObjectCoords`](https://docs.expo.dev/versions/v54.0.0/sdk/location/#locationobjectcoords).

### Why short-baseline bearings become unstable

**Geometric derivation, not a measured phone benchmark:** write the true relative vector as `r = opponent - self`. If each estimated position has error `e`, the calculated vector is `r + e_opponent - e_self`. Shared errors can partly cancel; independent or different local errors can amplify. Neither guaranteed cancellation nor statistical independence should be assumed from two `accuracy` fields.

For a purely sideways _relative_ position error `e_perp` and otherwise correct forward separation `d`, bearing error is `atan(e_perp / d)`. Examples:

| True separation | Relative sideways error | Bearing error, approximately |
| --------------- | ----------------------- | ---------------------------- |
| 3 m             | 1 m                     | 18.4°                        |
| 3 m             | 3 m                     | 45°                          |
| 3 m             | 5 m                     | 59.0°                        |
| 10 m            | 3 m                     | 16.7°                        |

These examples do **not** turn the GPS.gov 4.9 m typical radius into a particular statistical error for each player. They illustrate why even meter-scale residual error matters. For hypothetical strict error disks, if estimated separation `D` exceeds the sum of radii `R`, the tangent construction gives maximum bearing deviation `asin(R / D)`; if `D < R`, every bearing is possible. At equality, the
relative vector can vanish and the bearing becomes undefined. Actual reported accuracy radii are estimates rather than strict bounds. [Underlying accuracy semantics: Android `Location.getAccuracy`](<https://developer.android.com/reference/android/location/Location#getAccuracy()>).

Averaging position samples may reduce some random noise, but cannot by itself remove persistent bias or make stale coordinates track a moving player. That is an engineering inference from the error model, not a guarantee of improvement. More decimal places, a more exact spherical bearing formula, or a faster JavaScript timer cannot recover an unobserved relative position.

### Expo SDK 54: accuracy and freshness contracts

| API or field                             | What the official contract says                                                              | Consequence for aiming                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Accuracy.High`                          | Described as within ten meters of the desired target.                                        | A quality request, not a promise of sub-meter peer position.                                  |
| `Accuracy.Highest` / `BestForNavigation` | Best available accuracy / highest possible accuracy using additional navigation sensor data. | Worth distinguishing from `High`, but neither guarantees reliable few-meter opponent bearing. |
| `coords.accuracy`                        | Radius of uncertainty in meters.                                                             | Evaluate actual samples, not only requested accuracy.                                         |
| `LocationObject.timestamp`               | Epoch milliseconds when position information was obtained.                                   | Receipt time alone is not measurement freshness.                                              |
| `timeInterval`                           | Android-only **minimum** time between updates.                                               | Not a guaranteed callback heartbeat or maximum sample age.                                    |
| `distanceInterval`                       | Update distance threshold.                                                                   | Setting it to zero does not promise precise or fresh samples at every requested instant.      |
| `getCurrentPositionAsync`                | Obtaining a fix can take several seconds.                                                    | Starting a request immediately before firing need not produce a usable result in time.        |
| `getLastKnownPositionAsync`              | Cached location may be old; accepts `maxAge` and `requiredAccuracy`.                         | A quick response can still be unsuitable for gameplay.                                        |
| `watchPositionAsync`                     | Updates in the foreground.                                                                   | Lifecycle and delivery are separate from location quality.                                    |

Source for the table: [Expo 54 Location API](https://docs.expo.dev/versions/v54.0.0/sdk/location/). Accuracy-request caveat: [Apple `desiredAccuracy`](https://developer.apple.com/documentation/corelocation/cllocationmanager/desiredaccuracy). The consequences are engineering interpretations of these contracts, not claims of observed callback rates on any particular phone.

For a remote opponent, the coordinate's measurement timestamp, transport delay, and local receipt time answer different questions. Comparing timestamps from two phones additionally assumes sufficiently aligned wall clocks. These are timing-model considerations; no network latency or clock offset was measured in this research.

### Expo compass behavior: north is not an opponent and course is not aim

- `watchHeadingAsync` subscribes to **compass** updates. `magHeading` uses magnetic north; `trueHeading` uses true north and can return `-1` without the necessary location permission. Geographic bearing and magnetic heading must not be compared as if their north references were interchangeable.
  [Expo 54 `LocationHeadingObject`](https://docs.expo.dev/versions/v54.0.0/sdk/location/#locationheadingobject).
- Expo heading `accuracy` is a **calibration category** from 0 to 3, not an angular measurement in degrees. Expo documents iOS category 3 as less than 20° uncertainty; that is not a universal Android 20° guarantee. Even the documented iOS category is not synonymous with a narrow, exact aiming ray.
  [Expo 54 heading accuracy](https://docs.expo.dev/versions/v54.0.0/sdk/location/#locationheadingobject).
- `coords.heading` is the horizontal **direction of travel**, not the direction the phone points. Apple's docs make the same distinction between course and heading. A stationary player cannot replace orientation sensing with GPS course. [Expo 54 coordinates](https://docs.expo.dev/versions/v54.0.0/sdk/location/#locationobjectcoords);
  [Apple heading and course](https://developer.apple.com/documentation/corelocation/getting-heading-and-course-information).
- Expo's heading object documents `accuracy`, `magHeading`, and `trueHeading`, but no measurement timestamp or guaranteed periodic cadence. Apple's heading delegate is described as receiving updates when heading changes. Therefore a locally imposed callback-age deadline needs validation against actual native delivery behavior; silence alone is not documented proof that the phone's orientation
  became wrong. [Expo 54 heading API](https://docs.expo.dev/versions/v54.0.0/sdk/location/); [Apple heading delivery](https://developer.apple.com/documentation/corelocation/getting-heading-and-course-information).
- Phone axes matter. Expo DeviceMotion defines portrait `+Y` from the bottom toward the top edge and `+Z` out through the screen; rotation values describe orientation, not another player's location. Any replacement should identify the physical aim axis and its coordinate transform explicitly. [Expo 54 DeviceMotion](https://docs.expo.dev/versions/v54.0.0/sdk/devicemotion/).

## Alternatives, ordered by practical fit

### 1. Per-round opponent-facing relative orientation: best first option for stationary duels

**Proposed behavior, not existing implementation:** after players have taken their final positions, each points the phone's intended aim axis at the opponent and captures a reference orientation. During the short round, compare the current aim vector against that saved reference, while separately retaining whatever pitch/draw rule the game intends. Recalibrate when positions change or the sensor
session restarts.

Android explicitly recommends the **game rotation vector** for games that do not need north: it excludes the magnetic field, making relative rotations unaffected by magnetic field changes, while allowing yaw-reference drift. Apple exposes `xArbitraryZVertical` and recommends saving the first attitude and comparing later values when only relative rotational changes are required.
[Android game rotation vector](https://developer.android.com/develop/sensors-and-location/sensors/sensors_position#sensors-pos-gamerot); [Apple relative attitude](https://developer.apple.com/documentation/coremotion/cmattitudereferenceframe/xarbitraryzvertical).

**Limits:** calibration depends on the player actually pointing correctly; the reference drifts; moving either player's position invalidates the old direction. Capturing pitch alone does not capture opponent direction. Capturing a magnetic heading and subtracting it later can cancel a stable offset, but does not remove changing magnetic disturbance; a deliberately selected relative sensor frame is
the cleaner design. These are design inferences from the sensor reference-frame contracts above.

**Integration boundary:** Expo DeviceMotion provides motion/orientation readings, but its public SDK 54 API does not offer a selector for Android game-rotation-vector versus other native fusion or for Apple's attitude reference-frame option. Reusing it requires checking the implementation and verifying its axes and reference behavior; do not promise this native sensor choice is one new Expo
option. [Expo 54 DeviceMotion API](https://docs.expo.dev/versions/v54.0.0/sdk/devicemotion/).

This is a **calibrated stationary-target rule**, not real opponent tracking. If true movement tracking is optional, do not build radio infrastructure to solve the simpler stationary-round problem.

### 2. Camera/visual target: direct moving-target observation, with a different grip

ARCore Augmented Images can estimate position and orientation of known flat images, including images that move. ARKit image tracking similarly tracks known images with six degrees of freedom. A known image carried by the opponent is therefore a plausible directly observed target. A separately designed fiducial-marker detector is another engineering option, but it is not the same algorithm as
native natural-image tracking. [ARCore Augmented Images](https://developers.google.com/ar/develop/augmented-images); [Apple `ARImageTrackingConfiguration`](https://developer.apple.com/documentation/arkit/arimagetrackingconfiguration).

Important practical constraints:

- ARCore requires the image to fill at least **25% of the camera frame for initial detection**, remain flat and clearly visible, and not be heavily obscured or motion-blurred. A tiny phone-screen target several meters away may fail that requirement; its suitability needs an actual size/distance test. [ARCore image requirements](https://developers.google.com/ar/develop/augmented-images).
- ARCore explicitly discourages QR codes, barcodes, logos, and repetitive line art as **Augmented Image** reference images. Do not confuse “scan a QR to exchange a session ID” with “track that QR accurately in 3D.” [ARCore image selection](https://developers.google.com/ar/develop/augmented-images).
- When a tracked image leaves ARCore's view, continued pose tracking assumes the image is **stationary**. It cannot reveal where an unseen moving opponent actually went. Apple image-only tracking likewise requires the image in view. [ARCore out-of-view behavior](https://developers.google.com/ar/develop/augmented-images);
  [Apple image tracking](https://developer.apple.com/documentation/arkit/arimagetrackingconfiguration).
- **Top-edge aiming is not rear-camera aiming.** A ray along the phone's long edge lies roughly perpendicular to the rear-camera optical axis. With the top edge pointed at an opponent, the camera may face the ground or sky instead. This geometric inference follows the documented sensor/camera frames. A camera-reticle mode changes the grip; preserving top-edge aim instead needs a correctly
  transformed AR aim ray and maintained world tracking, not simply a centered camera image. [Expo device axes](https://docs.expo.dev/versions/v54.0.0/sdk/devicemotion/); [Apple camera transform](https://developer.apple.com/documentation/arkit/arcamera/transform).

**Recommendation:** if a camera-facing game and visible marker are acceptable, this is the first moving-opponent approach to prototype. It observes a target rather than hoping two noisy geographic coordinates yield its bearing. It requires native camera/vision integration and physical testing; the cited APIs are not an assertion of a ready-made SDK 54 component.

### 3. Shared AR: moving phones in a common frame, not automatically tracked bodies

ARKit world tracking combines camera features and motion sensors through visual-inertial odometry. A common reference is still needed before two independent sessions' coordinates can be subtracted. ARCore Cloud Anchors explicitly support shared experiences between **Android and iOS**, hosting and resolving a common anchor from visual environmental features. Cloud hosting/resolution requires
internet access and scanning the relevant surroundings. [Apple world tracking](https://developer.apple.com/documentation/arkit/understanding-world-tracking); [ARCore Cloud Anchors](https://developers.google.com/ar/develop/cloud-anchors).

**Proposed architecture:** both phones resolve the same coordinate frame, then exchange their current poses with timestamps; compute opponent-relative position and the phone's top-edge aim vector in that frame. A common physical reference image can also establish a local alignment, provided the implementation derives consistent transforms and scale. These are engineering designs based on
image-pose and shared-anchor APIs, not capabilities obtained by merely opening two camera previews. [ARCore image pose](https://developers.google.com/ar/develop/augmented-images); [ARCore shared-anchor process](https://developers.google.com/ar/develop/cloud-anchors).

Shared anchors are static frame references, **not moving-player trackers or a pose transport**. Applications must supply ongoing peer pose exchange. This can locate the opponent's **phone**, not necessarily their head or torso; body targeting needs a separate model or visual observation. Camera occlusion, blank surfaces, darkness, and fast blurred motion can impair world tracking, which is
especially relevant to a rapid draw or a phone held down at the side. [Apple world-tracking caveats](https://developer.apple.com/documentation/arkit/understanding-world-tracking). Suitability for this game's movement is unmeasured.

### 4. UWB: strongest radio candidate, but not universal or automatically cross-platform

Android describes UWB as precise ranging with approximately **10 cm** accuracy. Its Jetpack API requires supported UWB hardware and Android 12+, and apps must discover peers and securely exchange ranging parameters over another channel. That headline range accuracy does not promise the same accuracy in angle or guarantee every sample.
[Android UWB](https://developer.android.com/develop/connectivity/uwb).

Distance alone does **not** determine bearing: a single range places the target on a circle in 2D or sphere in 3D. Android's `RangingPosition` exposes distance, azimuth, and elevation as individually nullable measurements. Its angular frame is the antenna boresight, described as normal to the phone's back, not the top edge. A usable aim system therefore needs supported, valid directional
measurements and a coordinate transform, or additional independent position constraints. [Android `RangingPosition`](https://developer.android.com/reference/kotlin/androidx/core/uwb/RangingPosition).

Apple Nearby Interaction reports peer distance and direction on capable devices. Apple instructs apps to separately check `supportsDirectionMeasurement` and `supportsPreciseDistanceMeasurement`. Its baseline guidance says peer iPhones work best within 9 m, in portrait orientation, with rear cameras facing each other; direction can be unavailable outside the relevant field of view or when
obstructed. Camera Assistance can widen useful coverage on supported devices, but does not remove capability checks. These are Apple's interaction guidelines, not an absolute range limit for every UWB generation. [Apple session setup and line of sight](https://developer.apple.com/documentation/nearbyinteraction/initiating-and-maintaining-a-session).

**Hardware example: Pixel 7 is not Pixel 7 Pro.** Google's official specification lists an Ultra-Wideband chip for the **Pixel 7 Pro**, but not for the base **Pixel 7**; Android's supported-device list likewise identifies Pixel Pro models rather than all Pixels. Both models list dual-band GNSS and Bluetooth 5.2, which must not be confused with UWB. Do not require UWB for a base-Pixel-7 population.
Check capability at runtime even for a model normally expected to support it. [Google Pixel hardware specifications, Pixel 7 sections](https://support.google.com/pixelphone/answer/7158570?hl=en); [Android supported UWB devices and feature check](https://developer.android.com/develop/connectivity/uwb).

**Mixed iOS/Android is an interoperability task, not an assumption.** Apple's documented peer configuration uses Apple discovery tokens; third-party accessories use a separate accessory protocol/configuration. Android describes its own controller/controlee parameters and FiRa-compliant accessory requirements. These sources do not establish a turnkey Android-phone-to-iPhone peer session for this
app. That is an evidence limitation, not proof that every specialized interoperation route is impossible. Before selecting UWB, demonstrate the required phone pairs using supported public APIs and measure direction availability in the actual top-edge grip. [Apple peer/accessory setup](https://developer.apple.com/documentation/nearbyinteraction/initiating-and-maintaining-a-session);
[Android ranging parameters](https://developer.android.com/develop/connectivity/uwb).

### 5. Wi-Fi RTT and newer ranging APIs: useful range, usually the wrong geometry

Android Wi-Fi RTT measures distances to compatible access points or **Wi-Fi Aware peers**; it is not limited to fixed infrastructure. Android states that ranging to three or more access points can produce a multilaterated position typically accurate within **1–2 m**, using known or supplied AP coordinates. This is a positioning-system figure, not a universal single-peer distance or bearing
guarantee. The device and responder need the relevant FTM hardware; ordinary Wi-Fi connectivity is insufficient. [Android Wi-Fi RTT](https://developer.android.com/develop/connectivity/wifi/wifi-rtt).

A single phone-to-phone RTT result still gives distance, not opponent direction. A venue with known compatible APs can constrain position, but requires infrastructure and sufficient geometry, and meter-scale position error remains significant at duel separation. These are geometric consequences of the documented range API. This report does not establish an equivalent public mixed-platform peer RTT
workflow; the cited integration path is Android-specific, not a claim that Wi-Fi ranging is physically impossible on iOS.

Android 16's unified **Ranging** module covers UWB, Bluetooth Channel Sounding, Wi-Fi NAN RTT, and Bluetooth RSSI ranging, with runtime capability discovery and a ranging permission. An OS API supporting those technologies does not retroactively add their hardware to every phone or turn range-only observations into bearing.
[Android unified ranging](https://developer.android.com/develop/connectivity/ranging).

### 6. Bluetooth: distinguish RSSI, direction finding, and channel sounding

- **BLE RSSI:** received strength varies with the radio and environment. Bluetooth SIG cautions against treating absolute RSSI as a universal distance mapping. It can support presence/proximity or coarse trends, not a precise duel-aim bearing. Noisy scalar strength does not supply angle. [Bluetooth SIG, Distance and RSSI](https://www.bluetooth.com/blog/proximity-and-rssi/).
- **Bluetooth Direction Finding:** this is not ordinary RSSI scanning. Angle of Arrival requires a receiving antenna array and a special transmitted signal; Angle of Departure uses a transmitting antenna array and the corresponding signal-processing support. Do not assume a phone with a Bluetooth version number exposes those measurements to apps or contains the required role's hardware.
  [Bluetooth SIG Direction Finding](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/direction-finding/).
- **Bluetooth Channel Sounding:** uses phase-based ranging plus round-trip time for secure fine **distance** measurement. SIG describes early accuracy around ±20 cm, but says upgrades are manufacturer dependent and may require a new Bluetooth LE IC because this introduces a new PHY/protocol stack. It is not a software-only upgrade promised for existing phones, and accurate distance still is not
  bearing. Android 16's ranging API provides a supported route on capable hardware, not universal device support. [Bluetooth SIG Channel Sounding FAQ](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/channel-sounding/); [Android Ranging](https://developer.android.com/develop/connectivity/ranging).

**Recommendation:** BLE is useful for discovery/data exchange, but do not replace GPS-bearing logic with RSSI-based aiming. Consider newer radio ranging only after confirming the exact two-device capabilities and how direction will actually be obtained.

### 7. Inertial-only position: short relative orientation, not durable opponent tracking

Android documents an unavoidable offset in linear acceleration that needs calibration and explicitly allows game-rotation-vector reference drift. Apple offers relative attitude tracking, not a peer-position observation. [Android motion sensors](https://developer.android.com/develop/sensors-and-location/sensors/sensors_motion);
[Android game rotation vector](https://developer.android.com/develop/sensors-and-location/sensors/sensors_position#sensors-pos-gamerot); [Apple relative attitude](https://developer.apple.com/documentation/coremotion/cmattitudereferenceframe/xarbitraryzvertical).

**Derived limitation:** integrating an uncorrected constant acceleration bias `b` twice gives position error `0.5 * b * t²`; orientation error also leaks gravity into apparent translation. Initial position and velocity are additional unknowns. Two phones integrating their own accelerometers do not thereby acquire a common spatial frame or observe one another. Use inertial sensing for the short
relative-orientation task; use an external visual/radio reference for sustained position tracking.

## Practical decision

| Requirement                                                                  | Recommended direction                                      | What it explicitly does not promise                                                              |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Existing phones, players remain in place, preserve top-edge draw             | Per-round opponent-facing relative orientation calibration | Moving-opponent location, zero drift, automatic detection of a dishonest calibration             |
| Real moving target; camera-facing grip and visible target acceptable         | Known visual target / marker tracking                      | Tracking unseen motion or seeing around obstacles                                                |
| Moving phones; preserve arbitrary grip if cameras retain usable surroundings | Shared visual-inertial frame plus live peer poses          | Tracking an entire body from phone pose; operation with covered cameras                          |
| Controlled compatible hardware population                                    | UWB with checked distance **and direction** support        | Base Pixel 7 support; every iPhone/Android pair interoperating; reliable direction in every grip |
| Instrumented venue                                                           | Wi-Fi RTT or Bluetooth direction-finding infrastructure    | Infrastructure-free universal phone-to-phone aiming                                              |

This ordering is a product/engineering recommendation based on the evidence above, not a measured performance ranking. The simplest option that meets a **stationary** duel should not be presented as a substitute for a **moving-target** requirement.

## Limitations and follow-through

- No physical phones, magnetic environments, camera markers, UWB links, Wi-Fi RTT infrastructure, or Bluetooth ranging hardware were exercised for this external-source research. API documentation establishes feasibility and limitations, not the observed cause of these users' misses.
- Public native documentation evolves independently of Expo 54. Any future integration must select compatible native library/OS versions and verify hardware capabilities rather than copy the newest API unconditionally.
- GPS signal error, position age, compass category, compass callback delivery, pitch calibration, coordinate frames, and shot gating are separate possible contributors. External evidence alone cannot identify which rejected an actual shot.
- Before selecting a replacement, distinguish the intended product rule: **return to the stationary opponent's calibrated direction**, **aim at the opponent's current phone position**, or **hit a moving body region**. These require different observations; better distance measurement alone does not resolve that distinction.
- For practical device evaluation, first assess reference-axis correctness and stability through the real ready/draw sequence; then test translation, occlusion, stale data, and unavailable direction explicitly. Do not label unavailable sensing as evidence that the player physically aimed away.

## Primary sources

All sources were opened and read; search snippets were used only to locate official pages. Inline citations identify the claim supported by each source.

- [GPS.gov: GPS Accuracy](https://www.gps.gov/gps-accuracy)
- [Expo SDK 54: Location](https://docs.expo.dev/versions/v54.0.0/sdk/location/)
- [Expo SDK 54: DeviceMotion](https://docs.expo.dev/versions/v54.0.0/sdk/devicemotion/)
- [Google: Fused Location Provider](https://developers.google.com/location-context/fused-location-provider)
- [Android: Location accuracy](<https://developer.android.com/reference/android/location/Location#getAccuracy()>)
- [Apple: desired location accuracy](https://developer.apple.com/documentation/corelocation/cllocationmanager/desiredaccuracy)
- [Apple: heading versus course](https://developer.apple.com/documentation/corelocation/getting-heading-and-course-information)
- [Android: position sensors and game rotation vector](https://developer.android.com/develop/sensors-and-location/sensors/sensors_position)
- [Android: motion sensors](https://developer.android.com/develop/sensors-and-location/sensors/sensors_motion)
- [Apple: arbitrary-reference attitude](https://developer.apple.com/documentation/coremotion/cmattitudereferenceframe/xarbitraryzvertical)
- [Google: ARCore Augmented Images](https://developers.google.com/ar/develop/augmented-images)
- [Apple: image tracking](https://developer.apple.com/documentation/arkit/arimagetrackingconfiguration)
- [Apple: camera transform](https://developer.apple.com/documentation/arkit/arcamera/transform)
- [Apple: world tracking](https://developer.apple.com/documentation/arkit/understanding-world-tracking)
- [Google: cross-platform Cloud Anchors](https://developers.google.com/ar/develop/cloud-anchors)
- [Android: UWB](https://developer.android.com/develop/connectivity/uwb)
- [Android: nullable UWB position measurements and angular frame](https://developer.android.com/reference/kotlin/androidx/core/uwb/RangingPosition)
- [Apple: Nearby Interaction session setup](https://developer.apple.com/documentation/nearbyinteraction/initiating-and-maintaining-a-session)
- [Google: Pixel hardware specifications](https://support.google.com/pixelphone/answer/7158570?hl=en)
- [Android: Wi-Fi RTT](https://developer.android.com/develop/connectivity/wifi/wifi-rtt)
- [Android: unified ranging](https://developer.android.com/develop/connectivity/ranging)
- [Bluetooth SIG: RSSI limitations](https://www.bluetooth.com/blog/proximity-and-rssi/)
- [Bluetooth SIG: Direction Finding](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/direction-finding/)
- [Bluetooth SIG: Channel Sounding](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/channel-sounding/)

[repo-packages]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/package-lock.json
[repo-duel]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/duel/DuelScreen.tsx#L606-L739
[repo-calibration]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/duel/DrawCalibrationScreen.tsx#L98-L260
[repo-pose]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/duel/calibrationPose.ts#L3-L46
[repo-clock]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/duel/clockOffsetCalibrator.ts#L11-L59
[repo-preround]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/duel/PreRound.tsx#L458-L621
[repo-tracking]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/duel/useAimTracking.ts
[repo-rounds]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/duel/roundShots.ts#L49-L108
[repo-pitch]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/duel/pitchZoneClassifier.ts#L15-L50
[repo-motion]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/duel/pitchMonitor.ts#L94-L140
[repo-aim]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/duel/aimBearing.ts
[repo-instructions]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/duel/GameInstructionsScreen.tsx#L14-L16
[repo-schema]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/contracts/matchAnalytics.ts#L43-L88
[repo-analytics]: https://github.com/pix-l-crafters/pocket-draw/blob/13b9b34c842c9698818b0b2bf114baee60d984fd/src/features/backend/matchAnalytics.ts#L106-L146
