#!/bin/bash
# Downloads the latest ZET GTFS feed and processes it.
# Mirrors the steps performed by the CI deploy workflow.

set -e

echo "⬇️  Downloading GTFS data..."
curl -L https://www.zet.hr/gtfs-scheduled/latest -o gtfs.zip

echo ""
echo "📦 Extracting GTFS data..."
unzip -o gtfs.zip -d data/

echo ""
bash scripts/run.sh

rm gtfs.zip
rm -rf ./data/
