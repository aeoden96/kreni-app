#!/usr/bin/env python3
"""
GTFS Data Processor for ZET Zagreb Transit
Converts raw GTFS CSV data into optimized, chunked JSON files for frontend consumption.

Input: ./data/*.txt (GTFS CSV files)
Output: ./public/data/ (chunked JSON files)
"""

import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime
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
# Paths
# ---------------------------------------------------------------------------

DATA_DIR = Path("data")
OUTPUT_DIR = Path("public/data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


PARENT_NAME_COUPLING_RADIUS_METERS = 400  # meters


def read_csv(filename: str) -> list:
    """Read a GTFS CSV file from DATA_DIR and return list of row dicts."""
    filepath = DATA_DIR / filename
    with open(filepath, 'r', encoding='utf-8') as f:
        import csv as _csv
        reader = _csv.DictReader(f)
        return list(reader)


def process_initial_bundle():
    """Generate initial.json with stops, routes, and calendar data."""
    print("📦 Processing initial bundle...")
    
    # Process stops
    stops_raw = read_csv("stops.txt")
    stops = []
    for stop in stops_raw:
        stops.append({
            'id': stop['stop_id'],
            'code': stop['stop_code'],
            'name': stop['stop_name'],
            'lat': round(float(stop['stop_lat']), 5),
            'lon': round(float(stop['stop_lon']), 5),
            'locationType': int(stop['location_type']) if stop['location_type'] else 0,
            'parentStation': stop['parent_station'] if stop['parent_station'] else None
        })

    # -----------------------------------------------------------------------
    # Couple parent stations by name + proximity
    # -----------------------------------------------------------------------
    # Build mapping parent_id -> canonical_parent_id within each (name, radius) cluster.
    parents = [s for s in stops if s['locationType'] == 1]

    def _normalize_name(name: str) -> str:
        return name.strip().lower()

    parent_to_canonical: dict[str, str] = {}
    if parents:
        # Group parents by normalized name
        by_name: dict[str, list[dict]] = {}
        for p in parents:
            key = _normalize_name(p['name'])
            if not key:
                continue
            by_name.setdefault(key, []).append(p)

        # For each name group, cluster by proximity and choose canonical parent
        for name_key, name_parents in by_name.items():
            n = len(name_parents)
            if n == 1:
                pid = name_parents[0]['id']
                parent_to_canonical[pid] = pid
                continue

            used = set()
            for i in range(n):
                if i in used:
                    continue
                base = name_parents[i]
                cluster = [base]
                used.add(i)
                for j in range(i + 1, n):
                    if j in used:
                        continue
                    other = name_parents[j]
                    d = _haversine_meters(base['lat'], base['lon'], other['lat'], other['lon'])
                    if d <= PARENT_NAME_COUPLING_RADIUS_METERS:
                        cluster.append(other)
                        used.add(j)

                # Choose canonical parent deterministically within this cluster.
                # For now, use lexicographically smallest stop_id for stability.
                canonical_id = min(p['id'] for p in cluster)
                for p in cluster:
                    parent_to_canonical[p['id']] = canonical_id
    
    # Reparent platform stops to canonical parents (if any mapping exists)
    if parent_to_canonical:
        for stop in stops:
            if stop['locationType'] != 0:
                continue
            parent = stop.get('parentStation')
            if parent is None:
                continue
            canonical = parent_to_canonical.get(parent)
            if canonical and canonical != parent:
                stop['parentStation'] = canonical
    # Note: we deliberately keep all parent station records, including those
    # that are no longer canonical, to avoid breaking any external references.

    # Process routes
    routes_raw = read_csv("routes.txt")
    routes = []
    for route in routes_raw:
        routes.append({
            'id': route['route_id'],
            'shortName': route['route_short_name'],
            'longName': route['route_long_name'],
            'type': int(route['route_type'])
        })
    
    # Process calendar dates (date -> service_id mapping)
    calendar_dates_raw = read_csv("calendar_dates.txt")
    calendar = {}
    for entry in calendar_dates_raw:
        calendar[entry['date']] = entry['service_id']
    
    # Get feed info
    feed_info_raw = read_csv("feed_info.txt")
    feed_info = feed_info_raw[0] if feed_info_raw else {}

    # Basic integrity check: every platform stop with a parentStation must
    # reference an existing parent station in this stops list.
    parent_ids = {s['id'] for s in stops if s['locationType'] == 1}
    for stop in stops:
        if stop['locationType'] != 0:
            continue
        parent = stop.get('parentStation')
        if parent and parent not in parent_ids:
            raise RuntimeError(
                f"Platform stop {stop['id']} references missing parentStation {parent}"
            )

    initial_data = {
        'stops': stops,
        'routes': routes,
        'calendar': calendar,
        'feedVersion': feed_info.get('feed_version', ''),
        'feedStartDate': feed_info.get('feed_start_date', ''),
        'feedEndDate': feed_info.get('feed_end_date', '')
    }
    
    write_json(OUTPUT_DIR / 'initial.json', initial_data)
    print(f"  ✓ Wrote initial.json ({len(stops)} stops, {len(routes)} routes, {len(calendar)} calendar entries)")


def process_shapes():
    """Chunk shapes by route."""
    print("🗺️  Processing shapes...")
    
    shapes_raw = read_csv("shapes.txt")
    
    # Group by shape_id
    shapes_by_id = defaultdict(list)
    for point in shapes_raw:
        shape_id = point['shape_id']
        shapes_by_id[shape_id].append({
            'lat': round(float(point['shape_pt_lat']), 5),
            'lon': round(float(point['shape_pt_lon']), 5),
            'seq': int(point['shape_pt_sequence'])
        })
    
    # Sort by sequence and remove seq field
    for shape_id in shapes_by_id:
        shapes_by_id[shape_id].sort(key=lambda p: p['seq'])
        shapes_by_id[shape_id] = [[p['lat'], p['lon']] for p in shapes_by_id[shape_id]]
    
    # Group by route_id (shape_id format is {route_id}_{variant})
    shapes_by_route = defaultdict(dict)
    for shape_id, points in shapes_by_id.items():
        route_id = shape_id.split('_')[0]
        shapes_by_route[route_id][shape_id] = points
    
    # Write per-route files
    shapes_dir = OUTPUT_DIR / 'shapes'
    shapes_dir.mkdir(exist_ok=True)
    
    for route_id, shapes in shapes_by_route.items():
        write_json(shapes_dir / f'{route_id}.json', shapes)
    
    print(f"  ✓ Wrote {len(shapes_by_route)} shape files")


def process_trips():
    """Chunk trips by route and return trip lookup dict."""
    print("🚌 Processing trips...")
    
    trips_raw = read_csv("trips.txt")
    
    # Build trip lookup: trip_id -> (route_id, service_id, headsign, direction, shape)
    trip_lookup = {}
    trips_by_route = defaultdict(list)
    
    for trip in trips_raw:
        trip_id = trip['trip_id']
        route_id = trip['route_id']
        service_id = trip['service_id']
        headsign = trip['trip_headsign']
        direction = int(trip['direction_id']) if trip['direction_id'] else 0
        shape_id = trip['shape_id'] if trip['shape_id'] else None
        
        trip_lookup[trip_id] = (route_id, service_id, headsign, direction, shape_id)
        
        trips_by_route[route_id].append({
            'id': trip_id,
            'serviceId': service_id,
            'headsign': headsign,
            'direction': direction,
            'shapeId': shape_id
        })
    
    # Write per-route files
    routes_dir = OUTPUT_DIR / 'routes'
    routes_dir.mkdir(exist_ok=True)
    
    for route_id, trips in trips_by_route.items():
        write_json(routes_dir / f'{route_id}.json', {'trips': trips})
    
    print(f"  ✓ Wrote {len(trips_by_route)} route files ({len(trip_lookup)} trips)")
    
    return trip_lookup


def process_stop_times(trip_lookup):
    """Stream stop_times and create dual chunks (by route and by stop)."""
    print("⏰ Processing stop times (streaming)...")
    
    # Accumulators
    timetables_by_route = defaultdict(lambda: defaultdict(list))  # route_id -> trip_id -> [(stop_id, seq, time)]
    departures_by_stop = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))  # stop_id -> service_id -> route_id -> [times]
    route_set_by_stop = defaultdict(set)  # stop_id -> {route_ids}
    
    # Stream stop_times.txt
    filepath = DATA_DIR / "stop_times.txt"
    line_count = 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            line_count += 1
            if line_count % 100000 == 0:
                print(f"  ... processed {line_count:,} rows")
            
            trip_id = row['trip_id']
            stop_id = row['stop_id']
            stop_sequence = int(row['stop_sequence'])
            time_str = row['departure_time']  # arrival == departure
            
            # Skip if trip not found
            if trip_id not in trip_lookup:
                continue
            
            route_id, service_id, _, _, _ = trip_lookup[trip_id]
            time_minutes = time_to_minutes(time_str)
            
            # Accumulate for route timetable
            timetables_by_route[route_id][trip_id].append([stop_id, stop_sequence, time_minutes])
            
            # Accumulate for stop departures
            departures_by_stop[stop_id][service_id][route_id].append(time_minutes)
            route_set_by_stop[stop_id].add(route_id)
    
    print(f"  ✓ Processed {line_count:,} stop times")
    
    # Write route timetables
    print("  💾 Writing route timetables...")
    timetables_dir = OUTPUT_DIR / 'timetables'
    timetables_dir.mkdir(exist_ok=True)
    
    for route_id, trips in timetables_by_route.items():
        # Sort stop times by sequence
        for trip_id in trips:
            trips[trip_id].sort(key=lambda x: x[1])
        
        # Optimize: use compact format [stopId, seq, time]
        write_json(timetables_dir / f'{route_id}.json', dict(trips))
    
    print(f"    ✓ Wrote {len(timetables_by_route)} timetable files")
    
    # Write stop departures
    print("  💾 Writing stop departures...")
    stops_dir = OUTPUT_DIR / 'stops'
    stops_dir.mkdir(exist_ok=True)
    
    for stop_id, services in departures_by_stop.items():
        # Sort times and remove duplicates
        for service_id in services:
            for route_id in services[service_id]:
                services[service_id][route_id] = sorted(set(services[service_id][route_id]))
        
        stop_data = {
            'routes': sorted(route_set_by_stop[stop_id]),
            'departures': services
        }
        
        write_json(stops_dir / f'{stop_id}.json', stop_data)
    
    print(f"    ✓ Wrote {len(departures_by_stop)} stop files")
    
    return timetables_by_route


