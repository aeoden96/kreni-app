---
tags: [area/status, type/reference]
status: roadmap
updated: 2026-06-22
---

# Train mode — roadmap & known limitations

What remains to build for `/train`, split out from the old root `STATUS.md`. For current shipped state, see [[train-mode]].

## Next steps to build

1. **Multi-leg / transfer journey routing** _(biggest item)_
   The A→B board is **direct trains only**. Cross-country journeys needing a
   change (e.g. Pula → Osijek) show "no direct trains". Build a connection
   search (≥1 transfer) over the bucketed timetable ([[gtfs-train]]): find trains A→X, then
   X→B with a sane transfer window, rank by arrival/total time.

2. **Live train locations** _(when the public API lands)_
   `TRAIN_MODE.hasRealtime` is `false`. When the live-position API is available,
   wire it like the ZET GTFS-RT path (`useRealtimeData` and friends — see [[gps-realtime-trust-model]]), flip
   `hasRealtime`, and surface live vehicles on the map + route view. Note: much
   of the train UI is gated on `!hasRealtime` (departures strip, board) — revisit
   those gates so static timetables and live data coexist.

3. **Sync the tapped train into the route strip**
   Tapping a train in the A→B board opens the route view with the segment
   highlighted, but the departures strip still defaults to the next train.
   Pass the selected instance id through so the strip pre-selects it.

4. **Train identity & search grouping**
   - Show the relation (`longName`) + train number + category (IC / brzi /
     putnički) instead of the arbitrary route number in search/route headers.
   - Group the two directions of a line (HŽPP models them as separate
     `route_id`s — 62/141 relations have an explicit reverse) so search isn't
     duplicated.

## Known limitations / data notes

- **Holidays** follow their weekday bucket (a Thursday holiday → `wd`), because
  the feed ships no `calendar_dates.txt` exceptions. Accepted trade-off of the
  bucket scheme — see [[gtfs-train]].
- **`enrich_stops_with_metadata`** hardcodes `routeType=2` (rail) on every served
  stop, including the 5 type-3 bus-replacement routes' stops. Minor; revisit if
  bus-replacement services need distinct styling.
- **CI cache** for `public/data-train` is keyed on the feed hash **and** the
  processing scripts (`deploy.yml`), so script changes re-process on deploy — see [[ci-cd-pipelines]].
