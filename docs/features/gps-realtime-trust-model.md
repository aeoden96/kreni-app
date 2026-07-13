---
tags: [area/features, type/reference]
status: current
updated: 2026-07-04
---

# GPS / realtime feed trust model

Extracted as its own reference note because it's the single most important operating
assumption in the realtime code, and multiple areas depend on it: [[stop-departures]],
`realtimeStore.ts`, `useRealtimeData.ts`, and the map's vehicle layer ([[map-and-navigation]]).

## The feed's actual behavior

- Positions ping every **~10–20 seconds** — not sub-second, not even every second.
- GTFS-RT `speed` field is **always 0** — never trust it directly.
- Trip-level `delay` is **frequently 0 or stale** — treat as a hint, not ground truth.
- Absolute `arrivalTime`, `currentStopId`, and feed timestamps are **not trusted at all**,
  per feed audit — they don't reflect reality closely enough to build UI on.

## What is trusted, and for what

| Signal                                                     | Trust level     | Used for                                                     |
| ---------------------------------------------------------- | --------------- | ------------------------------------------------------------ |
| GPS lat/lon                                                | ground truth    | ETA, stops-away, passed-stop detection, distance             |
| App-derived EMA-smoothed speed                             | derived         | GPS ETA (`distance / speed`, fallback 5 m/s)                 |
| Stop-level delay (`stopTimeUpdates`)                       | usable          | schedule shift for time math + display                       |
| Trip-level delay (`tripUpdate.delay`)                      | display-only    | "+X min" chip on live rows; ETA hint only when GPS is absent |
| Absolute `arrivalTime` / `currentStopId` / feed timestamps | **not trusted** | unused by design                                             |

## Practical consequences baked into the UI

- **No sub-minute countdowns.** Since positions can be 20 seconds stale, showing a ticking seconds counter would imply false precision. Minutes are the precision floor everywhere.
- **`~` prefix** marks anything derived from live GPS; a bare clock time means it's a timetable promise, not an estimate.
- **GPS ETA can never go negative** — this is _why_ "Sada" ("now") or "Na stajalištu" ("at the stop") is only ever shown when the vehicle is physically at/near the stop, not as a stale zero-crossing artifact.
- **Stale-GPS detection**: a vehicle stationary for > 240 s (`GPS_STALE_STATIONARY_SECONDS`) is flagged `gpsStale` — this catches both genuinely stuck vehicles and frozen transponders equally, since the feed gives no way to tell them apart.

> [!note] Why this matters beyond stop-departures
> Any future feature that consumes `realtimeStore.vehiclePositions` (map markers, route-view departure strips, ETAs elsewhere) should inherit these same trust rules rather than re-deriving its own — the feed's unreliability is a property of the upstream provider, not of any one screen.