def generate_route_stops_index(timetables_by_route, trip_lookup):
    """Generate lightweight stop list per route (B2 optimization).
    
    Only includes stops from the most common trip variant (shape) per direction,
    filtering out deadhead/storage/pullout stops that appear in minor trip variants.
    """
    print("🗺️  Generating route stops index...")
    
    route_stops_dir = OUTPUT_DIR / 'route_stops'
    route_stops_dir.mkdir(exist_ok=True)
    
    for route_id, trips_data in timetables_by_route.items():
        # Group trips by (direction, shape_id) and count occurrences
        shape_trip_counts = defaultdict(int)  # (direction, shape_id) -> count
        
        for trip_id in trips_data:
            if trip_id not in trip_lookup:
                continue
            _, _, _, direction, shape_id = trip_lookup[trip_id]
            shape_trip_counts[(direction, shape_id)] += 1
        
        # Find the most common shape per direction (canonical shapes)
        directions = set(d for d, _ in shape_trip_counts.keys())
        canonical_shapes = set()
        
        for direction in directions:
            dir_shapes = [(k, v) for k, v in shape_trip_counts.items() if k[0] == direction]
            if dir_shapes:
                best_key = max(dir_shapes, key=lambda x: x[1])[0]
                canonical_shapes.add(best_key[1])  # shape_id
        
        # Collect stops only from canonical shape trips
        stops_set = set()
        for trip_id, trip_stops in trips_data.items():
            if trip_id not in trip_lookup:
                continue
            _, _, _, direction, shape_id = trip_lookup[trip_id]
            if shape_id in canonical_shapes:
                for stop_id, seq, time in trip_stops:
                    stops_set.add(stop_id)
        
        # Build ordered stop lists per direction from a representative canonical trip
        ordered_stops = {}
        for direction in directions:
            dir_shapes = [(k, v) for k, v in shape_trip_counts.items() if k[0] == direction]
            if not dir_shapes:
                continue
            best_shape = max(dir_shapes, key=lambda x: x[1])[0][1]
            # Find a representative trip with this shape
            for trip_id, trip_stops in trips_data.items():
                if trip_id not in trip_lookup:
                    continue
                _, _, _, d, s = trip_lookup[trip_id]
                if d == direction and s == best_shape:
                    sorted_stops = sorted(trip_stops, key=lambda x: x[1])  # sort by sequence
                    ordered_stops[str(direction)] = [s_id for s_id, seq, time in sorted_stops]
                    break
        
        route_stops = {
            'stops': sorted(stops_set),
            'canonicalShapes': sorted(s for s in canonical_shapes if s is not None),
            'orderedStops': ordered_stops
        }
        
        write_json(route_stops_dir / f'{route_id}.json', route_stops)
    
    print(f"    ✓ Wrote {len(timetables_by_route)} route stops files")


