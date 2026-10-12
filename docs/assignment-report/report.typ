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
// Rubric criterion badge: hidden. Each section heading already names its criterion.
#let crit(name, bands) = none

// ============================================================================
// COVER
// ============================================================================

#align(center)[
  #v(2cm) #text(size: 30pt, weight: "bold")[Pocket Draw]

  #v(0.3cm) #text(
    size: 13pt,
    style: "italic",
  )[A reflex duel for two phones in the same room]

  #v(1.2cm) #text(size: 14pt)[COMP90018, Mobile Computing Systems Programming]

  #v(0.2cm) #text(size: 14pt, weight: "bold")[Assignment 2: Software Project]

  #v(0.4cm) #text(size: 12pt)[Group T01/05-02, Tutorial 05, Group 2]

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
  Demonstration video: #link("https://www.youtube.com/watch?v=SI0VlwdMGvs")[youtube.com/watch?v=SI0VlwdMGvs]

  Source repository: #link("https://github.com/pix-l-crafters/pocket-draw")[github.com/pix-l-crafters/pocket-draw]

]

#pagebreak()

#outline(indent: auto, depth: 2)

#pagebreak()

// ============================================================================


= Overview

// ============================================================================

Pocket Draw is a reflex duel for two players. You play it with the phone, not on the phone. The two players stand together, connect their phones to each other, and hold the phones in a position that each player sets first. Both phones then give a fire signal at the same moment.

On that signal, each player raises the phone and holds it still, like drawing and aiming a weapon. The motion sensors in the phone measure three things: the moment the player moved, how far the player raised the phone through that player's own range, and *whether the player moved too early*.

// *No tap or swipe takes part in deciding a round, so the movement of the player is the only input.*

That decision created the hard problems in this project, and those problems hold most of the technical content in this report:

