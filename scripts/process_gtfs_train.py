#!/usr/bin/env python3
"""
GTFS Data Processor for HZPP (Croatian Railways)
Converts raw GTFS CSV data into optimized, chunked JSON files for frontend consumption.
Filters to stops/routes within 20 km of Zagreb city centre.

Input:  ./data-train/*.txt  (GTFS CSV files from https://www.hzpp.hr/GTFS_files.zip)
Output: ./public/data-train/ (chunked JSON files)
"""

import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

# Allow importing from the sibling 'core' package regardless of CWD.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core.gtfs_base import (
    time_to_minutes,
    write_json,
    haversine_meters as _haversine_meters,
    compute_bearing as _compute_bearing,
    snap_stops_to_shape,
)


# ---------------------------------------------------------------------------
# Paths & constants
# ---------------------------------------------------------------------------

DATA_DIR   = Path("data-train")
OUTPUT_DIR = Path("public/data-train")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Zagreb city centre (used for the 20 km geographic filter)
ZAGREB_LAT = 45.789418
ZAGREB_LON = 15.977912
ZAGREB_RADIUS_M = 20_000   # 20 km


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def is_within_zagreb(lat, lon):
    return _haversine_meters(ZAGREB_LAT, ZAGREB_LON, lat, lon) <= ZAGREB_RADIUS_M


def read_csv(filename: str) -> list:
    """Read a GTFS CSV file from DATA_DIR and return list of row dicts."""
    filepath = DATA_DIR / filename
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def _short_name_from_route_id(route_id: str) -> str:
    """Derive a short display name from the HZPP route_id.
    e.g. 'i-tr27' → '27', 'i-tr1177bu' → '1177bu'
    """
    s = route_id
    if s.startswith('i-tr'):
        s = s[4:]
    return s


# ---------------------------------------------------------------------------
# Pre-filtering: identify Zagreb stops/trips/routes in one pass
# ---------------------------------------------------------------------------

def compute_zagreb_filter():
    """Stream stop_times once to find which trips/routes serve Zagreb stops.

    Returns
    -------
    zagreb_stop_ids  : set of stop_id strings within 20 km of Zagreb
    zagreb_route_ids : set of route_id strings that have ≥1 stop in Zagreb
    zagreb_trip_ids  : set of trip_id strings that stop in Zagreb
    """
    print("🔍 Computing Zagreb geographic filter (20 km radius)...")

    # 1. Geographic stop filter
    stops_raw = read_csv("stops.txt")
    zagreb_stop_ids = set()
    for s in stops_raw:
        try:
            lat = float(s['stop_lat'])
            lon = float(s['stop_lon'])
        except (ValueError, KeyError):
            continue
        if is_within_zagreb(lat, lon):
            zagreb_stop_ids.add(s['stop_id'])

    print(f"  ✓ {len(zagreb_stop_ids)} stops within 20 km of Zagreb")

    # 2. Stream stop_times to collect trips that serve those stops
    zagreb_trip_ids = set()
    filepath = DATA_DIR / "stop_times.txt"
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['stop_id'] in zagreb_stop_ids:
                zagreb_trip_ids.add(row['trip_id'])

    print(f"  ✓ {len(zagreb_trip_ids)} trips serve Zagreb stops")

    # 3. Find routes for those trips
    trips_raw = read_csv("trips.txt")
    zagreb_route_ids = {t['route_id'] for t in trips_raw if t['trip_id'] in zagreb_trip_ids}
    print(f"  ✓ {len(zagreb_route_ids)} routes pass through Zagreb")

    return zagreb_stop_ids, zagreb_route_ids, zagreb_trip_ids


# ---------------------------------------------------------------------------
# Calendar: expand weekly-schedule calendar.txt into canonical service types
# ---------------------------------------------------------------------------

