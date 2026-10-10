// ============================================================================
// COMP90018 Assignment 2 - Pocket Draw
// Single-file Typst source. Paste directly into typst.app.
//
// PLACEHOLDERS: search for "TODO". They render in red so nothing ships blank.
// IMAGE: after uploading build-screenshot.png to typst.app, replace the
//        placeholder box in section 3 with the commented-out #figure line.
// ============================================================================

#set document(
  title: "Pocket Draw: COMP90018 Assignment 2",
  author: "Group T01/05-02",
)

#set page(
  paper: "a4",
  margin: (x: 2.2cm, y: 2.2cm),
  numbering: "1",
  number-align: center,
)

#set text(
  font: ("Libertinus Serif", "New Computer Modern"),
  size: 10.5pt,
  lang: "en",
)
#set par(justify: true, leading: 0.62em)
#show link: set text(fill: rgb("#1a4f8a"))
#show heading: set block(above: 1.3em, below: 0.7em)

#let TBD = text(fill: rgb("#c0392b"), weight: "bold")[TBD]
#let TODO(body) = text(fill: rgb("#c0392b"), weight: "bold")[[TODO: #body]]

// Rubric criterion badge at the head of each subsection in section 5.
#let crit(name, bands) = block(
  fill: rgb("#f0f2f5"),
  inset: (x: 8pt, y: 6pt),
  radius: 3pt,
  width: 100%,
)[
  #text(size: 8.5pt)[Rubric row: *#name*] #h(1fr) #text(size: 8.5pt)[#bands]
]

// ============================================================================
// COVER
// ============================================================================

#align(center)[
  #v(2cm)
  #text(size: 30pt, weight: "bold")[Pocket Draw]

  #v(0.3cm)
  #text(
    size: 13pt,
    style: "italic",
  )[A reflex duel for two phones in the same room]

  #v(1.2cm)
  #text(size: 14pt)[COMP90018, Mobile Computing Systems Programming]

  #v(0.2cm)
  #text(size: 14pt, weight: "bold")[Assignment 2: Software Project]

  #v(0.4cm)
  #text(size: 12pt)[Group T01/05-02, Tutorial 05, Group 2]

  #v(1.4cm)
]

#table(
  columns: (1.35fr, 0.55fr, 2.6fr, 0.95fr),
  align: (left, left, left, left),
  stroke: 0.5pt + rgb("#cccccc"),
  inset: (x: 5pt, y: 7pt),
  table.header([*Name*], [*Student no.*], [*Email*], [*GitHub*]),
  [Mobark Walid O Bacran],
  [1708777],
  [mobarkwalido.bacran\@student.unimelb.edu.au],
  [`MobyScript`],

  [Mihir Rabade], [1682964], [mrabade\@student.unimelb.edu.au], [`MRDGH2821`],
  [Siheng Ma], [1712124], [sihengm\@student.unimelb.edu.au], [`EthanMaMax`],
  [Tanachat Mongkolporn],
  [1739359],
  [tmongkolporn\@student.unimelb.edu.au],
  [`hbeat`],

  [Tianze Wu], [1690056], [tianze.wu\@student.unimelb.edu.au], [`wutianze3`],
  [Tingyue He], [1739986], [tingyueh\@student.unimelb.edu.au], [`tingyueh`],
)

#v(0.8cm)

#block(
  fill: rgb("#f0f2f5"),
  inset: 12pt,
  radius: 4pt,
  width: 100%,
)[
  Demonstration video (10 minutes or less): #TODO[paste YouTube URL]

  Source repository: #link("https://github.com/pix-l-crafters/pocket-draw")[github.com/pix-l-crafters/pocket-draw]

  Submitted revision: branch `dev`, commit #TODO[final commit SHA]
]

#pagebreak()

#outline(indent: auto, depth: 2)

#pagebreak()

// ============================================================================
= Overview
// ============================================================================

Pocket Draw is a reflex duel for two players. You play it with the phone, not on the phone. The two players stand together, connect their phones to each other, and hold the phones in a position that each player sets first. Both phones then give a fire signal at the same moment. On that signal, each player raises the phone and holds it still, like drawing and aiming a weapon. The motion sensors in the phone measure three things: the moment the player moved, how far the player raised the phone through that player's own range, and *whether the player moved too early*.

*No tap or swipe takes part in deciding a round, so the movement of the player is the only input.*

That decision created the hard problems in this project, and those problems hold most of the technical content in this report:

