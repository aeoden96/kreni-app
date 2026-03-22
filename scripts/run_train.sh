#!/bin/bash
# HZPP Train GTFS Data Processing Runner
# Converts raw HZPP GTFS data to optimized JSON chunks for the Train view.
# Expected input: data-train/*.txt (download from https://www.hzpp.hr/GTFS_files.zip)

set -e  # Exit on error

echo "🧹 Cleaning previous output..."
rm -rf public/data-train
mkdir -p public/data-train/{routes,stops,timetables,shapes,route_stops,stop_timetables,route_active_trips}

echo ""
echo "🐍 Running Python processor..."
python3 scripts/process_gtfs_train.py

echo ""
echo "✨ All done! Output files are in public/data-train/"
echo ""
echo "Quick stats:"
du -sh public/data-train
echo ""
echo "File counts:"
echo "  Routes: $(find public/data-train/routes -name '*.json' 2>/dev/null | wc -l)"
echo "  Stops: $(find public/data-train/stops -name '*.json' 2>/dev/null | wc -l)"
echo "  Timetables: $(find public/data-train/timetables -name '*.json' 2>/dev/null | wc -l)"
echo "  Route active trips: $(find public/data-train/route_active_trips -name '*.json' 2>/dev/null | wc -l)"
