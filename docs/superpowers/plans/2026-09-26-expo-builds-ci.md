# Expo Builds via CI on `dev` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions workflow that builds iOS and Android EAS `preview` builds whenever a PR merges into `dev`, and tells Mobark where to install them.

**Architecture:** One workflow file, `.github/workflows/expo-preview-build.yml`, triggered on `pull_request: closed` targeting `dev`.
A matrix `build` job (`ios`/`android`) runs `eas build --profile preview --non-interactive --wait`, then always writes a small per-platform `result.json` (`{platform, status, url}`) and uploads it as an artifact.
A separate `notify` job downloads all `build-result-*` artifacts, writes a job summary, and posts one PR comment.
Artifacts (not job outputs) carry the per-platform result across jobs — GitHub Actions only retains the _last-completed_ matrix leg's value for a matrix job's `outputs:`, which would silently drop one platform's result if we relied on that instead.

**Tech Stack:** GitHub Actions, `expo/expo-github-action` (installs `eas-cli`, authenticates via `EXPO_TOKEN`), `jq` (preinstalled on `ubuntu-latest`), `actions/upload-artifact` + `actions/download-artifact`, `actions/github-script`.

## Global Constraints

- Both iOS and Android build on every merge into `dev` (spec Scope).
- Use the existing `preview` profile in `eas.json` (`distribution: "internal"`, standalone build). Do not modify `eas.json`, and do not touch the existing manual `production` + `eas submit` TestFlight flow.
- Trigger: `pull_request: { types: [closed], branches: [dev] }`, job gated by `if: github.event.pull_request.merged == true`.
- Concurrency: `group: pr-${{ github.event.pull_request.number }}-${{ github.workflow }}`, `cancel-in-progress: true`.
- This workflow never manages signing credentials. `EXPO_TOKEN` (repo secret), device registration (`eas device:create`), and iOS/Android credentials (`eas credentials`) are one-time manual steps outside this file.
- Style, matching `.github/workflows/mise-check.yml` and `react-native-ci.yml`: pinned action SHAs with a `# vX.Y.Z` comment, top-level `permissions: {}` with minimal per-job overrides, `persist-credentials: false` on checkout.
  Also: `on:` written as `on: # yamllint disable-line rule:truthy` (comment inline, not on its own line), node version `24`, and every YAML mapping's keys in alphabetical order (this repo's existing workflow files are consistently key-sorted — match it by hand).
- `contents: read` for `build` (needs checkout only); `pull-requests: write` for `notify` (needs to comment only) — no other permissions.

---

### Task 1: `build` job — matrix EAS builds with per-platform result artifacts

**Files:**

- Create: `.github/workflows/expo-preview-build.yml`

**Interfaces:**

- Produces: for each matrix leg, an artifact named `build-result-${{ matrix.platform }}` containing one file, `result.json`, shaped `{"platform": "ios"|"android", "status": "success"|"failure"|"cancelled"|"skipped", "url": "<expo.dev build page URL, or empty string on failure>"}`. Task 2's `notify` job downloads every artifact matching the glob `build-result-*` and reads each `result.json`.

**Known assumption to verify for real in Task 3:** the `jq` filter `.[0].buildUrl` assumes `eas build --platform <p> --profile preview --json` returns a JSON array with one object containing a `buildUrl` field (the `expo.dev` build page link).
This is `eas-cli`'s documented shape as of writing, but there's no way to invoke real `eas-cli` against a real project from this environment without `EXPO_TOKEN` and paid-account credentials, so it can't be verified until the real run in Task 3.
If the field name differs, fix the `jq` filter in the "Write result file" step and re-run.

- [ ] **Step 1: Write the workflow file**

```yaml
---
concurrency:
  cancel-in-progress: true
  group: pr-${{ github.event.pull_request.number }}-${{ github.workflow }}
jobs:
  build:
    if: github.event.pull_request.merged == true
    name: Build ${{ matrix.platform }}
    permissions:
      contents: read
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
          ref: ${{ github.event.pull_request.merge_commit_sha }}
      - name: Setup Node.js
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          cache: npm
          node-version: 24
      - name: Install dependencies
        run: npm ci
      - name: Setup Expo and EAS
        uses: expo/expo-github-action@eab7a230208c952974db8c3245cfd78402c7b385 # v9.0.0
        with:
          packager: npm
          token: ${{ secrets.EXPO_TOKEN }}
      - id: build
        name: Build ${{ matrix.platform }} (preview profile)
        run: |
          eas build --platform "${{ matrix.platform }}" --profile preview --non-interactive --wait --json > build-output.json
      - if: always()
        name: Write result file
        run: |
          url=""
          if [ -s build-output.json ]; then
            url=$(jq -r '.[0].buildUrl // empty' build-output.json)
          fi
          jq -n \
            --arg platform "${{ matrix.platform }}" \
            --arg status "${{ steps.build.outcome }}" \
            --arg url "$url" \
            '{platform: $platform, status: $status, url: $url}' > result.json
      - if: always()
        name: Upload result
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: build-result-${{ matrix.platform }}
          path: result.json
    strategy:
      fail-fast: false
      matrix:
        platform:
          - ios
          - android
name: Expo Preview Build
on: # yamllint disable-line rule:truthy
  pull_request:
    branches:
      - dev
    types:
      - closed
permissions: {}
```

- [ ] **Step 2: Validate YAML syntax**