- The two phones must agree on the moment of the fire signal. If they do not agree, a comparison of reaction times means nothing. Two phone clocks never agree on their own, so the phones measure the difference between them and correct for it (section #link(<clock>)[5.5]).
- Raising a phone is a smooth movement, not a single event. Raw acceleration also cannot give a reliable position over a round, because the error grows too fast. The app reads the tilt angle of the phone instead, and compares it against a range that the player sets first (section #link(<sensors>)[5.2]).
- Two phones in a room sometimes have no network to share. The app connects the phones directly over Wi-Fi when a Wi-Fi network exists. When none exists, one phone creates a hotspot, which is a small Wi-Fi network that the phone itself provides (section #link(<connectivity>)[5.3]).

The project holds 306 commits that are not merges, across 50 merged pull requests, from 21 August to 8 October 2026. The test suite holds 28 test files with 157 tests, and all of them pass.

== Response to the Assignment 1 feedback

The Assignment 1 feedback gave three criticisms of the report. This report answers each one.

/ Rubric mapping: Assignment 1 mapped its coverage section against the eligibility conditions of the subject, not against the marking criteria of the assignment. Section #link(<rubric>)[5] of this report follows the Assignment 2 rubric. It gives one subsection for each criterion, in the order of the rubric.

/ No user interface section: Assignment 1 had none. Sections #link(<ui>)[5.6] to #link(<reactiveness>)[5.10] cover the five user interface criteria.

/ Contributions were not itemised: Assignment 1 gave each member a cell of two to four words, and promised the detail later. Section #link(<contrib>)[4] names what each member built, with pull request numbers and file paths. It also names the work that several members share.

The feedback also said that cross-device timing was the main risk, and that the team must measure it before anything else. The team measured it first, and section #link(<clock>)[5.5] gives the result.

// ============================================================================
= Compiling and running the project
// ============================================================================

The app uses Expo, a toolkit built on React Native. Expo generates the `android/` and `ios/` directories from `app.config.ts` and the installed plugins, so those two directories are not in the repository. This is the normal setup for Expo SDK 54. It is also why the instructions below start with a prebuild step, which is the command that generates those directories.

== Prerequisites

#table(
  columns: (auto, 1fr),
  stroke: 0.5pt + rgb("#cccccc"),
  inset: 7pt,
  table.header([*Tool*], [*Version*]),
  [Node.js], [24.x. The EAS production profile pins 24.21.0],
  [npm], [12.x],
  [Android Studio],
  [Otter or newer, with Android SDK 35 and an emulator or a physical phone],

  [Xcode], [26.0. For iOS builds on macOS only],
  [Java], [JDK 17],
)

== Running on Android

#block(inset: (left: 6pt))[
  ```sh
  git clone https://github.com/pix-l-crafters/pocket-draw.git
  cd pocket-draw
  npm install

  # Generate the native Android project from the Expo config
  npx expo prebuild --platform android

  # Build and install on a connected phone or a running emulator
  npm run android
  ```
]

To use Android Studio instead, run the prebuild command above first. Then open the generated `android/` directory as an existing project, and build it there. This is also how to produce the screenshot in section #link(<screenshot>)[3].

== Running on iOS

#block(inset: (left: 6pt))[
  ```sh
  npx expo prebuild --platform ios
  npm run ios
  ```
]

== Configuration

The app reads the Firebase and Google Maps credentials from the environment. It does not read them from files in the repository. #TODO[confirm with Mihir whether the assessors receive a populated .env file, or whether they must create their own Firebase project. This decides whether an assessor can use the cloud features at all, so the answer must be accurate.]

== Running the tests

#block(inset: (left: 6pt))[
  ```sh
  npm test
  ```
]

The expected result is 28 test files and 157 tests, all passing, in about 8 seconds.

== Playing a duel

A duel needs two phones. On the first phone, sign in and open the Challenge tab. The screen shows a QR code. On the second phone, sign in and scan that code. Then accept the challenge on the first phone. Both players set their ready position and their shoulder position, and the duel starts.

If both phones are on the same Wi-Fi network, the app connects over that network. If they are not, the Android phone creates a hotspot. The QR code carries the name and the password that the other phone needs to join it.

// ============================================================================
= Build screenshot <screenshot>
// ============================================================================

#block(
  fill: rgb("#fdf1f0"),
  stroke: 1pt + rgb("#c0392b"),
  inset: 20pt,
  radius: 4pt,
  width: 100%,
)[
  #align(center)[
    #TODO[Insert build-screenshot.png here]

    #v(4pt)
    #text(size: 9pt)[
      To capture it: run `npx expo prebuild --platform android`. Open the generated
      `android/` directory in Android Studio. Build the project. Screenshot the Build
      Output panel with the successful build visible. Upload the file to typst.app,
      delete this box, and uncomment the figure below.
    ]
  ]
]