- The two phones must agree on the moment of the fire signal. If they do not agree, a comparison of reaction times means nothing. Two phone clocks never agree on their own, so the phones measure the difference between them and correct for it (section #link(<clock>)[5.5]).
- Raising a phone is a smooth movement, not a single event. Raw acceleration also cannot give a reliable position over a round, because the error grows too fast. The app reads the tilt angle of the phone instead, and compares it against a range that the player sets first (section #link(<sensors>)[5.2]).
- Two phones in a room sometimes have no network to share. The app connects the phones directly over Wi-Fi when a Wi-Fi network exists. When none exists, one phone creates a hotspot, which is a small Wi-Fi network that the phone itself provides (section #link(<connectivity>)[5.3]).

The project holds 306 commits that are not merges, across 50 merged pull requests, from 21 August to 8 October 2026. The test suite holds 28 test files with 157 tests, and all of them pass.

// == Response to the Assignment 1 feedback

// The Assignment 1 feedback gave three criticisms of the report. This report answers each one.

// / Rubric mapping: Assignment 1 mapped its coverage section against the eligibility conditions of the subject, not against the marking criteria of the assignment. Section #link(<rubric>)[5] of this report follows the Assignment 2 rubric. It gives one subsection for each criterion, in the order of the rubric.

// / No user interface section: Assignment 1 had none. Sections #link(<ui>)[5.6] to #link(<reactiveness>)[5.10] cover the five user interface criteria.

// / Contributions were not itemised: Assignment 1 gave each member a cell of two to four words, and promised the detail later. Section #link(<contrib>)[4] names what each member built, with pull request numbers and file paths. It also names the work that several members share.

// The feedback also said that cross-device timing was the main risk, and that the team must measure it before anything else. The team measured it first, and section #link(<clock>)[5.5] gives the result.

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

Declarative setup:

Install #link("https://mise.jdx.dev/")[Mise] and follow the steps. The entire development environment as the team used will be provisioned.

1. Install Mise: https://mise.jdx.dev/installing-mise.html#installing-mise
2. Do shell setup: https://mise.jdx.dev/shell-setup.html
3. Run the following:

#block(inset: (left: 6pt))[
  ```sh
  mise trust
  mise install
  mise run android-setup
  mise run prepare
  ```
]


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


== Deploying to TestFlight

#block(inset: (left: 6pt))[
  ```sh
  eas build --platform ios --profile production
  eas submit --platform ios --profile production

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


== IOS build

#image("iOS expo prebuild.png") #block(
  fill: rgb("#f0f2f5"),
  inset: 10pt,
  radius: 3pt,
  width: auto,
)[
  mise run build-ios
] #image("build ios.png")


== Android build

#image("android expo prebuild.png") #block(
  fill: rgb("#f0f2f5"),
  inset: 10pt,
  radius: 3pt,
  width: auto,
)[
  mise run build-android-apk
] #image("build android.png") #figure(
  image("android studio build success.png", width: 100%),
  caption: [Android Studio build console showing a successful compilation of Pocket Draw.],
)

// ============================================================================
#pagebreak()


= Itemised contributions <contrib>

// ============================================================================

// Kept to a single page, as the submission brief requires. Reset after section 4.
#set text(size: 9.6pt)
#set par(leading: 0.54em)

// Need update
// The figures below come from the repository on the `dev` branch: who opened each merged pull request, who wrote each commit, and how many commits each person made to each file. The submission includes the full commit log as a separate export.

// == Mihir Rabade, `MRDGH2821`, 146 commits, 31 merged pull requests

// Built the zone scoring that decides a headshot, a bodyshot or a miss (PR \#65: `pitchZoneClassifier.ts`, `roundJudge.ts`). Built the clock measurement between the two phones (PRs \#67, \#96: `clockOffsetCalibrator.ts`). Built the tilt calibration that reads DeviceMotion, including the fix that makes Android and iOS agree (PRs \#69, \#95: `pitchMonitor.ts`, `DrawCalibrationScreen.tsx`). Built the Firebase write path for match results, and the queue that holds results while the phone is offline (PRs \#27, \#91: `matchResultsService.ts`, `matchResultQueue.ts`). Built the player statistics and profile screens (PR \#93). Owns the build, lint, release and secrets tooling for the whole project (PRs \#20, \#24, \#55, \#56, \#78, \#79, \#86 to \#89, \#92).

// == Mobark Walid O Bacran, `MobyScript`, 88 commits, 8 merged pull requests

// Built the round loop and the rules that decide a match, including the fix that scores a tied round for both players (PRs \#26, \#31: `roundLoop.ts`, `roundLoop.check.ts`). Built the end-of-match summary (PR \#26: `MatchSummaryScreen.tsx`, `RoundResultScreen.tsx`). Defined the shared interfaces in `src/contracts/`, which let five people build against the duel connection at the same time (PR \#23). Built the first version of the challenge flow (PR \#32: `ConnectingScreen.tsx`, `duelDataChannel.ts`). Built the design system and theme (`src/theme/`, and seven components in `src/components/`). Ran four merges of the team branches (PRs \#18, \#21, \#31, \#57), and during one of them found and reversed an earlier merge that had dropped thirteen files.

// == Tingyue He, `tingyueh`, 19 commits, 4 merged pull requests

// Set up the project and made it work on Expo SDK 54 (PRs \#1, \#4). Built the whole QR challenge flow (PR \#25: `QrDisplayScreen.tsx`, `QrScannerScreen.tsx`, `qr.tokens.ts`, `qr.validation.ts`). Built the direct phone-to-phone connection over shared Wi-Fi and over a hotspot, which is the largest single feature in the project at 45 files (PR \#71: `webrtcDuelTransport.ts`, `nativeWebRtcTransport.ts`, `signalingProtocol.ts`, `existingWifi.ts`, `hotspot.ts`). Wrote the checks that reject bad data from a scanned QR code (`ip.validation.ts`).

// == Siheng Ma, `EthanMaMax`, 20 commits, 4 merged pull requests

// Set up the Firebase services (PR \#2). Built the map screen, the location reading and the permission handling (PR \#6: `MapScreen.tsx`, `useForegroundLocation.ts`). Built live player positions on the map, with a repeat signal, a retry on failure, and a switch that turns sharing off (PR \#28, 35 files: `presenceRepository.ts`, `usePresencePublisher.ts`, `useNearbyPlayers.ts`). Built the profile screen and the username that each account shows to other players (PR \#68). Fixed markers that covered each other on the map, and moved the Google Maps key out of the repository into the environment.

// == Tianze Wu, `wutianze3`, 17 commits, 4 merged pull requests

// Built the Firebase sign-in and sign-up screens (PR \#7: `LoginScreen.tsx`, `RegisterScreen.tsx`, `auth.ts`). Built the detection of the fire signal and of the raise movement (PR \#30: `raiseGestureDetector.ts`, `accelerometerRaiseMonitor.ts`, `gestureSpec.ts`, `fireSignalCoordinator.ts`, `reactionTimer.ts`). Built the three-round scoring rules (PR \#59). Built false start detection, and the rule that keeps the shot of the other player valid when one player starts early (PRs \#30, \#85: `falseStartDetector.ts`, `falseStartCoordinator.ts`). Built the recovery path for a connection that drops during a duel (`disconnectRecovery.ts`).

// == Tanachat Mongkolporn, `hbeat`, 16 commits, 2 merged pull requests

// Built the ready sequence that both phones run before a draw (PR \#29: `PreRound.tsx`). Added the vibration and the countdown sound, and configured the Expo audio plugin (PR \#29: `countdownAudio.ts`). Wrote the Elo rating calculation, which uses an expected score and a K-factor of 40, and updates both players together (PR \#29: `elo.ts`). Replaced the fake leaderboard with one that reads real ratings from Firebase (PR \#97: `LeaderboardScreen.tsx`, `leaderboardRepository.ts`). Fixed the order of operations, so the app saves a result before it opens the summary (PR \#97). Ran the first Bluetooth trial for the project.

// == Work owned by several members

// `DuelScreen.tsx` carries commits from Tanachat, Mobark, Mihir and Tianze. It is the screen where the ready sequence, the movement detection, the scoring and the phone-to-phone connection all meet. `PreRound.tsx` carries commits from Mihir, Mobark and Tanachat. `roundJudge.ts` and `roundLoop.ts` carry commits from Mihir, Mobark and Tianze, because the team revised the scoring rules three times. In `src/features/backend/`, Mihir owns the write path and the statistics, Tanachat owns the Elo rating and the leaderboard, and both write to `types.ts`. Mobark (PRs \#18, \#31, \#57) and Mihir (PRs \#19, \#74) both merged the team branches together.

#set text(size: 10.5pt)
#set par(leading: 0.62em)

#pagebreak()

// ============================================================================


= How each rubric criterion is met <rubric>

// ============================================================================


= Implementation


== Implementation: quality

#crit("Implementation – Quality", [Excellent 10 · Very Good 7 · Satisfactory 3])

The code is grouped by feature instead of by file type. Each of `src/features/duel/`, `challenge/`, `map/`, `backend/`, `leaderboard/`, `postmatch/` and `profile/` holds its own screens, hooks, services and types.

The `src/contracts/` layer solved the hardest scheduling problem in the project. Six people worked at the same time on a game where almost every part meets at the duel. The team wrote the interfaces first, in `duelChannel.ts`, `duelConnection.ts`, `challengeHandoff.ts`, `roundOutcome.ts`, `matchResult.ts`, `playerStats.ts` and `leaderboardEntry.ts`, with fake versions in `src/contracts/mocks/`. One person could then build the movement detection against a fake duel connection while another person was still writing the real one. The two halves met at a boundary that the type checker enforces.

The sensor code uses the same split. `RaiseGestureDetector` is a plain class. It takes `{atMs, x, y, z}` samples and returns detections. `AccelerometerRaiseMonitor` is a thin wrapper that reads `expo-sensors` and passes the samples in. A test can check the movement logic with no phone, no emulator and no mocking library, because the test builds the samples itself. `FalseStartDetector` follows the same pattern, and reuses the magnitude function from the detector.

Tooling enforces the standards, so they do not depend on habit. `cocogitto` checks every commit message against the Conventional Commits format. `hk` runs the formatters and the linters before each commit. MegaLinter runs in continuous integration (`.github/workflows/mega-linter.yml`), together with a toolchain check (`mise-check.yml`). TypeScript runs in strict mode.

#block(fill: rgb("#f0f2f5"), inset: 10pt, radius: 3pt, width: 100%)[
  Test suite: `npx jest --runInBand` gives 28 test files, 157 tests, 0 failures, 8.3 seconds. The tests cover the logic that is hardest to check by hand: `roundLoop`, `roundJudge`, `pitchZoneClassifier`, `clockOffsetCalibrator`, `signalingProtocol`, `matchResultQueue`, `disconnectRecovery` and `qr.validation`.
]


== Implementation: sensors <sensors>

Pocket Draw uses five mobile sensor types including camera, GPS/location, accelerometer, gyroscope, and compass (magnetic field sensor). These support QR-code challenges, nearby player discovery, ready position calibration and false start detection, shot type classification based on how the phone is tilted, and aiming direction validation. The application accesses these input sensors through Expo’s camera, location, and motion APIs, combining sensor readings to connect players’ physical movements with gameplay. Haptic feedback enhances these inputs by providing physical signals during calibration and duels, while audio provides the fire signal and narrative instructions.

*Accelerometer:* reading acceleration to check the phone’s ready orientation and detect *early* movement during the countdown. `PreRound.tsx` requests updates every 150 milliseconds and processes the three axes, `x`, `y`, and `z`. `falseStartDetector.ts` compares the resultant acceleration magnitude with the resting value of 1 g. A deviation of at least 0.25 g triggers early-movement detection. Once the fire signal is recorded, the detector stops accepting movement violations, preventing later samples from invalidating a valid shot.

*Gyroscope and fused motion.* The gyroscope contributes to the device’s fused motion data, accessed through Expo’s `DeviceMotion` API. `pitchMonitor.ts` requests updates every 20 milliseconds and reads `rotation.beta`, the phone’s pitch angle. `DrawCalibrationScreen.tsx` records shoulder and ready angles. At firing time, pitchZoneClassifier.ts compares the current angle with these calibrated positions to classify the shot as a bodyshot, headshot, or miss. This measures progress through the phone’s tilt movement rather than estimating its physical height.

*GPS/location.* Location data supports nearby-player discovery and directional aim validation. `useForegroundLocation.ts` checks permission before retrieving and tracking coordinates for the map. During a duel, `useAimTracking.t`s requests high-accuracy position updates and shares usable coordinates with the opponent. These positions establish the geographic direction between players. When their separation falls within the combined GPS uncertainty, `aimBearing.t`s preserves the tilt-based result rather than enforcing an unreliable directional check.

*Compass (magnetometer).* The compass supplies the phone’s heading to help determine whether the player is aiming towards the opponent. `useAimTracking.ts` subscribes to heading updates through `watchHeadingAsync()` and records `trueHeading`. `aimBearing.ts` compares this heading with the geographic bearing towards the opponent, accepting a difference of up to 30 degrees when the directional check applies. The magnetometer is accessed through the heading API rather than a direct raw magnetic-field subscription.

*Camera.* The camera allows players to initiate challenges by scanning an opponent’s QR code. `QrScannerScreen.tsx` uses Expo’s `CameraView`, configured specifically for QR scanning. Its scan handler validates the invitation and extracts the opponent’s identity, match identifier, challenge token, and connection information. After player confirmation, this information is passed into the challenge flow.


== Implementation: connectivity <connectivity>

#crit(
  "Implementation – Connectivity",
  [Excellent 12 · Very Good 8 · Satisfactory 4],
)

The app uses data from three sources, and each one solves a different problem.

#table(
  columns: (auto, 1fr),
  stroke: 0.5pt + rgb("#cccccc"),
  inset: 7pt,
  table.header([*Source*], [*What the app uses it for*]),
  [Firebase, in the cloud],
  [Accounts, live player positions, challenge requests, match results, Elo ratings, the leaderboard, and the sensor data of each match. This is everything that must outlive a duel.],

  [Apple Maps and Google Maps],
  [The map itself. iOS draws it with Apple Maps, and Android draws it with the Google Maps SDK.],

  [The other phone, on the local network],
  [The countdown, the fire signal, each shot, the clock measurements and the precise position of the opponent. No server sits in this path.],
)


=== Cloud: accounts, player positions and saved results

Firebase Authentication signs a player in with an email address and a password (`lib/auth.ts`). The app stores the session on the phone, so the player stays signed in after a restart. Cloud Firestore, a database that the app reads and writes directly, holds everything else:

#table(
  columns: (auto, 1fr),
  stroke: 0.5pt + rgb("#cccccc"),
  inset: 7pt,
  table.header([*Collection*], [*What it holds*]),
  [`users`],
  [The display name and the Elo rating of each player. The leaderboard, which opens from the profile screen, ranks the top 100 players from it (`backend/leaderboardRepository.ts`).],

  [`presence`],
  [The rounded position of each player who shares it. The map shows these positions live.],

  [`challengeRequests`],
  [One record for each scanned invite. It starts as `pending`, changes to `accepted` or `declined` when the host answers, and expires after 60 seconds.],

  [`matches`],
  [The final result of each match. The player statistics count wins, losses and draws from it (`backend/playerStatsRepository.ts`).],

  [`users/{uid}/ratedMatches`],
  [A receipt that a match has already changed the Elo rating of that player.],

  [`analytics`],
  [The sensor readings of each phone for each match: the calibration angles, the tilt at each shot, and the compass and GPS readings behind each aim check (`backend/matchAnalytics.ts`).],
)


=== Live positions on the map

The map does not ask for positions on a timer. `map/services/presenceRepository.ts` opens a Firestore listener, so Firestore pushes each change to the phone as it happens. When a player moves, joins or stops sharing, every other map shows the change without a refresh. appears on every other map without a refresh. Each phone publishes its position again every 60 seconds, even when the player stands still. The map hides a player whose position is more than three minutes old, so a phone that lost its signal does not leave a pin behind. A failed write is retried after 2, 4 and 8 seconds, and only then does the app show an error.

Position sharing is a privacy decision, so the app limits what it shares. It rounds each position to four decimal places, a cell of about 11 m by 9 m, before the position leaves the phone (`docs/adr/0002-public-presence-precision.md`). It publishes a new position only after the player has moved 10 m, so GPS noise does not cause a stream of writes. A switch on the map turns sharing off, and the app then deletes the position. The precise position never goes to the cloud. It goes only to the opponent, over the duel connection.


=== Losing the network

People play this game outdoors and on the move, so a lost connection is normal. When a match ends, the app first saves the result and the sensor data on the phone, in `AsyncStorage`, and only then uploads them (`backend/matchResultsService.ts`, `backend/matchAnalytics.ts`). `backend/connectivity.ts` reads the network state with `expo-network`. If the phone is offline, the result waits on the phone. When the network returns, or when the player next signs in, the app uploads the waiting results of that player without being asked. The summary screen says which state the result is in: "Result saved", "Result saved on this device · waiting to sync", or "Could not sync result. Please retry." with a retry button.

Both phones upload the same match, often at the same moment. `backend/matchResultsRepository.ts` writes the result in a Firestore transaction that only creates the record. The second phone finds the record already there, and leaves it alone. The Elo rating and its receipt change in one transaction (`backend/playerStatsRepository.ts`), so a retry can never change a rating twice.


=== Checks on the server

The app checks its own data, but a modified app could skip those checks. The Firestore security rules (`firestore.rules`) therefore check every write again on the server. A player can write only their own position and profile, and a position must hold a valid latitude and longitude. Only one of the two players in a match can create its result, and nobody can change or delete it afterwards. Each sensor record belongs to the phone that wrote it, and nobody can change it.


=== Phone to phone: the duel

The duel runs over a WebRTC data channel between the two phones. WebRTC is a standard that lets two devices send data straight to each other. No server sits in this path, because a reaction game cannot wait for a message to travel to a server and back.

Two devices normally need a server on the internet to set up a WebRTC connection. Pocket Draw runs that server on the host phone instead. `webrtc/nativeWebRtcTransport.ts` opens a TCP server on the phone with `react-native-tcp-socket`. `webrtc/signalingProtocol.ts` defines and checks the messages that it accepts: `auth`, `auth-ok`, `offer`, `answer`, `ice-candidate`, `ice-complete` and `error`. The first message carries `matchId`, `challengeToken` and `discoveryToken`, which authorise the session. The file checks the structure of every message that arrives, and rejects any message longer than 64 KiB, so a broken or hostile phone cannot exhaust the memory of the host. The guest phone receives those tokens and the address of the host from the QR code. The QR code therefore carries the connection.

The connection uses no server on the internet at all, so a duel needs no internet access once the two phones share a network. Over it, the phones send the countdown, the fire signal, each shot and its zone, false starts, the clock measurements (section 5.5), and the precise GPS position of each phone once a second. The aim check compares the compass heading of the phone with the direction to that position. `webrtc/duelDataChannel.ts` checks every message before the game sees it. A short drop in the connection gets three seconds to recover on its own. If the connection is lost during a match, the phones repeat the handshake with the tokens from the QR code, and continue from the rounds that both phones recorded (`duel/disconnectRecovery.ts`).


=== Sharing a network

`network/existingWifi.ts` uses `expo-network` to confirm that the host phone is on Wi-Fi, and reads its IPv4 address. It rejects an address that another phone could never reach, such as a loopback address. An invite expires after 60 seconds. A scanned QR code is data from outside the app, so the app checks the whole invite before use: its version, its expiry time, the address and the port, and that it is not the player's own invite (`qr/utils/qr.validation.ts`, `qr/utils/ip.validation.ts`).

The code also contains an Android hotspot path (`network/hotspot.ts`). In it, the host phone creates its own Wi-Fi network, and the QR code carries the network name and the password. The submitted build hides this option, so shared Wi-Fi is the path that an assessor can test.


== Implementation: responsiveness

#crit(
  "Implementation – Responsiveness",
  [Excellent 6 · Very Good 4 · Satisfactory 2],
)

Responsiveness has a measurable meaning in this app. It is the time between the movement of the player and the moment the game records it. It is also the agreement between the two phones about when each event happened.

The app reads the accelerometer every 20 milliseconds, so detection takes about one sample period plus the minimum hold time. The detection code is synchronous, and allocates no memory while it runs. `reactionTimer.ts` measures the reaction time from the fire signal. Before the app compares the two players, it corrects the timestamps of the other phone by the measured clock difference. Without that correction, the faster player can be the player whose phone clock runs ahead.

Outside the duel, the map subscribes to the player positions in Firestore instead of asking for them on a timer, so other players appear and disappear as they move. `PresenceStatusSnackbar` shows the current state of the position sharing. `disconnectRecovery.ts` gives a recovery path when the connection drops during a duel, instead of ending the match with an error.


== Implementation: technical depth <clock>


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


= User interface


== User interface: Appeal <ui>

#crit("User Interface – Appeal", [Excellent 4 · Very Good 3 · Satisfactory 2])

`src/theme/tokens.ts` defines the visual style once, for every screen. The background is near black (`#08090b`), with one strong accent colour (`#ff4b3e`), a teal for success and an amber for warnings. Text uses four levels of opacity, so one colour carries the hierarchy. The fonts are Barlow for body text, Barlow Condensed Bold for headings, and IBM Plex Mono for numbers. Reaction times and scores use the monospaced font, so the digits stay in place as they change. @appeal-screens shows four screens in this style.

`src/theme/appTheme.ts` maps the same colours onto the dark Material Design 3 theme of React Native Paper. The standard controls, such as the tab bar, the segmented buttons and the snackbars, therefore match the screens that the team drew itself. The status bar uses light text on every screen. The app icon, a hand that grips a phone, uses the same red on black, so the style starts on the home screen.

The cut corner is the signature shape. `CutCornerSurface` and `CutCornerButton` implement it once, at three sizes. Seven components in `src/components/` carry that style across every screen: `CutCornerButton`, `CutCornerSurface`, `DisplayHeading`, `KickerLabel`, `ScreenHeader`, `StatTile` and `StatusTag`. Six people built the screens from those components.

Drawings explain what a sentence would explain slowly. The calibration screen shows each pose as a line drawing, which turns red while it is the current step (`duel/PoseIllustration.tsx`). On the result screen, each kind of miss has its own diagram: a raise that was too low or too high, an aim outside the opponent's cone, a shot that tracking could not check, a missing shot and a false start (`duel/RoundIllustration.tsx`; see the figure in section 5.9). The raise and aim diagrams animate once, for 650 milliseconds. For a player who turns on Reduce Motion, they stay still.

The duel is built to be felt as well as seen. During the countdown the screen is black, with one large number in the middle. On the fire signal the whole screen turns red, with "FIRE!" in 72-point type, so a player sees the cue at the edge of their vision. Each event also has its own sound: the start of the game, the countdown, the fire signal, the gunshot, a headshot, a bodyshot, a miss and a false start.

On the map, each other player has one of eight pin colours. The colour comes from the account of that player, so a player keeps the same colour every time. Pins that would cover each other merge into a red bubble with a count, instead of a pile.

// PLACEHOLDER: upload the four screenshots to typst.app, then replace each
// appeal-shot(...) line with image("<file name>"). Delete the #let below once
// all four are replaced.
#let appeal-shot(file, what) = block(
  fill: rgb("#fdf1f0"),
  stroke: 1pt + rgb("#c0392b"),
  inset: 6pt,
  radius: 4pt,
  width: 100%,
  height: 8.5cm,
)[
  #align(center + horizon)[
    #TODO[#file] #v(4pt) #text(size: 7.5pt)[#what]
  ]
]