def build_service_date_map():
    """Map each service_id → list of date strings (YYYYMMDD) it actually runs.

    HZPP uses weekly service windows; most service_ids map to exactly 1 date.
    We expand every calendar.txt entry to individual dates so that stop
    timetable keys become '{date}_{trip_id}', giving the frontend a
    date-exact filter without any cross-week duplicates.
    """
    calendar_rows = read_csv("calendar.txt")
    day_keys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday',
                'saturday', 'sunday']
    service_dates: dict[str, list[str]] = {}

    for row in calendar_rows:
        svc = row['service_id']
        dates: list[str] = []
        try:
            start = datetime.strptime(row['start_date'], '%Y%m%d')
            end   = datetime.strptime(row['end_date'],   '%Y%m%d')
        except ValueError:
            service_dates[svc] = dates
            continue
        current = start
        while current <= end:
            day_idx = current.weekday()  # 0=Mon … 6=Sun
            if row.get(day_keys[day_idx], '0') == '1':
                dates.append(current.strftime('%Y%m%d'))
            current += timedelta(days=1)
        service_dates[svc] = dates

    return service_dates


def build_calendar_date_dict(service_date_map: dict[str, list[str]]):
    """Build {YYYYMMDD: YYYYMMDD} identity mapping.

    The frontend calls calendar[today] to get the active service key.
    With date-based service keys the result is just today's date string,
    which matches the trip ID prefix '{date}_{trip_id}' exactly.
    """
    calendar_out: dict[str, str] = {}
    for dates in service_date_map.values():
        for d in dates:
            calendar_out[d] = d   # identity — each date maps to itself
    return calendar_out


# ---------------------------------------------------------------------------
# Processing pipeline
# ---------------------------------------------------------------------------

def process_initial_bundle(zagreb_stop_ids, zagreb_route_ids, service_date_map):
    """Generate initial.json with stops, routes, and calendar data."""
    print("📦 Processing initial bundle...")

    # Stops — keep only Zagreb stops; HZPP has no location_type / parent_station
    stops_raw = read_csv("stops.txt")
    stops = []
    for s in stops_raw:
        if s['stop_id'] not in zagreb_stop_ids:
            continue
        stops.append({
            'id':            s['stop_id'],
            'code':          s.get('stop_code', '') or '',
            'name':          s['stop_name'],
            'lat':           round(float(s['stop_lat']), 5),
            'lon':           round(float(s['stop_lon']), 5),
            'locationType':  0,      # no parent-station hierarchy in HZPP
            'parentStation': None,
        })

    # Routes — keep only those passing through Zagreb
    routes_raw = read_csv("routes.txt")
    routes = []
    for r in routes_raw:
        if r['route_id'] not in zagreb_route_ids:
            continue
        routes.append({
            'id':        r['route_id'],
            'shortName': _short_name_from_route_id(r['route_id']),
            'longName':  r.get('route_long_name', ''),
            'type':      int(r.get('route_type', 2)),
        })

    # Calendar — flat date → date identity mapping (date-exact service keys)
    calendar = build_calendar_date_dict(service_date_map)

    initial_data = {
        'stops':               stops,
        'routes':              routes,
        'calendar':            calendar,
        'feedVersion':         f"hzpp-{datetime.now().strftime('%Y%m%d')}",
        'feedStartDate':       '',
        'feedEndDate':         '',
    }

    write_json(OUTPUT_DIR / 'initial.json', initial_data)
    print(f"  ✓ Wrote initial.json ({len(stops)} stops, {len(routes)} routes, {len(calendar)} calendar entries)")


def process_trips(zagreb_route_ids, service_date_map):
    """Chunk trips by route; return trip_lookup keyed by date prefix."""
    print("🚂 Processing trips...")

    trips_raw = read_csv("trips.txt")
    trip_lookup = {}
    trips_by_route = defaultdict(list)

    for trip in trips_raw:
        route_id   = trip['route_id']
        if route_id not in zagreb_route_ids:
            continue
        trip_id    = trip['trip_id']
        service_id = trip['service_id']
        headsign   = trip.get('trip_headsign', '') or trip.get('trip_short_name', '') or ''
        direction  = int(trip['direction_id']) if trip.get('direction_id') else 0
        shape_id   = trip.get('shape_id') or None  # HZPP has no shapes

        # Each service_id maps to exactly one date for HZPP weekly schedules;
        # use that date as the service key for date-exact trip filtering.
        dates = service_date_map.get(service_id, [])
        first_date = dates[0] if dates else 'unknown'

        # (route_id, service_id, first_date, headsign, direction, shape_id)
        trip_lookup[trip_id] = (route_id, service_id, first_date, headsign, direction, shape_id)

        # Prefix the trip ID with the first run date: '{date}_{trip_id}'
        # The frontend's startsWith(activeServiceId + '_') where
        # activeServiceId = calendar[today] = today then shows only today's trips.
        prefixed_id = f"{first_date}_{trip_id}"

        trips_by_route[route_id].append({
            'id':        prefixed_id,
            'serviceId': service_id,
            'headsign':  headsign,
            'direction': direction,
            'shapeId':   shape_id,
        })

    # Write per-route trip files
    routes_dir = OUTPUT_DIR / 'routes'
    routes_dir.mkdir(exist_ok=True)
    for route_id, trips in trips_by_route.items():
        write_json(routes_dir / f'{route_id}.json', {'trips': trips})

    print(f"  ✓ Wrote {len(trips_by_route)} route files ({len(trip_lookup)} trips)")
    return trip_lookup