def generate_route_parent_stops_index():
    """Generate parent-stop ordered lists per route/direction.

    Reads the already-generated route_stops/{routeId}.json files and maps each
    child platform stop ID to its parent station ID. Writes one compact file:
    public/data/route_parent_stops.json
    """
    print("🧭 Generating route parent stops index...")

    route_stops_dir = OUTPUT_DIR / 'route_stops'
    initial_file = OUTPUT_DIR / 'initial.json'
    out_file = OUTPUT_DIR / 'route_parent_stops.json'

    if not route_stops_dir.exists() or not initial_file.exists():
        print("    ! Skipped (missing route_stops or initial.json)")
        return

    # Build child->parent lookup from initial.json
    with open(initial_file, 'r', encoding='utf-8') as f:
        initial_data = json.load(f)
    child_to_parent = {}
    for stop in initial_data.get('stops', []):
        parent = stop.get('parentStation')
        if parent:
            child_to_parent[stop['id']] = parent

    route_parent_stops = {}
    files = sorted(route_stops_dir.glob('*.json'))
    for filepath in files:
        route_id = filepath.stem
        with open(filepath, 'r', encoding='utf-8') as f:
            route_data = json.load(f)

        ordered_stops = route_data.get('orderedStops', {})
        if not ordered_stops:
            continue

        directions = {}
        for direction, stop_ids in ordered_stops.items():
            parent_ids = [child_to_parent.get(stop_id, stop_id) for stop_id in stop_ids]

            # Deduplicate while preserving order
            seen = set()
            unique_parent_ids = []
            for parent_id in parent_ids:
                if parent_id in seen:
                    continue
                seen.add(parent_id)
                unique_parent_ids.append(parent_id)

            directions[str(direction)] = unique_parent_ids

        if directions:
            route_parent_stops[route_id] = directions

    write_json(out_file, route_parent_stops)
    print(f"    ✓ Wrote route_parent_stops.json ({len(route_parent_stops)} routes)")


