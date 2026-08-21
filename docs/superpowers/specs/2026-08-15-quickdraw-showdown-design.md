# Quickdraw Showdown — Semester Feasibility and Design

**Date:** 2026-08-15  
**Sources:** `quickdraw-showdown/quickdraw-showdown-game-idea.md`, [`project-constraints.png`](../../human-plans/project-constraints.png), brainstorming session  
**Status:** Draft for team review

---

## 1. Verdict

**Yes — feasible as a university semester-long group project**, under the freeze in this document.

It is **not feasible** if the team also tries to ship, in one semester with no game-dev experience: Wi-Fi Direct + hotspot + BLE in parallel, millisecond-fair timing, a full fire/aim/headshot combat model on day one, **and** dual-platform polish without an early P2P spike.

**Locked path:** React Native on **Android and iOS**; nearby-only QR challenge; **Bluetooth LE** for the live duel; raise-to-win first (fire button later); **cloud for map presence and statistics only** (not the referee).

**Unit-stack note:** the course recommends Android + Kotlin with workshop support. This project uses **React Native by group choice**. That requires **unanimous** agreement and gets **no staff support**. At least one teammate has already shipped RN onto a physical iPhone; that person owns signing and dual-OS device QA.

---

## 2. Project and course context

### 2.1 Course requirements (`project-constraints.png`)

| Constraint                   | Implication                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Groups of 4–6                | Parallel owners; weekly integration on one demo path                               |
| Android + Kotlin recommended | RN is allowed only if unanimous; no workshop support                               |
| Must run on a phone          | Dual-OS demo: one Android phone **and** one iPhone                                 |
| Multiple sensors             | GPS (map) + accelerometer for raise; gyroscope only if cheap to add                |
| Internet / cloud             | Online presence, queued match results, later leaderboard reads                     |
| Usable and innovative        | Co-located showdown ritual + sensors + local P2P; not a tutorial clone             |
| Not a weekend project        | Map + QR + cross-platform BLE + sensors + stats exceeds a weekend if done properly |

### 2.2 Original idea (`quickdraw-showdown/quickdraw-showdown-game-idea.md`)

1. Mobile quickdraw using at least two sensors.
2. Map (GPS) shows other online players.
3. Challenge by locating a player and showing a pairing QR; accepter scans; a P2P connection starts the game.
4. Hold the phone, hear a countdown, then raise into a duel pose.
5. Stack originally listed as React Native, Godot, or Kotlin.

The idea note stopped at the raise. Brainstorming filled the rest.

### 2.3 Decisions from brainstorming

| Topic                | Decision                                                               |
| -------------------- | ---------------------------------------------------------------------- |
| Win condition (MVP)  | **First valid raise after countdown** (motion + reaction)              |
| Combat stretch       | Fire **button** after a valid raise; kills/headshots only then         |
| Where duels happen   | **Nearby only** (map + QR; both stand together)                        |
| Stack                | **React Native**, Android **and** iOS at demo time                     |
| RN/iOS skill         | At least one person has built, signed, and run RN on a physical iPhone |
| Live duel networking | **True P2P** — MVP is **Bluetooth LE**                                 |
| Dropped for MVP      | Wi-Fi Direct (no usable iOS path as one feature)                       |
| Documented fallbacks | Same-Wi-Fi WebRTC if BLE spike fails; hotspot last resort              |
| Backend              | Statistics only: results, later leaderboard; not live combat           |

---

## 3. Approaches considered

### Approach 1 — RN + cloud-mediated match, local raise (not chosen)

Both phones join a cloud match after QR. Raise events go to the server; server names a winner.

| Pros                                        | Cons                                     |
| ------------------------------------------- | ---------------------------------------- |
| Simpler dual-OS networking                  | Not true P2P (rejected)                  |
| Easier stats (server already has the match) | Latency can decide “who raised first”    |
|                                             | Weaker fit to the original pairing story |

**Semester fit:** safer, but the team requires phone-to-phone duel traffic.

### Approach 2 — RN + true P2P duel + cloud stats (chosen)

QR to meet; **BLE** for `ready` / countdown / `raised` / result; backend stores **MatchResult** (and later derived leaderboard). Map presence still uses the internet.

| Pros                                                        | Cons                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| Matches “true P2P” and nearby showdown                      | BLE permissions and host/guest roles differ on Android vs iOS |
| Tiny payloads are enough for raise-to-win                   | No workshop support for RN                                    |
| Phones can stay on internet and upload stats after the draw | Dual-device QA is mandatory                                   |
| Course sensors + cloud still satisfied                      | Timing is demo-good, not esports-fair                         |

**Semester fit:** Strong **if** the week 1–2 BLE spike passes on one Android + one iPhone.

### Approach 3 — Bare RN + custom native timing modules (not chosen)

Native iOS/Android code for motion timestamps; JS for map/QR.

