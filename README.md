# Kreni <!-- omit in toc -->

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/aeoden96/kreni-app/deploy.yml?branch=master)](https://github.com/aeoden96/kreni-app/actions)
[![Static Analysis](https://img.shields.io/github/actions/workflow/status/aeoden96/kreni-app/ci.yml?branch=master&label=ci)](https://github.com/aeoden96/kreni-app/actions)


**Kreni** is a blazing-fast, static frontend application for tracking Zagreb public transit (ZET buses/trams, and HŽPP trains). It relies on zero real-time backend databases or complex servers, instead offloading all heavy transit data processing to build-time.

---

## What makes Kreni different?

Most public transit applications rely on heavy databases to query stops, routes, and schedules dynamically. **Kreni is completely static.** 

Instead of a backend database, it pre-processes massive GTFS (General Transit Feed Specification) feed archives into hundreds of thousands of hyper-optimized JSON chunks. These tiny JSON files are served directly from a CDN (Cloudflare Pages), meaning Kreni can handle virtually infinite traffic out-of-the-box with roughly zero database constraints.

It leverages:
* **React 19, TypeScript, and Vite 7** for the frontend UI.
* **Tailwind CSS v4 + DaisyUI 5** for a completely customized and responsive design.
* **Leaflet** for highly detailed, interactive transit maps.
* **Playwright & Vitest** for rock-solid test coverage.

## Architecture & Infrastructure Workflows

The beauty of Kreni lies in its automated infrastructural workflows driven by GitHub Actions:

### 1. Zero-Downtime Data Processing (`deploy.yml`)
When Kreni deploys, the CI pipeline:
- Downloads the latest massive GTFS ZIP archives from ZET and HŽPP.
- Slices these 114+ MB feeds locally using Python and Bash scripts (`scripts/run.sh`, `scripts/run_train.sh`).
- Generates highly fractured and minimal JSON chunks (e.g., individual files for specific route terminuses, stop timetables, geographical shapes, etc.).
- Saves these index files to `public/data/` and `public/data-train/`.
- Uploads the lightweight built project directly to **Cloudflare Pages**. 

This eliminates the need to calculate routes on-the-fly. The client simply fetches the exact `.json` file it needs.

### 2. Automated Service Alerts (`parse-service-alerts.yml`)
- Runs a cron job every 4 hours to fetch unstructured official service disruptions and announcements.
- Uses an AI agent (via the Ollama API) to automatically parse, summarize, and categorize these service alerts into a clean structured format.
- Writes the processed alerts directly into a **Cloudflare KV** store where the frontend reads them near-instantly.

### 3. Real-Time Telemetry & Tracking
- The frontend dynamically interpolates vehicle schedules (based on shape data and the time of day) and supplements it with actual, real-time positional updates fetched through a lightweight proxy edge-worker (`VITE_GTFS_PROXY_URL`).

---

## Quick Start

You'll need Node.js 20+ and Python 3.12+ installed to run Kreni locally.

```bash
git clone https://github.com/aeoden96/kreni-app.git
cd kreni-app

# 1. Install dependencies
yarn install

# 2. Process GTFS transit data locally (Required for first run)
bash scripts/run.sh         # Process ZET data
bash scripts/run_train.sh   # Process HŽPP train data

# 3. Start the dev server
yarn dev
```

### Script Commands

- `yarn build`: Production build.
- `yarn tsc`: Run TypeScript type-checking.
- `yarn lint`: Run ESLint checks.
- `yarn test`: Run unit tests via Vitest.
- `yarn test:e2e`: Run End-to-End tests in Docker via Playwright.

---

## Project Structure & Data Schemas

### Folder Setup

```text
data/                   raw ZET GTFS input (114 MB)
data-train/             raw HŽPP GTFS input
public/data/            processed ZET JSON chunks (131 MB, ~30 MB gzipped)
public/data-train/      processed HŽPP JSON chunks
scripts/                Python and Bash GTFS data slicers
src/                    React frontend application
tests/                  Functional python tests for indexing validation
tests-e2e/              Playwright End-to-End tests
```

### GTFS JSON Sharding Strategy

The core Kreni data strategy breaks down the data into extremely specific directories to avoid over-fetching on the client network:

- **`initial.json` (456 KB):** Loaded on startup. Contains only basic stops, routes, and the active calendar.
- **`routes/{id}.json` (60 KB avg):** Metadata and trips for a specific route.
- **`timetables/{id}.json` (190 KB avg):** Full schedules per route.
- **`shapes/{id}.json` (10 KB avg):** Geographic paths/polylines per route variant at high precision.
- **`stops/{id}.json` (3 KB avg):** What routes stop here and departure timestamps.
- **`route_stops/{id}.json` (320 B avg):** Just an ordered list of stop IDs for a route.
- **`stop_timetables/{id}.json` (30 KB avg):** Departures at a stop, pre-filtered (82% smaller than full route timetables).
- **`route_active_trips/{id}.json` (72 KB avg):** Active shape data used to quickly interpolate/estimate vehicle locations based on the time of day if GPS isn't available.

---

## License & Legal

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more details.

**Legal Disclaimer:** This is an unofficial hobby-driven project. Kreni operates "as is" and provides no warranties regarding the accuracy, timeliness, or reliability of its transit information. It is not affiliated with, endorsed by, nor integrated with ZET (Zagrebački električni tramvaj), HŽPP (Hrvatske željeznice Putnički prijevoz), or any other official transit authorities in any formal capacity.