# snap_stops_to_shape is imported from core.gtfs_base above.


def generate_stop_timetables_index(timetables_by_route, trip_lookup):
    """Generate pre-filtered timetables by stop (A2 optimization)."""
    print("⏱️  Generating stop timetables index...")
    
    stop_timetables_dir = OUTPUT_DIR / 'stop_timetables'
    stop_timetables_dir.mkdir(exist_ok=True)
    
    # Accumulator: stop_id -> route_id -> trip_id -> {time, sequence}
    stop_timetables = defaultdict(lambda: defaultdict(dict))
    
    for route_id, trips_data in timetables_by_route.items():
        for trip_id, trip_stops in trips_data.items():
            for stop_id, sequence, time in trip_stops:
                stop_timetables[stop_id][route_id][trip_id] = {
                    'time': time,
                    'sequence': sequence
                }
    
    # Write per-stop timetable files
    for stop_id, routes_data in stop_timetables.items():
        # Convert to regular dict for JSON serialization
        routes_dict = {route_id: dict(trips) for route_id, trips in routes_data.items()}
        write_json(stop_timetables_dir / f'{stop_id}.json', routes_dict)
    
    print(f"    ✓ Wrote {len(stop_timetables)} stop timetable files")


def enrich_stops_with_metadata(timetables_by_route, trip_lookup):
    """Add routeType and bearing to every platform stop in initial.json.

    routeType: 0 = tram-only, 3 = bus-only, 2 = mixed tram+bus
    bearing:   compass degrees (0=N, 90=E) of the direction of travel
               when a vehicle leaves that platform
    """
    print("\U0001f9ed  Enriching stops with route type and bearing...")

    initial_file = OUTPUT_DIR / 'initial.json'
    with open(initial_file, 'r', encoding='utf-8') as f:
        initial_data = json.load(f)

    # Route type lookup: route_id -> route_type (0=tram, 3=bus)
    routes_raw = read_csv("routes.txt")
    route_type_map = {r['route_id']: int(r['route_type']) for r in routes_raw}

    # Stop coordinate lookup: stop_id -> (lat, lon)
    stops_by_id = {s['id']: (s['lat'], s['lon']) for s in initial_data['stops']}

    # 1. Collect which route types serve each platform stop
    stop_route_types = defaultdict(set)          # stop_id -> {route_type, ...}
    for route_id, trips_data in timetables_by_route.items():
        rtype = route_type_map.get(route_id, 3)
        for trip_id, trip_stops in trips_data.items():
            for stop_id, seq, time in trip_stops:
                stop_route_types[stop_id].add(rtype)

    # 2. Compute bearing for each stop from its canonical trip
    #    For each route+direction pick the most-frequent shape trip, then
    #    record bearing from each stop to the next one (first-seen wins).
    stop_bearing = {}                           # stop_id -> bearing float

    for route_id, trips_data in timetables_by_route.items():
        # Count trips per (direction, shape_id)
        shape_counts = defaultdict(int)
        for trip_id in trips_data:
            if trip_id not in trip_lookup:
                continue
            _, _, _, direction, shape_id = trip_lookup[trip_id]
            shape_counts[(direction, shape_id)] += 1

        for direction in set(d for d, _ in shape_counts.keys()):
            dir_shapes = [(k, v) for k, v in shape_counts.items() if k[0] == direction]
            best_shape = max(dir_shapes, key=lambda x: x[1])[0][1]

            # Find a representative canonical trip
            for trip_id, trip_stops in trips_data.items():
                if trip_id not in trip_lookup:
                    continue
                _, _, _, d, s = trip_lookup[trip_id]
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

    # 3. Write routeType and bearing back into initial.json
    bearing_count = 0
    type_count = 0
    for stop in initial_data['stops']:
        types = stop_route_types.get(stop['id'], set())
        if 0 in types and 3 in types:
            stop['routeType'] = 2   # mixed tram + bus
            type_count += 1
        elif 0 in types:
            stop['routeType'] = 0   # tram only
            type_count += 1
        elif 3 in types:
            stop['routeType'] = 3   # bus only
            type_count += 1
        # else: parent station or unserved stop — omit routeType

        b = stop_bearing.get(stop['id'])
        if b is not None:
            stop['bearing'] = b
            bearing_count += 1

    write_json(initial_file, initial_data)
    print(f"    \u2713 Classified {type_count} stops by route type")
    print(f"    \u2713 Added bearing to {bearing_count} stops")