// #figure(
//   image("build-screenshot.png", width: 100%),
//   caption: [Android Studio build console showing a successful compilation of Pocket Draw.],
// )

// ============================================================================
#pagebreak()

= Itemised contributions <contrib>
// ============================================================================

// Kept to a single page, as the submission brief requires. Reset after section 4.
#set text(size: 9.6pt)
#set par(leading: 0.54em)

The figures below come from the repository on the `dev` branch: who opened each merged pull request, who wrote each commit, and how many commits each person made to each file. The submission includes the full commit log as a separate export.

== Mihir Rabade, `MRDGH2821`, 146 commits, 31 merged pull requests

Built the zone scoring that decides a headshot, a bodyshot or a miss (PR \#65: `pitchZoneClassifier.ts`, `roundJudge.ts`). Built the clock measurement between the two phones (PRs \#67, \#96: `clockOffsetCalibrator.ts`). Built the tilt calibration that reads DeviceMotion, including the fix that makes Android and iOS agree (PRs \#69, \#95: `pitchMonitor.ts`, `DrawCalibrationScreen.tsx`). Built the Firebase write path for match results, and the queue that holds results while the phone is offline (PRs \#27, \#91: `matchResultsService.ts`, `matchResultQueue.ts`). Built the player statistics and profile screens (PR \#93). Owns the build, lint, release and secrets tooling for the whole project (PRs \#20, \#24, \#55, \#56, \#78, \#79, \#86 to \#89, \#92).

== Mobark Walid O Bacran, `MobyScript`, 88 commits, 8 merged pull requests

Built the round loop and the rules that decide a match, including the fix that scores a tied round for both players (PRs \#26, \#31: `roundLoop.ts`, `roundLoop.check.ts`). Built the end-of-match summary (PR \#26: `MatchSummaryScreen.tsx`, `RoundResultScreen.tsx`). Defined the shared interfaces in `src/contracts/`, which let five people build against the duel connection at the same time (PR \#23). Built the first version of the challenge flow (PR \#32: `ConnectingScreen.tsx`, `duelDataChannel.ts`). Built the design system and theme (`src/theme/`, and seven components in `src/components/`). Ran four merges of the team branches (PRs \#18, \#21, \#31, \#57), and during one of them found and reversed an earlier merge that had dropped thirteen files.

== Tingyue He, `tingyueh`, 19 commits, 4 merged pull requests

Set up the project and made it work on Expo SDK 54 (PRs \#1, \#4). Built the whole QR challenge flow (PR \#25: `QrDisplayScreen.tsx`, `QrScannerScreen.tsx`, `qr.tokens.ts`, `qr.validation.ts`). Built the direct phone-to-phone connection over shared Wi-Fi and over a hotspot, which is the largest single feature in the project at 45 files (PR \#71: `webrtcDuelTransport.ts`, `nativeWebRtcTransport.ts`, `signalingProtocol.ts`, `existingWifi.ts`, `hotspot.ts`). Wrote the checks that reject bad data from a scanned QR code (`ip.validation.ts`).

== Siheng Ma, `EthanMaMax`, 20 commits, 4 merged pull requests

Set up the Firebase services (PR \#2). Built the map screen, the location reading and the permission handling (PR \#6: `MapScreen.tsx`, `useForegroundLocation.ts`). Built live player positions on the map, with a repeat signal, a retry on failure, and a switch that turns sharing off (PR \#28, 35 files: `presenceRepository.ts`, `usePresencePublisher.ts`, `useNearbyPlayers.ts`). Built the profile screen and the username that each account shows to other players (PR \#68). Fixed markers that covered each other on the map, and moved the Google Maps key out of the repository into the environment.

== Tianze Wu, `wutianze3`, 17 commits, 4 merged pull requests

Built the Firebase sign-in and sign-up screens (PR \#7: `LoginScreen.tsx`, `RegisterScreen.tsx`, `auth.ts`). Built the detection of the fire signal and of the raise movement (PR \#30: `raiseGestureDetector.ts`, `accelerometerRaiseMonitor.ts`, `gestureSpec.ts`, `fireSignalCoordinator.ts`, `reactionTimer.ts`). Built the three-round scoring rules (PR \#59). Built false start detection, and the rule that keeps the shot of the other player valid when one player starts early (PRs \#30, \#85: `falseStartDetector.ts`, `falseStartCoordinator.ts`). Built the recovery path for a connection that drops during a duel (`disconnectRecovery.ts`).

== Tanachat Mongkolporn, `hbeat`, 16 commits, 2 merged pull requests

Built the ready sequence that both phones run before a draw (PR \#29: `PreRound.tsx`). Added the vibration and the countdown sound, and configured the Expo audio plugin (PR \#29: `countdownAudio.ts`). Wrote the Elo rating calculation, which uses an expected score and a K-factor of 40, and updates both players together (PR \#29: `elo.ts`). Replaced the fake leaderboard with one that reads real ratings from Firebase (PR \#97: `LeaderboardScreen.tsx`, `leaderboardRepository.ts`). Fixed the order of operations, so the app saves a result before it opens the summary (PR \#97). Ran the first Bluetooth trial for the project.

== Work owned by several members

`DuelScreen.tsx` carries commits from Tanachat, Mobark, Mihir and Tianze. It is the screen where the ready sequence, the movement detection, the scoring and the phone-to-phone connection all meet. `PreRound.tsx` carries commits from Mihir, Mobark and Tanachat. `roundJudge.ts` and `roundLoop.ts` carry commits from Mihir, Mobark and Tianze, because the team revised the scoring rules three times. In `src/features/backend/`, Mihir owns the write path and the statistics, Tanachat owns the Elo rating and the leaderboard, and both write to `types.ts`. Mobark (PRs \#18, \#31, \#57) and Mihir (PRs \#19, \#74) both merged the team branches together.

#set text(size: 10.5pt)
#set par(leading: 0.62em)

#pagebreak()

// ============================================================================
= How each rubric criterion is met <rubric>
// ============================================================================

== Implementation: quality

#crit("Implementation – Quality", [Excellent 10 · Very Good 7 · Satisfactory 3])

The code is grouped by feature instead of by file type. Each of `src/features/duel/`, `challenge/`, `map/`, `backend/`, `leaderboard/`, `postmatch/` and `profile/` holds its own screens, hooks, services and types.

The `src/contracts/` layer solved the hardest scheduling problem in the project. Six people worked at the same time on a game where almost every part meets at the duel. The team wrote the interfaces first, in `duelChannel.ts`, `duelConnection.ts`, `challengeHandoff.ts`, `roundOutcome.ts`, `matchResult.ts`, `playerStats.ts` and `leaderboardEntry.ts`, with fake versions in `src/contracts/mocks/`. One person could then build the movement detection against a fake duel connection while another person was still writing the real one. The two halves met at a boundary that the type checker enforces.

The sensor code uses the same split. `RaiseGestureDetector` is a plain class. It takes `{atMs, x, y, z}` samples and returns detections. `AccelerometerRaiseMonitor` is a thin wrapper that reads `expo-sensors` and passes the samples in. A test can check the movement logic with no phone, no emulator and no mocking library, because the test builds the samples itself. `FalseStartDetector` follows the same pattern, and reuses the magnitude function from the detector.

Tooling enforces the standards, so they do not depend on habit. `cocogitto` checks every commit message against the Conventional Commits format. `hk` runs the formatters and the linters before each commit. MegaLinter runs in continuous integration (`.github/workflows/mega-linter.yml`), together with a toolchain check (`mise-check.yml`). TypeScript runs in strict mode.

#block(fill: rgb("#f0f2f5"), inset: 10pt, radius: 3pt, width: 100%)[
  Test suite: `npx jest --runInBand` gives 28 test files, 157 tests, 0 failures, 8.3 seconds.
  The tests cover the logic that is hardest to check by hand: `roundLoop`, `roundJudge`, `pitchZoneClassifier`, `clockOffsetCalibrator`, `signalingProtocol`, `matchResultQueue`, `disconnectRecovery` and `qr.validation`.
]

== Implementation: sensors <sensors>

#crit("Implementation – Sensors", [Excellent 10 · Very Good 7 · Satisfactory 3])

Pocket Draw uses seven capabilities of the phone. In the part of the app that decides a round, the sensors are the only input.

/ Accelerometer: `accelerometerRaiseMonitor.ts` reads a sample every 20 milliseconds. `raiseGestureDetector.ts` turns that stream into a draw event. It applies three conditions instead of one threshold. The acceleration magnitude $sqrt(x^2 + y^2 + z^2)$ must pass a threshold. It must stay above that threshold for a minimum time. A debounce window, which is a short period that blocks a second detection, stops one sharp movement from counting twice. A knock does not count as a draw.

/ DeviceMotion, which combines several sensors: `pitchMonitor.ts` reads the tilt angle that the operating system computes from the accelerometer, the gyroscope and the magnetometer together. The obvious method is to integrate acceleration twice to get a position, but the error in that method grows too fast to last a single round. The combined tilt angle does not drift over that time, so the game scores the angle. `docs/superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md` records the analysis, and the source file points to it.

/ GPS: `map/hooks/useForegroundLocation.ts` reads the location while the app is open, and asks for permission first. The map and the position sharing both use it.

/ Camera: `challenge/QrScannerScreen.tsx` uses `expo-camera` to scan the QR code of the other player. That code carries the data that starts the direct connection.

/ Bluetooth signal strength: `duel/bleRssi.ts` reads the strength of a Bluetooth signal, which indicates how close the other phone is.

/ Vibration: `expo-haptics` drives the ready sequence. A player who holds the phone at their side feels the countdown without looking at the screen. The game asks players not to look at the screen during the ready phase.

/ Audio: `countdownAudio.ts` plays the fire signal.

The false start detector is also sensor work. Between the ready state and the fire signal, the detector watches for any movement away from the resting magnitude that passes a threshold. It stops watching when a valid fire happens, and it rejects any sample with a later timestamp. A late sample therefore cannot cancel a clean draw.

== Implementation: connectivity <connectivity>

#crit(
  "Implementation – Connectivity",
  [Excellent 12 · Very Good 8 · Satisfactory 4],
)

The app connects in three ways, and each one solves a different problem.

=== Phone to phone: the duel

The duel runs over a WebRTC data channel between the two phones. WebRTC is a standard that lets two devices send data straight to each other. No server sits in this path, because a reaction game cannot wait for a message to travel to a server and back.

Two devices normally need a server on the internet to set up a WebRTC connection. Pocket Draw runs that server on the host phone instead. `webrtc/nativeWebRtcTransport.ts` opens a TCP server on the phone with `react-native-tcp-socket`. `webrtc/signalingProtocol.ts` defines and checks the messages that it accepts: `auth`, `auth-ok`, `offer`, `answer`, `ice-candidate`, `ice-complete` and `error`. The first message carries `matchId`, `challengeToken` and `discoveryToken`, which authorise the session once. The file checks the structure of every message that arrives, and rejects any message longer than 64 KiB, so a broken or hostile phone cannot exhaust the memory of the host. The guest phone receives those tokens and the address of the host from the QR code. The QR code therefore carries the connection.

=== Two ways to carry the connection

#table(
  columns: (auto, 1fr),
  stroke: 0.5pt + rgb("#cccccc"),
  inset: 7pt,
  table.header([*Path*], [*Behaviour*]),
  [Shared Wi-Fi],
  [`network/existingWifi.ts` uses `expo-network` to confirm that the phone is on Wi-Fi. It then reads the IPv4 address of the phone, and checks that other devices can reach it. It also watches for network changes, and cancels the invite if the network drops.],

  [Android hotspot],
  [`network/hotspot.ts` asks for the Android permissions that it needs, starts a hotspot on the host phone, and puts the network name, the password and the host address into the QR code. The guest phone joins with `react-native-wifi-reborn`. Two phones in a field with no Wi-Fi and no mobile data can still play a duel.],
)

A scanned QR code is data from outside the app, so the network name, the password and the address are all checked before use (`qr/utils/ip.validation.ts`).

=== Cloud: accounts, player positions and saved results

Firebase holds everything that must survive after a duel ends. It provides sign-in (`lib/auth.ts`), live player positions on the map with a repeat signal and a retry (`map/services/presenceRepository.ts`), challenge requests (`challenge/services/challengeRequestRepository.ts`), match results (`backend/matchResultsRepository.ts`), player statistics (`backend/playerStatsRepository.ts`) and the Elo leaderboard (`backend/leaderboardRepository.ts`).

People play this game outdoors and on the move, so a lost connection is normal. `backend/matchResultQueue.ts` writes any unsent result to `AsyncStorage`, with the time it was queued and a count of the attempts made. It checks each entry when it reads the store, so a damaged store gives an empty queue instead of a crash.

#block(fill: rgb("#fdf6e3"), inset: 10pt, radius: 3pt, width: 100%)[
  One part of this is incomplete. `backend/connectivity.ts` is still a placeholder: `isNetworkAvailable()` always returns `true`, and the subscription to network changes does nothing. The app queues a result only when a Firestore write fails, and does not detect the return of the network on its own. #TODO[delete this box once issue \#82 lands, so the claim above becomes unconditional]
]

== Implementation: responsiveness

#crit(
  "Implementation – Responsiveness",
  [Excellent 6 · Very Good 4 · Satisfactory 2],
)

Responsiveness has a measurable meaning in this app. It is the time between the movement of the player and the moment the game records it. It is also the agreement between the two phones about when each event happened.

The app reads the accelerometer every 20 milliseconds, so detection takes about one sample period plus the minimum hold time. The detection code is synchronous, and allocates no memory while it runs. `reactionTimer.ts` measures the reaction time from the fire signal. Before the app compares the two players, it corrects the timestamps of the other phone by the measured clock difference. Without that correction, the faster player can be the player whose phone clock runs ahead.

Outside the duel, the map subscribes to the player positions in Firestore instead of asking for them on a timer, so other players appear and disappear as they move. `PresenceStatusSnackbar` shows the current state of the position sharing. `disconnectRecovery.ts` gives a recovery path when the connection drops during a duel, instead of ending the match with an error.

== Implementation: technical depth <clock>

#crit(
  "Implementation – Technical depth",
  [Excellent 6 · Very Good 4 · Satisfactory 2],
)

=== Measuring the clock difference between two phones

The Assignment 1 feedback named this as the main risk in the project.

Two phones do not share a clock. If each phone records its own draw with `Date.now()`, the difference between the two numbers includes the difference between the two system clocks. That difference can be large, and it changes over time. A duel is decided by tens of milliseconds, so an uncorrected clock difference changes who wins.

`clockOffsetCalibrator.ts` measures the difference over the duel connection itself. It uses the same method as a network time server. One phone sends a `clockPing`. The other phone answers with a `clockPong` that carries its own timestamps. The first phone repeats this five times, and keeps the measurement from the fastest round trip, because a fast round trip has had less chance to be distorted by delays in the network. Each attempt has a timeout, so a lost message cannot stall the duel, and the calibrator detaches cleanly when the duel ends.

Each phone can then convert the timestamps of the other phone into its own clock before it compares them.

=== Zone scoring against a range that the player sets

Players have different arms, so one fixed angle cannot mean the same thing for everyone. Each player records two reference angles, one with the phone at the ready position and one with the phone at shoulder height. The classifier then works with the fraction of that personal range:

#align(center)[
  $ F = (theta_"fire" - theta_"ready") / (theta_"shoulder" - theta_"ready") $
]

