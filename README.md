# Kreni

Zagreb public transit tracker — static frontend app, no backend. All GTFS data pre-processed into JSON chunks served from a CDN.

**Stack:** React 19, TypeScript, Vite 7, Tailwind CSS v4 + DaisyUI 5, Vitest

---

## Quick Start

Requires Node 20+ and Python 3.7+.

```bash
yarn install
./scripts/run.sh   # process GTFS data (first time only)
yarn dev
```

```bash
yarn build         # production build
yarn lint
yarn test          # unit tests
yarn tsc           # type check
python3 tests/test_functional_requirements.py  # validate data indexes
```

---

## Project Structure

```
data/                   raw GTFS input (114 MB)
public/data/            processed JSON (131 MB, ~30 MB gzipped)
  initial.json          startup data: all stops + routes (456 KB)
  routes/{id}.json      trip metadata per route (60 KB avg)
  timetables/{id}.json  full schedules per route (190 KB avg)
  shapes/{id}.json      geographic paths per route (10 KB avg)
  stops/{id}.json       routes + departures at stop (3 KB avg)
  route_stops/{id}.json ordered stop list for route (320 B avg)
  stop_timetables/{id}.json  departures at stop, pre-filtered (30 KB avg)
  route_active_trips/{id}.json  trips + shapes for vehicle estimation (72 KB avg)
  manifest.json         file catalog
scripts/
  process_gtfs.py       GTFS processor (see scripts/README.md)
src/
  utils/gtfs.ts         data fetch utilities
```

---

## Data Schemas

### `initial.json`

```json
{
  "feedVersion": "000384",
  "feedStartDate": "20260216",
  "feedEndDate": "20301231",
  "stops": [
    { "id": "264_2", "name": "Savski most", "lat": 45.79397, "lon": 15.96766,
      "locationType": 0, "parentStation": "264" }
  ],
  "routes": [
    { "id": "6", "shortName": "6", "longName": "Črnomerec - Sopot", "type": 0 }
  ],
  "calendar": { "20260216": "0_20", "20260217": "0_20" }
}
```

`locationType`: 0 = platform, 1 = parent station. `type`: 0 = tram, 3 = bus.  
Calendar maps `YYYYMMDD` → `service_id`. Service IDs: `0_20` weekdays, `0_21` Sat, `0_22` Sun.

### `routes/{id}.json`

```json
{
  "trips": [
    { "id": "0_20_601_6_10001", "serviceId": "0_20",
      "headsign": "Savski gaj-rotor", "direction": 0, "shapeId": "6_2" }
  ]
}
```

### `timetables/{id}.json`

```json
{
  "0_20_601_6_10001": [
    ["264_2", 1, 236],
    ["222_2", 2, 238]
  ]
}
```

Each row: `[stopId, sequence, minutesSinceMidnight]`. Times can exceed 1440 (trips past midnight).

### `shapes/{id}.json`

```json
{
  "6_2": [[45.77769, 15.98681], [45.7777, 15.98697]]
}
```

Shape ID format: `{routeId}_{variant}`. Coordinates at 5 decimal places (~1 m precision).

### `stops/{id}.json`

```json
{
  "routes": ["6", "11", "31"],
  "departures": {
    "0_20": { "6": [284, 297, 310], "11": [278, 299, 321] },
    "0_21": { "6": [300, 330, 360] }
  }
}
```

### `stop_timetables/{id}.json`

```json
{
  "6": {
    "0_20_601_6_10001": { "time": 284, "sequence": 15 }
  }
}
```

Pre-filtered timetable per stop — 82% smaller than fetching full route timetables (100 KB vs 570 KB).

### `route_stops/{id}.json`

```json
{ "stops": ["264_2", "222_2", "197_2"] }
```

Ordered stop list. 320 B average vs 190 KB for the full timetable.

### `route_active_trips/{id}.json`

```json
{
  "trips": [
    { "id": "0_20_601_6_10001", "headsign": "Savski gaj-rotor",
      "direction": 0, "shapeId": "6_2", "start": 236, "end": 277 }
  ],
  "shapes": { "6_2": [[45.77769, 15.98681]] }
}
```

`start`/`end` are minutes since midnight. Combined trips + shapes in one file — 76% smaller than fetching separately.

---

## Code Examples

### Load initial data

```typescript
const { stops, routes, calendar } = await fetch('/data/initial.json').then(r => r.json());
```

### Get today's service ID

```typescript
const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // "20260307"
const serviceId = calendar[today]; // "0_20"
```

### Departures at a stop

```typescript
const { routes, departures } = await fetch(`/data/stops/${stopId}.json`).then(r => r.json());
const times = departures[serviceId]?.['6'] ?? []; // minutes since midnight
```

### Estimate vehicle positions

```typescript
const { trips, shapes } = await fetch(`/data/route_active_trips/${routeId}.json`).then(r => r.json());
const now = new Date().getHours() * 60 + new Date().getMinutes();

const active = trips
  .filter(t => now >= t.start && now <= t.end)
  .map(t => {
    const path = shapes[t.shapeId];
    const progress = (now - t.start) / (t.end - t.start);
    return { ...t, position: path[Math.floor(progress * (path.length - 1))] };
  });
```

This is schedule-based only — no real GPS. Positions are interpolated along the shape.

### Convert minutes to time string

```typescript
const minutesToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
// minutesToTime(284) → "04:44"
```

---

## Deployment

```bash
yarn build
# deploy dist/ to CDN with:
# Cache-Control: public, max-age=31536000
# Content-Encoding: gzip
```