def process_stop_times(trip_lookup, zagreb_stop_ids, zagreb_trip_ids):
    """Stream stop_times, building timetable and departure indexes."""
    print("⏰ Processing stop times (streaming)...")

    timetables_by_route = defaultdict(lambda: defaultdict(list))
    departures_by_stop  = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    route_set_by_stop   = defaultdict(set)

    filepath = DATA_DIR / "stop_times.txt"
    line_count = 0

    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            line_count += 1
            if line_count % 100_000 == 0:
                print(f"  ... processed {line_count:,} rows")

            trip_id = row['trip_id']
            stop_id = row['stop_id']

            # Only keep trips that serve Zagreb AND stops within Zagreb
            if trip_id not in zagreb_trip_ids:
                continue
            if stop_id not in zagreb_stop_ids:
                continue
            if trip_id not in trip_lookup:
                continue

            stop_sequence    = int(row['stop_sequence'])
            time_str         = row.get('departure_time') or row.get('arrival_time', '0:00:00')
            route_id, _, first_date, _, _, _ = trip_lookup[trip_id]
            time_minutes = time_to_minutes(time_str)

            timetables_by_route[route_id][trip_id].append([stop_id, stop_sequence, time_minutes])
            # Key departures by the exact run date for date-exact filtering
            departures_by_stop[stop_id][first_date][route_id].append(time_minutes)
            route_set_by_stop[stop_id].add(route_id)

    print(f"  ✓ Processed {line_count:,} stop time rows")

    # Write route timetables
    timetables_dir = OUTPUT_DIR / 'timetables'
    timetables_dir.mkdir(exist_ok=True)
    for route_id, trips in timetables_by_route.items():
        for trip_id in trips:
            trips[trip_id].sort(key=lambda x: x[1])
        write_json(timetables_dir / f'{route_id}.json', dict(trips))
    print(f"  ✓ Wrote {len(timetables_by_route)} timetable files")

    # Write stop departures
    stops_dir = OUTPUT_DIR / 'stops'
    stops_dir.mkdir(exist_ok=True)
    for stop_id, services in departures_by_stop.items():
        for svc in services:
            for rte in services[svc]:
                services[svc][rte] = sorted(set(services[svc][rte]))
        stop_data = {
            'routes':     sorted(route_set_by_stop[stop_id]),
            'departures': services,
        }
        write_json(stops_dir / f'{stop_id}.json', stop_data)
    print(f"  ✓ Wrote {len(departures_by_stop)} stop files")

    return timetables_by_route


# snap_stops_to_shape is imported from core.gtfs_base above.