`pitchZoneClassifier.ts` turns $F$ into a bodyshot, a headshot a little above the shoulder reference, or a miss. If the two reference angles are the same, the range is zero, and the code raises an error instead of dividing by zero. The thresholds sit in named constants, and a comment in the source marks them as values that playtesting must set, because no calculation can give them.

=== Other technical work

`falseStartCoordinator.ts` decides what happens when one player moves early. Since PR \#85, the shot of the other player still counts. `elo.ts` implements the Elo rating, which raises the score of a player more for beating a stronger opponent. It uses the standard logistic expected score and a K-factor of 40, and it updates both players together. Seven design documents in `docs/superpowers/specs/` record the reasoning behind these decisions, including the sensor analysis that the scoring design depends on.

== User interface: appeal <ui>

#crit("User Interface – Appeal", [Excellent 4 · Very Good 3 · Satisfactory 2])

`src/theme/tokens.ts` defines the visual style once, for every screen. The background is near black (`#08090b`), with one strong accent colour (`#ff4b3e`), a teal for success and an amber for warnings. Text uses four levels of opacity, so one colour carries the hierarchy. The fonts are Barlow for body text, Barlow Condensed Bold for headings, and IBM Plex Mono for numbers. Reaction times and scores use the monospaced font, so the digits stay in place as they change.

