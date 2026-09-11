# Task split v2 — Pocket Draw (status catch-up + integration plan)

Generated 2026-09-10, from `git fetch` + `gh pr/pr checks` + the GitHub project board (`pix-l-crafters/The-Plan`) + `docs/task-splits/*` (v1) + `.agents/logs/2026-09-10.md`, at Mobark's request after v1's assumptions went stale within the same day.

**This file (and the rest of `docs/task-splits-v2/`) is now the source of truth for who's doing what.** The GitHub project board ("The Kanban - Mobile Computing", `pix-l-crafters/The-Plan`) is not being kept current — see "Project board" below — so stop cross-checking against it.

## What changed since v1

- `dev` is **no longer stale**. v1's README warned it was missing the design system / EAS / Map+Duel design doc; PR #19 (`mobark/receive-branches`) and PR #25 (`tingyue/feat/qr-challenge`) have since merged. `dev` now has the design system, EAS config, and the full QR epic (3.1–3.3).
- Five PRs landed the same day v1 was written: #26 (Mobark, postmatch summary), #27 (Mihir, backend), #28 (Siheng, map), #29 (Tanachat, pre-round ritual), #30 (Tianze, fire/raise detection). All are **still open against `dev`**, not merged.
- **Duplicate integration work happened**: Mobark (`moby/chore/merge-2026-09-10`) and Mihir (`mihir/chore/merge-branches-2026-09-10`) each independently merged all five PRs above into their own integration branch, unaware of each other. The branches have diverged — see "Branch reconciliation" below. Neither has an open PR into `dev` yet.
- Most v1 per-person checkboxes are stale (unticked despite real merged work, e.g. Tingyue's QR epic). Git/PR state is the ground truth; the per-person files in this folder reflect it.

## Branch reconciliation (blocking everything else)

**Correction from the first pass of this doc:** this isn't two people independently building overlapping features — it's a bug in Mobark's own merges. `moby/chore/merge-2026-09-10`'s merges of PR #28 (Siheng, map) and PR #29 (Tanachat, pre-round ritual) silently dropped 13 files that exist on both source branches:

- From #28: the entire `src/features/challenge/session/` layer (`bleDuelSessionTransport.ts`, `duelSessionTransport.ts`, `mockDuelSessionTransport.ts`, `duelSession.constants.ts`, `duelSession.types.ts`, `sessionUtils.ts`), plus `ConnectingScreen.tsx` and `useDuelSession.ts`.
- From #29: `DuelScreen.tsx`, `PreRound.tsx`, `bleRssi.ts`, `countdownAudio.ts`, `src/features/backend/elo.ts`.

Checked the other 3 source branches (#26, #27, #30) against `moby/chore/merge-2026-09-10` the same way — nothing missing there, so it's isolated to these two merges.

`origin/mihir/chore/merge-branches-2026-09-10` merged the same 5 PRs and didn't drop anything — it has all 13 files intact.

It does have its own problem: `app.json`'s iOS `bundleIdentifier` is `com.sihengm.pocketdraw` (Siheng's personal signing ID, from resolving the same-file conflict on #28 differently) instead of the shared `com.anonymous.pocketdraw`.

It's also missing Mobark's later additions: full backend wiring (`src/features/backend/matchResultsService.ts` + friends), the `roundLoop.check.ts` self-check, and the tie-scoring fix (`6ead567` — Mihir's branch has the pre-fix `roundLoop.ts`, where ties don't award both players a point and a simultaneous-majority tie round would incorrectly end the match).

**Plan:** base the reconciled branch on Mihir's — his merges of #28/#29 are the clean ones — then layer on top: the backend wiring, `roundLoop.check.ts`, the tie-scoring fix, and the corrected shared `bundleIdentifier`. Lower-risk than re-merging all 5 PRs from scratch, since Mihir's merge work doesn't need to be redone.

Rebase the result onto current `dev` (not merge), so history stays Conventional-Commits-clean for `cog check`. This becomes the single PR into `dev`. Mobark is doing this.

Also worth a sanity pass once done: diff the reconciled branch's file list against each of the 5 source PR branches (the same check that caught this) before opening the PR, not just trusting the merge went cleanly.

**Status: done, not yet pushed.** Branch `moby/chore/merge-2026-09-10-v2` (worktree at `../pocket-draw-integration-v2`), based on `origin/mihir/chore/merge-branches-2026-09-10`, with 4 commits on top:

- `fix(duel): score ties for both players and require a strict lead to decide the match` — the tie-scoring fix + `roundLoop.check.ts` extraction
- `fix(expo): restore shared iOS bundle identifier` — back to `com.anonymous.pocketdraw`
- `fix(duel): return RSSI reading directly instead of a nonexistent property` — a real bug found while verifying: `bleRssi.ts` (from Tanachat's #29) read `peripheral.rssi` off `BleManager.readRSSI()`, which resolves to a plain `number`, not an object — failed `tsc` (TS2339) and would have returned `undefined` at runtime. Fixed.
- `docs: consolidate agent work log from parallel integration branches` — replaced this branch's log (which had literal duplicate/nested headers from unresolved add/add conflicts) with Mobark's already-reordered copy

Verified clean: `cog check origin/dev..HEAD` (no errored commits), `tsc --noEmit` (0 errors), `node src/features/duel/roundLoop.check.ts` (self-check passes), `expo export --platform ios` (bundles), and a full file-list diff against all 5 source PR branches (#26–#30) confirms nothing is missing this time. Not pushed — Mobark pushes his own work.

## Fixing CI (all 5 open PRs are currently red)

Two systemic causes account for the failures, not five sets of unrelated lint errors:

1. **`cog check` fails on every one of them.** Each branch merged `origin/dev` in with `git merge` at some point, producing a non-conventional commit message (`"Merge 9a11cbb... into 34bcb0d..."`). Fix on the reconciled branch by rebasing instead of merging, or by rewording the offending commit before opening the PR.
2. **`tsc` fails on the postmatch/round-loop path** (`roundLoop.ts(11,20): Cannot find name 'node:assert'`) — the original inline self-test needed `@types/node`, which isn't reliable under this project's `moduleResolution: "bundler"`. Already fixed on Mobark's branch (self-check extracted to `roundLoop.check.ts`, run via `node`, no Node type imports).

Beyond those two, run `hk run fix` / `mise run fmt` for the remaining MegaLinter formatting noise, per `AGENTS.md`.

## Merge order into `dev`

Just one PR: the reconciled integration branch above. It already contains #26–#30's work, so those don't need separate merges — once the reconciled branch is green and merged, close #26–#30 referencing it (or merge them formally first and rebase the reconciled branch on top — either way, don't let both paths land the same commits twice).

## Project board

The board lives in a **different repo** (`pix-l-crafters/The-Plan`, not `pocket-draw`) and only tracks early infra (issues #1–8) and the QR epic (#9–14) — nothing for Duel, Backend, Map, or Postmatch.

It's also out of date where it does apply: issue #9 (QR payload schema) is still "Backlog" despite being fully merged (PR #25), and #7 (BLE spike) is still "In progress" despite `BleScreen.tsx` having been on `dev` for over a week.

Decision: stop tracking against the board. `docs/task-splits-v2/*.md` is the live source of truth going forward.

If the teaching team needs the board to reflect reality for submission purposes, that's a separate cleanup pass — flag it here first before touching it (Tanachat specifically still needs to close out issue #7 with a pass/fail note either way, since it's a named deliverable in the plan doc's Section 8).

## Remaining work per person

| Person   | Status                                                                                             | Remaining                                                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobark   | Duel round-loop, postmatch summary, backend wiring all coded (PR #26)                              | Branch reconciliation (above), then keep iterating on Duel round-loop/result screens as needed                                                                         |
| Mihir    | Backend match-results + offline queue coded (PR #27)                                               | 7.1 Android full-loop test, 7.3 cross-platform permission QA, reconcile `mihir/feat/secrets-setup-rebased` tooling                                                     |
| Tingyue  | QR epic fully merged (PR #25, `dev`)                                                               | 3.4–3.6 round-count selector / send challenge / accept popup, reassigned from Siheng (reported by Siheng, not yet visible in git — no branch/commits found for it yet) |
| Siheng   | 2.2, 2.4, 2.6, 3.8 (session/retry/DuelChannel-producer layer, mock-backed), 3.9 all coded (PR #28) | Nothing outstanding — 3.4–3.6 reassigned to Tingyue; real BLE transport under 3.8 is still a stub, blocked on the 0.7 spike                                            |
| Tanachat | Pre-round ritual (4.1–4.7) + ELO calc (5.4) coded (PR #29)                                         | Close out issue #7 (BLE spike pass/fail) explicitly                                                                                                                    |
| Tianze   | Fire/raise detection, false-start, tie, disconnect recovery (4.8–4.15, 4.18) all coded (PR #30)    | 0.5 iOS signing/TestFlight, 7.2 iOS full-loop test                                                                                                                     |

See each person's file in this folder for detail and file references.

## Prod-readiness checklist

Since the goal now is prod-ready, not just demo-passable, verify these against the plan doc's own usability requirement (Section 4) and success criteria (Section 12) before calling it done — on real hardware, not just `tsc`/bundle-clean:

- [ ] Offline match-result queue actually flushes on reconnect (coded per the 18:20 log entry; not yet device-verified)
- [ ] BLE connection-failure and permission-denied paths recover with a visible retry, not a stuck screen (3.9, coded — verify once the reconciled branch actually includes it, given today's dropped-file bug)
- [ ] The real BLE transport behind 3.8 (`bleDuelSessionTransport.ts`) is currently a stub — session runs on the mock, single-device demoable only, per PR #28's own description. Real Bluetooth is blocked on the 0.7 spike; needs an owner before the "prod-ready" bar is met
- [ ] Camera permission denial (QR scan) offers a recovery path, not a dead end
- [ ] False-start and tie-window handling behaves correctly on two real phones, not just the mock-channel smoke test
- [ ] Mid-round/mid-match disconnect retry (4.18, coded) verified on real BLE, not just the mock transport
- [ ] A person who hasn't seen the app can complete one full duel with minimal coaching (the plan's actual pass bar, Section 12.5)
- [ ] iOS bundle identifier is the shared one, not a personal signing ID, on whatever branch actually ships

## Open team decisions (unresolved, need a person to pick these up)

- **Product area** (onboarding, empty states, demo script, leaderboard read) — still explicitly unassigned per the plan doc, Section 9 and 14.2. Needs an owner.
- **Publicity line on the report cover page** — no grading effect, still pending a team yes/no (plan doc Section 14.2).

## Files

- `mobark.md`, `mihir.md`, `tingyue.md`, `siheng.md`, `tanachat.md`, `tianze.md`