Run: `yq eval '.' .github/workflows/expo-preview-build.yml > /dev/null && echo VALID`
Expected: prints `VALID`

Note: don't bother running bare `yamllint` locally as a second check — it fails on this repo's _existing, already-merged_ workflow files too (line-length and comment-spacing warnings on the pinned-SHA comment lines), because MegaLinter's `YAML_YAMLLINT` linter uses a more relaxed config than the bare CLI defaults.
`yq` syntax validity plus the `hk` pre-commit hooks below are the real local checks; MegaLinter (`.github/workflows/mega-linter.yml`, runs on every PR) is the real yamllint/zizmor gate.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/expo-preview-build.yml
git commit -m "feat(ci): build EAS previews for ios and android on merge to dev

Refs #75"
```

Note: this repo's `hk` pre-commit hook runs `prettier`/`yamlfix`/`rumdl` etc. and may reformat the file on commit (it did for the design spec doc) — that's expected, not a problem.

---

### Task 2: `notify` job — job summary + PR comment

**Files:**

- Modify: `.github/workflows/expo-preview-build.yml` (add a `notify` job to the `jobs:` map created in Task 1)

**Interfaces:**

- Consumes: artifacts named `build-result-ios` and `build-result-android` from Task 1, each containing `result.json` shaped `{platform, status, url}`.

- [ ] **Step 1: Add the `notify` job**

Insert this job into the `jobs:` map (alphabetically after `build`):

```yaml
notify:
  if: always()
  name: Notify
  needs:
    - build
  permissions:
    pull-requests: write
  runs-on: ubuntu-latest
  steps:
    - continue-on-error: true
      name: Download results
      uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
      with:
        path: results
        pattern: build-result-*
    - name: Build summary
      run: |
        shopt -s nullglob
        files=(results/*/result.json)
        {
          echo "# Expo Preview Builds"
          echo
          if [ ${#files[@]} -eq 0 ]; then
            echo "No build results found — the build job may not have run."
          else
            for f in "${files[@]}"; do
              platform=$(jq -r '.platform' "$f")
              status=$(jq -r '.status' "$f")
              url=$(jq -r '.url' "$f")
              if [ "$status" = "success" ]; then
                echo "- **$platform**: [Install]($url)"
              else
                echo "- **$platform**: build $status — check the Actions run"
              fi
            done
          fi
        } | tee -a "$GITHUB_STEP_SUMMARY" > comment-body.md
    - name: Comment on PR
      uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
      with:
        script: |
          const fs = require('fs');
          const body = fs.readFileSync('comment-body.md', 'utf8');
          await github.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: context.issue.number,
            body,
          });
```

The full file's `jobs:` map now has `build` then `notify` (alphabetical), and the top-level `permissions: {}` stays at the bottom of the top-level map, unchanged from Task 1.

- [ ] **Step 2: Validate YAML syntax**

Run: `yq eval '.' .github/workflows/expo-preview-build.yml > /dev/null && echo VALID`
Expected: prints `VALID`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/expo-preview-build.yml
git commit -m "feat(ci): notify PR with EAS preview build links

Refs #75"
```

---

### Task 3: Real-world verification (manual, requires Mobark's go-ahead)

This task pushes a branch, opens a PR, sets a live repo secret, and merges into the shared `dev` branch — do not run any of these steps without Mobark explicitly confirming first, per his standing preference that pushes/merges are his call.

**Files:** none (no code changes — this task only exercises what Tasks 1–2 built).

- [ ] **Step 1: Set the `EXPO_TOKEN` secret (if not already set)**

Confirm with Mobark first, then:

```bash
gh secret list --repo pix-l-crafters/pocket-draw | grep EXPO_TOKEN
```

If missing, he generates a robot token at expo.dev (Account Settings → Access Tokens) and sets it himself, or authorizes:

```bash
gh secret set EXPO_TOKEN --repo pix-l-crafters/pocket-draw
```

- [ ] **Step 2: Confirm device registration and credentials exist**

```bash
eas device:list
eas credentials
```

Confirm Mobark's iPhone UDID is registered and iOS/Android internal-distribution credentials exist. If not, he runs `eas device:create` / `eas credentials` himself first (these are interactive and tied to his Apple/Google accounts).

- [ ] **Step 3: Open a throwaway PR into `dev`**

```bash
git checkout -b mobark/chore/verify-expo-ci dev
echo "<!-- ci verification, safe to delete -->" >> README.md
git add README.md
git commit -m "chore: trivial change to verify Expo preview build CI"
git push -u origin mobark/chore/verify-expo-ci
gh pr create --base dev --title "chore: verify Expo preview build CI" --body "Throwaway PR to verify #75's CI. Safe to close/delete after."
```

- [ ] **Step 4: Merge the PR and watch the run**

```bash
gh pr merge --merge
gh run watch
```

- [ ] **Step 5: Confirm the result**

Check:

- The Actions run shows two `build` legs (`ios`, `android`) and one `notify` job.
- The run's job summary lists both platforms with either an install link or a failure status.
- A comment landed on the merged PR with the same information.
- If either build failed, read the `eas build` logs in that leg to see whether it's a credentials issue (Step 2) or something in the workflow (revisit Task 1's `jq` filter per the "Known assumption" note).
- [ ] **Step 6: Clean up**

```bash
git branch -d mobark/chore/verify-expo-ci
git push origin --delete mobark/chore/verify-expo-ci
```

(Only after confirming Step 5 passed — leave the branch if further debugging is needed.)
