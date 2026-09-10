# Task split — Pocket Draw (per "Project Plan Final v2", Section 9)

Generated 2026-09-10 from the project plan plus a review of the repo's git history, so each of the six members can branch off and work in parallel without the merge conflicts we've hit before.

Product (onboarding, empty states, demo script, leaderboard) is deliberately left out here — the plan marks it unassigned, and that's a separate team decision, not something to bake into this split.

## Before anyone branches

- `dev` is stale (last commit 2 Sep) — it's missing the design system, the EAS/iOS project linking, and the Map+Duel design doc that already exist on `mobark/receive-branches`, plus Tingyue's QR payload work, which isn't merged anywhere yet.
  Branch from the current integrated state, not raw `dev`, until someone brings `dev` up to date. That catch-up itself isn't part of today's task — just don't build on the stale branch in the meantime.
- `App.tsx` (the shared root/navigation file) has picked up literal unresolved merge-conflict-marker commits at least three times already (see `.agents/logs/2026-08-31.md` for one instance). Whoever touches it: rebase onto the latest integrated branch immediately before opening a PR, not at the end of a long-lived branch.

## Conventions already set in the repo (AGENTS.md) — follow these

- Branch names: `<firstname>/<type>/<name>` (e.g. `tianze/feat/duel-fire-detection`)
- Commits: Conventional Commits (`feat`, `fix`, `docs`, `chore`, ...); valid scopes are listed in `cog.toml`
- Any AI-assisted commit needs a `Co-authored-by` trailer (format and provider addresses are in `AGENTS.md`) and a same-day entry in `.agents/logs/YYYY-MM-DD.md`
- Run `hk run fix` / `mise run fmt` before committing

## Files

- `mobark.md`, `mihir.md`, `tingyue.md`, `siheng.md`, `tanachat.md`, `tianze.md`

## Suggested merge order

Roughly follows the plan's own timetable (Section 10):

1. Challenge/QR (Tingyue, Siheng) and backend groundwork (Mihir) first, since Duel depends on them existing.
2. The pre-round ritual (Tanachat) before fire/raise detection (Tianze), since the countdown gates the fire signal.
3. Round-loop and result screens (Mobark) last, once reaction times and outcomes exist to feed them.
4. Integrate into an updated `dev` weekly, per the plan.
