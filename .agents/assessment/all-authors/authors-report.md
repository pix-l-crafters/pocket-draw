# Main-branch contributions by author

**History examined:** commits reachable from local `main`, 21 Aug–12 Oct 2026.
**Evidence:** [`main-commits.log`](main-commits.log) contains one record for all 533 commits: full hash, author date, author name/email, and subject. Contribution summaries use authored non-merge commits; merges are counted separately and not treated as implementation evidence.

## Commit counts

| Git author name(s)       | Non-merge | Merge |
| ------------------------ | --------: | ----: |
| MRDGH2821 / Mihir Rabade |       179 |    86 |
| Mobark Bacran            |       105 |    41 |
| Ethan                    |        33 |     8 |
| tingyueh                 |        25 |     3 |
| hbeat                    |        25 |     0 |
| wutianze3                |        20 |     2 |
| Mobark Walid             |         4 |     0 |
| Tianze                   |         0 |     1 |
| Claude (diagnostic)      |         0 |     1 |

## Work themes

### MRDGH2821 / Mihir Rabade

Developed Quickdraw Showdown mechanics: calibrated aim, zone-based scoring, false-start handling, reaction-clock calibration, volume-button controls, match-result persistence, and player-facing explanations for misses, ties, and draws.
Also contributed build tooling, linting, project setup, and product/roadmap documentation. These names are grouped because the project author confirmed they are the same person.

### Mobark Bacran

Built duel flow and match presentation, including calibration, false-start recovery, scoring/results, platform controls, permissions, and reconnect behavior.
Also worked on Firebase rankings, shared UI/design-system components, navigation, Expo/EAS builds, CI, and implementation/design documentation. This display name appears with more than one author email; records are grouped by display name, not independently verified identity.

### Ethan

Built map and player-presence features: location permissions and privacy, location publishing/sharing, nearby-player display, marker clustering/overlap, and profile popups. Also worked on profile/auth flows, iOS device build setup, and accessible duel controls/layout.

### tingyueh

Established the Expo/React Native app and later implemented local WebRTC duel transport, QR/hotspot connection and challenge flows, invite/round-count UI, and connection lifecycle fixes. Also contributed CI fixes and contributor documentation.

### hbeat

Added match-result saving and synchronization, ELO/player ratings and leaderboard support, pre-round flow, challenge-decision persistence, sensor analytics, and related Firebase/build integration.

### wutianze3

Implemented authentication service/UI and duel mechanics including gesture detection, reaction-time capture, fire synchronization, false-start penalties, scoring rules, and connection recovery.

### Mobark Walid

Addressed Expo SDK/Expo Go compatibility and development setup, refreshed README/spelling guidance, and adjusted vulnerability-scan configuration and caching.

### Tianze

Only a merge commit is attributed to this Git author name; there is no non-merge authored commit to support a work summary.

### Claude (diagnostic)

One merge commit only; no implementation work is attributed from merge metadata.

## Attribution notes

- Counts are Git commit-author counts reachable from local `main`; they are not measures of effort or individual ownership of every merged change.
- The raw log preserves each commit's recorded author name and email. The report combines `MRDGH2821` and `Mihir Rabade` per the project's author's clarification. It otherwise groups matching display names and does not infer that different names belong to the same person merely because they share an email.
- Work themes are inferred from authored commit subjects. They describe the recorded history, not an independent review of every change or proof of each person's complete contribution.
