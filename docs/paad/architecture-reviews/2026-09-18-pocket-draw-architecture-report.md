# Architecture Report — pocket-draw

- **Date:** 2026-09-18
- **Commit:** 03632c033efdc0c9b316103cc823a764bd6127fa
- **Languages:** TypeScript, React Native 0.81 (Expo 54)
- **Key directories:** `src/features/{backend,ble,challenge,duel,map,postmatch,qr}`, `src/contracts` (+`mocks/`), `src/components`, `src/lib`, `src/screens`, `src/theme`, `App.tsx`
- **Scope:** Full repository (91 source files across `src/` plus root entry files; no path argument given)

## Repo Overview

Pocket Draw is a co-located 2-player mobile duel game (university group project, ~7 contributors) built with Expo/React Native.
Each phone acts as a "gun": players scan a QR code to set up a challenge, connect over Bluetooth Low Energy, then race to draw and fire, judged on reaction time (aim/accuracy is a stretch goal).
Firebase (Auth + Firestore) is the only server-side dependency — there is no app-owned backend service. The team used a documented "contracts + mocks" pattern (`src/contracts/`) so members could build features in parallel against agreed-upon TypeScript shapes before the real producer's code landed.

The codebase is mid-integration: individual features (duel judging, ELO calculation, presence sharing, QR validation, disconnect recovery) are each well-built and mostly unit-testable in isolation, but several are not yet wired together into the live app flow.
The current branch (`mihir/docs/product-design`) is docs-only; the code reflects the last landed feature work, not any change made during this analysis.

## Strengths

### [S-1] Consistent Repository abstraction across every Firestore-touching feature

- **Category:** S1 — Clear modular boundaries
- **Impact:** High
- **Explanation:** Every feature that talks to Firestore (`map`, `challenge`, `backend`) exposes a typed `XRepository` interface plus one object-literal implementation; raw Firestore calls (`getDoc`/`setDoc`/`onSnapshot`) never leak past this layer into hooks or components.
- **Evidence:** `src/features/map/services/presenceRepository.ts`, `src/features/challenge/services/challengeRequestRepository.ts`, `src/features/backend/matchResultsRepository.ts`, `src/features/backend/playerStatsRepository.ts` — same shape, independently arrived at by different feature owners.
- **Found by:** Structure & Boundaries

### [S-2] Zero circular dependencies across the whole tree

- **Category:** S4 — Dependency direction is stable
- **Impact:** High
- **Explanation:** A verified, tool-checked import graph with no cycles and one-directional cross-feature imports (`challenge` → `qr`, `postmatch` → `duel`); nothing in `src/contracts/` imports from `src/features/`.
- **Evidence:** `npx madge --circular --extensions ts,tsx src` → "No circular dependency found!" across 90 files.
- **Found by:** Coupling & Dependencies (re-run and confirmed by Verifier)

### [S-3] Duel coordinator classes share one consistent, minimal, DI-friendly shape

- **Category:** S2 / S3 / S14 — High cohesion, loose coupling, pragmatic abstractions
- **Impact:** Medium-High
- **Explanation:** `FireSignalCoordinator`, `FalseStartCoordinator`, and `DuelDisconnectRecovery` all take a constructor-injected `DuelChannel` (plus injectable clock/reconnect function for testability), hold no module-level state, and expose an explicit `dispose()`. `FireSignalCoordinator.triggerFire()` throws four distinct, descriptive errors for invalid call order rather than failing silently.
- **Evidence:** `src/features/duel/fireSignalCoordinator.ts:7,13,31,35,39,43,67`, `src/features/duel/falseStartCoordinator.ts:11,16,73`, `src/features/duel/disconnectRecovery.ts:18-119` (`MAX_RECONNECT_ATTEMPTS = 2`, `AbortController`-bounded attempts).
- **Found by:** Structure & Boundaries, Coupling & Dependencies

### [S-4] Round/gesture domain modeling is genuinely rich, not anemic

- **Category:** S13 — Domain modeling strength
- **Impact:** High
- **Explanation:** Behavior sits on small, pure functions/classes with real invariants: `roundOutcome.ts` (discriminated `win|tie|falseStart` union) → `roundJudge.ts` (`resolveRoundOutcome`, `scoreRoundOutcome`) → `roundLoop.ts` (a pure `RoundLoopState` reducer with a documented sudden-death rule).
  → `gestureSpec.ts` (`Object.freeze`d, ticket-traceable physical constants, e.g. "Approved ticket 4.9 raise-to-threshold gesture") → `raiseGestureDetector.ts`/`falseStartDetector.ts`.
