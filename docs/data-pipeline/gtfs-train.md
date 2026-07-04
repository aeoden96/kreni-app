---
tags: [area/data-pipeline, type/reference]
status: current
updated: 2026-07-04
---

# HŽPP (train) GTFS pipeline

> [!note] Documentation gap this note fills
> Unlike [[gtfs-zet]], the HŽPP train pipeline previously had no dedicated docs (`scripts/README.md` only covers ZET). This note is sourced directly from `scripts/process_gtfs_train.py` and `STATUS.md`'s technical notes.

**Input:** `./data-train/*.txt` (GTFS CSV from `https://www.hzpp.hr/GTFS_files.zip`) · **Output:** `./public/data-train/`

```bash
./scripts/run_train.sh
# or directly:
python3 scripts/process_gtfs_train.py
```

Reuses the shared helpers from `scripts/core/gtfs_base.py` (`time_to_minutes`, `write_json`, `haversine_meters`, `compute_bearing`, `snap_stops_to_shape`) — see [[gtfs-zet]].

## Geographic scope

Ships the **entire national HŽPP network by default** (~460 stops, 141 lines) — smaller than the ZET feed despite covering the whole country. Historically the feed was sliced to a 20 km radius around Zagreb; that behavior is preserved behind an env var:

```
TRAIN_REGION=zagreb   # restores the legacy 20 km Zagreb-suburban slice
```

Default (`TRAIN_REGION` unset or anything else) = `national` scope, keeping every stop/route/trip in the feed.

## Day-type bucket calendar

HŽPP's GTFS ships **~46,000 weekly `service_id`s** — far too many to filter naively (trips were originally keyed only by their service's first date, which broke because 92% of services actually run on multiple days). The processor collapses these into three buckets — `wd` (weekday) / `sat` / `sun` — deduped per logical run. The frontend then filters with `tripId.startsWith(calendar[today] + '_')` to get _today's_ trains.

This shrank the train dataset from **~80 MB to ~3.3 MB** and is the single biggest fix documented in [[train-mode]].

> [!warning] Holiday handling
> The feed ships no `calendar_dates.txt` exceptions, so holidays fall into their weekday bucket (a Thursday holiday → `wd`). Accepted trade-off of the bucket scheme — see [[train-mode-roadmap]].

## Route naming

`_short_name_from_route_id` derives a display name from HŽPP's `route_id` convention, e.g. `i-tr27` → `27`, `i-tr1177bu` → `1177bu`.

## Known data quirks

- `enrich_stops_with_metadata` hardcodes `routeType=2` (rail) on every served stop, including the 5 type-3 bus-replacement routes' stops — minor styling inaccuracy, not corrected yet.
- 62/141 relations have an explicit reverse-direction `route_id` (HŽPP models each direction of a line as a separate route) — not yet grouped in search/UI, see [[train-mode-roadmap]].

Run in CI by `deploy.yml`, cached on `(train zip hash, process_gtfs_train.py + gtfs_base.py hash)` — see [[ci-cd-pipelines]].
