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
| `duelChannel.ts`      | Siheng (3.8, WebRTC session)        | Tanachat, Tianze, Mobark (duel messaging) |
| `roundOutcome.ts`     | Tianze (4.10-4.13), Tanachat (4.15) | Mobark (4.16-4.17)                        |
| `matchResult.ts`      | Mobark (4.17)                       | Mihir (5.1-5.4)                           |
| `playerStats.ts`      | Mihir (5.1, 5.4, 5.5)               | Siheng (2.2), Tingyue (3.3), Mobark (6.1) |
| `challengeHandoff.ts` | Tingyue (3.2)                       | Siheng (3.4-3.6, 3.8)                     |
| `duelLink.ts`         | Tingyue (#51, WebRTC session)       | Duel screens (recovery, rematch)          |

## Integration cadence

Don't wait until every piece is finished to test them together. Per the plan's own Section 9 ("all members integrate weekly on the path: map → QR → BLE → duel → stats"; the BLE step is now the WebRTC link), merge each piece into `dev` as soon as it's ready and test that pairing — e.g. Tingyue's QR work and Siheng's challenge flow can be tested together well before Duel exists.
A single big-bang merge at the end is when mock-vs-real mismatches surface all at once, with no time left to fix them.

## Live gameplay messages (#50 and #81)

`DuelMessage.raised` requires `atMs`, actual `reactionMs`, and `zone: Zone`.
At FIRE the sender samples its ready-to-shoulder calibrated pitch zone, then
overrides it to `miss` if compass/GPS aim is not valid. Missing or unavailable
zones never fall back to `bodyshot`. Clock-offset calibration makes reaction
timing comparable; both clients judge the exchanged actual shots.

A received `raised` retains the captured reaction time, not its network receipt
time. When a player does not fire within the inclusive 3-second window,
`noShot` confirms that fact with the current `matchId` and `roundNumber`.
The other phone waits for `raised` or that scoped confirmation before judging;
network silence never becomes an opponent miss after a fixed grace period.
While waiting past its own window, the screen shows `SYNCING SHOTS` and disables
firing. The ordered, reliable DataChannel carries both messages. Link drops
still use the existing reconnect/replay flow. Both phones must run this
protocol version; an older build never sends `noShot`.

`aimPosition` carries `latitude`, `longitude`, GPS `accuracy` in meters, and
`sampleAtMs`, the actual sender GPS fix timestamp (not send or receipt time).
The existing calibrated offset is peer clock minus local clock, giving
`localFixTime = sampleAtMs - clockOffsetMs`. Keep the raw peer timestamp and
convert at capture with the latest offset, including after calibration completes.
Freshness includes network flight delay; repeating the same fix retains its
timestamp and cannot renew it. A fix aged 4,500 ms at send plus 750 ms in flight
is 5,250 ms old and exceeds the unchanged 5-second GPS limit. This is intentional
precise foreground GPS sharing only over the accepted peer's `DuelChannel`,
not precise GPS writes to Firestore. Public map presence remains rounded to
about 110 m and is removed on map exit, so it cannot provide close-range bearing.

Aim uses true-north heading accuracy level 3, a tunable inclusive ±30° cone,
2-second heading freshness, and 5-second GPS freshness. Missing/stale readings
or separation within the combined GPS uncertainty radius reject the shot to miss.

The judge retains the 100 ms independent-scoring tie window and faster-miss
fallthrough outside it. Early countdown tap/volume/movement disqualifies the
offender, but normal FIRE still lets the non-offender shoot. Enriched
`falseStart` outcomes retain that actual shot's timing, zone, and 0/1/2 points;
there is no flat bonus. Both clients sum points for three rounds and at most one
tiebreaker, including a valid final draw.
