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

## Depends on / blocked by

- The round loop needs Tianze's reaction-time capture (4.14) and Tanachat's tie/false-start handling landed first
- ELO shown on the summary screen needs Mihir's 5.4 (ELO calc) — stub with a placeholder until then