| Pros                    | Cons                                                         |
| ----------------------- | ------------------------------------------------------------ |
| Fairer clocks in theory | One iOS-experienced person becomes a bottleneck              |
|                         | Two native modules; raise-first does not need that precision |

**Semester fit:** only if Approach 2’s tie window feels unfair in playtests **after** BLE works.

---

## 4. Locked design

### 4.1 Product concept

A **location-aware social quickdraw app**: see nearby online players on a map, challenge with QR, connect over **Bluetooth LE**, play a short **raise-first** duel, then **upload the result**. Innovation is the **co-located showdown ritual + local P2P + sensors**, not 3D gunplay.

“P2P” means **phone-to-phone duel messages**. It does not mean Bluetooth as a substitute for the map’s cloud presence.

### 4.2 Play loop

1. Sign in (anonymous or email; display name).
2. Appear on the map (GPS + cloud presence); optional invisible/offline toggle.
3. Challenger shows QR; accepter scans.
4. BLE session: challenger is **host**, scanner is **guest**.
5. Both tap ready; host broadcasts `countdown-start`.
6. Each phone counts down **locally** from that message.
7. First **valid raise** after go wins; raise before go is a **false-start** (loss, or restart if both false-start).
8. Both phones show the result; **MatchResult** uploads (or queues until online).

Remote duels are out of scope.

### 4.3 Raise detection

Accelerometer detects motion from “phone down / at side” to “phone up in front of the face.” Gyroscope may be added if it is cheap and improves the gesture. Tune a threshold in playtests. No pose ML.

**Test-your-draw** screen before ready: raise once, see a checkmark. If detection is too twitchy or never fires, loosen the threshold.

### 4.4 Timing and ties

Host compares `raised` packets (local ms since go) and broadcasts `winner`. If both raises fall within **80 ms**, call a **tie** and offer one sudden-death rematch. Do not treat BLE as a photo finish.

### 4.5 QR payload

Match id plus a BLE pairing hint (host name / short token). QR is how players meet; BLE is how they play. Invalid or expired token → “ask them to show a new code.”

### 4.6 BLE protocol (live only)

Short messages: `hello`, `ready`, `countdown-start`, `raised`, `false-start`, `result`, `abort`. Host is the authority for winner/tie. Course-demo security: same room + QR token; no extra crypto.

Library direction: a maintained RN BLE stack (e.g. `react-native-ble-plx`) on an **Expo dev client or bare RN** app. **Expo Go is not sufficient.**

### 4.7 Backend (not live combat)

| Data        | Purpose                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| User        | id, display name                                                                                     |
| Presence    | last lat/lng, online, updated-at (coarse interval)                                                   |
| MatchResult | both ids, outcome (`win` / `loss` / `tie` / `false-start` / `aborted`), time-to-raise ms, created-at |
| Leaderboard | **derived** from results (query or simple aggregation), not a second product                         |

No `kills` or `headshots` fields until the fire-button stretch exists. Presence is not a chat server and not a lockstep tick.

BaaS example: Firebase (auth + database). Free tier is enough for a demo.

### 4.8 Stretch (only after MVP)

- Fire **button** after a valid raise; first valid fire wins
- `kills` / `headshots` stats once firing exists
- Leaderboard **UI** reading MatchResult
- Gyroscope if it clearly helps the raise
- **Same-Wi-Fi WebRTC** if the BLE spike fails (planned fallback, not a second MVP radio)
- Hotspot only as last resort (guest joins host AP, then reconnects to upload stats)

### 4.9 Explicitly out of scope for semester MVP

- Wi-Fi Direct as the demo path
- Shipping BLE **and** WebRTC **and** hotspot as three first-class transports
- Remote / over-the-internet duels
- Aiming, 3D characters, headshot hitboxes
- Perfect reaction-time fairness or anti-cheat
- Kotlin or Godot parallel apps
- iOS-only or Android-only as the marked demo (both OS are required)

### 4.10 Errors and recovery

| Failure                               | Behaviour                                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| Location, Bluetooth, or camera denied | Short “why we need this” + open settings; that feature fails closed                       |
| QR invalid/expired                    | Ask for a new code; do not guess another host                                             |
| BLE connect fails                     | 10–15 s timeout, stand closer, retry; no automatic radio switch in MVP                    |
| BLE drops mid-duel                    | Abort locally; **do not** write a win; optional `aborted` row if online; rematch = new QR |
| Opponent never ready                  | Host cancels; no result row                                                               |
| GPS poor (indoors)                    | QR challenge still allowed; pins may be coarse                                            |
| Stats while offline                   | Queue MatchResult; flush when the network returns. Phones already decided the winner      |
| Raise detection bad                   | Test-your-draw + threshold tweak; no ML                                                   |

### 4.11 Permissions (both OS)

