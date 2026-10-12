# 0002: Public map presence is rounded to about 10 m

- **Status:** Accepted, 2026-10-10 (Ethan).
- **Supersedes:** the ~110 m rounded public presence in `docs/product-design/Roadmap.md` and `docs/superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md`.

## Context

Other players' pins were off by about 100–170 m.
Two things caused most of that error:

- GPS ran at `Accuracy.Balanced`, which is about 100 m and often uses Wi-Fi or cell towers.
- Coordinates were rounded to 3 decimal places (a cell about 111 m × 88 m in Melbourne), which adds up to about 71 m.

Players could not tell who was actually close by.
The fixed 40 m ring used to spread overlapping pins only worked at one zoom level.

## Decision

- Location uses `Accuracy.High`, but only while the map screen is in the foreground.
- Published coordinates are rounded to 4 decimal places, a cell about 11 m × 9 m, with at most about 7 m of rounding error.
  Combined with GPS error, pins are within about 10–20 m outdoors; indoors can be 30 m or more.
- Presence only moves after the player has moved at least 10 m from the last published position.
  This stops GPS jitter near a cell edge from causing repeated writes.
- Overlapping markers are grouped by distance on screen into a count bubble, replacing the fixed ring offset.
  Tapping a bubble zooms in to fit its members, never closer than about 110 m.
  Members that still overlap there, such as players sharing one coordinate, fan out above the bubble until the map is tapped or zoomed out.

## Consequences

- Every signed-in player can see another player's position to about building level while that player shares it.
  The sharing toggle and removing presence when the player leaves the map are the only controls.
- Duel aiming still uses the precise GPS exchanged over `DuelChannel`; public presence remains too coarse for close-range bearing.
- Firestore rules check only the coordinate range, not the rounding, so a modified client could publish exact coordinates.
- Moving across cells writes more often (about one write per 10 m walked) and uses more battery while the map is open.
