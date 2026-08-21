# Quickdraw Showdown — Implementation Design

**Date:** 2026-08-21  
**Product design:** [`2026-08-15-quickdraw-showdown-design.md`](./2026-08-15-quickdraw-showdown-design.md)  
**Constraints:** [`../../human-plans/project-constraints.png`](../../human-plans/project-constraints.png)  
**Status:** Approved in brainstorming; ready for implementation plan  
**Deadline:** 1 October 2026 (~41 days from design date)

---

## 1. Purpose

Turn the locked Quickdraw Showdown product design into a **buildable, spike-gated implementation design** for a six-person team on a compressed calendar. This document freezes open stack choices and the work order. A separate implementation plan (task checklist) follows after team review of this file.

Product behaviour in the Aug 15 design remains authoritative unless this document explicitly overrides it.

---

## 2. Locked decisions (brainstorming)

| Topic          | Decision                                                                        |
| -------------- | ------------------------------------------------------------------------------- |
| Product        | Quickdraw Showdown (not boxing)                                                 |
| Product freeze | Aug 15 design §4–§6, mostly locked                                              |
| Scaffold       | Expo + continuous native builds (`dev-client` / EAS). Expo Go is not sufficient |
| Backend        | Firebase (Auth + Firestore)                                                     |
| Team size      | 6                                                                               |
| Auth (MVP)     | Email/password + Google Sign-In + Apple Sign-In                                 |
| Stats UI       | Soft MVP: **My stats** profile; full ranked leaderboard is stretch              |
| Build approach | Spike-gated vertical slices (Approach 1)                                        |
| Calendar       | Today → 1 Oct 2026 (~6 weeks)                                                   |

---

## 3. Architecture & calendar gates

### 3.1 System shape

```text
[Expo app + dev-client]
  ├─ Firebase Auth (email/password, Google, Apple)
  ├─ Firestore: users, presence, matchResults
  ├─ Map + GPS presence (internet)
  ├─ QR challenge (meet)
  └─ BLE duel (live only) → then upload MatchResult
```

**Repo:** one Expo app in `pocket-draw`. Native modules via config plugins and EAS/`dev-client` builds.

**Authority split (unchanged):** host phone decides the duel winner over BLE; Firebase stores identity, presence, and MatchResult history — never referees the draw.

### 3.2 Calendar

| Phase | Window   | Gate                                                                                                                                          |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Days 1–3 | Expo `dev-client` builds on one Android + one iPhone; Firebase project + Auth providers stubbed                                               |
| 1     | Week 1–2 | **Pass/fail:** BLE host/guest sends `ready` + `raised` cross-OS. Fail → same-Wi-Fi WebRTC fallback (documented); do not add a third transport |
| 2     | Week 3–4 | QR → countdown → raise-to-win → result UI; MatchResult write (or queue)                                                                       |
| 3     | Week 5   | Map presence + My stats; permission/onboarding polish                                                                                         |
| 4     | Week 6   | Dual-OS demo rehearsal, abort/retry paths, cut anything not demo-critical                                                                     |

### 3.3 Hard freeze until 1 Oct

Out of MVP for this window:

- Fire-button combat / kills / headshots
- Full ranked leaderboard UI
- Wi-Fi Direct
- Remote / over-the-internet duels
- Shipping BLE and WebRTC as two first-class transports (WebRTC only if spike fails)

Stretch only if Phase 2 is solid by end of week 4.

---

## 4. Components & six-person ownership

| Module             | Responsibility                                       | Depends on      | Owner                         |
| ------------------ | ---------------------------------------------------- | --------------- | ----------------------------- |
| App shell          | Expo Router nav, theme, permission gate helpers      | —               | shared / rotate               |
| Auth               | Email/password, Google, Apple; display name; session | Firebase Auth   | **1**                         |
| Presence + Map     | GPS updates, online/invisible toggle, map pins       | Auth, Firestore | **2**                         |
| Challenge (QR)     | Show/scan QR; match id + BLE hint; expiry            | Auth            | **3** (with 4)                |
| BLE session        | Host/guest connect; message protocol                 | Challenge       | **4** (with 3)                |
| Duel               | Ready, countdown, raise detect, false-start, result  | BLE, sensors    | **5**                         |
| Results + My stats | MatchResult write/queue; profile stats read          | Auth, Firestore | **1** + **6**                 |
| iOS / dual-OS QA   | Certificates, device install, weekly device script   | all             | **6** (primary) + spike buddy |

**Spike pair (week 1–2):** owners **4 + 6** (BLE + physical iPhone), with **3** on QR payload as soon as connect works.

**Integration rule:** every Friday a vertical slice on two real phones — never “merge at demo week.”

---

## 5. Data flow

### 5.1 Happy path

```text
Sign in (email / Google / Apple)
    → write/update User profile (uid, displayName)
    → start Presence loop (coarse lat/lng + online)
    → Map shows other online users

Challenger: create matchId + short BLE token → QR
Accepter: scan QR → validate token → connect BLE as guest
    → both Ready
    → host sends countdown-start
    → each phone counts locally
    → first valid raise → host decides winner/tie/false-start
    → both show Result
    → either phone uploads MatchResult (or queues if offline)
    → My stats reads that user’s MatchResults
```

