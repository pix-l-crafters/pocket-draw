# Map + Duel — Implementation Design

**Date:** 2026-09-06
**Author:** Mobark Bacran (owner: Map, Duel)
**Baseline:** [`2026-08-15-quickdraw-showdown-design.md`](./2026-08-15-quickdraw-showdown-design.md), [`2026-08-21-quickdraw-showdown-implementation-design.md`](./2026-08-21-quickdraw-showdown-implementation-design.md)
**Status:** Design approved in brainstorming; ready for an implementation plan
**Scope:** Map (finish) + Duel (from a validated QR invite onward). QR camera/render UI, BLE transport internals, ELO/ranks, and agent/profile settings are explicitly out of scope — see §7.

---

## 1. Purpose

This document scopes the two features owned by Mobark Bacran — **Map** and **Duel** — down to a buildable design, reconciling three things that had drifted since the Aug 21 doc:

1. A UI mockup ("Quickdraw Showdown" Design Canvas prototype, kept locally, not committed) that visually diverges from the Aug 21 doc in places (tap-to-fire vs raise-to-win, a full ELO ladder, an agent/settings screen).
2. A team sequence diagram for the challenge/duel handshake, which does not use a Firestore-based invite — the physical QR scan **is** the handshake.
3. Real, already-written code on two other branches (`origin/map`, merged; `origin/feature/payload`, unmerged) that this design must build on top of, not duplicate.

The Aug 15/21 docs remain authoritative except where this document explicitly overrides them (§8).

---

## 2. What's already true on `dev` (verified, not assumed)