- **Evidence:** `src/contracts/roundOutcome.ts`, `src/features/duel/{roundJudge,roundLoop,gestureSpec}.ts`.
- **Found by:** Structure & Boundaries

### [S-5] `matchResultsRepository` is genuinely idempotent, and Firestore rules independently enforce immutability

- **Category:** S6 / S12 — Consistent API contracts, resilience patterns
- **Impact:** High
- **Explanation:** The client checks for an existing doc before writing ("either phone may upload; rules deny updates so skip if present"), and this is backed server-side by a hard `allow update, delete: if false` rule — real defense-in-depth for a document two untrusted clients could both try to write.
- **Evidence:** `src/features/backend/matchResultsRepository.ts:52-57`; `firestore.rules` (`matchResults` block).
- **Found by:** Integration & Data

### [S-6] Player stats are a pure derived projection, avoiding dual-write drift entirely

- **Category:** S6 — Consistent API contracts
- **Impact:** Medium-High
- **Explanation:** `playerStatsRepository.getPlayerStats` recomputes wins/losses/ELO by replaying all `matchResults` docs rather than maintaining a second, independently-mutated collection — structurally avoiding an entire class of consistency bugs (at a read-time cost).
- **Evidence:** `src/features/backend/playerStatsRepository.ts`.
- **Found by:** Integration & Data

### [S-7] QR invite validation is real defense-in-depth on the one untrusted-input trust boundary

- **Category:** S10 — Security built-in
- **Impact:** Medium-High
- **Explanation:** Payload size capped before `JSON.parse`, exact (not attacker-supplied) lifetime check, 30s future-clock-skew rejection, self-invite rejection, and tokens generated via `expo-crypto` (`getRandomBytes`/`randomUUID`), not `Math.random()`.
- **Evidence:** `src/features/qr/utils/qr.validation.ts` (`INVITE_LIFETIME_MS` exact-match at line 122, `challengeToken` regex `^[0-9a-f]{32}$`), `src/features/qr/utils/qr.tokens.ts`.
- **Found by:** Security & Code Quality, Integration & Data

### [S-8] Presence publishing has real exponential backoff, write-throttling, and independent staleness detection

- **Category:** S12 — Resilience patterns
- **Impact:** Medium-High
- **Explanation:** Retries failed publishes with exponential backoff, coarsens GPS coordinates to a ~110m grid to avoid write storms, heartbeats on a fixed interval, and `useNearbyPlayers` independently re-checks staleness on a timer so stale peers drop off the map without a new snapshot.
- **Evidence:** `src/features/map/hooks/usePresencePublisher.ts:117` (`PRESENCE_RETRY_BASE_DELAY_MS * 2 ** (retryCount - 1)`), `map.constants.ts:22` (staleness = `3 * PRESENCE_HEARTBEAT_MS`, documented).
- **Found by:** Integration & Data, Error Handling & Observability

### [S-9] Firestore security rules for `presence` and `matchResults` are least-privilege and field-validated

- **Category:** S10 — Security built-in
- **Impact:** High
- **Explanation:** Rules enforce exact key sets (`hasOnly`), a `roundCount` enum (3/5/7), that `winnerId` is one of the two listed participants, `createdAt == request.time` (anti-backdating), and hard-deny `update`/`delete` on match results.
- **Evidence:** `firestore.rules`.
- **Found by:** Security & Code Quality

### [S-10] Firebase secrets are handled correctly

- **Category:** S10 — Security built-in
- **Impact:** Medium
- **Explanation:** All Firebase config is read from `process.env.EXPO_PUBLIC_FIREBASE_*`; `.env`/`.env.*` are gitignored except a blank `.env.sample`; no committed secret found anywhere in git history.
- **Evidence:** `src/lib/firebase.ts:11-18`, `.gitignore`.
- **Found by:** Security & Code Quality

### [S-11] `MapScreen` is a thin orchestrator despite being the largest screen

- **Category:** S1 — Clear modular boundaries
- **Impact:** Medium
- **Explanation:** At 224 lines (the largest file in the tree), it delegates entirely to five single-purpose hooks and seven presentational components rather than accumulating logic itself.
- **Evidence:** `src/features/map/MapScreen.tsx`.
- **Found by:** Structure & Boundaries

