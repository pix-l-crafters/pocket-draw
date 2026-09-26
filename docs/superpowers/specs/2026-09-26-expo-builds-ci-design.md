# Expo Builds via CI on `dev` — Design

Issue: [pix-l-crafters/pocket-draw#75](https://github.com/pix-l-crafters/pocket-draw/issues/75)

## Problem

Mobark currently gets an installable iOS build onto his physical iPhone by
manually creating a scratch branch that pulls in every open PR, then running
a local Xcode build (`npx expo run:ios --device`) signed with his personal
Apple ID. That build expires after ~7 days and has to be redone by hand.

Now that the team has (or is getting) a paid Apple Developer Program
membership, EAS Build can produce a real ad-hoc-signed IPA, so this manual
step can move into CI.

## Scope

- iOS **and** Android builds, triggered on every merge into `dev`.
- Uses the existing `preview` profile in `eas.json` (`distribution:
"internal"`) — a standalone build, not a dev-client shell, so it installs
  and runs on its own with no Metro/laptop dependency.
- Does **not** touch the existing manual `production` + `eas submit`
  TestFlight flow — that stays a separate, manually-run pipeline.
- Does **not** manage Apple/Google signing credentials from CI. Device
  registration and credential generation are one-time manual steps via the
  `eas` CLI, outside this workflow.

## Trigger & concurrency

```yaml
on:
  pull_request:
    types: [closed]
    branches: [dev]
```

The build job only runs `if: github.event.pull_request.merged == true` —
this catches actual merges, not closed-without-merging PRs.

Concurrency group is keyed on the PR number, matching the pattern already
used in `mega-linter.yml`:

```yaml
concurrency:
  group: pr-${{ github.event.pull_request.number }}-${{ github.workflow }}
  cancel-in-progress: true
```

If a second PR merges into `dev` while a build for an earlier merge is still
running, the earlier build is cancelled rather than left to finish and be
ignored.

## Jobs

### `build` (matrix: `platform: [ios, android]`)

Runs on `ubuntu-latest` — EAS Build executes in Expo's cloud, so the runner
only needs to submit the job and poll for it, no macOS runner required.

Steps:

1. Checkout (`persist-credentials: false`, matching existing workflows).
2. `actions/setup-node` — node 24 (matches `mise.toml`).
3. `npm ci`.
4. `expo/expo-github-action` — installs `eas-cli` and wires up the
   `EXPO_TOKEN` secret as the CLI's auth token.
5. `eas build --platform ${{ matrix.platform }} --profile preview --non-interactive --wait --json`.
6. Parse the JSON output for the build URL and expose it as a job output.

Job `permissions: { contents: read }`. The `notify` job additionally needs
`pull-requests: write` to post its comment.

### `notify` (needs: `[build]`, runs always)

Runs once regardless of whether `build` succeeded or failed
(`if: always()`), gated so it only posts when the build job actually ran.

- Writes both platforms' build links (or failure status) to
  `$GITHUB_STEP_SUMMARY`.
- Posts one comment on the merged PR (via `actions/github-script`) with
  both install links/QRs, or a "build failed, check the Actions run" message
  if either matrix leg failed.

## Prerequisites (one-time, manual, outside CI)

- `EXPO_TOKEN` repo secret — a robot/access token from expo.dev, so
  `eas build --non-interactive` can authenticate without an interactive
  login.
- Mobark's iPhone UDID registered once via `eas device:create`.
- iOS ad-hoc and Android internal-distribution credentials generated once
  via `eas credentials`. EAS stores these against the project; CI only
  consumes them, it never generates or rotates them.

## Error handling

`eas build --wait` exits non-zero on build failure, which fails the `build`
job and shows up as a red X on the merge commit. The `notify` job still
runs (`if: always()`) and posts a failure comment instead of silently doing
nothing.

## Testing / verification

No local dry-run exists for a GitHub Actions + EAS Build pipeline.
Verification is: open a throwaway PR into `dev`, merge it, and confirm both
matrix legs build, the summary shows both links, and the PR comment lands
with working install links.

Style conventions to match the existing workflows
(`react-native-ci.yml`, `mega-linter.yml`, `mise-check.yml`): pinned action
SHAs with a version comment, explicit `permissions: {}` at the workflow
level with per-job overrides, `persist-credentials: false` on checkout.