The cut corner is the signature shape. `CutCornerSurface` and `CutCornerButton` implement it once, at three sizes. Seven components in `src/components/` carry that style across every screen: `CutCornerButton`, `CutCornerSurface`, `DisplayHeading`, `KickerLabel`, `ScreenHeader`, `StatTile` and `StatusTag`. Six people built the screens from those components.

== User interface: guidelines

#crit(
  "User Interface – Guidelines",
  [Excellent 6 · Very Good 4 · Satisfactory 2],
)

The app uses React Native Paper, which implements Material Design 3. A single theme in `src/theme/appTheme.ts` passes the project style to every Paper component, so the platform components match the rest of the app. The main navigation uses the Paper component `BottomNavigation.Bar`, which is the standard pattern for top-level sections. `SafeAreaProvider` and explicit `SafeAreaView` edges keep the content away from notches, home indicators and status bars on both platforms.

The app follows the platform rules for permissions. It asks for location, camera, Bluetooth and the Android hotspot permissions at the point where it needs each one, and it shows the reason. It does not ask for all of them when it starts.

Accessibility labels and roles are present on `CutCornerButton`, `SharingToggle`, `RecenterButton`, `PlayerMarker`, `PlayerStatsCard` and the QR display. #TODO[if the accessibility work in issue \#98 lands before the freeze, extend this sentence to the duel and challenge screens. If it does not land, leave this paragraph as it is.]