#figure(
  grid(
    columns: 4,
    gutter: 8pt,
    appeal-shot(
      "appeal-map.png",
      [Map tab with coloured player pins and one red bubble with a count. Take it on campus.],
    ),
    appeal-shot(
      "appeal-qr.png",
      [Challenge tab showing the QR invite on its cut-corner card.],
    ),
    appeal-shot(
      "appeal-calibration.png",
      [Calibration with the current pose drawing in red. Use screen recording: the volume buttons confirm a pose here.],
    ),
    appeal-shot(
      "appeal-fire.png",
      [The red FIRE! screen. Fire first by tapping, then take the screenshot.],
    ),
  ),
  caption: [From left: the map with player pins and a group bubble, the QR invite on a cut-corner card, the pose drawing during calibration, and the full-screen FIRE cue.],
) <appeal-screens>


== User interface: guidelines

#crit(
  "User Interface – Guidelines",
  [Excellent 6 · Very Good 4 · Satisfactory 2],
)

Pocket Draw follows established mobile UI design conventions to provide a consistent and intuitive experience across Android and iOS. The application uses React Native Paper, which supports Material Design 3, and a shared theme defined in src/theme/appTheme.ts. This ensures that buttons, navigation elements and other interface components maintain consistent styling throughout the application.

For navigation, Pocket Draw uses BottomNavigation.Bar to organise the main features, allowing users to switch between different sections through a familiar mobile navigation pattern. The application also uses SafeAreaProvider and SafeAreaView to ensure that content does not overlap with system elements such as status bars, display notches and home indicators. These choices help the interface adapt to different screen sizes and device layouts.

