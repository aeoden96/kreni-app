# Stop Departure Board — Architecture & Current State

_Last updated: 2026-07-03. Covers the timetable + GPS fusion overhaul of the stop view._

The stop view (`StopModal`, `StopInfoBar`) shows a single unified departure list per stop,
merging two projections of the same trip:

- **Static timetable** — `stop_timetables/{stopId}.json`, minutes from midnight per `tripId`
- **Live GPS** — `realtimeStore.vehiclePositions`, keyed by `tripId`

Both sources are keyed by `tripId`, so a scheduled departure and its live vehicle are the
_same row_. All merge/fusion logic lives in `src/hooks/useStopDepartures.ts`; presentation
lives in `src/components/common/DepartureCard.tsx`.

## Trust model

The GTFS-RT feed for this provider is inconsistent: positions ping every ~10–20 s, feed
`speed` is always 0, and trip-level `delay` is frequently 0 or stale. The rules derived
from that:

| Signal                                                   | Trust                      | Used for                                        |
| -------------------------------------------------------- | -------------------------- | ----------------------------------------------- |
| GPS lat/lon                                              | ground truth               | live-row ETA, stops-away, passed-stop, distance |
| Speed (app-derived, EMA-smoothed)                        | derived                    | GPS ETA (`distance / speed`, fallback 5 m/s)    |
| Stop-level delay (`stopTimeUpdates`)                     | usable                     | schedule shift for time math + display          |
| Trip-level delay (`tripUpdate.delay`)                    | display-only for live rows | "+X min" chip; ETA hint for GPS-less rows only  |
| Absolute `arrivalTime`, `currentStopId`, feed timestamps | not trusted                | unused by design (per feed audit)               |

**Live rows are GPS-driven; scheduled rows are timetable-driven.** A live row's
`etaSeconds` is the GPS ETA, never the (possibly stale) schedule — this is what fixed the
board-order bug and the eternal green "Sada" on trams stuck in traffic. GPS ETA cannot go
negative, so "Sada"/"Na stajalištu" now implies physical presence at the stop.

## Behavior spec by row state

| State                      | Right-hand block                                                                                                | Subtitle                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Live** (GPS, not passed) | green `~N min` (ceil, floor `~1 min`) + pulsing dot; expected clock time below, red/green when >90 s late/early | `N stajališta` (0 → `na stajalištu`); `GPS uživo · X m` only when topology missing |
| **At stop** (GPS < 15 m)   | green `Na stajalištu`, pulsing route badge, success-tinted card                                                 | same as live                                                                       |
| **Scheduled** (no GPS)     | muted clock time is the hero; `za N min` helper only within 10 min (`Sada` under 1 min)                         | none                                                                               |
| **Passed**                 | dimmed `Prošao`; clock time below                                                                               | amber dot + `Prošao stajalište`                                                    |

Precision rules (feed pings every 10–20 s → minutes are the precision floor):

- No seconds countdown anywhere on live rows; nothing visibly ticks between pings.
- `~` prefix marks live estimates; bare clock time marks timetable promises.
- Minutes use `Math.ceil` (straight-line ETA already errs early; red lights push later).
- Board header shows a pulsing `● N uživo` chip (`liveCount`) explaining the green
  convention once.

## Fusion & filtering rules (hook internals)

- **ETA**: `etaSeconds = etaFromGpsSeconds ?? scheduleArrivingInSeconds`. GPS ETA =
  straight-line distance ÷ EMA-smoothed speed (`enrichWithDeadReckoning`,
  `realtime.ts`) — a systematic lower bound, the safe direction for a rider.
- **Service day**: calendar looked up by **local** date (was UTC — broke the board
  between local midnight and 01:00/02:00). Trips with GTFS times ≥ 24:00 match
  yesterday's service ID and are evaluated against the occurrence (yesterday/today
  midnight) closest to now.
- **Passed-stop classification**: when the nearest-segment projection puts the vehicle
  past the stop, **distance decides**: ≤ 75 m (`PASSED_STOP_NEAR_METERS`) = still serving
  the stop (GPS noise while boarding); beyond = passed. Stateless — no trend/history.
  Passed vehicles drop out beyond 400 m; at most one (closest) stays visible, dimmed.
- **Passed-trip memory**: GPS-confirmed passes are remembered per `(stopId, tripId)` for
  30 min (module-level map) so an early-running trip whose GPS disappears at the terminus
  cannot resurrect as a scheduled "arriving in X min" row.
- **Stale GPS**: the store tracks a wall-clock stationary anchor per vehicle
  (`stationarySeconds`, `realtimeStore.ts`, 15 m radius) — catches both stuck vehicles and
  frozen transponders. Rows stationary > 4 min get `gpsStale: true`; the live dot stops
  pulsing.
- **Sorting**: fused ETA in 30 s buckets, tie-broken live-first then `tripId` — GPS jitter
  cannot reshuffle rows every tick. Passed row (if any) is pinned first.
- **`stopsAway`** is defined once in the hook: stops the vehicle must still serve before
  this one, 0 = approaching directly.
- **Fetch consistency**: timetable + route topology are set atomically and cleared on stop
  switch, so a render never pairs the new stop with the old stop's data.
- **Display**: clock times render via `formatTime24h` (wraps 25:30 → 01:30, floors
  fractional delay-adjusted minutes).

## Key constants (`useStopDepartures.ts`)

| Constant                            | Value  | Meaning                                                 |
| ----------------------------------- | ------ | ------------------------------------------------------- |
| `ARRIVED_GRACE_SECONDS`             | 30     | scheduled-only rows linger this long past due           |
| `GPS_STALE_STATIONARY_SECONDS`      | 240    | stationary threshold for `gpsStale`                     |
| `GPS_OUTSIDE_SCHEDULE_WINDOW_MAX_M` | 15 000 | keep GPS rows scheduled beyond the window if this close |
| `PASSED_STOP_DISTANCE_METERS`       | 400    | drop passed vehicles beyond this                        |
| `PASSED_STOP_NEAR_METERS`           | 75     | "projected past" within this = still at the stop        |
| `PASSED_TRIP_MEMORY_MS`             | 30 min | scheduled-row suppression after a confirmed pass        |

## Known limitations / future ideas

- **Loop-route misprojection** (pre-existing): a vehicle near a start-equals-end terminal
  can project onto late segments and be hidden as "passed". The proper fix needs
  shape-aware projection or GTFS-RT `currentStopId`, which this feed audit deemed
  untrustworthy. Accepted trade: a hidden real vehicle beats a phantom "arriving" one.
- **`useStopDiagnostic`** (debug sandbox) intentionally approximates the production logic
  and does not replicate the newer refinements — it inspects raw inputs, not fused output.
- **Phase-2 UX idea**: replace the "N stajališta" text with small progress pips
  (`○○●──`, capped at 5) — a good fit for this feed since stops-away is its most
  ping-robust signal.