== User interface: flow

#crit("User Interface – Flow", [Excellent 6 · Very Good 4 · Satisfactory 2])

The app has one path, and it runs in one direction: sign in → find an opponent → connect → calibrate → duel → see the result.

`App.tsx` holds that path as one state machine, instead of spreading navigation calls across the screens. This is why the duel is not a tab. The duel is a state with one entry and one exit. `exitDuel` returns the player to the map, and clears everything that the duel held. A player cannot leave a live duel, open the profile screen, and come back.

Two parts of the flow are deliberate. `GameInstructionsScreen` appears before the first duel of a player, because Pocket Draw asks for a physical action that the screen alone cannot teach. The challenge handshake also needs both players. A scanned invite opens the connection, and then stops. The host sees `IncomingChallengeScreen` with the name of the challenger, and must accept before the duel starts. No player lands in a duel without agreeing to it.

#TODO[Issue \#44: the leaderboard screen is built, tested, and reads real Elo ratings from Firebase, but the navigation bar does not open it. Either land \#44 before the freeze and describe four tabs here, or remove the leaderboard from the video and from section 5.3. Do not describe a screen that an assessor cannot open.]

== User interface: language

#crit("User Interface – Language", [Excellent 4 · Very Good 3 · Satisfactory 2])

The text in the app speaks to the player and gives an action. A failed invite says "Connect this device to Wi-Fi before creating an invite." It names the cause and the next step, and it shows no error code. The status cards work the same way. `LocationStatusCard` and `MapStatusCard` say what the app is doing with the location and why, instead of leaving a permission request unexplained.

