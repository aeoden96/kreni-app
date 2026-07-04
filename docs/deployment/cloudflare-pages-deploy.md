---
tags: [area/deployment, type/reference]
status: current
updated: 2026-07-04
---

# Cloudflare Pages deploy walkthrough

Full workflow: `deploy.yml`. Summarized in [[ci-cd-pipelines]]; this note walks the build job step by step.

1. **Checkout**, Node 22 + Python 3.12 setup.
2. **Download ZET GTFS zip** — reads `.gtfs-static-version` (a six-digit pin at repo root, or the literal string `latest`); constructs the download URL accordingly (`https://www.zet.hr/gtfs-scheduled/scheduled-000-{version}.zip` or `.../latest`).
3. **Hash + cache** — `sha256sum` the zip, restore `actions/cache` for `public/data` keyed on `gtfs-processed-${hash}-${hashFiles(process_gtfs.py, run.sh, gtfs_base.py)}`. Cache miss → extract + `bash scripts/run.sh` (see [[gtfs-zet]]).
4. **Download HŽPP train GTFS** — always fetches `https://www.hzpp.hr/GTFS_files.zip` (no version pin for this feed, unlike ZET's).
5. **Hash + cache (train)** — same pattern, cache key includes `process_gtfs_train.py`/`gtfs_base.py`. Cache miss → extract + `bash scripts/run_train.sh` (see [[gtfs-train]]).
6. **Install deps** — `yarn install --frozen-lockfile`.
7. **Build** — `yarn build`, with `VITE_GTFS_PROXY_URL`, `VITE_GTFS_API_KEY`, `VITE_TALLY_FEEDBACK_FORM_ID` injected from secrets (see [[environment-variables]]).
8. **Deploy** — `cloudflare/wrangler-action@v4`, `pages deploy dist --project-name=zet-live --commit-dirty=true`.

Both `force_gtfs` (bypass cache) and `skip_ci` (skip the `ci.yml` gate) are exposed as manual `workflow_dispatch` inputs for troubleshooting a bad cache or an urgent hotfix deploy.

> [!note] Two independent GTFS feeds, two independent caches
> The ZET and HŽPP pipelines are cached and invalidated completely independently — a change to `process_gtfs_train.py` alone will not trigger reprocessing of the ZET data, and vice versa. See [[ci-cd-pipelines]] for the cache-key hardening that landed in commit `9e2f990`.
