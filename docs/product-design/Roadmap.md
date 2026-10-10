# Roadmap

This roadmap maps the current checked worktree and GitHub issue state to the Assignment 2 rubric and the team's 9 Oct 2026 internal freeze. It preserves the product design decisions and points to GitHub issues for executable work.

## Current state (baseline checked 2026-10-04; #50/#81 implementation update 2026-10-08)

Implemented in the checked worktree:

- Firebase auth, live player map, QR invite generation, profile/settings screen, and Android map configuration.
- Gameplay-v2 zone scoring, fixed 3-round + tiebreak structure, clock-offset calibration, iOS tap-to-fire, instructions, match-result writes, and offline queue.
- Native WebRTC signaling/DataChannel and Wi-Fi/hotspot connection flows are present; issues #45–#49 are closed.
- #50 + #81 implementation supplied on 2026-10-08: both players' explicit pitch calibration, live calibrated/aim-gated shots over `DuelChannel`, and enriched early-input/movement false starts. Final Android+iOS hardware evidence remains pending under #54.

Still incomplete or unverified:

- QR confirmation still attempts the unsupported `challengeRequests` write and does not reliably enter the duel. Open PR [#72](https://github.com/pix-l-crafters/pocket-draw/pull/72) addresses both; its GitHub checks were failing when reviewed.
- BLE is a stub; issue #51 remains open for WebRTC cutover and BLE-stack removal. WebRTC is not counted as demo-ready until exercised between real Android and iPhone devices.
- Draw stats (#40), four-tab navigation (#44), real leaderboard rankings (#42), onboarding/demo script (#53), and full device QA (#54) remain baseline open items. Android volume fire and non-offender false-start scoring are supplied in the #50/#81 implementation update, not claimed hardware-verified.
- The code contains Profile and Leaderboard screens, but `App.tsx` currently exposes only Map / Challenge / Profile. A screen existing in source is not proof that the shipped flow reaches it.

Closed implementation issues include Android map/audio fixes (#34–#35), zone scoring (#36), iOS fire (#38), match tally (#39), instructions (#41), Profile (#43), and WebRTC/network/clock/recovery work (#45–#49). Device verification is still outstanding under #54.

## Submission target and priority

The Assignment 2 rubric in [`docs/rubrics/`](../rubrics/README.md) weights Implementation at 44 points (Connectivity alone: 12), UI at 26, Innovation at 16, and Material at 14. The rubric image shows a portal deadline of 12 October 2026, 23:59; use 9 October as the team's internal completion freeze.

The submission package requires a report PDF, a YouTube demo video up to 10 minutes,
an Android Studio console screenshot showing a successful compile, a source-code ZIP,
an exported Git commit-log ZIP, and a one-page itemized contribution breakdown for
each member. The report must include run instructions and up to 10 pages mapping every
rubric criterion to evidence. Each member also attends an individual in-person viva.
Track the complete package in [issue #80](https://github.com/pix-l-crafters/pocket-draw/issues/80).

The submitted Assignment 1 plan names BLE as the MVP transport and WebRTC only as a
fallback if the BLE spike fails. Current product docs and implementation instead use
WebRTC. Do not add a second transport under this deadline; document the actual
transport decision and its evidence honestly in the report.

Assignment 1 feedback asks for measured two-phone buzz timing (20 ms was suggested),
a criterion-by-criterion report, and specific individual contributions. Treat timing
as a measurement to report, not a result to claim without device evidence.

The roadmap below orders work by submission risk, not by feature novelty. The detailed design decisions and linked specs remain the product contract; anything explicitly marked stretch must not delay the verified two-phone path or the submission materials.

## Design decisions

These cut across multiple issues below, decided up front so individual issues don't re-litigate them.

1. **Match outcome is an explicit per-player map.** `MatchResult.winnerId: string` becomes `results: Record<string, "win" | "lose" | "draw">`, keyed by participant uid. Chosen over a nullable `winnerId` for explicitness — every consumer reads a three-way result directly instead of null-checking a single field.
2. **Rounds are strictly 3, plus at most 1 tiebreaker.** No more variable-length (3/5/7) matches.
   **The match winner is decided by the sum of each player's round points (bodyshot 1 / headshot 2 / miss 0), not by count of rounds won** — under v1 these were equivalent since every round win was worth exactly 1 point, but v2's differentiated zone scoring breaks that equivalence.
   If point totals are tied after 3 rounds, exactly one tiebreaker round plays (also decided by points), and the match ends after it regardless of outcome — a draw is a valid, storable match result.
3. **Leaderboard is computed client-side.** Fetch all players' aggregated stats and sort in-memory per the selected ranking, the same full-scan-and-replay pattern `playerStatsRepository` already uses for one player. No denormalized leaderboard collection or Cloud Function — not worth the added backend responsibility at this project's scale.
4. **Navigation stays manual state, no new nav library.** Extend `App.tsx`'s existing `AppTab` union instead of introducing `@react-navigation/bottom-tabs`. The challenge→duel→postmatch flow already works this way; four tabs instead of two doesn't change that.
5. **WebRTC becomes the sole transport; BLE is removed entirely.** Not additive — a full replacement. The QR code becomes the WebRTC pairing point, carrying WiFi/hotspot connection info instead of (or alongside) the existing BLE discovery token. See "Connectivity architecture" below and the full [connectivity rewrite spec](../superpowers/specs/2026-09-17-connectivity-rewrite-design.md).
6. **Reaction-time fairness needs clock-offset calibration**, folded into the existing pre-round calibration step rather than shipped as a separate wait.
7. **The Android map and the haptics-only fire cue are both fixed as part of this pass**, not left as separate untracked bugs — see the two subsections below.
8. **The fire mechanic and round scoring match Gameplay v2, not v1.** Manual fire, calibrated pitch zones, actual compass/GPS aim gating, and enriched false starts replace automatic raise/reaction-only scoring.
   See "Fire mechanic & scoring" below and the full [fire mechanic & scoring spec](../superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md).

### Connectivity architecture

Full spec: [`docs/superpowers/specs/2026-09-17-connectivity-rewrite-design.md`](../superpowers/specs/2026-09-17-connectivity-rewrite-design.md).

`DuelChannel`/`DuelMessage` (`src/contracts/duelChannel.ts`) already abstracts duel logic away from the transport — nothing in the duel gameplay code needs to change for this swap.

- QR payload gains a `connection` field — a discriminated union, `{ mode: "existingWifi", hostIp, signalPort }` or `{ mode: "hotspot", hostIp, signalPort, ssid, password }` — alongside the existing `matchId`/tokens, regenerated whenever the host's network changes.
- Host either uses an existing shared WiFi network, or creates a hotspot.
  Android does this automatically via `WifiManager.startLocalOnlyHotspot()`.
  iOS has no public API to create Personal Hotspot, so the user manually enables it and types the hotspot password into the app once (the app can't read it) — the only manual step in the flow.
  iOS's Personal Hotspot host is always reachable at the fixed `172.20.10.1`.
- Joiner connects to the network named in the QR via `react-native-wifi-reborn`, which wraps both iOS's `NEHotspotConfiguration` and Android's `WifiNetworkSpecifier` behind one call — one OS confirmation dialog on either platform, no manual Settings trip for the joiner.
- Once both devices are on the same network, the host runs a small local TCP/WS server (no internet server involved) purely to exchange the WebRTC SDP offer/answer. ICE only needs host candidates — same LAN, no STUN/TURN required.
- Once the `RTCPeerConnection`/`DataChannel` is up, all duel traffic (the existing `DuelMessage` types) moves onto it, and the BLE stack is deleted: `BleScreen.tsx`, `bleRssi.ts`, `session/bleDuelSessionTransport.ts`, the BLE permission block in `app.json`, and the `react-native-ble-manager` dependency.

### Reaction-timing fairness

Clock-offset calibration is implemented (#48). The JS callback timestamp still introduces platform scheduling jitter; measure the observed two-phone buzz/fire timing during device QA (#54). Assignment 1 feedback suggested measuring whether the phones buzz within 20 ms; report the method and actual result rather than assuming that threshold is met.

### Android map rendering

The Android map configuration fix is implemented (#34): the Google Maps key is injected through app configuration. Confirm the map renders on the final Android build as part of #54.

### Fire-signal cue

The countdown now pairs audio with haptics (#35). Confirm both cues are audible/noticeable on the final Android and iOS devices during #54.

### Fire mechanic & scoring (Gameplay v2)

Full spec: [`docs/superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md`](../superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md).

The #50 + #81 implementation supplies manual fire and real calibrated pitch-zone
scoring, followed by compass-versus-live-GPS aim gating. Both players capture ready
then shoulder before PreRound; accepted-duel rematches reuse calibration. The fixed
pitch bands (bodyshot 0.8–1.0, headshot >1.0–1.2 of the calibrated arc) approximate
centimeter height and still require on-device tuning under #54.
The pitch cutover removes the unused accelerometer calibration producer.
Instructions remain scrollable so “I'm Ready” is reachable, and calibration
retains an Exit action through the existing duel leave path.

Aim requires true-north heading accuracy level 3 within a tunable ±30° cone, fresh
heading (2 seconds) and GPS (5 seconds), and separation beyond combined GPS
uncertainty. Unavailable/stale/overlapping readings miss, with no bodyshot fallback.
Public map presence is ~10 m rounded (ADR 0002) and removed on map exit, so it cannot supply
close-range bearing. Precise GPS is intentionally shared only with the accepted
peer over `DuelChannel`, not written precisely to Firestore; public-location privacy
is unchanged. `sampleAtMs` is the actual sender GPS fix timestamp, not send time.
The existing calibrated peer-clock offset converts it to local fix time:
`localFixTime = sampleAtMs - clockOffsetMs` (offset is peer clock minus local clock).
Freshness therefore includes network flight delay; repeating a fix does not renew
it. Capture uses the latest calibrated offset, including for fixes already received.

**Round scoring:** order both players' shots by reaction time. Outside the tie window, classify the faster shot's landing height into miss/bodyshot/headshot — if valid, that player scores those points and the other scores 0; if the faster shot is a miss, fall through and classify the slower shot the same way; if both miss, the round is 0-0.
Within the 100 ms tie window (near-simultaneous fire), classify **both** shots independently — each player scores their own zone value regardless of the other's timing — and whoever scores higher wins; equal scores (including a double miss) tie, with both keeping their equal points.
`falseStart` stays as its own enriched outcome kind: early countdown tap, volume,
or movement disqualifies the offender, while the non-offender can fire after normal
FIRE for actual 0/1/2 shot points and timing. The #81 implementation supplies this
live scoring path; final-device verification is not claimed.

**Fire trigger:** tap remains reliable on both platforms. Android intercepts volume
keys; iOS output-volume observation is approximate (endpoint presses may not register).

## Submission sequence — 9 Oct internal freeze

### 1. Restore the QR-to-duel path

- **PR #72:** remove the unsupported `challengeRequests` write and enter the duel after connection. Resolve its failing checks, merge, then exercise the accepted-host and guest paths.

### 2. Prove the single live transport

- **Issue #51:** finish the WebRTC cutover and remove the BLE stack. Its prerequisites (#45–#47) are closed; the BLE transport in source is still a stub.
- Smoke-test host/guest WebRTC between real Android and iPhone devices as soon as #72 is green. Do not wait until final QA to discover native-network failures, and do not add a second transport under this deadline.

### 3. Finish gameplay result correctness

- **Issue #37:** Android volume fire implementation supplied; verify actual keys on final hardware.
- **Issue #64:** non-offender shot/points are supplied in #81's live false-start path; verify both-client agreement and persistence.
- **Issues #50 + #81:** combined implementation supplied; retain actual two-client zone/timing agreement and false-start scoring. Do not defer the bearing gate as a disclosed-only simplification; validate it under #54.
- **Issue #40:** include draws in the player-stats surface.
- Keep gameplay result correctness inside the Oct 9 freeze if the team is submitting Gameplay v2 as its current product.

### 4. Finish the user-facing flow

- **Issue #44:** expose Map / Challenge / Leaderboards / Profile navigation; current `App.tsx` has only three tabs.
- **Issue #53:** complete the demo script and the onboarding/empty-state work that materially helps a first-time user finish a duel. It depends on #44 and #51.

### 5. Verify on hardware and prepare the package

- **Issue #54:** run the full Android+iOS loop after #44 and #51. Cover map/presence, QR, connection, countdown/fire timing, scoring/tie/false-start, match persistence, offline queue flush, and permission-denial recovery. Include an uncoached user run. Record device/model, method, and measured timing; do not present mocks or source presence as hardware proof.
- **Issue #80:** complete the report, <=10-minute demo video, Android Studio compile screenshot, source ZIP, commit-log ZIP, itemized individual contributions, and individual-viva preparation. The report must map every Assignment 2 rubric row (including UI and Material) to evidence.

#### #54 final-phone gameplay checklist

**Not executed on the final Android+iOS phones here.** Record device models,
OS/build, method, and measured results for every case; tests/source are not device evidence.

- Check precise GPS accuracy/freshness and true-north heading sanity at known directions; test the ±30° boundary and facing-away misses on both phones. Unavailable/stale sensors and overlapping GPS uncertainty must miss.
- Capture ready then shoulder on each phone; measure/tune pitch body/head/miss thresholds. Test denied/unavailable motion and location, retry, Settings, and foreground permission recovery.
- Exercise tap/volume controls, bodyshot/headshot/miss, faster-miss fallthrough, early tap/volume/movement, and the non-offender's actual post-buzz score on both devices.
- Run full three-round matches, 100 ms ties, one tiebreaker and final draw; verify both clients agree on zones, timing, offender, round points, and match result. Check rematches reuse calibration.
- Measure cue/fire timing and input/sensor latency on both devices; report measured results, not an assumed 20 ms target.

### Defer until the submission path and materials are ready

- **Issue #42:** full real leaderboard rankings; the submitted Assignment 1 plan treated a leaderboard as an extra, not an MVP pass condition.
- **Issue #52:** average-reaction-time ranking.

The team's internal freeze is 9 Oct 2026. The Assignment 2 portal date shown in the rubric is 12 Oct 2026, 23:59; reserve the gap for packaging and final validation, not new features.

The detailed engineering rationale remains in the sections above and the linked fire/connectivity specs. Issue #80 tracks the submission artifacts; current open feature work remains tracked in GitHub issues.

## Open risks and ownership

- **Transport divergence:** the submitted Assignment 1 plan names BLE as the MVP and permits WebRTC as fallback after a failed BLE spike. Current product docs and code use WebRTC. Preserve evidence for the actual transport decision and explain it in the report; the checked repo does not establish that teaching staff approved a change.
- **Device proof:** native WebRTC source and unit tests do not prove a working Android+iOS connection. Issue #54 remains open; the buzz timing and permission paths need real-device evidence.
- **Ownership:** several submission-critical issues are unassigned. Confirm a named owner for each, then derive the individual contribution page from merged work rather than paired area labels.
- **PR #72:** still open and its GitHub checks were failing when this roadmap was reviewed.

Status checked on 2026-10-04 against the checked worktree, open GitHub issues/PRs, and `docs/rubrics/`. Device execution was not performed for this review.