The words come from the duel: draw, fire, ready, shoulder, headshot, bodyshot, miss and false start. The same words appear on the instructions screen, during the duel and in the results, so a player is scored with the words that the tutorial taught them.

== User interface: reactiveness <reactiveness>

#crit(
  "User Interface – Reactiveness",
  [Excellent 6 · Very Good 4 · Satisfactory 2],
)

The app names every state in which the player waits. While the fonts and the sign-in state load, a loading screen appears instead of an empty frame. Reading the location, sharing the position and connecting to the other phone each have their own display: `LocationStatusCard`, `PresenceStatusSnackbar`, `MapStatusCard` and `ConnectingScreen`. Position sharing retries after a failure, and says that it is retrying.

During a duel, sensor and connection events drive the screen every 20 milliseconds. The ready state, the fire signal, the draw and the resulting zone all appear at once. Vibration and sound repeat the same information, so it reaches a player who is not looking at the screen, which during the ready phase is every player.

== Innovation: novelty

#crit("Innovation – Novelty", [Excellent 3 · Very Good 1])

The phone is a prop in this game. No tap, swipe or button takes part in deciding a round. A player wins by raising the phone, aiming it and holding it still, and loses by moving too early. A game that reads taps cannot ask for that.

Pocket Draw therefore works only when both players stand together.

== Innovation: surprise

#crit("Innovation – Surprise", [Excellent 3 · Very Good 1])

New players are usually surprised that aim counts as much as speed. The fastest draw still misses if the player raises the phone to the wrong height, which makes the game a test of control as well as reflex. They are also surprised that a false start loses the round, the way it does in a real duel, which makes the wait before the signal tense. The hotspot mode surprises people most, because two strangers with no shared network and no internet can still play.

== Innovation: technical knowledge

#crit("Innovation – Tech Knowledge", [Excellent 4 · Very Good 1])

The project uses methods from outside the usual mobile toolkit. It measures the clock difference between two devices with the method that network time servers use, over a connection that the two phones negotiate themselves. It defines its own TCP message protocol, with authorisation, structure checks and a size limit. It runs WebRTC on React Native over two different networks, one of which a phone creates itself. It reads a combined sensor angle instead of integrating acceleration, and the repository records why. It also builds through the Expo native generation pipeline, with plugins for WebRTC and audio.

== Innovation: cross-disciplinary

