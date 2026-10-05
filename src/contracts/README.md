# Shared contracts

These types (plus a mock implementation of each) let downstream tasks be built in parallel without waiting for the upstream task's real implementation to land. Each contract is one direction of dependency identified while splitting the backlog across the team — see `docs/task-splits/`.

## Pattern

1. The type in the top-level file (e.g. `roundOutcome.ts`) is the agreed shape. Anyone consuming it imports the type, not an implementation.
2. Anyone who needs data of that shape before the real producer's branch is merged imports the matching mock from `mocks/` (e.g. `mocks/mockRoundOutcome.ts`) and builds against it.
3. Once the real producer's branch merges, swap the mock import for the real one, delete the mock file, and remove the `TODO` in the contract file.
4. If a shape needs to change, treat that as its own small PR that everyone rebases onto quickly — don't let two people edit the same contract file on separate long-lived branches.

## Contracts

| File                  | Producer                            | Consumer(s)                               |
| --------------------- | ----------------------------------- | ----------------------------------------- |
| `duelChannel.ts`      | Siheng (3.8, BLE session)           | Tanachat, Tianze, Mobark (duel messaging) |
| `roundOutcome.ts`     | Tianze (4.10-4.13), Tanachat (4.15) | Mobark (4.16-4.17)                        |
| `matchResult.ts`      | Mobark (4.17)                       | Mihir (5.1-5.4)                           |
| `playerStats.ts`      | Mihir (5.1, 5.4, 5.5)               | Siheng (2.2), Tingyue (3.3), Mobark (6.1) |
| `challengeHandoff.ts` | Tingyue (3.2)                       | Siheng (3.4-3.6, 3.8)                     |

## Integration cadence

Don't wait until every piece is finished to test them together. Per the plan's own Section 9 ("all members integrate weekly on the path: map → QR → BLE → duel → stats"), merge each piece into `dev` as soon as it's ready and test that pairing — e.g. Tingyue's QR work and Siheng's challenge flow can be tested together well before Duel exists.
A single big-bang merge at the end is when mock-vs-real mismatches surface all at once, with no time left to fix them.
