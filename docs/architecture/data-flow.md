---
tags: [area/architecture, type/reference]
status: current
updated: 2026-07-04
---

# Data flow

Two independent time scales: **build-time** (GTFS static data, minutes-to-weeks freshness) and **request-time** (realtime positions and alerts, seconds-to-minutes freshness).

## Build-time: GTFS slicing

```mermaid
sequenceDiagram
    participant CI as deploy.yml
    participant ZET as ZET GTFS zip
    participant HZPP as HŽPP GTFS zip
    participant PY as Python processors
    participant DIST as dist/ (static JSON)
    participant Pages as Cloudflare Pages (zet-live)

    CI->>ZET: download per .gtfs-static-version pin
    CI->>HZPP: download latest GTFS_files.zip
    CI->>CI: sha256 hash both zips
    CI->>CI: restore actions/cache keyed on (zip hash + processing script hashes)
    alt cache miss
        CI->>PY: scripts/run.sh (ZET) / scripts/run_train.sh (HŽPP)
        PY->>DIST: public/data/*.json, public/data-train/*.json
    else cache hit
        CI->>DIST: restore from cache
    end
    CI->>Pages: yarn build && wrangler pages deploy dist
```

Details: [[gtfs-zet]], [[gtfs-train]], [[cloudflare-pages-deploy]].

## Request-time: client fusion

```mermaid
flowchart LR
    STATIC["Static JSON\n(stop_timetables/{stopId}.json)"] --> HOOK["useStopDepartures.ts"]
    RT["realtimeStore.vehiclePositions\n(polled via useRealtimeData)"] --> HOOK
    HOOK --> CARD["DepartureCard.tsx"]
    PROXY["kreni-app-worker\n(GTFS-RT proxy, external)"] -->|protobuf, ~10-20s pings| RT
```

Both the static timetable and the live GPS positions are keyed by `tripId`, so a scheduled departure and its live vehicle become the _same row_ in the departure board. Full fusion rules: [[stop-departures]] and [[gps-realtime-trust-model]].

## Alerts: two separate paths

- **Realtime GTFS-RT alerts** — parsed client-side from the same combined feed as vehicle positions, surfaced via `ServiceAlerts.tsx`.
- **AI-structured RSS alerts** — a completely separate, scheduled pipeline: ZET's RSS feed → Ollama Cloud → Cloudflare KV → read back through the proxy Worker. See [[service-alerts]] and [[ollama-integration]].

> [!note] The proxy Worker lives in a separate repo, but is documented here too
> `src/utils/realtime.ts` explicitly notes its types are "copied from kreni-app-worker/src/types.ts" — the Worker's source isn't part of this codebase (it's at `~/projects/zet-live-realtime-cf-worker`). Its internals — endpoints, caching, auth, its own cron trigger — are documented in [[gtfs-proxy-worker]] rather than treated as opaque; see also [[cloudflare-topology]] for how the two repos' Cloudflare resources connect.