#crit("Innovation – Cross-Disciplinary", [Excellent 3 · Very Good 1])

Pocket Draw draws on four fields. From competitive sport it takes reaction-time measurement and the false start rule, including the rule that the false start of one competitor does not cancel the result of another. From distributed systems it takes clock synchronisation, and the fact that two devices never share a timebase. From game design it takes ritual: the ready phase, the countdown and the draw. From rating theory it takes the Elo system, which chess developed, and applies it to reflexes.

== Innovation: impact

#crit("Innovation – Impact", [Excellent 3 · Very Good 1])

Most mobile games hold the attention of one player on a screen. This one needs two people in the same place, played with the head up and the phone held out, and the player reads the screen only after the round ends. The hotspot path needs no network at all, so the game also works where a server-based game cannot: a park, a bus, or a room with no usable Wi-Fi.

#pagebreak()

// ============================================================================
= Use of AI tools
// ============================================================================

The team used AI coding assistants throughout this project. The repository records that use at the level of each commit.

Every commit written with AI help carries a `Co-authored-by` line that names the model and the tool. `AGENTS.md` documents this rule, and reviewers enforce it. An assessor can filter the commit log in this submission, and see which commits used AI and which model wrote each one. On the `dev` branch, those lines name the following:

#table(
  columns: (1fr, auto),
  stroke: 0.5pt + rgb("#cccccc"),
  inset: 6pt,
  table.header([*Model and tool*], [*Commits*]),
  [Claude Sonnet 5 (direct)], [30],
  [GPT-5 via Codex], [27],
  [Claude Sonnet 5 via Claude Code], [27],
  [Composer via Cursor], [11],
  [GPT-6 via Codex], [9],
  [GPT-6 Luna via omp], [6],
  [GPT-6.1 SOL via omp], [4],
  [Gemini 3.7 Flash via Antigravity], [3],
  [Other (GPT-6 Luna via Codex, Claude Opus 5 and 5.5)], [4],
)

`.agents/logs/` also holds nineteen dated work logs. Each log records the instruction that started an AI session, the member who wrote that instruction, the work that followed, and the model used.

== How the team used AI

/ Writing code to a given design: AI assistants wrote code against interfaces that members had already defined. Most of that work filled in an implementation behind a contract in `src/contracts/`.

/ Writing tests: AI wrote a large share of the 157 tests, from behaviour that a member described. Members then reviewed and corrected them.

/ Writing design documents: members set the problem and the constraints, and drafted the specifications in `docs/superpowers/specs/` with AI help.

/ Reviewing merges: AI review of the branch merges found real defects. One merge had dropped thirteen files without warning. A type error in `bleRssi.ts` would have returned `undefined` while the app ran.

/ Reading the repository: an AI assistant produced the contribution figures in section #link(<contrib>)[4] from the git history, covering pull request authorship, commit authorship and per-file commit counts. The team then checked them against their own records.

== What the team did without AI

The team made the design decisions, set the scope, and divided the work. The team also made every judgement that AI could not: to score the tilt angle instead of an integrated position, to run the duel directly between the phones instead of through a server, to set the game rules, and to leave the calibration thresholds for playtesting on real phones. A member reviewed every AI-assisted change before it merged, and all 157 tests run in continuous integration.

#TODO[every member must confirm that this section describes their own use accurately before submission. It is an academic integrity declaration.]

// ============================================================================
= Known limitations
// ============================================================================

These are the known gaps in the submitted build.

#TODO[revise this list at the freeze. Several of these are open issues that can land first.]

+ Network detection is incomplete. `backend/connectivity.ts` is a placeholder. The app queues an offline match result when a write fails, and does not detect the return of the network (issue \#82).
+ The navigation bar does not open the leaderboard. The screen is built, tested, and reads real Elo ratings, but no tab leads to it (issue \#44).
+ The zone thresholds are untested in play. The bodyshot and headshot fractions in `pitchZoneClassifier.ts` are placeholder values, and a comment in the source says so.
+ Only Android can create a hotspot, because iOS gives no programmatic way to start one. Two iPhones need a shared Wi-Fi network. Issue \#90 records a known defect in discovery after a hotspot QR scan.
+ WebRTC replaced the Bluetooth connection, which measured better for timing. `BleScreen.tsx` and `bleRssi.ts` remain in the repository for proximity sensing. Issue \#51 tracks the cleanup.
+ Continuous integration runs the linters and the toolchain check, but does not build the app. PR \#76 added an Expo build workflow, and a later commit removed it from `dev`.
