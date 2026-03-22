#!/bin/bash
# GTFS Data Processing Runner
# Converts raw GTFS data to optimized JSON chunks

set -e  # Exit on error

echo "🧹 Cleaning previous output..."
rm -rf public/data
mkdir -p public/data/{routes,stops,timetables,shapes}

echo ""
echo "🐍 Running Python processor..."
python3 scripts/process_gtfs.py

echo ""
echo "✨ All done! Output files are in public/data/"
echo ""
echo "Quick stats:"
du -sh public/data
echo ""
echo "File counts:"
echo "  Routes: $(find public/data/routes -name '*.json' 2>/dev/null | wc -l)"
echo "  Stops: $(find public/data/stops -name '*.json' 2>/dev/null | wc -l)"
echo "  Timetables: $(find public/data/timetables -name '*.json' 2>/dev/null | wc -l)"
echo "  Shapes: $(find public/data/shapes -name '*.json' 2>/dev/null | wc -l)"
