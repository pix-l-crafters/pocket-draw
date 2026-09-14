# Siheng Ma — Map polish + Challenge (round/connect flow)

See `README.md` in this folder for the full status catch-up.

## Already done (verified against PR #28's own description + file diff)

- [x] 2.2 — Player pin popup, name/wins/ELO (`PlayerStatsCard.tsx`, `usePlayerStats.ts`) — stats still via mock, real `playerStatsRepository` available now (Mihir's PR #27)
- [x] 2.4 — Privacy/invisible toggle (`SharingToggle.tsx`, `useSharingPreference.ts`, `removePresence`)
- [x] 2.6 — GPS/location-unavailable handling (retry-with-backoff in `usePresencePublisher.ts`)
- [x] Continuous location publishing + presence heartbeat/staleness (not a numbered ticket, but real infra — `useForegroundLocation.ts` watch subscription, `PRESENCE_HEARTBEAT_MS`)
- [x] 3.8 — Duel session layer and `DuelChannel` producer (`src/features/challenge/session/`): auto-retry (1 + 4 attempts), manual retry, mid-session drop handling.
      **Real Bluetooth is explicitly out of scope for this ticket** — `bleDuelSessionTransport.ts` is a stub; the session runs on the mock transport (single-device demoable). Real BLE depends on the 0.7 spike (`react-native-ble-manager` has no peripheral mode).
- [x] 3.9 — Connection failure/error UI with retry (`ConnectingScreen.tsx`)

All merged via PR #28. Note on ticket numbering: you (via Ethan) also mentioned "2.3" as done — I can't find a ticket by that number anywhere in the repo or the plan doc, and PR #28's own description lists 2.2/2.4/2.6/3.8/3.9, not 2.3. Worth double-checking that number against whatever backlog it's tracked in.

## Known issue (not your fault — flagging so it doesn't confuse anyone)

Mobark's integration branch (`moby/chore/merge-2026-09-10`) silently dropped 8 of your files during the merge of this PR (the whole `session/` directory, `ConnectingScreen.tsx`, `useDuelSession.ts`). Your own branch/PR is intact — this was a bug in how it got merged elsewhere, not missing work on your end. Being fixed as part of the branch reconciliation in `README.md`.

## Remaining

- [ ] Nothing outstanding from your original scope. 3.4–3.6 (round-count selector, send/accept challenge) has been reassigned to Tingyue per your own note — no longer yours.
- [ ] If you want to keep moving: the real BLE transport under 3.8 is still unowned (stub only) and is a prod-readiness gap per `README.md`'s checklist — worth raising with the team who picks it up, since it's blocked on the 0.7 BLE spike that Tanachat needs to close out anyway.
- [ ] Your own flagged follow-up: logout deletes presence best-effort only (runs after `signOut`, so the delete is usually unauthenticated and fails; the doc ages out via the 3-minute staleness window instead). Clean fix is reordering `App.tsx` to remove presence before `signOut`. Not blocking, but worth a small PR.