def generate_route_stops_index(timetables_by_route, trip_lookup):
    """Canonical stop list per route."""
    print("🗺️  Generating route stops index...")

    route_stops_dir = OUTPUT_DIR / 'route_stops'
    route_stops_dir.mkdir(exist_ok=True)

    for route_id, trips_data in timetables_by_route.items():
        shape_counts = defaultdict(int)
        for trip_id in trips_data:
            if trip_id not in trip_lookup:
                continue
            _, _, _, _, direction, shape_id = trip_lookup[trip_id]
            shape_counts[(direction, shape_id)] += 1

        directions = set(d for d, _ in shape_counts.keys())
        canonical_shapes = set()
        for direction in directions:
            dir_shapes = [(k, v) for k, v in shape_counts.items() if k[0] == direction]
            if dir_shapes:
                best_key = max(dir_shapes, key=lambda x: x[1])[0]
                canonical_shapes.add(best_key[1])

        stops_set = set()
        for trip_id, trip_stops in trips_data.items():
            if trip_id not in trip_lookup:
                continue
            _, _, _, _, direction, shape_id = trip_lookup[trip_id]
            if shape_id in canonical_shapes:
                for stop_id, seq, time in trip_stops:
                    stops_set.add(stop_id)

        ordered_stops = {}
        for direction in directions:
            dir_shapes = [(k, v) for k, v in shape_counts.items() if k[0] == direction]
            if not dir_shapes:
                continue
            best_shape = max(dir_shapes, key=lambda x: x[1])[0][1]
            for trip_id, trip_stops in trips_data.items():
                if trip_id not in trip_lookup:
                    continue
                _, _, _, _, d, s = trip_lookup[trip_id]
                if d == direction and s == best_shape:
                    sorted_stops = sorted(trip_stops, key=lambda x: x[1])
                    ordered_stops[str(direction)] = [s_id for s_id, _, _ in sorted_stops]
                    break

        write_json(route_stops_dir / f'{route_id}.json', {
            'stops':          sorted(stops_set),
            'canonicalShapes': sorted(s for s in canonical_shapes if s is not None),
            'orderedStops':   ordered_stops,
        })

    print(f"  ✓ Wrote {len(timetables_by_route)} route stops files")