The application follows platform permission guidelines by requesting access to location, camera, Bluetooth and Android hotspot features when they are needed, rather than asking for all permissions at startup. This helps users understand why each permission is required.

Accessibility is also considered through the use of accessibility labels and roles on interactive elements, including buttons, map controls and the QR code display. These features support clearer interactions and improve compatibility with assistive technologies.

Overall, the interface combines consistent visual components, familiar navigation patterns, platform-aware layouts and contextual permission requests to support usability across the two mobile platforms.


== User interface: flow

Pocket Draw organises its main features into three labelled navigation tabs: Map, Challenge, and Profile. The Map opens after login, while Challenge provides “My QR” and “Scan” options for pairing players. Profile shows player stats, email, game version and groups account settings, permissions, and the leaderboard. After a match, users can choose to rematch or return to the map. @flow-navigation illustrates these navigation paths using annotated screenshots, showing the controls used to locate and activate each feature. #figure(
  grid(
    columns: (1fr, 1fr),
    gutter: 25pt,
    align: horizon,
    image("navigation.png", width: 100%),
    grid(
      columns: (1fr,),
      gutter: 30pt,
      image("navigation 1.png", width: 80%),
      image("navigation 2.png", width: 100%),
    ),
  ),
  caption: [Map, Challenge, and Profile navigation.],
) <flow-navigation>