## Flaws/Risks

### [F-1] Map and challenge screens show fabricated player stats — stale mock never swapped for the shipped real implementation

- **Category:** Flaw 3 — Tight coupling to a concrete stub (also Flaw 13 — inconsistent boundaries)
- **Impact:** High
- **Explanation:** `usePlayerStats.ts` and `OpponentPopup.tsx` both import `mockPlayerStats` directly, even though the real, Firestore-backed, ELO-computing `playerStatsRepository` already landed and is exported — but has zero importers anywhere in the app.
- **Evidence:** `src/features/map/hooks/usePlayerStats.ts:3,32`, `src/features/challenge/components/OpponentPopup.tsx:9-10,11,23` (stale comment: `// TODO(mihir): once 5.1/5.5/5.4 land, swap this mock for the real Firestore-backed lookup`), `src/features/backend/playerStatsRepository.ts`.
- **Found by:** Structure & Boundaries, Coupling & Dependencies, Security & Code Quality (cross-confirmed by 3 specialists)

### [F-2] `challengeRequests` Firestore collection has no security rules

- **Category:** Flaw 30 — Security as an afterthought
- **Impact:** High
- **Explanation:** `firestore.rules` only covers `presence` and `matchResults`; `challengeRequestRepository.ts` writes to `challengeRequests` with no matching rule. Under Firestore's default-deny model this write likely fails in production — or, if a broader rule exists outside this repo, the collection is unprotected against forged `challengerId`/`roundCount` values.
- **Evidence:** `firestore.rules` (no `challengeRequests` block); `src/features/challenge/services/challengeRequestRepository.ts:33`.
- **Found by:** Integration & Data, Security & Code Quality

### [F-3] CI never runs the Jest suite or the round-loop self-check — no automated gate on duel/security logic

- **Category:** Flaw 32 — Missing or inadequate test coverage for critical paths
- **Impact:** High
- **Explanation:** `.github/workflows/react-native-ci.yml` runs only `npx tsc --noEmit`; no workflow runs `jest` or `roundLoop.check.ts`. Only 2 test files exist repo-wide, and neither touches `roundJudge.ts`, `elo.ts`, the fire/false-start coordinators, or QR token validation — all confirmed to pass locally but never gate a merge.
- **Evidence:** `.github/workflows/react-native-ci.yml`; `package.json:11` (`"test": "jest --runInBand"`, never invoked in CI).
- **Found by:** Security & Code Quality

### [F-4] Offline match-result queue can silently lose data on corruption, with no signal

- **Category:** Flaw 12 — Hidden side effects
- **Impact:** High
- **Explanation:** `readQueue()`'s bare `catch` on `JSON.parse` returns `[]` on any parse failure, indistinguishable from "no queue yet" — a corrupted persisted queue (partial write, format change across app versions) silently discards match results a player was waiting to sync.
- **Evidence:** `src/features/backend/matchResultQueue.ts:20-30`.
- **Found by:** Error Handling & Observability

### [F-5] Duel-critical coordinator classes are fully built but have zero production callers; the live pre-round screen bypasses their safety guards

- **Category:** Flaw 27 — Temporal coupling
- **Impact:** Medium-High
- **Explanation:** `FireSignalCoordinator`, `FalseStartCoordinator`, and `DuelDisconnectRecovery` are only referenced by their own (also-orphaned) mock-pair helpers.
  The one screen actually reachable from `App.tsx` (`PreRound.tsx`) reimplements similar buzz/countdown sequencing with raw nested `setTimeout` calls instead, with no `dispose()`/`AbortController` equivalent to cancel timers on unmount — so the ordering/safety guarantees these classes exist to provide (role checks, "can't fire twice", disconnect checks) do not currently protect the live flow.
- **Evidence:** `src/features/duel/PreRound.tsx:108-124`; zero non-self, non-mock importers of `FireSignalCoordinator`/`FalseStartCoordinator`/`DuelDisconnectRecovery` repo-wide.
- **Found by:** Structure & Boundaries, Coupling & Dependencies, Integration & Data, Security & Code Quality (cross-confirmed by 4 specialists)

### [F-6] Duel-critical thresholds and timings are hard-coded inline in a screen file instead of extracted alongside sibling constants

