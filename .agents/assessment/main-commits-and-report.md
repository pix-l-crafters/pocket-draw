# Main-branch work summary and oral-assessment notes

**Author identities counted:** `MRDGH2821` and `Mihir Rabade`, both with `ask.mrdgh2821@outlook.com`
**History examined:** commits reachable from local `main`, 21 Aug–12 Oct 2026
**Evidence:** [`main-commits.log`](main-commits.log) — 265 matching commits, including 86 merge commits. The summary below excludes merge commits to avoid double-counting integrated work.

## Work themes

- **Built out Quickdraw Showdown gameplay.** Implemented zone-based round scoring, calibrated aim and shot classification against an opponent's bearing, ready/shoulder-pitch calibration, false-start handling, and result explanations for misses, ties, and draws.
- **Improved reaction-time fairness and controls.** Added clock-offset calibration for reaction timing, addressed Hermes clock behavior, aligned pre-duel phone positioning across platforms, and added iOS volume-button input for firing and confirming calibration.
- **Connected and persisted match results.** Added a Firebase match-results write path with an offline queue, and aligned app consumers with scoring contracts.
- **Added player-facing feedback.** Surfaced draws in player statistics, illustrated false-start penalties and recorded miss causes, and made gameplay instructions optional after calibration.
- **Supported maps and app setup.** Fixed Android launch behavior when a Maps key is missing, added BLE scanner UI during early integration, and maintained local Android build tasks, dependencies, secrets, and development tooling.
- **Strengthened project quality and delivery.** Added linting/type-check tooling, maintained CI and formatting configuration, and wrote product/design, roadmap, implementation, and verification documentation.

## Short oral-assessment version

> “My contributions focused on building and stabilising the Quickdraw Showdown experience. I worked on the core duel mechanics, including calibrated aiming, zone-based scoring, false-start handling, and clear explanations for misses, ties, and draws.
> I also improved fairness and reliability by calibrating reaction clocks, supporting platform-specific controls, and persisting match results with an offline queue. Alongside gameplay, I added player-facing statistics and feedback, fixed platform and map issues, and improved the project’s build, linting, and documentation workflows.
> The commit history on `main` records 179 non-merge commits under my two author names between 21 August and 12 October 2026.”

## Attribution note

The commit filter matches the exact author names `MRDGH2821` or `Mihir Rabade` together with `ask.mrdgh2821@outlook.com`. It does not include other author names merely because they share that email. Commit authorship is evidence from Git history; it does not by itself establish the details of every contribution or the contents of an oral assessment.