def generate_route_shapes_index():
    """Synthesize per-route shape files from ordered stop sequences + stop coordinates.

    HZPP does not publish shapes.txt, so we build a simple polyline through the
    ordered stops for each direction.  The output format mirrors the ZET bus/tram
    shapes: { "<routeId>_<direction>": [[lat, lon], ...] }
    """
    print("🗺️  Generating route shape files (synthetic from stop coords)...")

    shapes_dir = OUTPUT_DIR / 'shapes'
    shapes_dir.mkdir(exist_ok=True)

    route_stops_dir = OUTPUT_DIR / 'route_stops'
    initial_file    = OUTPUT_DIR / 'initial.json'

    # Load stop coordinates from the already-written initial.json
    stops_by_id: dict = {}
    if initial_file.exists():
        with open(initial_file, 'r', encoding='utf-8') as f:
            initial_data = json.load(f)
            for stop in initial_data.get('stops', []):
                stops_by_id[stop['id']] = (stop['lat'], stop['lon'])

    generated = 0
    for route_file in sorted(route_stops_dir.glob('*.json')):
        route_id = route_file.stem
        with open(route_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        ordered = data.get('orderedStops', {})
        if not ordered:
            continue

        shapes: dict = {}
        for direction, stop_ids in ordered.items():
            coords = [
                [stops_by_id[s][0], stops_by_id[s][1]]
                for s in stop_ids
                if s in stops_by_id
            ]
            if len(coords) >= 2:
                shapes[f'{route_id}_{direction}'] = coords

        if shapes:
            write_json(shapes_dir / f'{route_id}.json', shapes)
            generated += 1

    print(f"  ✓ Wrote {generated} route shape files")


def generate_stop_timetables_index(timetables_by_route, trip_lookup):
    """Pre-filtered timetables by stop."""
    print("⏱️  Generating stop timetables index...")

    stop_timetables_dir = OUTPUT_DIR / 'stop_timetables'
    stop_timetables_dir.mkdir(exist_ok=True)

    stop_timetables: dict = defaultdict(lambda: defaultdict(dict))

    for route_id, trips_data in timetables_by_route.items():
        for trip_id, trip_stops in trips_data.items():
            for stop_id, sequence, time in trip_stops:
                stop_timetables[stop_id][route_id][trip_id] = {
                    'time':     time,
                    'sequence': sequence,
                }
    for stop_id, routes_data in stop_timetables.items():
        # Prefix each trip_id with the first run date: '{date}_{trip_id}'
        # The frontend filter `tripId.startsWith(activeServiceId + '_')` with
        # activeServiceId = calendar[today] = today's date string will then
        # match only trips that ran on exactly today.
        out: dict = {}
        for rid, trips in routes_data.items():
            out[rid] = {}
            for t_id, entry in trips.items():
                if t_id not in trip_lookup:
                    continue
                _, _, first_date, _, _, _ = trip_lookup[t_id]
                prefixed = f"{first_date}_{t_id}"
                out[rid][prefixed] = entry
        write_json(
            stop_timetables_dir / f'{stop_id}.json',
            out
        )

    print(f"  ✓ Wrote {len(stop_timetables)} stop timetable files")


def enrich_stops_with_metadata(timetables_by_route, trip_lookup):
    """Add routeType=2 (rail) and bearing to every stop in initial.json."""
    print("🧭 Enriching stops with route type and bearing...")

    initial_file = OUTPUT_DIR / 'initial.json'
    with open(initial_file, 'r', encoding='utf-8') as f:
        initial_data = json.load(f)

    stops_by_id = {s['id']: (s['lat'], s['lon']) for s in initial_data['stops']}
    served_stop_ids = set()

    # Collect all stops that appear in timetable data
    for trips_data in timetables_by_route.values():
        for trip_stops in trips_data.values():
            for stop_id, _, _ in trip_stops:
                served_stop_ids.add(stop_id)

    # Compute bearing for each stop
    stop_bearing: dict[str, float] = {}
    for route_id, trips_data in timetables_by_route.items():
        shape_counts: dict = defaultdict(int)
        for trip_id in trips_data:
            if trip_id not in trip_lookup:
                continue
            _, _, _, _, direction, shape_id = trip_lookup[trip_id]
            shape_counts[(direction, shape_id)] += 1

        for direction in set(d for d, _ in shape_counts.keys()):
            dir_shapes = [(k, v) for k, v in shape_counts.items() if k[0] == direction]
            best_shape = max(dir_shapes, key=lambda x: x[1])[0][1]
            for trip_id, trip_stops in trips_data.items():
                if trip_id not in trip_lookup:
                    continue
                _, _, _, _, d, s = trip_lookup[trip_id]
                if d == direction and s == best_shape:
                    sorted_stops = sorted(trip_stops, key=lambda x: x[1])
                    for i in range(len(sorted_stops) - 1):
                        sid_a = sorted_stops[i][0]
                        sid_b = sorted_stops[i + 1][0]
                        if sid_a not in stop_bearing and sid_a in stops_by_id and sid_b in stops_by_id:
                            lat1, lon1 = stops_by_id[sid_a]
                            lat2, lon2 = stops_by_id[sid_b]
                            stop_bearing[sid_a] = round(_compute_bearing(lat1, lon1, lat2, lon2), 1)
                    break

    bearing_count = 0
    type_count = 0
    for stop in initial_data['stops']:
        if stop['id'] in served_stop_ids:
            stop['routeType'] = 2   # rail
            type_count += 1
        b = stop_bearing.get(stop['id'])
        if b is not None:
            stop['bearing'] = b
            bearing_count += 1

    write_json(initial_file, initial_data)
    print(f"  ✓ Set routeType=2 on {type_count} stops")
    print(f"  ✓ Added bearing to {bearing_count} stops")


def generate_route_active_trips_index(timetables_by_route, trip_lookup):
    """Generate vehicle position estimation index (synthetic shapes from stops)."""
    print("🚂 Generating route active trips index...")

    route_active_trips_dir = OUTPUT_DIR / 'route_active_trips'
    route_active_trips_dir.mkdir(exist_ok=True)

    initial_file = OUTPUT_DIR / 'initial.json'
    stops_by_id = {}
    if initial_file.exists():
        with open(initial_file, 'r', encoding='utf-8') as f:
            initial_data = json.load(f)
            for stop in initial_data.get('stops', []):
                stops_by_id[stop['id']] = (stop['lat'], stop['lon'])

    shape_stop_progress_cache: dict = {}

    for route_id, trips_data in timetables_by_route.items():
        shapes: dict = {}
        trips = []

        for trip_id, trip_stops in trips_data.items():
            if not trip_stops:
                continue

            _, service_id, first_date, headsign, direction, shape_id = trip_lookup[trip_id]
            first_stop = trip_stops[0]
            last_stop  = trip_stops[-1]

            stop_coords = []
            stop_ids    = []
            for s_id, seq, time in trip_stops:
                if s_id in stops_by_id:
                    stop_coords.append(stops_by_id[s_id])
                    stop_ids.append(s_id)

            # HZPP has no shapes — always create synthetic shape from stop coords
            if stop_coords:
                shape_id = f"{route_id}_s{direction}_{trip_id}"
                shapes[shape_id] = [[lat, lon] for lat, lon in stop_coords]

            stop_times = None
            if shape_id and shape_id in shapes and stop_coords:
                num = len(stop_coords)
                progress_values = [i / (num - 1) for i in range(num)] if num > 1 else [0.0]
                stop_times = [
                    [trip_stops[i][2], progress_values[i]]
                    for i in range(min(len(trip_stops), len(progress_values)))
                ]

            # Prefix the trip id with the first run date (same as process_trips)
            prefixed_id = f"{first_date}_{trip_id}"

            trip_data: dict = {
                'id':       prefixed_id,
                'headsign': headsign,
                'direction': direction,
                'shapeId':  shape_id,
                'start':    first_stop[2],
                'end':      last_stop[2],
            }
            if stop_times:
                trip_data['stopTimes'] = stop_times

            trips.append(trip_data)

        write_json(route_active_trips_dir / f'{route_id}.json', {
            'trips':  trips,
            'shapes': shapes,
        })

    print(f"  ✓ Wrote {len(timetables_by_route)} route active trips files")


def generate_manifest():
    """Generate manifest.json."""
    print("📋 Generating manifest...")

    build_ts = datetime.now().strftime('%Y%m%d%H%M%S')
    manifest = {
        'version':   f"hzpp-{build_ts}",
        'generated': build_ts,
        'files': {
            'initial': 'initial.json',
            'routes':  [],
            'stops':   [],
            'timetables': [],
            'shapes':  [],
            'route_stops': [],
            'stop_timetables': [],
            'route_active_trips': [],
        }
    }

    for subdir in ['routes', 'stops', 'timetables', 'shapes', 'route_stops', 'stop_timetables', 'route_active_trips']:
        dir_path = OUTPUT_DIR / subdir
        if dir_path.exists():
            manifest['files'][subdir] = sorted(f.name for f in dir_path.glob('*.json'))

    write_json(OUTPUT_DIR / 'manifest.json', manifest)
    print("  ✓ Wrote manifest.json")


def calculate_stats():
    print("\n📊 Output Statistics:")
    total_size = 0
    for subdir in ['', 'routes', 'stops', 'timetables', 'shapes', 'route_stops', 'stop_timetables', 'route_active_trips']:
        if subdir == '':
            files = list((OUTPUT_DIR).glob('*.json'))
            label = 'root'
        else:
            dir_path = OUTPUT_DIR / subdir
            files = list(dir_path.glob('*.json')) if dir_path.exists() else []
            label = subdir + '/'
        sz = sum(f.stat().st_size for f in files)
        total_size += sz
        if files:
            print(f"  {label}: {sz/1024:.1f} KB ({len(files)} files)")
    print(f"\n  Total: {total_size/1024/1024:.2f} MB")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("🚀 GTFS Data Processor for HZPP Croatian Railways\n")

    # Step 0: Pre-filter to Zagreb region
    zagreb_stop_ids, zagreb_route_ids, zagreb_trip_ids = compute_zagreb_filter()

    # Step 1: Build service → dates map
    service_date_map = build_service_date_map()

    # Step 2: Initial bundle
    process_initial_bundle(zagreb_stop_ids, zagreb_route_ids, service_date_map)

    # Step 3: Trips
    trip_lookup = process_trips(zagreb_route_ids, service_date_map)

    # Step 4: Stop times (streaming)
    timetables_by_route = process_stop_times(trip_lookup, zagreb_stop_ids, zagreb_trip_ids)

    # Step 5: Enrich stops
    enrich_stops_with_metadata(timetables_by_route, trip_lookup)

    # Step 6: Route stops index
    generate_route_stops_index(timetables_by_route, trip_lookup)

    # Step 6b: Synthetic route shapes (HZPP has no shapes.txt)
    generate_route_shapes_index()

    # Step 7: Stop timetables index
    generate_stop_timetables_index(timetables_by_route, trip_lookup)

    # Step 8: Route active trips index (synthetic shapes)
    generate_route_active_trips_index(timetables_by_route, trip_lookup)

    # Step 9: Manifest
    generate_manifest()

    # Step 10: Stats
    calculate_stats()

    print("\n✅ Done! Output in ./public/data-train/")


if __name__ == '__main__':
    main()