- **Category:** Flaw 28 — Magic numbers/strings everywhere (also Flaw 25 — business logic in the UI)
- **Impact:** Medium-High
- **Explanation:** `SEPARATION_RSSI_THRESHOLD`, an inline `isFaceDown()` predicate, a 1000–3000ms random buzz delay, and `Accelerometer.setUpdateInterval(150)` are all defined at module scope inside `PreRound.tsx`, rather than in `gestureSpec.ts` — the established location for exactly this kind of physical/timing constant elsewhere in `duel/`.
  The 150ms interval also silently disagrees with `accelerometerRaiseMonitor.ts`'s `SENSOR_UPDATE_INTERVAL_MS = 20` for the same sensor, with no comment explaining the difference.
- **Evidence:** `src/features/duel/PreRound.tsx:12,24-26,48,108`; `src/features/duel/accelerometerRaiseMonitor.ts:8,40`.
- **Found by:** Structure & Boundaries, Error Handling & Observability

### [F-7] Backend match-submission pipeline is fully implemented but entirely unwired from the running app

- **Category:** Flaw 13 — Inconsistent boundaries (a module-level singleton it manages is consequently dead — Flaw 1)
- **Impact:** Medium
- **Explanation:** `startMatchResultQueueSync` is exported but has zero callers anywhere; the module-level `stopNetworkSubscription` singleton it guards is therefore dead in practice.
  This is self-acknowledged, in-progress work (`RoundResultScreen.tsx`/`MatchSummaryScreen.tsx` doc comments, a literal `TODO(4.x)` in `App.tsx`), not silent neglect — but as of the current tree, no round outcome ever reaches a match-result write, and there is no transactional/rollback strategy because no pipeline connects the pieces yet.
- **Evidence:** `src/features/backend/matchResultsService.ts:98,104-129`; `App.tsx:152`.
- **Found by:** Structure & Boundaries, Integration & Data, Security & Code Quality

### [F-8] The composition root discards the real duel channel; `DuelScreen` always runs on a mock

- **Category:** Flaw 27 — Temporal coupling
- **Impact:** Medium
- **Explanation:** `ConnectingScreen`'s `onConnected` callback discards its channel argument (`console.log` + `TODO(4.x)` comment) instead of passing it onward, and `App.tsx` always renders `<DuelScreen />` with no props, so it silently falls back to an in-process mock channel pair regardless of whether a real connection just completed.
- **Evidence:** `App.tsx:151-159`; `src/features/duel/DuelScreen.tsx:16-24`.
- **Found by:** Coupling & Dependencies

### [F-9] Orphaned mock chain contradicts the documented "contracts + mocks" lifecycle

- **Category:** Flaw 31 — Dead code / unused dependencies
- **Impact:** Medium
- **Explanation:** `mockChallengeHandoff.ts`, `mockRoundOutcome.ts`, `mockMatchResult.ts`, `mockFalseStartPair.ts`, and `mockFireSignalPair.ts` all have zero real importers (only comment mentions or references from each other). `src/contracts/README.md` explicitly documents that a mock should be deleted once the real producer lands — this cleanup step was skipped for all five.
- **Evidence:** `src/contracts/mocks/{mockChallengeHandoff,mockRoundOutcome,mockMatchResult}.ts`, `src/features/duel/{mockFalseStartPair,mockFireSignalPair}.ts`.
- **Found by:** Coupling & Dependencies, Security & Code Quality

### [F-10] Duplicate business-rule constants with no shared source of truth

- **Category:** Flaw 22 — Configuration sprawl
- **Impact:** Medium
- **Explanation:** Two pairs of duplicated constants exist with no import relationship: the 60-second challenge/invite lifetime is defined separately in `qr.validation.ts` (`INVITE_LIFETIME_MS`) and `challengeRequestRepository.ts` (`CHALLENGE_LIFETIME_MS`); `DEFAULT_ELO_RATING = 1500` is defined in both `elo.ts` (dead, unused copy) and `types.ts` (the one actually imported).
  If either pair is tuned in only one place in the future, the two will silently disagree.
- **Evidence:** `src/features/qr/utils/qr.validation.ts:8`, `src/features/challenge/services/challengeRequestRepository.ts:12`; `src/features/backend/elo.ts:1`, `src/features/backend/types.ts:5`.
- **Found by:** Error Handling & Observability, Structure & Boundaries

