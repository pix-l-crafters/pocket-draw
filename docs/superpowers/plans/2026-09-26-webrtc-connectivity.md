# WebRTC LAN Connectivity Implementation Plan

> **For Codex:** Execute this plan issue-by-issue with red/green tests, one conventional commit and one GitHub issue comment after each issue.

**Goal:** Replace the challenge flow's placeholder BLE transport with authenticated local-network WebRTC DataChannels, add existing-Wi-Fi QR discovery, and add hotspot fallback.

**Architecture:** Firebase remains responsible for identity, map presence, challenge persistence, and results. The duel link uses a local TCP signaling socket to exchange WebRTC SDP/ICE, validates the QR-issued match and tokens before negotiation, then closes signaling once the DataChannel is open. QR connection data is a discriminated union for existing Wi-Fi and hotspot modes.

**Tech stack:** Expo SDK 54, React Native, TypeScript, `react-native-webrtc`, `react-native-tcp-socket`, `expo-network`, `react-native-wifi-reborn`, Expo Modules API, Jest.

---

## Task 1: Issue #45 — WebRTC signaling and DataChannel

**Files:**

- Add: `src/features/challenge/webrtc/signalingProtocol.ts`
- Add: `src/features/challenge/webrtc/duelDataChannel.ts`
- Add: `src/features/challenge/webrtc/webrtcDuelTransport.ts`
- Add: matching `*.test.ts` files
- Modify: `package.json`, `package-lock.json`, `app.json`
- Modify: `.agents/logs/2026-09-26.md`

1. Write failing protocol tests for fragmented/newline-delimited frames, invalid frames, and QR-token authentication.
2. Implement the signaling protocol and verify those tests pass.
3. Write failing DataChannel adapter tests for message delivery, validation, connection state, unsubscribe, send, and drop handling.
4. Implement the `DuelChannel` adapter and verify those tests pass.
5. Write failing orchestration tests for authenticated host/guest SDP and ICE exchange, successful channel handoff, abort, and resource cleanup.
6. Implement injectable TCP/WebRTC orchestration plus native adapters using host-only ICE (`iceServers: []`).
7. Add compatible native dependencies and the Expo WebRTC plugin/local-network usage description.
8. Run focused tests, the full test suite, formatter/checks, and review the diff.
9. Append the AI work log, commit exactly once for #45, then comment on #45 with the commit and verification results.

## Task 2: Issue #46 — Existing shared Wi-Fi QR flow

**Files:**

- Modify: `src/features/qr/types/qr.types.ts`
- Modify: `src/features/qr/utils/qr.validation.ts`
- Add/modify: QR validation tests
- Add: `src/features/challenge/network/existingWifi.ts` and tests
- Modify: `src/features/challenge/QrDisplayScreen.tsx`
- Modify: `src/features/challenge/QrScannerScreen.tsx`
- Modify: `src/features/challenge/RoundCountSelector.tsx`
- Modify: `src/contracts/challengeHandoff.ts`
- Modify: `src/features/challenge/ConnectingScreen.tsx`
- Modify: `package.json`, `package-lock.json`, `.agents/logs/2026-09-26.md`

1. Write failing tests for the versioned `existingWifi` QR connection payload, IPv4/port validation, and forwarding connection/auth data into `ChallengeHandoff`.
2. Implement the discriminated QR payload and handoff changes.
3. Write failing tests for obtaining a usable LAN IPv4 address and rejecting unavailable addresses.
4. Implement `expo-network` based existing-Wi-Fi discovery.
5. Start host signaling before rendering the QR, encode the bound port/IP, refresh when network state changes, and connect the scanner side through the real WebRTC transport.
6. Run focused tests, the full test suite, formatter/checks, and review the diff.
7. Append the AI work log, commit exactly once for #46, then comment on #46 with the commit and verification results.

## Task 3: Issue #47 — Hotspot fallback

**Files:**

- Modify: QR payload types/validation/tests for hotspot data
- Add: `src/features/challenge/network/hotspot.ts` and tests
- Add: `modules/local-only-hotspot/` Android Expo module
- Modify: `src/features/challenge/QrDisplayScreen.tsx`
- Modify: `src/features/challenge/QrScannerScreen.tsx`
- Modify: `app.json`, `package.json`, `package-lock.json`
- Modify: `.agents/logs/2026-09-26.md`

1. Write failing tests for hotspot QR validation and join orchestration.
2. Extend the QR union with `{ mode: "hotspot", ssid, password, hostIp, signalPort }`.
3. Scaffold and implement a local Android Expo module wrapping `WifiManager.startLocalOnlyHotspot()`; expose start/stop and return credentials plus the hotspot IPv4 address.
4. Implement Android runtime permissions and automatic hotspot creation; implement iOS manual Personal Hotspot SSID/password entry.
5. Join the scanned hotspot via `react-native-wifi-reborn`, then open the TCP/WebRTC connection.
6. Add host mode selection, lifecycle cleanup, status/error UI, and native permissions/plugins.
7. Run focused tests, the full test suite, formatter/checks, and review the diff.
8. Append the AI work log, commit exactly once for #47, then comment on #47 with the commit and verification results.

## Final verification

1. Verify `git log` contains exactly three new commits with required AI co-author trailers.
2. Verify the worktree is clean and the original `dev` worktree remains untouched.
3. Report the branch, commit hashes, tests, known baseline TypeScript error, and real-device validation steps.