def generate_route_active_trips_index(timetables_by_route, trip_lookup):
    """Generate optimized index for vehicle position estimation (B1 optimization)."""
    print("🚗 Generating route active trips index...")
    
    route_active_trips_dir = OUTPUT_DIR / 'route_active_trips'
    route_active_trips_dir.mkdir(exist_ok=True)
    
    # Load stops data for coordinates
    initial_file = OUTPUT_DIR / 'initial.json'
    stops_by_id = {}
    if initial_file.exists():
        with open(initial_file, 'r', encoding='utf-8') as f:
            initial_data = json.load(f)
            for stop in initial_data.get('stops', []):
                stops_by_id[stop['id']] = (stop['lat'], stop['lon'])
    
    trips_with_synthetic_shapes = 0
    trips_with_stop_times = 0
    routes_processed = 0
    
    # Cache to avoid recomputing same shape projections
    shape_stop_progress_cache = {}
    
    for route_id, trips_data in timetables_by_route.items():
        routes_processed += 1
        if routes_processed % 20 == 0:
            print(f"  ... processing route {routes_processed}/{len(timetables_by_route)}")
        
        # Load shapes for this route
        shapes_file = OUTPUT_DIR / 'shapes' / f'{route_id}.json'
        shapes = {}
        if shapes_file.exists():
            with open(shapes_file, 'r', encoding='utf-8') as f:
                shapes = json.load(f)
        
        # Extract trip metadata with start/end times and stop-aware progress
        trips = []
        for trip_id, trip_stops in trips_data.items():
            if not trip_stops:
                continue
            
            # Get metadata from trip_lookup
            _, service_id, headsign, direction, shape_id = trip_lookup[trip_id]
            
            # Get start time (first stop) and end time (last stop)
            first_stop = trip_stops[0]  # [stop_id, sequence, time]
            last_stop = trip_stops[-1]
            
            # Get stop coordinates in order
            stop_coords = []
            stop_ids = []
            for stop_id_val, seq, time in trip_stops:
                if stop_id_val in stops_by_id:
                    stop_coords.append(stops_by_id[stop_id_val])
                    stop_ids.append(stop_id_val)
            
            # Generate synthetic shape if shapeId is null
            is_synthetic = False
            if shape_id is None and stop_coords:
                shape_id = f"{route_id}_s{direction}"
                # Create shape from stop coordinates
                shapes[shape_id] = [[lat, lon] for lat, lon in stop_coords]
                trips_with_synthetic_shapes += 1
                is_synthetic = True
            
            # Compute per-stop progress fractions
            stop_times = None
            if shape_id and shape_id in shapes and stop_coords:
                shape_points = shapes[shape_id]
                
                # For synthetic shapes, progress is evenly distributed by stop index
                if is_synthetic:
                    # Synthetic shapes have stops as vertices, so progress is straightforward
                    num_stops = len(stop_coords)
                    if num_stops > 1:
                        progress_values = [i / (num_stops - 1) for i in range(num_stops)]
                    else:
                        progress_values = [0.0]
                else:
                    # Use cache for real shapes with same stop sequence
                    cache_key = (shape_id, tuple(stop_ids))
                    if cache_key in shape_stop_progress_cache:
                        progress_values = shape_stop_progress_cache[cache_key]
                    else:
                        progress_values = snap_stops_to_shape(shape_points, stop_coords)
                        shape_stop_progress_cache[cache_key] = progress_values
                
                if progress_values:
                    # Combine times and progress: [[time, progress], ...]
                    stop_times = [[trip_stops[i][2], progress_values[i]] 
                                  for i in range(min(len(trip_stops), len(progress_values)))]
                    trips_with_stop_times += 1
            
            trip_data = {
                'id': trip_id,
                'headsign': headsign,
                'direction': direction,
                'shapeId': shape_id,
                'start': first_stop[2],  # departure time in minutes
                'end': last_stop[2]      # arrival time in minutes
            }
            
            # Add stopTimes if available
            if stop_times:
                trip_data['stopTimes'] = stop_times
            
            trips.append(trip_data)
        
        # Write combined file
        active_trips_data = {
            'trips': trips,
            'shapes': shapes
        }
        
        write_json(route_active_trips_dir / f'{route_id}.json', active_trips_data)
    
    print(f"    ✓ Wrote {len(timetables_by_route)} route active trips files")
    print(f"    ✓ Generated {trips_with_synthetic_shapes} synthetic shapes for trips with null shapeId")
    print(f"    ✓ Added stopTimes to {trips_with_stop_times} trips")




