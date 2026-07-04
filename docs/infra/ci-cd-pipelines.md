---
tags: [area/infra, type/reference]
status: current
updated: 2026-07-04
---

# CI/CD pipelines

Seven GitHub Actions workflows under `.github/workflows/`. This note covers the three that form the core test/build/release chain; the three cron-driven ones are documented separately in [[scheduled-jobs]], and `security.yml` is covered below.

## `ci.yml` — test/lint gate

Triggers: `pull_request` (master/main), `push` to master, `workflow_dispatch`, and `workflow_call` (so `deploy.yml`/`release-please.yml` can invoke it as a reusable workflow).

Concurrency group `ci-${{ github.workflow }}-${{ github.ref }}`, cancel-in-progress **only on PRs** (pushes to master aren't cancelled mid-run).

Four parallel jobs, no `needs` between them:

| Job                  | What it does                                                                   |
| -------------------- | ------------------------------------------------------------------------------ |
| `secrets`            | Gitleaks secret scan, full git history (`fetch-depth: 0`)                      |
| `typecheck-and-lint` | Node 22, `yarn tsc -b`, `yarn lint`                                            |
| `knip`               | `yarn knip` — unused exports/files/deps                                        |
| `test`               | `yarn test` (Vitest **unit** project only — E2E is not in CI, see [[testing]]) |

## `deploy.yml` — build + deploy to Cloudflare Pages

Triggers: `workflow_call` (from `release-please.yml`) and `workflow_dispatch`, both accepting `force_gtfs` and `skip_ci` boolean inputs.

Concurrency group `pages`, `cancel-in-progress: false` — deploys queue rather than cancel each other.

1. Job `ci` — runs `ci.yml` reusably, unless `skip_ci` is set.
2. Job `build` (needs `ci`, proceeds if CI succeeded or was skipped):
   - Node 22 + Python 3.12 setup.
   - Downloads the ZET static GTFS zip per `.gtfs-static-version` (or `latest`), hashes it, restores/produces an `actions/cache` keyed on `gtfs-processed-${hash}-${hashFiles('scripts/process_gtfs.py','scripts/run.sh','scripts/core/gtfs_base.py')}`. Only extracts/reprocesses (`bash scripts/run.sh`) on a cache miss.
   - Same pattern for HZPP train GTFS → `public/data-train`, cache key includes `process_gtfs_train.py`/`gtfs_base.py`, processed via `bash scripts/run_train.sh`. See [[gtfs-zet]] and [[gtfs-train]].
   - `yarn build` with `VITE_GTFS_PROXY_URL`, `VITE_GTFS_API_KEY`, `VITE_TALLY_FEEDBACK_FORM_ID` from secrets — see [[environment-variables]].
   - Deploy: `cloudflare/wrangler-action@v4` → `pages deploy dist --project-name=zet-live --commit-dirty=true`.

Full deploy walkthrough: [[cloudflare-pages-deploy]].

## `release-please.yml` — release automation

Triggers only on `push` to master. Concurrency group `release-please`, `cancel-in-progress: false`.

1. Job `release-please` — `googleapis/release-please-action@v5`, `release-type: node` (no separate config file; falls back to bumping `package.json` directly and generating `CHANGELOG.md`).
2. Job `deploy` (needs release-please, only if a release was created) — calls `deploy.yml` with `secrets: inherit`.
3. Job `translate-notes` (needs release-please, if a release PR exists) — checks out the release PR branch, runs `node scripts/generate-changelog.js` then `node scripts/generate-release-notes.mjs` (Ollama translation — see [[ollama-integration]]), commits `public/release-notes.json` via `git-auto-commit-action` with `--no-verify` (release-please branch names contain no `/`, which would otherwise fail the `branch-name-lint` pre-push hook — see [[tooling-and-hooks]]).

Full release flow: [[release-process]].

## `security.yml` — dependency review

PR-only. `actions/dependency-review-action@v5`: fails on `high`/`critical` severity CVEs in newly added packages, denies copyleft licenses (`GPL-2.0`, `GPL-3.0`, `LGPL-2.0`, `LGPL-2.1`, `AGPL-3.0`).

## Recent hardening (commit `9e2f990`)

Three fixes landed together in "ci: run CI on PRs, fix GTFS cache key, guard release-please concurrency":

1. `ci.yml` gained `pull_request`/`push` triggers — previously CI only ran via `workflow_call` from deploy/release, **never directly on PRs**.
2. `deploy.yml`'s GTFS cache key now also hashes the processing scripts (`process_gtfs.py`, `run.sh`, `gtfs_base.py`), not just the feed zip — so a script change forces reprocessing even when the upstream feed is unchanged. Brought the ZET cache key in line with the train feed's key.
3. `release-please.yml` gained a `concurrency: group: release-please, cancel-in-progress: false` block, preventing overlapping master pushes from racing the release PR creation and the `translate-notes` auto-commit.

> [!note] Recent Ollama model change (commit `3714a23`)
> Both Ollama-calling scripts (`parse-service-alerts.mjs`, `generate-release-notes.mjs`) were switched from `gemma3:12b` to `gemma4:31b-cloud` because Ollama Cloud is deprecating gemma3. See [[ollama-integration]].
