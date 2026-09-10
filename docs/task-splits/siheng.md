# Siheng Ma (EthanMaMax) — Map polish + Challenge (round/connect flow)

Source: Section 9; backlog Epics 2 and 3. See `README.md` in this folder for shared notes.

## Tasks (backlog refs)

- [ ] 2.4 — Privacy/invisible toggle on the map
- [ ] 2.6 — Handle GPS/location-unavailable state
- [ ] 2.2 — Player pin popup (name, wins, ELO) — stub wins/ELO until Mihir's backend lands
- [ ] 3.4 — Round-count selector (3/5/7) before sending a challenge
- [ ] 3.5 — Send challenge request (with round count) to the scanned player
- [ ] 3.6 — Incoming challenge popup (Accept/Decline)
- [ ] 3.8 — Establish BLE host/guest session on Accept — wire the existing `BleScreen` scanner logic into the challenge flow instead of the standalone demo screen
- [ ] 3.9 — Connection failure/error UI with retry

## Likely files

`src/features/map/` (existing components), `src/features/challenge/` (new: round selector, challenge popup), `src/features/ble/BleScreen.tsx` (integrate, don't duplicate)

## Suggested branches

`siheng/feat/map-privacy-toggle`, `siheng/feat/challenge-connect-flow`

## Depends on / blocked by

- 3.8 depends on Tingyue's QR scan handing off a target player — coordinate the handoff shape with her early