def generate_manifest():
    """Generate manifest.json with metadata about all chunks."""
    print("📋 Generating manifest...")
    
    manifest = {
        'version': '',
        'generated': '',
        'files': {
            'initial': 'initial.json',
            'routes': [],
            'stops': [],
            'timetables': [],
            'shapes': [],
            'route_stops': [],
            'route_parent_stops': 'route_parent_stops.json',
            'stop_timetables': [],
            'route_active_trips': []
        }
    }
    
    # Get feed info
    feed_info_raw = read_csv("feed_info.txt")
    if feed_info_raw:
        feed_version = feed_info_raw[0].get('feed_version', '')
        # Append build timestamp so every regeneration forces cache invalidation
        build_ts = datetime.now().strftime('%Y%m%d%H%M%S')
        manifest['version'] = f"{feed_version}-{build_ts}"
        manifest['feedStart'] = feed_info_raw[0].get('feed_start_date', '')
        manifest['feedEnd'] = feed_info_raw[0].get('feed_end_date', '')
    
    # List all generated files
    for subdir in ['routes', 'stops', 'timetables', 'shapes', 'route_stops', 'stop_timetables', 'route_active_trips']:
        dir_path = OUTPUT_DIR / subdir
        if dir_path.exists():
            files = sorted([f.name for f in dir_path.glob('*.json')])
            manifest['files'][subdir] = files
    
    write_json(OUTPUT_DIR / 'manifest.json', manifest)
    print(f"  ✓ Wrote manifest.json")


