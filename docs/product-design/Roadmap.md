# Roadmap

This document reconciles the product design (`README.md`, `UI.md`, `Gameplay-v1.md`/`Gameplay-v2.md`, `Leaderboards.md`) against what's actually implemented on `dev`, and lays out the remaining work as independent, GitHub-issue-sized items. Anyone can pick up any item below — this isn't a per-person assignment list like `docs/task-splits-v2/`.

## Current state

Already implemented on `dev` (ahead of this doc's own branch):

- Auth (login/register), live player-location map
- Full QR challenge/connect flow (my-QR, scan, opponent confirm) with a BLE session transport underneath
- Duel gameplay: raise-gesture calibration, countdown, fire/raise detection, false-start handling, tie-window scoring, reaction-time capture
- Backend: match-result write path, offline queue, ELO calculation, `playerStatsRepository` (wins/losses/ELO)
- Postmatch summary screen (rematch / return-to-map)

Not implemented at all: Leaderboards tab, Profile & Settings tab, match-level draws, WebRTC transport, clock-sync for reaction timing.

## Design decisions

These cut across multiple issues below, decided up front so individual issues don't re-litigate them.

1. **Match outcome is an explicit per-player map.** `MatchResult.winnerId: string` becomes `results: Record<string, "win" | "lose" | "draw">`, keyed by participant uid. Chosen over a nullable `winnerId` for explicitness — every consumer reads a three-way result directly instead of null-checking a single field.
2. **Rounds are strictly 3, plus at most 1 tiebreaker.** No more variable-length (3/5/7) matches. If tied after 3 rounds, exactly one tiebreaker round plays, and the match ends after it regardless of outcome — a draw is a valid, storable match result.
3. **Leaderboard is computed client-side.** Fetch all players' aggregated stats and sort in-memory per the selected ranking, the same full-scan-and-replay pattern `playerStatsRepository` already uses for one player. No denormalized leaderboard collection or Cloud Function — not worth the added backend responsibility at this project's scale.
4. **Navigation stays manual state, no new nav library.** Extend `App.tsx`'s existing `AppTab` union instead of introducing `@react-navigation/bottom-tabs`. The challenge→duel→postmatch flow already works this way; four tabs instead of two doesn't change that.
5. **WebRTC becomes the sole transport; BLE is removed entirely.** Not additive — a full replacement. The QR code becomes the WebRTC pairing point, carrying WiFi/hotspot connection info instead of (or alongside) the existing BLE discovery token. See "Connectivity architecture" below.
6. **Reaction-time fairness needs clock-offset calibration**, folded into the existing pre-round calibration step rather than shipped as a separate wait.

### Connectivity architecture

`DuelChannel`/`DuelMessage` (`src/contracts/duelChannel.ts`) already abstracts duel logic away from the transport — nothing in the duel gameplay code needs to change for this swap.

- QR payload gains connection info (`ssid`, `password?`, `hostIp`, `signalPort`) alongside the existing `matchId`/tokens, regenerated whenever the host's network changes.
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

## Phased issue list

### Phase 1 — Contracts & rules

1. Rewrite `MatchResult` and `roundLoop.ts` for strict 3-round + 1-tiebreaker matches with win/lose/draw outcomes
2. Extend `PlayerStats` and `playerStatsRepository` to tally draws
3. Remove `RoundCountSelector`'s 3/5/7 choice (round count is fixed now)

### Phase 2 — Missing UI

4. Leaderboard data layer (`leaderboardRepository`)
5. Leaderboard screen with ranking-type selector (win/loss ratio, wins, losses, draws, ELO, avg reaction time)
6. Profile & Settings screen (own stats, username edit via Firebase Auth `updateProfile`, logout moved here)
7. Tab IA rewire: `Map / Challenge / Leaderboards / Profile`, drop the BLE debug tab from shipped UI

### Phase 3 — Connectivity rewrite (core)

8. Remove the BLE transport stack entirely
9. QR payload carries WiFi/hotspot connection info, regenerates on network change
10. Host-side: existing-network detection, Android hotspot auto-create, iOS manual-hotspot flow
11. Join-network flow via `react-native-wifi-reborn` (both platforms)
12. Local signaling server (host) + SDP/ICE exchange
13. `RTCPeerConnection`/`DataChannel`-backed `DuelChannel` implementation
14. Clock-offset calibration folded into the pre-round calibration screen, applied in `fireSignalCoordinator`/`reactionTimer`

### Phase 4 — Stretch

15. Average reaction time aggregation + leaderboard ranking by it (product design marks this "do only when we have time")
16. Onboarding / empty states / demo script — flagged unassigned since `docs/task-splits-v2/README.md`
17. Full prod-readiness device QA (Android/iOS full-loop, permission-denial recovery) — carried over from the existing prod-readiness checklist in `docs/task-splits-v2/README.md`

## Open risks to verify during implementation

- Whether `react-native-wifi-reborn` also covers Android's `startLocalOnlyHotspot()` hotspot-creation path, or whether that needs to be called directly.
- iOS can't read its own Personal Hotspot password — confirm the one-time manual entry is acceptable UX, not a blocker.
- `@config-plugins/react-native-webrtc` version pinning against this project's Expo SDK 54 / RN 0.81.5.
