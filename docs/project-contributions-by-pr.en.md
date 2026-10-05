# Pocket Draw PR and Team Contribution Summary

Updated: 2026-09-14 17:50 AEST

## 1. Research Scope and Assessment Criteria

This report covers PRs #1–#30 in `pix-l-crafters/pocket-draw`, together with work branches that had been pushed by the update time but had not yet appeared in those PR refs.

Primary evidence sources:

- GitHub's actual PR head refs: `refs/pull/1/head` through `refs/pull/30/head`.
- The PR merge refs currently provided by GitHub: #26, #27, #28, and #30.
- `origin/dev`, each member's remote branches, merge commits, commit authors, and file diffs.
- The repository's `docs/task-splits/`, `docs/task-splits-v2/` on the integration branch, and `.agents/logs/`.
- PR listing: <https://github.com/pix-l-crafters/pocket-draw/pulls>.

Note: the local GitHub CLI login token has expired, so the private repository's live reviewers, approvals, closed reasons, and PR descriptions cannot be read reliably.
This report presents only facts confirmed by Git refs as definite states; anything that cannot be confirmed is explicitly marked.
A merger is not necessarily the code author, so contribution attribution is based primarily on original commits and files in the PR head.

## 2. Current Project Status

| Level                    | Current status                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `origin/dev`             | Current through PR [#25](https://github.com/pix-l-crafters/pocket-draw/pull/25); includes the design system, Firebase/Auth, foundational Map/BLE work, shared contracts, and QR challenge flow 3.1–3.3 |
| PRs #26–#30              | The feature code has been completed separately but has not entered the current `origin/dev` directly                                                                                                   |
| Integration branch       | `origin/moby/chore/merge-2026-09-10-v2` combines #26–#30 and includes conflict fixes, tie-scoring fixes, an RSSI fix, and the latest task-status documentation                                         |
| Tingyue's current branch | `origin/tingyue/feat/challenge-connect-flow` adds the 3.4/3.5 foundation on top of `dev`; no corresponding PR ref was found among the fetched PRs #1–#30                                               |

Therefore, “the code has been written” and “the code has entered `dev`” are currently not the same thing. Before a team demo or test, the team must first decide which integration branch to use.

## 3. Contributions by Team Member

### Tingyue He (`tingyueh`)

Already in `dev`:

- PR [#4](https://github.com/pix-l-crafters/pocket-draw/pull/4): Expo/React Native environment and SDK 54 compatibility adjustments. Key files: `app.json`, `package.json`, and `package-lock.json`.
- PR [#25](https://github.com/pix-l-crafters/pocket-draw/pull/25): completed the main QR challenge flow 3.1–3.3, including QR display, camera scanning, payload validation, and the opponent-confirmation popup. Key files:
  - `src/features/challenge/QrDisplayScreen.tsx`
  - `src/features/challenge/QrScannerScreen.tsx`
  - `src/features/challenge/ChallengeScreen.tsx`
  - `src/features/challenge/components/OpponentPopup.tsx`
  - `src/features/qr/types/qr.types.ts`
  - `src/features/qr/utils/qr.tokens.ts`
  - `src/features/qr/utils/qr.validation.ts`

Pushed, but no corresponding PR has been found:

- Branch `origin/tingyue/feat/challenge-connect-flow`:
  - Adjusted the QR handoff so the scan stage no longer decides the round count in advance.
  - Added the 3/5/7-round selector and its tests.
  - Added the challenge-request repository, Firestore write test, and request type.
  - Established state in `App.tsx` for the next step of connecting scanning, round selection, and request sending.
  - Fixed the Jest TypeScript type configuration for test files.
- Key files:
  - `src/features/challenge/RoundCountSelector.tsx`
  - `src/features/challenge/RoundCountSelector.test.tsx`
  - `src/features/challenge/services/challengeRequestRepository.ts`
  - `src/features/challenge/services/challengeRequestRepository.test.ts`
  - `src/features/challenge/types/challengeRequest.types.ts`
  - `src/contracts/challengeHandoff.ts`
  - `App.tsx`
  - `tsconfig.json`
  - `docs/task-splits/tingyue.md`
  - `docs/task-splits/siheng.md`

Current remaining work: render `RoundCountSelector` in the real challenge flow, call the repository, handle the sending state, and implement 3.6 Incoming Challenge Accept/Decline.

### Siheng Ma / Ethan (Git author name `Ethan`)

Already in `dev`:

- PR [#2](https://github.com/pix-l-crafters/pocket-draw/pull/2): set up Firebase services. Key files: `src/lib/firebase.ts`, `src/types/firebase-auth.d.ts`, and dependency files.
- PR [#6](https://github.com/pix-l-crafters/pocket-draw/pull/6): map, foreground location, permission handling, and online presence publishing. Key directories and files:
  - `src/features/map/MapScreen.tsx`
  - `src/features/map/hooks/`
  - `src/features/map/services/presenceRepository.ts`
  - `src/features/map/components/`
  - `firestore.rules`

PR [#28](https://github.com/pix-l-crafters/pocket-draw/pull/28) has been coded but has not entered the current `dev` directly:

- Display other players from Firestore on the map.
- Continuous location updates, heartbeat/retry, privacy toggle, and player-data popup.
- Challenge connection screen, `useDuelSession`, and the Duel session transport boundary.
- Connection-failure and retry UI.
- Key directories and files: `src/features/map/`, `src/features/challenge/session/`, `src/features/challenge/ConnectingScreen.tsx`, and `src/features/challenge/hooks/useDuelSession.ts`.
- The real BLE transport remains a boundary/stub, and the current flow primarily depends on the mock transport.

### Mobark Walid O Bacran (`Mobark Bacran` / `Mobark Walid`)

Already in `dev`:

- PR [#1](https://github.com/pix-l-crafters/pocket-draw/pull/1): cached the Trivy database to reduce CI rate-limit problems.
- PR [#9](https://github.com/pix-l-crafters/pocket-draw/pull/9): fixed committed merge-conflict markers in `App.tsx`; this work subsequently entered the main development line through rebased/integration PRs.
- PR [#15](https://github.com/pix-l-crafters/pocket-draw/pull/15): fixed Cocogitto release hooks and Conventional Commit scopes.
- PR [#16](https://github.com/pix-l-crafters/pocket-draw/pull/16): added the Map + Duel implementation design document.
- PR [#17](https://github.com/pix-l-crafters/pocket-draw/pull/17): generated and added `CHANGELOG.md`.
- PR [#19](https://github.com/pix-l-crafters/pocket-draw/pull/19): integrated earlier EAS, design-document, design-system, and App-shell fixes.
- PR [#21](https://github.com/pix-l-crafters/pocket-draw/pull/21): fixed development-environment commands and created task-allocation documents for all six members.
- PR [#23](https://github.com/pix-l-crafters/pocket-draw/pull/23): established the cross-member shared-contracts and mock pattern. Key directories: `src/contracts/` and `docs/task-splits/`.

PR [#26](https://github.com/pix-l-crafters/pocket-draw/pull/26) has been coded but has not entered the current `dev` directly:

- Duel round-loop and match-decided logic.
- Per-round result screen.
- Final match summary, rematch, and return to the map.
- Key files: `src/features/duel/roundLoop.ts`, `src/features/duel/RoundResultScreen.tsx`, and `src/features/postmatch/MatchSummaryScreen.tsx`.

In addition, Mobark created `moby/chore/merge-2026-09-10-v2`, which integrates #26–#30, fixes tie scoring, restores the shared iOS bundle identifier, fixes the RSSI return value and duplicated AI logs, and creates `docs/task-splits-v2/`. This branch has not appeared among PRs #1–#30.

### Mihir Rabade (`MRDGH2821` / `Mihir Rabade`)

Already in `dev`:

- PR [#5](https://github.com/pix-l-crafters/pocket-draw/pull/5): Android BLE build, Java/React Native dependencies, and repository toolchain fixes.
- PR [#20](https://github.com/pix-l-crafters/pocket-draw/pull/20): fnox/secrets configuration, APM pin, and CI/tooling configuration updates.
- PR [#22](https://github.com/pix-l-crafters/pocket-draw/pull/22): restricted the treefmt platform configuration and fixed the development environment.
- PR [#24](https://github.com/pix-l-crafters/pocket-draw/pull/24): added team members' public keys to `fnox.toml`.
- As merger, Mihir merged #15, #16, #17, #19, #22, and #24; these merge actions do not change the attribution of the original feature authors.

PR [#27](https://github.com/pix-l-crafters/pocket-draw/pull/27) has been coded but has not entered the current `dev` directly:

- Match-result writes to Firestore.
- Offline queue and retry boundary.
- Player-stats repository and backend service entry point.
- Key directory: `src/features/backend/`; it also modifies `firestore.rules` and `src/contracts/playerStats.ts`.

Mihir's `mihir/chore/merge-branches-2026-09-10` also integrated #26–#30; the later v2 integration branch uses this branch as its base and fixes its issues.

### Tanachat Mongkolporn (Git author name `hbeat`)

Earlier work:

- PR [#3](https://github.com/pix-l-crafters/pocket-draw/pull/3): Bluetooth demo, development-build dependencies, and README/package compatibility fixes. This work later entered `dev` together with the Android BLE/tooling work.

The head of PR [#29](https://github.com/pix-l-crafters/pocket-draw/pull/29) was fetched, but it has not entered the current `dev`, and GitHub did not provide a current merge ref. Therefore, its live open/closed/conflict state must be confirmed after logging back into GitHub:

- Pre-round ritual: move apart, place the phone face down, random delay, haptics, and 3-2-1 countdown.
- RSSI reader boundary.
- ELO calculation and player-stats update.
- Duel pre-round App integration.
- Key files: `src/features/duel/PreRound.tsx`, `DuelScreen.tsx`, `bleRssi.ts`, `countdownAudio.ts`, and `src/features/backend/elo.ts`.

This code is already included in the v2 integration branch, but the BLE spike's final pass/fail result should still be recorded explicitly.

### Tianze Wu (`wutianze3`)

Already in `dev`:

- PR [#7](https://github.com/pix-l-crafters/pocket-draw/pull/7): Firebase authentication service, login/registration screens, and App login-state integration. Key files: `src/lib/auth.ts`, `src/screens/LoginScreen.tsx`, `src/screens/RegisterScreen.tsx`, and `App.tsx`.
- Tianze also wrote the early React Native CI commit on `main`, which was carried into later branches.

PR [#30](https://github.com/pix-l-crafters/pocket-draw/pull/30) has been coded but has not entered the current `dev` directly:

- Synchronize the FIRE signal after the countdown.
- Accelerometer raise-gesture specification, detection, and calibration.
- False-start detection and adjudication.
- Reaction time, tie window, and round judge.
- Disconnection retry/abort handling.
- Key directory: `src/features/duel/`; key documents: `docs/superpowers/specs/2026-09-06-map-duel-implementation-design.md` and `docs/task-splits/tianze.md`.

iOS signing/TestFlight and the full iOS physical-device flow test remain to be completed.

## 4. PR Status Summary

| PR                                                                                  | Primary owner/topic                                    | Status according to this Git refs investigation                                                                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [#1](https://github.com/pix-l-crafters/pocket-draw/pull/1)                          | Mobark — Trivy CI cache                                | Head has entered `dev`                                                                                                |
| [#2](https://github.com/pix-l-crafters/pocket-draw/pull/2)                          | Siheng/Ethan — Firebase setup                          | Head has entered `dev`                                                                                                |
| [#3](https://github.com/pix-l-crafters/pocket-draw/pull/3)                          | Tanachat — Bluetooth/dev-build fixes                   | Work entered `dev` through later integration                                                                          |
| [#4](https://github.com/pix-l-crafters/pocket-draw/pull/4)                          | Tingyue — Expo environment                             | Head has entered `dev`                                                                                                |
| [#5](https://github.com/pix-l-crafters/pocket-draw/pull/5)                          | Mihir — Android BLE/tooling                            | Head has entered `dev`                                                                                                |
| [#6](https://github.com/pix-l-crafters/pocket-draw/pull/6)                          | Siheng/Ethan — Map/location/presence                   | Merged by Mobark                                                                                                      |
| [#7](https://github.com/pix-l-crafters/pocket-draw/pull/7)                          | Tianze — Firebase auth                                 | Merged by Ethan; App conflicts were fixed later                                                                       |
| [#8–#14](https://github.com/pix-l-crafters/pocket-draw/pulls?q=is%3Apr+is%3Aclosed) | Mobark's original conflict/EAS/design/changelog series | Original heads did not enter the current `dev` directly; related work entered through rebasing/integration in #15–#19 |
| [#15](https://github.com/pix-l-crafters/pocket-draw/pull/15)                        | Mobark — Cocogitto/scopes                              | Merged by Mihir                                                                                                       |
| [#16](https://github.com/pix-l-crafters/pocket-draw/pull/16)                        | Mobark — Map + Duel design                             | Merged by Mihir                                                                                                       |
| [#17](https://github.com/pix-l-crafters/pocket-draw/pull/17)                        | Mobark — changelog                                     | Merged by Mihir                                                                                                       |
| [#18](https://github.com/pix-l-crafters/pocket-draw/pull/18)                        | Mobark — intermediate integration branch               | Did not enter `dev` directly; its result was received by #19                                                          |
| [#19](https://github.com/pix-l-crafters/pocket-draw/pull/19)                        | Mobark — integrate design system/EAS and related work  | Merged by Mihir                                                                                                       |
| [#20](https://github.com/pix-l-crafters/pocket-draw/pull/20)                        | Mihir — secrets/fnox/tooling                           | Head has entered `dev`                                                                                                |
| [#21](https://github.com/pix-l-crafters/pocket-draw/pull/21)                        | Mobark — dev fixes/task splits                         | Merged by Mobark                                                                                                      |
| [#22](https://github.com/pix-l-crafters/pocket-draw/pull/22)                        | Mihir — treefmt/dev environment                        | Merged by Mihir                                                                                                       |
| [#23](https://github.com/pix-l-crafters/pocket-draw/pull/23)                        | Mobark — shared contracts/mocks                        | Merged by Mobark                                                                                                      |
| [#24](https://github.com/pix-l-crafters/pocket-draw/pull/24)                        | Mihir — member public keys                             | Merged by Mihir                                                                                                       |
| [#25](https://github.com/pix-l-crafters/pocket-draw/pull/25)                        | Tingyue — QR challenge 3.1–3.3                         | Merged by Mobark; this is the current top of `dev`                                                                    |
| [#26](https://github.com/pix-l-crafters/pocket-draw/pull/26)                        | Mobark — round loop/postmatch                          | Has a current merge ref; has not entered `dev`                                                                        |
| [#27](https://github.com/pix-l-crafters/pocket-draw/pull/27)                        | Mihir — backend/offline queue                          | Has a current merge ref; has not entered `dev`                                                                        |
| [#28](https://github.com/pix-l-crafters/pocket-draw/pull/28)                        | Siheng/Ethan — map + challenge session                 | Has a current merge ref; has not entered `dev`                                                                        |
| [#29](https://github.com/pix-l-crafters/pocket-draw/pull/29)                        | Tanachat — pre-round/ELO                               | Head exists but has no merge ref; has not entered `dev`, and its live state must be confirmed                         |
| [#30](https://github.com/pix-l-crafters/pocket-draw/pull/30)                        | Tianze — fire/raise/round judge                        | Has a current merge ref; has not entered `dev`                                                                        |

## 5. Existing Documents and Their Purposes

| Document                                                                   | Content and ownership information                                                                                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/human-plans/boxing-game-idea.md`                                     | Original product/gameplay concept; not an actual completion-status checklist                                                              |
| `docs/task-splits/README.md`                                               | v1 task-allocation overview, collaboration conventions, shared-contracts pattern, and merge order                                         |
| `docs/task-splits/{name}.md`                                               | Each of the six members' original tasks, suggested branches, dependencies, and key files; some checkboxes are behind the actual Git state |
| `docs/task-splits-v2/README.md`                                            | Located on the v2 integration branch; records #26–#30 integration, conflict fixes, CI problems, and current remaining work                |
| `docs/task-splits-v2/{name}.md`                                            | Located on the v2 integration branch; updates “completed/remaining” by member and is closer to the current feature state than v1          |
| `docs/superpowers/specs/2026-09-06-map-duel-implementation-design.md`      | Overall Map/Duel implementation design and interface relationships                                                                        |
| `docs/superpowers/specs/2026-09-07-design-system-implementation-design.md` | Implementation design for the design system, components, and visual specifications                                                        |
| `docs/superpowers/plans/2026-09-07-design-system.md`                       | Design-system implementation steps and completion record                                                                                  |
| `src/contracts/README.md`                                                  | Cross-member producer/consumer relationships and the contract/mock replacement approach                                                   |
| `.agents/logs/YYYY-MM-DD.md`                                               | Daily AI-assisted work logs for tracking prompts, authors, models, and reasons for changes                                                |

## 6. Recommended Next Steps

1. Create an integration PR from `moby/chore/merge-2026-09-10-v2` into `dev`, or have the team explicitly choose another integration path; do not merge #26–#30 twice.
2. After logging back into GitHub CLI, confirm the live open/closed, review, and CI states of #26–#30, especially #29.
3. Create a PR for `tingyue/feat/challenge-connect-flow`, and state in its description that it is based on the current `dev` and does not yet include the challenge-session layer from the v2 integration branch.
4. Merge `docs/task-splits-v2/` into the branch shared by the team and explicitly decide whether it replaces v1 `docs/task-splits/`.
5. Verify the complete Map → QR → Challenge → BLE → Duel → Result flow on two physical devices. For most current features, “completed” primarily means that the code has been written and static checks have passed; it does not mean that physical-device end-to-end testing has passed.
