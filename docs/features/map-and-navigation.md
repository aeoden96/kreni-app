---
tags: [area/features, type/reference]
status: current
updated: 2026-07-04
---

# Map & navigation

## Map layers (`src/components/Map/`)

- `BaseMap.tsx` / `MapView.tsx` — the Leaflet map shell.
- `StopMarkers.tsx`, `ZoomBasedStops.tsx`, `ParentStationZoomController.tsx` — stop rendering, zoom-dependent visibility (train mode uses `alwaysShowStops: true`, see [[navigation-and-modes]]).
- `VehicleMarkers.tsx`, `AllVehicleMarkers.tsx`, `VehicleFollower.tsx` — live vehicle rendering and camera-follow, built on the GPS trust rules in [[gps-realtime-trust-model]].
- `RouteShape.tsx` — route polyline rendering from `shapes/{id}.json`.
- `CongestionHeatmap.tsx` — traffic congestion overlay.
- `RailwayStationsMap.tsx` — train-mode station markers (plain red dots, no bearing pin — see [[train-mode]]).
- **Clustering**: `CityMergedClusterLayer.tsx`, `CityPointsClusterContext.tsx`, `cityClusterIcons.ts`, `cityClusterLeafKeys.ts`, `cityClusterLeafTooltip.tsx`, `cityPointClusterAnnotate.ts`, `cityPointClusterConstants.ts` — supercluster-based clustering for dense city-service point layers (see [[city-services]]).
- **Spiderfier**: `SpiderfierManager.tsx`, `SpiderfierContext.tsx` — expands overlapping/clustered stop markers into a "spider" of individually-tappable points.
- `layerPanels/` and `modes/` — per-mode layer toggle panels (city/cycling/driving/train).
- `MapFavouriteStarButton.tsx`, `MapFavouriteScopeProvider.tsx`, `MapSavedPlacesTab.tsx` — saved-places feature.
- `OffScreenStopIndicator.tsx` — off-viewport indicator for a selected stop (has a Storybook story).

## Navigation (`src/components/Navigation/`)

The "spider" popup menu is the primary navigation surface, replacing the older map-tools FAB (removed in commit `05e79c8`, which also surfaced [[service-alerts]] directly):

- `SpiderMenu.tsx` — the expandable radial/popup menu itself.
- `SpiderRouteList.tsx`, `SpiderActionRow.tsx`, `SpiderFilterBar.tsx` — route search results, quick actions, and filtering within the spider menu.
- `FlatLanguageFlags.tsx` — language switcher (hr/en/de, see [[design-system]]).

See [[navigation-and-modes]] for how mode switching (`TRANSIT_MODE`/`TRAIN_MODE`/city/cycling/driving) interacts with the map and navigation layers.