Users access Pocket Draw’s main features through three bottom tabs: Map, Challenge, and Profile. Users can move directly from the map to Challenge, where “My QR” and “Scan” provide two clearly labelled ways to pair with another player. Profile groups the leaderboard, permissions, username editing, password changes, and logout in one place. Explicit controls such as “Back to Profile”, “Save”, and “Cancel” make the next action clear and provide a straightforward way to return or complete a task.


== User interface: language

#crit("User Interface – Language", [Excellent 4 · Very Good 3 · Satisfactory 2])

The text in Pocket Draw follows four rules. Each rule can be checked in the app and in the video.

/ A message names the cause and the next step: No message shows an error code. A failed invite says "Connect this device to Wi-Fi before creating an invite." A failed aim check says "Couldn't get your opponent's location. Ask them to turn on precise location and move outside." A compass that needs calibration says "Move the phone in a figure 8, away from metal and magnets, before the next round." Each message tells the player what went wrong and what to do about it.

/ A miss always comes with a reason: The sensors decide every round, so a player cannot see why a shot failed. The result screen therefore states the reason for every miss, in the words of the game:

#table(
  columns: (auto, 1fr),
  stroke: 0.5pt + rgb("#cccccc"),
  inset: 5pt,
  table.header([*What happened*], [*What the player reads*]),
  [Raised too high],
  ["Raised too far: the phone was above the calibrated hit range."],

  [Not raised enough],
  ["Raised too little: the phone was below the calibrated hit range."],

  [Aimed away], ["Aimed outside the opponent's cone at the moment of firing."],
  [Compass not ready],
  ["Compass not ready: it was uncalibrated or not updating, so aim couldn't be checked."],

  [Moved early],
  ["False start: movement or fire input was detected before the FIRE cue."],
)

