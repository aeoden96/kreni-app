---
tags: [area/data-pipeline, type/reference]
status: current
updated: 2026-07-04
---

# Static city datasets

Unlike the two GTFS pipelines ([[gtfs-zet]], [[gtfs-train]]), the non-transit city-service layers in `public/static_data/` have **no processing step** — they're committed as-is (JSON/GeoJSON sourced from Zagreb open-data portals) and bundled directly into `dist/` at build time.

See [[city-services]] for what each dataset represents on the map, and `public/static_data/parking_zones.schema.json` for the one dataset that ships a JSON Schema alongside its data.

There is no cache-busting or freshness pipeline for these — updating them means replacing the committed file directly and redeploying. This is a reasonable trade-off given how infrequently city infrastructure data changes relative to GTFS schedules, but it does mean staleness is silent (no automated check like [[scheduled-jobs]]'s `gtfs-static-bump.yml` exists for these datasets).
