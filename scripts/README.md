# GTFS Data Processing Scripts

Processes ZET Zagreb GTFS data into optimized JSON chunks for frontend consumption.

**Input:** `./data/*.txt` (114 MB)  
**Output:** `./public/data/` (~131 MB uncompressed, ~30 MB gzipped)

## Usage

```bash
./scripts/run.sh
# or directly:
python3 scripts/process_gtfs.py
```

Requires Python 3.7+, no external dependencies.

## Output Structure

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

See [README.md](../README.md) for data schemas and code examples.

## Optimization Techniques

1. **Column dropping** — removed always-empty columns (`stop_headsign`, `pickup_type`, `drop_off_type`, `shape_dist_traveled`, etc.)
2. **Time compression** — `HH:MM:SS` strings → integer minutes (50% reduction)
3. **Coordinate rounding** — 8 decimals → 5 decimals (~1 m precision)
4. **Array-of-arrays** — `[[stopId, seq, time], ...]` instead of `[{s, q, t}]` for timetables (30% reduction)
5. **Deduplication** — `arrival_time == departure_time` always, so only one is stored
6. **Streaming** — processes 1.5M+ stop_times rows without loading into memory
7. **Compact JSON** — no whitespace (`separators=(',', ':')`)

## Statistics

| Metric | Value |
|--------|-------|
| Input size | 114.1 MB |
| Output size | ~131 MB uncompressed |
| Total files | 5,862 |
| Stops | 3,829 |
| Routes | 155 |
| Trips | 93,156 |
| Stop times | 1,580,672 |

## Notes

- **Calendar:** ZET uses exception-based calendar only (`calendar.txt` day-flags are all 0, dates come from `calendar_dates.txt`). Service IDs: `0_20` weekdays, `0_21` Sat, `0_22` Sun, `0_23–0_28` holidays.
- **Times > 1440:** Trips past midnight use times like 1451 (= 00:11 next day).
- **Stop hierarchy:** Parent stations (`locationType=1`) and child platforms (`locationType=0`, with `parentStation` reference). Stop ID format: `{parent}_{code}`.
- **Route types:** 0 = Tram, 3 = Bus.
- **Shape IDs:** `{routeId}_{variant}` (e.g. `6_2` = route 6, variant 2).