/ One vocabulary from start to finish: The words come from the duel: draw, FIRE, ready pose, shoulder pose, headshot, bodyshot, miss and false start. The instructions screen teaches these words, and the duel and the results use the same words, so a player is scored in the words the tutorial taught. Numbers carry their unit and their meaning, as in "Both bodyshots within 100 ms · 1 point each".

/ The form of the text fits the moment: During the countdown the player has no time to read a sentence, so the cues are short and in capitals: "GET READY", "FIRE!", "FALSE START — YOUR SHOT IS DISQUALIFIED". Instructions outside the duel are full sentences, such as "Phone at shoulder height, top edge pointing forward." During the ready phase the player is not looking at the screen, so sound and vibration carry the same message. Each outcome has its own sound: countdown, fire, gunshot, headshot, bodyshot, miss and false start.

#figure(
  grid(
    columns: 2,
    gutter: 12pt,
    image("lang-miss-reason.jpg", height: 7cm),
    image("lang-false-start.jpg", height: 7cm),
  ),
  caption: [
    Left: a miss states its reason and the fix. \
    Right: after a false start, the player is told what happened and what to do next.
  ],
)


== User interface: reactiveness <reactiveness>

The app names every state in which the player waits. While the fonts and the sign-in state load, a loading screen appears instead of an empty frame. Reading the location, sharing the position and connecting to the other phone each have their own display: `LocationStatusCard`, `PresenceStatusSnackbar`, `MapStatusCard` and `ConnectingScreen`. Position sharing retries after a failure, and says that it is retrying.

