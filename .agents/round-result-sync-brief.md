# Brief: make duel round results identical on both phones

## Bug

Two phones in a duel sometimes show different results for the same round (seen in round 3).

## Root cause (found by investigation)

Each phone judges every round on its own (`DuelScreen.handleRoundShots` → `judgeRoundShots`).
Nothing compares the two outcomes while the match runs. The inputs can differ, mainly the
false-start state:

1. Host sends `fire` and enters the fire phase (`FireSignalCoordinator.triggerFire`).
2. Before the guest receives `fire`, the guest's accelerometer flags a flinch. The guest's
   `PreRound` (`src/features/duel/PreRound.tsx:167`) sets `falseStartPlayer = "self"` and goes back to `position`.
3. The guest's `falseStart` message reaches the host after the host fired. The host's PreRound
   ignores it because its phase is not `countdown`.
4. `fire` reaches the guest; `onFire` (`PreRound.tsx:290`) moves it to `fire` phase anyway.
5. Guest judges a `falseStart` round; host judges a normal round. Different outcome and scores.

Reconnect (`matchSync` / `reconcileRounds`) is the only other place outcomes are compared.

## Fix: the host is the single referee

- Add a message to `src/contracts/duelChannel.ts`:
  `{ type: "roundResult"; matchId: string; roundNumber: number; outcome: RoundOutcome }`.
  Validate it in `isDuelMessage` (`src/features/challenge/webrtc/duelDataChannel.ts`): valid
  matchId, integer roundNumber in 1..MAX_ROUND_COUNT, and an outcome object with a known `kind`
  and the fields that kind needs. Reject malformed ones.
- In `DuelScreen`:
  - Host: judge as today, apply the outcome, then send `roundResult` for this matchId/roundNumber.
  - Guest: do not judge. Keep its own `RoundShots` (for the result screen display and analytics)
    and wait for the host's `roundResult`. Apply the host's outcome object exactly as received.
  - The host's `roundResult` can arrive before the guest's PreRound reports, so latch it at
    DuelScreen level (like `peerReady`), keyed by matchId + roundNumber. Apply when both the
    guest's shots and the matching host result are present. Ignore results for other
    matches/rounds. Clear the latch and the pending guest shots in `startMatch` and when a
    reconnect resyncs (the existing `reconcileRounds` path already replays a round only one
    phone applied).
  - While the guest waits, show a clear syncing state (for example keep the PreRound overlay
    reading "SYNCING RESULT"). Keep this minimal.
- Do not change scoring rules, the false-start rules, or the transport.

## Added requirement: use clock calibration, not arrival order

A message that arrives late must be judged by when it happened, using the calibrated clock
offset, not by when it was received. `clockOffsetMs` (from `ClockOffsetCalibrator`) is
peer clock minus local clock, so a peer timestamp in local time is `peerAtMs - clockOffsetMs`
(this is how `FireSignalCoordinator` already translates the host's FIRE for the guest).

- Host, on the guest's `falseStart` (it carries `atMs` in the guest's clock): convert it to
  host time and compare with the host's FIRE `atMs`.
  - Before FIRE: it is a real false start, even if it arrives after the host is in the fire
    phase. The host must record it for this round (`falseStartPlayer = "opponent"`) instead of
    dropping it as `PreRound.tsx:168` does now, so the host judges a `falseStart` outcome and
    sends it in `roundResult`.
  - At or after FIRE: it is not a false start. Ignore it for scoring.
  - Pass the violation time through `FalseStartCoordinator`'s outcome (it has no `atMs` today)
    rather than re-reading the message in two places.
- Guest, when FIRE arrives after its own local violation: compare its violation time with its
  calibrated FIRE time (`firedAtRef`, already `host atMs - offset`). If the violation was at or
  after the calibrated FIRE, it was not a false start: clear the self false-start state so the
  guest can still shoot. If it was before, keep it. This only keeps the guest's screen and
  ability to fire in line; the score still comes only from the host's `roundResult`.
- The host's judgement is final. The guest never re-judges with its own offset, so small
  differences between the two phones' offsets cannot cause two answers.
- Tests: a guest `falseStart` whose calibrated time is before host FIRE but arrives after it
  → both phones show the false-start outcome. One whose calibrated time is after FIRE → both
  phones show a normal round. Use a non-zero clock offset in the test.

## Process

1. First write a failing two-phone test (see `src/features/duel/DuelScreen.gameplay.test.tsx`,
   it uses `createMockDuelChannelPair` and `renderPhones`) that delivers the guest's
   `falseStart` to the host after the host's FIRE, and asserts both phones end with the same
   round outcome / round keys. Confirm it fails on the current code.
2. Add a validator test for `roundResult` in `duelDataChannel.test.ts`.
3. Implement the fix with the smallest diff that passes. Match existing style.
4. Run the duel tests, the full test suite, and the TypeScript check (look in `package.json`
   and `mise.toml` for the right commands). Fix failures you caused.
5. Update `src/contracts/README.md` and `CHANGELOG.md` only if the existing pattern for such
   changes requires it (see commit bf9e2f4 for the last similar fix).

## Rules

- Work in this worktree on the current branch. Do not touch `package-lock.json` (it has an
  unrelated local change).
- Do NOT commit or push. Leave changes in the working tree for review.
- When done, print a short summary: files changed, tests run with pass/fail counts.
