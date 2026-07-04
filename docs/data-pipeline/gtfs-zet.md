---
tags: [area/data-pipeline, type/reference]
status: current
updated: 2026-07-04
---

# ZET GTFS pipeline

Processes ZET Zagreb GTFS data into optimized JSON chunks for frontend consumption. Full script-level docs live at `scripts/README.md`; this note gives the vault-level picture and links it into [[data-flow]] and [[ci-cd-pipelines]].

**Input:** `./data/*.txt` (114 MB) · **Output:** `./public/data/` (~131 MB uncompressed, ~30 MB gzipped)

```bash
./scripts/run.sh
# or directly:
python3 scripts/process_gtfs.py
```

## Output structure

```
public/data/
├── initial.json              # 456 KB — all stops, routes, calendar
├── manifest.json             # 41 KB — file catalog
├── routes/{id}.json          # 155 files, 60 KB avg
├── timetables/{id}.json      # 155 files, 190 KB avg
├── shapes/{id}.json          # 150 files, 10 KB avg
├── stops/{id}.json           # 2,545 files, 3 KB avg
├── route_stops/{id}.json     # 155 files, 320 B avg
├── stop_timetables/{id}.json # 2,545 files, 30 KB avg
└── route_active_trips/{id}.json  # 155 files, 72 KB avg
```

## Optimization techniques

1. **Column dropping** — removed always-empty columns (`stop_headsign`, `pickup_type`, `drop_off_type`, `shape_dist_traveled`, etc.)
2. **Time compression** — `HH:MM:SS` strings → integer minutes (50% reduction)
3. **Coordinate rounding** — 8 decimals → 5 decimals (~1 m precision)
4. **Array-of-arrays** — `[[stopId, seq, time], ...]` instead of `[{s, q, t}]` for timetables (30% reduction)
5. **Deduplication** — `arrival_time == departure_time` always, so only one is stored
6. **Streaming** — processes 1.5M+ stop_times rows without loading into memory
7. **Compact JSON** — no whitespace (`separators=(',', ':')`)

## Stats

| Metric      | Value                |
| ----------- | -------------------- |
| Input size  | 114.1 MB             |
| Output size | ~131 MB uncompressed |
| Total files | 5,862                |
| Stops       | 3,829                |
| Routes      | 155                  |
| Trips       | 93,156               |
| Stop times  | 1,580,672            |

## Data notes

- **Calendar:** ZET uses exception-based calendar only (`calendar.txt` day-flags are all 0, dates come from `calendar_dates.txt`). Service IDs: `0_20` weekdays, `0_21` Sat, `0_22` Sun, `0_23–0_28` holidays.
- **Times > 1440:** Trips past midnight use times like 1451 (= 00:11 next day).
- **Stop hierarchy:** Parent stations (`locationType=1`) and child platforms (`locationType=0`, with `parentStation` reference). Stop ID format: `{parent}_{code}`.
- **Route types:** 0 = Tram, 3 = Bus.
- **Shape IDs:** `{routeId}_{variant}` (e.g. `6_2` = route 6, variant 2).

Shared processing helpers (`time_to_minutes`, `write_json`, `haversine_meters`, `compute_bearing`, `snap_stops_to_shape`) live in `scripts/core/gtfs_base.py` and are reused by [[gtfs-train]].

Run in CI by `deploy.yml`, cached on `(zip hash, process_gtfs.py + run.sh + gtfs_base.py hash)` — see [[ci-cd-pipelines]].
