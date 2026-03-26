#!/bin/bash
# Downloads a chosen ZET GTFS static feed version and processes it.
# Mirrors the steps performed by the CI deploy workflow.
#
# Usage:
#   ./fetch-and-process-gtfs.sh                # from .gtfs-static-version (or latest if missing)
#   ./fetch-and-process-gtfs.sh latest         # latest
#   ./fetch-and-process-gtfs.sh 000385         # specific version
#   ./fetch-and-process-gtfs.sh 000386         # specific version

set -euo pipefail

VERSION_FILE=".gtfs-static-version"
if [[ -n "${1:-}" ]]; then
  VERSION_INPUT="$1"
elif [[ -f "$VERSION_FILE" ]]; then
  VERSION_INPUT="$(tr -d '[:space:]' < "$VERSION_FILE")"
else
  VERSION_INPUT="latest"
fi

if [[ "$VERSION_INPUT" == "latest" ]]; then
  GTFS_URL="https://www.zet.hr/gtfs-scheduled/latest"
  SELECTED_VERSION="latest"
elif [[ "$VERSION_INPUT" =~ ^[0-9]{6}$ ]]; then
  GTFS_URL="https://www.zet.hr/gtfs-scheduled/scheduled-000-${VERSION_INPUT}.zip"
  SELECTED_VERSION="$VERSION_INPUT"
else
  echo "❌ Invalid version '$VERSION_INPUT'."
  echo "Use 'latest' or a 6-digit version (e.g. 000385)."
  exit 1
fi

echo "⬇️  Downloading GTFS data ($SELECTED_VERSION)..."
curl -fL "$GTFS_URL" -o gtfs.zip

echo ""
echo "📦 Extracting GTFS data..."
unzip -o gtfs.zip -d data/

echo ""
bash scripts/run.sh

rm gtfs.zip
rm -rf ./data/
