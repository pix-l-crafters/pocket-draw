# Roadmap

This document reconciles the product design (`README.md`, `UI.md`, `Gameplay-v2.md` — the canonical gameplay spec, `Gameplay-v1.md` is superseded, `Leaderboards.md`) against what's actually implemented on `dev`, and lays out the remaining work as independent, GitHub-issue-sized items. Anyone can pick up any item below — this isn't a per-person assignment list like `docs/task-splits-v2/`.

## Current state

Already implemented on `dev` (ahead of this doc's own branch):

- Auth (login/register), live player-location map
- Full QR challenge/connect flow (my-QR, scan, opponent confirm) with a BLE session transport underneath
- Duel gameplay: raise-gesture calibration, countdown, fire/raise detection, false-start handling, tie-window scoring, reaction-time capture
- Backend: match-result write path, offline queue, ELO calculation, `playerStatsRepository` (wins/losses/ELO)
- Postmatch summary screen (rematch / return-to-map)

Not implemented at all: Leaderboards tab, Profile & Settings tab, match-level draws, WebRTC transport, clock-sync for reaction timing, the Gameplay-v2 fire mechanic and zone-based scoring (current code implements v1's auto-fire/reaction-only model), the post-challenge game-instructions screen, and the Android map / haptics-only fire cue bugs.

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
8. **The fire mechanic and round scoring are rebuilt to match Gameplay v2, not v1.** The current implementation auto-fires on a raise gesture and scores purely on reaction time (win/tie/falseStart, no headshot/bodyshot) — that's v1's model.
   v2 requires a manual fire trigger and height-zone-based scoring. See "Fire mechanic & scoring" below and the full [fire mechanic & scoring spec](../superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md).

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

`fireSignalCoordinator.ts` currently stamps the "fire" signal with the host's own `Date.now()` and both sides compute `reactionMs` against that same value.
The host's measurement is clean (single clock); the guest's is contaminated by however long the message took to arrive plus any clock offset between the two phones — neither compensated for today.
This is a transport-independent bug, not something the WebRTC migration introduces, though lower/more-consistent WiFi latency should reduce its impact versus BLE.

Fix: a ping-pong RTT exchange (`offset ≈ ((t1-t0)-(t3-t2))/2`) run during the existing pre-round calibration step (`DrawCalibrationScreen.tsx`), alongside the arm-position calibration that already happens there. The resulting clock offset corrects received timestamps before `reactionMs` is computed.

`accelerometerRaiseMonitor.ts` already works around a related, subtler platform gap: native accelerometer sample timestamps use each OS's own monotonic clock, not wall-clock time, so it stamps raise detection with `Date.now()` at the JS callback instead.
That's the right call, but it trades in a small amount of JS-thread scheduling jitter whose size can differ between iOS and Android — worth a quick sanity check once clock-offset calibration lands, not a separate issue.

### Android map rendering

`MapScreen.tsx` uses `react-native-maps` with the default provider (Apple Maps on iOS, Google Maps SDK on Android).
`app.json`'s `plugins` array has no `react-native-maps` entry and no Google Maps API key anywhere — Android's Google Maps SDK requires one to render anything, iOS's Apple Maps doesn't.
That fully explains "works on iOS, doesn't load on Android": it's a missing config, not a library defect.
`react-native-maps` remains the right library for 2026 — Expo's own first-party `expo-maps` is still alpha and Expo's guidance is to only use it if you can drop iOS support below iOS 17, which doesn't apply here.
Fix is additive: register the config plugin with an `androidGoogleMapsApiKey`, get a "Maps SDK for Android" key from Google Cloud Console (needs billing enabled), inject it via an EAS secret rather than committing it.

### Fire-signal cue (haptics-only today)

The "buzz" that tells players to fire (`PreRound.tsx`) is implemented purely via `expo-haptics` — no audio at all; `countdownAudio.ts`'s `COUNTDOWN_AUDIO_SOURCE` is still a `null` placeholder.
Haptic intensity is not comparable across devices: iOS's Taptic Engine gives a crisp, consistent pulse, while Android's vibration motors vary widely in strength and latency by device.
For a game whose entire premise is "fastest to react," a haptics-only cue risks the outcome hinging on whose phone has a stronger buzzer rather than who actually reacted first.
Fix: wire up the placeholder audio asset as a redundant cue alongside haptics, and explicitly configure iOS's audio session to play through the silent/mute switch (`expo-audio`'s playback-in-silent-mode option) — Android has no equivalent muting behavior to work around.

### Fire mechanic & scoring (Gameplay v2)

Full spec: [`docs/superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md`](../superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md).

Today, `raiseGestureDetector.ts` auto-fires purely from accelerometer magnitude crossing a threshold, and `roundJudge.ts` scores purely on who reacted faster (`"win" | "tie" | "falseStart"`, 1 point, no headshot/bodyshot).
That's v1's model.
v2 requires a manual fire trigger, plus height-zone scoring: a bodyshot zone (ready-height to shoulder-height, 1 point), a headshot zone (shoulder-height to +15cm above, 2 points), and misses (0 points) for anything else.

**Round scoring:** order both players' shots by reaction time. Outside the tie window, classify the faster shot's landing height into miss/bodyshot/headshot — if valid, that player scores those points and the other scores 0; if the faster shot is a miss, fall through and classify the slower shot the same way; if both miss, the round is 0-0.
Within the tie window (near-simultaneous fire), classify **both** shots independently — each player scores their own zone value regardless of the other's timing — and whoever scores higher wins the round; equal scores (including a double miss) tie, with both keeping their equal points.
`falseStart` stays as its own outcome kind — it's a timing violation (firing before the buzz), orthogonal to where a shot lands, not folded into the zone system. The non-offending player still fires and scores normally by their own zone accuracy rather than getting a flat penalty bonus; see the fire mechanic spec's "False-start point value" note for the alternatives considered.
Reaction time still gates who's even eligible to score, and separately remains the leaderboard's avg-reaction-time stat.

**Feasibility flag:** classifying a shot's height needs continuous position tracking relative to the calibrated ready/shoulder reference points, not just today's one-shot threshold-crossing raise event.
Accelerometer-based position estimation drifts — this needs its own feasibility check (bounded drift over a single round's timescale, possibly gyroscope fusion) before committing to an implementation approach.

**Fire trigger — documented for whoever picks this up, since the right answer differs by platform and by how much risk you're willing to accept:**

- **Android:** volume button via native key interception (`KEYCODE_VOLUME_UP/DOWN`, e.g. `react-native-volume-manager` or a small custom native module — this project already runs `expo-dev-client`, so a native module is nothing new). Reliable, no caveats.
- **iOS, default:** on-screen tap-to-fire button. No API-misuse risk, no camera overhead, works on every device.
- **iOS, alternative — native volume trigger via `AVCaptureEventInteraction`:** Apple's only sanctioned API for volume-button capture, but it's scoped to apps actively using the camera; non-camera apps risk the capture session being terminated. Would need an active (if hidden) camera session running during the duel just to unlock the events.
- **iOS, alternative — unofficial volume-observation hack:** watch `AVAudioSession.outputVolume` for changes. Works without a camera session, but is fragile: volume needs resetting between rounds, detection can be missed at min/max volume, and the system volume HUD flashes unless suppressed.
- **iOS, alternative — Action Button:** only exists on iPhone 15 Pro and later, and requires the _player_ to manually assign your app's Shortcut to it in Settings ahead of time — not something the app can claim automatically. Whether it delivers a fast in-scene event to an already-foregrounded duel screen (vs. behaving like an app relaunch) isn't confirmed without device testing.
- **Ruled out — side/power button:** no public API exists for any app to intercept it; fully reserved by iOS.

## Phased issue list

### Phase 0 — Quick fixes

1. Fix Android map: register the `react-native-maps` config plugin with an `androidGoogleMapsApiKey` (Google Cloud Maps SDK for Android key, billing enabled, injected via EAS secret)
2. Wire up the countdown audio cue alongside the existing haptics-only "buzz" signal, with iOS audio-session config to play through silent/mute mode

### Phase 1 — Contracts & rules

Items 3–6: see the full [fire mechanic & scoring spec](../superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md).

3. Feasibility-check continuous position/height tracking from the calibrated ready/shoulder reference points (accelerometer drift risk) needed to classify a shot as miss/bodyshot/headshot
4. Android fire trigger: volume-button key intercept (native module, e.g. `react-native-volume-manager`)
5. iOS fire trigger: on-screen tap-to-fire button (default) — see "Fire mechanic & scoring" above for the documented alternatives a teammate can swap in instead
6. Rewrite `roundJudge.ts`/`RoundOutcome` for v2 scoring: order shots by reaction time, classify the faster shot's zone with fallthrough to the slower shot on a miss (outside the tie window), or classify both shots independently with the higher score winning (within the tie window).
   Keep `falseStart` as its own outcome kind, scoring the non-offending player's own shot normally rather than a flat penalty value (see the fire mechanic spec's "False-start point value" note)
7. Rewrite `MatchResult` and the match-level `roundLoop.ts` for strict 3-round + 1-tiebreaker matches with win/lose/draw outcomes, decided by **sum of round points**, not count of rounds won — `tallyOutcome`'s accumulator needs to add each round's actual zone point value (0/1/2) instead of the current hardcoded `+= 1` / `+= pointsEach`.
   Confirmed the `matchResults` Firestore collection is dev-only scratch data — clear it before cutover rather than writing a migration for the old `winnerId` shape
8. Extend `PlayerStats` and `playerStatsRepository` to tally draws
9. Remove `RoundCountSelector`'s 3/5/7 choice (round count is fixed now). Narrow the shared `ChallengeHandoff.roundCount` contract type (`src/contracts/challengeHandoff.ts`) from `3 | 5 | 7` to the literal `3` too — it flows through `App.tsx` into the duel session, so leaving it un-narrowed means TypeScript won't catch a stale caller still constructing a 5- or 7-round handoff

### Phase 2 — Missing UI

10. Full-screen game-instructions step, shown right after challenge acceptance and before calibration (`UI.md`: "the Challenge tab, when the challenge is accepted, launches the game instructions screen in full screen... From that screen, the gameplay starts.").
    Nothing in the current challenge→duel pipeline shows this today — `DrawCalibrationScreen.tsx`'s copy is calibration-specific, not game rules.
11. Leaderboard data layer (`leaderboardRepository`)
12. Leaderboard screen with ranking-type selector (win/loss ratio, wins, losses, draws, ELO, avg reaction time)
13. Profile & Settings screen (own stats, username edit via Firebase Auth `updateProfile`, logout moved here)
14. Tab IA rewire: `Map / Challenge / Leaderboards / Profile`, drop the BLE debug tab from shipped UI

### Phase 3 — Connectivity rewrite (core)

Items 15–25: see the full [connectivity rewrite spec](../superpowers/specs/2026-09-17-connectivity-rewrite-design.md).

15. Remove the BLE transport stack entirely
16. QR payload carries WiFi/hotspot connection info, regenerates on network change
17. Existing-network detection: try the current shared WiFi network before falling back to creating a hotspot, using `expo-network`'s `getIpAddressAsync()` for the host-IP lookup (confirmed cross-platform, no platform-specific handling needed)
18. Android hotspot auto-create via `WifiManager.startLocalOnlyHotspot()` — `react-native-wifi-reborn` (item 20) doesn't cover hotspot creation, only joining; use `react-native-local-only-hotspot` (or an equivalent small native module) for this specific call
19. iOS manual-hotspot flow: Settings instructions + one-time password entry (the app can't read its own hotspot password)
20. Join-network flow via `react-native-wifi-reborn` (both platforms)
21. Local signaling server (host) + SDP/ICE exchange. Add `NSLocalNetworkUsageDescription` to iOS's `infoPlist` — any direct local-network connection on iOS 14+ needs this or the connection silently fails with no permission-denied signal to the user
22. Authenticate the signaling connection: require the connecting peer to present the QR payload's `challengeToken`/`discoveryToken` before the host accepts an SDP exchange — on the "existing shared WiFi" mode, the signaling port isn't private to the two duelists, so an unauthenticated server would let any other device on that network hijack or deny the pairing.
    See the connectivity spec's "Token freshness on reconnect" note for how this interacts with item 24 — a deadline-driven call flagged there for confirmation, not a settled answer
23. `RTCPeerConnection`/`DataChannel`-backed `DuelChannel` implementation
24. Extend `disconnectRecovery.ts`'s `DisconnectContext`/`DisconnectRecoveryState` to carry the in-progress `RoundLoopState` (score, round number) through a reconnect, so the match resumes instead of restarting — this is what actually makes reconnection feel seamless, not the signaling-socket lifecycle.
    `DuelDisconnectRecovery` already takes its transport as an injected `DuelChannel` + `reconnect` callback, so no separate "port to WebRTC" work is needed here — item 23's `DuelChannel` implementation just supplies its own `reconnect` callback.
    (This item previously read "port `disconnectRecovery.ts` to the WebRTC transport" — corrected after reading the actual class; that wording would have sent someone chasing a porting task that doesn't exist.)
25. Clock-offset calibration folded into the pre-round calibration screen, applied in `fireSignalCoordinator`/`reactionTimer`

### Phase 4 — Stretch

26. Average reaction time aggregation + leaderboard ranking by it (product design marks this "do only when we have time")
27. Onboarding / empty states / demo script — flagged unassigned since `docs/task-splits-v2/README.md`
28. Full prod-readiness device QA (Android/iOS full-loop, permission-denial recovery) — carried over from the existing prod-readiness checklist in `docs/task-splits-v2/README.md`

## Open risks to verify during implementation

- iOS can't read its own Personal Hotspot password — confirm the one-time manual entry is acceptable UX, not a blocker.
- `@config-plugins/react-native-webrtc` version pinning against this project's Expo SDK 54 / RN 0.81.5.

## Branch survey

Checked all remote branches, not just `dev`/`main`, before finalizing this roadmap: `tingyue/feat/challenge-connect-flow`, `sihengma/map`, `tanachat/feat/duel-pre-round-ritual`, and `tianze/feat/duel-fire-detection` are all fully merged into `dev` already (zero commits ahead).
`feature/payload-rebased` has unmerged commits but is a stale pre-architecture snapshot (thousands of lines behind `dev`, superseded auth/QR experiment) with nothing platform-relevant.
`dev` is the complete, current picture this roadmap is based on.
