---
tags: [area/infra, type/reference]
status: current
updated: 2026-07-04
---

# `kreni-app-worker` (zet-gtfs-proxy) — the external Cloudflare Worker

> [!note] Lives in a separate repo
> Source: `~/projects/zet-live-realtime-cf-worker` (remote: `aeoden96/zet-live-realtime-cf-worker`), **not** part of the kreni-app repo. This note documents it because kreni-app's frontend and GitHub Actions depend on it directly — see [[cloudflare-topology]] for how the two repos' Cloudflare resources relate, and [[environment-variables]] for `VITE_GTFS_PROXY_URL`.

Deployed Worker name: **`zet-gtfs-proxy`** (from that repo's `wrangler.toml`), reachable at its default `*.workers.dev` subdomain — no custom route/domain is configured, no dev/staging/prod environments, no Durable Objects.

## Stack

Raw Cloudflare Workers module (`export default { fetch, scheduled }`) — no Hono/itty-router. Only runtime dependency is `gtfs-realtime-bindings` (protobuf decoding), used both for serving the raw feed and for the Worker's own cron aggregation below. TypeScript, `wrangler dev`/`wrangler deploy`/`wrangler tail` as the only npm scripts.

## Bindings (that repo's `wrangler.toml`)

| Binding             | Type                                | Name/ID                               | Used for                                                                                                                            |
| ------------------- | ----------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `KV_SERVICE_ALERTS` | KV namespace                        | id `2b16f1d4d6b743a0b4d8086b7de2fda6` | Three distinct keys live here (see below) — despite the binding's name, it's not only service alerts                                |
| `DATA_BUCKET`       | R2 bucket                           | `zet-live-data`                       | Cached copies of ~28 Zagreb Open Data datasets (GeoJSON/CSV/XLSX), refreshed by the Worker's own cron                               |
| `RATE_LIMITER`      | rate-limit (declared, **inactive**) | —                                     | Commented out in `wrangler.toml`; even the `Env` type still references it but `fetch()` never calls `.limit()`. Not enforced today. |

**Three KV keys, two different writers:**

| Key                   | Written by                                                                                            | Read by (this Worker's endpoint) |
| --------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- |
| `service-alerts`      | kreni-app's `scripts/parse-service-alerts.mjs`, every 4h — see [[service-alerts]], [[scheduled-jobs]] | `?endpoint=service-alerts`       |
| `global-announcement` | kreni-app's `global-announcement.yml`, manual — see [[scheduled-jobs]]                                | `?endpoint=announcement`         |
| `congestion-history`  | **this Worker's own cron trigger**, every 10 min (not kreni-app)                                      | `?endpoint=congestion-history`   |

The KV namespace ID above is almost certainly the same one kreni-app's `CF_KV_NAMESPACE_ID` secret points at — the key names line up exactly between the two repos.

## The Worker has its own Cloudflare Cron Trigger

> [!warning] Corrects an earlier note in this vault
> [[scheduled-jobs]] previously stated "there are no Cloudflare Cron Triggers, since there's no Worker config in this repo" — that's true only of the **kreni-app** repo. This external Worker has its own `[triggers] crons = ["*/10 * * * *"]` (every 10 minutes) running two jobs in its `scheduled()` handler:
>
> 1. **`syncDatasets()`** — refreshes R2-cached Zagreb Open Data datasets whose `ourRefreshInterval` has elapsed (tracked via a `sync_state.json` object in `DATA_BUCKET`). Per-dataset refresh intervals range from `THREE_MINUTES` to `MAXIMAL` (30 days) depending on the dataset — see the dataset registry below.
> 2. **Congestion aggregation** — fetches the live GTFS-RT feed directly, decodes it, and buckets stop-level delay by `(day-of-week, hour, stopId)` into the `congestion-history` KV blob (`Europe/Zagreb` local time). Delays outside ±3600s are treated as anomalies and dropped. Each bucket caps at 10,000 samples, decaying older data by ×0.9 (sum and count) once the cap is hit rather than growing unbounded. This is what powers kreni-app's `CongestionHeatmap.tsx` (see [[map-and-navigation]]) — entirely independent of kreni-app's own GitHub Actions.

## Endpoints

Both path-based (`/road-closures`) and query-param (`?endpoint=road-closures`) routing work identically (`endpoint = url.searchParams.get('endpoint') || url.pathname.slice(1)`).

| Endpoint                                                                                                                                                                                                                                                                    | Upstream / source                                                                                                           | Edge cache (`s-maxage`)                               | Consumed by kreni-app?                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vehicle-positions` / `trip-updates`                                                                                                                                                                                                                                        | `https://www.zet.hr/gtfs-rt-protobuf` — **one combined feed** serves both; they share a single origin fetch and cache entry | 7s                                                    | Yes — `src/utils/realtime.ts`. See [[gps-realtime-trust-model]].                                                                                  |
| `service-alerts`                                                                                                                                                                                                                                                            | KV `service-alerts`                                                                                                         | 5 min                                                 | Yes — `useRssServiceAlerts.ts`. See [[service-alerts]].                                                                                           |
| `announcement`                                                                                                                                                                                                                                                              | KV `global-announcement`                                                                                                    | 60s (`must-revalidate`, no browser cache)             | Yes, via the global announcement banner. Returns literal JSON `null` if unset, not an error.                                                      |
| `congestion-history`                                                                                                                                                                                                                                                        | KV `congestion-history` (written by this Worker's own cron, above)                                                          | 10 min                                                | Yes — `useCongestionData.ts`.                                                                                                                     |
| `road-closures`                                                                                                                                                                                                                                                             | Zagreb Open Data JSON, transformed fresh on every cache miss (not R2-backed)                                                | 1 hour                                                | Yes — `useRoadClosures.ts` (Driving mode). See [[city-services]].                                                                                 |
| `nextbike`                                                                                                                                                                                                                                                                  | `https://maps.nextbike.net/maps/nextbike-live.json?city=1172&domains=hd&list_cities=0&bikes=0`                              | 15s                                                   | Yes — `useNextbikeData.ts`.                                                                                                                       |
| `javni-zdenci`                                                                                                                                                                                                                                                              | R2 object `public-water-fountains.geojson`                                                                                  | 1 week                                                | **No** — kreni-app bundles its own static copy (`public/static_data/javni_zdenci.json`) instead of calling this live endpoint. See callout below. |
| ~27 other Zagreb Open Data datasets (bike paths, taxi stands, gas stations, EV chargers, parking, pedestrian zones, public toilets/wifi, health institutions, pharmacies, museums/libraries/galleries, playgrounds, surveillance cameras, evacuation areas, graffiti, etc.) | R2, generic registry-driven passthrough (`ZAGREB_DATASETS` in that repo's `src/datasets.ts`)                                | dataset's own refresh interval, clamped [60s, 1 week] | **No** — kreni-app's frontend doesn't call any of these today; they're capacity the Worker exposes but this app doesn't use.                      |

> [!warning] Cross-repo comment drift on service-alerts freshness
> That repo's `src/index.ts` has an inline comment claiming "the GH Action runs every 30 min so stale data is at most ~35 minutes old." kreni-app's actual `parse-service-alerts.yml` runs every **4 hours** (`0 */4 * * *`), not 30 minutes — see [[scheduled-jobs]]. Either the comment is stale (the cadence changed on kreni-app's side after the Worker was last touched) or it was never accurate. Worst-case staleness for `service-alerts` today is closer to ~4h5m than ~35min; worth fixing the comment in that repo if you're in there again.

> [!note] Water fountains: static bundle, not live endpoint
> The Worker _does_ expose a live, R2-cached `javni-zdenci` endpoint (1-week edge cache). kreni-app's frontend doesn't call it — instead `public/static_data/javni_zdenci.json` is bundled directly at build time (see [[static-city-datasets]], [[city-services]]). Only `SettingsPage.tsx` links to the Zagreb Open Data page as a credit, it doesn't fetch from the Worker. Worth knowing if you're ever deciding whether to keep maintaining a duplicate static copy vs. switching to the live endpoint.

## Auth & CORS (actual behavior, not the repo's aspirational setup guide)

- **Auth**: a single optional `API_KEY` secret compared against the `X-API-Key` request header. If `API_KEY` is unset (the apparent production state, given kreni-app's `VITE_GTFS_API_KEY` is documented as optional/commented-out — see [[environment-variables]]), **no auth is enforced at all**.
- **CORS**: an `ALLOWED_ORIGINS` secret (comma-separated). Unset or `"*"` → all origins allowed. Otherwise the Worker echoes back the request's `Origin` header only if it's in the list, else falls back to the _first_ allowed origin (which the browser will then reject client-side for a mismatched origin — a fail-closed-ish behavior).
- Only `GET` is allowed (`405` otherwise); `OPTIONS` preflight is handled before auth.

> [!warning] That repo's own "Setup Guide" doc is stale
> `GTFS Realtime Proxy Setup Guide.md` in the Worker repo describes an older/aspirational design (a `MASTER_KEY` + `API_KEYS` KV namespace auth scheme, a `RATE_LIMITER` binding actually wired up, only 2 endpoints, and the wrong upstream URL `https://www.zet.hr/gtfs-realtime/${endpoint}` which 404s). None of that matches the deployed code. That repo's own `README.md`'s "Endpoints & Caching" section and `TEST_RESULTS.md` are the accurate references — this note is sourced from the actual `src/index.ts`, not the setup guide.

## Upstream feeds this Worker depends on

- **ZET GTFS-RT**: `https://www.zet.hr/gtfs-rt-protobuf` — a single combined vehicle-positions + trip-updates feed. There is no separate URL per feed type; the "wrong" per-type URL pattern (`/gtfs-realtime/vehicle-positions`) 404s, as documented in that repo's `TEST_RESULTS.md`. GTFS-RT `Alert` entities are consistently empty (0 in every observed sample) — this is _why_ kreni-app has a completely separate RSS→LLM pipeline for alerts (see [[service-alerts]]) rather than relying on GTFS-RT alerts alone.
- **Zagreb road closures**: `https://data.zagreb.hr/dataset/.../download/data.json` — fetched fresh on every cache miss. Notably _not_ the CKAN `datastore_search` API (whose sample response in that repo's `api_sample.json` has a data quirk: field names and values are swapped/duplicated in a way that suggests the CKAN resource's header row got ingested as data) — the Worker deliberately uses the cleaner `data.json` download instead.
- **Nextbike**: `https://maps.nextbike.net/maps/nextbike-live.json?city=1172&domains=hd&list_cities=0&bikes=0` — Zagreb's Nextbike city ID is `1172`, domain `hd`.

## Known gaps (as of this writing)

- **Rate limiting is not enforced** despite being partially scaffolded (`RATE_LIMITER` type in `Env`, commented-out binding in `wrangler.toml`) — a public, unauthenticated (if `API_KEY` is unset) proxy with no rate limiting.
- Mixed lockfiles in that repo (both `yarn.lock` and `package-lock.json` present).
- `test-endpoint.js` there is a manual, ad hoc Node script (decodes a manually-downloaded protobuf file) — not wired into `npm test`, no automated test suite.