def calculate_stats():
    """Calculate and display size statistics."""
    print("\n📊 Output Statistics:")
    
    total_size = 0
    file_counts = {'initial': 0, 'routes': 0, 'stops': 0, 'timetables': 0, 'shapes': 0, 'manifest': 0}
    
    # Initial file
    initial_file = OUTPUT_DIR / 'initial.json'
    if initial_file.exists():
        size = initial_file.stat().st_size
        total_size += size
        file_counts['initial'] = 1
        print(f"  initial.json: {size:,} bytes ({size/1024:.1f} KB)")
    
    
    # Subdirectories
    for subdir in ['routes', 'stops', 'timetables', 'shapes', 'route_stops', 'stop_timetables', 'route_active_trips']:
        dir_path = OUTPUT_DIR / subdir
        if dir_path.exists():
            subdir_size = sum(f.stat().st_size for f in dir_path.glob('*.json'))
            file_count = len(list(dir_path.glob('*.json')))
            total_size += subdir_size
            file_counts[subdir] = file_count
            avg_size = subdir_size / file_count if file_count > 0 else 0
            print(f"  {subdir}/: {subdir_size:,} bytes ({subdir_size/1024:.1f} KB) - {file_count} files (avg {avg_size/1024:.1f} KB)")
    
    # Manifest
    manifest_file = OUTPUT_DIR / 'manifest.json'
    if manifest_file.exists():
        size = manifest_file.stat().st_size
        total_size += size
        file_counts['manifest'] = 1
    
    print(f"\n  Total: {total_size:,} bytes ({total_size/1024:.1f} KB = {total_size/1024/1024:.2f} MB)")
    print(f"  Total files: {sum(file_counts.values())}")
    
    # Compare to input
    input_size = sum(f.stat().st_size for f in DATA_DIR.glob('*.txt'))
    compression_ratio = (1 - total_size / input_size) * 100
    print(f"\n  Input size: {input_size:,} bytes ({input_size/1024/1024:.1f} MB)")
    print(f"  Compression: {compression_ratio:.1f}% reduction")


def main():
    """Main processing pipeline."""
    print("🚀 GTFS Data Processor for ZET Zagreb\n")
    
    # Step 1: Initial bundle
    process_initial_bundle()
    
    # Step 2: Shapes
    process_shapes()
    
    # Step 3: Trips
    trip_lookup = process_trips()
    
    # Step 4: Stop times (streaming)
    timetables_by_route = process_stop_times(trip_lookup)
    
    # Step 5: Enrich stops with routeType + bearing
    enrich_stops_with_metadata(timetables_by_route, trip_lookup)

    # Step 6: Route stops index (B2 optimization)
    generate_route_stops_index(timetables_by_route, trip_lookup)

    # Step 7: Route parent stops index (directions optimization)
    generate_route_parent_stops_index()

    # Step 8: Stop timetables index (A2 optimization)
    generate_stop_timetables_index(timetables_by_route, trip_lookup)

    # Step 9: Route active trips index (B1 optimization)
    generate_route_active_trips_index(timetables_by_route, trip_lookup)


    # Step 10: Manifest
    generate_manifest()

    # Step 11: Stats
    calculate_stats()
    
    print("\n✅ Done! Output in ./public/data/")


if __name__ == '__main__':
    main()
