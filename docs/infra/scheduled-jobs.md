---
tags: [area/infra, type/reference]
status: current
updated: 2026-07-04
---

# Scheduled jobs

All cron scheduling **in this repo** happens via **GitHub Actions `schedule` triggers** — there's no `wrangler.toml` here, so no Cloudflare Cron Trigger originates from this codebase (see [[cloudflare-topology]]).

> [!warning] The external proxy Worker has its own, separate cron
> `kreni-app-worker` (`zet-gtfs-proxy`, source at `~/projects/zet-live-realtime-cf-worker`) declares its own Cloudflare Cron Trigger (`*/10 * * * *`) that this repo has no visibility into and doesn't control. It refreshes R2-cached Zagreb open-data datasets and aggregates GTFS-RT delay stats into the `congestion-history` KV key every 10 minutes — entirely independent of the three jobs below. Full detail: [[gtfs-proxy-worker]].

## `gtfs-static-bump.yml` — daily, 07:00 UTC

Probes ZET for the next static feed (`scheduled-000-{pin+1}.zip`, where `{pin}` is the six-digit value in the root `.gtfs-static-version` file). If it exists (HTTP 200), opens a PR on branch `chore/gtfs-static-{next}` bumping the version file, with a title that includes the new feed's `feed_start_date` (parsed from `feed_info.txt` inside the zip via a one-line Python CSV read, since column order isn't fixed). Does not auto-merge — a human merges when appropriate. Concurrency group `gtfs-static-bump`, `cancel-in-progress: false`. Skips gracefully (exit 0, no error) if the pin is missing, empty, `latest`, or not a valid six-digit number.

## `parse-service-alerts.yml` — every 4 hours

Runs `node scripts/parse-service-alerts.mjs` with `OLLAMA_API_KEY`, `CF_ACCOUNT_ID` (from `CLOUDFLARE_ACCOUNT_ID` secret), `CF_KV_NAMESPACE_ID`, `CF_API_TOKEN` (from `CLOUDFLARE_API_TOKEN` secret). Concurrency `cancel-in-progress: true` — unlike the other scheduled jobs, a stale in-flight run is fine to cancel since the next run re-diffs from scratch. Full pipeline detail: [[service-alerts]], [[ollama-integration]].

## `global-announcement.yml` — manual only

`workflow_dispatch` admin tool, not scheduled. Inputs: `action` (`set`/`clear`), `message`, `type` (`info`/`warning`/`error`/`success`), `durationHours` (0 = persist forever), optional `link`/`linkText`. Builds a JSON payload (`id` = current epoch-ms timestamp, so each new announcement forces a fresh banner client-side) and writes/deletes it in Cloudflare KV under key `global-announcement`.

> [!warning] Inconsistent CLI usage between its two branches
> The "set" path uses `npx wrangler@3 kv key put` (legacy v3 CLI syntax, run via bash so `$PAYLOAD` expands — `wrangler-action` does not run commands through a shell). The "clear" path uses the newer `cloudflare/wrangler-action@v4`'s `kv:key delete` command. Both work today, but they're two different wrangler versions/invocation styles for the same workflow — worth normalizing on one approach if this workflow is touched again.

See [[cloudflare-topology]] for where these KV writes end up being read (the external `kreni-app-worker`).