### [F-11] Auth screens discard the actual error and always show the same generic message

- **Category:** Flaw 20 — Weak error handling strategy
- **Impact:** Medium
- **Explanation:** `LoginScreen.tsx` and `RegisterScreen.tsx` both use a bare `catch { Alert.alert(...) }` with a fixed "Invalid email or password" message, regardless of whether the real cause was a network outage, misconfiguration, or rate limiting — and nothing is logged.
- **Evidence:** `src/screens/LoginScreen.tsx:22-26`, `src/screens/RegisterScreen.tsx:25-29`.
- **Found by:** Error Handling & Observability

### [F-12] Draw calibration screen discards which sensor-start failure occurred

- **Category:** Flaw 20 — Weak error handling strategy
- **Impact:** Medium
- **Explanation:** A bare `catch` collapses several distinct possible `AccelerometerRaiseMonitor.start()` failures into one generic "error" status with no logging of which one occurred.
- **Evidence:** `src/features/duel/DrawCalibrationScreen.tsx:60-63`.
- **Found by:** Error Handling & Observability

### [F-13] QR handoff generates and validates a `challengeToken` that is then discarded before use

- **Category:** Flaw 30 / 31 — Security as an afterthought / dead code
- **Impact:** Medium
- **Explanation:** `qr.tokens.ts` generates a cryptographically random `challengeToken` and `qr.validation.ts` format-validates it, but `QrScannerScreen.tsx` drops it when building the scanned invite — it never reaches `ChallengeHandoff` or the Firestore write, so it currently protects nothing. Plausibly reserved for the not-yet-built BLE handshake.
- **Evidence:** `src/features/qr/utils/qr.tokens.ts:14`, `src/features/qr/utils/qr.validation.ts:65-71`, `src/features/challenge/QrScannerScreen.tsx:68-73`.
- **Found by:** Security & Code Quality

### [F-14] `disconnectRecovery`'s reconnect failures are swallowed with no diagnostic detail

- **Category:** Flaw 21 — No observability plan
- **Impact:** Medium
- **Explanation:** The rejection reason from a failed reconnect attempt is discarded entirely, so there is no way to tell whether a specific BLE disconnect-recovery failure was a timeout, a transport error, or something else — in exactly the failure path this class exists to handle.
  A recent, deliberate feature addition, not legacy neglect, but this code path is currently unreachable in production (see F-5), so it cannot yet cause a silent production failure.
- **Evidence:** `src/features/duel/disconnectRecovery.ts:110-112`.
- **Found by:** Error Handling & Observability

### [F-15] `FalseStartDetector.process()` silently no-ops when a precondition is missed

- **Category:** Flaw 27 — Temporal coupling
- **Impact:** Low
- **Explanation:** Returns `null` with no error or warning if `arm()` wasn't called first for the round — a caller that forgets to arm the detector gets no signal that false-start detection is inactive. Low practical impact today since nothing calls this class in production (see F-5).
- **Evidence:** `src/features/duel/falseStartDetector.ts:32-39`.
- **Found by:** Coupling & Dependencies

### [F-16] Inconsistent rigor for similarly-shaped "persist small state" operations

- **Category:** Flaw 34 — Inconsistent error/logging conventions
- **Impact:** Low-Medium
- **Explanation:** `useSharingPreference.ts` swallows `AsyncStorage` write failures completely (no log, retry, or UI feedback), while `usePresencePublisher.ts` in the same directory applies typed error state and exponential backoff to a similarly-shaped persistence operation, with no documented rationale for the difference.
- **Evidence:** `src/features/map/hooks/useSharingPreference.ts:45,51-53`, `src/features/map/hooks/usePresencePublisher.ts:91-126`.
- **Found by:** Error Handling & Observability

### [F-17] `MatchSummaryScreen` reaches directly into another feature's internal module for a pure function

- **Category:** Flaw 13 — Inconsistent boundaries
- **Impact:** Low
- **Explanation:** Imports `scoreFromRounds` from `../duel/roundLoop` rather than via the shared `src/contracts/` seam every other cross-feature boundary in this codebase uses. Low severity since it's a single pure, stateless function and the dependency direction is still acyclic.
- **Evidence:** `src/features/postmatch/MatchSummaryScreen.tsx:15`.
- **Found by:** Coupling & Dependencies

### [F-18] Mixed-language comments in a security-relevant file

