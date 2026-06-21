# Train Mode — Status & Next Steps

Status of the HŽPP (Croatian Railways) train view (`/train`) and what remains to build.

## Where we are

`/train` reuses the ZET transit page (`GTFSMode`) via the `TRAIN_MODE` config
(`src/config/modes.ts`). Train data is built in CI from the live HŽPP feed
(`https://www.hzpp.hr/GTFS_files.zip`) by `scripts/process_gtfs_train.py` into
sharded JSON under `public/data-train/` (git-ignored, built on deploy).

### Done

- **National coverage** — the old 20 km Zagreb slice is gone; the whole HŽPP
  network ships by default (~460 stops, 141 lines). `TRAIN_REGION=zagreb`
  restores the legacy slice.
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

## Next steps to build

1. **Multi-leg / transfer journey routing** _(biggest item)_
   The A→B board is **direct trains only**. Cross-country journeys needing a
   change (e.g. Pula → Osijek) show "no direct trains". Build a connection
   search (≥1 transfer) over the bucketed timetable: find trains A→X, then
   X→B with a sane transfer window, rank by arrival/total time.

2. **Live train locations** _(when the public API lands)_
   `TRAIN_MODE.hasRealtime` is `false`. When the live-position API is available,
   wire it like the ZET GTFS-RT path (`useRealtimeData` and friends), flip
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
  bucket scheme.
- **`enrich_stops_with_metadata`** hardcodes `routeType=2` (rail) on every served
  stop, including the 5 type-3 bus-replacement routes' stops. Minor; revisit if
  bus-replacement services need distinct styling.
- **CI cache** for `public/data-train` is keyed on the feed hash **and** the
  processing scripts (`deploy.yml`), so script changes re-process on deploy.
