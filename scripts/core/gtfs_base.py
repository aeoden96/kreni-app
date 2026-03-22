"""
Shared GTFS processing utilities used by all dataset processors.

Importing:
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from core.gtfs_base import (
        time_to_minutes, read_csv, write_json,
        haversine_meters, compute_bearing, snap_stops_to_shape,
    )
"""

from __future__ import annotations

import csv
import json
from math import asin, atan2, cos, degrees, radians, sin, sqrt
from pathlib import Path


# ---------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------

def time_to_minutes(time_str: str) -> int:
    """Convert HH:MM:SS to minutes from midnight.

    Supports times past midnight (e.g. "25:30:00"→1530) as used in GTFS.
    """
    parts = time_str.split(':')
    return int(parts[0]) * 60 + int(parts[1])


# ---------------------------------------------------------------------------
# File I/O helpers
# ---------------------------------------------------------------------------

def read_csv(filename: str, data_dir: Path) -> list[dict]:
    """Read a GTFS CSV file from *data_dir* and return a list of row dicts."""
    filepath = data_dir / filename
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def write_json(filepath: Path, data) -> None:
    """Write *data* to *filepath* as compact JSON, creating parent dirs."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)


# ---------------------------------------------------------------------------
# Geodesic helpers
# ---------------------------------------------------------------------------

def haversine_meters(a_lat: float, a_lon: float, b_lat: float, b_lon: float) -> float:
    """Return the great-circle distance in metres between two WGS-84 points."""
    R = 6_371_000.0
    dlat = radians(b_lat - a_lat)
    dlon = radians(b_lon - a_lon)
    lat1 = radians(a_lat)
    lat2 = radians(b_lat)
    h = sin(dlat / 2.0) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2.0) ** 2
    return 2.0 * R * asin(sqrt(h))


def compute_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compass bearing in degrees [0, 360) from point 1 → point 2.

    0 = North, 90 = East, 180 = South, 270 = West.
    """
    lat1_r = radians(lat1)
    lat2_r = radians(lat2)
    dlon_r = radians(lon2 - lon1)
    x = sin(dlon_r) * cos(lat2_r)
    y = cos(lat1_r) * sin(lat2_r) - sin(lat1_r) * cos(lat2_r) * cos(dlon_r)
    return (degrees(atan2(x, y)) + 360) % 360


# ---------------------------------------------------------------------------
# Shape projection
# ---------------------------------------------------------------------------

def snap_stops_to_shape(
    shape_points: list[list[float]],
    stop_coords: list[tuple[float, float]],
) -> list[float]:
    """Project stops onto a shape polyline and return progress fractions [0,1].

    Args:
        shape_points: [[lat, lon], …] defining the polyline.
        stop_coords:  [(lat, lon), …] in sequence order.

    Returns:
        One progress fraction per stop (0.0 = start, 1.0 = end).
    """
    if not shape_points or not stop_coords:
        return []

    # Pre-compute cumulative arc lengths (using Euclidean proxy; good enough
    # for the sub-city distances involved here where projection error is < 0.1%).
    segment_lengths: list[float] = []
    cumulative_dists: list[float] = [0.0]
    total_length = 0.0

    for i in range(1, len(shape_points)):
        lat1, lon1 = shape_points[i - 1]
        lat2, lon2 = shape_points[i]
        seg = ((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2) ** 0.5
        segment_lengths.append(seg)
        total_length += seg
        cumulative_dists.append(total_length)

    if total_length == 0:
        return [0.0] * len(stop_coords)

    progress_values: list[float] = []
    search_start = 0  # Enforce monotonic forward progression

    for stop_lat, stop_lon in stop_coords:
        min_dist = float('inf')
        best_cum = 0.0
        best_idx = search_start

        for i in range(search_start, len(segment_lengths)):
            lat1, lon1 = shape_points[i]
            lat2, lon2 = shape_points[i + 1]
            dx_seg = lat2 - lat1
            dy_seg = lon2 - lon1
            dx_stp = stop_lat - lat1
            dy_stp = stop_lon - lon1
            seg_sq = dx_seg ** 2 + dy_seg ** 2
            t = (
                max(0.0, min(1.0, (dx_stp * dx_seg + dy_stp * dy_seg) / seg_sq))
                if seg_sq > 0
                else 0.0
            )
            proj_lat = lat1 + t * dx_seg
            proj_lon = lon1 + t * dy_seg
            dist = ((stop_lat - proj_lat) ** 2 + (stop_lon - proj_lon) ** 2) ** 0.5

            if dist < min_dist:
                min_dist = dist
                best_cum = cumulative_dists[i] + t * segment_lengths[i]
                best_idx = i
            elif dist > min_dist * 3 and i > search_start + 10:
                break  # Early exit: we've passed the closest point

        search_start = max(search_start, best_idx)
        progress_values.append(round(best_cum / total_length, 6))

    return progress_values