- **Category:** Flaw 34 — Inconsistent conventions (code hygiene)
- **Impact:** Low
- **Explanation:** Chinese-language inline comments are mixed into otherwise English source in the same file that also has the missing-security-rules gap (F-2) — a sign this file didn't get a careful review pass.
- **Evidence:** `src/features/challenge/services/challengeRequestRepository.ts:1-2,16,19,38`.
- **Found by:** Security & Code Quality

## Coverage Checklist

### Flaw/Risk Types 1–34

| #   | Type                                                   | Status         | Finding                                                                                                                                      |
| --- | ------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Global mutable state                                   | Observed       | #F-7                                                                                                                                         |
| 2   | God object                                             | Not observed   | —                                                                                                                                            |
| 3   | Tight coupling                                         | Observed       | #F-1                                                                                                                                         |
| 4   | High/unstable dependencies                             | Not observed   | —                                                                                                                                            |
| 5   | Circular dependencies                                  | Not observed   | —                                                                                                                                            |
| 6   | Leaky abstractions                                     | Not observed   | —                                                                                                                                            |
| 7   | Over-abstraction                                       | Not observed   | —                                                                                                                                            |
| 8   | Premature optimization                                 | Not observed   | —                                                                                                                                            |
| 9   | Shotgun surgery                                        | Not observed   | —                                                                                                                                            |
| 10  | Feature envy / anemic domain model                     | Not observed   | —                                                                                                                                            |
| 11  | Low cohesion                                           | Not observed   | —                                                                                                                                            |
| 12  | Hidden side effects                                    | Observed       | #F-4                                                                                                                                         |
| 13  | Inconsistent boundaries                                | Observed       | #F-1, #F-7, #F-17                                                                                                                            |
| 14  | Distributed monolith                                   | Not applicable | Firebase is BaaS, not an owned server tier; no multi-service tangle exists                                                                   |
| 15  | Chatty service calls                                   | Not observed   | —                                                                                                                                            |
| 16  | Synchronous-only integration                           | Not applicable | No owned service tier; the BLE peer link is designed but not yet running in code                                                             |
| 17  | No clear ownership of data                             | Not observed   | —                                                                                                                                            |
| 18  | Shared database across services                        | Not applicable | No multiple owned services share a DB; the closest analogue (two clients writing `matchResults`/`presence`) is well-mitigated — see S-5, S-9 |
| 19  | Lack of idempotency                                    | Not observed   | Opposite confirmed — see S-5                                                                                                                 |
| 20  | Weak error handling strategy                           | Observed       | #F-11, #F-12                                                                                                                                 |
| 21  | No observability plan                                  | Observed       | #F-14                                                                                                                                        |
| 22  | Configuration sprawl                                   | Observed       | #F-10                                                                                                                                        |
| 23  | Dependency injection misuse                            | Not observed   | —                                                                                                                                            |
| 24  | Inconsistent API contracts                             | Not observed   | Opposite confirmed — see S-7                                                                                                                 |
| 25  | Business logic in the UI                               | Observed       | #F-6                                                                                                                                         |
| 26  | Poor transactional boundaries                          | Not observed   | No pipeline exists yet to have transactional boundaries (see #F-7)                                                                           |
| 27  | Temporal coupling                                      | Observed       | #F-5, #F-8, #F-15                                                                                                                            |
| 28  | Magic numbers/strings everywhere                       | Observed       | #F-6                                                                                                                                         |
| 29  | "Utility" dumping ground                               | Not observed   | —                                                                                                                                            |
| 30  | Security as an afterthought                            | Observed       | #F-2, #F-13                                                                                                                                  |
| 31  | Dead code / unused dependencies                        | Observed       | #F-9, #F-13                                                                                                                                  |
| 32  | Missing or inadequate test coverage for critical paths | Observed       | #F-3                                                                                                                                         |
| 33  | Hard-coded credentials or secrets in source            | Not observed   | Opposite confirmed — see S-10                                                                                                                |
| 34  | Inconsistent error/logging conventions across services | Observed       | #F-16, #F-18                                                                                                                                 |

### Strength Categories S1–S14

| #   | Category                       | Status       | Finding                                                                    |
| --- | ------------------------------ | ------------ | -------------------------------------------------------------------------- |
| S1  | Clear modular boundaries       | Observed     | #S-1, #S-11                                                                |
| S2  | High cohesion                  | Observed     | #S-3                                                                       |
| S3  | Loose coupling                 | Observed     | #S-3                                                                       |
| S4  | Dependency direction is stable | Observed     | #S-2                                                                       |
| S5  | Dependency management hygiene  | Not observed | Orphaned mocks (#F-9) undercut a clean claim here                          |
| S6  | Consistent API contracts       | Observed     | #S-5, #S-6, #S-7                                                           |
| S7  | Robust error handling          | Observed     | #S-3 (descriptive throws), #S-8 (typed retry state)                        |
| S8  | Observability present          | Not observed | See #F-3, #F-14                                                            |
| S9  | Configuration discipline       | Not observed | Undercut by #F-6, #F-10 despite good examples elsewhere (`gestureSpec.ts`) |
| S10 | Security built-in              | Observed     | #S-7, #S-9, #S-10                                                          |
| S11 | Testability & coverage         | Not observed | See #F-3                                                                   |
| S12 | Resilience patterns            | Observed     | #S-5, #S-8                                                                 |
| S13 | Domain modeling strength       | Observed     | #S-4                                                                       |
| S14 | Simple, pragmatic abstractions | Observed     | #S-3                                                                       |

## Hotspots

1. `src/features/duel/` — Holds the codebase's strongest domain modeling (`roundJudge.ts`, `roundLoop.ts`, `gestureSpec.ts`) side by side with its biggest wiring gap: three well-built coordinator classes with zero production callers, a pre-round screen that reimplements their logic without their safety guards.
   Also: hard-coded gameplay thresholds outside the established constants file, and a reconnect path that swallows its own failure reason.
2. `src/features/backend/` + `firestore.rules` — Contains genuinely strong idempotency/rules-enforcement design (`matchResultsRepository`, `playerStatsRepository`), but also the fully-unwired match-submission pipeline and the one Firestore collection (`challengeRequests`) with no rules at all.
3. `src/features/map/` and `src/features/challenge/` (stats surfaces) — The single most concretely user-visible defect in this report: two production screens display fabricated win/loss/ELO data via a stale mock, despite the real Firestore-backed implementation having shipped and sitting unused.

## Next Questions

1. Is `bleDuelSessionTransport.ts`'s BLE approach still the intended production transport, or is it expected to be replaced — and should the stub be removed rather than completed if so?
2. Now that `playerStatsRepository` has landed, was wiring it into `usePlayerStats.ts`/`OpponentPopup.tsx` simply missed, or is there a reason the mock is still load-bearing?
3. Was the missing `challengeRequests` security rule an oversight, or has that write path not yet been exercised against a real Firebase project?
4. Is there a plan to retrofit `PreRound.tsx`'s countdown/buzz sequencing onto `FireSignalCoordinator`/`FalseStartCoordinator`, or were those classes built ahead of an integration step that's since taken a different direction?
5. Is CI expected to run `jest` before the duel-judging, ELO, or QR-validation logic grows further?

## Analysis Metadata

- **Agents dispatched:** Structure & Boundaries, Coupling & Dependencies, Integration & Data, Error Handling & Observability, Security & Code Quality (5 specialists, parallel), plus 1 Verifier
- **Scope:** 91 source files under `src/` plus `App.tsx`/`index.ts` (full repository, medium scope size)
- **Raw findings:** 57 (35 flaws + 22 strengths, before verification/merge)
- **Verified findings:** 30 (18 flaws + 11 strengths after merge — presented above as 18 numbered flaws, F-1 through F-18)
- **Filtered out:** 27 (12 explicitly dropped by the Verifier for insufficient evidence, redundancy, or being self-described as speculative; the remainder consolidated as cross-specialist duplicates of the same underlying issue, e.g. the stale-mock and unwired-pipeline findings each reported independently by 3-4 specialists)
- **By impact (flaws):** 3 High (#F-2, #F-3, #F-4) + 1 High cross-confirmed (#F-1) = 4 High, 2 Medium-High, 8 Medium, 1 Low-Medium, 3 Low
- **Steering files consulted:** `AGENTS.md`, `src/contracts/README.md`, `docs/product-design/{README,Roadmap,Gameplay-v2,UI,Leaderboards}.md` — no contradictions between steering files and code were flagged as standalone findings, though `src/contracts/README.md`'s documented mock-cleanup lifecycle is the basis for F-1 and F-9.
