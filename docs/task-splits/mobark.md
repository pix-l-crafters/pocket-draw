# Mobark Walid O Bacran (MobyScript) — Duel (result/round-loop) + Map coordination

Source: Section 9 of "Pocket Draw - Project Plan Final v2"; backlog Epics 4 & 6. See `README.md` in this folder for shared notes (branch off the current integrated state, not stale `dev`; App.tsx conflict history; repo conventions).

## Tasks (backlog refs)

- [ ] 4.17 — Round loop / match-decided logic: track round wins across the match, decide when it's over (best-of-3/5/7)
- [ ] 4.16 — Per-round result screen: winner/tie/false-start outcome plus reaction times, shown to both players
- [ ] 6.1 — Match summary screen: final score, winner, per-round reaction times
- [ ] 6.2 — Rematch offer (particularly after a tied match)
- [ ] 6.3 — Return-to-map flow after viewing results
- [ ] Keep the GitHub project board ("The Kanban - Mobile Computing") current as branches land — you already own this per the plan

## Likely files

`src/features/duel/` (new: round-loop logic, result screen), `src/features/postmatch/` (new: match summary, rematch)

## Suggested branches

`mobark/feat/duel-round-loop`, `mobark/feat/postmatch-summary`

## Building in parallel

- Round loop (4.17): code against `src/contracts/roundOutcome.ts` + `mocks/mockRoundOutcome.ts` instead of waiting on Tianze's (4.10-4.13) and Tanachat's (4.15) real detection code. Swap the mock for the real thing once their branches merge.
- ELO on the summary screen (6.1): code against `src/contracts/playerStats.ts` + its mock instead of waiting on Mihir's 5.4.
- See `src/contracts/README.md` for the full mock → real swap pattern, and integrate into `dev` as each dependency actually lands rather than waiting for everything at once.
