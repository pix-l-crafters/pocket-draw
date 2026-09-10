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

## Building in parallel

- 2.2 pin popup wins/ELO: code against `src/contracts/playerStats.ts` + its mock instead of waiting on Mihir.
- 3.4-3.6 challenge send/accept: code against `src/contracts/challengeHandoff.ts` + its mock instead of waiting on Tingyue's real QR scan (3.2).
- 3.8 BLE session: you're the producer of the real `src/contracts/duelChannel.ts` implementation — Tanachat and Tianze are building against a mock of it in the meantime. Once 3.8 is done, update that contract file and let them swap their mocks for the real thing.
- See `src/contracts/README.md` for the full pattern.