- **Map is ~80% built** (merged via PR #6): `MapScreen`, foreground location, a presence _write_ path (`presenceRepository.publishPresence`), and Firestore rules for `presence/{uid}` are all in place and look correct.
- **Two concrete gaps block it from working end-to-end:**
  - `App.tsx` passed `<MapScreen currentUser={null} />` — presence publishing is a no-op without a user. (Fixed separately, on `mobark/fix/app-shell-conflict` — resolves the committed merge-conflict markers that also broke `dev`'s build.)
  - Presence is **write-only**. There is no subscription/read of other players' presence docs — the map shows three hardcoded `MOCK_PLAYERS` in Sydney instead of real nearby users.
  - No `users/{uid}` profile doc is ever written, so `displayName` (required, non-empty, by the Firestore rules) has no real source — Firebase Auth's `displayName` is never set at registration.
- **QR invite type + validators already exist** on `origin/feature/payload` (unmerged, 3 commits): `QrInvitePayload` (`matchId`, `hostPlayerId`, `hostPlayerName?`, `challengeToken`, `issuedAt`/`expiresAt`, `transport: "ble"`, `ble.discoveryToken`) plus field-level validators and a `QrValidationErrorCode` union. This is treated as a **fixed contract**, not redesigned here.
- **BLE session/duel protocol code does not exist anywhere.** `BleScreen.tsx` is a scanner only (central role: scan, connect, read). No advertising/peripheral code, no message protocol, no host/guest logic, on any branch.
- **`react-native-ble-manager` (the only BLE dependency, v12.5.1) has no peripheral/advertising API** — confirmed by reading its full type definitions, not assumed. It can scan and connect to a peripheral; it cannot make a phone discoverable as one. This is a real gap in the "host advertises, guest scans+connects" model the QR payload's `ble.discoveryToken` implies, not a hypothetical risk — see §9.

---

## 3. Locked decisions (this session)

| Topic                    | Decision                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duel mechanic            | **Raise-to-win** (accelerometer), per the Aug 21 doc — not the mockup's tap-to-fire. The mockup's "FIRE" signal is kept as the shared go-cue; players still physically raise the phone to register a draw after it. |
| Challenge handshake      | **Physical QR scan**, not a Firestore invite/accept collection. Matches the team's sequence diagram and the existing `QrInvitePayload` contract.                                                                    |
| Host/guest assignment    | Determined by the payload itself: `hostPlayerId` is the host (the phone that generated and displayed the QR). No extra negotiation needed.                                                                          |
| Round count              | Chosen by the **scanner** (guest), after fetching the host's profile — per the sequence diagram.                                                                                                                    |
| Mobark's scope           | Map (finish) + Duel **starting from a validated `QrInvitePayload`**. QR camera/scan/render UI stays with whoever owns `feature/payload`.                                                                            |
| BLE transport            | Duel is built against a small `DuelSession` interface, backed by a **local mock** for now (see §9). Real peripheral-mode BLE is a separate, unresolved risk — not blocking this design.                             |
| Ranks/ELO/Agent settings | Out of scope. Duel persists raw match results; ELO computation/display is someone else's concern, later.                                                                                                            |

---

## 4. Architecture

```text
Map (GPS + presence, ~built)
  └─ [external: QR display (host) / QR scan (guest) — feature/payload's job]
       └─ valid QrInvitePayload
            → fetch users/{hostPlayerId} profile (Firestore)
            → guest picks round count (3 / 5 / 7)
            → DuelSession.connect(payload.ble.discoveryToken)
                 (interface now; local mock transport until BLE peripheral
                  mode is solved — see §9)
                 ├─ both sides send "ready"
                 └─ loop per round:
                      haptic buzz → 3-2-1 countdown → FIRE (shared go-signal)
                      → raise-to-win (expo-sensors Accelerometer)
                      → host rules winner / false start / tie
                      → sync + display result on both phones
            → loop until round count reached → match summary
            → persist matchResults/{id} (queue offline, flush on reconnect)
            → back to Map
```

**Authority split (unchanged from Aug 21):** the host phone decides the round winner over the duel transport. Firebase stores identity, presence, and match history — it never referees a draw.

---

## 5. Components

| Module                  | Responsibility                                                                                                       | Depends on                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Map presence read       | Subscribe to `presence` where `isVisible == true`; render pins for other users                                       | Firestore rules (already correct) |
| User profile write      | Write `users/{uid}` (`displayName`, `createdAt`) at registration/first login                                         | Firebase Auth                     |
| `DuelSession` interface | `connect(discoveryToken)`, `sendReady()`, `sendRaised(ms)`, `onOpponentEvent(cb)`, `disconnect()`                    | —                                 |
| `DuelSession` mock impl | Simulates an opponent locally (randomized reaction time, occasional false start) so the full screen flow works today | `DuelSession` interface           |
| `DuelSession` BLE impl  | Real transport using `payload.ble.discoveryToken` for peer discovery                                                 | Unresolved — see §9               |
| Duel screens            | Fetch host profile → pick rounds → connect → separate/proximity → facedown → countdown → raise → result → summary    | `DuelSession`, `expo-sensors`     |
| Raise detector          | Accelerometer-based gesture detection, tunable threshold                                                             | `expo-sensors` (new dependency)   |
| Match persistence       | Write `matchResults/{id}`; local queue when offline, flush on reconnect                                              | Firestore                         |

---

## 6. Data flow — happy path

1. Both players are signed in; Map shows each other as pins (presence read, fixed here).
2. Host opens their QR code (feature/payload); guest scans it (feature/payload) → guest holds a validated `QrInvitePayload`.
3. Guest fetches `users/{payload.hostPlayerId}` for the host's display name/stats.
4. Guest picks a round count (3/5/7).
5. Guest calls `DuelSession.connect(payload.ble.discoveryToken)`; both sides confirm "ready".
6. Per round: buzz → countdown → FIRE → both accelerometers watch for a raise → host compares the two raise timestamps (or false-start/timeout) and rules the round → result shown on both phones.
7. Repeat until the round count is reached → match summary on both phones.
8. Either phone persists `matchResults/{id}` (host/guest uids, per-round outcomes and times, final score, `payload.matchId`); if offline, queue and flush on reconnect.
9. Back to Map.

---

## 7. Explicitly out of scope

- QR code generation/rendering and camera scanning UI (owned by `feature/payload`; this design only consumes its already-defined types/validators).
- The real BLE peripheral/advertising implementation (mocked behind `DuelSession` — see §9).
- ELO computation and the ranks/leaderboard screen.
- The Agent/profile settings screen (visibility toggle, haptic toggle, draw calibration) — the mockup includes it, but it wasn't part of the approved MVP and isn't part of Mobark's task split.
- Tap-to-fire as a mechanic (superseded by raise-to-win per §3).

---

## 8. Overrides vs the mockup and Aug 21 doc

| Prior source                                                                                        | This design                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mockup: tap-to-fire                                                                                 | Raise-to-win stands (Aug 21 doc), "FIRE" kept only as the shared go-cue                                                                                             |
| Aug 21 doc §5.1: "Challenger: create matchId + short BLE token → QR" (implies challenger initiates) | Sequence diagram: round count is chosen by the **scanner**, after the QR is scanned — the "challenger" role in conversation is the QR _displayer_, who becomes host |
| Mockup: ELO ladder + Agent settings as visible screens                                              | Out of scope for this pass (§7)                                                                                                                                     |
| No prior doc addressed a Firestore challenge collection                                             | Explicitly rejected — the QR scan itself is the handshake, no separate invite/accept doc                                                                            |

All other Aug 15/21 locks (nearby-only, BLE live path where feasible, host authority, cloud-not-referee, 4-retry BLE reconnect policy) stand.

---

## 9. Open risk: BLE peripheral mode

`react-native-ble-manager` cannot make a phone advertise/be discoverable — confirmed by reading its complete type definitions (no `startAdvertising`, no peripheral-role API of any kind). The `ble.discoveryToken` field in `QrInvitePayload` only works if the host phone can actually broadcast it, which nothing in this repo currently does or can do with the installed library.

This was already anticipated by the Aug 21 doc's Phase 1 spike gate ("BLE host/guest sends ready + raised cross-OS. Fail → same-Wi-Fi WebRTC fallback; do not add a third transport") — it's just now confirmed as a real, not hypothetical, gap.

**Decision for this pass:** don't block Duel's screen/state-machine work on resolving this.
Build against the `DuelSession` interface with a local mock transport (mirrors what the
mockup itself does — its prototype never used real BLE either). This produces a fully
working, demoable vertical slice now.

Solving real peripheral-mode BLE (a new library, a small custom native module, or falling
back to the documented same-Wi-Fi path) is separate, focused work — recommended as its own
time-boxed spike before the real `DuelSession` BLE implementation is attempted.

---

## 10. Error handling

| Failure                          | Behaviour                                                                                                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid/expired QR invite        | Rejected using the existing `QrValidationErrorCode`s (no new logic)                                                                                                                                        |
| Host profile fetch fails         | Block starting the duel; retry                                                                                                                                                                             |
| BLE connect timeout              | Auto-retry ×4, then manual Retry button (per Aug 21 doc)                                                                                                                                                   |
| BLE drop mid-duel                | Abort both UIs; no result written (optional `aborted` MatchResult if online)                                                                                                                               |
| False start                      | Round loss; match continues                                                                                                                                                                                |
| Near-simultaneous raise (tie)    | Sudden-death rematch offer for that round; exact tie-window threshold is a tunable constant, dialed in during playtesting (Aug 21 doc used ~80ms, the mockup's UI text used ±25ms — neither is fixed here) |
| Opponent never sends "ready"     | Host cancels; no result row                                                                                                                                                                                |
| App backgrounded/killed mid-duel | Abort; nothing persisted                                                                                                                                                                                   |
| Offline after duel completes     | Queue `matchResults` write; flush on reconnect                                                                                                                                                             |

---

## 11. Testing

- **Map:** two logged-in accounts/emulators; confirm each sees the other as a pin via the presence subscription.
- **Duel round loop:** because the transport sits behind `DuelSession`, the full countdown → raise → rule → result loop is testable on a single device against the mock — no second phone or working BLE needed for this iteration.
- **Raise threshold:** no substitute for on-device tuning; the round-loop/false-start/host-ruling logic is unit-testable independent of the sensor by injecting fake raise events at controlled times.
- **Real BLE (once unblocked):** weekly two-phone slice test, per the Aug 21 doc's existing practice.

---

## 12. Next step

Invoke the **writing-plans** skill to produce a phased implementation plan under `docs/superpowers/plans/`.

---

## 13. Sources

- Product design: `docs/superpowers/specs/2026-08-15-quickdraw-showdown-design.md`
- Implementation design: `docs/superpowers/specs/2026-08-21-quickdraw-showdown-implementation-design.md`
- UI mockup: "Quickdraw Showdown" Design Canvas prototype (kept locally, gitignored, not committed)
- Team sequence diagram for the challenge/duel handshake (provided in this session)
- Existing code read directly: `src/features/map/**` (`origin/map`, merged), `src/features/qr/**` (`origin/feature/payload`, unmerged), `firestore.rules`, `node_modules/react-native-ble-manager` type definitions