### 5.2 Authority

| Concern                              | Authority                                                    |
| ------------------------------------ | ------------------------------------------------------------ |
| Who won the duel                     | **Host phone** over BLE                                      |
| Identity / presence / stored history | **Firebase**                                                 |
| Raise validity                       | **Local** accelerometer; host compares `raised` packets only |

### 5.3 Firestore shape (MVP)

- `users/{uid}` — displayName, createdAt
- `presence/{uid}` — lat, lng, online, updatedAt, invisible
- `matchResults/{id}` — player ids, outcome, timeToRaiseMs, createdAt, matchId

No `kills` / `headshots` until fire-button stretch. My stats = aggregate over that user’s MatchResults (query or client-side count). Full ranked board remains stretch.

### 5.4 Offline

Duel completes on BLE. MatchResult sits in a local queue until the network returns, then flushes.

---

## 6. Errors & recovery

| Failure                                    | App behaviour                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Auth cancel / provider misconfig           | Stay on sign-in; clear error; no crash. Apple Sign-In required on iOS builds that claim Apple |
| Location / Bluetooth / camera denied       | Short “why we need this” + open settings; that feature fails closed                           |
| QR invalid / expired                       | “Ask for a new code”; do not guess another host                                               |
| BLE connect timeout (~10–15 s per attempt) | Auto-retry **4 times**, then show a **manual Retry** button; no automatic radio switch in MVP |
| BLE drop mid-duel                          | Abort both UIs; **no** win written; optional `aborted` MatchResult if online                  |
| Opponent never ready                       | Host cancels; no result row                                                                   |
| Raise before go                            | False-start loss (or restart if both); host broadcasts                                        |
| Dual raise within ~80 ms                   | Tie → one sudden-death rematch offer                                                          |
| GPS poor indoors                           | Map pins coarse; QR challenge still allowed                                                   |
| Offline after duel                         | Queue MatchResult; flush on reconnect                                                         |
| Spike fails (week 2)                       | Freeze BLE; implement documented same-Wi-Fi WebRTC fallback; do not add a third transport     |

**Principle:** phones decide the winner; Firebase never invents wins for failed sessions.

---

## 7. Testing & demo success (1 Oct)

### 7.1 Continuous

- Emulators/simulators: map, auth, My stats, QR UI only — **not** BLE truth
- Physical Android + iPhone: weekly Friday slice (spike → QR → duel → result → stats)
- Permission deny-paths smoked once per OS before demo week
- Raise: Test-your-draw screen before ready; tune threshold in playtests

### 7.2 Demo day must show (two real phones)

1. Sign in (at least one of email / Google / Apple on each OS path claimed)
2. Both appear on the map when online
3. QR challenge → BLE connects (with auto + manual retry behaviour above)
4. Countdown → first valid raise wins; false-start handled
5. Result on both phones; MatchResult in Firebase (or queued then flushed)
6. **My stats** reflects that user’s outcomes
7. A stranger can finish one duel without a narrator

### 7.3 Not required to pass

Full ranked leaderboard, fire button, WebRTC (unless the BLE spike forced the fallback).

---

## 8. Library direction (non-binding until spike)

These are starting points for the implementation plan, not additional product requirements:

- Expo Router for navigation
- `react-native-ble-plx` (or equivalent maintained RN BLE stack) behind the BLE session module
- Firebase JS SDK and/or React Native Firebase as required by Auth providers on Expo `dev-client`
- Map: a maintained Expo-compatible maps library chosen in Phase 0/3 (must support coarse pins + presence refresh)
- QR: Expo Camera / barcode scanning APIs already used by the challenge module

Exact package pins belong in the implementation plan after Phase 0 scaffold.

---

## 9. Overrides vs Aug 15 product design

| Aug 15                       | This implementation design                                  |
| ---------------------------- | ----------------------------------------------------------- |
| Auth: anonymous or email     | Email/password + Google + Apple                             |
| Leaderboard UI: stretch      | Soft MVP: My stats in; full board still stretch             |
| Calendar: ~10–13 weeks       | Compressed to 1 Oct 2026 (~6 weeks); same spike-first order |
| BLE connect: timeout + retry | Explicit **4 auto retries** then **manual Retry** button    |
| BaaS: example Firebase       | Firebase locked                                             |
| Scaffold: Expo or bare       | Expo `dev-client` locked                                    |

All other Aug 15 locks (nearby-only, BLE live path, raise-to-win, host authority, cloud not referee) stand.

---

## 10. Next step

After the team reviews this file: invoke the **writing-plans** skill to produce a phased task checklist under `docs/superpowers/plans/`.

---

## 11. Sources

- Product design: `docs/superpowers/specs/2026-08-15-quickdraw-showdown-design.md`
- Course constraints: `docs/human-plans/project-constraints.png`
- Brainstorming session 2026-08-21 (Approach 1; Firebase; six people; auth providers; My stats soft MVP; BLE retry policy)