The map reacts to GPS updates by moving the player’s location marker and recalculating which players are nearby. Live presence updates from Firebase change the other players shown on the map, while outdated presence records are removed automatically.

During a duel, motion readings and messages from the opponent drive changes to the interface. Calibration advances when the required phone pose is detected. Countdown and fire events change the displayed instructions, and firing uses the current phone angle to determine the shot zone. Opponent messages update their reaction time and shot information. Sound and vibration reinforce the countdown and fire cues, allowing players to respond without watching the screen.


= Innovation


== Innovation: novelty

Pocket Draw turns the smartphone from a touchscreen gaming device into a physical controller for a real-world duel. Unlike conventional mobile games that rely on tapping or swiping, the outcome of each round is determined by the player's physical movement. The accelerometer detects when the player raises the phone, while device orientation is used to evaluate aiming accuracy. The system also identifies false starts, making the timing of each movement important. The game combines these sensor-based interactions with direct communication between two phones. Players must be physically present, calibrate their own ready and aiming positions, and respond to a shared fire signal. This combination of physical movement, personalised calibration and real-time multiplayer interaction is the main novelty of Pocket Draw.


== Innovation: surprise

An unexpected aspect of Pocket Draw is that the fastest player does not necessarily win. A player may react immediately after the fire signal but still miss if the phone is raised to an incorrect angle. This makes the duel a combination of reaction speed and movement accuracy rather than a simple reflex test.

The false start mechanism adds another layer of uncertainty. Moving before the fire signal results in a penalty, while the other player's valid action is still recognised. This creates a balance between reacting quickly and waiting for the correct moment.

Another distinctive feature is its local connectivity. Instead of requiring a remote game server during the duel, the phones communicate directly over a shared Wi-Fi network or an Android-hosted hotspot. This allows gameplay without continuous internet access once the local connection has been established, making the experience less dependent on traditional online multiplayer infrastructure.


== Innovation: technical knowledge

The project uses methods from outside the usual mobile toolkit. It measures the clock difference between two devices with the method that network time servers use, over a connection that the two phones negotiate themselves. It defines its own TCP message protocol, with authorisation, structure checks and a size limit. It runs WebRTC on React Native over two different networks, one of which a phone creates itself. It reads a combined sensor angle instead of integrating acceleration, and the repository records why. It also builds through the Expo native generation pipeline, with plugins for WebRTC and audio.


== Innovation: cross-disciplinary

Pocket Draw takes ideas from five fields outside computing. The table names each idea and where the app applies it. The paragraphs after it explain how the team adapted each idea instead of copying it.

