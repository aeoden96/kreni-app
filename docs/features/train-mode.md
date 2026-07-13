---
tags: [area/features, type/reference]
status: current
updated: 2026-06-22
---

# Train Mode — current state

Status of the HŽPP (Croatian Railways) train view (`/train`). For what's left to build, see [[train-mode-roadmap]].

`/train` reuses the ZET transit page (`GTFSMode`) via the `TRAIN_MODE` config
(`src/config/modes.ts`) — see [[navigation-and-modes]] for how the shared engine and mode
config work. Train data is built in CI from the live HŽPP feed
(`https://www.hzpp.hr/GTFS_files.zip`) by `scripts/process_gtfs_train.py` into
sharded JSON under `public/data-train/` (git-ignored, built on deploy) — see [[gtfs-train]].

```ts
export const TRAIN_MODE: GTFSModeConfig = {
  alwaysShowStops: true,
  dataDir: 'data-train',
  hasRealtime: false,
  id: 'train',
  initialZoom: 9,
  minZoom: 7,
  onboardingVariant: 'train',
  stopZoom: 15,
  timetableLookaheadMinutes: 300,
};
```

## Shipped features

- **National coverage** — the old 20 km Zagreb slice is gone; the whole HŽPP
  network ships by default (~460 stops, 141 lines). `TRAIN_REGION=zagreb`
  restores the legacy slice (see [[gtfs-train]]).
- **Day-type bucket schedule** — HŽPP's ~46k weekly `service_id`s are collapsed
  into `wd` / `sat` / `sun` buckets and deduped per logical run, so the
  frontend's `tripId.startsWith(calendar[today] + '_')` filter returns _today's_
  trains. This fixed a pre-existing bug where trips were keyed only by their
  service's first date (92% of services run multiple days) and shrank the data
  from ~80 MB to ~3.3 MB.
- **Route-type icons/colours** — rail (type 2) renders as a red train icon, not
  a bus; centralised in `src/utils/routeStyle.ts` (`routeTypeColor`).
- **Times in the route view** — `RouteViewLarge` shows a departures strip
  (defaults to the next train) and per-station calling times (train mode only).
- **A→B departures board** — `route_parent_stops.json` is now generated for
  trains (journey planning was returning nothing before), and the directions
  panel shows a chronological board of today's direct trains with
  departure → arrival, duration, and train number (`useJourneyDepartures`,
  `DirectionsContent`).
- **Map markers** — rail stations render as plain red dots (the directional
  bearing pin looked off for the sparse rail network).

## Known limitations / data notes

- **Holidays** follow their weekday bucket (a Thursday holiday → `wd`), because
  the feed ships no `calendar_dates.txt` exceptions. Accepted trade-off of the
  bucket scheme.
- **`enrich_stops_with_metadata`** hardcodes `routeType=2` (rail) on every served
  stop, including the 5 type-3 bus-replacement routes' stops. Minor; revisit if
  bus-replacement services need distinct styling.
- **CI cache** for `public/data-train` is keyed on the feed hash **and** the
  processing scripts (`deploy.yml`), so script changes re-process on deploy — see [[ci-cd-pipelines]].

> [!note] No realtime yet
> `TRAIN_MODE.hasRealtime` is `false`. Much of the train UI is gated on `!hasRealtime` (departures strip, board) — see [[train-mode-roadmap]] for what happens when a public position API becomes available.
