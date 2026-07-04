---
tags: [area/features, type/reference]
status: current
updated: 2026-07-04
---

# City services layer

Beyond transit, Kreni surfaces a set of static/semi-static Zagreb open-data layers, all sourced from `public/static_data/`:

| Dataset                    | File                                                                                                                                          | What it is                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Parking zones              | `parking_zones.json` (+ `parking_zones.schema.json`)                                                                                          | City parking zone boundaries/rules                                                     |
| Public garages             | `javne_garaze.json`                                                                                                                           | Garage locations                                                                       |
| Bike parking               | `bike_parkings.json`                                                                                                                          | Bicycle parking locations                                                              |
| Cycling paths              | `bike_paths.geojson`                                                                                                                          | Cycling infrastructure geometry                                                        |
| Nextbike                   | fetched live via the external proxy Worker's `?endpoint=nextbike` route (`useNextbikeData.ts`), not a static file — see [[gtfs-proxy-worker]] | Bike-share station availability, 15s edge cache                                        |
| Water fountains (česme)    | `javni_zdenci.json`                                                                                                                           | Public well/fountain locations                                                         |
| Public WCs                 | `javni_wc.geojson`                                                                                                                            | Public restroom locations                                                              |
| EV charging                | `elektricne_punionice.json`                                                                                                                   | EV charging station locations                                                          |
| Student cafeterias (menze) | `studentski_restorani.json`                                                                                                                   | Student cafeteria locations                                                            |
| Free public Wi-Fi          | `besplatna_wifi_mreza.json`                                                                                                                   | Public Wi-Fi hotspot locations                                                         |
| Pedestrian zones           | `pjesacka_zona.geojson`                                                                                                                       | Pedestrian-only zone boundaries                                                        |
| Railway stations           | `zeljeznicke_postaje.json`                                                                                                                    | Static station reference data (distinct from the GTFS-driven [[gtfs-train]] stop data) |
| City park geodata          | `Geoportal_gradski_vrt.geojson`                                                                                                               | Green-space geometry                                                                   |

These are bundled directly into `dist/` at build time (no CI processing step — unlike the GTFS pipelines in [[gtfs-zet]] and [[gtfs-train]], they ship as-is) and rendered via mode-specific layer panels — see [[map-and-navigation]].

> [!note] The proxy Worker exposes a live equivalent kreni-app doesn't use
> The external `kreni-app-worker` (`zet-gtfs-proxy`) actually serves a live, R2-cached `javni-zdenci` endpoint (1-week edge cache) for the same water-fountains dataset — plus ~27 _other_ Zagreb Open Data datasets (bike paths, taxi stands, gas stations, health institutions, museums, playgrounds, etc.) via a generic registry-driven passthrough. kreni-app's frontend doesn't call any of these; it bundles its own static copies instead. See [[gtfs-proxy-worker]] for the full list — it's capacity that already exists server-side if any of these datasets are ever wanted without a redeploy.

> [!warning] Legal/ToS note
> Per [[0001-mobile-platform-strategy]]'s open risks section: these Zagreb open-data feeds (and Nextbike's live JSON especially) are proxied/bundled without a formal agreement with the city or Nextbike. ToS, rate-limit, and brand risk rises as the app gains a named store listing.
