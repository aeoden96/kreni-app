#!/bin/bash
# Downloads the latest HZPP train GTFS feed and processes it.
# Mirrors the steps performed by the CI deploy workflow for train data.

set -e

echo "⬇️  Downloading HZPP train GTFS data..."
curl -L https://www.hzpp.hr/GTFS_files.zip -o gtfs-train.zip

echo ""
echo "📦 Extracting train GTFS data..."
unzip -o gtfs-train.zip -d data-train/

echo ""
bash scripts/run_train.sh

rm gtfs-train.zip
rm -rf ./data-train/