#table(
  columns: (auto, 1fr, 1.25fr),
  stroke: 0.5pt + rgb("#cccccc"),
  inset: 5pt,
  table.header([*Field*], [*Idea*], [*Where Pocket Draw applies it*]),
  [Athletics],
  [The false start rule. Only the athlete who started early is penalised.],
  [The first false start gives that player a warning, and the round restarts. A second false start voids only that player's shot; the other player's shot still counts (`falseStartCoordinator.ts`, PR \#85).],

  [Human factors and psychology],
  [People react faster to sound and touch than to sight. Human reaction times differ by tens of milliseconds even between attempts.],
  [The FIRE cue is a sound and a vibration, not only a visual cue. Shots less than 100 ms apart count as a tie (`TIE_WINDOW_MS` in `roundJudge.ts`).],

  [Anthropometry],
  [Measure a body against its own dimensions, not against a fixed standard.],
  [Each player records a ready pose and a shoulder pose. A shot is scored as a fraction $F$ of that player's own range (section #link(<clock>)[5.5]).],

  [Navigation and geodesy],
  [The initial bearing along a great circle between two points on the Earth.],
  [`aimBearing.ts` computes the bearing from one player to the other from their GPS positions. A shot hits only if the compass heading of the phone is within 30° of that bearing.],

  [Chess rating],
  [The Elo rating system.],
  [`elo.ts` uses the logistic expected score on the 400-point scale, with K = 40, and updates both players together.],
)

*Adapting the ideas.* In athletics, sensors in the starting blocks detect a false start, and World Athletics rules flag any reaction under 0.100 s as a possible false start, because no human can react that fast to the gun. A player in Pocket Draw has no blocks, so the app uses the accelerometer to detect when the phone leaves its resting state before the cue. Reaction time research finds that people respond faster to sound and touch than to light, so the FIRE cue uses the two faster channels. This also lets players keep their eyes on each other, as in a real duel. The same 0.1 s scale sets the tie window: a gap smaller than that says more about chance than about skill. Elo was designed for chess, and the international chess federation, FIDE, uses K = 40 for new players, so that a rating moves quickly while there are few games behind it. Most Pocket Draw players have played only a few duels, so the app uses the same value. The bearing formula comes from navigation. The app combines it with the compass, so aiming at a person in a field becomes a check that the sensors can make.

*A limit the team chose.* The countdown is a fixed 3, 2, 1 (`PreRound.tsx`). Reaction time research shows that a predictable warning period lets people anticipate the signal. A Pocket Draw round therefore measures anticipation and reaction together, not pure reaction time. The team kept the fixed count because it makes the duel feel like a ritual and keeps the two phones in step. A random delay before FIRE is the natural next step if the game is to measure pure reaction time.


== Innovation: impact

Pocket Draw demonstrates how mobile devices can encourage physical activity and face-to-face social interaction rather than keeping players focused entirely on their screens. Both players must be in the same location and perform real movements to participate. Audio and vibration cues allow them to concentrate on the physical duel instead of continuously watching the display.

The application also makes this experience accessible without specialised gaming equipment. Players can use their existing smartphones, and the local connectivity approach offers opportunities to play in places where internet access is limited, provided the devices can establish a supported local connection.

Although primarily designed for entertainment, Pocket Draw demonstrates the potential of combining smartphone sensors, real-time communication and physical interaction to create new forms of multiplayer experiences. Similar interaction principles could also be explored in reaction-training games and other movement-based applications.

#pagebreak()

// ============================================================================


= Use of AI tools

// ============================================================================

The team used AI coding assistants throughout this project. The repository records that use at the level of each commit.

Every commit written with AI help carries a `Co-authored-by` line that names the model and the tool. `AGENTS.md` documents this rule, and reviewers enforce it. An assessor can filter the commit log in this submission, and see which commits used AI and which model wrote each one. On the `dev` branch, 155 of 390 commits (about 40%) carry such a line. Most name OpenAI models used through Codex or Anthropic's Claude used through Claude Code; a few name Cursor or Google's Gemini.

`.agents/logs/` also holds 21 dated work logs. Each log records the instruction that started an AI session, the member who wrote that instruction, the work that followed, and the model used.


== How the team used AI

/ Writing code to a given design: AI assistants wrote code against interfaces that members had already defined. Most of that work filled in an implementation behind a contract in `src/contracts/`.

/ Writing tests: AI wrote a large share of the 774 tests, from behaviour that a member described. Members then reviewed and corrected them.

/ Writing design documents: members set the problem and the constraints, and drafted the specifications in `docs/superpowers/specs/` with AI help.

/ Reviewing merges: AI review of the branch merges found real defects. One merge had dropped thirteen files without warning.

/ Reading the repository: an AI assistant produced the contribution figures in section #link(<contrib>)[4] from the git history, covering pull request authorship, commit authorship and per-file commit counts. The team then checked them against their own records.

/ Writing this report and planning the video: members used Claude through Claude Code to check the app against the rubric, to plan the shots of the video, and to draft parts of section #link(<rubric>)[5]. Members then checked every claim against the code and edited the text. #TODO[add how other members used AI for the report and the video, including grammar tools such as Grammarly.]

Every member reviewed the AI output in their own work before it merged, and the team made the design decisions and game rules itself.

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