Location; Bluetooth (including Android 12+ `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT`); camera for QR. Deny-path must not crash.

### 4.12 Suggested work split (4–6 people)

Pair on BLE and iOS signing. Weekly vertical slice: map → QR → BLE → raise → stats.

| Owner          | Work                                                                 |
| -------------- | -------------------------------------------------------------------- |
| 1              | Auth, presence schema, MatchResult + queued upload                   |
| 2              | Map + GPS + privacy toggle                                           |
| 3              | QR challenge + BLE session (host/guest)                              |
| 4              | Countdown, raise detection, duel UI, result                          |
| 5              | iOS signing / TestFlight + dual-OS permission QA                     |
| 6 (if present) | Onboarding, empty states, demo script, leaderboard read from results |

---

## 5. Stack and spike

**App:** React Native, one codebase, Android **and** iOS. Development build (Expo `dev-client` or bare), not Expo Go.

**Cloud:** BaaS for auth, presence, MatchResult.

**Week 1–2 spike (pass/fail):** BLE host/guest on **one physical Android + one physical iPhone**; send `ready` and `raised`. If that fails, switch to documented **same-Wi-Fi WebRTC** (QR carries join/offer). Do not polish the map until this spike has a yes or no.

The teammate who has shipped RN on iPhone owns certificates, device install, and the iOS half of the spike.

---

## 6. Success criteria (semester)

The project succeeds if, at demo time, on **two real phones** (Android and iPhone):

1. Both players appear on each other’s map when online (GPS + cloud).
2. Challenger shows QR; accepter scans; **BLE connects**.
3. Shared countdown; **first valid raise wins**; false-start is handled.
4. Result is visible on both phones; a **MatchResult** is stored (or queued then flushed).
5. A stranger can complete permissions and one duel without a narrator.

Anything beyond that (fire button, kills/headshots, leaderboard UI, WebRTC/hotspot) is bonus, not failure if missing.

**Demo hygiene:** Bluetooth on, location on, stand about 2 m apart; emulators are for map/UI only, not BLE.

---

## 7. Risk register

| Risk                                      | Severity | Mitigation                                                                        |
| ----------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| No workshop support for RN                | High     | Unanimous choice; freeze one stack; iOS-experienced teammate owns device pipeline |
| BLE permissions / host-guest differ by OS | High     | Week 1–2 spike on both phones; fail over to WebRTC, not a third radio             |
| Dual-platform QA eats the calendar        | High     | Shared JS; owner 5 on certificates; physical-device script weekly                 |
| Raise threshold feels bad                 | Medium   | Test-your-draw; tune; 80 ms tie window                                            |
| P2P scope creep (Direct + hotspot + BLE)  | High     | One MVP transport (BLE); others documented only                                   |
| Treating the server as referee            | Medium   | Winner decided on phones; backend stores stats                                    |
| Stats/kills fields before firing exists   | Low      | MatchResult outcomes only until fire-button stretch                               |

---

## 8. How the idea meets the unit mark

| Requirement      | Coverage                                                                 |
| ---------------- | ------------------------------------------------------------------------ |
| Phone app        | Yes — Android and iOS via RN                                             |
| Multiple sensors | GPS + accelerometer (gyro optional)                                      |
| Internet/cloud   | Presence, MatchResult, later leaderboard                                 |
| Usable           | Onboarding, permission copy, abort/retry, queued upload                  |
| Innovative       | Co-located QR showdown + BLE duel + raise gesture (not a tap-only clone) |
| Non-trivial      | Dual-OS BLE + map + QR + sensors + stats; not a weekend toy              |

---

## 9. Conclusion

Quickdraw Showdown is a **strong course fit** when framed as a **context-aware co-located challenge app** with a **tiny local P2P duel**, not a networked shooter.

Semester success depends on:

1. **Raise-to-win first**; fire button and kills/headshots later
2. **BLE only** for live duel traffic; cloud for presence and stats
3. **Early Android + iPhone BLE spike**
4. **React Native dual-OS QA** owned by someone who has already shipped RN on iPhone
5. **Hard MVP freeze** (no Wi-Fi Direct, no remote duels, no second game)

**Final call: Feasible — proceed with Approach 2 and the freeze in §4.**

---

## 10. Sources and assumptions

- Idea: `quickdraw-showdown/quickdraw-showdown-game-idea.md`
- Constraints: `project-constraints.png`, `AGENTS.md`
- Assumptions: ~10–13 weeks of project work; student demo devices (Android + iPhone) available; free-tier BaaS; group is unanimous on React Native and accepts no workshop support; team size 4–6 with no prior game development experience.
- Brainstorming: raise-first then fire button; nearby-only; RN on both OS; BLE duel; stats-only backend.

_This spec consolidates feasibility and scoped design for team review. An implementation plan is a separate step if the team commits to this idea._
