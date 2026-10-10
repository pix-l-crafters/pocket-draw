# Match sensor analytics

Each phone saves its own completed-match diagnostics to
`analytics/{matchId}_{playerId}` in Firestore. Documents are create-only: a retry
reads the existing document and leaves it unchanged. The match scores and ELO
flow remain separate.

## Captured data

- `calibration`: ready and shoulder pitch angles, confirmation method (steady
  hold or volume button), accelerometer readings, and DeviceMotion snapshots.
- `rounds`: local reaction time, shot zone, miss reason, false-start flag, and
  firing diagnostics. A round with no captured shot has `shot: null`.
- `rounds[].shot`: firing timestamp, pitch, normalized raise fraction, pitch
  availability, and the latest motion snapshot, including sample age.
- `rounds[].shot.aim`: heading and compass accuracy, both players' GPS fixes
  and accuracy, sample ages, opponent bearing, heading error, separation, the
  GPS-uncertainty bypass flag, and tracking issues.
- `thresholds`: the pitch bands and aim tolerance used for that match.
- Match/player IDs, participants, platform, completion time, clock offset,
  schema version, and a Firestore server creation timestamp.

Motion rotation angles use radians; rotation rates use degrees per second;
DeviceMotion acceleration uses metres per second squared. The separate
Accelerometer calibration reading uses g units. Event/receipt timestamps and
sample ages use milliseconds; native motion timestamps are preserved as
reported by Expo (seconds). Opponent GPS ages use the calibrated clock offset.
Unavailable or non-finite sensor values are stored as `null`. Stale motion
readings remain available for diagnostics but are not made valid for scoring.

This captures snapshots at calibration and firing, rather than a continuous
motion recording. The firing snapshot is the most recent delivered sample, not
a guaranteed hardware reading at the exact trigger instant. The analytics
schema is versioned with `schemaVersion: 1`.

## Saving and recovery

After both phones confirm the same completed round history, analytics are persisted in AsyncStorage before the
Firestore transaction. Failed uploads remain queued. The app retries on
sign-in, network reconnection, and foreground activation, using only the
signed-in player's queued entries. The summary shows saving, saved, queued,
or error status and provides a retry button. Until peer confirmation it shows a
waiting status; an unconfirmed completion is not uploaded. Analytics errors do not block
the completed match result.

Rematches use new match IDs and reuse the calibration. Discarded rounds during
connection recovery also discard their analytics before a round is replayed.
The analytics queue is separate from the completed-match queue.

## Rules verification

The Firestore rules allow authenticated players to create/read their own
analytics and query with `where("playerId", "==", uid)`. Updates and deletes
are denied. The Firebase console can inspect all documents using admin access.

With Firebase CLI and Java 21 or newer installed, run:

```sh
firebase emulators:exec --only firestore --project demo-pocket-draw-analytics \
  'node scripts/test-analytics-rules.cjs'
```

The script requires a local emulator and cannot target production. It checks
ownership, separate uploads, immutable retries, unauthorized access, and
malformed document paths/payloads.
