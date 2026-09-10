# Mihir Rabade (MRDGH2821) — Backend (match results) + Device pipeline (Android)

Source: Section 9; backlog Epics 5 and 0/7. See `README.md` in this folder for shared notes.

## Extra note for you

Your `mihir/feat/secrets-setup-rebased` branch duplicates a chunk of the design-system work under a different `.config/` layout — it will conflict with what's already merged on `mobark/receive-branches`. Reconcile by hand (pick one tooling layout) rather than merging it in as-is.

## Tasks (backlog refs)

- [ ] 5.1 — Extend the data model for match results (a presence schema already exists via Siheng/Mobark's `presenceRepository`; add participants/outcome/time-to-raise)
- [ ] 5.2 — Write match result to the backend on completion
- [ ] 5.3 — Queued/offline result upload — persist locally if offline, flush on reconnect
- [ ] 7.1 — Android physical-device full-loop test (map → QR → BLE → duel → result), building on your existing `mihir/fix/android-ble` work
- [ ] 7.3 — Cross-platform permission QA (pair with Tianze, who covers iOS)
- [ ] Reconcile `mihir/feat/secrets-setup-rebased`'s tooling reorg against `mobark/receive-branches`

## Likely files

`src/features/backend/` (new: match-results service), `firestore.rules`

## Suggested branches

`mihir/feat/match-results-backend`, `mihir/chore/reconcile-tooling`

## Depends on / blocked by

- 5.2/5.3 need the round loop (Mobark, 4.17) to know when a match result exists to write
- 7.1/7.3 depend on most other epics being demoable end-to-end first — sequence these last
